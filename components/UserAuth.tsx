import React, { useContext, useState, useRef, useEffect } from 'react';
import { UserContext } from '../constants';

export const UserAuth: React.FC<{ themeColorClass?: string }> = ({ themeColorClass = "text-gray-700 dark:text-gray-200" }) => {
  const { user, login, logout } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = () => {
    // Mock Login
    const name = prompt("请输入用户名:", "Neo");
    if (name) login(name);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 focus:outline-none transition-opacity hover:opacity-80 ${themeColorClass}`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-400 overflow-hidden border border-gray-300 dark:border-gray-600 flex items-center justify-center">
          {user.isLoggedIn ? (
             <span className="font-bold text-gray-700 text-xs">{user.username.substring(0,2).toUpperCase()}</span>
          ) : (
             <i className="fas fa-user text-gray-500 text-sm"></i>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-[fadeInUp_0.2s_ease-out]">
          {user.isLoggedIn ? (
            <>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">lv.5 资深探索者</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <i className="fas fa-id-card w-4"></i> 基本信息
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <i className="fas fa-cog w-4"></i> 设置
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <i className="fas fa-sign-out-alt w-4"></i> 退出登录
              </button>
            </>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500">访客模式</p>
              </div>
              <button 
                onClick={handleLogin}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
              >
                 <i className="fas fa-sign-in-alt w-4"></i> 登录 / 注册
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
