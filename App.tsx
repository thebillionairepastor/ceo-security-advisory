
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, Send, Plus, Search, RefreshCw, ShieldAlert, BookOpen, Globe, 
  Briefcase, Save, Trash2, ShieldCheck, Bookmark, Sparkles, Copy, 
  X, Newspaper, Zap, Activity, Edit, History, Lightbulb, Target,
  Calendar, Bell, ChevronRight, AlertTriangle, ArrowLeft, Clock,
  ExternalLink, TrendingUp, Info, Pin, PinOff, Share2, Mic, MicOff,
  Rss, Mail, MessageCircle, User, CloudUpload, CloudDownload, Database,
  Shield, CheckCircle2, FileSearch, AlertCircle, Upload, FileText, FileCheck,
  Award, Scale
} from 'lucide-react';
import Navigation from './components/Navigation';
import MarkdownRenderer from './components/MarkdownRenderer';
import ShareButton from './components/ShareButton';
import IncidentChart from './components/IncidentChart';
import { 
  View, ChatMessage, Template, SecurityRole, StoredReport, 
  WeeklyTip, UserProfile, StoredTrainingModule 
} from './types';
import { STATIC_TEMPLATES, SECURITY_TRAINING_DB } from './constants';
import { 
  generateTrainingModuleStream, analyzeReportStream, 
  fetchBestPracticesStream, generateWeeklyTip, 
  fetchSecurityNews, generateAdvisorStream,
  fetchTopicSuggestions
} from './services/geminiService';
import { syncVaultToCloud, fetchVaultFromCloud } from './services/firebaseService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const AntiRiskLogo = ({ className = "w-24 h-24", light = false }: { className?: string; light?: boolean }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L95 85 L5 85 Z" fill={light ? "#1e293b" : "#000000"} />
    <path d="M50 15 L85 80 L15 80 Z" fill={light ? "#334155" : "#000000"} />
    <circle cx="50" cy="55" r="30" fill="white" />
    <text x="50" y="68" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="bold" fill="black" textAnchor="middle">AR</text>
    <rect x="0" y="85" width="100" height="15" fill="#000" />
    <text x="50" y="96" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">ANTI-RISK SECURITY</text>
  </svg>
);

