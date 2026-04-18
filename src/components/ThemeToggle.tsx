import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-[#ffffff] transition-colors duration-200 focus:outline-none text-xl leading-none flex items-center justify-center w-10 h-10"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌞' : '🌙'}
    </button>
  );
}
