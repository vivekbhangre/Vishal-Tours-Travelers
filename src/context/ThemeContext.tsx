import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    // Sync with index.html reset logic
    const resetKey = 'theme_reset_2024_04_18_v1';
    const hasResetted = localStorage.getItem(resetKey);
    let savedTheme = localStorage.getItem('theme');
    
    if (!hasResetted) {
      savedTheme = 'light';
    }

    if (savedTheme === 'dark') {
      return 'dark';
    }
    return 'light';
  });

  // Force light theme for guests/logout
  useEffect(() => {
    if (!user) {
      setTheme('light');
      localStorage.setItem('theme', 'light');
    }
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const resetTheme = () => {
    setTheme('light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
