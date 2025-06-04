'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  showErrorDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
  name?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = generateErrorId();
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component', name = 'Unknown' } = this.props;
    const { errorId } = this.state;

    this.setState({ errorInfo });

    // Report error to logging service
    this.reportError(error, errorInfo, errorId, level, name);

    // Call custom error handler if provided
    onError?.(error, errorInfo, errorId);
  }

  private reportError = async (
    error: Error,
    errorInfo: ErrorInfo,
    errorId: string,
    level: string,
    componentName: string
  ) => {
    // In a real app, this would send to an error reporting service
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      componentName,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error (${errorId})`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Report:', errorReport);
      console.groupEnd();
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport),
        });
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }
  };

  private handleReset = () => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback, showErrorDetails = false, level = 'component' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI based on level
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          level={level}
          retryCount={this.retryCount}
          maxRetries={this.maxRetries}
          showErrorDetails={showErrorDetails}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
        />
      );
    }

    return children;
  }
}

// Error fallback component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  level: string;
  retryCount: number;
  maxRetries: number;
  showErrorDetails: boolean;
  onRetry: () => void;
  onReset: () => void;
}

function ErrorFallback({
  error,
  errorInfo,
  errorId,
  level,
  retryCount,
  maxRetries,
  showErrorDetails,
  onRetry,
  onReset,
}: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries;
  const isCritical = level === 'critical' || level === 'page';

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            {isCritical ? (
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            ) : (
              <Bug className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            )}
          </div>
          <CardTitle className="text-lg">
            {isCritical ? 'Something went wrong' : 'Component Error'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isCritical
              ? 'We encountered an unexpected error. Please try again.'
              : 'This component failed to load properly.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error ID for support */}
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              Error ID: <code className="font-mono">{errorId}</code>
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Retry attempt: {retryCount}/{maxRetries}
              </p>
            )}
          </div>

          {/* Error details (development or when enabled) */}
          {showErrorDetails && error && (
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Error Details
              </summary>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Message:</p>
                  <code className="text-xs">{error.message}</code>
                </div>
                {error.stack && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Stack Trace:</p>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Component Stack:</p>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            {canRetry ? (
              <Button onClick={onRetry} className="flex-1" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again {retryCount > 0 && `(${maxRetries - retryCount} left)`}
              </Button>
            ) : (
              <Button onClick={onReset} className="flex-1" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}

            {isCritical && (
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            )}
          </div>

          {/* Support message */}
          <p className="text-center text-xs text-muted-foreground">
            If this problem persists, please contact support with the error ID above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility function to generate unique error IDs
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specific error boundaries for different use cases
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="critical"
      name="Page"
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo, errorId) => {
        // Page-level errors are critical
        console.error('Page Error:', { error, errorInfo, errorId });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ 
  children, 
  name 
}: { 
  children: ReactNode;
  name?: string;
}) {
  return (
    <ErrorBoundary
      level="component"
      name={name}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}

// Hook for triggering errors (useful for testing)
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
} 