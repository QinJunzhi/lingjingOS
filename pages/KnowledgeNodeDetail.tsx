import React, { useContext, useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext, INITIAL_NODES } from '../constants';
import { KnowledgeNode } from '../types';
import { UserAuth } from '../components/UserAuth';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export const KnowledgeNodeDetail: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Robustly retrieve node data: try state first, then fallback to initial constant data
  const node = (location.state?.node as KnowledgeNode) || INITIAL_NODES.find(n => n.id === nodeId);

  const [aiTip, setAiTip] = useState<string>('');
  const [loadingTip, setLoadingTip] = useState(false);

  // If still missing (invalid ID), show error
  if (!node && !loadingTip) {
     return (
        <div className="flex flex-col items-center justify-center h-screen bg-kg-bg text-kg-text">
            <p>Node data missing or invalid ID.</p>
            <Link to="/knowledge-graph" className="text-kg-primary underline mt-2">Return to Graph</Link>
        </div>
     );
  }

  const getMasteryColor = (level: number) => {
      if (level < 50) return 'text-rose-500';
      if (level < 80) return 'text-amber-500';
      return 'text-emerald-500';
  };

  const handleAskAI = async () => {
    setLoadingTip(true);
    try {
        const apiKey = process.env.API_KEY || '';
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `作为一个全能的AI导师，请为学生提供关于“${node.label}”的学习建议。请简洁地列出3个关键学习点和1个推荐的练习方式。`,
        });
        setAiTip(response.text || "无法获取建议。");
    } catch (e) {
        setAiTip("AI连接失败。");
    } finally {
        setLoadingTip(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-kg-bg text-kg-text font-sans transition-colors duration-300">
      {/* Header */}
      <div className="bg-kg-card px-6 py-4 flex justify-between items-center shadow-sm z-10 border-b border-gray-200 dark:border-gray-700 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/knowledge-graph')} className="w-8 h-8 flex items-center justify-center text-kg-primary hover:text-kg-text transition-colors rounded-full hover:bg-kg-bg">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-lg font-bold tracking-wide">知识点详情 <span className="text-kg-primary font-light">| {node.label}</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="text-kg-primary hover:text-kg-text transition-colors w-8 h-8 flex items-center justify-center">
            <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <UserAuth themeColorClass="text-kg-primary" />
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 animate-[fadeInUp_0.5s_ease-out]">
         
         {/* Top Card: Status */}
         <div className="bg-kg-card rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl bg-kg-node shadow-inner border border-kg-primary/30`}>
                    <i className="fas fa-book-reader text-kg-primary"></i>
                </div>
                <div>
                    <h2 className="text-3xl font-bold mb-1">{node.label}</h2>
                    <span className="px-2 py-1 bg-kg-bg text-xs rounded text-kg-text opacity-70 border border-kg-primary/20 uppercase tracking-wider">
                        Category: {node.category}
                    </span>
                </div>
            </div>
            
            <div className="text-center">
                <div className="text-sm text-kg-text opacity-60 mb-1">当前掌握度</div>
                <div className={`text-5xl font-bold ${getMasteryColor(node.masteryLevel)}`}>
                    {node.masteryLevel}%
                </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Learning Path */}
            <div className="bg-kg-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-kg-primary mb-4 flex items-center gap-2">
                    <i className="fas fa-road"></i> 推荐学习路径
                </h3>
                <ul className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-kg-line">
                    <li className="relative pl-8">
                        <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-800"></span>
                        <div className="text-sm font-bold opacity-50">基础概念 (已完成)</div>
                    </li>
                    <li className="relative pl-8">
                        <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-kg-primary border-2 border-white dark:border-gray-800 animate-pulse"></span>
                        <div className="text-sm font-bold">核心原理 (进行中)</div>
                        <p className="text-xs opacity-70 mt-1">建议重点复习该知识点的运作机制。</p>
                    </li>
                    <li className="relative pl-8">
                        <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800"></span>
                        <div className="text-sm font-bold opacity-50">高阶应用 (待解锁)</div>
                    </li>
                </ul>
            </div>

            {/* AI Tutor */}
            <div className="bg-kg-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                <h3 className="font-bold text-kg-primary mb-4 flex items-center gap-2">
                    <i className="fas fa-robot"></i> 智能助教
                </h3>
                
                {aiTip ? (
                    <div className="bg-kg-bg p-4 rounded-lg text-sm leading-relaxed border border-kg-primary/20 flex-grow overflow-auto">
                        <div className="markdown-body prose dark:prose-invert max-w-none">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]} 
                                rehypePlugins={[rehypeKatex]}
                            >
                                {aiTip}
                            </ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                        <p className="text-sm opacity-60 mb-4">遇到困难了？让 AI 为你定制专属复习计划。</p>
                        <button 
                            onClick={handleAskAI}
                            disabled={loadingTip}
                            className="px-6 py-2 bg-kg-primary text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {loadingTip ? <i className="fas fa-spinner fa-spin"></i> : '获取学习建议'}
                        </button>
                    </div>
                )}
            </div>
         </div>
         
         <div className="mt-8 text-center">
             <button onClick={() => navigate('/education')} className="text-kg-primary hover:underline text-sm">
                 前往互动导学模块进行专项练习 &rarr;
             </button>
         </div>

      </div>
    </div>
  );
};