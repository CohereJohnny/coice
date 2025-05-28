'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  ChevronDown,
  FolderOpen,
  Folder,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/lib/stores/auth';

interface Library {
  id: number;
  name: string;
  parent_id: number | null;
  children?: Library[];
}

interface Catalog {
  id: number;
  name: string;
  libraries: Library[];
}

interface CatalogNavigationProps {
  isCollapsed?: boolean;
}

export function CatalogNavigation({ isCollapsed = false }: CatalogNavigationProps) {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [expandedCatalogs, setExpandedCatalogs] = useState<Set<number>>(new Set());
  const [expandedLibraries, setExpandedLibraries] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    type: 'catalog' | 'library';
    id: number;
    x: number;
    y: number;
  } | null>(null);
  
  const { profile } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    fetchCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Close context menu when clicking elsewhere
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchCatalogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/catalogs');
      if (response.ok) {
        const data: { catalogs: Array<Record<string, unknown>> } = await response.json();
        const catalogsWithLibraries = await Promise.all(
          data.catalogs.map(async (catalog: Record<string, unknown>) => {
            const libResponse = await fetch(`/api/libraries?catalog_id=${catalog.id}`);
            if (libResponse.ok) {
              const libData = await libResponse.json();
              return {
                ...catalog,
                libraries: buildLibraryTree(libData.libraries || [])
              };
            }
            return { ...catalog, libraries: [] };
          })
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCatalogs(catalogsWithLibraries as any);
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildLibraryTree = (libraries: any[]): Library[] => {
    const libraryMap = new Map<number, Library>();
    const rootLibraries: Library[] = [];

    // First pass: create all library objects
    libraries.forEach(lib => {
      libraryMap.set(lib.id, {
        id: lib.id,
        name: lib.name,
        parent_id: lib.parent_id,
        children: []
      });
    });

    // Second pass: build the tree structure
    libraries.forEach(lib => {
      const library = libraryMap.get(lib.id)!;
      if (lib.parent_id) {
        const parent = libraryMap.get(lib.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(library);
        }
      } else {
        rootLibraries.push(library);
      }
    });

    return rootLibraries;
  };

  const toggleCatalog = (catalogId: number) => {
    const newExpanded = new Set(expandedCatalogs);
    if (newExpanded.has(catalogId)) {
      newExpanded.delete(catalogId);
    } else {
      newExpanded.add(catalogId);
    }
    setExpandedCatalogs(newExpanded);
  };

  const toggleLibrary = (libraryId: number) => {
    const newExpanded = new Set(expandedLibraries);
    if (newExpanded.has(libraryId)) {
      newExpanded.delete(libraryId);
    } else {
      newExpanded.add(libraryId);
    }
    setExpandedLibraries(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'catalog' | 'library', id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      type,
      id,
      x: e.clientX,
      y: e.clientY
    });
  };

  const canManage = profile?.role === 'admin' || profile?.role === 'manager';

  const renderLibrary = (library: Library, level: number = 0) => {
    const isExpanded = expandedLibraries.has(library.id);
    const hasChildren = library.children && library.children.length > 0;
    const isActive = pathname === `/libraries/${library.id}`;
    const paddingLeft = isCollapsed ? 'pl-2' : `pl-${4 + level * 4}`;

    return (
      <div key={library.id}>
        <div className={`group relative ${paddingLeft}`}>
          <div
            className={`flex items-center h-8 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isActive ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
            onContextMenu={(e) => handleContextMenu(e, 'library', library.id)}
          >
            {hasChildren && !isCollapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleLibrary(library.id);
                }}
                className="mr-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            {!hasChildren && !isCollapsed && <div className="w-4 mr-1" />}
            
            <Link href={`/libraries/${library.id}`} className="flex items-center flex-1">
              {isExpanded || hasChildren ? (
                <FolderOpen className="h-4 w-4 mr-2 flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 mr-2 flex-shrink-0" />
              )}
              
              {!isCollapsed && (
                <span className="truncate text-sm">{library.name}</span>
              )}
            </Link>
          </div>
        </div>
        
        {hasChildren && isExpanded && !isCollapsed && (
          <div>
            {library.children!.map(child => renderLibrary(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-2">
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-1 p-2">
        {catalogs.map((catalog) => {
          const isExpanded = expandedCatalogs.has(catalog.id);
          const isActive = pathname === `/catalogs/${catalog.id}`;
          
          return (
            <div key={catalog.id}>
              <div
                className={`flex items-center h-8 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isActive ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                onContextMenu={(e) => handleContextMenu(e, 'catalog', catalog.id)}
              >
                {!isCollapsed && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleCatalog(catalog.id);
                    }}
                    className="mr-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                )}
                
                <Link href={`/catalogs/${catalog.id}`} className="flex items-center flex-1">
                  <FolderOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                  
                  {!isCollapsed && (
                    <span className="truncate font-medium">{catalog.name}</span>
                  )}
                </Link>
              </div>
              
              {isExpanded && !isCollapsed && (
                <div className="ml-2">
                  {catalog.libraries.map(library => renderLibrary(library))}
                  
                  {canManage && (
                    <div className="pl-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          // TODO: Open create library dialog
                          console.log('Create library in catalog', catalog.id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="text-sm">Add Library</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              // TODO: Open create catalog dialog
              console.log('Create catalog');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {!isCollapsed && <span className="text-sm">Add Catalog</span>}
          </Button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <button
            onClick={() => {
              console.log(`Edit ${contextMenu.type}`, contextMenu.id);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => {
              console.log(`Delete ${contextMenu.type}`, contextMenu.id);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
} 