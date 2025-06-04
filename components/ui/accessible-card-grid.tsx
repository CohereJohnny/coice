'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAccessibility } from '@/lib/hooks/useAccessibility';

export interface AccessibleCardItem {
  id: string | number;
  title: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  metadata?: Record<string, any>;
  isSelected?: boolean;
  isDisabled?: boolean;
  badges?: Array<{ text: string; variant?: string }>;
}

export interface AccessibleCardGridProps {
  items: AccessibleCardItem[];
  selectedItems?: Set<string | number>;
  onItemSelect?: (itemId: string | number, selected: boolean) => void;
  onItemAction?: (item: AccessibleCardItem) => void;
  multiSelect?: boolean;
  gridCols?: 2 | 3 | 4 | 5 | 6;
  cardSize?: 'small' | 'medium' | 'large';
  showCheckboxes?: boolean;
  enableKeyboardNavigation?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function AccessibleCardGrid({
  items,
  selectedItems = new Set(),
  onItemSelect,
  onItemAction,
  multiSelect = false,
  gridCols = 4,
  cardSize = 'medium',
  showCheckboxes = false,
  enableKeyboardNavigation = true,
  ariaLabel = 'Card grid',
  className
}: AccessibleCardGridProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Accessibility hook with custom keyboard shortcuts
  const {
    ref: accessibilityRef,
    liveRegionRef,
    announce,
    currentFocusIndex,
    focusableElements,
    trapFocus,
    getAriaAttributes
  } = useAccessibility({
    enableKeyboardNavigation,
    enableScreenReaderAnnouncements: true,
    role: 'grid',
    ariaLabel,
    keyboardShortcuts: {
      'space': () => handleItemAction(currentFocusIndex),
      'enter': () => handleItemAction(currentFocusIndex),
      'ctrl+a': () => handleSelectAll(),
      'ctrl+shift+a': () => handleDeselectAll(),
      'delete': () => handleDeleteSelected(),
      'ctrl+home': () => handleGoToFirst(),
      'ctrl+end': () => handleGoToLast()
    }
  });

  // Grid configuration
  const gridClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3', 
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
  };

  const cardSizes = {
    small: 'min-h-[120px]',
    medium: 'min-h-[180px]',
    large: 'min-h-[240px]'
  };

  // Handle item actions
  const handleItemAction = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      const item = items[index];
      if (item.isDisabled) {
        announce(`${item.title} is disabled`, 'assertive');
        return;
      }

