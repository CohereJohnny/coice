import { ReactNode, useMemo } from 'react';
import { ProgressStage } from './ProgressBar';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: 'completed' | 'processing' | 'failed' | 'pending' | 'skipped';
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
  icon?: ReactNode;
  details?: {
    processed?: number;
    total?: number;
    errors?: string[];
    warnings?: string[];
  };
}

export interface JobTimelineProps {
  events: TimelineEvent[];
  stages?: ProgressStage[];
  currentEventId?: string;
  showDurations?: boolean;
  showDetails?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  className?: string;
  onEventClick?: (event: TimelineEvent) => void;
}

export function JobTimeline({
  events,
  stages = [],
  currentEventId,
  showDurations = true,
  showDetails = true,
  showMetadata = false,
  compact = false,
  className = '',
  onEventClick,
}: JobTimelineProps) {
  
  // Sort events by timestamp
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [events]);

  // Calculate durations and relative times
  const enrichedEvents = useMemo(() => {
    return sortedEvents.map((event, index) => {
      const timestamp = new Date(event.timestamp);
      
      // Check if timestamp is valid
      const isValidDate = !isNaN(timestamp.getTime());
      
      const nextEvent = sortedEvents[index + 1];
      const calculatedDuration = nextEvent && isValidDate
        ? new Date(nextEvent.timestamp).getTime() - timestamp.getTime()
        : event.duration;

      return {
        ...event,
        calculatedDuration,
        relativeTime: isValidDate ? formatRelativeTime(timestamp) : 'Unknown time',
        formattedTime: isValidDate ? timestamp.toLocaleTimeString() : 'Invalid time',
        formattedDate: isValidDate ? timestamp.toLocaleDateString() : 'Invalid date',
        isValidTimestamp: isValidDate,
      };
    });
  }, [sortedEvents]);

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms || isNaN(ms)) return null;
    
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  // Format relative time
  function formatRelativeTime(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Handle negative or invalid differences
    if (isNaN(diffMs) || diffMs < 0) return 'Unknown time';
    
    if (diffMs < 60000) return 'Just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'processing':
        return (
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        );
      case 'skipped':
        return (
          <div className="w-3 h-3 bg-gray-300 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-gray-500 rounded-full" />
          </div>
        );
      default:
        return (
          <div className="w-3 h-3 bg-gray-200 rounded-full border-2 border-gray-300" />
        );
    }
  };

  // Get status color for text
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      case 'skipped':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  if (enrichedEvents.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p>No timeline events available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Timeline header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Job Timeline</h3>
        <div className="text-sm text-muted-foreground">
          {enrichedEvents.length} events
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600" />

        {/* Timeline events */}
        <div className="space-y-4">
          {enrichedEvents.map((event, index) => {
            const isLast = index === enrichedEvents.length - 1;
            const isCurrent = event.id === currentEventId;
            
            return (
              <div
                key={event.id}
                className={`relative flex items-start space-x-4 ${
                  onEventClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -m-2' : ''
                } ${isCurrent ? 'bg-blue-50 dark:bg-blue-950 rounded-lg p-2 -m-2' : ''}`}
                onClick={() => onEventClick?.(event)}
              >
                {/* Timeline marker */}
                <div className="relative z-10 flex-shrink-0 mt-1">
                  {event.icon || getStatusIcon(event.status)}
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Event title and status */}
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
                          {event.title}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </div>

                      {/* Event description */}
                      {event.description && (
                        <p className={`text-muted-foreground mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                          {event.description}
                        </p>
                      )}

                      {/* Event details */}
                      {showDetails && event.details && (
                        <div className="mt-2 space-y-1">
                          {event.details.processed !== undefined && event.details.total !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              Processed: {event.details.processed} / {event.details.total} images
                            </div>
                          )}
                          
                          {event.details.errors && event.details.errors.length > 0 && (
                            <div className="text-xs text-red-600 dark:text-red-400">
                              {event.details.errors.length} error(s)
                            </div>
                          )}
                          
                          {event.details.warnings && event.details.warnings.length > 0 && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                              {event.details.warnings.length} warning(s)
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      {showMetadata && event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                          <details>
                            <summary className="cursor-pointer text-muted-foreground">
                              Metadata ({Object.keys(event.metadata).length} items)
                            </summary>
                            <pre className="mt-1 text-xs overflow-x-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>

                    {/* Timestamp and duration */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
                        {event.formattedTime}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.relativeTime}
                      </div>
                      {showDurations && event.calculatedDuration && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Duration: {formatDuration(event.calculatedDuration)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {!compact && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-green-600 dark:text-green-400">
                {enrichedEvents.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="font-medium text-blue-600 dark:text-blue-400">
                {enrichedEvents.filter(e => e.status === 'processing').length}
              </div>
              <div className="text-muted-foreground">Processing</div>
            </div>
            <div>
              <div className="font-medium text-red-600 dark:text-red-400">
                {enrichedEvents.filter(e => e.status === 'failed').length}
              </div>
              <div className="text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">
                {enrichedEvents.filter(e => e.status === 'pending').length}
              </div>
              <div className="text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 