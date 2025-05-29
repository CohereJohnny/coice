'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  disabled?: boolean;
}

export interface QuickActionsProps {
  actions?: QuickAction[];
  title?: string;
  className?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'create-library',
    title: 'Create Library',
    description: 'Set up a new image library',
    href: '/libraries',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        className="h-8 w-8"
      >
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
  },
  {
    id: 'upload-images',
    title: 'Upload Images',
    description: 'Add images to your libraries',
    href: '/libraries',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        className="h-8 w-8"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
    ),
  },
  {
    id: 'run-analysis',
    title: 'Run Analysis',
    description: 'Start AI-powered image analysis',
    href: '/analysis',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        className="h-8 w-8"
      >
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-5L9.5 3h-3A2 2 0 0 0 4 5v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3c0-.552-.448-1-1-1z" />
      </svg>
    ),
  },
  {
    id: 'search-images',
    title: 'Search Images',
    description: 'Find images across your collections',
    href: '/search',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        className="h-8 w-8"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
];

export function QuickActions({ 
  actions = defaultActions, 
  title = "Quick Actions",
  className = "",
}: QuickActionsProps) {
  const router = useRouter();

  const handleActionClick = (action: QuickAction) => {
    if (action.disabled) return;
    
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  const getActionClasses = (action: QuickAction) => {
    const baseClasses = "flex flex-col items-center justify-center p-4 border rounded-lg transition-colors relative group";
    
    if (action.disabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed`;
    }
    
    switch (action.variant) {
      case 'primary':
        return `${baseClasses} border-primary bg-primary text-primary-foreground hover:bg-primary/90`;
      case 'secondary':
        return `${baseClasses} border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80`;
      default:
        return `${baseClasses} hover:bg-accent hover:text-accent-foreground cursor-pointer`;
    }
  };

  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={getActionClasses(action)}
            disabled={action.disabled}
            title={action.description}
          >
            <div className="mb-2 text-current">
              {action.icon}
            </div>
            <span className="text-sm font-medium text-center">
              {action.title}
            </span>
            
            {action.description && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {action.description}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 