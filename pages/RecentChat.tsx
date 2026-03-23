import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../constants';
import { getHistory, clearHistory } from '../services/storageService';
import { ChatMessage } from '../types';

export const RecentChat: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [history, setHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setHistory(getHistory().reverse());
  }, []);

  const handleClear = () => {
    if (window.confirm("确定清除所有日志吗？")) {
      clearHistory();
      setHistory([]);
    }
  };

  const formatMessage = (msg: ChatMessage) => {
    // Check if it was a squad member interaction
    let senderName = "菜包";
    let senderColorClass = "text-[#3fb950]"; // Default Green
    
    if (msg.senderName) {
      senderName = msg.senderName;
      // You could map specific colors here if stored, or just use a generic elite color
      senderColorClass = "text-[#a855f7]"; // Purple for Squad
    }

    const roleSpan = msg.role === 'user' 
      ? `<span class="text-cb-accent font-bold">用户:</span>` 
      : `<span class="${senderColorClass} font-bold">${senderName}:</span>`;
    return { __html: `${roleSpan} ${msg.content}` };
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-cb-bg text-cb-text p-5 font-sans transition-colors duration-300">
      <header className="w-full max-w-[850px] pb-5 flex justify-between items-center border-b border-cb-border mb-8 transition-colors duration-300">
        <div className="flex items-center gap-4">
           <Link 
            to="/caibao" 
            className="w-8 h-8 flex items-center justify-center text-cb-sub hover:text-cb-accent transition-colors"
            title="返回菜包首页"
          >
            <i className="fas fa-chevron-left"></i>
          </Link>
          <h1 className="m-0 text-2xl font-semibold text-cb-text">系统交互日志</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-[38px] h-[38px] flex items-center justify-center bg-transparent border border-cb-border text-cb-sub rounded hover:text-cb-accent hover:border-cb-accent transition-all duration-200 cursor-pointer text-lg"
            title="切换主题"
          >
             <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <button 
            onClick={handleClear}
            className="h-[38px] px-5 flex items-center justify-center bg-[rgba(248,81,73,0.05)] border border-accent-red text-accent-red rounded hover:bg-accent-red hover:text-white hover:shadow-[0_0_10px_rgba(248,81,73,0.3)] transition-all duration-200 cursor-pointer text-sm"
          >
            <i className="fas fa-trash mr-2"></i>清除记录
          </button>
          <Link 
            to="/terminal" 
            className="w-[38px] h-[38px] flex items-center justify-center bg-transparent border border-cb-border text-cb-sub rounded hover:text-cb-accent hover:border-cb-accent transition-all duration-200 cursor-pointer text-lg no-underline"
            title="返回终端"
          >
            <i className="fas fa-terminal"></i>
          </Link>
        </div>
      </header>

      <div className="w-full max-w-[850px]">
        {history.length === 0 ? (
          <div className="text-center text-cb-sub italic">暂无交互记录</div>
        ) : (
          history.map((msg, index) => (
            <div 
              key={msg.id + index}
              className={`bg-cb-chat border border-cb-border mb-3 p-4 rounded text-sm font-mono leading-relaxed whitespace-pre-wrap transition-colors duration-300 border-l-4 text-cb-text ${
                msg.role === 'user' ? 'border-l-cb-accent' : (msg.senderName ? 'border-l-[#a855f7]' : 'border-l-[#3fb950]')
              }`}
            >
               <div dangerouslySetInnerHTML={formatMessage(msg)} />
               <div className="text-xs text-cb-sub mt-2 opacity-50">
                 {new Date(msg.timestamp).toLocaleString()} {msg.engine ? `[${msg.engine}]` : ''}
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};