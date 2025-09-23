import React from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);

  React.useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone ||
                         document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    if (isStandalone) {
      return; // Don't show install prompt if already installed
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('🚀 PWA install prompt triggered');
      e.preventDefault();
      setDeferredPrompt(e);

      // Show install prompt after 3 seconds (let user explore first)
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome} the install prompt`);

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't render if already installed or prompt was dismissed
  if (isInstalled || !showInstallPrompt || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* Install Card */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.3s ease',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            onClick={dismissPrompt}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>

          {/* App Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: '1rem',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: 'white',
            fontWeight: 'bold'
          }}>
            💰
          </div>

          {/* Title */}
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1f2937',
            textAlign: 'center',
            marginBottom: '0.5rem'
          }}>
            Install Cashflo
          </h3>

          {/* Subtitle */}
          <p style={{
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: '1.5rem',
            lineHeight: '1.5'
          }}>
            Get the full app experience with offline access, faster loading, and home screen access.
          </p>

          {/* Features */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: 'white'
              }}>
                ✓
              </div>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                Works offline - view and add bills without internet
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: 'white'
              }}>
                ✓
              </div>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                Home screen icon for quick access
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: 'white'
              }}>
                ✓
              </div>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                Push notifications for bill reminders
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexDirection: 'column'
          }}>
            <button
              onClick={handleInstallClick}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                width: '100%'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              🚀 Install App
            </button>

            <button
              onClick={dismissPrompt}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}