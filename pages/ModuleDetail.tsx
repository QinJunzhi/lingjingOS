import React, { useContext } from 'react';
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom';
import { ThemeContext, ENGINE_CONFIG, ENGINE_DETAILS } from '../constants';
import { EngineType } from '../types';

export const ModuleDetail: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { engineId } = useParams<{ engineId: string }>();
  const navigate = useNavigate();

  const type = Object.values(EngineType).find(t => t === engineId);

  if (!type) {
    return <Navigate to="/modules" />;
  }

  const config = ENGINE_CONFIG[type];
  const details = ENGINE_DETAILS[type];

  const handleTestRun = () => {
    // Navigate to terminal with this engine selected
    navigate('/terminal', { state: { initialEngine: type } });
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-bg-body text-text-primary p-5 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="w-full max-w-[800px] pb-5 flex justify-between items-center border-b border-border mb-8">
        <div className="flex items-center gap-4">
           <Link 
            to="/modules" 
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
            title="返回架构概览"
          >
            <i className="fas fa-arrow-left"></i>
          </Link>
           <Link 
            to="/" 
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
            title="返回首页"
          >
            <i className="fas fa-home"></i>
          </Link>
          <h1 className="m-0 text-xl font-mono text-accent uppercase tracking-widest">
            Module: {type}
          </h1>
        </div>
        <button onClick={toggleTheme} className="text-text-secondary hover:text-accent">
           <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
      </header>

      {/* Content */}
      <div className="w-full max-w-[800px] animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex items-start gap-6 mb-8">
          <div className="w-24 h-24 rounded-xl bg-bg-input flex items-center justify-center text-5xl text-accent border border-accent shadow-neon">
            <i className={`fas ${details.icon}`}></i>
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-2">{config.name}</h2>
            <div className="text-lg text-text-secondary font-mono">{details.tagline}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-bg-chat border border-border p-6 rounded-lg">
             <h3 className="text-sm font-bold text-text-secondary uppercase mb-4 tracking-wider border-b border-border pb-2">核心参数 (Specs)</h3>
             <ul className="space-y-3">
               {details.technicalSpecs.map((spec, index) => (
                 <li key={index} className="flex items-start gap-2 text-sm">
                   <span className="text-accent mt-1">▹</span>
                   <span>{spec}</span>
                 </li>
               ))}
             </ul>
          </div>
          <div className="bg-bg-chat border border-border p-6 rounded-lg">
            <h3 className="text-sm font-bold text-text-secondary uppercase mb-4 tracking-wider border-b border-border pb-2">性能分析 (Analysis)</h3>
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>SPEED</span>
                    <span className="font-mono text-accent">{details.stats.speed}/100</span>
                  </div>
                  <div className="h-2 bg-bg-input rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{width: `${details.stats.speed}%`}}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>LOGIC DEPTH</span>
                    <span className="font-mono text-accent">{details.stats.logic}/100</span>
                  </div>
                  <div className="h-2 bg-bg-input rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{width: `${details.stats.logic}%`}}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>STABILITY</span>
                    <span className="font-mono text-accent">{details.stats.stability}/100</span>
                  </div>
                  <div className="h-2 bg-bg-input rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{width: `${details.stats.stability}%`}}></div>
                  </div>
               </div>
             </div>
          </div>
        </div>

        <div className="bg-bg-chat border border-border p-6 rounded-lg mb-8">
          <h3 className="text-sm font-bold text-text-secondary uppercase mb-4 tracking-wider border-b border-border pb-2">详细描述</h3>
          <p className="leading-relaxed text-text-primary">
            {details.longDescription}
          </p>
        </div>

        <button 
          onClick={handleTestRun}
          className="w-full py-4 bg-accent text-accent-bg font-bold tracking-widest uppercase rounded hover:shadow-neon hover:brightness-110 transition-all duration-300"
        >
          INITIALIZE TEST RUN // 启动测试
        </button>
      </div>
    </div>
  );
};
