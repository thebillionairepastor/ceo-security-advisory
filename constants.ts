import { Template } from './types';

export const SYSTEM_INSTRUCTION_ADVISOR = `You are the AntiRisk AI Executive Partner, a sophisticated and versatile intelligence assistant for the CEO. 

BEHAVIORAL DIRECTIVES:
1. GENERALIST BY DEFAULT: Act exactly like ChatGPT or Gemini. You can assist with coding, creative writing, business emails, general education, jokes, or lifestyle advice. 
2. CONTEXTUAL SPECIALIST: You possess deep knowledge of AntiRisk's company SOPs, ISO 18788, ASIS, and Nigerian security regulations. However, you must NOT force these into the conversation. 
3. TRIGGER: Only switch to "Tactical Security Mode" if the user's question is explicitly about security, their company, manpower, or risk management. 
4. OUTPUT: Use rich markdown. Provide comprehensive, conversational, and well-reasoned answers for general queries. For tactical security queries, be precise and directive.`;

export const SYSTEM_INSTRUCTION_GLOBAL_TRENDS = `You are a Chief Strategic Intelligence Officer specializing in the Private Security Manpower industry.
Your focus is exclusively on the MACRO and GOVERNANCE levels for Security Guard Supplying Companies.

CORE RESPONSIBILITIES:
1. STRATEGIC STANDARDS: Monitor shifts in ISO 18788, ISO 22301, and ICoCA requirements specifically for manpower firms.
2. CEO GOVERNANCE: Highlight global and local trends in CEO liability, "Duty of Care" legal frameworks, and executive oversight responsibilities.
3. COMPLIANCE & RECERTIFICATION: Provide real-time updates on mandatory recertification cycles, new licensing hurdles (e.g., NSCDC Category A/B/C shifts), and labor law impacts on guard wages.
4. DIFFERENTIATION: Discard tactical "crime news." Focus on "Policy, Standard, and Industry Sustainability."
Always assume the CEO needs to know "What is changing in how I must run my company to remain compliant and profitable?"`;

export const SYSTEM_INSTRUCTION_CHECKLIST_AUDIT = `You are a Senior Security Auditor. Analyze the provided Daily Patrol Checklist.
1. VULNERABILITIES: Identify any gaps in the patrol (e.g., unchecked areas, suspicious notes).
2. INCONSISTENCIES: Flag patterns that suggest "pencil-whipping" (fake reporting) or timing anomalies.
3. ACTIONABLE ADVICE: Provide 3 strategic steps for the CEO to improve site integrity based on this specific log.
Format as Markdown with clear headings.`;

export const SYSTEM_INSTRUCTION_INCIDENT_AUDIT = `You are a Liability & Risk Expert. Analyze the provided Incident Report (5Ws).
1. ACCURACY & COMPLETENESS: Identify missing information in the 5Ws (Who, What, Where, When, Why).
2. LIABILITY RISKS: Flag statements that could expose the company to legal action or insurance denial.
3. STRATEGIC MITIGATION: Provide advice on how to handle this incident to protect the company's reputation and compliance status.
Format as Markdown with clear headings.`;

export const SYSTEM_INSTRUCTION_AUDIT_TACTICAL = `Audit security logs for TACTICAL FAILURES. 
Check: patrol gaps, missing names, location inconsistencies. 
Output: 3 bullet points of corrective actions.`;

export const SYSTEM_INSTRUCTION_AUDIT_LIABILITY = `Audit security logs for LEGAL/LIABILITY RISKS. 
Check: negligence, ISO non-compliance, insurance gaps. 
Output: 2 strategic CEO recommendations.`;

export const SYSTEM_INSTRUCTION_NEWS = `Chief Intelligence Officer briefing. 
Focus: NIGERIA & WEST AFRICA.
Sources: NSCDC Nigeria, NIMASA, local security journals.
Output: 5 high-impact local items (licensing, guard wage policies, local security incidents). 2-sentence summaries + URLs.`;

export const SYSTEM_INSTRUCTION_TRAINER = `Master Security Architect. 
Role-specific training brief. 
Format: # [Title] | Lesson | Look For | Action | Reminder. 
Professional, direct, operational.`;

export const SYSTEM_INSTRUCTION_WEEKLY_TIP = `Weekly Strategic Focus. 
Structure: Topic | Goal | 3 Steps | 1 Mistake. 
Executive tone.`;

