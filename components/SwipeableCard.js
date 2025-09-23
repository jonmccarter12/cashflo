import React from 'react';
import { useSwipeGestures, useLongPress } from '../hooks/useSwipeGestures';

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  leftAction,
  rightAction,
  style = {},
  disabled = false
}) {
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isPressed, setIsPressed] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);

  const swipeGestures = useSwipeGestures({
    onSwipeLeft: () => {
      if (disabled) return;
      if (onSwipeLeft) onSwipeLeft();
      if (leftAction) {
        setShowActions(true);
        setTimeout(() => setShowActions(false), 2000);
      }
    },
    onSwipeRight: () => {
      if (disabled) return;
      if (onSwipeRight) onSwipeRight();
      if (rightAction) {
        setShowActions(true);
        setTimeout(() => setShowActions(false), 2000);
      }
    },
    threshold: 40, // Lower threshold for easier swiping
    velocity: 0.1   // Much lower velocity requirement (100 pixels/second)
  });

  const longPressGestures = useLongPress(
    onLongPress,
    {
      threshold: 600,
      onStart: () => setIsPressed(true),
      onFinish: () => setIsPressed(false),
      onCancel: () => setIsPressed(false)
    }
  );

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '0.5rem',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        boxShadow: isPressed ? '0 8px 25px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        ...style
      }}
      {...swipeGestures}
      {...longPressGestures}
    >
      {/* Left Action Background */}
      {leftAction && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '80px',
            background: leftAction.color || '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: showActions ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease',
            zIndex: 1
          }}
        >
          <div style={{
            color: 'white',
            fontSize: '1.5rem',
            textAlign: 'center'
          }}>
            <div>{leftAction.icon}</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {leftAction.label}
            </div>
          </div>
        </div>
      )}

      {/* Right Action Background */}
      {rightAction && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '80px',
            background: rightAction.color || '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: showActions ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            zIndex: 1
          }}
        >
          <div style={{
            color: 'white',
            fontSize: '1.5rem',
            textAlign: 'center'
          }}>
            <div>{rightAction.icon}</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {rightAction.label}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          background: 'var(--bg-primary)',
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.3s ease' : 'none'
        }}
      >
        {children}
      </div>

      {/* Long Press Indicator */}
      {isPressed && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.2)',
            border: '2px solid var(--accent-primary)',
            zIndex: 3,
            animation: 'pulse 0.6s infinite'
          }}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Specialized component for bill cards
export function SwipeableBillCard({ bill, onMarkPaid, onEdit, onDelete, children, ...props }) {
  return (
    <SwipeableCard
      onSwipeRight={() => onMarkPaid && onMarkPaid(bill)}
      onSwipeLeft={() => onDelete && onDelete(bill)}
      onLongPress={() => onEdit && onEdit(bill)}
      leftAction={{
        icon: '🗑️',
        label: 'Delete',
        color: '#ef4444'
      }}
      rightAction={{
        icon: bill.paidMonths?.includes(new Date().toISOString().slice(0, 7)) ? '✅' : '💰',
        label: bill.paidMonths?.includes(new Date().toISOString().slice(0, 7)) ? 'Paid' : 'Pay',
        color: '#10b981'
      }}
      {...props}
    >
      {children}
    </SwipeableCard>
  );
}

// Haptic feedback for mobile devices
export function triggerHaptic(type = 'light') {
  if ('vibrate' in navigator) {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(50);
        break;
      case 'heavy':
        navigator.vibrate([100, 30, 100]);
        break;
      case 'success':
        navigator.vibrate([50, 50, 50]);
        break;
      case 'error':
        navigator.vibrate([100, 50, 100, 50, 100]);
        break;
      default:
        navigator.vibrate(10);
    }
  }
}