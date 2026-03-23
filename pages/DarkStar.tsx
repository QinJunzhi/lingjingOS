
import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeContext, MBTI_PERSONAS } from '../constants';
import { MBTIPersona } from '../types';

export const DarkStar: React.FC = () => {
  const { toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [selectedPersona, setSelectedPersona] = useState<MBTIPersona | null>(null);

  // Starfield effect (Keep existing aesthetic)
  useEffect(() => {
    const canvas = document.getElementById('starfield') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    
    const stars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2,
      speed: Math.random() * 0.2 + 0.05,
      alpha: Math.random()
    }));

    const animate = () => {
      ctx.fillStyle = '#050505'; 
      ctx.fillRect(0, 0, w, h);
      
      stars.forEach(s => {
        s.y += s.speed;
        if (s.y > h) s.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleConnect = () => {
    if (selectedPersona) {
      // Navigate to chat with the selected Persona
      navigate('/terminal', { state: { squadMember: selectedPersona } });
    }
  };

  return (
    <div className="relative min-h-screen font-mono text-white overflow-hidden bg-black selection:bg-[#a855f7] selection:text-white flex flex-col">
      {/* Canvas Background */}
      <canvas id="starfield" className="fixed inset-0 z-0 pointer-events-none opacity-60"></canvas>

      {/* Header */}
      <header className="relative z-20 p-6 flex justify-between items-center border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/caibao" className="text-xs text-gray-400 hover:text-[#a855f7] transition-colors flex items-center gap-1">
             <i className="fas fa-chevron-left"></i> EXIT
          </Link>
          <h1 className="text-xl tracking-[0.2em] font-bold text-white shadow-neon">
            DARK STAR <span className="text-[#a855f7]">PSYCHE</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500 uppercase">Jungian Cognitive Framework</span>
            <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12 gap-12">
        
        {/* Left: Persona Selection Grid */}
        <div className="flex-1 w-full max-w-2xl">
           <h2 className="text-sm text-gray-400 mb-6 uppercase tracking-widest border-l-2 border-[#a855f7] pl-3">
             Select Resonance Frequency // 选择人格共鸣
           </h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {Object.values(MBTI_PERSONAS).map((persona) => (
               <button
                 key={persona.id}
                 onClick={() => setSelectedPersona(persona)}
                 className={`
                   group relative p-4 border border-white/10 rounded-lg hover:border-[#a855f7] hover:bg-[#a855f7]/10 transition-all duration-300 text-left
                   ${selectedPersona?.id === persona.id ? 'border-[#a855f7] bg-[#a855f7]/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : ''}
                 `}
               >
                 <div className="flex justify-between items-start mb-2">
                   <span className={`text-2xl ${selectedPersona?.id === persona.id ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
                     <i className={`fas ${persona.icon}`}></i>
                   </span>
                   <span className="text-[10px] font-bold opacity-50">{persona.type}</span>
                 </div>
                 <div className="text-lg font-bold text-white mb-1">{persona.name}</div>
                 <div className="flex gap-1">
                   {persona.functionStack.slice(0, 2).map(fn => (
                     <span key={fn} className="text-[9px] px-1 bg-white/10 rounded text-gray-300">{fn}</span>
                   ))}
                 </div>
               </button>
             ))}
             
             {/* Placeholders for other 12 types */}
             {Array.from({length: 4}).map((_, i) => (
               <div key={i} className="p-4 border border-white/5 rounded-lg flex flex-col items-center justify-center opacity-30 cursor-not-allowed">
                 <i className="fas fa-lock mb-2"></i>
                 <span className="text-[10px]">LOCKED</span>
               </div>
             ))}
           </div>
        </div>

        {/* Right: Detail & Connect */}
        <div className="w-full lg:w-1/3 flex flex-col justify-center min-h-[400px]">
           {selectedPersona ? (
             <div className="animate-[fadeIn_0.5s_ease-out] bg-black/50 border border-white/10 p-8 rounded-xl backdrop-blur-xl relative overflow-hidden">
               {/* Decorative Background Element */}
               <div className="absolute -right-10 -top-10 text-9xl text-[#a855f7] opacity-5 pointer-events-none">
                 <i className={`fas ${selectedPersona.icon}`}></i>
               </div>

               <div className="text-[#a855f7] text-sm tracking-widest font-bold mb-2">
                 {selectedPersona.type} // {selectedPersona.functionStack.join(' - ')}
               </div>
               <h2 className="text-4xl font-bold text-white mb-6">{selectedPersona.name}</h2>
               
               <p className="text-gray-300 leading-relaxed mb-8 border-l-2 border-gray-700 pl-4">
                 {selectedPersona.description}
               </p>

               <div className="space-y-4">
                  <div className="text-xs text-gray-500 uppercase">System Instruction Preview</div>
                  <div className="text-[10px] text-[#a855f7] font-mono bg-[#a855f7]/5 p-3 rounded border border-[#a855f7]/20 truncate">
                    &gt; {selectedPersona.systemInstruction.substring(0, 60)}...
                  </div>
               </div>

               <button 
                 onClick={handleConnect}
                 className="mt-8 w-full py-4 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
               >
                 Establish Neural Link
               </button>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl p-8">
               <div className="w-16 h-16 rounded-full border border-gray-700 flex items-center justify-center mb-4 animate-pulse">
                 <i className="fas fa-satellite-dish"></i>
               </div>
               <p className="text-sm tracking-widest">AWAITING SELECTION...</p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};
