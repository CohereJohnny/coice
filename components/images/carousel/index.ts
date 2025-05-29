// Main Carousel Component
export { Carousel } from './Carousel';

// Sub-components
export { CarouselImage } from './CarouselImage';
export { CarouselNavigation } from './CarouselNavigation';
export { CarouselControls } from './CarouselControls';
export { CarouselMetadata } from './CarouselMetadata';
export { CarouselTouchHandler } from './CarouselTouchHandler';

// Hooks
export { useCarouselState } from './hooks/useCarouselState';
// TODO: Implement these hooks in future iterations
// export { useCarouselKeyboard } from './hooks/useCarouselKeyboard';
// export { useCarouselAnalytics } from './hooks/useCarouselAnalytics';
// export { useCarouselPerformance } from './hooks/useCarouselPerformance';

// Types
export type {
  CarouselProps,
  CarouselImage as CarouselImageType,
  CarouselState,
  CarouselAnalytics,
  TouchGesture
} from './types'; 