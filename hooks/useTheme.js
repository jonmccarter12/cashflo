import React from 'react';

const ThemeContext = React.createContext();

const lightTheme = {
  bg: '#f3f4f6',
  bgMobile: '#f8fafc',
  card: 'white',
  cardBorder: '#e5e7eb',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  inputBg: 'white',
  inputBorder: '#d1d5db',
  headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
  accent: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  isDark: false,
};

const darkTheme = {
  bg: '#0f172a',
  bgMobile: '#1e293b',
  card: '#1e293b',
  cardBorder: '#334155',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  inputBg: '#334155',
  inputBorder: '#475569',
  headerGradient: 'linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #581c87 100%)',
  accent: '#a78bfa',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  isDark: true,
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cashflo-dark-mode') === 'true';
    }
    return false;
  });

  const toggleTheme = React.useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('cashflo-dark-mode', String(next));
      return next;
    });
  }, []);

  const theme = isDark ? darkTheme : lightTheme;

  return React.createElement(ThemeContext.Provider, { value: { theme, isDark, toggleTheme } }, children);
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return { theme: lightTheme, isDark: false, toggleTheme: () => {} };
  }
  return context;
}