const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to parse ${key}`, e);
    return fallback;
  }
};

function App() {
  const [appState, setAppState] = useState<'SPLASH' | 'PIN_ENTRY' | 'PIN_SETUP' | 'READY'>('SPLASH');
  const [pinInput, setPinInput] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  const [tempPin, setTempPin] = useState('');
  const [isPinError, setIsPinError] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const [storedPin, setStoredPin] = useState<string | null>(() => localStorage.getItem('security_app_vault_pin'));
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [isSyncingBackground, setIsSyncingBackground] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => 
    safeParse('security_app_profile', { name: '', phoneNumber: '', email: '', preferredChannel: 'WhatsApp' })
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => 
    safeParse('security_app_chat', [{
      id: 'welcome',
      role: 'model',
      text: `Hello CEO ${userProfile.name || 'Executive'}. Vault entry successful.`,
      timestamp: Date.now(),
      isPinned: false
    }])
  );

  const [storedReports, setStoredReports] = useState<StoredReport[]>(() => safeParse('security_app_reports', []));
  const [weeklyTips, setWeeklyTips] = useState<WeeklyTip[]>(() => safeParse('security_app_weekly_tips', []));
  const [savedTraining, setSavedTraining] = useState<StoredTrainingModule[]>(() => safeParse('security_app_training', []));
  const [customSops, setCustomSops] = useState<Template[]>(() => safeParse('security_app_custom_sops', []));

  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainingContent, setTrainingContent] = useState('');
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isAdvisorThinking, setIsAdvisorThinking] = useState(false);
  const [reportText, setReportText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [newsBlog, setNewsBlog] = useState<{ text: string; sources?: Array<{ title: string; url: string }>; lastSync?: number } | null>(() =>
    safeParse('security_app_news_cache', null)
  );
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  useEffect(() => { localStorage.setItem('security_app_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('security_app_chat', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem('security_app_reports', JSON.stringify(storedReports)); }, [storedReports]);
  useEffect(() => { localStorage.setItem('security_app_weekly_tips', JSON.stringify(weeklyTips)); }, [weeklyTips]);
  useEffect(() => { localStorage.setItem('security_app_news_cache', JSON.stringify(newsBlog)); }, [newsBlog]);

  const handleError = (error: any) => {
    const msg = error?.message || "Internal error";
    setApiError(msg);
    setTimeout(() => setApiError(null), 8000);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isOfflineMode) return;
    const tempId = Date.now().toString();
    const userMsg: ChatMessage = { id: tempId, role: 'user', text: inputMessage, timestamp: Date.now() };
    const aiId = tempId + 'ai';
    const initialAiMsg: ChatMessage = { id: aiId, role: 'model', text: 'Thinking...', timestamp: Date.now() };
    
    setMessages(prev => [...prev, userMsg, initialAiMsg]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsAdvisorThinking(true);
    
    try {
      await generateAdvisorStream(messages, currentInput,
        (text) => setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text } : m)),
        (sources) => setMessages(prev => prev.map(m => m.id === aiId ? { ...m, sources } : m))
      );
    } catch (err) { 
      handleError(err);
      setMessages(prev => prev.filter(m => m.id !== aiId));
    } finally { 
      setIsAdvisorThinking(false); 
    }
  };

  const handleGenerateManualTip = async () => {
    if (isSyncingBackground) return;
    setIsSyncingBackground(true);
    try {
      const content = await generateWeeklyTip();
      const newTip: WeeklyTip = { 
        id: Date.now().toString(), 
        weekDate: new Date().toLocaleDateString(), 
        topic: "Strategic Briefing", 
        content, 
        isAutoGenerated: true, 
        timestamp: Date.now() 
      };
      setWeeklyTips(prev => [newTip, ...prev]);
    } catch (err) { handleError(err); } finally { setIsSyncingBackground(false); }
  };

  const handleLoadNews = async () => {
    setIsNewsLoading(true);
    try { 
      const news = await fetchSecurityNews(); 
      setNewsBlog({ ...news, lastSync: Date.now() }); 
    } catch (err) { handleError(err); } finally { setIsNewsLoading(false); }
  };

  /**
   * Fix for line 351: Implemented handleAnalyzeReport to process security reports.
   * It uses analyzeReportStream to get streaming feedback from the model.
   */
  const handleAnalyzeReport = async () => {
    if (!reportText.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysisResult('');
    
    try {
      let type: 'CHECKLIST' | 'INCIDENT' | 'GENERAL' = 'GENERAL';
      const lowerText = reportText.toLowerCase();
      if (lowerText.includes('checklist') || lowerText.includes('patrol')) {
        type = 'CHECKLIST';
      } else if (lowerText.includes('incident') || lowerText.includes('5ws')) {
        type = 'INCIDENT';
      }

      await analyzeReportStream(
        reportText,
        type,
        (text) => setAnalysisResult(text),
        (fullText) => {
          setAnalysisResult(fullText);
          const newReport: StoredReport = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            dateStr: new Date().toLocaleDateString(),
            content: reportText,
            analysis: fullText
          };
          setStoredReports(prev => [newReport, ...prev]);
        }
      );
    } catch (err) {
      handleError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (appState === 'SPLASH') {
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / 1500) * 100, 100);
        setSplashProgress(progress);
        if (progress >= 100) {
          clearInterval(timer);
          setAppState(storedPin ? 'PIN_ENTRY' : 'PIN_SETUP');
        }
      }, 30);
      return () => clearInterval(timer);
    }
  }, [appState, storedPin]);

  const handlePinDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const newPin = pinInput + digit;
    setPinInput(newPin);
    if (newPin.length === 4) {
      if (appState === 'PIN_ENTRY') {
        if (newPin === storedPin) setAppState('READY');
        else { setIsPinError(true); setTimeout(() => {setPinInput(''); setIsPinError(false);}, 500); }
      } else {
        if (setupStep === 1) { setTempPin(newPin); setSetupStep(2); setPinInput(''); }
        else {
          if (newPin === tempPin) { 
            localStorage.setItem('security_app_vault_pin', newPin); 
            setStoredPin(newPin); 
            setAppState('READY');
          } else { setIsPinError(true); setSetupStep(1); setPinInput(''); }
        }
      }
    }
  };

  if (appState === 'SPLASH') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-16 h-16 mb-8 animate-pulse" light={true} /><div className="w-full max-w-[200px] space-y-4 text-center"><div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${splashProgress}%` }}></div></div><p className="text-[6px] font-black text-blue-400 uppercase tracking-widest">Opening Secure Vault...</p></div></div>;
  if (appState === 'PIN_ENTRY' || appState === 'PIN_SETUP') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-12 h-12 mb-8" /><h2 className="text-xl font-bold text-white mb-6 tracking-widest uppercase">{appState === 'PIN_SETUP' ? 'Create Vault Pin' : 'Secure Entry'}</h2><div className="flex gap-4 mb-10">{[...Array(4)].map((_, i) => <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinInput.length > i ? (isPinError ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500') : 'border-slate-800'}`} />)}</div><div className="grid grid-cols-3 gap-4 w-full max-w-[250px]">{[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => handlePinDigit(num.toString())} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-xl text-lg font-bold text-white flex items-center justify-center">{num}</button>)}<button onClick={() => setPinInput('')} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-xl flex items-center justify-center text-red-500"><Trash2 size={20} /></button></div></div>;

  return (
    <div className="flex h-[100dvh] bg-[#0a0f1a] text-slate-100 overflow-hidden relative">
      <Navigation currentView={currentView} setView={setCurrentView} isMobileMenuOpen={isMobileMenuOpen} closeMobileMenu={() => setIsMobileMenuOpen(false)} onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative w-full">
        <div className="lg:hidden h-14 border-b border-slate-800/40 flex justify-between items-center px-4 bg-[#0a1222]/95 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-2.5" onClick={() => setCurrentView(View.DASHBOARD)}><AntiRiskLogo className="w-7 h-7" /><h1 className="font-bold text-sm text-white uppercase tracking-widest">AntiRisk</h1></div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 text-white bg-slate-800/50 rounded-lg"><Menu size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scrollbar-hide pb-20">
          {apiError && <div className="max-w-4xl mx-auto mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between"><div className="flex items-center gap-2"><ShieldAlert className="text-red-500" size={14} /><p className="text-red-200 font-bold text-xs">{apiError}</p></div><button onClick={() => setApiError(null)}><X size={14}/></button></div>}
          
          {currentView === View.DASHBOARD && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="relative overflow-hidden bg-gradient-to-br from-[#122b6a] to-[#0a1222] border border-blue-500/20 rounded-3xl p-8 sm:p-12 text-white shadow-2xl">
                <h2 className="text-3xl sm:text-6xl font-black mb-2 uppercase">AntiRisk <span className="text-blue-400">Vault</span></h2>
                <p className="text-blue-100/70 text-sm sm:text-xl font-medium">Strategic Security Command & Intelligence</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={handleGenerateManualTip} disabled={isSyncingBackground} className="bg-blue-600/20 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-600/30 transition-all">
                    {isSyncingBackground ? <RefreshCw size={14} className="animate-spin" /> : <Lightbulb size={14} />} 
                    Sync Directive
                  </button>
                  <button onClick={handleLoadNews} disabled={isNewsLoading} className="bg-emerald-600/20 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-600/30 transition-all">
                    {isNewsLoading ? <RefreshCw size={14} className="animate-spin" /> : <Newspaper size={14} />} 
                    Sync Intelligence
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                  { id: View.ADVISOR, label: 'Advisor', icon: ShieldAlert, color: 'text-blue-400' },
                  { id: View.NEWS_BLOG, label: 'News', icon: Newspaper, color: 'text-emerald-400' },
                  { id: View.WEEKLY_TIPS, label: 'Directives', icon: Lightbulb, color: 'text-amber-400' },
                  { id: View.TOOLKIT, label: 'Ops Vault', icon: Briefcase, color: 'text-indigo-400' }
                ].map(item => (
                  <button key={item.label} onClick={() => setCurrentView(item.id)} className="bg-[#1b2537] p-6 rounded-3xl border border-slate-700/40 hover:border-blue-500/50 transition-all group text-left">
                    <div className={`w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4 ${item.color} group-hover:scale-110 transition-transform`}><item.icon size={24} /></div>
                    <h3 className="font-bold text-lg text-white">{item.label}</h3>
                    <p className="text-xs text-slate-500 mt-1">Open Module</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentView === View.ADVISOR && (
            <div className="max-w-4xl mx-auto flex flex-col h-[75vh] bg-[#1b2537] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-5 rounded-2xl shadow-lg ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'}`}>
                      <MarkdownRenderer content={m.text} />
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
                          {m.sources.map((s, idx) => <a key={idx} href={s.url} target="_blank" className="text-[10px] bg-slate-900 px-2 py-1 rounded text-blue-400 hover:underline">{s.title}</a>)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Query Intelligence Core..." />
                <button onClick={handleSendMessage} disabled={isAdvisorThinking} className="bg-blue-600 p-4 rounded-2xl hover:bg-blue-500 transition-colors disabled:opacity-50"><Send size={24}/></button>
              </div>
            </div>
          )}

          {currentView === View.NEWS_BLOG && (
            <div className="max-w-4xl mx-auto space-y-6">
              {!newsBlog && !isNewsLoading && (
                <div className="bg-slate-800/50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500"><Globe size={32}/></div>
                  <h3 className="text-xl font-bold mb-2">No Regional Intelligence</h3>
                  <p className="text-slate-400 mb-6">Fetch latest regional security briefings via manual sync.</p>
                  <button onClick={handleLoadNews} className="bg-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all">Manual Sync</button>
                </div>
              )}
              {isNewsLoading && <div className="flex flex-col items-center justify-center py-20 space-y-4"><RefreshCw size={48} className="animate-spin text-blue-500"/><p className="text-sm font-bold uppercase tracking-widest text-blue-400">Updating Intel Core...</p></div>}
              {newsBlog && (
                <div className="bg-[#1b2537] rounded-3xl border border-slate-700 p-8 shadow-xl">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-3xl font-black uppercase text-white tracking-tight">Security Briefing</h2>
                      <p className="text-slate-500 text-sm mt-1 flex items-center gap-2"><Clock size={14}/> Updated: {new Date(newsBlog.lastSync || 0).toLocaleString()}</p>
                    </div>
                    <button onClick={handleLoadNews} className="p-2 bg-slate-900 rounded-xl hover:text-blue-500 transition-colors"><RefreshCw size={20}/></button>
                  </div>
                  <MarkdownRenderer content={newsBlog.text} />
                  {newsBlog.sources && newsBlog.sources.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-700">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4">Referenced Sources</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {newsBlog.sources.map((s, i) => <a key={i} href={s.url} target="_blank" className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all flex items-center justify-between group"><span className="text-xs font-bold text-slate-300 truncate pr-4">{s.title}</span><ExternalLink size={14} className="text-blue-500"/></a>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentView === View.WEEKLY_TIPS && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black uppercase">Executive Directives</h2>
                <button onClick={handleGenerateManualTip} disabled={isSyncingBackground} className="bg-blue-600 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-900/40">
                  <Plus size={18}/> New Directive
                </button>
              </div>
              {weeklyTips.length === 0 && !isSyncingBackground && (
                <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No strategic directives stored.</p>
                </div>
              )}
              <div className="space-y-6">
                {weeklyTips.map(tip => (
                  <div key={tip.id} className="bg-[#1b2537] rounded-3xl border border-slate-700 p-8 shadow-xl hover:border-blue-500/30 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors"></div>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500"><Target size={20}/></div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-blue-400 tracking-[0.2em]">{tip.topic}</h4>
                          <p className="text-[10px] text-slate-500 font-bold">{tip.weekDate}</p>
                        </div>
                      </div>
                      <ShareButton title={tip.topic} content={tip.content} />
                    </div>
                    <MarkdownRenderer content={tip.content} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === View.TOOLKIT && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-black uppercase flex items-center gap-3"><FileCheck className="text-emerald-500"/> Audit Center</h3>
                  <div className="bg-[#1b2537] rounded-3xl border border-slate-700 p-8 shadow-xl">
                    <textarea value={reportText} onChange={e => setReportText(e.target.value)} className="w-full bg-slate-900 rounded-2xl p-6 text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none h-48 mb-4 scrollbar-hide" placeholder="Paste security report or checklist log for AI auditing..."></textarea>
                    <button onClick={handleAnalyzeReport} disabled={isAnalyzing || !reportText} className="w-full bg-emerald-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50">Run AI Integrity Audit</button>
                    {isAnalyzing && <div className="mt-4 flex items-center gap-3 text-emerald-400 font-bold text-xs"><RefreshCw size={14} className="animate-spin"/> AI Auditor Analyzing...</div>}
                  </div>
                  {analysisResult && (
                    <div className="bg-slate-800/40 rounded-3xl p-8 border border-slate-700 animate-in slide-in-from-bottom-5">
                      <h4 className="text-sm font-black text-emerald-400 mb-6 flex items-center gap-2 uppercase tracking-widest"><ShieldCheck size={18}/> Audit Findings</h4>
                      <MarkdownRenderer content={analysisResult} />
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <h3 className="text-2xl font-black uppercase flex items-center gap-3"><Briefcase className="text-blue-500"/> SOP Templates</h3>
                  <div className="grid gap-4">
                    {STATIC_TEMPLATES.map(t => (
                      <div key={t.id} className="bg-[#1b2537] p-6 rounded-3xl border border-slate-700 flex justify-between items-center group hover:bg-slate-800/50 transition-all">
                        <div>
                          <h4 className="font-bold text-lg text-white mb-1">{t.title}</h4>
                          <p className="text-xs text-slate-500">{t.description}</p>
                        </div>
                        <button onClick={() => {navigator.clipboard.writeText(t.content); alert('Template copied.');}} className="p-3 bg-slate-900 rounded-xl hover:text-blue-500"><Copy size={20}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0a1222] w-full max-w-md rounded-3xl border border-slate-800 p-8 space-y-6 shadow-2xl">
            <h3 className="text-2xl font-bold flex items-center gap-3"><User size={28} className="text-blue-500"/> CEO Identity</h3>
            <div className="space-y-4">
              <input value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Full Name" />
              <input value={userProfile.email} onChange={e => setUserProfile({...userProfile, email: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Official Email" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => {syncVaultToCloud(btoa(userProfile.email), { profile: userProfile }); alert('Backup saved.');}} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500"><CloudUpload size={18}/> Backup</button>
              <button onClick={() => setShowSettings(false)} className="flex-1 bg-slate-800 py-3 rounded-xl font-bold hover:bg-slate-700">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
