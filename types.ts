
import React from 'react';

export enum EngineType {
  FROST_BLADE = 'frost_blade', // Fast -> gemini-3-flash-preview
  ETERNAL_CORE = 'eternal_core', // Deep -> gemini-3-pro-preview
  LAND_VESSEL = 'land_vessel', // Custom Mod Loader
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  engine?: EngineType;
  senderName?: string; 
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  username: string;
  avatar?: string;
  isLoggedIn: boolean;
  role: 'guest' | 'user' | 'admin';
}

export interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

export interface UserContextType {
  user: User;
  login: (username: string) => void;
  logout: () => void;
}

// --- Global Context Types ---
export interface GlobalContextType {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
  setNodes: React.Dispatch<React.SetStateAction<KnowledgeNode[]>>;
  setLinks: React.Dispatch<React.SetStateAction<KnowledgeLink[]>>;
  
  // Knowledge Transfer Station (Clipboard)
  transferStation: KnowledgeNode[];
  addToTransferStation: (nodes: KnowledgeNode[]) => void;
  removeFromTransferStation: (nodeId: string) => void;

  // Persistence
  savedGraphs: SavedGraph[];
  saveGraph: (name: string, selectedNodeIds?: string[]) => void;
  loadGraph: (id: string) => void;
  deleteGraph: (id: string) => void;

  // Calendar & Weather System
  isCalendarOpen: boolean;
  setIsCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  calendarBlocks: CalendarBlock[];
  setCalendarBlocks: React.Dispatch<React.SetStateAction<CalendarBlock[]>>;
  addCalendarBlock: (block: CalendarBlock) => void;
  updateCalendarBlock: (id: string, updates: Partial<CalendarBlock>) => void;
  weather: WeatherState;
  setWeather: React.Dispatch<React.SetStateAction<WeatherState>>;
  mood: string;
  setMood: React.Dispatch<React.SetStateAction<string>>;
}

export interface SavedGraph {
  id: string;
  name: string;
  date: number;
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

export interface WeatherState {
  type: 'sunny' | 'cloudy' | 'rainy' | 'storm' | 'snow' | 'foggy';
  temp: number;
  icon: string;
}

export interface CalendarBlock {
  id: string;
  title: string;
  duration: number; // in minutes
  type: 'study' | 'exam' | 'rest' | 'other' | 'weather' | 'mood';
  assignedTime?: string; // HH:mm format, if null it's in the magnetic pool
  isCompleted?: boolean;
  color?: string; // Custom color override
  notes?: string; // Remarks
}

export interface MBTIPersona {
  id: string;
  type: string; // e.g., INTJ
  name: string; // e.g., 建筑师
  functionStack: string[]; // e.g., Ni, Te, Fi, Se
  description: string;
  systemInstruction: string;
  color: string;
  icon: string;
}

// Knowledge Graph Types
export interface KnowledgeNode {
  id: string;
  label: string;
  category: string;
  masteryLevel: number; // 0-100
  importance?: number; // 1-10 (New: affects size)
  x?: number; // For visualization
  y?: number;
  isGhost?: boolean; // If true, this is a placeholder/template node
}

export interface KnowledgeLink {
  source: string;
  target: string;
  strength: number;
}
