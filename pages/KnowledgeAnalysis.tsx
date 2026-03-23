
import React, { useContext, useState, useEffect } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../constants';
import { UserAuth } from '../components/UserAuth';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export const KnowledgeAnalysis: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const score = location.state?.score || 0;
  
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateReport = async () => {
        setLoading(true);
        try {
             const apiKey = process.env.API_KEY || '';
             const ai = new GoogleGenAI({ apiKey });
             const prompt = `分析学生的"${subject}"能力，当前评分为 ${score}/100。
             请生成一份简短的分析报告（约150字），包含：
             1. 当前水平评估。
             2. 两个具体的提升策略。
             3. 推荐的思维训练方式。
             请使用Markdown格式，语气专业且鼓励性。不要输出JSON，直接输出文本。`;
             
             const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
             });
             setReport(response.text || "无法生成报告。");
        } catch (e) {
            setReport(`基于当前评分 ${score}，该维度的能力表现稳定。建议通过更多实践案例来强化。\n\n(AI服务暂时不可用，请检查网络或Key)`);
        } finally {
            setLoading(false);
        }
    };
    generateReport();
  }, [subject, score]);

  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col min-h-screen bg-kg-bg text-kg-text font-sans transition-colors duration-300">
      {/* Header */}
      <div className="bg-kg-card px-6 py-4 flex justify-between items-center shadow-sm z-10 border-b border-gray-200 dark:border-gray-700 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/knowledge-graph')} className="w-8 h-8 flex items-center justify-center text-kg-primary hover:text-kg-text transition-colors rounded-full hover:bg-kg-bg">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-lg font-bold tracking-wide">能力深度分析 <span className="text-kg-primary font-light">| {decodeURIComponent(subject || '')}</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="text-kg-primary hover:text-kg-text transition-colors w-8 h-8 flex items-center justify-center">
            <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <UserAuth themeColorClass="text-kg-primary" />
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 animate-[fadeInUp_0.5s_ease-out]">
        
        {/* Top Section: Score Visualization */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-12">
            <div className="relative group cursor-default">
                {/* Glow Effect */}
                <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-amber-500' : 'bg-rose-500'} group-hover:opacity-50 transition-opacity duration-500`}></div>
                
                <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 relative z-10 drop-shadow-lg">
                    <circle
                        stroke="var(--kg-line)"
                        strokeWidth={stroke}
                        strokeOpacity="0.3"
                        fill="var(--kg-card)"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke="currentColor"
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        className={`${score > 80 ? 'text-emerald-500' : score > 60 ? 'text-amber-500' : 'text-rose-500'}`}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span className={`text-4xl font-extrabold ${score > 80 ? 'text-emerald-600' : score > 60 ? 'text-amber-600' : 'text-rose-600'}`}>{score}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-50 mt-1 font-bold">Score</span>
                </div>
            </div>

            <div className="text-center md:text-left max-w-md">
                 <h2 className="text-3xl font-bold mb-2 text-kg-text">{decodeURIComponent(subject || '')} 能力评估</h2>
                 <p className="text-kg-text opacity-70 leading-relaxed mb-4">
                     {score > 85 ? "表现卓越！您在该领域拥有深厚的理解和应用能力。" : 
                      score > 60 ? "基础扎实，但在高阶应用和逻辑连贯性上仍有提升空间。" : 
                      "处于起步阶段，建议加强基础概念的理解和记忆。"}
                 </p>
                 <div className="flex gap-2 justify-center md:justify-start">
                     <span className="px-3 py-1 rounded-full bg-kg-bg border border-kg-primary/20 text-xs text-kg-primary font-mono">Level {Math.floor(score/20) + 1}</span>
                     <span className="px-3 py-1 rounded-full bg-kg-bg border border-kg-primary/20 text-xs text-kg-text opacity-60">Percentile: Top {100 - score}%</span>
                 </div>
            </div>
        </div>

        {/* Report Content */}
        <div className="bg-kg-card rounded-2xl p-8 shadow-card border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            {/* Decorative Header Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-kg-primary via-kg-secondary to-kg-primary"></div>
            
            <h3 className="font-bold text-kg-primary mb-6 flex items-center gap-3 text-lg border-b border-gray-100 dark:border-gray-700 pb-4">
                <i className="fas fa-microscope"></i> 深度分析报告
            </h3>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="w-12 h-12 border-4 border-kg-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm opacity-60 animate-pulse font-mono">Neural Analysis In Progress...</p>
                </div>
            ) : (
                <div className="text-kg-text text-sm leading-7">
                    <div className="markdown-body prose dark:prose-invert max-w-none">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                h1: ({node, ...props}) => <h1 className="text-xl font-bold text-kg-primary mt-4 mb-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-bold text-kg-primary mt-4 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-md font-bold text-kg-text mt-3 mb-1" {...props} />,
                                strong: ({node, ...props}) => <span className="font-bold text-kg-secondary" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 opacity-90" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                p: ({node, ...props}) => <p className="mb-3 opacity-90" {...props} />
                            }}
                        >
                            {report}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
            
            <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs text-kg-text opacity-40 font-mono">Generated by Eternal Core Engine</span>
                <button className="px-5 py-2 text-sm bg-kg-primary text-white hover:bg-kg-secondary transition-colors rounded-lg shadow-md hover:shadow-lg flex items-center gap-2">
                    <i className="fas fa-file-export"></i> 导出 PDF
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
