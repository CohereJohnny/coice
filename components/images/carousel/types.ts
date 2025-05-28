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
  isSelected: boolean;
  isZoomed: boolean;
  zoomLevel: number;
  zoomCenter: { x: number; y: number };
  panOffset: { x: number; y: number };
  onLoad: (index: number) => void;
  onError: (index: number, error?: string) => void;
  onZoom: (level: number, center: { x: number; y: number }) => void;
  onPan: (deltaX: number, deltaY: number) => void;
}

export interface CarouselNavigationProps {
  images: CarouselImage[];
  selectedIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  showControls: boolean;
  isMobile: boolean;
}

export interface CarouselControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  showMetadata: boolean;
  onToggleMetadata: () => void;
  onClose: () => void;
  slideshowSpeed: number;
  onSpeedChange: (speed: number) => void;
  showProgress: boolean;
  onToggleProgress: () => void;
  progress: number;
  isMobile: boolean;
}

export interface CarouselMetadataProps {
  image: CarouselImage;
  isVisible: boolean;
  selectedIndex: number;
  totalImages: number;
  isMobile: boolean;
  onClose: () => void;
}

export interface CarouselTouchHandlerProps {
  children: React.ReactNode;
  onSwipe: (direction: 'left' | 'right') => void;
  onZoom: (level: number, center: { x: number; y: number }) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  isZoomed: boolean;
  zoomLevel: number;
  disabled?: boolean;
} 