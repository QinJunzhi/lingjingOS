
import React, { useEffect, useState, useContext } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Launcher } from './pages/Launcher';
import { Office } from './pages/Office';
import { Education } from './pages/Education';
import { KnowledgeGraph } from './pages/KnowledgeGraph';
import { KnowledgeNodeDetail } from './pages/KnowledgeNodeDetail';
import { KnowledgeAnalysis } from './pages/KnowledgeAnalysis';
import { Landing } from './pages/Landing'; // Cai Bao Landing
import { Chat } from './pages/Chat';
import { RecentChat } from './pages/RecentChat';
import { Modules } from './pages/Modules';
import { ModuleDetail } from './pages/ModuleDetail';
import { DarkStar } from './pages/DarkStar';
import { ThemeContext, UserContext, GlobalContext, INITIAL_NODES, INITIAL_LINKS } from './constants';
import { ThemeMode, User, KnowledgeNode, KnowledgeLink, SavedGraph, CalendarBlock, WeatherState } from './types';
import { CalendarOverlay } from './components/CalendarOverlay';

const DailyMoodModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { setMood, addCalendarBlock } = useContext(GlobalContext) as any;
  const moodOptions = ['🤩', '🙂', '😐', '😫', '😡', '🤯', '😴', '🧐', '🥳', '😎', '😭', '👻'];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了, 探索者";
    if (hour < 11) return "早安, 探索者";
    if (hour < 14) return "午安, 探索者";
    if (hour < 19) return "下午好, 探索者";
    return "晚上好, 探索者";
  };

  const handleSelect = (m: string) => {
    setMood(m);
    // Auto add to calendar start of day
    const hour = new Date().getHours().toString().padStart(2, '0') + ":00";
    addCalendarBlock({
        id: `daily_mood_${Date.now()}`,
        title: `今日心情: ${m}`,
        duration: 15,
        type: 'mood',
        assignedTime: hour
    });
    localStorage.setItem('last_visit_date', new Date().toDateString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s]">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-gray-100 dark:border-gray-700 transform scale-100 animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{getGreeting()}!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">新的一天开始了，今天感觉如何？</p>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          {moodOptions.map(m => (
            <button 
              key={m}
              onClick={() => handleSelect(m)}
              className="text-3xl p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110 transition-all duration-200"
            >
              {m}
            </button>
          ))}
        </div>
        <button onClick={() => handleSelect('😐')} className="text-sm text-gray-400 hover:text-gray-600 underline">
          跳过
        </button>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [showDailyMood, setShowDailyMood] = useState(false);

  useEffect(() => {
    const lastDate = localStorage.getItem('last_visit_date');
    const today = new Date().toDateString();
    if (lastDate !== today) {
      setShowDailyMood(true);
    }
  }, []);

  return (
    <>
      <CalendarOverlay />
      {showDailyMood && <DailyMoodModal onClose={() => setShowDailyMood(false)} />}
      <Routes>
        <Route path="/" element={<Launcher />} />
        
        {/* New Modules */}
        <Route path="/office" element={<Office />} />
        <Route path="/education" element={<Education />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
        <Route path="/knowledge-graph/node/:nodeId" element={<KnowledgeNodeDetail />} />
        <Route path="/knowledge-graph/analysis/:subject" element={<KnowledgeAnalysis />} />

        {/* Cai Bao Module Routes */}
        <Route path="/caibao" element={<Landing />} />
        <Route path="/terminal" element={<Chat />} />
        <Route path="/recent_chat" element={<RecentChat />} />
        <Route path="/modules" element={<Modules />} />
        <Route path="/modules/:engineId" element={<ModuleDetail />} />
        <Route path="/dark_star" element={<DarkStar />} />
      </Routes>
    </>
  );
};

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<ThemeMode>('light');

  // User State
  const [user, setUser] = useState<User>({
    username: 'Guest',
    isLoggedIn: false,
    role: 'guest'
  });

  // Global Knowledge Graph State
  const [nodes, setNodes] = useState<KnowledgeNode[]>(INITIAL_NODES);
  const [links, setLinks] = useState<KnowledgeLink[]>(INITIAL_LINKS);
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);
  
  // Knowledge Transfer Station
  const [transferStation, setTransferStation] = useState<KnowledgeNode[]>([]);

  // Calendar & Weather State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>([]);
  const [weather, setWeather] = useState<WeatherState>({ type: 'sunny', temp: 24, icon: 'fa-sun' });
  const [mood, setMood] = useState('😐');

  // Load persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode || 'light';
    setTheme(savedTheme);
    
    // Load Saved Graphs
    const saved = localStorage.getItem('saved_graphs');
    if (saved) {
      try {
        setSavedGraphs(JSON.parse(saved));
      } catch(e) { console.error("Failed to load graphs"); }
    }

    // Load Calendar Blocks
    const savedBlocks = localStorage.getItem('calendar_blocks');
    if (savedBlocks) {
      try {
        setCalendarBlocks(JSON.parse(savedBlocks));
      } catch(e) { console.error("Failed to load calendar"); }
    }
  }, []);

  // Save Persistence (Graphs)
  useEffect(() => {
      localStorage.setItem('saved_graphs', JSON.stringify(savedGraphs));
  }, [savedGraphs]);

  // Save Persistence (Calendar)
  useEffect(() => {
      localStorage.setItem('calendar_blocks', JSON.stringify(calendarBlocks));
  }, [calendarBlocks]);

  // Effect to handle CSS class application based on state
  useEffect(() => {
    const root = document.documentElement;
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' && isSystemDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    // Cycle: Light -> Dark -> System -> Light
    let newTheme: ThemeMode = 'light';
    if (theme === 'light') newTheme = 'dark';
    else if (theme === 'dark') newTheme = 'system';
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // User Auth Methods
  const login = (username: string) => {
    setUser({
      username,
      isLoggedIn: true,
      role: 'user'
    });
  };

  const logout = () => {
    setUser({
      username: 'Guest',
      isLoggedIn: false,
      role: 'guest'
    });
  };

  // Graph Persistence Methods
  const saveGraph = (name: string, selectedNodeIds?: string[]) => {
    let nodesToSave = nodes;
    let linksToSave = links;

    // Filter if specific selection
    if (selectedNodeIds && selectedNodeIds.length > 0) {
        nodesToSave = nodes.filter(n => selectedNodeIds.includes(n.id));
        linksToSave = links.filter(l => selectedNodeIds.includes(l.source) && selectedNodeIds.includes(l.target));
    }

    const newGraph: SavedGraph = {
      id: Date.now().toString(),
      name,
      date: Date.now(),
      nodes: [...nodesToSave], // Copy
      links: [...linksToSave]
    };
    setSavedGraphs(prev => [newGraph, ...prev]);
  };

  const loadGraph = (id: string) => {
    const graph = savedGraphs.find(g => g.id === id);
    if (graph) {
      setNodes(graph.nodes);
      setLinks(graph.links);
    }
  };

  const deleteGraph = (id: string) => {
    setSavedGraphs(prev => prev.filter(g => g.id !== id));
  };

  // Transfer Station Methods
  const addToTransferStation = (newNodes: KnowledgeNode[]) => {
    setTransferStation(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNewNodes = newNodes.filter(n => !existingIds.has(n.id)).map(n => ({...n, x: 0, y: 0})); // Reset pos
      return [...prev, ...uniqueNewNodes];
    });
  };

  const removeFromTransferStation = (nodeId: string) => {
    setTransferStation(prev => prev.filter(n => n.id !== nodeId));
  };

  // Calendar Methods
  const addCalendarBlock = (block: CalendarBlock) => {
    setCalendarBlocks(prev => [...prev, block]);
  };

  const updateCalendarBlock = (id: string, updates: Partial<CalendarBlock>) => {
      setCalendarBlocks(prev => prev.map(b => b.id === id ? {...b, ...updates} : b));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <UserContext.Provider value={{ user, login, logout }}>
        <GlobalContext.Provider value={{ 
          nodes, setNodes, 
          links, setLinks, 
          savedGraphs, saveGraph, loadGraph, deleteGraph,
          transferStation, addToTransferStation, removeFromTransferStation,
          isCalendarOpen, setIsCalendarOpen,
          calendarBlocks, 
          addCalendarBlock, 
          updateCalendarBlock, 
          setCalendarBlocks, 
          weather, setWeather, mood, setMood
        } as any}> 
          <Router>
            <AppContent />
          </Router>
        </GlobalContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
