
import React, { useState, useRef, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { OFFICE_SYSTEM_INSTRUCTION, ThemeContext, GlobalContext } from '../constants';
import { UserAuth } from '../components/UserAuth';
import { SystemStatus } from '../components/SystemStatus';
import { CameraModal } from '../components/CameraModal';
import { KnowledgeNode } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface AnalysisResult {
  id?: string;
  subject: string;
  predictedScore: number;
  weakPoints: string[];
  lineage: string;
  summary: string;
  recommendedTasks?: string[];
  timestamp?: any;
}

export const Office: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { setNodes, addCalendarBlock, calendarBlocks, addToTransferStation } = useContext(GlobalContext) as any;
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [records, setRecords] = useState<AnalysisResult[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'graph' | 'plan'>('diagnosis');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch records from Firestore
  useEffect(() => {
    if (!auth.currentUser) {
      setRecords([]);
      return;
    }

    const q = query(
      collection(db, 'analysis_records'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
      setRecords(fetchedRecords);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleCameraCapture = (file: File) => {
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setResult(null); // Reset previous result
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imagePreview || isProcessing) return;
    setIsProcessing(true);

    try {
      const apiKey = process.env.API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imagePreview.split(':')[1].split(';')[0];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: "Analyze this image according to the system instructions. Return ONLY JSON." }
          ]
        },
        config: {
           systemInstruction: OFFICE_SYSTEM_INSTRUCTION,
           responseMimeType: 'application/json'
        }
      });
      
      if (response.text) {
          const data = JSON.parse(response.text);
          setResult(data);
          setActiveTab('diagnosis');

          // Save to Firestore if user is logged in
          if (auth.currentUser) {
            try {
              await addDoc(collection(db, 'analysis_records'), {
                uid: auth.currentUser.uid,
                subject: data.subject,
                predictedScore: data.predictedScore,
                weakPoints: data.weakPoints,
                lineage: data.lineage,
                summary: data.summary,
                recommendedTasks: data.recommendedTasks || [],
                timestamp: new Date().toISOString() // Using ISO string for simplicity in rules validation if needed, or serverTimestamp()
              });
            } catch (err) {
              console.error("Failed to save record:", err);
            }
          }

          // Auto-generate Calendar Blocks
          const tasks = data.recommendedTasks || [`复习 ${data.subject} 薄弱点`, `${data.subject} 错题整理`];
          tasks.forEach((task: string, idx: number) => {
             addCalendarBlock({
                 id: Date.now().toString() + idx,
                 title: task,
                 duration: 30, // default 30 mins
                 type: 'study'
             });
          });
      }
    } catch (e) {
      console.error(e);
      alert("分析失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToKG = async () => {
    if (!result || isExtracting) return;
    setIsExtracting(true);
    
    try {
        // Direct extraction from analysis result
        const newNodes: KnowledgeNode[] = result.weakPoints.map(point => ({
            id: `office_extract_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            label: point,
            category: 'sub',
            masteryLevel: 20, // Start low for weak points
            isGhost: false
        }));

        addToTransferStation(newNodes);
        alert(`已提取 ${newNodes.length} 个重点至中转站！`);
    } catch(e) {
        alert("存入失败");
    } finally {
        setIsExtracting(false);
    }
  };

  const TabButton = ({ id, label, icon }: { id: string, label: string, icon: string }) => (
      <button 
        onClick={() => setActiveTab(id as any)}
        className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === id ? 'border-office-primary text-office-primary bg-office-primary/5' : 'border-transparent text-office-sub hover:text-office-text'}`}
      >
          <i className={`fas ${icon}`}></i> {label}
      </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-office-bg font-sans text-office-text transition-colors duration-300">
      {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {/* Header */}
      <div className="bg-office-card px-6 py-4 flex justify-between items-center shadow-sm z-10 border-b border-office-border transition-colors sticky top-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/" className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-office-sub hover:text-office-primary transition-colors rounded-full hover:bg-office-bg">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1 className="text-lg font-bold tracking-wide truncate">灵境 <span className="text-office-primary font-light hidden sm:inline">| 学情分析中心</span></h1>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
           <SystemStatus />
           <button onClick={toggleTheme} className="text-office-sub hover:text-office-primary transition-colors">
            <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <UserAuth themeColorClass="text-office-sub" />
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left: Input Panel */}
        <div className="w-full lg:w-[350px] flex flex-col gap-4 flex-shrink-0">
            <div className="bg-office-card rounded-2xl p-4 shadow-sm border border-office-border">
                <div className="aspect-[3/4] bg-office-bg rounded-lg border-2 border-dashed border-office-border flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => !imagePreview && fileInputRef.current?.click()}>
                    {imagePreview ? (
                        <>
                            <img src={imagePreview} alt="Upload" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={(e) => {e.stopPropagation(); fileInputRef.current?.click()}} className="p-2 bg-white rounded-full text-gray-800"><i className="fas fa-sync"></i></button>
                                <button onClick={(e) => {e.stopPropagation(); setImagePreview(null); setResult(null)}} className="p-2 bg-white rounded-full text-red-500"><i className="fas fa-trash"></i></button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-6">
                            <i className="fas fa-cloud-upload-alt text-4xl text-office-sub mb-3"></i>
                            <p className="text-sm text-office-sub font-medium">点击上传试卷/笔记</p>
                            <p className="text-xs text-office-sub opacity-60 mt-1">支持 JPG, PNG</p>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                     <button onClick={() => fileInputRef.current?.click()} className="py-2.5 text-sm bg-office-bg hover:bg-office-accent hover:text-office-primary rounded-lg transition-colors border border-office-border text-office-sub font-medium">
                        <i className="fas fa-image mr-1"></i> 相册
                     </button>
                     <button onClick={() => setShowCamera(true)} className="py-2.5 text-sm bg-office-bg hover:bg-office-accent hover:text-office-primary rounded-lg transition-colors border border-office-border text-office-sub font-medium">
                        <i className="fas fa-camera mr-1"></i> 拍照
                     </button>
                </div>

                <button 
                    onClick={handleAnalyze}
                    disabled={!imagePreview || isProcessing}
                    className={`w-full py-3.5 mt-4 rounded-xl font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 ${
                        !imagePreview || isProcessing 
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
                        : 'bg-office-primary text-white hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                >
                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                    {isProcessing ? '正在诊断...' : '开始AI诊断'}
                </button>
            </div>
            
            {/* History Mini List */}
            <div className="bg-office-card rounded-2xl p-4 shadow-sm border border-office-border flex-1 overflow-hidden flex flex-col">
                <h3 className="text-xs font-bold text-office-sub uppercase mb-3">最近记录</h3>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                    {records.length === 0 ? (
                        <p className="text-[10px] text-office-sub opacity-40 text-center py-4">暂无记录</p>
                    ) : (
                        records.map((rec) => (
                            <div 
                                key={rec.id} 
                                onClick={() => {
                                    setResult(rec);
                                    setActiveTab('diagnosis');
                                }}
                                className="p-2 hover:bg-office-bg rounded cursor-pointer flex items-center gap-3 transition-colors border border-transparent hover:border-office-border"
                            >
                                <div className="w-8 h-8 rounded bg-blue-100 text-blue-500 flex items-center justify-center text-xs flex-shrink-0">
                                    <i className="fas fa-file-alt"></i>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold truncate">{rec.subject}</div>
                                    <div className="text-[10px] opacity-60">
                                        {rec.timestamp ? new Date(rec.timestamp).toLocaleString() : '刚刚'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Right: Dashboard */}
        <div className="flex-1 bg-office-card rounded-2xl shadow-sm border border-office-border overflow-hidden flex flex-col h-[600px] lg:h-auto">
             {!result ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-office-sub opacity-30 gap-4">
                     <div className="w-24 h-24 rounded-full bg-office-bg flex items-center justify-center text-4xl"><i className="fas fa-chart-pie"></i></div>
                     <p>等待分析结果...</p>
                 </div>
             ) : (
                 <>
                    {/* Header Info */}
                    <div className="p-6 border-b border-office-border bg-office-bg/30 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-office-text">{result.subject} <span className="text-base font-normal opacity-60 ml-2">智能分析报告</span></h2>
                            <p className="text-sm text-office-sub mt-1">生成时间: {new Date().toLocaleTimeString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-office-sub uppercase font-bold">预测得分</div>
                                <div className={`text-3xl font-bold ${result.predictedScore > 80 ? 'text-green-500' : result.predictedScore > 60 ? 'text-yellow-500' : 'text-red-500'}`}>{result.predictedScore}</div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-office-border bg-office-bg/50">
                        <TabButton id="diagnosis" label="综合诊断" icon="fa-stethoscope" />
                        <TabButton id="graph" label="知识谱系" icon="fa-project-diagram" />
                        <TabButton id="plan" label="行动方案" icon="fa-clipboard-list" />
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-6 overflow-y-auto bg-office-bg/20">
                        {activeTab === 'diagnosis' && (
                            <div className="animate-[fadeIn_0.3s] space-y-6">
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-office-border shadow-sm">
                                    <h3 className="font-bold text-office-text mb-2 flex items-center gap-2"><i className="fas fa-quote-left text-office-primary"></i> 总结摘要</h3>
                                    <p className="text-sm leading-relaxed text-office-sub">{result.summary}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                                         <h4 className="text-red-600 font-bold text-sm mb-3"><i className="fas fa-exclamation-triangle mr-1"></i> 薄弱环节</h4>
                                         <div className="flex flex-wrap gap-2">
                                             {result.weakPoints.map((wp, i) => (
                                                 <span key={i} className="px-2 py-1 bg-white dark:bg-gray-800 text-xs rounded border border-red-200 dark:border-red-800 text-red-500">{wp}</span>
                                             ))}
                                         </div>
                                     </div>
                                     <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                                         <h4 className="text-green-600 font-bold text-sm mb-3"><i className="fas fa-check-circle mr-1"></i> 优势潜能</h4>
                                         <p className="text-xs text-green-700 dark:text-green-400 opacity-80">基础概念掌握良好，具备进一步拓展高阶应用的能力。</p>
                                     </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'graph' && (
                            <div className="animate-[fadeIn_0.3s] space-y-6">
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-office-border shadow-sm">
                                    <h3 className="font-bold text-office-text mb-2">知识关联路径</h3>
                                    <p className="text-sm text-office-sub mb-4">{result.lineage}</p>
                                    <div className="h-40 bg-office-bg rounded border border-dashed border-office-border flex items-center justify-center text-office-sub text-xs">
                                        [ 知识图谱预览区域 - 点击下方按钮生成实体节点 ]
                                    </div>
                                </div>
                                <div className="text-center">
                                    <button 
                                        onClick={handleSyncToKG}
                                        disabled={isExtracting}
                                        className="px-6 py-2 bg-office-primary text-white rounded-lg hover:shadow-lg transition-all text-sm font-bold disabled:opacity-50"
                                    >
                                        {isExtracting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt mr-2"></i>} 同步至全局知识图谱
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'plan' && (
                            <div className="animate-[fadeIn_0.3s] space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-office-text">推荐学习任务</h3>
                                    <span className="text-xs text-green-500 bg-green-50 px-2 py-1 rounded">已自动添加到日程</span>
                                </div>
                                {result.recommendedTasks?.map((task, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-office-border shadow-sm">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">{i+1}</div>
                                        <div className="flex-1 text-sm font-medium">{task}</div>
                                        <div className="text-xs text-office-sub bg-office-bg px-2 py-1 rounded">30 min</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 </>
             )}
        </div>

      </div>
    </div>
  );
};
