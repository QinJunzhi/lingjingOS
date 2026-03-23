import { ChatMessage } from '../types';

const STORAGE_KEY = 'caibao_history';

export const getHistory = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
};

export const addMessageToHistory = (message: ChatMessage) => {
  const history = getHistory();
  history.push(message);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};
