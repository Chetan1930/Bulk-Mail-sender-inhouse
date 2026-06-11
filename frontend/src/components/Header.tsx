import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center px-4 sm:px-6 border-b border-gray-200 dark:border-[#1a2f1e] bg-white/90 dark:bg-[#0d1a10]/90 backdrop-blur-md">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      <button
        onClick={toggleDarkMode}
        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
