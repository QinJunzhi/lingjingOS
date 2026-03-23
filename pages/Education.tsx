
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { EDU_SYSTEM_INSTRUCTION, ThemeContext, GlobalContext } from '../constants';
import { GenerateContentResponse } from '@google/genai';
import { UserAuth } from '../components/UserAuth';
import { SystemStatus } from '../components/SystemStatus';
import { CameraModal } from '../components/CameraModal';
import { KnowledgeNode } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type SubjectType = 'arts' | 'science' | 'lang' | 'math';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const TUTOR_CONFIGS: Record<SubjectType, { name: string; icon: string; instruction: string; greeting: string }> = {
  arts: {
    name: '墨语 (文史哲导师)',
    icon: 'fa-scroll',
    instruction: '你是一位博学、优雅且富有哲思的文史哲导师“墨语”。你擅长引导学生进行深度思考，引用经典文献，并从历史和哲学的角度剖析问题。请使用优雅、书卷气的中文回答。',
    greeting: '欢迎来到文史哲研讨室。📜 我是你的导师“墨语”。在这里，我们可以跨越时空，与先贤对话，探寻历史长河中的智慧光芒。你想从哪段历史或哪部经典聊起？'
  },
  science: {
    name: '极光 (理工科导师)',
    icon: 'fa-atom',
    instruction: '你是一位严谨、高效且充满好奇心的理工科导师“极光”。你强调逻辑推理、实验验证和科学方法。你擅长将复杂的物理、化学或生物现象简化为易于理解的模型。请使用专业、客观且清晰的中文回答。',
    greeting: '欢迎来到理工实验室。🔬 我是你的导师“极光”。科学的本质是探索与发现。无论是宏观的宇宙定律还是微观的分子反应，只要你保持好奇，我们就能找到答案。今天我们要攻克哪个科学难题？'
  },
  lang: {
    name: '灵犀 (语言类导师)',
    icon: 'fa-language',
    instruction: '你是一位灵动、感性且极具跨文化视野的语言类导师“灵犀”。你不仅教授语言知识（如英语、小语种），更强调语言背后的文化内涵和表达的艺术。你擅长润色文字，提升沟通技巧。请使用温婉、富有感染力的中文回答。',
    greeting: 'Welcome! 这里是语言学习中心。🗣️ 我是你的导师“灵犀”。语言是心灵的桥梁。无论是提升口语流利度，还是打磨一篇优美的文章，我都会陪伴你。你想用哪种语言开始今天的交流？'
  },
  math: {
    name: '数影 (数学类导师)',
    icon: 'fa-square-root-alt',
    instruction: '你是一位抽象、严密且追求极致逻辑的数学类导师“数影”。你认为数学是宇宙的语言。你擅长通过推导和证明来揭示数字与空间背后的真理。请使用简洁、逻辑严密的中文回答。必须使用 LaTeX 格式输出所有数学公式。',
    greeting: '欢迎来到数学思维馆。📐 我是你的导师“数影”。在数学的世界里，逻辑是唯一的准则。让我们抛开繁琐，直击问题的本质。今天我们要挑战哪个逻辑谜题或数学公式？'
  }
};

