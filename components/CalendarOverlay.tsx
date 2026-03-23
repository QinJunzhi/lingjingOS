
import React, { useContext, useState, useRef, useEffect } from 'react';
import { GlobalContext } from '../constants';
import { CalendarBlock, KnowledgeNode } from '../types';
import { GoogleGenAI } from "@google/genai";
import { CameraModal } from './CameraModal';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#6b7280', // gray
];

export const CalendarOverlay: React.FC = () => {
  const { isCalendarOpen, setIsCalendarOpen, calendarBlocks, updateCalendarBlock, addCalendarBlock, setCalendarBlocks, weather, mood, addToTransferStation } = useContext(GlobalContext) as any;
  
  // Drag State
  const [draggedBlock, setDraggedBlock] = useState<CalendarBlock | null>(null);
  
  // Modals & UI State
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Unified Task Modal (Create & Edit)
  const [taskModal, setTaskModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    data: Partial<CalendarBlock>;
  }>({
    isOpen: false,
    mode: 'create',
    data: {}
  });
  
  // Smart Analysis Input
  const [smartInput, setSmartInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time Slots: 06:00 - 23:00
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  if (!isCalendarOpen) return null;

  // --- Handlers ---

  const handleDragStart = (block: CalendarBlock) => {
    setDraggedBlock(block);
  };

  const handleDrop = (time: string | undefined) => {
    if (draggedBlock) {
      updateCalendarBlock(draggedBlock.id, { assignedTime: time });
      setDraggedBlock(null);
    }
  };

  const handleOpenCreate = () => {
    setTaskModal({
      isOpen: true,
      mode: 'create',
      data: { title: '', duration: 30, type: 'study', color: '', notes: '' }
    });
  };

  const handleOpenEdit = (block: CalendarBlock) => {
    setTaskModal({
      isOpen: true,
      mode: 'edit',
      data: { ...block }
    });
  };

  const handleSaveTask = () => {
    if (!taskModal.data.title?.trim()) return;

    if (taskModal.mode === 'create') {
      addCalendarBlock({
        id: Date.now().toString(),
        title: taskModal.data.title,
        duration: Number(taskModal.data.duration) || 30,
        type: taskModal.data.type || 'other',
        notes: taskModal.data.notes || '',
        color: taskModal.data.color
      });
    } else {
      if (taskModal.data.id) {
        updateCalendarBlock(taskModal.data.id, {
          title: taskModal.data.title,
          duration: Number(taskModal.data.duration) || 30,
          type: taskModal.data.type,
          notes: taskModal.data.notes,
          color: taskModal.data.color
        });
      }
    }
    setTaskModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteTask = (id?: string) => {
      const targetId = id || taskModal.data.id;
      if (targetId) {
        // Direct state update to ensure immediate removal
        setCalendarBlocks((prev: CalendarBlock[]) => {
            const newBlocks = prev.filter((b: CalendarBlock) => b.id !== targetId);
            return newBlocks;
        });
        if(taskModal.isOpen) setTaskModal(prev => ({ ...prev, isOpen: false }));
      }
  };

  const handleAutoFill = () => {
      let currentHour = 9;
      const unassignedBlocks = calendarBlocks.filter((b: CalendarBlock) => !b.assignedTime);
      unassignedBlocks.forEach((block: CalendarBlock) => {
          if (currentHour < 22) {
             updateCalendarBlock(block.id, { assignedTime: `${currentHour.toString().padStart(2,'0')}:00` });
             currentHour += Math.ceil(block.duration / 60);
          }
      });
  };

  const exportReport = () => {
    const header = `每日复盘 (Daily Report) - ${new Date().toLocaleDateString()}\n`;
    const csvContent = "时间,任务,类型,时长,状态,备注\n" + 
      calendarBlocks
        .sort((a: CalendarBlock, b: CalendarBlock) => (a.assignedTime || 'z').localeCompare(b.assignedTime || 'z'))
        .map((b: CalendarBlock) => `${b.assignedTime || '未安排'},${b.title},${b.type},${b.duration}分钟,${b.isCompleted?'完成':'待办'},${b.notes || ''}`)
        .join("\n");
    const blob = new Blob(['\uFEFF' + header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `daily_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- Smart AI Features ---

  const handleSmartAnalysis = async () => {
      if (!smartInput.trim()) return;
      setIsProcessing(true);
      try {
          const apiKey = process.env.API_KEY || '';
          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `
            Analyzing the following text/schedule/todo-list. 
            Identify specific tasks.
            Return ONLY a JSON array of objects with keys: "title" (string), "duration" (number, minutes, default 30), "type" (one of: 'study', 'exam', 'rest', 'other').
            Input: ${smartInput}
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });

          const tasks = JSON.parse(response.text || '[]');
          
          // Import
          tasks.forEach((t: any, i: number) => {
              addCalendarBlock({
                  id: `smart_${Date.now()}_${i}`,
                  title: t.title,
                  duration: t.duration || 30,
                  type: t.type || 'other'
              });
          });
          setShowSmartModal(false);
          setSmartInput('');
      } catch (e) {
          alert('AI分析失败，请重试');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSyncToKG = async () => {
      // Sync tasks to Knowledge Graph Transfer Station
      setIsProcessing(true);
      try {
          const taskList = calendarBlocks.map((b: CalendarBlock) => b.title).join(', ');
          const apiKey = process.env.API_KEY || '';
          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `
            Analyze these daily tasks: "${taskList}".
            Extract key "Knowledge Points" or "Topics" involved.
            Return ONLY a JSON array of objects with keys: "label" (string), "category" (string, choose best from: 'core', 'sub').
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });

          const points = JSON.parse(response.text || '[]');
          
          const newNodes: KnowledgeNode[] = points.map((p: any, i: number) => ({
              id: `sync_${Date.now()}_${i}`,
              label: p.label,
              category: p.category,
              masteryLevel: 20,
              isGhost: false
          }));

          addToTransferStation(newNodes);
          alert(`成功提取 ${newNodes.length} 个知识点至中转站！`);
      } catch (e) {
          alert('提取失败');
      } finally {
          setIsProcessing(false);
      }
  };

  // --- Visual Helpers ---
  const getTypeColor = (block: CalendarBlock) => {
      if (block.color) return `bg-[${block.color}] border-black/10 text-white`; // Custom
      
      switch(block.type) {
          case 'study': return 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700/50 text-blue-900 dark:text-blue-100';
          case 'exam': return 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-700/50 text-red-900 dark:text-red-100';
          case 'rest': return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-100';
          case 'weather': return 'bg-sky-100 dark:bg-sky-900/40 border-sky-200 dark:border-sky-700/50 text-sky-900 dark:text-sky-100';
          case 'mood': return 'bg-pink-100 dark:bg-pink-900/40 border-pink-200 dark:border-pink-700/50 text-pink-900 dark:text-pink-100';
          case 'other': default: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100';
      }
  };

  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'study': return 'fa-book-open';
          case 'exam': return 'fa-exclamation-circle';
          case 'rest': return 'fa-coffee';
          case 'weather': return 'fa-cloud';
          case 'mood': return 'fa-smile';
          case 'other': return 'fa-sticky-note';
          default: return 'fa-circle';
      }
  };

  // --- Render Block Component ---
  const renderBlockItem = (block: CalendarBlock) => {
      const customStyle = block.color ? { backgroundColor: block.color, color: '#fff', borderColor: 'transparent' } : {};

      return (
          <div
            key={block.id}
            draggable
            onDragStart={() => handleDragStart(block)}
            onClick={(e) => { e.stopPropagation(); handleOpenEdit(block); }}
            className={`relative group p-2 rounded-lg border text-xs flex flex-col justify-center cursor-grab transition-all overflow-hidden mb-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:cursor-grabbing ${getTypeColor(block)}`}
            style={customStyle}
          >
              <div className="font-bold truncate pr-4">{block.title}</div>
              <div className="text-[10px] opacity-70 flex items-center gap-1">
                  <i className={`fas ${getTypeIcon(block.type)}`}></i> {block.duration}m
              </div>
              {block.notes && <div className="mt-1 text-[9px] opacity-60 truncate"><i className="fas fa-sticky-note mr-1"></i>{block.notes}</div>}
              
              {/* Hover Delete Button (PC) */}
              <button 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDeleteTask(block.id);
                  }} 
                  className="hidden group-hover:flex absolute top-1 right-1 w-5 h-5 bg-black/20 hover:bg-red-500 text-white rounded-full items-center justify-center transition-colors backdrop-blur-sm z-20"
                  title="删除任务"
              >
                  <i className="fas fa-times text-[10px]"></i>
              </button>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto transition-opacity" onClick={() => setIsCalendarOpen(false)}></div>

      <div className="relative w-full md:w-[600px] h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-gray-200 dark:border-gray-700 shadow-2xl pointer-events-auto flex flex-col animate-[slideInRight_0.3s_ease-out]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
            <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 tracking-tight">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-md"><i className="fas fa-calendar-day"></i></span>
                    日程规划
                </h2>
                <div className="text-xs text-gray-500 mt-1 flex gap-3 font-mono">
                   <span>{new Date().toLocaleDateString()}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowSmartModal(true)} className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition-colors">
                    <i className="fas fa-robot mr-1"></i>智能
                </button>
                <button onClick={handleSyncToKG} className="px-3 py-1.5 text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-100 border border-teal-200 dark:border-teal-800 transition-colors" title="提取知识点到图谱中转站">
                    <i className="fas fa-project-diagram mr-1"></i>存入图谱
                </button>
                <button onClick={() => setIsCalendarOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <i className="fas fa-times"></i>
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Left Strip: Pool */}
            <div className="w-[200px] bg-gray-50 dark:bg-black/20 border-r border-gray-200 dark:border-gray-700 p-3 overflow-y-auto flex flex-col" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(undefined)}>
                <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 text-center tracking-widest">任务池</h3>
                
                <button 
                    onClick={handleOpenCreate}
                    className="w-full py-2 mb-3 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                    <i className="fas fa-plus"></i> 新任务
                </button>

                <div className="space-y-1 pb-10">
                    {calendarBlocks.filter((b: CalendarBlock) => !b.assignedTime).map(renderBlockItem)}
                    
                    {calendarBlocks.filter((b: CalendarBlock) => !b.assignedTime).length === 0 && (
                        <div className="text-center text-xs text-gray-400 py-8 opacity-50 flex flex-col items-center">
                            <i className="fas fa-inbox text-2xl mb-2"></i>
                            暂无待办
                        </div>
                    )}
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleAutoFill} className="py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50">
                            自动填充
                        </button>
                        <button onClick={exportReport} className="py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50">
                            导出报表
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Area: Timeline */}
            <div className="flex-1 overflow-y-auto relative bg-white dark:bg-gray-900">
                <div className="space-y-0 pb-20">
                    {hours.map(hour => {
                        const timeStr = `${hour.toString().padStart(2,'0')}:00`;
                        const blocksInSlot = calendarBlocks.filter((b: CalendarBlock) => b.assignedTime === timeStr);

                        return (
                            <div 
                                key={hour}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(timeStr)}
                                className="group relative flex min-h-[70px] border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors"
                            >
                                {/* Time Column */}
                                <div className="w-16 py-3 px-2 border-r border-gray-100 dark:border-gray-800 flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">{timeStr}</span>
                                </div>
                                
                                {/* Task Area */}
                                <div className="flex-1 p-1 flex flex-row gap-1 relative overflow-x-auto">
                                    {blocksInSlot.length > 0 ? blocksInSlot.map(renderBlockItem) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none">
                                            <i className="fas fa-plus text-gray-400"></i>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* --- MODALS --- */}

        {/* 1. Unified Task Modal (Create & Edit) */}
        {taskModal.isOpen && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-[fadeInUp_0.2s]">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">
                        {taskModal.mode === 'create' ? '创建新任务' : '编辑任务'}
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">任务名称</label>
                            <input 
                                value={taskModal.data.title || ''}
                                onChange={e => setTaskModal(p => ({...p, data: {...p.data, title: e.target.value}}))}
                                className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                                placeholder="输入任务..."
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">时长 (分钟)</label>
                                <input 
                                    type="number"
                                    value={taskModal.data.duration || ''}
                                    onChange={e => setTaskModal(p => ({...p, data: {...p.data, duration: Number(e.target.value)}}))}
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">类型</label>
                                <select 
                                    value={taskModal.data.type || 'study'}
                                    onChange={e => setTaskModal(p => ({...p, data: {...p.data, type: e.target.value as any}}))}
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 outline-none text-gray-900 dark:text-white text-sm"
                                >
                                    <option value="study">学习</option>
                                    <option value="exam">考试</option>
                                    <option value="rest">休息</option>
                                    <option value="other">其他</option>
                                </select>
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div>
                            <label className="text-xs text-gray-500 block mb-2">颜色标记</label>
                            <div className="flex gap-2 flex-wrap">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setTaskModal(p => ({...p, data: {...p.data, color: c}}))}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform ${taskModal.data.color === c ? 'scale-110 border-gray-400' : 'border-transparent scale-100'}`}
                                        style={{ backgroundColor: c }}
                                    ></button>
                                ))}
                                <button
                                    onClick={() => setTaskModal(p => ({...p, data: {...p.data, color: undefined}}))}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 ${!taskModal.data.color ? 'border-gray-400' : 'border-transparent'}`}
                                >
                                    <i className="fas fa-ban"></i>
                                </button>
                            </div>
                        </div>

                        <div>
                             <label className="text-xs text-gray-500 block mb-1">备注</label>
                             <textarea 
                                value={taskModal.data.notes || ''}
                                onChange={e => setTaskModal(p => ({...p, data: {...p.data, notes: e.target.value}}))}
                                className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-sm h-16 resize-none"
                                placeholder="添加备注..."
                             />
                        </div>
                    </div>

                    <div className="flex justify-between mt-6">
                        {taskModal.mode === 'edit' ? (
                             <button onClick={() => handleDeleteTask()} className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                 <i className="fas fa-trash mr-1"></i> 删除
                             </button>
                        ) : <div></div>}
                        <div className="flex gap-2">
                            <button onClick={() => setTaskModal(p => ({...p, isOpen: false}))} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">取消</button>
                            <button onClick={handleSaveTask} className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">确定</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 2. Smart AI Modal */}
        {showSmartModal && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-[fadeInUp_0.2s]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><i className="fas fa-robot text-purple-500"></i> 智能识别</h3>
                        <button onClick={() => setShowSmartModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                    </div>

                    {showCamera && <CameraModal onCapture={(file) => { setSmartInput(prev => prev + ` [Image: ${file.name}]`); setShowCamera(false); }} onClose={() => setShowCamera(false)} />}
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files?.[0]) setSmartInput(prev => prev + ` [File: ${e.target.files![0].name}]`); }} />

                    <textarea 
                        value={smartInput}
                        onChange={e => setSmartInput(e.target.value)}
                        placeholder="输入日程文本，或者拍照识别日程表..."
                        className="w-full h-32 p-3 rounded bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-purple-500 outline-none text-gray-900 dark:text-white text-sm resize-none mb-3"
                    />

                    <div className="flex gap-2 mb-4">
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs flex items-center justify-center gap-1 hover:bg-gray-200">
                            <i className="fas fa-image"></i> 图片导入
                        </button>
                        <button onClick={() => setShowCamera(true)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs flex items-center justify-center gap-1 hover:bg-gray-200">
                            <i className="fas fa-camera"></i> 拍照
                        </button>
                    </div>

                    <button 
                        onClick={handleSmartAnalysis}
                        disabled={isProcessing || !smartInput}
                        className="w-full py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                        开始分析并导入
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
