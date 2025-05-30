'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, X, Trash2 } from 'lucide-react';

interface SearchHistoryEntry {
  query: string;
  timestamp: string;
  filters?: any;
}

interface SearchHistoryProps {
  onSearchSelect: (query: string) => void;
  maxItems?: number;
  className?: string;
}

export function SearchHistory({
  onSearchSelect,
  maxItems = 10,
  className
}: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('coice_search_history');
        const parsed = stored ? JSON.parse(stored) : [];
        setHistory(parsed.slice(0, maxItems));
      } catch {
        setHistory([]);
      }
    };

    loadHistory();
    
    // Listen for storage changes
    window.addEventListener('storage', loadHistory);
    return () => window.removeEventListener('storage', loadHistory);
  }, [maxItems]);

  // Remove item from history
  const removeHistoryItem = (index: number) => {
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    localStorage.setItem('coice_search_history', JSON.stringify(updated));
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('coice_search_history');
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-4">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recent searches</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {/* Clear all button */}
        {history.length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {history.length} recent search{history.length > 1 ? 'es' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-xs h-6 px-2"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {/* History items */}
        <div className="space-y-1">
          {history.map((entry, index) => (
            <div
              key={index}
              className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <button
                onClick={() => onSearchSelect(entry.query)}
                className="flex-1 flex items-center gap-2 text-left text-sm min-w-0"
              >
                <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{entry.query}</span>
              </button>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground hidden group-hover:block">
                  {formatTime(entry.timestamp)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHistoryItem(index)}
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Show more indicator */}
        {history.length >= maxItems && (
          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              Showing {maxItems} most recent searches
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 