      if (onItemAction) {
        onItemAction(item);
        announce(`Activated ${item.title}`);
      } else if (onItemSelect) {
        const isSelected = selectedItems.has(item.id);
        onItemSelect(item.id, !isSelected);
        announce(`${item.title} ${!isSelected ? 'selected' : 'deselected'}`);
      }
    }
  }, [items, selectedItems, onItemAction, onItemSelect, announce]);

  const handleItemSelect = useCallback((item: AccessibleCardItem, selected: boolean) => {
    if (item.isDisabled) return;
    
    onItemSelect?.(item.id, selected);
    announce(`${item.title} ${selected ? 'selected' : 'deselected'}`);
  }, [onItemSelect, announce]);

  // Batch operations
  const handleSelectAll = useCallback(() => {
    if (!multiSelect || !onItemSelect) return;
    
    const selectableItems = items.filter(item => !item.isDisabled);
    selectableItems.forEach(item => onItemSelect(item.id, true));
    announce(`Selected all ${selectableItems.length} items`);
  }, [items, multiSelect, onItemSelect, announce]);

  const handleDeselectAll = useCallback(() => {
    if (!multiSelect || !onItemSelect) return;
    
    items.forEach(item => onItemSelect(item.id, false));
    announce('Deselected all items');
  }, [items, multiSelect, onItemSelect, announce]);

  const handleDeleteSelected = useCallback(() => {
    const selectedCount = selectedItems.size;
    if (selectedCount > 0) {
      announce(`${selectedCount} items marked for deletion`, 'assertive');
      // Emit custom event for parent to handle
      const event = new CustomEvent('cards:delete-selected', {
        detail: { selectedItems: Array.from(selectedItems) }
      });
      document.dispatchEvent(event);
    }
  }, [selectedItems, announce]);

  const handleGoToFirst = useCallback(() => {
    if (items.length > 0) {
      const firstCard = gridRef.current?.querySelector('[role="gridcell"] button') as HTMLElement;
      if (firstCard) {
        firstCard.focus();
        announce(`Moved to first item: ${items[0].title}`);
      }
    }
  }, [items, announce]);

  const handleGoToLast = useCallback(() => {
    if (items.length > 0) {
      const lastCard = gridRef.current?.querySelector('[role="gridcell"]:last-child button') as HTMLElement;
      if (lastCard) {
        lastCard.focus();
        announce(`Moved to last item: ${items[items.length - 1].title}`);
      }
    }
  }, [items, announce]);

  // Keyboard navigation for grid layout
  const handleCardKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    const currentRow = Math.floor(index / gridCols);
    const currentCol = index % gridCols;
    const totalRows = Math.ceil(items.length / gridCols);

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = Math.min(index + 1, items.length - 1);
        const nextCard = gridRef.current?.querySelectorAll('[role="gridcell"] button')[nextIndex] as HTMLElement;
        if (nextCard) {
          nextCard.focus();
          announce(`${items[nextIndex].title}, column ${(nextIndex % gridCols) + 1} of ${gridCols}`);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        const prevCard = gridRef.current?.querySelectorAll('[role="gridcell"] button')[prevIndex] as HTMLElement;
        if (prevCard) {
          prevCard.focus();
          announce(`${items[prevIndex].title}, column ${(prevIndex % gridCols) + 1} of ${gridCols}`);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        const downIndex = Math.min(index + gridCols, items.length - 1);
        const downCard = gridRef.current?.querySelectorAll('[role="gridcell"] button')[downIndex] as HTMLElement;
        if (downCard) {
          downCard.focus();
          announce(`${items[downIndex].title}, row ${Math.floor(downIndex / gridCols) + 1} of ${totalRows}`);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        const upIndex = Math.max(index - gridCols, 0);
        const upCard = gridRef.current?.querySelectorAll('[role="gridcell"] button')[upIndex] as HTMLElement;
        if (upCard) {
          upCard.focus();
          announce(`${items[upIndex].title}, row ${Math.floor(upIndex / gridCols) + 1} of ${totalRows}`);
        }
        break;

      case 'Home':
        event.preventDefault();
        if (event.ctrlKey) {
          handleGoToFirst();
        } else {
          // Go to first item in current row
          const rowStart = currentRow * gridCols;
          const firstInRow = gridRef.current?.querySelectorAll('[role="gridcell"] button')[rowStart] as HTMLElement;
          if (firstInRow) {
            firstInRow.focus();
            announce(`${items[rowStart].title}, first in row ${currentRow + 1}`);
          }
        }
        break;

      case 'End':
        event.preventDefault();
        if (event.ctrlKey) {
          handleGoToLast();
        } else {
          // Go to last item in current row
          const rowEnd = Math.min((currentRow + 1) * gridCols - 1, items.length - 1);
          const lastInRow = gridRef.current?.querySelectorAll('[role="gridcell"] button')[rowEnd] as HTMLElement;
          if (lastInRow) {
            lastInRow.focus();
            announce(`${items[rowEnd].title}, last in row ${currentRow + 1}`);
          }
        }
        break;

      case ' ':
        event.preventDefault();
        if (multiSelect && showCheckboxes) {
          const item = items[index];
          const isSelected = selectedItems.has(item.id);
          handleItemSelect(item, !isSelected);
        } else {
          handleItemAction(index);
        }
        break;

      case 'Enter':
        event.preventDefault();
        handleItemAction(index);
        break;
    }
  }, [gridCols, items, selectedItems, multiSelect, showCheckboxes, announce, handleItemAction, handleItemSelect, handleGoToFirst, handleGoToLast]);

  // Announce grid information when focus enters
  const handleGridFocus = useCallback(() => {
    const selectedCount = selectedItems.size;
    const totalCount = items.length;
    
    let announcement = `Card grid with ${totalCount} items`;
    if (selectedCount > 0) {
      announcement += `, ${selectedCount} selected`;
    }
    announcement += `. Use arrow keys to navigate, space to select, enter to activate.`;
    
    announce(announcement);
  }, [items.length, selectedItems.size, announce]);

  return (
    <div className={cn('relative', className)}>
      {/* Skip link for better navigation */}
      <a
        href="#grid-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Skip to grid content
      </a>

      {/* Grid instructions for screen readers */}
      <div className="sr-only">
        <h2>Card Grid Navigation Instructions</h2>
        <p>
          Use arrow keys to navigate between cards. 
          Press Space to select/deselect items, Enter to activate items.
          {multiSelect && " Press Ctrl+A to select all, Ctrl+Shift+A to deselect all."}
          Press Home/End to move within rows, Ctrl+Home/End to move to first/last item.
        </p>
      </div>

      {/* Main grid */}
      <div
        id="grid-content"
        ref={(node) => {
          gridRef.current = node;
          if (accessibilityRef) {
            accessibilityRef.current = node as HTMLElement;
          }
        }}
        className={cn(
          'grid gap-4',
          gridClasses[gridCols]
        )}
        role="grid"
        aria-label={ariaLabel}
        aria-rowcount={Math.ceil(items.length / gridCols)}
        aria-colcount={gridCols}
        onFocus={handleGridFocus}
        {...getAriaAttributes()}
      >
        {items.map((item, index) => {
          const isSelected = selectedItems.has(item.id);
          const rowIndex = Math.floor(index / gridCols) + 1;
          const colIndex = (index % gridCols) + 1;

          return (
            <div
              key={item.id}
              role="gridcell"
              aria-rowindex={rowIndex}
              aria-colindex={colIndex}
              className="relative"
            >
              <Card 
                className={cn(
                  'h-full cursor-pointer transition-all duration-200',
                  'hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
                  cardSizes[cardSize],
                  isSelected && 'ring-2 ring-blue-500 shadow-lg bg-blue-50 dark:bg-blue-950',
                  item.isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <button
                  className="w-full h-full text-left focus:outline-none"
                  onClick={() => !item.isDisabled && handleItemAction(index)}
                  onKeyDown={(e) => handleCardKeyDown(e, index)}
                  disabled={item.isDisabled}
                  aria-label={`${item.title}${item.description ? `. ${item.description}` : ''}${isSelected ? '. Selected' : ''}`}
                  aria-describedby={`card-${item.id}-details`}
                  aria-selected={isSelected}
                  aria-rowindex={rowIndex}
                  aria-colindex={colIndex}
                  tabIndex={index === 0 ? 0 : -1} // Only first item tabbable
                >
                  <CardContent className="p-4 h-full flex flex-col">
                    {/* Selection checkbox */}
                    {showCheckboxes && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => 
                            !item.isDisabled && handleItemSelect(item, !!checked)
                          }
                          disabled={item.isDisabled}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${item.title}`}
                          className="bg-white/90 shadow-sm"
                        />
                      </div>
                    )}

                    {/* Image */}
                    {item.imageUrl && (
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800">
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt || ''}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {item.title}
                      </h3>
                      
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Badges */}
                      {item.badges && item.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.badges.map((badge, badgeIndex) => (
                            <span
                              key={badgeIndex}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            >
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </button>

                {/* Hidden details for screen readers */}
                <div id={`card-${item.id}-details`} className="sr-only">
                  {item.metadata && Object.entries(item.metadata).map(([key, value]) => (
                    <span key={key}>{key}: {String(value)}. </span>
                  ))}
                  Position: Row {rowIndex}, Column {colIndex} of {gridCols}.
                  {isSelected && 'This item is selected.'}
                  {item.isDisabled && 'This item is disabled.'}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Live region for announcements */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Grid summary for screen readers */}
      <div className="sr-only" aria-live="polite">
        Grid contains {items.length} items. 
        {selectedItems.size > 0 && `${selectedItems.size} items selected.`}
        Arranged in {Math.ceil(items.length / gridCols)} rows and {gridCols} columns.
      </div>
    </div>
  );
} 