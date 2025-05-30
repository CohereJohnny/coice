'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  loading = false,
  placeholder = "Search...",
  className
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Escape to blur search
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setShowSuggestions(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
      setShowSuggestions(false);
      // Save to recent searches
      saveToRecentSearches(value.trim());
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Show suggestions when typing
    if (newValue.length > 1) {
      generateSuggestions(newValue);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Generate search suggestions
  const generateSuggestions = (query: string) => {
    const recentSearches = getRecentSearches();
    const filtered = recentSearches
      .filter(search => search.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
    
    setSuggestions(filtered);
  };

  // Get recent searches from localStorage
  const getRecentSearches = (): string[] => {
    try {
      const searches = localStorage.getItem('coice_recent_searches');
      return searches ? JSON.parse(searches) : [];
    } catch {
      return [];
    }
  };

  // Save to recent searches
  const saveToRecentSearches = (query: string) => {
    try {
      const recent = getRecentSearches();
      const updated = [query, ...recent.filter(s => s !== query)].slice(0, 10);
      localStorage.setItem('coice_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Clear search
  const handleClear = () => {
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => {
              setIsFocused(true);
              if (value.length > 1) {
                generateSuggestions(value);
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              setIsFocused(false);
              // Delay hiding suggestions to allow clicks
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={placeholder}
            className={cn(
              "pl-10 pr-20",
              isFocused && "ring-2 ring-primary ring-offset-2"
            )}
            disabled={loading}
          />
          
          {/* Clear button */}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-12 h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* Search button */}
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 h-8"
            disabled={loading || !value.trim()}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Keyboard shortcut hint */}
        {!isFocused && !value && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              ⌘K
            </Badge>
          </div>
        )}
      </form>

      {/* Search suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg">
          <div className="py-1">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground border-b">
              Recent searches
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              >
                <Search className="h-3 w-3 text-muted-foreground" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 