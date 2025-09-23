import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ style = {}, size = 'medium' }) {
  const { theme, toggleTheme, isDark, isLoading } = useTheme();

  const sizes = {
    small: { width: '40px', height: '24px', iconSize: '14px' },
    medium: { width: '56px', height: '32px', iconSize: '16px' },
    large: { width: '72px', height: '40px', iconSize: '20px' }
  };

  const currentSize = sizes[size];

  if (isLoading) {
    return (
      <div
        style={{
          width: currentSize.width,
          height: currentSize.height,
          borderRadius: '999px',
          background: '#e5e7eb',
          ...style
        }}
      />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        position: 'relative',
        width: currentSize.width,
        height: currentSize.height,
        borderRadius: '999px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        background: isDark
          ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)'
          : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        boxShadow: isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 2px 8px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        outline: 'none',
        ...style
      }}
      onFocus={(e) => {
        e.target.style.boxShadow = isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(167, 139, 250, 0.3)'
          : '0 2px 8px rgba(251, 191, 36, 0.3), 0 0 0 3px rgba(139, 92, 246, 0.3)';
      }}
      onBlur={(e) => {
        e.target.style.boxShadow = isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 2px 8px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
      }}
    >
      {/* Toggle Circle */}
      <div
        style={{
          position: 'absolute',
          top: '3px',
          left: isDark ? '3px' : `calc(100% - ${parseInt(currentSize.height) - 6}px)`,
          width: `${parseInt(currentSize.height) - 6}px`,
          height: `${parseInt(currentSize.height) - 6}px`,
          borderRadius: '50%',
          background: isDark
            ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
          boxShadow: isDark
            ? '0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: currentSize.iconSize,
          transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)'
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </div>

      {/* Background Icons */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '8px',
          transform: 'translateY(-50%)',
          fontSize: currentSize.iconSize,
          opacity: isDark ? 0.7 : 0.3,
          transition: 'opacity 0.3s ease'
        }}
      >
        🌙
      </div>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          fontSize: currentSize.iconSize,
          opacity: isDark ? 0.3 : 0.7,
          transition: 'opacity 0.3s ease'
        }}
      >
        ☀️
      </div>
    </button>
  );
}

// Theme toggle menu for more options
export function ThemeMenu({ isOpen, onClose, style = {} }) {
  const { theme, setThemeMode } = useTheme();

  if (!isOpen) return null;

  const options = [
    { value: 'light', label: 'Light Mode', icon: '☀️' },
    { value: 'dark', label: 'Dark Mode', icon: '🌙' },
    { value: 'auto', label: 'Auto (System)', icon: '🔄' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          zIndex: 999
        }}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          minWidth: '160px',
          overflow: 'hidden',
          ...style
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setThemeMode(option.value);
              onClose();
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: theme === option.value ? 'var(--bg-accent)' : 'transparent',
              color: 'var(--text-primary)',
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (theme !== option.value) {
                e.target.style.background = 'var(--bg-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (theme !== option.value) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{option.icon}</span>
            <span>{option.label}</span>
            {theme === option.value && (
              <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}