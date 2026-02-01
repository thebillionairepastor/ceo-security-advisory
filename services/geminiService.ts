import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { 
  SYSTEM_INSTRUCTION_ADVISOR, 
  SYSTEM_INSTRUCTION_TRAINER, 
  SYSTEM_INSTRUCTION_WEEKLY_TIP, 
  SYSTEM_INSTRUCTION_NEWS, 
  SYSTEM_INSTRUCTION_GLOBAL_TRENDS,
  SYSTEM_INSTRUCTION_AUDIT_TACTICAL,
  SYSTEM_INSTRUCTION_CHECKLIST_AUDIT,
  SYSTEM_INSTRUCTION_INCIDENT_AUDIT
} from "../constants";
import { ChatMessage, WeeklyTip } from "../types";

// Standardizing on Gemini 3 Flash for the highest available quota limits
const PRIMARY_MODEL = 'gemini-3-flash-preview';

// --- Global Quota Control ---
let lastQuotaErrorTimestamp = 0;
const COOLDOWN_PERIOD = 65000; // 65 seconds local cooldown

const checkCooldown = () => {
  const now = Date.now();
  if (now - lastQuotaErrorTimestamp < COOLDOWN_PERIOD) {
    const remaining = Math.ceil((COOLDOWN_PERIOD - (now - lastQuotaErrorTimestamp)) / 1000);
    throw new Error(`Intelligence Core Cooling Down. Available in ${remaining}s.`);
  }
};

const setCooldown = () => {
  lastQuotaErrorTimestamp = Date.now();
};

// --- Caching Layer ---
const CACHE_KEY = 'antirisk_advisor_cache';
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  response: string;
  timestamp: number;
  sources?: Array<{ title: string; url: string }>;
}

const getCache = (): Record<string, CacheEntry> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: Record<string, CacheEntry>) => {
  try {
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE_SIZE) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp).slice(0, MAX_CACHE_SIZE);
      cache = Object.fromEntries(sorted);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Cache save failed", e);
  }
};

const generateCacheKey = (query: string, context: string): string => {
  return btoa(query.trim().toLowerCase() + context.trim().toLowerCase()).slice(0, 64);
};

// --- API Helpers ---

const isQuotaError = (error: any): boolean => {
  const errorString = JSON.stringify(error).toUpperCase();
  const message = error?.message?.toUpperCase() || "";
  return (
    errorString.includes('RESOURCE_EXHAUSTED') || 
    errorString.includes('429') || 
    errorString.includes('QUOTA') ||
    message.includes('QUOTA') ||
    message.includes('EXCEEDED') ||
    message.includes('BUSY')
  );
};

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  checkCooldown();
  let attempt = 0;
  const execute = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      if (isQuotaError(error)) {
        setCooldown();
        if (attempt < maxRetries) {
          attempt++;
          const delay = attempt * 5000;
          console.warn(`Quota hit. Retry ${attempt} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return execute();
        }
        throw new Error("API Quota Reached. Service will resume in 60 seconds.");
      }
      throw error;
    }
  };
  return execute();
}

export const analyzeReportStream = async (
  reportText: string, 
  type: 'CHECKLIST' | 'INCIDENT' | 'GENERAL' = 'GENERAL',
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
) => {
  checkCooldown();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let systemInstruction = SYSTEM_INSTRUCTION_AUDIT_TACTICAL;
  if (type === 'CHECKLIST') systemInstruction = SYSTEM_INSTRUCTION_CHECKLIST_AUDIT;
  else if (type === 'INCIDENT') systemInstruction = SYSTEM_INSTRUCTION_INCIDENT_AUDIT;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: PRIMARY_MODEL,
      contents: reportText,
      config: { systemInstruction }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      fullText += chunk.text || "";
      onChunk(fullText);
    }
    onComplete(fullText);
  } catch (error) {
    if (isQuotaError(error)) setCooldown();
    throw error;
  }
};

export const fetchSecurityNews = async (): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toLocaleDateString('en-GB'); 
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Latest intelligence report: Security trends in Nigeria/West Africa for ${today}. Focus on licensing and workforce regulations.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_NEWS,
        tools: [{ googleSearch: {} }],
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({ title: chunk.web.title, url: chunk.web.uri })) || [];

    return { text: response.text || "Regional briefing currently unavailable.", sources };
  });
};

export const generateAdvisorStream = async (
  history: ChatMessage[], 
  currentMessage: string,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>, cached?: boolean) => void,
  kbContext?: string
) => {
  checkCooldown();
  const cacheKey = generateCacheKey(currentMessage, kbContext || '');
  const cache = getCache();

  if (cache[cacheKey]) {
    onChunk(cache[cacheKey].response);
    onComplete(cache[cacheKey].sources, true);
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const responseStream = await ai.models.generateContentStream({
      model: PRIMARY_MODEL,
      contents: currentMessage,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
        tools: [{ googleSearch: {} }],
      }
    });

    let fullText = "";
    let finalSources: Array<{ title: string; url: string }> | undefined = undefined;

    for await (const chunk of responseStream) {
      fullText += chunk.text || "";
      onChunk(fullText);
      const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web?.uri).map((c: any) => ({ title: c.web.title, url: c.web.uri }));
      if (sources && sources.length > 0) finalSources = sources;
    }

    const newCache = getCache();
    newCache[cacheKey] = { response: fullText, timestamp: Date.now(), sources: finalSources };
    saveCache(newCache);
    onComplete(finalSources, false);
  } catch (error) {
    if (isQuotaError(error)) setCooldown();
    throw error;
  }
};

export const fetchBestPracticesStream = async (
  topic: string | undefined,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  checkCooldown();
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const responseStream = await ai.models.generateContentStream({
      model: PRIMARY_MODEL,
      contents: `Policy trends for private security CEOs: ${topic || 'General Operations'}.`,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_GLOBAL_TRENDS,
        tools: [{ googleSearch: {} }],
      }
    });

    let fullText = "";
    let finalSources: Array<{ title: string; url: string }> | undefined = undefined;
    for await (const chunk of responseStream) {
      fullText += chunk.text || "";
      onChunk(fullText);
      const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web?.uri).map((c: any) => ({ title: c.web.title, url: c.web.uri }));
      if (sources && sources.length > 0) finalSources = sources;
    }
    onComplete(finalSources);
  } catch (error) {
    if (isQuotaError(error)) setCooldown();
    throw error;
  }
};

export const generateTrainingModuleStream = async (
  topic: string, 
  week: number = 1, 
  role: string = "Security Guard",
  onChunk: (text: string) => void,
  onComplete: () => void
) => {
  checkCooldown();
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const responseStream = await ai.models.generateContentStream({
      model: PRIMARY_MODEL,
      contents: `Generate training course: ${topic} for ${role}.`,
      config: { systemInstruction: SYSTEM_INSTRUCTION_TRAINER }
    });
    let fullText = "";
    for await (const chunk of responseStream) {
      fullText += chunk.text || "";
      onChunk(fullText);
    }
    onComplete();
  } catch (error) {
    if (isQuotaError(error)) setCooldown();
    throw error;
  }
};

export const generateWeeklyTip = async (): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: "Strategic directive for security executive.",
      config: { systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP }
    });
    return response.text || "Strategic briefing delayed.";
  });
};

export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `List 5 training module names for keyword: "${query}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
      }
    });
    try { 
      return JSON.parse(response.text || "[]"); 
    } catch { 
      return []; 
    }
  });
};