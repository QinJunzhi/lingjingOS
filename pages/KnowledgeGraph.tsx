
import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext, GlobalContext, KG_SYSTEM_INSTRUCTION, INITIAL_RADAR } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { KnowledgeNode, KnowledgeLink } from '../types';
import { UserAuth } from '../components/UserAuth';
import { SystemStatus } from '../components/SystemStatus';
import { CameraModal } from '../components/CameraModal';
import { 
  ArrowLeft, 
  Link as LinkIcon, 
  Menu, 
  Save, 
  Trash2, 
  Archive, 
  CheckCircle, 
  Star, 
  Unlink, 
  FolderOpen, 
  Camera, 
  Brain, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Undo2,
  Redo2,
  Copy,
  ClipboardPaste,
  X,
  Box,
  Loader2,
  CircleCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

type LayoutType = 'mesh' | 'star' | 'bus' | 'tree' | 'evolution';

interface HistoryState {
    nodes: KnowledgeNode[];
    links: KnowledgeLink[];
}

export const KnowledgeGraph: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  // Consume Global State
  const { 
      nodes, setNodes, links, setLinks, 
      savedGraphs, saveGraph, loadGraph, deleteGraph,
      transferStation, addToTransferStation, removeFromTransferStation 
  } = useContext(GlobalContext) as any;

  const navigate = useNavigate();
  const location = useLocation();
  
  // Local Visualization State
  const [radarData, setRadarData] = useState(INITIAL_RADAR);
  
  // History Stack for Undo/Redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Interaction State
  const [selectedId, setSelectedId] = useState<string | null>(null); // Node ID
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isLinkingMode, setIsLinkingMode] = useState(false); // Toggle for mobile/easier linking
  
  const [showCamera, setShowCamera] = useState(false);
  const [layout, setLayout] = useState<LayoutType>('star'); 
  const [isPanelOpen, setIsPanelOpen] = useState(false); 
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');
  
  // Canvas Transform & Drag State
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [interactionState, setInteractionState] = useState<{
    type: 'idle' | 'panning' | 'draggingNode' | 'creatingLink' | 'boxSelecting';
    startX: number;
    startY: number;
    targetId?: string; 
    currentX?: number; 
    currentY?: number;
  }>({ type: 'idle', startX: 0, startY: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spacePressed = useRef(false);

  // Analysis State
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    analysis: string;
    predictedScore: number;
    predictedImportance: number;
    suggestions: string[];
  } | null>(null);

  // --- Helpers ---
  const toWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - transform.x) / transform.k,
      y: (screenY - transform.y) / transform.k
    };
  }, [transform]);

  const saveToHistory = useCallback((newNodes: KnowledgeNode[], newLinks: KnowledgeLink[]) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push({ nodes: JSON.parse(JSON.stringify(newNodes)), links: JSON.parse(JSON.stringify(newLinks)) });
          if (newHistory.length > 20) newHistory.shift(); 
          return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // Initial History Save & View Restore & Sync Logic
  useEffect(() => {
      if (history.length === 0 && nodes.length > 0) {
          saveToHistory(nodes, links);
      }
      
      // Load View State
      const savedTransform = localStorage.getItem('kg_transform');
      if (savedTransform) {
          try {
              const t = JSON.parse(savedTransform);
              setTransform(t);
          } catch(e) {}
      } else {
           setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, k: 1 });
      }

      // Handle Imported Nodes (from Office sync)
      if (location.state?.importedNodes) {
          const imported = location.state.importedNodes as KnowledgeNode[];
          if (imported.length > 0) {
              const cx = (window.innerWidth / 2 - transform.x) / transform.k;
              const cy = (window.innerHeight / 2 - transform.y) / transform.k;
              
              const positionedNodes = imported.map(n => ({
                  ...n,
                  x: cx + (Math.random() - 0.5) * 200,
                  y: cy + (Math.random() - 0.5) * 200
              }));
              
              setNodes((prev: KnowledgeNode[]) => [...prev, ...positionedNodes]);
              saveToHistory([...nodes, ...positionedNodes], links);
              window.history.replaceState({}, document.title);
          }
      }

      if (location.state?.autoAnalyzeText) {
          handleAnalyze(location.state.autoAnalyzeText);
          window.history.replaceState({}, document.title);
      }

  }, []); 

  // Save View State on Change
  useEffect(() => {
      localStorage.setItem('kg_transform', JSON.stringify(transform));
  }, [transform]);

  const handleUndo = useCallback(() => {
      if (historyIndex > 0) {
          const prevState = history[historyIndex - 1];
          setNodes(prevState.nodes);
          setLinks(prevState.links);
          setHistoryIndex(historyIndex - 1);
      }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          const nextState = history[historyIndex + 1];
          setNodes(nextState.nodes);
          setLinks(nextState.links);
          setHistoryIndex(historyIndex + 1);
      }
  }, [history, historyIndex]);

  const handleDeleteSelected = useCallback(() => {
      if (selectedNodeIds.size > 0) {
          const newNodes = nodes.filter(n => !selectedNodeIds.has(n.id));
          const newLinks = links.filter(l => !selectedNodeIds.has(l.source) && !selectedNodeIds.has(l.target));
          setNodes(newNodes);
          setLinks(newLinks);
          saveToHistory(newNodes, newLinks);
          setSelectedNodeIds(new Set());
          setSelectedId(null);
      } else if (selectedId) {
          const newNodes = nodes.filter(n => n.id !== selectedId);
          const newLinks = links.filter(l => l.source !== selectedId && l.target !== selectedId);
          setNodes(newNodes);
          setLinks(newLinks);
          saveToHistory(newNodes, newLinks);
          setSelectedId(null);
      } else if (selectedLinkIndex !== null) {
          const newLinks = links.filter((_, i) => i !== selectedLinkIndex);
          setLinks(newLinks);
          saveToHistory(nodes, newLinks);
          setSelectedLinkIndex(null);
      }
  }, [selectedId, selectedLinkIndex, selectedNodeIds, nodes, links, saveToHistory]);

  const handleCopy = useCallback(() => {
      const nodesToCopy = nodes.filter(n => selectedNodeIds.has(n.id) || n.id === selectedId);
      if (nodesToCopy.length > 0) {
          addToTransferStation(nodesToCopy);
      }
  }, [nodes, selectedNodeIds, selectedId, addToTransferStation]);

  const handlePaste = useCallback(() => {
      if (transferStation.length > 0) {
         const cx = (window.innerWidth / 2 - transform.x) / transform.k;
         const cy = (window.innerHeight / 2 - transform.y) / transform.k;
         
         const newNodes = [...nodes];
         transferStation.forEach((n: KnowledgeNode, idx: number) => {
             newNodes.push({
                 ...n,
                 id: `paste_${Date.now()}_${idx}`,
                 x: cx + (Math.random() - 0.5) * 50,
                 y: cy + (Math.random() - 0.5) * 50
             });
         });
         setNodes(newNodes);
         saveToHistory(newNodes, links);
      }
  }, [transferStation, transform, nodes, links, saveToHistory]);

  // Transfer Station Actions
  const handleAddFromTransfer = (node: KnowledgeNode) => {
      const cx = (window.innerWidth / 2 - transform.x) / transform.k;
      const cy = (window.innerHeight / 2 - transform.y) / transform.k;
      
      const newNode = { ...node, x: cx, y: cy };
      setNodes((prev: KnowledgeNode[]) => [...prev, newNode]);
      saveToHistory([...nodes, newNode], links);
      removeFromTransferStation(node.id);
  };

  const handleSave = useCallback(() => {
      if (newGraphName.trim()) {
          saveGraph(newGraphName, nodes, links);
          setNewGraphName('');
          setShowSaveModal(false);
      }
  }, [newGraphName, nodes, links, saveGraph]);

  // KEYBOARD SHORTCUTS LISTENER
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

        if (e.code === 'Space') {
             spacePressed.current = true;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            setShowSaveModal(true);
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
        }

        if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            handleRedo();
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            handleDeleteSelected();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            handleCopy();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
             e.preventDefault();
             handlePaste();
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
             spacePressed.current = false;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, handleDeleteSelected, handleCopy, handlePaste, selectedNodeIds, selectedId]);


  // --- Interaction Handlers ---

  const handlePointerDown = (e: React.PointerEvent) => {
    const { clientX, clientY } = e;
    const { x: worldX, y: worldY } = toWorld(clientX, clientY);

    if (e.buttons === 1 && (e.target as Element).tagName === 'svg' && spacePressed.current) {
       setInteractionState({ type: 'panning', startX: clientX, startY: clientY });
       return;
    }

    if (e.buttons === 1 && (e.target as Element).tagName === 'svg' && (e.ctrlKey || e.metaKey)) {
        setInteractionState({ type: 'boxSelecting', startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
        return;
    }

    const clickedNode = [...nodes].reverse().find(n => {
       const dx = (n.x || 0) - worldX;
       const dy = (n.y || 0) - worldY;
       const r = n.category === 'root' ? 40 : 25; 
       return dx*dx + dy*dy <= r*r;
    });

    if (clickedNode) {
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      
      // Link Mode Check
      if (e.shiftKey || isLinkingMode) {
          setInteractionState({
              type: 'creatingLink',
              startX: worldX, startY: worldY,
              targetId: clickedNode.id,
              currentX: worldX, currentY: worldY
          });
      } else {
          if (!selectedNodeIds.has(clickedNode.id)) {
              if (e.ctrlKey) {
                  const newSet = new Set(selectedNodeIds);
                  newSet.add(clickedNode.id);
                  setSelectedNodeIds(newSet);
              } else {
                  setSelectedNodeIds(new Set([clickedNode.id]));
              }
              setSelectedId(clickedNode.id);
          }
          setIsPanelOpen(true);
          setInteractionState({
              type: 'draggingNode',
              startX: worldX, startY: worldY,
              targetId: clickedNode.id
          });
      }
    } else {
      if ((e.target as Element).tagName === 'svg' || (e.target as Element).id === 'bg-rect') {
          if (!e.ctrlKey) {
             setInteractionState({ type: 'panning', startX: clientX, startY: clientY });
             setSelectedId(null);
             setSelectedLinkIndex(null);
             setSelectedNodeIds(new Set());
          }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { clientX, clientY } = e;
    const { x: worldX, y: worldY } = toWorld(clientX, clientY);
    
    if (interactionState.type === 'panning') {
        const dx = clientX - interactionState.startX;
        const dy = clientY - interactionState.startY;
        setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
        setInteractionState(prev => ({ ...prev, startX: clientX, startY: clientY }));
    } 
    else if (interactionState.type === 'draggingNode') {
        const dx = worldX - interactionState.startX;
        const dy = worldY - interactionState.startY;
        setNodes(prev => prev.map(n => {
             if (selectedNodeIds.has(n.id) || n.id === interactionState.targetId) {
                return { ...n, x: (n.x || 0) + dx, y: (n.y || 0) + dy };
             }
             return n;
        }));
        setInteractionState(prev => ({ ...prev, startX: worldX, startY: worldY }));
    }
    else if (interactionState.type === 'creatingLink') {
        setInteractionState(prev => ({ ...prev, currentX: worldX, currentY: worldY }));
    }
    else if (interactionState.type === 'boxSelecting') {
        setInteractionState(prev => ({ ...prev, currentX: worldX, currentY: worldY }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const { clientX, clientY } = e;
    const { x: worldX, y: worldY } = toWorld(clientX, clientY);
    
    if (interactionState.type === 'creatingLink' && interactionState.targetId) {
        const targetNode = nodes.find(n => {
            const dx = (n.x || 0) - worldX;
            const dy = (n.y || 0) - worldY;
            return dx*dx + dy*dy <= 30*30 && n.id !== interactionState.targetId;
        });

        if (targetNode) {
            const exists = links.some(l => 
                (l.source === interactionState.targetId && l.target === targetNode.id) ||
                (l.target === interactionState.targetId && l.source === targetNode.id)
            );
            if (!exists) {
                const newLinks = [...links, { source: interactionState.targetId!, target: targetNode.id, strength: 1 }];
                setLinks(newLinks);
                saveToHistory(nodes, newLinks);
            }
        }
    } else if (interactionState.type === 'draggingNode') {
        saveToHistory(nodes, links);
    } else if (interactionState.type === 'boxSelecting') {
        const x1 = Math.min(interactionState.startX, interactionState.currentX!);
        const x2 = Math.max(interactionState.startX, interactionState.currentX!);
        const y1 = Math.min(interactionState.startY, interactionState.currentY!);
        const y2 = Math.max(interactionState.startY, interactionState.currentY!);

        const newSelection = new Set<string>();
        nodes.forEach(n => {
            if (n.x && n.y && n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2) {
                newSelection.add(n.id);
            }
        });
        setSelectedNodeIds(newSelection);
        if (newSelection.size > 0) setIsPanelOpen(true);
    }

    setInteractionState({ type: 'idle', startX: 0, startY: 0 });
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        setTransform(t => ({
            ...t,
            k: Math.max(0.1, Math.min(5, t.k + scaleAmount))
        }));
    } else {
        setTransform(t => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
    }
  };

  const handleDoubleClickBg = (e: React.MouseEvent) => {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const newId = `node_${Date.now()}`;
      const newNode: KnowledgeNode = {
          id: newId,
          label: '新知识点',
          category: 'sub',
          masteryLevel: 50,
          importance: 5,
          isGhost: false,
          x, y
      };
      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      saveToHistory(newNodes, links);
      setSelectedId(newId);
      setIsPanelOpen(true);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, node: KnowledgeNode) => {
      e.stopPropagation();
      navigate(`/knowledge-graph/node/${node.id}`, { state: { node } });
  };

  const handleLinkClick = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setSelectedLinkIndex(index);
      setSelectedId(null);
      setSelectedNodeIds(new Set());
      setIsPanelOpen(true);
  };

  const handleGenerate = async () => {
    if (!input.trim()) {
      // Default nodes if input is empty
      const cx = (window.innerWidth / 2 - transform.x) / transform.k;
      const cy = (window.innerHeight / 2 - transform.y) / transform.k;
      const newNodes = [
        { id: `node_${Date.now()}_1`, label: 'React', category: 'core', masteryLevel: 80, x: cx, y: cy },
        { id: `node_${Date.now()}_2`, label: 'TypeScript', category: 'core', masteryLevel: 60, x: cx + 100, y: cy + 50 },
        { id: `node_${Date.now()}_3`, label: 'Vite', category: 'sub', masteryLevel: 40, x: cx - 100, y: cy - 50 }
      ];
      setNodes([...nodes, ...newNodes]);
      saveToHistory([...nodes, ...newNodes], links);
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `你是一个知识图谱专家。根据以下主题生成一个知识图谱。
        返回 JSON 格式：{"nodes": [{"label": string, "category": "core"|"sub", "masteryLevel": number, "importance": number (1-10)}], "links": [{"sourceLabel": string, "targetLabel": string}]}
        主题：${input}`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const result = JSON.parse(response.text);
      const cx = (window.innerWidth / 2 - transform.x) / transform.k;
      const cy = (window.innerHeight / 2 - transform.y) / transform.k;
      
      const newNodes: KnowledgeNode[] = result.nodes.map((n: any, i: number) => ({
        id: `ai_node_${Date.now()}_${i}`,
        label: n.label,
        category: n.category,
        masteryLevel: n.masteryLevel || 50,
        importance: n.importance || 5,
        x: cx + (Math.random() - 0.5) * 400,
        y: cy + (Math.random() - 0.5) * 400
      }));

      const newLinks: KnowledgeLink[] = result.links.map((l: any) => {
        const source = newNodes.find(n => n.label === l.sourceLabel);
        const target = newNodes.find(n => n.label === l.targetLabel);
        if (source && target) {
          return { source: source.id, target: target.id, strength: 1 };
        }
        return null;
      }).filter(Boolean) as KnowledgeLink[];

      setNodes(prev => [...prev, ...newNodes]);
      setLinks(prev => [...prev, ...newLinks]);
      saveToHistory([...nodes, ...newNodes], [...links, ...newLinks]);
      setInput('');
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async (manualInput?: string) => {
    const textToAnalyze = manualInput || input;
    if (!textToAnalyze.trim()) return;

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `你是一个知识评估专家。请分析以下学习内容，并给出：
        1. 掌握度评分 (0-100)
        2. 重要度评分 (1-10)
        3. 综合能力雷达数据 (5个维度: 理论基础, 实践应用, 逻辑思维, 记忆深度, 创新能力)
        返回 JSON 格式：{"score": number, "importance": number, "analysis": string, "suggestions": string[], "radarData": [{"subject": string, "A": number, "fullMark": 100}]}
        内容：${textToAnalyze}`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const result = JSON.parse(response.text);
      setAnalysisResult({
        analysis: result.analysis,
        predictedScore: result.score || result.predictedScore,
        predictedImportance: result.importance || result.predictedImportance || 5,
        suggestions: result.suggestions
      });
      if (result.radarData) {
          setRadarData(result.radarData);
      }
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Components ---

  const ScaleDial = ({ 
    value, 
    min = 0, 
    max = 100, 
    step = 1, 
    label, 
    unit = '', 
    onChange 
  }: { 
    value: number, 
    min?: number, 
    max?: number, 
    step?: number, 
    label: string, 
    unit?: string, 
    onChange: (v: number) => void 
  }) => {
    const isDragging = useRef(false);
    const lastX = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastX.current = e.clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastX.current;
        lastX.current = e.clientX;
        
        // Sensitivity
        const delta = dx * (max - min) / 200; // 200px for full range roughly
        let newValue = value + delta;
        newValue = Math.max(min, Math.min(max, newValue));
        onChange(Number(newValue.toFixed(1)));
    };

    const handleMouseUp = () => {
        if (isDragging.current) {
            isDragging.current = false;
            saveToHistory(nodes, links);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = e.deltaY < 0 ? step : -step;
        const newValue = Math.max(min, Math.min(max, value + delta));
        if (newValue !== value) {
            onChange(Number(newValue.toFixed(1)));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            onChange(Math.max(min, Math.min(max, val)));
        } else if (e.target.value === '') {
            onChange(min);
        }
    };

    useEffect(() => {
        const move = (e: MouseEvent) => handleMouseMove(e);
        const up = () => handleMouseUp();
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [value, min, max, onChange, nodes, links]);

    const progress = ((value - min) / (max - min)) * 100;

    return (
        <div className="space-y-2">
            <label className="text-xs text-kg-text opacity-60 flex justify-between">
                <span>{label} ({min}-{max})</span>
                <span className="font-bold text-kg-primary">{value}{unit}</span>
            </label>
            <div 
                className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-ew-resize select-none border border-gray-200 dark:border-gray-700 shadow-inner group"
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
            >
                {/* Progress Bar Background */}
                <div 
                    className="absolute inset-y-0 left-0 bg-kg-primary/10 transition-all duration-75"
                    style={{ width: `${progress}%` }}
                ></div>

                {/* Center Marker (Red Line) */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500 z-10 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                
                {/* Value Input (Manual Typing) */}
                <div className="absolute inset-y-0 right-2 z-20 flex items-center">
                    <div className="flex items-center gap-1 bg-white/90 dark:bg-black/60 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                        <input 
                            type="number"
                            value={value}
                            onChange={handleInputChange}
                            onBlur={() => saveToHistory(nodes, links)}
                            className="w-10 bg-transparent border-none p-0 text-center text-xs font-bold text-kg-primary focus:ring-0 outline-none cursor-text"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        <span className="text-[9px] font-bold text-gray-400 pointer-events-none">{unit}</span>
                    </div>
                </div>

                {/* Ticks Visualization */}
                <div 
                    className="absolute top-0 h-full flex items-end pb-1 transition-transform duration-75 opacity-30 group-hover:opacity-60"
                    style={{ 
                        left: '50%',
                        transform: `translateX(${-((value - min) / (max - min) * 200)}px)` 
                    }}
                >
                    {Array.from({ length: 21 }).map((_, i) => (
                        <div key={i} className="flex flex-col justify-end items-center w-[10px] flex-shrink-0 h-full relative">
                            <div className={`w-px bg-gray-400 dark:bg-gray-500 ${i % 5 === 0 ? 'h-4' : 'h-2'}`}></div>
                        </div>
                    ))}
                </div>
                
                {/* Overlay Gradient for fade effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 dark:from-gray-800 via-transparent to-gray-100 dark:to-gray-800 pointer-events-none"></div>
            </div>
        </div>
    );
  };

  const renderRadar = () => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
          <PolarGrid stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 10 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Mastery"
            dataKey="A"
            stroke="var(--kg-primary)"
            fill="var(--kg-primary)"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const SaveModal = () => {
    if (!showSaveModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-kg-card p-6 rounded-2xl border border-kg-line shadow-2xl w-full max-w-md"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-kg-primary" />
            保存当前图谱
          </h3>
          <input 
            type="text" 
            placeholder="输入图谱名称..." 
            className="w-full bg-kg-bg border border-kg-line rounded-lg p-3 mb-4 outline-none focus:border-kg-primary transition-colors"
            value={newGraphName}
            onChange={(e) => setNewGraphName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSaveModal(false)}
              className="flex-1 py-2 rounded-lg border border-kg-line hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              disabled={!newGraphName.trim()}
              className="flex-1 py-2 rounded-lg bg-kg-primary text-white font-bold hover:bg-kg-primary/90 transition-colors text-sm disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-kg-bg text-kg-text font-sans transition-colors duration-300 overflow-hidden relative selection:bg-kg-primary selection:text-white">
      <AnimatePresence>
        {showCamera && (
          <CameraModal 
            onCapture={(file) => setInput(p => p + `\n[图片] ${file.name}`)} 
            onClose={() => setShowCamera(false)} 
          />
        )}
      </AnimatePresence>
      <SaveModal />
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setInput(p => p + `\n[文件] ${e.target.files?.[0]?.name}`)} />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full px-4 py-3 flex justify-between items-center z-30 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto bg-kg-card/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm min-w-0">
          <Link to="/" className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-kg-primary hover:text-kg-text transition-colors rounded-full hover:bg-kg-bg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-bold tracking-wide truncate">灵境 <span className="text-kg-primary font-light hidden sm:inline">| 知识图谱</span></h1>
          
          {/* Link Mode Toggle for Touch Users */}
          <button 
            onClick={() => setIsLinkingMode(!isLinkingMode)}
            className={`ml-2 px-3 py-1 rounded-full text-[10px] border transition-all flex items-center gap-1 font-bold ${isLinkingMode ? 'bg-kg-primary text-white border-kg-primary shadow-lg shadow-kg-primary/20' : 'bg-transparent text-kg-text border-gray-300'}`}
          >
            <LinkIcon className="w-3 h-3" /> {isLinkingMode ? '连线中' : '连线模式'}
          </button>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto bg-kg-card/90 backdrop-blur-md px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
           <SystemStatus />
          <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="w-8 h-8 flex items-center justify-center text-kg-primary hover:bg-kg-bg rounded-full transition-colors">
              <Menu className="w-4 h-4" />
          </button>
          <UserAuth themeColorClass="text-kg-primary" />
        </div>
      </div>
      
      {/* Transfer Station Sidebar (Left) */}
      <div className="absolute top-24 left-4 bottom-24 w-16 md:w-20 bg-kg-card/80 backdrop-blur-md rounded-2xl border border-kg-line shadow-lg z-20 flex flex-col items-center py-4 gap-4 pointer-events-auto transition-all hover:w-24 group">
          <div className="text-[10px] text-kg-primary font-bold writing-vertical-lr uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity mb-2 flex flex-col items-center gap-2">
              <Box className="w-5 h-5" /> 中转站
          </div>
          
          <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-3 no-scrollbar py-2 px-2">
             {transferStation.length === 0 ? (
                 <div className="text-[10px] text-kg-text opacity-40 text-center writing-vertical-lr mt-10">暂无收集</div>
             ) : (
                 transferStation.map((node: KnowledgeNode) => (
                     <div key={node.id} className="relative group/node flex-shrink-0">
                         <div 
                             onClick={() => handleAddFromTransfer(node)}
                             className="w-10 h-10 rounded-full bg-kg-bg border border-kg-primary flex items-center justify-center text-[10px] font-bold text-kg-primary cursor-pointer hover:scale-110 hover:bg-kg-primary hover:text-white transition-all shadow-sm overflow-hidden"
                             title={`点击添加到画布: ${node.label}`}
                         >
                             {node.label.substring(0, 2)}
                         </div>
                         <button 
                             onClick={(e) => { e.stopPropagation(); removeFromTransferStation(node.id); }}
                             className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover/node:opacity-100 transition-opacity shadow-sm"
                         >
                             <i className="fas fa-times"></i>
                         </button>
                     </div>
                 ))
             )}
          </div>
          <div className="text-[10px] font-mono text-kg-text opacity-50">{transferStation.length}</div>
      </div>

      {/* Main Canvas Area (SVG) ... (Keep existing SVG rendering logic) ... */}
      <div ref={containerRef} className="absolute inset-0 z-0 cursor-default touch-none bg-kg-bg outline-none" tabIndex={0} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onDoubleClick={handleDoubleClickBg}>
          <svg className="w-full h-full overflow-visible" id="bg-rect">
            {/* ... Defs ... */}
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" x={transform.x % 40} y={transform.y % 40}>
                   <circle cx="1" cy="1" r="1" fill="var(--kg-line)" fillOpacity="0.4" />
                </pattern>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--kg-line)" opacity="0.6" />
                </marker>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" className="pointer-events-none" />
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {links.map((link, i) => {
                    const src = nodes.find(n => n.id === link.source);
                    const tgt = nodes.find(n => n.id === link.target);
                    if (!src || !tgt) return null;
                    const isSelected = selectedLinkIndex === i;
                    const isGhostLink = src.isGhost || tgt.isGhost;
                    return (
                        <g key={i} onClick={(e) => handleLinkClick(e, i)} className="cursor-pointer group">
                             {/* Invisible thick line for easier clicking */}
                             <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="transparent" strokeWidth="20" />
                             
                             <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke={isSelected ? 'var(--kg-secondary)' : 'var(--kg-line)'} strokeWidth={isSelected ? 3 + (link.strength * 2) : 1.5 + link.strength} strokeOpacity={isSelected ? 1 : 0.6} strokeDasharray={isGhostLink ? "5,5" : "0"} markerEnd={isGhostLink ? "" : "url(#arrowhead)"} />
                        </g>
                    );
                })}
                {interactionState.type === 'creatingLink' && (<line x1={interactionState.startX} y1={interactionState.startY} x2={interactionState.currentX} y2={interactionState.currentY} stroke="var(--kg-primary)" strokeWidth="2" strokeDasharray="5,5" />)}
                
                {/* Box Selection Rect */}
                {interactionState.type === 'boxSelecting' && (<rect x={Math.min(interactionState.startX, interactionState.currentX!)} y={Math.min(interactionState.startY, interactionState.currentY!)} width={Math.abs(interactionState.currentX! - interactionState.startX)} height={Math.abs(interactionState.currentY! - interactionState.startY)} fill="var(--kg-primary)" fillOpacity="0.1" stroke="var(--kg-primary)" strokeDasharray="4,2" className="pointer-events-none" />)}
                
                {nodes.map((node) => {
                    const isSelected = selectedId === node.id || selectedNodeIds.has(node.id);
                    // Radius based on importance (1-10)
                    const importance = node.importance || 5;
                    const baseR = 15 + (importance * 3);
                    const r = isSelected ? baseR * 1.1 : baseR;
                    const color = node.masteryLevel < 50 ? '#f43f5e' : node.masteryLevel < 80 ? '#f59e0b' : '#10b981';
                    return (
                        <g key={node.id} transform={`translate(${node.x},${node.y})`} onDoubleClick={(e) => handleNodeDoubleClick(e, node)} className="cursor-pointer transition-all duration-300">
                            {isSelected && <circle r={r + 6} fill="none" stroke="var(--kg-primary)" strokeWidth="2" strokeDasharray="4,2" className="animate-spin-slow" />}
                            <circle r={r} fill={node.isGhost ? 'transparent' : color} stroke={node.isGhost ? 'var(--kg-text)' : 'var(--kg-bg)'} strokeWidth={node.isGhost ? 1 : 3} strokeDasharray={node.isGhost ? "4,2" : "0"} className={node.isGhost ? "" : "shadow-sm"} />
                            <rect x={-node.label.length * 6} y={r + 8} width={node.label.length * 12} height="20" rx="4" fill="var(--kg-bg)" fillOpacity="0.8" className="pointer-events-none" />
                            <text y={r + 22} textAnchor="middle" fontSize="12" fontWeight="bold" fill="var(--kg-text)" className="pointer-events-none select-none" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>{node.label}</text>
                            {(isSelected && !node.isGhost) && (<text y={5} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold" className="pointer-events-none">{node.masteryLevel}%</text>)}
                            {node.isGhost && (<text y={5} textAnchor="middle" fontSize="10" fill="var(--kg-text)" fontWeight="bold" className="pointer-events-none">+</text>)}
                        </g>
                    );
                })}
            </g>
          </svg>
      </div>

      <div className={`fixed top-0 right-0 h-full w-80 bg-kg-card/95 backdrop-blur-xl border-l border-gray-200 dark:border-gray-700 shadow-2xl z-20 transform transition-transform duration-300 ease-in-out ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="absolute left-0 top-24 -translate-x-full bg-kg-card border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg p-2 shadow-lg text-kg-primary transition-colors hover:text-kg-secondary">
            {isPanelOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          <div className="p-6 h-full flex flex-col pt-20 overflow-y-auto no-scrollbar">
              <h2 className="text-lg font-bold mb-4 flex justify-between items-center">
                  <span>数据控制台</span>
                  <button onClick={()=>setShowSaveModal(true)} className="text-[10px] font-bold text-kg-primary bg-kg-bg px-3 py-1.5 rounded-full border border-kg-primary/20 hover:bg-kg-primary hover:text-white transition-all flex items-center gap-1">
                    <Save className="w-3 h-3" /> 保存
                  </button>
              </h2>

              {selectedNodeIds.size > 1 && (
                  <div className="mb-6 p-4 bg-kg-bg rounded border border-kg-primary/20 animate-[fadeIn_0.2s] space-y-4">
                      <h3 className="text-sm font-bold text-kg-primary mb-2">批量操作 ({selectedNodeIds.size} 个节点)</h3>
                      
                      <div className="space-y-4 p-2 bg-kg-card/50 rounded-lg border border-kg-line">
                          <ScaleDial 
                              label="批量掌握度"
                              unit="%"
                              value={50} // Default for batch
                              onChange={(val) => {
                                  setNodes(prev => prev.map(n => selectedNodeIds.has(n.id) ? { ...n, masteryLevel: val } : n));
                              }}
                          />
                          <ScaleDial 
                              label="批量重要度"
                              min={1}
                              max={10}
                              step={0.5}
                              value={5} // Default for batch
                              onChange={(val) => {
                                  setNodes(prev => prev.map(n => selectedNodeIds.has(n.id) ? { ...n, importance: val } : n));
                              }}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={handleCopy} className="text-[10px] font-bold text-purple-500 border border-purple-200 rounded-lg py-2 hover:bg-purple-50 transition-all flex items-center justify-center gap-1">
                            <Copy className="w-3 h-3" /> 复制
                          </button>
                          <button onClick={handleDeleteSelected} className="text-[10px] font-bold text-red-500 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition-all flex items-center justify-center gap-1">
                            <Trash2 className="w-3 h-3" /> 删除
                          </button>
                      </div>
                  </div>
              )}

              {/* Selected Node Edit (Enhanced with Dial) */}
              {selectedId && (selectedNodeIds.size <= 1) && (
                  <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
                      <div className="border-b border-kg-primary/10 pb-2 mb-2"><span className="text-xs font-bold text-kg-primary uppercase">节点编辑</span></div>
                      {nodes.find(n => n.id === selectedId) && (
                          <div className="space-y-4">
                               <div>
                                  <label className="text-xs text-kg-text opacity-60">名称</label>
                                  <input className="w-full bg-kg-bg border border-kg-primary/20 rounded p-2 text-sm mt-1 focus:border-kg-primary outline-none" value={nodes.find(n => n.id === selectedId)?.label} onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedId ? { ...n, label: val } : n)); }} onBlur={() => saveToHistory(nodes, links)} />
                              </div>
                              
                              {/* Mastery Scale */}
                              <ScaleDial 
                                  label="掌握度"
                                  unit="%"
                                  value={nodes.find(n => n.id === selectedId)?.masteryLevel || 0}
                                  onChange={(val) => setNodes(prev => prev.map(n => n.id === selectedId ? { ...n, masteryLevel: val } : n))}
                              />

                              {/* Importance Scale */}
                              <ScaleDial 
                                  label="重要度"
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  value={nodes.find(n => n.id === selectedId)?.importance || 5}
                                  onChange={(val) => setNodes(prev => prev.map(n => n.id === selectedId ? { ...n, importance: val } : n))}
                              />

                               {/* AI Analysis Result Application */}
                              {analysisResult && (
                                  <div className="p-3 bg-kg-primary/5 rounded-lg border border-kg-primary/20 animate-[fadeIn_0.3s] space-y-2">
                                      <div className="text-[10px] font-bold text-kg-primary uppercase mb-1">AI 评估建议</div>
                                      <div className="text-xs mb-2 line-clamp-2 opacity-80">{analysisResult.analysis}</div>
                                      <div className="grid grid-cols-2 gap-2">
                                          <button 
                                              onClick={() => {
                                                  setNodes(prev => prev.map(n => n.id === selectedId ? { ...n, masteryLevel: analysisResult.predictedScore } : n));
                                                  saveToHistory(nodes, links);
                                              }}
                                              className="py-1.5 bg-kg-primary text-white text-[10px] font-bold rounded hover:bg-kg-primary/80 transition-all flex items-center justify-center gap-1"
                                          >
                                              <CircleCheck className="w-3 h-3" /> 掌握度: {analysisResult.predictedScore}%
                                          </button>
                                          <button 
                                              onClick={() => {
                                                  setNodes(prev => prev.map(n => n.id === selectedId ? { ...n, importance: analysisResult.predictedImportance } : n));
                                                  saveToHistory(nodes, links);
                                              }}
                                              className="py-1.5 bg-kg-secondary text-white text-[10px] font-bold rounded hover:bg-kg-secondary/80 transition-all flex items-center justify-center gap-1"
                                          >
                                              <Star className="w-3 h-3" /> 重要度: {analysisResult.predictedImportance}
                                          </button>
                                      </div>
                                      <button 
                                          onClick={() => {
                                              setNodes(prev => prev.map(n => n.id === selectedId ? { 
                                                  ...n, 
                                                  masteryLevel: analysisResult.predictedScore,
                                                  importance: analysisResult.predictedImportance 
                                              } : n));
                                              saveToHistory(nodes, links);
                                          }}
                                          className="w-full py-1.5 border border-kg-primary text-kg-primary text-[10px] font-bold rounded hover:bg-kg-primary hover:text-white transition-all flex items-center justify-center gap-1"
                                      >
                                          <Brain className="w-3 h-3" /> 应用全部 AI 建议
                                      </button>
                                  </div>
                              )}

                              <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors w-full flex items-center justify-center gap-2">
                                <Trash2 className="w-4 h-4" /> 删除节点
                              </button>
                          </div>
                      )}
                  </div>
              )}

              {/* Selected Link Edit */}
              {selectedLinkIndex !== null && (
                  <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
                      <div className="border-b border-kg-primary/10 pb-2 mb-2"><span className="text-xs font-bold text-kg-primary uppercase">连接编辑</span></div>
                      <div className="p-4 bg-kg-bg rounded border border-gray-200 dark:border-gray-700">
                          <div className="mb-4">
                              <label className="text-xs text-kg-text opacity-60 mb-1 block">连接强度</label>
                              <div className="flex items-center gap-2">
                                  <input 
                                    type="range" 
                                    min="0.1" 
                                    max="2" 
                                    step="0.1"
                                    className="flex-1 accent-kg-primary"
                                    value={links[selectedLinkIndex]?.strength}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setLinks(prev => prev.map((l, i) => i === selectedLinkIndex ? { ...l, strength: val } : l));
                                    }}
                                    onMouseUp={() => saveToHistory(nodes, links)}
                                  />
                                  <span className="text-xs font-mono w-8 text-right">{links[selectedLinkIndex]?.strength}</span>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                              <div className="text-xs text-kg-text opacity-50 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                  Source: {nodes.find(n => n.id === links[selectedLinkIndex]?.source)?.label || '?'}
                              </div>
                              <div className="text-xs text-kg-text opacity-50 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                  Target: {nodes.find(n => n.id === links[selectedLinkIndex]?.target)?.label || '?'}
                              </div>
                          </div>

                          <button onClick={handleDeleteSelected} className="w-full py-2 mt-4 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                            <Unlink className="w-3 h-3" /> 断开连接
                          </button>
                      </div>
                  </div>
              )}

              {/* Default Views & Radar */}
              {!selectedId && selectedLinkIndex === null && selectedNodeIds.size === 0 && (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="bg-kg-bg p-4 rounded-2xl text-center border border-gray-100 dark:border-gray-800 shadow-inner">
                          <div className="text-xs font-bold text-kg-primary mb-3 uppercase tracking-widest">综合能力雷达</div>
                          <div className="w-full h-40 flex items-center justify-center">
                            {renderRadar()}
                          </div>
                      </div>
                      
                      <div className="flex-grow space-y-3">
                           <div className="text-[10px] uppercase tracking-wider text-kg-text opacity-50 font-bold flex items-center gap-1">
                             <Brain className="w-3 h-3" /> AI 辅助生成
                           </div>
                           <textarea 
                             value={input} 
                             onChange={e=>setInput(e.target.value)} 
                             placeholder="输入主题或留空使用预设..." 
                             className="w-full bg-kg-bg p-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 h-28 focus:border-kg-primary outline-none resize-none transition-all shadow-inner" 
                           />
                           <div className="flex gap-2">
                               <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-kg-bg rounded-xl border border-gray-200 dark:border-gray-700 hover:text-kg-primary transition-colors shadow-sm" title="上传文件">
                                 <FolderOpen className="w-4 h-4" />
                               </button>
                               <button onClick={() => setShowCamera(true)} className="p-2.5 bg-kg-bg rounded-xl border border-gray-200 dark:border-gray-700 hover:text-kg-primary transition-colors shadow-sm" title="开启相机">
                                 <Camera className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => handleGenerate()} 
                                 disabled={isAnalyzing} 
                                 className="flex-1 bg-kg-primary text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-kg-primary/20 hover:shadow-kg-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                               >
                                   {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : (input.trim() ? 'AI生成图谱' : '一键生成预设')}
                               </button>
                               <button 
                                 onClick={() => handleAnalyze()} 
                                 disabled={isAnalyzing || !input.trim()} 
                                 className="px-3 bg-kg-secondary text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-kg-secondary/20 hover:shadow-kg-secondary/40 transition-all flex items-center justify-center disabled:opacity-50" 
                                 title="AI 评估掌握度"
                               >
                                   <Brain className="w-4 h-4" />
                               </button>
                           </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* ... (Existing Save Modal) ... */}
    </div>
  );
};
