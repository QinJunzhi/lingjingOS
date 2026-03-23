
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { EngineType, ChatMessage, MBTIPersona, KnowledgeNode } from '../types';
import { ThemeContext, ENGINE_CONFIG, GlobalContext } from '../constants';
import { streamChatResponse } from '../services/geminiService';
import { addMessageToHistory } from '../services/storageService';
import { GenerateContentResponse, GoogleGenAI } from '@google/genai';

export const Chat: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { addToTransferStation } = useContext(GlobalContext) as any;
  const location = useLocation();
  const navigate = useNavigate();
  const [engine, setEngine] = useState<EngineType>(EngineType.FROST_BLADE);
  
  // State for Squad/Persona (Now MBTI)
  const [squadMember, setSquadMember] = useState<MBTIPersona | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize from location state
  useEffect(() => {
    const state = location.state as { initialEngine?: EngineType; squadMember?: MBTIPersona };
    
    if (state?.squadMember) {
      setSquadMember(state.squadMember);
      setEngine(EngineType.ETERNAL_CORE); // Personas usually use stronger models or default
      setMessages([{
        id: 'init',
        role: 'model',
        content: `神经链接已同步。我是 ${state.squadMember.name} (${state.squadMember.type})。我已准备好协助。`,
        timestamp: Date.now(),
        senderName: state.squadMember.name
      }]);
    } else if (state?.initialEngine) {
      setEngine(state.initialEngine);
      setMessages([{
        id: 'init',
        role: 'model',
        content: `系统就绪。引擎已锁定: ${ENGINE_CONFIG[state.initialEngine].name}。`,
        timestamp: Date.now()
      }]);
    } else {
      setMessages([{
        id: 'init',
        role: 'model',
        content: '系统就绪。',
        timestamp: Date.now()
      }]);
    }
  }, [location.state]);

  const forceScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    forceScrollToBottom();
  }, [messages.length]); 

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsgText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsgText,
      timestamp: Date.now(),
      engine
    };

    setMessages(prev => [...prev, userMsg]);
    addMessageToHistory(userMsg);
    
    setTimeout(forceScrollToBottom, 100);

    setIsLoading(true);
    const botMsgId = (Date.now() + 1).toString();
    
    setMessages(prev => [...prev, {
      id: botMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      engine,
      senderName: squadMember ? squadMember.name : undefined
    }]);

    try {
      const apiHistory = messages.filter(m => m.id !== 'init').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const stream = await streamChatResponse(
        userMsgText, 
        engine, 
        apiHistory, 
        squadMember?.systemInstruction
      );
      
      let fullContent = '';

      for await (const chunk of stream) {
        const contentChunk = (chunk as GenerateContentResponse).text || '';
        fullContent += contentChunk;
        
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId 
            ? { ...msg, content: fullContent } 
            : msg
        ));
        forceScrollToBottom();
      }

      addMessageToHistory({
        id: botMsgId,
        role: 'model',
        content: fullContent,
        timestamp: Date.now(),
        engine,
        senderName: squadMember ? squadMember.name : undefined
      });

    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { ...msg, content: '连接断开。信号丢失。' } 
          : msg
      ));
    } finally {
      setIsLoading(false);
      forceScrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSyncToKG = async () => {
    if(isExtracting) return;
    setIsExtracting(true);
    
    // Extract last 10 messages for context
    const context = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
    
    try {
      const apiKey = process.env.API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Analyze the conversation below. Extract key technical concepts or knowledge points.
        Return ONLY a JSON array of objects with keys: "label" (string), "category" (string, choose best from: 'core', 'sub').
        Conversation:
        ${context}
      `;

      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
      });

      const points = JSON.parse(response.text || '[]');
      
      const newNodes: KnowledgeNode[] = points.map((p: any, i: number) => ({
          id: `chat_extract_${Date.now()}_${i}`,
          label: p.label,
          category: p.category,
          masteryLevel: 20, // Default low
          isGhost: false
      }));

      addToTransferStation(newNodes);
      alert(`已成功提炼 ${newNodes.length} 个知识点至中转站！`);
    } catch (e) {
      alert("提炼失败，请重试");
    } finally {
      setIsExtracting(false);
    }
  };

  const headerStyle = squadMember ? { borderColor: squadMember.color } : {};

  return (
    <div className="flex flex-col h-screen bg-cb-bg text-cb-text transition-colors duration-300 font-sans">
      {/* Top Bar */}
      <div 
        className="absolute top-0 left-0 w-full px-8 py-3 flex justify-between items-center bg-cb-bg/95 backdrop-blur-md z-10 border-b border-cb-border transition-colors duration-300"
        style={squadMember ? { borderBottomColor: `${squadMember.color}50` } : {}}
      >
        <div className="flex items-center gap-5">
           <Link 
            to="/caibao" 
            className="w-8 h-8 flex items-center justify-center text-cb-sub hover:text-cb-accent transition-colors"
            title="返回菜包首页"
          >
            <i className="fas fa-chevron-left"></i>
          </Link>

          {squadMember ? (
            <div className="flex items-center gap-3">
               <span className="font-bold text-xl tracking-wider" style={{ color: squadMember.color }}>
                 {squadMember.name} <span className="text-xs opacity-60 ml-1">[{squadMember.type}]</span>
               </span>
               <span className="text-xs border px-1 rounded uppercase font-mono" style={{ borderColor: squadMember.color, color: squadMember.color }}>
                 SYNCED
               </span>
            </div>
          ) : (
            <>
              <div className="font-semibold text-xl tracking-wider text-cb-text">菜 包</div>
              <div className="relative group">
                <select 
                  value={engine} 
                  onChange={(e) => setEngine(e.target.value as EngineType)}
                  className="appearance-none bg-transparent border border-cb-accent text-cb-accent py-2 pl-4 pr-8 rounded font-sans text-sm cursor-pointer hover:shadow-neon hover:bg-cb-accent/5 transition-all duration-300 focus:outline-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${theme === 'light' ? '0969da' : '58a6ff'}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    backgroundSize: '10px'
                  }}
                >
                  {Object.entries(ENGINE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key} className="bg-cb-bg text-cb-text">
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={handleSyncToKG}
             disabled={isExtracting}
             className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-cb-border rounded hover:border-cb-accent hover:text-cb-accent transition-colors text-sm disabled:opacity-50"
             title="智能提炼当前对话知识点"
           >
             {isExtracting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-project-diagram"></i>} 存入图谱
           </button>

          {squadMember && (
             <Link to="/dark_star" className="w-10 h-10 flex items-center justify-center text-cb-sub hover:text-[#a855f7] transition-colors text-lg" title="暗星人格矩阵">
                <i className="fas fa-star"></i>
             </Link>
          )}
          <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center text-cb-sub hover:text-cb-accent transition-colors text-lg" title="切换主题">
            <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="w-full max-w-[900px] flex flex-col h-full mx-auto pt-[70px] box-border">
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scroll-smooth"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
              <div className={`w-[38px] h-[38px] rounded flex items-center justify-center shrink-0 ${
                msg.role === 'model' 
                  ? 'bg-cb-input border border-cb-border' 
                  : 'bg-cb-accent text-cb-accentBg'
              }`}
               style={msg.role === 'model' && squadMember ? { borderColor: squadMember.color, color: squadMember.color } : (msg.role === 'model' ? {color: 'var(--cb-accent-color)'} : {})}
              >
                <i className={`fas ${
                  msg.role === 'model' 
                    ? (squadMember ? squadMember.icon : 'fa-terminal') 
                    : 'fa-user'
                }`}></i>
              </div>
              <div className={`p-3 px-5 rounded-lg leading-relaxed break-words text-[0.95rem] ${
                msg.role === 'model'
                  ? 'bg-cb-chat border border-cb-border min-h-[20px] text-cb-text'
                  : 'bg-cb-accent text-cb-accentBg font-medium'
              }`}
              style={msg.role === 'model' && squadMember ? { borderLeft: `3px solid ${squadMember.color}` } : {}}
              >
                {msg.senderName && (
                  <div className="text-xs font-bold mb-1 opacity-70" style={{color: squadMember?.color}}>{msg.senderName}</div>
                )}
                
                {msg.role === 'model' ? (
                  <ReactMarkdown 
                    components={{
                      strong: ({node, ...props}) => <span className="font-bold text-cb-accent" style={squadMember ? {color: squadMember.color} : {}} {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      code: ({node, ...props}) => <code className="bg-cb-bg rounded px-1 py-0.5 text-xs font-mono border border-cb-border" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}

                {msg.role === 'model' && msg.content === '' && isLoading && (
                  <span className="typing-cursor"></span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-px w-full"></div>
        </div>

        {/* Input Area */}
        <div className="p-5 bg-cb-bg transition-colors duration-300">
          <div 
            className="bg-cb-input border border-cb-border rounded px-4 py-2 flex items-center transition-colors duration-300 focus-within:border-cb-accent"
            style={squadMember ? { borderColor: `${squadMember.color}50` } : {}}
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={squadMember ? `与 ${squadMember.name} (${squadMember.type}) 进行思维同步...` : "您好，请向菜包提问..."}
              className="flex-1 bg-transparent border-none text-cb-text p-3 outline-none font-sans placeholder-cb-sub"
              autoComplete="off"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={`bg-none border-none text-cb-sub cursor-pointer text-lg hover:text-cb-accent disabled:opacity-50 disabled:cursor-not-allowed`}
              style={squadMember ? { color: squadMember.color } : {}}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
