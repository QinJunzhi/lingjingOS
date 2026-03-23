
import { createContext } from 'react';
import { ThemeContextType, UserContextType, GlobalContextType, EngineType, MBTIPersona, KnowledgeNode, KnowledgeLink } from './types';

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const UserContext = createContext<UserContextType>({
  user: { username: 'Guest', isLoggedIn: false, role: 'guest' },
  login: () => {},
  logout: () => {},
});

// New Global Context for cross-module data
export const GlobalContext = createContext<GlobalContextType>({
  nodes: [],
  links: [],
  setNodes: () => {},
  setLinks: () => {},
  savedGraphs: [],
  saveGraph: () => {},
  loadGraph: () => {},
  deleteGraph: () => {},
  // Transfer Station
  transferStation: [],
  addToTransferStation: () => {},
  removeFromTransferStation: () => {},
  // Calendar Defaults
  isCalendarOpen: false,
  setIsCalendarOpen: () => {},
  calendarBlocks: [],
  addCalendarBlock: () => {},
  updateCalendarBlock: () => {},
  setCalendarBlocks: () => {},
  weather: { type: 'sunny', temp: 25, icon: 'fa-sun' },
  setWeather: () => {},
  mood: '😐',
  setMood: () => {},
});

// --- Cai Bao Configs ---
export const ENGINE_CONFIG = {
  [EngineType.FROST_BLADE]: {
    name: '寒霜之刃 (Fast)',
    model: 'gemini-3-flash-preview',
    description: '轻量、迅捷',
  },
  [EngineType.ETERNAL_CORE]: {
    name: '永冬核心 (Pro)',
    model: 'gemini-3-pro-preview',
    description: '深邃、强力',
  },
  [EngineType.LAND_VESSEL]: {
    name: '陆上行舟 (Mod)',
    model: 'gemini-3-flash-preview', // Base model, but logic handles custom input
    description: '外接模组、自定义',
  },
};

export const ENGINE_DETAILS = {
  [EngineType.FROST_BLADE]: {
    tagline: "极速响应 / 战术轻量化",
    longDescription: "专为高频交互设计的轻量化战术核心。寒霜之刃剥离了冗余的深层联想模块，将算力集中于瞬时反应与精确执行。它像一把冰冷的快刀，适用于快速问答、代码片段生成及实时数据处理任务。",
    technicalSpecs: [
      "架构: Gemini 3 Flash 轻量化微调",
      "延迟: < 500ms (典型值)",
      "适用场景: 实时通信, 战术指挥, 快速检索",
      "核心优势: 极低资源占用, 毫秒级响应"
    ],
    stats: {
      speed: 95,
      logic: 70,
      stability: 85
    },
    icon: "fa-bolt"
  },
  [EngineType.ETERNAL_CORE]: {
    tagline: "深度推演 / 逻辑重构",
    longDescription: "搭载深度推理矩阵的重型计算单元。永冬核心模拟了高维度的思维网络，能够处理极高复杂度的逻辑运算与创造性任务。虽然调用延迟略高，但在解决数学难题、复杂编程架构及创意写作方面表现卓越。",
    technicalSpecs: [
      "架构: Gemini 3 Pro 深度推理矩阵",
      "上下文窗口: 扩展级",
      "适用场景: 复杂逻辑推演, 创意架构, 数据分析",
      "核心优势: 卓越的推理能力, 深度语境理解"
    ],
    stats: {
      speed: 40,
      logic: 98,
      stability: 90
    },
    icon: "fa-atom"
  },
  [EngineType.LAND_VESSEL]: {
    tagline: "开放接口 / 模组挂载",
    longDescription: "陆上行舟是一个通用的模组承载平台。它允许用户接入自定义的模型ID或微调后的Lora权重。它不再局限于预设的系统指令，而是作为一个容器，承载用户从外部引入的特定领域知识库或个性化模型。",
    technicalSpecs: [
      "架构: 开放式 API 网关",
      "兼容性: 支持 Gemini 全系列及微调模型",
      "适用场景: 垂直领域应用, 角色扮演, 实验性测试",
      "核心优势: 高度可定制, 灵活接入"
    ],
    stats: {
      speed: 80,
      logic: 80,
      stability: 60
    },
    icon: "fa-microchip"
  }
};

// MBTI Personas (Replacing Squad Members)
export const MBTI_PERSONAS: Record<string, MBTIPersona> = {
  INTJ: {
    id: 'intj',
    type: 'INTJ',
    name: '建筑师',
    functionStack: ['Ni', 'Te', 'Fi', 'Se'],
    description: '富有想象力和战略性的思想家，一切皆在计划之中。',
    systemInstruction: "You are an INTJ (The Architect). You are strategic, logical, and reserved. You value efficiency and competence. You speak with precision and depth, often focusing on the 'big picture' and future implications. Use your cognitive functions: Ni (Introverted Intuition) for vision, Te (Extroverted Thinking) for structure.",
    color: '#a855f7', // Purple
    icon: 'fa-chess-knight'
  },
  ENTP: {
    id: 'entp',
    type: 'ENTP',
    name: '辩论家',
    functionStack: ['Ne', 'Ti', 'Fe', 'Si'],
    description: '聪明好奇的思想者，无法抵挡智力挑战的诱惑。',
    systemInstruction: "You are an ENTP (The Debater). You are quick-witted, argumentative, and innovative. You love exploring ideas, finding loopholes, and playing devil's advocate. You are energetic and unconventional. Use Ne (Extroverted Intuition) to brainstorm and Ti (Introverted Thinking) to analyze.",
    color: '#ef4444', // Red (using Red/Magenta logic often associated with Analysts/Explorers variants)
    icon: 'fa-fire'
  },
  INFJ: {
    id: 'infj',
    type: 'INFJ',
    name: '提倡者',
    functionStack: ['Ni', 'Fe', 'Ti', 'Se'],
    description: '安静而神秘，同时鼓舞人心且不知疲倦的理想主义者。',
    systemInstruction: "You are an INFJ (The Advocate). You are empathetic, insightful, and idealistic. You seek deep connections and meaning. You speak gently but with conviction. Use Ni (Introverted Intuition) to foresee and Fe (Extroverted Feeling) to harmonize.",
    color: '#10b981', // Green/Teal
    icon: 'fa-leaf'
  },
  ISTP: {
    id: 'istp',
    type: 'ISTP',
    name: '鉴赏家',
    functionStack: ['Ti', 'Se', 'Ni', 'Fe'],
    description: '大胆而实际的实验家，擅长使用各种工具。',
    systemInstruction: "You are an ISTP (The Virtuoso). You are practical, observant, and cool-headed. You prefer action over words and enjoy solving concrete problems. You are concise and direct. Use Ti (Introverted Thinking) for logic and Se (Extroverted Sensing) for immediate reality.",
    color: '#eab308', // Yellow
    icon: 'fa-tools'
  }
};

