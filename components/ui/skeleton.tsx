import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// Image skeleton with aspect ratio preservation
interface ImageSkeletonProps {
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
  className?: string;
}

function ImageSkeleton({ 
  aspectRatio = 'square', 
  className 
}: ImageSkeletonProps) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video', 
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]'
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      <Skeleton className={cn('w-full h-full', aspectClasses[aspectRatio])} />
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

// Card skeleton for image cards
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <ImageSkeleton aspectRatio="video" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Table skeleton for list views
function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header row */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                "h-3",
                colIndex === 0 ? "w-16" : "flex-1", // First column smaller (checkbox/avatar)
                rowIndex % 3 === 0 && colIndex === columns - 1 && "w-3/4" // Vary last column width
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Carousel skeleton
function CarouselSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Main image area */}
      <div className="relative">
        <ImageSkeleton aspectRatio="video" className="w-full h-[400px]" />
        
        {/* Navigation arrows */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        
        {/* Controls overlay */}
        <div className="absolute bottom-4 left-4 space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      {/* Thumbnail strip */}
      <div className="flex space-x-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <ImageSkeleton 
            key={i} 
            aspectRatio="square" 
            className="w-16 h-16 flex-shrink-0" 
          />
        ))}
      </div>
    </div>
  );
}

// Navigation skeleton
function NavSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className={cn("h-4", i === 0 ? "w-20" : i === 1 ? "w-16" : "w-24")} />
        </div>
      ))}
    </div>
  );
}

// Dashboard stats skeleton
function StatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

// Form skeleton
function FormSkeleton({ 
  fields = 4,
  hasSubmit = true,
  className 
}: { 
  fields?: number;
  hasSubmit?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className={cn("h-10 w-full", i === fields - 1 && "h-20")} />
          {i === 1 && <Skeleton className="h-3 w-48" />} {/* Helper text */}
        </div>
      ))}
      
      {hasSubmit && (
        <div className="flex space-x-4 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      )}
    </div>
  );
}

// Generic content skeleton with title and paragraphs
function ContentSkeleton({ 
  lines = 4,
  hasTitle = true,
  className 
}: { 
  lines?: number;
  hasTitle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {hasTitle && <Skeleton className="h-6 w-48" />}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-4",
              i === lines - 1 ? "w-3/4" : "w-full"
            )} 
          />
        ))}
      </div>
    </div>
  );
}

export { 
  Skeleton, 
  ImageSkeleton,
  CardSkeleton,
  TableSkeleton,
  CarouselSkeleton,
  NavSkeleton,
  StatsSkeleton,
  FormSkeleton,
  ContentSkeleton
} 