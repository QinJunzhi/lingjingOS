import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeContext, ENGINE_CONFIG, ENGINE_DETAILS } from '../constants';
import { EngineType } from '../types';

export const Modules: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const renderStatBar = (label: string, value: number, colorClass: string) => (
    <div className="mb-2">
      <div className="flex justify-between text-xs font-mono text-cb-sub mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-cb-input rounded-sm overflow-hidden">
        <div 
          className={`h-full ${colorClass}`} 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center min-h-screen bg-cb-bg text-cb-text p-5 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="w-full max-w-[1000px] pb-5 flex justify-between items-center border-b border-cb-border mb-8 transition-colors duration-300">
        <div className="flex items-center gap-4">
           <Link 
            to="/caibao" 
            className="w-8 h-8 flex items-center justify-center text-cb-sub hover:text-cb-accent transition-colors"
            title="返回菜包首页"
          >
            <i className="fas fa-chevron-left"></i>
          </Link>
          <h1 className="m-0 text-2xl font-semibold text-cb-text flex items-center gap-3">
            <i className="fas fa-layer-group text-cb-accent"></i>
            系统架构概览
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-[38px] h-[38px] flex items-center justify-center bg-transparent border border-cb-border text-cb-sub rounded hover:text-cb-accent hover:border-cb-accent transition-all duration-200 cursor-pointer text-lg"
            title="切换主题"
          >
             <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <Link 
            to="/terminal" 
            className="w-[38px] h-[38px] flex items-center justify-center bg-transparent border border-cb-border text-cb-sub rounded hover:text-cb-accent hover:border-cb-accent transition-all duration-200 cursor-pointer text-lg no-underline"
            title="进入终端"
          >
            <i className="fas fa-terminal"></i>
          </Link>
        </div>
      </header>

      {/* Grid Content */}
      <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(EngineType).map((type) => {
          const config = ENGINE_CONFIG[type];
          const details = ENGINE_DETAILS[type];
          
          return (
            <div 
              key={type}
              onClick={() => navigate(`/modules/${type}`)}
              className="bg-cb-chat border border-cb-border p-6 rounded-lg hover:shadow-neon hover:border-cb-accent transition-all duration-300 group flex flex-col cursor-pointer transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-cb-input flex items-center justify-center text-2xl text-cb-accent border border-cb-border group-hover:border-cb-accent transition-colors`}>
                  <i className={`fas ${details.icon}`}></i>
                </div>
                <div className="text-right">
                   <div className="text-xs text-cb-sub font-mono">MODEL ID</div>
                   <div className="text-xs font-mono text-cb-accent">{config.model.split('-').slice(0, 3).join('-')}</div>
                </div>
              </div>

              <h2 className="text-xl font-bold mb-1 text-cb-text group-hover:text-cb-accent transition-colors">{config.name}</h2>
              <div className="text-sm text-cb-accent mb-4 font-mono">{details.tagline}</div>
              
              <p className="text-sm text-cb-sub leading-relaxed mb-6 flex-grow">
                {details.longDescription}
              </p>

              <div className="border-t border-cb-border pt-4">
                {renderStatBar("响应速度", details.stats.speed, "bg-blue-500")}
                {renderStatBar("逻辑深度", details.stats.logic, "bg-purple-500")}
                {renderStatBar("系统稳定性", details.stats.stability, "bg-green-500")}
              </div>
              
              <div className="mt-4 text-center text-xs text-cb-sub opacity-0 group-hover:opacity-100 transition-opacity">
                点击查看完整参数
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 text-center text-cb-sub text-xs font-mono">
        SYSTEM STATUS: ONLINE | CONNECTED TO DARK STAR PROTOCOL
      </div>
    </div>
  );
};