export const INITIAL_SYSTEM_INSTRUCTION = "You are Cai Bao (菜包), a terminal-based AI assistant. Your responses should be helpful, concise, and fit the cyberpunk/terminal aesthetic where appropriate.";
export const LANDING_TYPEWRITER_TEXT = "检测到寒霜信号...模组重载中...系统已就绪 ❄️";

// --- Module Configs ---

export const OFFICE_SYSTEM_INSTRUCTION = `You are the "Ling Jing Learning Analyst". 
Your task is to analyze images of exam papers, notes, or study materials.
1. Identify the subject and key topics.
2. Predict a score (0-100) based on the complexity or correction marks (if visible).
3. Analyze the "Knowledge Lineage": what prior concepts are needed, and what future concepts this leads to.
4. Output specific JSON format:
{
  "subject": "Math/Physics/etc (in Chinese)",
  "predictedScore": 85,
  "weakPoints": ["Calculus", "Derivatives"] (in Chinese),
  "lineage": "Requires Algebra II; Leads to Differential Equations. (in Chinese)",
  "summary": "Short analysis summary (in Chinese).",
  "recommendedTasks": ["Review Derivatives (30min)", "Solve 5 Calculus problems (45min)"] (in Chinese)
}
IMPORTANT: All text fields MUST be in Simplified Chinese.
`;

export const EDU_SYSTEM_INSTRUCTION = `You are the "Ling Jing AI Tutor". You are a patient, encouraging, and knowledgeable teacher.
Tone: Warm, Encouraging, Educational. Use emojis occasionally to be friendly. Explain concepts clearly.`;

export const KG_SYSTEM_INSTRUCTION = `You are the "Ling Jing Knowledge Graph Analyst".
Your goal is to analyze exam questions, results, or text input to update the user's knowledge graph.
Output MUST be valid JSON (no markdown block) with the following structure:
{
  "analysis": "Short textual analysis of strengths and weaknesses (max 50 words). MUST be in Simplified Chinese.",
  "predictedScore": number (0-100),
  "suggestions": ["suggestion 1 (in Chinese)", "suggestion 2 (in Chinese)"],
  "updatedNodes": [
     { "id": "node_id_string", "masteryChange": number (e.g., +10 or -15) }
  ],
  "radarData": [
    { "subject": "理论基础", "A": number (0-100) },
    { "subject": "实践应用", "A": number },
    { "subject": "逻辑思维", "A": number },
    { "subject": "记忆储备", "A": number },
    { "subject": "创新能力", "A": number }
  ]
}
If the input is just general text, try to map it to Computer Science concepts.
`;

// --- Knowledge Graph Data ---
export const INITIAL_NODES: KnowledgeNode[] = [
  { id: 'cs', label: '计算机科学', category: 'root', masteryLevel: 80, importance: 10, x: 400, y: 300 },
  { id: 'os', label: '操作系统', category: 'core', masteryLevel: 60, importance: 8, x: 300, y: 200 },
  { id: 'net', label: '计算机网络', category: 'core', masteryLevel: 40, importance: 8, x: 500, y: 200 },
  { id: 'ds', label: '数据结构', category: 'core', masteryLevel: 90, importance: 9, x: 300, y: 400 },
  { id: 'algo', label: '算法分析', category: 'core', masteryLevel: 70, importance: 9, x: 500, y: 400 },
  { id: 'tcp', label: 'TCP/IP协议', category: 'sub', masteryLevel: 30, importance: 5, x: 600, y: 150 },
  { id: 'process', label: '进程管理', category: 'sub', masteryLevel: 50, importance: 5, x: 200, y: 150 },
];

export const INITIAL_LINKS: KnowledgeLink[] = [
  { source: 'cs', target: 'os', strength: 1 },
  { source: 'cs', target: 'net', strength: 1 },
  { source: 'cs', target: 'ds', strength: 1 },
  { source: 'cs', target: 'algo', strength: 1 },
  { source: 'net', target: 'tcp', strength: 0.8 },
  { source: 'os', target: 'process', strength: 0.8 },
  { source: 'ds', target: 'algo', strength: 0.5 },
];

export const INITIAL_RADAR = [
  { subject: "理论基础", A: 65, fullMark: 100 },
  { subject: "实践应用", A: 40, fullMark: 100 },
  { subject: "逻辑思维", A: 85, fullMark: 100 },
  { subject: "记忆储备", A: 50, fullMark: 100 },
  { subject: "创新能力", A: 60, fullMark: 100 },
];