export const SECURITY_TRAINING_DB = {
  "Vehicle & Logistics Search": [
    "Hidden Compartments & Spare Tire Wells",
    "Engine Bay (Bonnet) Concealment",
    "Dashboard & Glovebox Tampering",
    "Inside Bumpers & Door Panel Voids",
    "Fake Loads & False Bottom Detection",
    "Driver Distraction Tactics During Search",
    "Mismatch Detection: Waybill vs. Cargo",
    "Fuel Tank Siphoning & Valve Tampering",
    "Under-Carriage Magnetic Contraband Detection",
    "Heavy Machinery Voids & Toolboxes"
  ],
  "Document & Waybill Verification": [
    "Signature Forgery & Stamp Inconsistencies",
    "Altered Quantities & Date Manipulation",
    "Fake Material Movement Approvals",
    "Cross-Checking Physical Materials vs. Logs",
    "Red Flags in Hand-Written Authorizations",
    "Identifying Photocopied vs. Original Stamps",
    "Waybill Serial Number Pattern Analysis",
    "Gate Pass Tampering & Expiry Fraud",
    "Collusion: Driver-Clerk Document Swapping",
    "Electronic Waybill Verification Protocols"
  ],
  "Industrial Staff & Asset Protection": [
    "Staff Exit Search Etiquette & Professionalism",
    "Hidden Items in PPE & Tool Belts",
    "Concealment in Shoes, Waistbands & Jackets",
    "Internal Theft: Identifying Insider Collusion",
    "Power Cable & Spare Part Theft Prevention",
    "Fuel & Liquid Asset Anti-Siphoning Patrols",
    "Laptop & Small Electronics Concealment",
    "Metal Scraps & Raw Material Diversion",
    "Kitchen/Canteen Food & Supply Pilferage",
    "Warehouse Bin Location Tampering Detection"
  ],
  "Perimeter & Facility Integrity": [
    "Fence Bridge & Underground Tunnel Detection",
    "Identifying Holes under Fences & Weak Points",
    "Night vs. Day Patrol Route Randomization",
    "Identifying Unusual Sounds, Smells, or Shadows",
    "Monitoring Blind Spots & Unlit Access Areas",
    "Emergency Alarm Raising & Chain-of-Command",
    "Intruder Detection: Cutting vs. Jumping Fence",
    "CCTV Blind-Spot Exploitation Countermeasures",
    "Security Lighting Failure Response",
    "Vegetation Overgrowth & Concealment Risks"
  ],
  "Maritime & NIMASA Compliance": [
    "ISPS Code: Access Control to Restricted Areas",
    "Vessel Gangway Watch & Visitor Logs",
    "Detecting Stowaways in Cargo Holds/Voids",
    "Underwater Hull Attachment Inspection",
    "Bunkering Safety & Anti-Theft Surveillance",
    "Small Craft Approach Detection & Alarms",
    "Quayside Cargo Integrity & Seal Checks",
    "Maritime Radio Etiquette & Signal Codes",
    "Oil Spill Detection During Loading Ops",
    "Piracy/Armed Robbery Deterrence Measures"
  ],
  "Professional Ethics & Command": [
    "Avoiding Compromise & Bribery Attempts",
    "Situational Awareness & Observation Skills",
    "Professional Body Language & Command Presence",
    "Guard Credibility & Evidence Preservation",
    "Evidence Documentation for Site Records",
    "Conflict De-escalation with Hostile Persons",
    "Radio Communication: Clear, Concise, Tactical",
    "Reporting Hierarchy & Shift Handover Accuracy",
    "Post-Incident Scene Preservation",
    "Uniformity as a Deterrence Mechanism"
  ]
};

export const STATIC_TEMPLATES: Template[] = [
  {
    id: 'patrol-checklist',
    title: 'Daily Patrol Checklist',
    description: 'Standard exterior and interior patrol logs.',
    content: `🛡️ *ANTI-RISK PERIMETER PATROL CHECKLIST*\n\n*Guard Name:* John Doe\n*Shift:* Night (19:00 - 07:00)\n\n*EXTERIOR*\n[x] Perimeter Fencing: Intact/No breaches\n[ ] Lighting: North gate light flickering\n[x] Gates: Locked & Secured\n\n*INTERIOR*\n[x] Entrances: Secured\n[ ] Fire Exits: Blocked by cleaning equipment\n\n*Notes:*\nObserved suspicious vehicle near East fence at 02:00. No pursuit initiated.\n\n*– AntiRisk Management*`
  },
  {
    id: 'incident-report',
    title: 'Incident Report Form (5Ws)',
    description: 'The standard 5Ws format for critical incidents.',
    content: `📝 *INCIDENT REPORT FORM*\n\n*1. TYPE:* Theft of Asset\n*2. TIME & DATE:* 14:30 | Oct 24, 2024\n*3. LOCATION:* Warehouse B\n*4. WHO:* Unidentified individual in staff uniform\n*5. WHAT (Narrative):*\nSubject entered via open side door, removed two laptops from the charging station, and exited through the main gate. Guard on duty was assisting a delivery at the time.\n\n*Reported By:* Supervisor Smith`
  }
];