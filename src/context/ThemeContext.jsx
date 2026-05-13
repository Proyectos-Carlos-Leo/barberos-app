import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

// Detectar preferencia inicial
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('barberos_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  // Si no hay guardado, usar preferencia del sistema
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('barberos_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
