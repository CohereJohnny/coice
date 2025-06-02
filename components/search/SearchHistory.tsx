'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  History, 
  Clock, 
  X, 
  Star, 
  StarOff,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface SearchHistoryEntry {
  query: string;
  timestamp: string;
  filters?: Record<string, any>;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: Record<string, any>;
  created_at: string;
  last_used?: string;
}

interface SearchHistoryProps {
  onSearchSelect: (query: string, filters?: Record<string, any>) => void;
  maxItems?: number;
  className?: string;
}

export function SearchHistory({
  onSearchSelect,
  maxItems = 10,
  className
}: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [searchToSave, setSearchToSave] = useState<SearchHistoryEntry | null>(null);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);

  // Load history and saved searches from localStorage
  useEffect(() => {
    try {
      const historyData = localStorage.getItem('coice_search_history');
      if (historyData) {
        setHistory(JSON.parse(historyData));
      }

      const savedData = localStorage.getItem('coice_saved_searches');
      if (savedData) {
        setSavedSearches(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Failed to load search data:', error);
    }
  }, []);

  // Handle save search dialog
  const handleSaveSearch = (entry: SearchHistoryEntry) => {
    setSearchToSave(entry);
    setSaveSearchName(entry.query);
    setShowSaveDialog(true);
  };

  // Listen for save current search events from search page
  useEffect(() => {
    const handleSaveCurrentSearch = (event: any) => {
      const searchEntry = event.detail;
      if (searchEntry) {
        handleSaveSearch(searchEntry);
      }
    };

    window.addEventListener('saveCurrentSearch', handleSaveCurrentSearch);
    
    return () => {
      window.removeEventListener('saveCurrentSearch', handleSaveCurrentSearch);
    };
  }, []);

  // Save a search to saved searches
  const saveSearch = (entry: SearchHistoryEntry, name: string) => {
    const newSavedSearch: SavedSearch = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      query: entry.query,
      filters: entry.filters,
      created_at: new Date().toISOString(),
    };

    const updatedSaved = [newSavedSearch, ...savedSearches];
    setSavedSearches(updatedSaved);
    localStorage.setItem('coice_saved_searches', JSON.stringify(updatedSaved));
    
    toast.success(`Saved "${name}"`);
    setShowSaveDialog(false);
    setSaveSearchName('');
    setSearchToSave(null);
  };

  // Update a saved search
  const updateSavedSearch = (id: string, name: string) => {
    const updatedSaved = savedSearches.map(search =>
      search.id === id ? { ...search, name: name.trim() } : search
    );
    setSavedSearches(updatedSaved);
    localStorage.setItem('coice_saved_searches', JSON.stringify(updatedSaved));
    
    toast.success('Updated');
    setEditingSearch(null);
  };

  // Delete a saved search
  const deleteSavedSearch = (id: string) => {
    const updatedSaved = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updatedSaved);
    localStorage.setItem('coice_saved_searches', JSON.stringify(updatedSaved));
    
    toast.success('Deleted');
  };

  // Update last used timestamp for saved search
  const updateLastUsed = (id: string) => {
    const updatedSaved = savedSearches.map(search =>
      search.id === id ? { ...search, last_used: new Date().toISOString() } : search
    );
    setSavedSearches(updatedSaved);
    localStorage.setItem('coice_saved_searches', JSON.stringify(updatedSaved));
  };

  // Handle search selection
  const handleSearchSelect = (query: string, filters?: Record<string, any>, savedSearchId?: string) => {
    if (savedSearchId) {
      updateLastUsed(savedSearchId);
    }
    onSearchSelect(query, filters);
  };

  // Check if a search is already saved
  const isSearchSaved = (query: string) => {
    return savedSearches.some(saved => saved.query === query);
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('coice_search_history');
    toast.success('History cleared');
  };

  const recentHistory = history.slice(0, maxItems);
  const recentSaved = savedSearches.slice(0, 10);

  if (recentHistory.length === 0 && recentSaved.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No history yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </CardTitle>
            {recentHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-xs h-auto p-1"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Saved Searches */}
          {recentSaved.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Star className="h-3 w-3" />
                Saved
              </div>
              <div className="space-y-1">
                {recentSaved.map((saved) => (
                  <div
                    key={saved.id}
                    className="group flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleSearchSelect(saved.query, saved.filters, saved.id)}
                    >
                      <div className="text-sm font-medium truncate" title={saved.name}>
                        {saved.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={saved.query}>
                        {saved.query}
                      </div>
                    </div>
                    
                    <div className="hidden group-hover:flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSearch(saved);
                          setSaveSearchName(saved.name);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedSearch(saved.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {recentHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Recent
              </div>
              <div className="space-y-1">
                {recentHistory.map((entry, index) => (
                  <div
                    key={`${entry.query}-${entry.timestamp}`}
                    className="group flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleSearchSelect(entry.query, entry.filters)}
                    >
                      <div className="text-sm truncate" title={entry.query}>
                        {entry.query}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="hidden group-hover:flex items-center gap-1">
                      {!isSearchSaved(entry.query) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveSearch(entry);
                          }}
                        >
                          <StarOff className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-name">Name</Label>
              <Input
                id="search-name"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="Enter a name"
                className="mt-1"
              />
            </div>
            {searchToSave && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">{searchToSave.query}</div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (searchToSave && saveSearchName.trim()) {
                    saveSearch(searchToSave, saveSearchName);
                  }
                }}
                disabled={!saveSearchName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSearch} onOpenChange={(open) => !open && setEditingSearch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-search-name">Name</Label>
              <Input
                id="edit-search-name"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="Enter a name"
                className="mt-1"
              />
            </div>
            {editingSearch && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">{editingSearch.query}</div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingSearch(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingSearch && saveSearchName.trim()) {
                    updateSavedSearch(editingSearch.id, saveSearchName);
                  }
                }}
                disabled={!saveSearchName.trim()}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 