
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../constants';
import ColorManifoldBackground from '../components/ColorManifoldBackground';
import { SystemStatus } from '../components/SystemStatus';

const AppCard: React.FC<{ 
  to: string; 
  icon: string; 
  title: string; 
  subtitle: string; 
  colorClass: string; 
  delayClass: string;
}> = ({ to, icon, title, subtitle, colorClass, delayClass }) => (
  <Link 
    to={to} 
    className={`
      group relative overflow-hidden bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl 
      border border-white/50 dark:border-gray-700/50 rounded-3xl p-8 
      shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] 
      dark:shadow-none dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]
      transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center
      ${delayClass}
    `}
  >
    <div className={`
      w-20 h-20 rounded-2xl mb-6 flex items-center justify-center text-4xl shadow-lg
      ${colorClass} text-white transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500
    `}>
      <i className={`fas ${icon}`}></i>
    </div>
    
    <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-400 transition-all">
      {title}
    </h2>
    
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 opacity-80">
      {subtitle}
    </p>

    {/* Hover Shine Effect */}
    <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 group-hover:animate-[shine_1s_ease-in-out]"></div>
  </Link>
);

export const Launcher: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return 'fa-sun';
      case 'dark': return 'fa-moon';
      case 'system': return 'fa-laptop';
      default: return 'fa-sun';
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 font-sans text-text-main transition-colors duration-300">
      
      {/* Background Manifold */}
      <ColorManifoldBackground />

      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6 z-20 flex gap-2 items-center">
        <SystemStatus />
        <button 
          onClick={toggleTheme} 
          className="w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-md flex items-center justify-center transition-all text-text-muted hover:text-text-main hover:bg-white dark:hover:bg-gray-700 hover:scale-110"
          title={`当前模式: ${theme === 'light' ? '白日' : theme === 'dark' ? '黑夜' : '跟随系统'}`}
        >
          <i className={`fas ${getThemeIcon()} text-xl`}></i>
        </button>
      </div>

      <div className="text-center mb-16 z-10 animate-[fadeInUp_0.8s_ease-out] mt-24 md:mt-0">
        <h1 className="text-6xl md:text-7xl font-extrabold mb-4 tracking-tighter drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          灵境 OS
        </h1>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur border border-white/20 dark:border-white/10 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">System Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl z-10 px-4 pb-12">
        
        <AppCard 
          to="/office" 
          icon="fa-chart-pie" 
          title="学情分析" 
          subtitle="图像识别 · 成绩预测 · 知识谱系"
          colorClass="bg-gradient-to-br from-blue-500 to-indigo-600"
          delayClass="animate-[fadeInUp_0.9s_ease-out]"
        />

        <AppCard 
          to="/education" 
          icon="fa-graduation-cap" 
          title="互动导学" 
          subtitle="全科辅导 · 历史重现 · 苏格拉底"
          colorClass="bg-gradient-to-br from-orange-400 to-red-500"
          delayClass="animate-[fadeInUp_1.0s_ease-out]"
        />

        <AppCard 
          to="/knowledge-graph" 
          icon="fa-project-diagram" 
          title="知识图谱" 
          subtitle="思维可视化 · 技能雷达 · 路径规划"
          colorClass="bg-gradient-to-br from-emerald-400 to-teal-600"
          delayClass="animate-[fadeInUp_1.1s_ease-out]"
        />

        <AppCard 
          to="/caibao" 
          icon="fa-terminal" 
          title="菜包终端" 
          subtitle="多模态接口 · 赛博人格 · 模组加载"
          colorClass="bg-gradient-to-br from-gray-700 to-black border border-gray-600"
          delayClass="animate-[fadeInUp_1.2s_ease-out]"
        />

      </div>

      <footer className="fixed bottom-0 left-0 w-full py-2 text-center text-gray-500 dark:text-gray-400 text-[10px] md:text-xs z-10 drop-shadow-md font-mono opacity-60 bg-gradient-to-t from-bg-body to-transparent pointer-events-none">
        LING JING OS v3.0 • DARK STAR PROTOCOL ENABLED
      </footer>
    </div>
  );
};
