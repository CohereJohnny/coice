import EXIF from 'exif-js';

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  exif?: {
    make?: string;
    model?: string;
    dateTime?: string;
    orientation?: number;
    exposureTime?: string;
    fNumber?: string;
    iso?: number;
    focalLength?: string;
    flash?: string;
    whiteBalance?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    [key: string]: any;
  };
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Supported image formats
const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
];

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate image file
 */
export function validateImage(file: File): ValidationResult {
  // Check file type
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file format: ${file.type}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Check if file has content
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty'
    };
  }

  return { isValid: true };
}

/**
 * Extract EXIF metadata from image file
 */
export function extractExifMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      
      if (!arrayBuffer) {
        reject(new Error('Failed to read file'));
        return;
      }

      // Create image element to get dimensions
      const img = new Image();
      const blob = new Blob([arrayBuffer], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      img.onload = function() {
        const metadata: ImageMetadata = {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          width: img.width,
          height: img.height,
        };

        // Extract EXIF data
        EXIF.getData(img as any, function() {
          const exifData: any = {};
          
          // Get common EXIF tags
          const tags = [
            'Make', 'Model', 'DateTime', 'Orientation',
            'ExposureTime', 'FNumber', 'ISO', 'FocalLength',
            'Flash', 'WhiteBalance', 'GPSLatitude', 'GPSLongitude'
          ];

          tags.forEach(tag => {
            const value = EXIF.getTag(img as any, tag);
            if (value !== undefined && value !== null) {
              // Convert tag name to camelCase
              const camelTag = tag.charAt(0).toLowerCase() + tag.slice(1);
              exifData[camelTag] = value;
            }
          });

          // Add all EXIF data
          const allTags = EXIF.getAllTags(img as any);
          if (allTags && Object.keys(allTags).length > 0) {
            metadata.exif = { ...exifData, ...allTags };
          }

          URL.revokeObjectURL(url);
          resolve(metadata);
        });
      };

      img.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for metadata extraction'));
      };

      img.src = url;
    };

    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert file to buffer for upload
 */
export function fileToBuffer(file: File): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        resolve(Buffer.from(arrayBuffer));
      } else {
        reject(new Error('Failed to convert file to buffer'));
      }
    };

    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate thumbnail from image file
 */
export function generateThumbnail(
  file: File, 
  maxWidth: number = 300, 
  maxHeight: number = 300,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = function() {
      // Calculate thumbnail dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = function() {
      reject(new Error('Failed to load image for thumbnail generation'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get image file extension from MIME type
 */
export function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff'
  };
  
  return extensions[mimeType] || 'jpg';
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'jpg';
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${baseName}_${timestamp}_${randomSuffix}.${extension}`;
} 