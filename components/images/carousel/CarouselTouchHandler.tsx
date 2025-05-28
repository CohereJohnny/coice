'use client';

import React, { useRef, useCallback } from 'react';
import type { CarouselTouchHandlerProps } from './types';

export function CarouselTouchHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onPanStart,
  onPanMove,
  onPanEnd,
  onZoomStart,
  onZoomMove,
  onZoomEnd,
  onDoubleTap,
  isEnabled = true,
  minSwipeDistance = 50,
  className
}: CarouselTouchHandlerProps) {
  const touchState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    isTracking: false,
    initialDistance: 0,
    currentDistance: 0,
    lastTapTime: 0
  });

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!isEnabled) return;

    const touch = event.touches[0];
    const now = Date.now();
    
    touchState.current = {
      ...touchState.current,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: now,
      isTracking: true
    };

    // Handle pinch zoom start
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      touchState.current.initialDistance = distance;
      touchState.current.currentDistance = distance;
      
      onZoomStart?.({
        centerX: (touch1.clientX + touch2.clientX) / 2,
        centerY: (touch1.clientY + touch2.clientY) / 2,
        distance
      });
    } else {
      // Handle pan start
      onPanStart?.({
        x: touch.clientX,
        y: touch.clientY
      });
    }

    // Double tap detection
    if (now - touchState.current.lastTapTime < 300) {
      onDoubleTap?.({
        x: touch.clientX,
        y: touch.clientY
      });
    }
    touchState.current.lastTapTime = now;
  }, [isEnabled, onZoomStart, onPanStart, onDoubleTap]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isEnabled || !touchState.current.isTracking) return;

    // Prevent default scrolling
    event.preventDefault();

    if (event.touches.length === 2) {
      // Handle pinch zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const scale = distance / touchState.current.initialDistance;
      touchState.current.currentDistance = distance;
      
      onZoomMove?.({
        centerX: (touch1.clientX + touch2.clientX) / 2,
        centerY: (touch1.clientY + touch2.clientY) / 2,
        distance,
        scale
      });
    } else {
      // Handle pan/swipe
      const touch = event.touches[0];
      const deltaX = touch.clientX - touchState.current.currentX;
      const deltaY = touch.clientY - touchState.current.currentY;
      
      touchState.current.currentX = touch.clientX;
      touchState.current.currentY = touch.clientY;
      
      onPanMove?.({
        x: touch.clientX,
        y: touch.clientY,
        deltaX,
        deltaY
      });
    }
  }, [isEnabled, onZoomMove, onPanMove]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isEnabled || !touchState.current.isTracking) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;
    const deltaTime = Date.now() - touchState.current.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // Reset tracking
    touchState.current.isTracking = false;

    if (event.touches.length === 0) {
      // Handle zoom end
      if (touchState.current.initialDistance > 0) {
        onZoomEnd?.({
          finalScale: touchState.current.currentDistance / touchState.current.initialDistance
        });
        touchState.current.initialDistance = 0;
        touchState.current.currentDistance = 0;
      }

      // Handle pan end
      onPanEnd?.({
        x: touch.clientX,
        y: touch.clientY,
        velocityX: deltaX / deltaTime,
        velocityY: deltaY / deltaTime
      });

      // Handle swipe gestures (only if not zooming and fast enough)
      if (velocity > 0.3 && distance > minSwipeDistance) {
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        
        if (isHorizontal) {
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        }
      }
    }
  }, [isEnabled, onZoomEnd, onPanEnd, onSwipeLeft, onSwipeRight, minSwipeDistance]);

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }} // Prevent default touch actions
    >
      {children}
    </div>
  );
} 