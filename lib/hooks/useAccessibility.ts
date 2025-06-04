// Comprehensive Accessibility Hook
// Sprint 14: WCAG 2.1 AA compliance and accessibility optimization

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AccessibilityOptions {
  // Focus management
  enableFocusManagement?: boolean;
  focusOnMount?: boolean;
  returnFocusOnUnmount?: boolean;
  
  // Keyboard navigation
  enableKeyboardNavigation?: boolean;
  keyboardShortcuts?: Record<string, () => void>;
  
  // Screen reader support
  enableScreenReaderAnnouncements?: boolean;
  liveRegionPoliteness?: 'polite' | 'assertive' | 'off';
  
  // Visual accessibility
  respectReducedMotion?: boolean;
  enhanceContrast?: boolean;
  
  // Component-specific
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface AccessibilityState {
  // Focus tracking
  currentFocusIndex: number;
  focusableElements: HTMLElement[];
  hasFocus: boolean;
  
  // User preferences
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  usesDarkMode: boolean;
  
  // Screen reader state
  announcements: string[];
  isScreenReaderActive: boolean;
}

export function useAccessibility(options: AccessibilityOptions = {}) {
  const {
    enableFocusManagement = true,
    focusOnMount = false,
    returnFocusOnUnmount = false,
    enableKeyboardNavigation = true,
    keyboardShortcuts = {},
    enableScreenReaderAnnouncements = true,
    liveRegionPoliteness = 'polite',
    respectReducedMotion = true,
    enhanceContrast = false,
    role,
    ariaLabel,
    ariaDescribedBy
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    currentFocusIndex: -1,
    focusableElements: [],
    hasFocus: false,
    prefersReducedMotion: false,
    prefersHighContrast: false,
    usesDarkMode: false,
    announcements: [],
    isScreenReaderActive: false
  });

  // Detect user preferences
  const detectUserPreferences = useCallback(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const usesDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Detect screen reader activity
    const isScreenReaderActive = window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      window.speechSynthesis?.speaking ||
      document.documentElement.hasAttribute('data-whatinput') ||
      !!document.querySelector('[aria-live]');

    setAccessibilityState(prev => ({
      ...prev,
      prefersReducedMotion,
      prefersHighContrast,
      usesDarkMode,
      isScreenReaderActive
    }));
  }, []);

  // Get focusable elements within container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'details',
      'summary'
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    return elements.filter(element => {
      const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;
      const isNotHidden = !element.hasAttribute('hidden');
      const style = window.getComputedStyle(element);
      const isDisplayed = style.display !== 'none' && style.visibility !== 'hidden';
      
      return isVisible && isNotHidden && isDisplayed;
    });
  }, []);

  // Update focusable elements list
  const updateFocusableElements = useCallback(() => {
    const elements = getFocusableElements();
    setAccessibilityState(prev => ({
      ...prev,
      focusableElements: elements
    }));
  }, [getFocusableElements]);

  // Announce to screen reader
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!enableScreenReaderAnnouncements || !message.trim()) return;

    setAccessibilityState(prev => ({
      ...prev,
      announcements: [...prev.announcements.slice(-4), message] // Keep last 5
    }));

    // Update live region
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }

    // Alternative: Use browser's speech synthesis as fallback
    if ('speechSynthesis' in window && accessibilityState.isScreenReaderActive) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.volume = 0.1; // Quiet fallback
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }, [enableScreenReaderAnnouncements, accessibilityState.isScreenReaderActive]);

  // Focus management
  const focusElement = useCallback((index: number) => {
    const elements = accessibilityState.focusableElements;
    if (index >= 0 && index < elements.length) {
      elements[index].focus();
      setAccessibilityState(prev => ({
        ...prev,
        currentFocusIndex: index,
        hasFocus: true
      }));
    }
  }, [accessibilityState.focusableElements]);

  const focusNext = useCallback(() => {
    const nextIndex = Math.min(
      accessibilityState.currentFocusIndex + 1,
      accessibilityState.focusableElements.length - 1
    );
    focusElement(nextIndex);
  }, [accessibilityState.currentFocusIndex, accessibilityState.focusableElements.length, focusElement]);

  const focusPrevious = useCallback(() => {
    const prevIndex = Math.max(accessibilityState.currentFocusIndex - 1, 0);
    focusElement(prevIndex);
  }, [accessibilityState.currentFocusIndex, focusElement]);

  const focusFirst = useCallback(() => {
    focusElement(0);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    focusElement(accessibilityState.focusableElements.length - 1);
  }, [accessibilityState.focusableElements.length, focusElement]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardNavigation) return;

    // Handle custom shortcuts first
    const shortcutKey = event.key.toLowerCase();
    const modifierKey = event.ctrlKey ? 'ctrl+' : event.altKey ? 'alt+' : event.shiftKey ? 'shift+' : '';
    const fullKey = modifierKey + shortcutKey;

    if (keyboardShortcuts[fullKey]) {
      event.preventDefault();
      keyboardShortcuts[fullKey]();
      return;
    }

    // Standard navigation keys
    switch (event.key) {
      case 'Tab':
        if (!event.shiftKey) {
          // Let browser handle normal tab, but track it
          const currentIndex = accessibilityState.focusableElements.findIndex(
            el => el === document.activeElement
          );
          if (currentIndex !== -1) {
            setAccessibilityState(prev => ({
              ...prev,
              currentFocusIndex: currentIndex
            }));
          }
        }
        break;

      case 'ArrowDown':
      case 'ArrowRight':
        if (accessibilityState.focusableElements.length > 0) {
          event.preventDefault();
          focusNext();
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        if (accessibilityState.focusableElements.length > 0) {
          event.preventDefault();
          focusPrevious();
        }
        break;

      case 'Home':
        if (accessibilityState.focusableElements.length > 0) {
          event.preventDefault();
          focusFirst();
        }
        break;

      case 'End':
        if (accessibilityState.focusableElements.length > 0) {
          event.preventDefault();
          focusLast();
        }
        break;

      case 'Escape':
        // Blur current element and announce
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
          announce('Escaped from current element');
        }
        break;
    }
  }, [
    enableKeyboardNavigation,
    keyboardShortcuts,
    accessibilityState.focusableElements,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    announce
  ]);

  // Handle focus events
  const handleFocus = useCallback(() => {
    setAccessibilityState(prev => ({ ...prev, hasFocus: true }));
  }, []);

  const handleBlur = useCallback(() => {
    setAccessibilityState(prev => ({ ...prev, hasFocus: false }));
  }, []);

  // Initialize and cleanup
  useEffect(() => {
    detectUserPreferences();
    updateFocusableElements();

    // Store previous focus for return
    if (returnFocusOnUnmount) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Focus on mount if requested
    if (focusOnMount && containerRef.current) {
      containerRef.current.focus();
    }

    // Set up event listeners
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      container.addEventListener('focus', handleFocus, { capture: true });
      container.addEventListener('blur', handleBlur, { capture: true });
    }

    // Listen for preference changes
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-color-scheme: dark)')
    ];

    const handlePreferenceChange = () => detectUserPreferences();
    mediaQueries.forEach(mq => mq.addEventListener('change', handlePreferenceChange));

    // Observer for dynamic content changes
    const observer = new MutationObserver(() => {
      updateFocusableElements();
    });

    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden', 'tabindex']
      });
    }

    return () => {
      // Cleanup
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
        container.removeEventListener('focus', handleFocus, { capture: true });
        container.removeEventListener('blur', handleBlur, { capture: true });
      }

      mediaQueries.forEach(mq => mq.removeEventListener('change', handlePreferenceChange));
      observer.disconnect();

      // Return focus if requested
      if (returnFocusOnUnmount && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [
    detectUserPreferences,
    updateFocusableElements,
    focusOnMount,
    returnFocusOnUnmount,
    handleKeyDown,
    handleFocus,
    handleBlur
  ]);

  // Generate ARIA attributes
  const getAriaAttributes = useCallback(() => {
    const attributes: Record<string, string> = {};

    if (role) attributes.role = role;
    if (ariaLabel) attributes['aria-label'] = ariaLabel;
    if (ariaDescribedBy) attributes['aria-describedby'] = ariaDescribedBy;

    // Add dynamic attributes
    if (accessibilityState.focusableElements.length > 0) {
      attributes['aria-activedescendant'] = 
        accessibilityState.focusableElements[accessibilityState.currentFocusIndex]?.id || '';
    }

    return attributes;
  }, [role, ariaLabel, ariaDescribedBy, accessibilityState.focusableElements, accessibilityState.currentFocusIndex]);

  // Utility functions
  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const elements = accessibilityState.focusableElements;
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [accessibilityState.focusableElements]);

  const skipToContent = useCallback((contentId: string) => {
    const content = document.getElementById(contentId);
    if (content) {
      content.focus();
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
      announce(`Skipped to ${content.getAttribute('aria-label') || 'main content'}`);
    }
  }, [announce]);

  return {
    // Refs
    ref: containerRef,
    liveRegionRef,
    
    // State
    ...accessibilityState,
    
    // Functions
    announce,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusElement,
    trapFocus,
    skipToContent,
    updateFocusableElements,
    getAriaAttributes,
    
    // Utilities
    isAccessible: accessibilityState.focusableElements.length > 0,
    hasKeyboardSupport: enableKeyboardNavigation,
    hasScreenReaderSupport: enableScreenReaderAnnouncements
  };
} 