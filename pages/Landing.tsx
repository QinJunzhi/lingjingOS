import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../constants';
import { LANDING_TYPEWRITER_TEXT } from '../constants';

export const Landing: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    // Removed forced dark mode to respect global theme
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < LANDING_TYPEWRITER_TEXT.length) {
        setDisplayText((prev) => prev + LANDING_TYPEWRITER_TEXT.charAt(index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 60);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-screen flex flex-col justify-center items-center overflow-hidden font-sans bg-cb-bg text-cb-text transition-colors duration-300">
       {/* Grid Background */}
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-40 z-0 pointer-events-none grid-bg transform perspective-[500px] rotate-x-[60deg]"></div>

      {/* Unified Return Button */}
      <Link 
        to="/"
        className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-cb-chat hover:bg-cb-accent/10 text-cb-sub hover:text-cb-accent transition-colors z-20 border border-cb-border hover:border-cb-accent"
        title="Return to OS"
      >
        <i className="fas fa-arrow-left"></i>
      </Link>

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-cb-chat hover:bg-cb-accent/10 text-cb-sub hover:text-cb-accent transition-colors z-20 border border-cb-border hover:border-cb-accent"
        title="切换主题"
      >
        <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
      </button>

      <div className="container relative z-10 text-center animate-[fadeInUp_1s_ease-out]">
        <h1 className="text-7xl md:text-8xl lg:text-9xl mb-2 font-semibold tracking-widest bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-blue-600 dark:from-white dark:to-cb-accent filter drop-shadow-[0_0_25px_rgba(88,166,255,0.4)] dark:filter-none light:drop-shadow-[0_5px_10px_rgba(0,0,0,0.1)]">
          菜 包
        </h1>
        <div className="status text-cb-sub mb-16 font-mono text-lg min-h-[1.5em]">
          <span>{displayText}</span><span className="typing-cursor"></span>
        </div>
        
        <div className="flex flex-col gap-4 items-center">
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <Link 
              to="/terminal" 
              className="inline-block w-48 py-4 text-xl bg-cb-input text-cb-accent border border-cb-accent rounded hover:bg-cb-accent hover:text-cb-accentBg shadow-none hover:shadow-neon transition-all duration-300 tracking-wider no-underline"
            >
              接入频率
            </Link>
            
            <Link 
              to="/modules" 
              className="inline-block w-48 py-4 text-xl bg-transparent text-cb-sub border border-cb-sub rounded hover:border-cb-accent hover:text-cb-accent transition-all duration-300 tracking-wider no-underline"
            >
              系统核心
            </Link>
          </div>
          
          <Link 
            to="/dark_star" 
            className="mt-4 text-sm text-cb-sub/50 hover:text-[#a855f7] transition-colors font-mono tracking-widest uppercase hover:tracking-[0.2em] duration-300 flex items-center gap-2"
          >
            <i className="fas fa-star text-[10px]"></i> Dark Star Protocol
          </Link>
        </div>
      </div>
    </div>
  );
};