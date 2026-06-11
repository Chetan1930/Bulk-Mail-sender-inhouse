import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="h-12 flex items-center px-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <button
        onClick={toggleDarkMode}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
