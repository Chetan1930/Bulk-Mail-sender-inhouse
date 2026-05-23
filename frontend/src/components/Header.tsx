import { Menu, Moon, Sun, Bell, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({ onMenuClick, darkMode, onToggleDarkMode }: HeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass border-b border-gray-100/80 dark:border-surface-700/30">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700/50 transition-all"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white">MailFlow</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700/50 transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <button className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700/50 transition-all">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white dark:ring-surface-800" />
          </button>

          {/* User dropdown */}
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-700/50 transition-all"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-tight">{user?.name || 'User'}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{user?.email}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-surface-800 rounded-2xl border border-gray-100 dark:border-surface-700/50 shadow-xl shadow-gray-200/50 dark:shadow-surface-950/50 py-1.5 z-50 animate-scale-in origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-surface-700/50">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                  <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    {user?.role === 'admin' ? 'Administrator' : 'Manager'}
                  </span>
                </div>

                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-700/50 transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>

                <div className="border-t border-gray-100 dark:border-surface-700/50 pt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
