// Touch Gestures Hook
// Sprint 14: Mobile touch interactions and responsiveness

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface TouchPoint {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'pan' | 'tap' | 'long-press' | 'double-tap';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  scale?: number;
  velocity?: number;
  center?: { x: number; y: number };
  touches: TouchPoint[];
  originalEvent: TouchEvent;
}

export interface UseTouchGesturesOptions {
  // Swipe detection
  swipeThreshold?: number; // Minimum distance for swipe
  swipeVelocityThreshold?: number; // Minimum velocity for swipe
  
  // Pinch/zoom detection
  pinchThreshold?: number; // Minimum scale change for pinch
  
  // Pan detection
  panThreshold?: number; // Minimum distance for pan
  
  // Tap detection
  tapTimeout?: number; // Maximum time for tap
  doubleTapTimeout?: number; // Maximum time between taps for double-tap
  longPressTimeout?: number; // Minimum time for long press
  
  // General
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface UseTouchGesturesCallbacks {
  onSwipe?: (event: GestureEvent) => void;
  onPinch?: (event: GestureEvent) => void;
  onPan?: (event: GestureEvent) => void;
  onTap?: (event: GestureEvent) => void;
  onDoubleTap?: (event: GestureEvent) => void;
  onLongPress?: (event: GestureEvent) => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
}

export function useTouchGestures(
  callbacks: UseTouchGesturesCallbacks = {},
  options: UseTouchGesturesOptions = {}
) {
  const {
    swipeThreshold = 50,
    swipeVelocityThreshold = 0.3,
    pinchThreshold = 0.1,
    panThreshold = 10,
    tapTimeout = 150,
    doubleTapTimeout = 300,
    longPressTimeout = 500,
    preventDefault = false,
    stopPropagation = false
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const gestureStateRef = useRef({
    touches: new Map<number, TouchPoint>(),
    startTouches: new Map<number, TouchPoint>(),
    isGesturing: false,
    lastTapTime: 0,
    tapCount: 0,
    longPressTimer: null as NodeJS.Timeout | null,
    initialDistance: 0,
    initialScale: 1
  });

  // Get distance between two points
  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point of touches
  const getCenter = useCallback((touches: TouchPoint[]): { x: number; y: number } => {
    const x = touches.reduce((sum, touch) => sum + touch.x, 0) / touches.length;
    const y = touches.reduce((sum, touch) => sum + touch.y, 0) / touches.length;
    return { x, y };
  }, []);

  // Convert TouchEvent to TouchPoint array
  const getTouchPoints = useCallback((event: TouchEvent): TouchPoint[] => {
    const points: TouchPoint[] = [];
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      points.push({
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
        timestamp: Date.now()
      });
    }
    return points;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    const state = gestureStateRef.current;
    const touchPoints = getTouchPoints(event);
    
    // Store touch points
    touchPoints.forEach(point => {
      state.touches.set(point.id, point);
      state.startTouches.set(point.id, point);
    });

    // Handle single touch
    if (touchPoints.length === 1) {
      const point = touchPoints[0];
      
      // Check for double tap
      const now = Date.now();
      if (now - state.lastTapTime < doubleTapTimeout && state.tapCount === 1) {
        state.tapCount = 2;
        if (callbacks.onDoubleTap) {
          callbacks.onDoubleTap({
            type: 'double-tap',
            touches: touchPoints,
            center: { x: point.x, y: point.y },
            originalEvent: event
          });
        }
      } else {
        state.tapCount = 1;
        state.lastTapTime = now;
      }

      // Start long press timer
      state.longPressTimer = setTimeout(() => {
        if (callbacks.onLongPress && state.touches.has(point.id)) {
          callbacks.onLongPress({
            type: 'long-press',
            touches: touchPoints,
            center: { x: point.x, y: point.y },
            originalEvent: event
          });
        }
      }, longPressTimeout);
    }

    // Handle two-finger gestures (pinch/zoom)
    if (touchPoints.length === 2) {
      state.initialDistance = getDistance(touchPoints[0], touchPoints[1]);
      state.initialScale = 1;
    }

    state.isGesturing = touchPoints.length > 1;
    callbacks.onTouchStart?.(event);
  }, [callbacks, preventDefault, stopPropagation, getTouchPoints, getDistance, doubleTapTimeout, longPressTimeout]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    const state = gestureStateRef.current;
    const touchPoints = getTouchPoints(event);
    
    // Update touch points
    touchPoints.forEach(point => {
      state.touches.set(point.id, point);
    });

    // Clear long press timer on movement
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Handle pan (single touch move)
    if (touchPoints.length === 1 && callbacks.onPan) {
      const current = touchPoints[0];
      const start = state.startTouches.get(current.id);
      
      if (start) {
        const distance = getDistance(current, start);
        if (distance > panThreshold) {
          callbacks.onPan({
            type: 'pan',
            distance,
            center: { x: current.x, y: current.y },
            touches: touchPoints,
            originalEvent: event
          });
        }
      }
    }

    // Handle pinch (two-finger gesture)
    if (touchPoints.length === 2 && callbacks.onPinch) {
      const currentDistance = getDistance(touchPoints[0], touchPoints[1]);
      const scale = currentDistance / state.initialDistance;
      
      if (Math.abs(scale - 1) > pinchThreshold) {
        callbacks.onPinch({
          type: 'pinch',
          scale,
          center: getCenter(touchPoints),
          touches: touchPoints,
          originalEvent: event
        });
      }
    }
  }, [callbacks, preventDefault, stopPropagation, getTouchPoints, getDistance, getCenter, panThreshold, pinchThreshold]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    const state = gestureStateRef.current;
    const touchPoints = getTouchPoints(event);
    
    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Handle swipe detection for single touch
    if (event.changedTouches.length === 1) {
      const endTouch = event.changedTouches[0];
      const endPoint: TouchPoint = {
        x: endTouch.clientX,
        y: endTouch.clientY,
        id: endTouch.identifier,
        timestamp: Date.now()
      };
      
      const startPoint = state.startTouches.get(endPoint.id);
      
      if (startPoint && callbacks.onSwipe) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const distance = getDistance(startPoint, endPoint);
        const timeElapsed = endPoint.timestamp - startPoint.timestamp;
        const velocity = distance / timeElapsed;
        
        if (distance > swipeThreshold && velocity > swipeVelocityThreshold) {
          let direction: 'left' | 'right' | 'up' | 'down';
          
          if (Math.abs(dx) > Math.abs(dy)) {
            direction = dx > 0 ? 'right' : 'left';
          } else {
            direction = dy > 0 ? 'down' : 'up';
          }
          
          callbacks.onSwipe({
            type: 'swipe',
            direction,
            distance,
            velocity,
            center: { x: endPoint.x, y: endPoint.y },
            touches: [endPoint],
            originalEvent: event
          });
        } else if (distance < tapTimeout && callbacks.onTap && state.tapCount === 1) {
          // Handle tap if it's not part of a double tap
          setTimeout(() => {
            if (state.tapCount === 1) {
              callbacks.onTap!({
                type: 'tap',
                center: { x: endPoint.x, y: endPoint.y },
                touches: [endPoint],
                originalEvent: event
              });
            }
            state.tapCount = 0;
          }, doubleTapTimeout);
        }
      }
    }

    // Remove ended touches
    for (const changedTouch of Array.from(event.changedTouches)) {
      state.touches.delete(changedTouch.identifier);
      state.startTouches.delete(changedTouch.identifier);
    }

    state.isGesturing = state.touches.size > 1;
    callbacks.onTouchEnd?.(event);
  }, [callbacks, preventDefault, stopPropagation, getTouchPoints, getDistance, swipeThreshold, swipeVelocityThreshold, tapTimeout, doubleTapTimeout]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      
      // Clear any remaining timers
      const state = gestureStateRef.current;
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);

  return {
    ref: elementRef,
    isGesturing: gestureStateRef.current.isGesturing,
    touchCount: gestureStateRef.current.touches.size
  };
} 