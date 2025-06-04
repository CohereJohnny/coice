'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SkipLink {
  href: string;
  label: string;
  description?: string;
  shortcut?: string;
}

export interface SkipLinksProps {
  links?: SkipLink[];
  showShortcuts?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right';
  className?: string;
}

// Default skip links for common navigation patterns
const defaultSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Skip to main content',
    description: 'Bypass navigation and go directly to the main content area',
    shortcut: 'Alt+1'
  },
  {
    href: '#primary-navigation',
    label: 'Skip to navigation',
    description: 'Go to the main navigation menu',
    shortcut: 'Alt+2'
  },
  {
    href: '#search',
    label: 'Skip to search',
    description: 'Go to the search functionality',
    shortcut: 'Alt+3'
  },
  {
    href: '#footer',
    label: 'Skip to footer',
    description: 'Go to the footer section',
    shortcut: 'Alt+4'
  }
];

export function SkipLinks({
  links = defaultSkipLinks,
  showShortcuts = true,
  position = 'top-left',
  className
}: SkipLinksProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeShortcuts, setActiveShortcuts] = useState<Set<string>>(new Set());

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4'
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!showShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Alt key is pressed with a number
      if (event.altKey && !event.ctrlKey && !event.shiftKey) {
        const number = parseInt(event.key);
        if (number >= 1 && number <= links.length) {
          event.preventDefault();
          const link = links[number - 1];
          const targetElement = document.querySelector(link.href);
          
          if (targetElement) {
            // Smooth scroll to element
            targetElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
            
            // Focus the element if it's focusable
            if (targetElement instanceof HTMLElement) {
              targetElement.focus();
              
              // If not naturally focusable, make it focusable temporarily
              if (!targetElement.hasAttribute('tabindex')) {
                targetElement.setAttribute('tabindex', '-1');
                targetElement.addEventListener('blur', () => {
                  targetElement.removeAttribute('tabindex');
                }, { once: true });
              }
            }

            // Announce the action to screen readers
            const announcement = `Skipped to ${link.label.toLowerCase()}`;
            announceToScreenReader(announcement);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [links, showShortcuts]);

  // Show skip links on tab/focus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsVisible(true);
      }
    };

    const handleClick = () => {
      setIsVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Announce to screen reader
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Handle skip link click
  const handleSkipLinkClick = (event: React.MouseEvent, link: SkipLink) => {
    event.preventDefault();
    
    const targetElement = document.querySelector(link.href);
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      if (targetElement instanceof HTMLElement) {
        targetElement.focus();
        
        if (!targetElement.hasAttribute('tabindex')) {
          targetElement.setAttribute('tabindex', '-1');
          targetElement.addEventListener('blur', () => {
            targetElement.removeAttribute('tabindex');
          }, { once: true });
        }
      }

      announceToScreenReader(`Skipped to ${link.label.toLowerCase()}`);
      setIsVisible(false);
    }
  };

  return (
    <>
      {/* Skip Links Container */}
      <div
        className={cn(
          'fixed z-[9999] flex flex-col gap-1',
          positionClasses[position],
          className
        )}
        role="navigation"
        aria-label="Skip links"
      >
        {links.map((link, index) => (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center px-4 py-2 text-sm font-medium',
              'bg-blue-600 text-white rounded-md shadow-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'hover:bg-blue-700 transition-colors duration-200',
              'transform translate-y-[-100vh] focus:translate-y-0',
              isVisible && 'translate-y-0'
            )}
            onClick={(e) => handleSkipLinkClick(e, link)}
            tabIndex={0}
            role="button"
            aria-describedby={`skip-description-${index}`}
          >
            <span className="flex items-center gap-2">
              {link.label}
              {showShortcuts && link.shortcut && (
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-xs bg-blue-500 rounded">
                  {link.shortcut}
                </kbd>
              )}
            </span>
          </a>
        ))}
      </div>

      {/* Hidden descriptions for screen readers */}
      {links.map((link, index) => (
        link.description && (
          <div
            key={`desc-${index}`}
            id={`skip-description-${index}`}
            className="sr-only"
          >
            {link.description}
          </div>
        )
      ))}

      {/* Keyboard shortcut instructions */}
      {showShortcuts && (
        <div className="sr-only">
          <h2>Keyboard Navigation Shortcuts</h2>
          <ul>
            {links.map((link, index) => (
              link.shortcut && (
                <li key={index}>
                  Press {link.shortcut} to {link.label.toLowerCase()}
                </li>
              )
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// Landmark component for main content areas
export interface LandmarkProps {
  children: React.ReactNode;
  id?: string;
  role?: 'main' | 'navigation' | 'banner' | 'contentinfo' | 'complementary' | 'search' | 'region';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
}

export function Landmark({
  children,
  id,
  role = 'region',
  ariaLabel,
  ariaLabelledBy,
  className
}: LandmarkProps) {
  return (
    <div
      id={id}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={className}
      tabIndex={-1} // Make focusable for skip links
    >
      {children}
    </div>
  );
}

// Main content wrapper with skip target
export interface MainContentProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function MainContent({ children, className, title }: MainContentProps) {
  return (
    <Landmark
      id="main-content"
      role="main"
      ariaLabel={title || "Main content"}
      className={cn('focus:outline-none', className)}
    >
      {/* Screen reader heading for main content */}
      {title && (
        <h1 className="sr-only">
          {title}
        </h1>
      )}
      {children}
    </Landmark>
  );
}

// Navigation wrapper with skip target
export interface NavigationWrapperProps {
  children: React.ReactNode;
  type?: 'primary' | 'secondary' | 'breadcrumb' | 'pagination';
  ariaLabel?: string;
  className?: string;
}

export function NavigationWrapper({ 
  children, 
  type = 'primary', 
  ariaLabel,
  className 
}: NavigationWrapperProps) {
  const defaultLabels = {
    primary: 'Primary navigation',
    secondary: 'Secondary navigation',
    breadcrumb: 'Breadcrumb navigation',
    pagination: 'Pagination navigation'
  };

  const id = type === 'primary' ? 'primary-navigation' : `${type}-navigation`;

  return (
    <Landmark
      id={id}
      role="navigation"
      ariaLabel={ariaLabel || defaultLabels[type]}
      className={cn('focus:outline-none', className)}
    >
      {children}
    </Landmark>
  );
}

// Footer wrapper with skip target
export interface FooterWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function FooterWrapper({ children, className }: FooterWrapperProps) {
  return (
    <Landmark
      id="footer"
      role="contentinfo"
      ariaLabel="Footer"
      className={cn('focus:outline-none', className)}
    >
      {children}
    </Landmark>
  );
}

// Search wrapper with skip target
export interface SearchWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function SearchWrapper({ children, className }: SearchWrapperProps) {
  return (
    <Landmark
      id="search"
      role="search"
      ariaLabel="Search"
      className={cn('focus:outline-none', className)}
    >
      {children}
    </Landmark>
  );
} 