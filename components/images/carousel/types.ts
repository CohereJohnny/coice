export interface CarouselImage {
  id: number;
  gcs_path: string;
  library_id: number;
  metadata: {
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    width?: number;
    height?: number;
    format?: string;
    uploaded_by: string;
    upload_date: string;
    thumbnail?: {
      path: string;
      width: number;
      height: number;
      size: number;
    };
    [key: string]: any;
  };
  created_at: string;
  signedUrls?: {
    original?: string;
    thumbnail?: string;
  };
}

export interface CarouselProps {
  images: CarouselImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  showMetadata?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
}

export interface CarouselState {
  selectedIndex: number;
  isOpen: boolean;
  isPlaying: boolean;
  showMetadata: boolean;
  isZoomed: boolean;
  zoomLevel: number;
  zoomCenter: { x: number; y: number };
  panOffset: { x: number; y: number };
  showControls: boolean;
  isFullscreen: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface TouchGesture {
  type: 'swipe' | 'pinch' | 'pan' | 'tap' | 'double-tap';
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  velocity: { x: number; y: number };
  scale?: number;
  distance?: number;
}

export interface CarouselAnalytics {
  sessionId: string;
  interactions: {
    type: string;
    timestamp: number;
    data?: any;
  }[];
  performance: {
    loadTimes: Map<number, number>;
    errorRates: Map<number, number>;
    cacheHits: Map<number, boolean>;
  };
}

export interface CarouselImageProps {
  image: CarouselImage;
  index: number;
  isActive: boolean;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  onZoomLevelChange?: (zoomLevel: number) => void;
  onPanOffsetChange?: (offset: { x: number; y: number }) => void;
  onImageLoad?: (index: number, dimensions: { naturalWidth: number; naturalHeight: number }) => void;
  onImageError?: (index: number, error: string) => void;
  className?: string;
}

export interface CarouselNavigationProps {
  images: CarouselImage[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  showThumbnails?: boolean;
  showArrows?: boolean;
  isMobile?: boolean;
  className?: string;
}

export interface CarouselControlsProps {
  onClose: () => void;
  isPlaying: boolean;
  onToggleSlideshow: () => void;
  showMetadata: boolean;
  onToggleMetadata: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  currentImage?: CarouselImage;
  isMobile?: boolean;
  className?: string;
}

export interface CarouselMetadataProps {
  image?: CarouselImage;
  isVisible: boolean;
  isMobile?: boolean;
  className?: string;
}

export interface CarouselTouchHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPanStart?: (point: { x: number; y: number }) => void;
  onPanMove?: (point: { x: number; y: number; deltaX: number; deltaY: number }) => void;
  onPanEnd?: (point: { x: number; y: number; velocityX: number; velocityY: number }) => void;
  onZoomStart?: (gesture: { centerX: number; centerY: number; distance: number }) => void;
  onZoomMove?: (gesture: { centerX: number; centerY: number; distance: number; scale: number }) => void;
  onZoomEnd?: (gesture: { finalScale: number }) => void;
  onDoubleTap?: (point: { x: number; y: number }) => void;
  isEnabled?: boolean;
  minSwipeDistance?: number;
  className?: string;
} 