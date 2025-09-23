import React from 'react';
import Head from 'next/head';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Reload the page when connection returns
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Offline - Cashflo</title>
        <meta name="description" content="You're currently offline. Cashflo will sync when your connection returns." />
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          {/* Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            background: isOnline ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '50%',
            margin: '0 auto 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            transition: 'all 0.3s ease'
          }}>
            {isOnline ? '📶' : '📡'}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            {isOnline ? 'Connection Restored!' : 'You\'re Offline'}
          </h1>

          {/* Description */}
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            lineHeight: '1.6',
            marginBottom: '2rem'
          }}>
            {isOnline
              ? 'Great! Your internet connection is back. Redirecting you to Cashflo...'
              : 'No worries! You can still view your cached data. Cashflo will sync when your connection returns.'
            }
          </p>

          {/* Status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: isOnline ? '#f0fdf4' : '#fefce8',
            border: `2px solid ${isOnline ? '#10b981' : '#f59e0b'}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: isOnline ? '#059669' : '#d97706'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isOnline ? '#10b981' : '#f59e0b',
              animation: isOnline ? 'none' : 'pulse 2s infinite'
            }} />
            {isOnline ? 'Connected' : 'Waiting for connection...'}
          </div>

          {/* Action button */}
          {!isOnline && (
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '2rem',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                width: '100%'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}