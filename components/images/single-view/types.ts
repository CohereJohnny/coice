/**
 * TypeScript interfaces for Single Image View components
 * Following the component architecture patterns for clean contracts
 */

export interface ImageData {
  id: number;
  gcs_path: string;
  library_id: number;
  metadata: ImageMetadata;
  created_at: string;
  signedUrls?: {
    original?: string;
    thumbnail?: string;
  };
  library?: {
    id: number;
    name: string;
    catalog_id: number;
    catalog_name?: string;
  };
}

export interface ImageMetadata {
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  format?: string;
  density?: number;
  has_alpha?: boolean;
  orientation?: number;
  uploaded_by: string;
  upload_date: string;
  thumbnail?: {
    path: string;
    width: number;
    height: number;
    size: number;
  };
}

export interface SingleImageViewProps {
  /** Library ID containing the image (optional - will be derived from image data if not provided) */
  libraryId?: string;
  /** Image ID to display */
  imageId: string;
  /** Optional className for styling */
  className?: string;
}

export interface ImageDisplayProps {
  /** Image data to display */
  image: ImageData | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Optional className for styling */
  className?: string;
}

export interface ImageMetadataProps {
  /** Image metadata to display */
  metadata: ImageMetadata;
  /** Image file information */
  imageInfo?: {
    id: number;
    created_at: string;
    library_name?: string;
    catalog_name?: string;
  };
  /** Display variant */
  variant?: 'panel' | 'sidebar' | 'compact';
  /** Optional className for styling */
  className?: string;
}

export interface ImageActionsProps {
  /** Image data for actions */
  image: ImageData;
  /** Loading states for different actions */
  loadingStates: {
    keywords: boolean;
    description: boolean;
    analysis: boolean;
    download: boolean;
    delete: boolean;
    findSimilar: boolean;
  };
  /** Action handlers */
  onGenerateKeywords: () => Promise<void>;
  onGenerateDescription: () => Promise<void>;
  onStartAnalysis: () => Promise<void>;
  onDownload: () => Promise<void>;
  onDelete: () => Promise<void>;
  onFindSimilar: () => Promise<void>;
  /** Generated content */
  generatedContent?: {
    keywords: string[];
    description: string;
    analysisResults?: any[];
  };
  /** Optional className for styling */
  className?: string;
}

export interface ImageChatProps {
  /** Image data for context */
  image: ImageData;
  /** Optional className for styling */
  className?: string;
}

export interface UseSingleImageStateProps {
  /** Library ID (optional - will be derived from image data if not provided) */
  libraryId?: string;
  /** Image ID */
  imageId: string;
  /** Auto-refresh interval in seconds */
  refreshInterval?: number;
}

export interface UseSingleImageStateReturn {
  // Core data
  image: ImageData | null;
  error: string | null;
  
  // Loading states
  isLoading: boolean;
  loadingStates: {
    keywords: boolean;
    description: boolean;
    analysis: boolean;
    download: boolean;
    delete: boolean;
    findSimilar: boolean;
  };
  
  // Generated content
  generatedContent: {
    keywords: string[];
    description: string;
    analysisResults: any[];
  };
  
  // Actions
  refresh: () => Promise<void>;
  generateKeywords: () => Promise<void>;
  generateDescription: () => Promise<void>;
  startAnalysis: () => Promise<void>;
  downloadImage: () => Promise<void>;
  deleteImage: () => Promise<void>;
  findSimilarImages: () => Promise<void>;
  
  // Navigation helpers
  goToLibrary: () => void;
  goToCarousel: () => void;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface GeneratedKeywords {
  keywords: string[];
  confidence: number;
  model: string;
  generated_at: string;
}

export interface GeneratedDescription {
  description: string;
  confidence: number;
  model: string;
  generated_at: string;
} 