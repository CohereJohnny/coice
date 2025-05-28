'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {showHome && (
        <>
          <Link 
            href="/" 
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {items.length > 0 && <ChevronRight className="h-4 w-4" />}
        </>
      )}
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          {item.href && !item.isCurrentPage ? (
            <Link 
              href={item.href}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {item.label}
            </Link>
          ) : (
            <span 
              className={cn(
                "truncate max-w-[200px]",
                item.isCurrentPage && "text-foreground font-medium"
              )}
            >
              {item.label}
            </span>
          )}
          
          {index < items.length - 1 && <ChevronRight className="h-4 w-4" />}
        </div>
      ))}
    </nav>
  );
}

// Utility function to build library breadcrumbs
export function buildLibraryBreadcrumbs(
  library: { id: number; name: string; catalog_id: number },
  catalog: { id: number; name: string },
  parentLibraries: Array<{ id: number; name: string }> = []
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];
  
  // Add catalog
  breadcrumbs.push({
    label: catalog.name,
    href: `/catalogs/${catalog.id}`,
  });
  
  // Add parent libraries
  parentLibraries.forEach((parent) => {
    breadcrumbs.push({
      label: parent.name,
      href: `/libraries/${parent.id}`,
    });
  });
  
  // Add current library
  breadcrumbs.push({
    label: library.name,
    href: `/libraries/${library.id}`,
    isCurrentPage: true,
  });
  
  return breadcrumbs;
} 