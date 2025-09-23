import React from 'react';

export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocity = 0.3
}) {
  const touchStart = React.useRef(null);
  const touchEnd = React.useRef(null);

  // Minimum distance between touchStart and touchEnd to be considered a swipe
  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    touchEnd.current = null; // otherwise the swipe is fired even with usual touch events
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    };
  };

  const onTouchMove = (e) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    };
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    const timeElapsed = touchEnd.current.time - touchStart.current.time;

    // Calculate velocity
    const velocityX = Math.abs(distanceX) / timeElapsed;
    const velocityY = Math.abs(distanceY) / timeElapsed;

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    // Determine if horizontal or vertical swipe is more dominant
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      if (isLeftSwipe && velocityX > velocity && onSwipeLeft) {
        onSwipeLeft();
      } else if (isRightSwipe && velocityX > velocity && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      if (isUpSwipe && velocityY > velocity && onSwipeUp) {
        onSwipeUp();
      } else if (isDownSwipe && velocityY > velocity && onSwipeDown) {
        onSwipeDown();
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}

// Hook for long press gestures
export function useLongPress(onLongPress, { threshold = 500, onStart, onFinish, onCancel } = {}) {
  const isPressed = React.useRef(false);
  const eventRef = React.useRef(null);

  const start = React.useCallback(
    (event) => {
      if (onStart) {
        onStart(event);
      }

      isPressed.current = true;
      eventRef.current = setTimeout(() => {
        if (isPressed.current && onLongPress) {
          onLongPress(event);
        }
      }, threshold);
    },
    [onLongPress, threshold, onStart]
  );

  const clear = React.useCallback(
    (event, shouldTriggerFinish = true) => {
      if (eventRef.current) {
        clearTimeout(eventRef.current);
        eventRef.current = null;
      }

      if (shouldTriggerFinish && onFinish) {
        onFinish(event);
      }

      isPressed.current = false;
    },
    [onFinish]
  );

  const cancel = React.useCallback(
    (event) => {
      clear(event, false);
      if (onCancel) {
        onCancel(event);
      }
    },
    [clear, onCancel]
  );

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: cancel
  };
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh, { threshold = 80, enabled = true } = {}) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const startY = React.useRef(0);
  const currentY = React.useRef(0);

  const handleTouchStart = (e) => {
    if (!enabled || isRefreshing) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!enabled || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only track pull down at the top of the page
    if (window.scrollY === 0 && diff > 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff, threshold * 1.5));
    }
  };

  const handleTouchEnd = () => {
    if (!enabled || isRefreshing) return;

    if (pullDistance >= threshold && onRefresh) {
      setIsRefreshing(true);
      onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isRefreshing,
    pullDistance,
    progress: pullDistance / threshold
  };
}