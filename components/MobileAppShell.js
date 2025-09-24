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

const MobileAppShell = ({ children, activeTab, onTabChange, onQuickAction, onSearchChange }) => {
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
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'credit', label: 'Credit', icon: CreditCard },
    { id: 'budgeting', label: 'Budget', icon: PieChart },
    { id: 'financial-health', label: 'Health', icon: Activity },
    { id: 'notifications', label: 'Alerts', icon: Bell }
  ];

  const quickActions = [
    { label: 'Add Income', icon: Plus, action: 'add-income', color: '#10b981' },
    { label: 'Track Expense', icon: DollarSign, action: 'add-expense', color: '#f59e0b' },
    { label: 'Check Credit', icon: CreditCard, action: 'check-credit', color: '#3b82f6' },
    { label: 'Set Budget', icon: Target, action: 'set-budget', color: '#8b5cf6' }
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
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Search style={{ width: '18px', height: '18px', color: 'white' }} />
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            {showMenu ?
              <X style={{ width: '18px', height: '18px', color: 'white' }} /> :
              <Menu style={{ width: '18px', height: '18px', color: 'white' }} />
            }
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div style={{
          padding: '1rem',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '1rem',
            padding: '0.75rem'
          }}>
            <Search style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.8)', marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder="Search transactions, bills, or insights..."
              onChange={(e) => {
                if (onSearchChange) {
                  onSearchChange(e.target.value);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                flex: 1,
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Actions Menu */}
      {showMenu && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          zIndex: 200,
          padding: '1rem',
          borderBottomLeftRadius: '1rem',
          borderBottomRightRadius: '1rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {quickActions.map((action, index) => (
              <QuickActionButton key={index} {...action} />
            ))}
          </div>

          {isInstallable && (
            <button
              onClick={handleInstallApp}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              Install Cashflo App
            </button>
          )}
        </div>
      )}

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
          paddingBottom: '0.5rem'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: isActive ? '#3b82f6' : '#6b7280'
                }}
                onTouchStart={(e) => {
                  e.target.style.transform = 'scale(0.95)';
                }}
                onTouchEnd={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  padding: '0.5rem',
                  borderRadius: '1rem',
                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <Icon style={{
                    width: '20px',
                    height: '20px',
                    color: isActive ? '#3b82f6' : '#6b7280'
                  }} />
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: isActive ? '600' : '400'
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Backdrop for menu */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 150
          }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default MobileAppShell;