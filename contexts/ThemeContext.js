import React from 'react';

const ThemeContext = React.createContext();

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState('light');
  const [isLoading, setIsLoading] = React.useState(true);

  // Load theme from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('cashflo-theme');
    if (stored) {
      setTheme(stored);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    setIsLoading(false);
  }, []);

  // Listen for system theme changes
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('cashflo-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Apply theme to document
  React.useEffect(() => {
    if (isLoading) return;

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#1f2937' : '#8b5cf6';
    }
  }, [theme, isLoading]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('cashflo-theme', newTheme);
  };

  const setThemeMode = (mode) => {
    setTheme(mode);
    localStorage.setItem('cashflo-theme', mode);
  };

  const value = {
    theme,
    toggleTheme,
    setThemeMode,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}