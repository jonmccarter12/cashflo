import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Home,
  CreditCard,
  TrendingUp,
  Bell,
  Settings,
  Plus,
  Search,
  Menu,
  X,
  PieChart,
  DollarSign,
  Calendar,
  Target,
  Activity
} from 'lucide-react';

const MobileAppShell = ({ children, activeTab, onTabChange, onQuickAction, onSearchChange, user, supabase, setShowAuth }) => {
  const isMobile = useIsMobile();
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
      }
    }
  };

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: Home, emoji: '📊' },
    { id: 'history', label: 'Transaction History', icon: Activity, emoji: '📋' },
    { id: 'tax', label: 'Tax Estimator', icon: DollarSign, emoji: '💰' },
    { id: 'credit', label: 'Credit Accounts', icon: CreditCard, emoji: '💳' },
    { id: 'financial-health', label: 'Financial Health', icon: TrendingUp, emoji: '📈' }
  ];

  const quickActions = [
    { label: 'Add Income', icon: Plus, action: 'add-income', color: '#10b981' },
    { label: 'Track Expense', icon: DollarSign, action: 'add-expense', color: '#f59e0b' },
    { label: 'Check Credit', icon: CreditCard, action: 'check-credit', color: '#3b82f6' },
  ];

  const QuickActionButton = ({ action, icon: Icon, label, color }) => (
    <button
      onClick={() => {
        if (onQuickAction) {
          onQuickAction(action);
        }
        setShowMenu(false);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem',
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        border: `1px solid ${color}30`,
        borderRadius: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: '80px'
      }}
      onTouchStart={(e) => {
        e.target.style.transform = 'scale(0.95)';
        e.target.style.background = `linear-gradient(135deg, ${color}30, ${color}20)`;
      }}
      onTouchEnd={(e) => {
        e.target.style.transform = 'scale(1)';
        e.target.style.background = `linear-gradient(135deg, ${color}20, ${color}10)`;
      }}
    >
      <Icon style={{ width: '1.5rem', height: '1.5rem', color }} />
      <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: '500' }}>{label}</span>
    </button>
  );

  // Show desktop version when not mobile
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      {/* Status Bar Spacer for iOS */}
      <div style={{
        height: 'env(safe-area-inset-top, 0px)',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }} />

      {/* App Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <DollarSign style={{ width: '18px', height: '18px', color: 'white' }} />
          </div>
          <div>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'white',
              margin: 0,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Cashflo
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user ? (
            <button
              onClick={() => supabase?.auth.signOut()}
              style={{
                padding: '0.375rem 0.75rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => supabase?.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                      access_type: 'offline',
                      prompt: 'consent',
                      hd: 'cashfl0.io'
                    }
                  }
                })}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
              >
                🚀 Google
              </button>
              <button
                onClick={() => setShowAuth && setShowAuth(true)}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>



      {/* Main Content */}
      <div style={{
        flex: 1,
        background: '#f8fafc',
        borderTopLeftRadius: '1.5rem',
        borderTopRightRadius: '1.5rem',
        marginTop: '1rem',
        paddingBottom: '5rem', // Space for bottom nav
        overflow: 'hidden'
      }}>
        {children}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
          gap: '1rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.75rem 1rem',
                  background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                  borderRadius: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: isActive ? '#8b5cf6' : '#6b7280',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
                onTouchStart={(e) => {
                  e.target.style.transform = 'scale(0.95)';
                }}
                onTouchEnd={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  {tab.emoji} {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default MobileAppShell;