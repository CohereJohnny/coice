'use client';

// Clean export from our new modular architecture with dynamic loading
import dynamic from 'next/dynamic';
import { CarouselProps } from './carousel/types';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import with loading fallback
const CarouselComponent = dynamic(
  () => import('./carousel/Carousel').then(mod => ({ default: mod.Carousel })),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="w-20 h-20 rounded-full mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
          <p className="text-white text-sm">Loading image viewer...</p>
        </div>
      </div>
    ),
    ssr: false // Disable SSR for better performance
  }
);

export default function Carousel(props: CarouselProps) {
  return <CarouselComponent {...props} />;
}

// Export types for external usage
export type { CarouselProps } from './carousel/types'; 