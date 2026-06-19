import React, { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children, className = '' }) {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);
  const THRESHOLD = 70;

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current && containerRef.current.scrollTop <= 5) {
      startY.current = e.touches[0].clientY;
      setPullDist(0);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDist(Math.min(diff * 0.35, THRESHOLD + 30));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDist >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDist(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    startY.current = null;
    setPullDist(0);
  }, [pullDist, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative ${className}`}
    >
      <div
        className="absolute top-0 left-0 right-0 flex justify-center z-10 pointer-events-none"
        style={{
          transform: `translateY(${pullDist - 40}px)`,
          opacity: Math.min(pullDist / THRESHOLD, 1),
        }}
      >
        <div
          className={`w-6 h-6 rounded-full border-2 border-primary border-t-transparent ${
            refreshing ? 'animate-spin' : ''
          }`}
          style={!refreshing ? { transform: `rotate(${pullDist * 4}deg)` } : {}}
        />
      </div>
      {children}
    </div>
  );
}