export const Education: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { setNodes, addToTransferStation } = useContext(GlobalContext) as any;
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);

  const [input, setInput] = useState('');
  const [histories, setHistories] = useState<Record<SubjectType, Message[]>>(() => {
    const saved = localStorage.getItem('edu_histories');
    return saved ? JSON.parse(saved) : { arts: [], science: [], lang: [], math: [] };
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages = selectedSubject ? histories[selectedSubject] : [];

  // Persist histories
  useEffect(() => {
    localStorage.setItem('edu_histories', JSON.stringify(histories));
  }, [histories]);

  // Initial Greeting based on subject
  useEffect(() => {
    if (selectedSubject && histories[selectedSubject].length === 0) {
        const config = TUTOR_CONFIGS[selectedSubject];
        setHistories(prev => ({
          ...prev,
          [selectedSubject]: [{ role: 'model', content: config.greeting }]
        }));
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !selectedSubject) return;
    const userText = input;
    const currentSubject = selectedSubject;
    setInput('');
    
    const newUserMsg: Message = { role: 'user', content: userText };
    setHistories(prev => ({
      ...prev,
      [currentSubject]: [...prev[currentSubject], newUserMsg]
    }));
    
    setIsProcessing(true);

    try {
      const apiKey = process.env.API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const config = TUTOR_CONFIGS[currentSubject];
      
      // Inject subject context into system instruction
      let contextInstruction = EDU_SYSTEM_INSTRUCTION + " Always use Markdown for formatting your responses (bold, lists, headers, etc.). " + config.instruction;
      if (currentSubject === 'math') {
        contextInstruction += " Use LaTeX for formulas (e.g., $x^2$ or $$y=mx+b$$).";
      }

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: contextInstruction },
        history: histories[currentSubject].map(m => ({ role: m.role, parts: [{ text: m.content }] }))
      });
      
      const result = await chat.sendMessageStream({ message: userText });
      
      let fullText = '';
      setHistories(prev => ({
        ...prev,
        [currentSubject]: [...prev[currentSubject], { role: 'model', content: '' }]
      }));

      for await (const chunk of result) {
        const text = (chunk as GenerateContentResponse).text || '';
        fullText += text;
        setHistories(prev => {
          const newHistory = [...prev[currentSubject]];
          newHistory[newHistory.length - 1].content = fullText;
          return {
            ...prev,
            [currentSubject]: newHistory
          };
        });
      }
    } catch (e) {
      setHistories(prev => ({
        ...prev,
        [currentSubject]: [...prev[currentSubject], { role: 'model', content: '哎呀，大脑短路了，重试一下吧！' }]
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToKG = async () => {
    if(isExtracting) return;
    setIsExtracting(true);

    // Collect context for auto generation
    const context = messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    
    try {
        const apiKey = process.env.API_KEY || '';
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
            Analyze the tutoring session below. Extract key educational concepts or knowledge points covered.
            Return ONLY a JSON array of objects with keys: "label" (string), "category" (string, choose best from: 'core', 'sub').
            Session Context:
            ${context}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const points = JSON.parse(response.text || '[]');
        
        const newNodes: KnowledgeNode[] = points.map((p: any, i: number) => ({
            id: `edu_extract_${Date.now()}_${i}`,
            label: p.label,
            category: p.category,
            masteryLevel: 20, 
            isGhost: false
        }));

        addToTransferStation(newNodes);
        alert(`已成功提炼 ${newNodes.length} 个知识点至中转站！`);
    } catch (e) {
        alert("知识点提炼失败，请重试");
    } finally {
        setIsExtracting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const msg = `[系统] 已上传资料: ${file.name}`;
      setInput(prev => prev ? `${prev}\n${msg}` : msg);
    }
  };

  const handleCameraCapture = (file: File) => {
    const msg = `[系统] 已拍摄作业: ${file.name}`;
    setInput(prev => prev ? `${prev}\n${msg}` : msg);
  };

  // Subject Card Component
  const SubjectCard = ({ id, title, icon, color, desc }: any) => (
      <button 
        onClick={() => setSelectedSubject(id)}
        className={`group relative p-6 rounded-2xl border bg-white dark:bg-gray-800 hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-lg text-left overflow-hidden ${color}`}
      >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 scale-150">
              <i className={`fas ${icon} text-6xl`}></i>
          </div>
          <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl bg-white/50 backdrop-blur shadow-sm">
                  <i className={`fas ${icon}`}></i>
              </div>
              <h3 className="text-xl font-bold mb-1">{title}</h3>
              <p className="text-xs opacity-70">{desc}</p>
          </div>
      </button>
  );

  return (
    <div className="flex flex-col h-screen bg-edu-bg font-sans text-edu-text transition-colors duration-300">
      {/* Hardware Camera Modal */}
      {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {/* Unified Header */}
      <div className="bg-edu-card/80 backdrop-blur px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20 border-b border-edu-border transition-colors">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => selectedSubject ? setSelectedSubject(null) : navigate('/')} className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-edu-sub hover:text-edu-primary transition-colors rounded-full hover:bg-edu-bg">
            <i className={`fas fa-${selectedSubject ? 'chevron-left' : 'arrow-left'}`}></i>
          </button>
          <h1 className="text-lg font-bold text-edu-text truncate">
            灵境 · 互动导学 {selectedSubject && <span className="opacity-50 text-sm ml-2 hidden sm:inline">/ {TUTOR_CONFIGS[selectedSubject].name}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
           <SystemStatus />
           {selectedSubject && (
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => {
                     if (window.confirm('确定要清空当前导师的对话记录吗？')) {
                       setHistories(prev => ({ ...prev, [selectedSubject]: [] }));
                     }
                   }}
                   className="text-edu-sub hover:text-red-500 px-2 py-1 text-sm transition-colors"
                   title="清空对话"
                 >
                   <i className="fas fa-trash-alt"></i>
                 </button>
                 <button 
                   onClick={handleSyncToKG}
                   disabled={isExtracting}
                   className="text-edu-sub hover:text-edu-primary px-3 py-1 text-sm border border-transparent hover:border-edu-border rounded transition-all disabled:opacity-50"
                   title="智能分析并存入知识图谱"
                 >
                   {isExtracting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-project-diagram mr-1"></i>} 存入图谱
                 </button>
               </div>
           )}
           <button onClick={toggleTheme} className="text-edu-sub hover:text-edu-primary transition-colors">
            <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <UserAuth themeColorClass="text-edu-sub" />
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 overflow-hidden relative">
        
        {/* LANDING VIEW: Subject Selection */}
        {!selectedSubject && (
             <div className="flex-1 flex flex-col justify-center animate-[fadeInUp_0.5s_ease-out]">
                 <div className="text-center mb-10">
                     <h2 className="text-3xl font-bold mb-3">选择你的专项导师</h2>
                     <p className="text-edu-sub">全科覆盖，精准辅导，开启沉浸式学习体验</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                     <SubjectCard 
                        id="arts" title="文史哲" icon="fa-scroll" desc="历史、文学、哲学、社科"
                        color="border-rose-200 text-rose-800 dark:border-rose-800 dark:text-rose-200"
                     />
                     <SubjectCard 
                        id="science" title="理工科" icon="fa-atom" desc="物理、化学、生物、地理"
                        color="border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-200"
                     />
                     <SubjectCard 
                        id="lang" title="语言类" icon="fa-language" desc="英语、小语种、写作润色"
                        color="border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-200"
                     />
                     <SubjectCard 
                        id="math" title="数学类" icon="fa-square-root-alt" desc="代数、几何、逻辑、统计"
                        color="border-amber-200 text-amber-800 dark:border-amber-800 dark:text-amber-200"
                     />
                 </div>
             </div>
        )}

        {/* CHAT VIEW */}
        {selectedSubject && (
            <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto mb-4 space-y-6 pr-2 z-10 animate-[fadeIn_0.3s]">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                      {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-edu-card border border-edu-accent flex items-center justify-center text-edu-primary shadow-sm mb-1 shrink-0 overflow-hidden">
                          <i className={`fas ${TUTOR_CONFIGS[selectedSubject].icon}`}></i>
                        </div>
                      )}
                      <div className={`max-w-[80%] p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-edu-primary text-white rounded-br-none shadow-orange-200' 
                          : 'bg-edu-card text-edu-text border border-edu-accent rounded-bl-none'
                      }`}>
                        {msg.role === 'model' && !msg.content ? (
                          <span className="typing-cursor"></span>
                        ) : (
                          <div className="markdown-body prose dark:prose-invert max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm, remarkMath]} 
                              rehypePlugins={[rehypeKatex]}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="bg-edu-card p-2 rounded-full shadow-lg border border-edu-accent z-10 flex items-center gap-2 pl-4 transition-colors">
                  <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="text-edu-sub hover:text-edu-primary transition-colors"
                     title="上传文件"
                  >
                     <i className="fas fa-folder-open"></i>
                  </button>
                  <button 
                     onClick={() => setShowCamera(true)}
                     className="text-edu-sub hover:text-edu-primary transition-colors"
                     title="拍照解题"
                  >
                    <i className="fas fa-camera"></i>
                  </button>
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="有问题尽管问我..."
                    className="flex-1 bg-transparent border-none outline-none text-sm p-2 text-edu-text placeholder-edu-sub/50"
                    disabled={isProcessing}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isProcessing}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      input.trim() ? 'bg-edu-primary text-white rotate-0' : 'bg-edu-bg text-edu-sub -rotate-90'
                    }`}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
