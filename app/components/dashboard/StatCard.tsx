import { ReactNode } from 'react';

export interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  variant?: 'default' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

export function StatCard({
  title,
  value,
  description,
  icon,
  isLoading = false,
  error = null,
  variant = 'default',
  trend,
}: StatCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      default:
        return 'border bg-card';
    }
  };

  const getTrendClasses = () => {
    if (!trend) return '';
    
    switch (trend.direction) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 text-card-foreground shadow-sm p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium text-red-700 dark:text-red-300">
            {title}
          </h3>
          <div className="text-red-500">
            {icon}
          </div>
        </div>
        <div className="text-sm text-red-600 dark:text-red-400">
          Error loading data
        </div>
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg ${getVariantClasses()} text-card-foreground shadow-sm p-6`}>
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium">
          {title}
        </h3>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline space-x-2">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-muted rounded"></div>
          </div>
        ) : (
          <div className="text-2xl font-bold">
            {formatValue(value)}
          </div>
        )}
        
        {trend && !isLoading && (
          <div className={`text-xs ${getTrendClasses()} flex items-center`}>
            {trend.direction === 'up' && (
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414 6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend.direction === 'down' && (
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </div>
      
      {description && (
        <p className="text-xs text-muted-foreground mt-1">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-3 w-24 bg-muted rounded"></div>
            </div>
          ) : (
            description
          )}
        </p>
      )}
    </div>
  );
} 