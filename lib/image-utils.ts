import EXIF from 'exif-js';

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  exif?: {
    // Camera Information
    make?: string;
    model?: string;
    software?: string;
    dateTime?: string;
    dateTimeOriginal?: string;
    dateTimeDigitized?: string;
    
    // Technical Settings
    orientation?: number;
    exposureTime?: string;
    fNumber?: string;
    iso?: number;
    focalLength?: string;
    focalLengthIn35mm?: number;
    
    // Flash and Lighting
    flash?: string;
    whiteBalance?: string;
    meteringMode?: string;
    exposureMode?: string;
    exposureProgram?: string;
    exposureBias?: string;
    
    // Image Quality
    colorSpace?: string;
    pixelXDimension?: number;
    pixelYDimension?: number;
    compression?: string;
    photometricInterpretation?: string;
    
    // GPS Information
    gpsLatitude?: number;
    gpsLongitude?: number;
    gpsAltitude?: number;
    gpsLatitudeRef?: string;
    gpsLongitudeRef?: string;
    gpsAltitudeRef?: number;
    gpsTimeStamp?: string;
    gpsDateStamp?: string;
    
    // Lens Information
    lensModel?: string;
    lensMake?: string;
    lensSerialNumber?: string;
    
    // Additional Technical Data
    sceneType?: string;
    sceneCaptureType?: string;
    contrast?: string;
    saturation?: string;
    sharpness?: string;
    digitalZoomRatio?: number;
    subjectDistance?: string;
    subjectDistanceRange?: string;
    
    // Copyright and Artist
    artist?: string;
    copyright?: string;
    imageDescription?: string;
    userComment?: string;
    
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
 * Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) to decimal degrees
 */
function convertDMSToDD(dms: number[], ref: string): number | null {
  if (!dms || !Array.isArray(dms) || dms.length !== 3) {
    return null;
  }

  const [degrees, minutes, seconds] = dms;
  let dd = degrees + minutes / 60 + seconds / 3600;

  // Apply direction (negative for South/West)
  if (ref === 'S' || ref === 'W') {
    dd = dd * -1;
  }

  return dd;
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
          
          // Get comprehensive EXIF tags
          const tags = [
            // Camera Information
            'Make', 'Model', 'Software', 'DateTime', 'DateTimeOriginal', 'DateTimeDigitized',
            
            // Technical Settings
            'Orientation', 'ExposureTime', 'FNumber', 'ISO', 'ISOSpeedRatings', 
            'FocalLength', 'FocalLengthIn35mmFilm',
            
            // Flash and Lighting
            'Flash', 'WhiteBalance', 'MeteringMode', 'ExposureMode', 
            'ExposureProgram', 'ExposureBiasValue',
            
            // Image Quality
            'ColorSpace', 'PixelXDimension', 'PixelYDimension', 'Compression',
            'PhotometricInterpretation',
            
            // GPS Information
            'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSLatitudeRef', 
            'GPSLongitudeRef', 'GPSAltitudeRef', 'GPSTimeStamp', 'GPSDateStamp',
            
            // Lens Information
            'LensModel', 'LensMake', 'LensSerialNumber',
            
            // Additional Technical Data
            'SceneType', 'SceneCaptureType', 'Contrast', 'Saturation', 'Sharpness',
            'DigitalZoomRatio', 'SubjectDistance', 'SubjectDistanceRange',
            
            // Copyright and Artist
            'Artist', 'Copyright', 'ImageDescription', 'UserComment'
          ];

          tags.forEach(tag => {
            const value = EXIF.getTag(img as any, tag);
            if (value !== undefined && value !== null) {
              // Convert tag name to camelCase
              let camelTag = tag.charAt(0).toLowerCase() + tag.slice(1);
              
              // Handle special cases for better naming
              if (tag === 'ISOSpeedRatings' && !exifData.iso) {
                camelTag = 'iso';
              }
              if (tag === 'FocalLengthIn35mmFilm') {
                camelTag = 'focalLengthIn35mm';
              }
              if (tag === 'ExposureBiasValue') {
                camelTag = 'exposureBias';
              }
              
              exifData[camelTag] = value;
            }
          });

          // Process GPS coordinates if available
          if (exifData.gpsLatitude && exifData.gpsLongitude) {
            // Convert GPS coordinates to decimal degrees
            const lat = convertDMSToDD(exifData.gpsLatitude, exifData.gpsLatitudeRef);
            const lon = convertDMSToDD(exifData.gpsLongitude, exifData.gpsLongitudeRef);
            
            if (lat !== null && lon !== null) {
              exifData.gpsLatitude = lat;
              exifData.gpsLongitude = lon;
            }
          }

          // Format exposure time for better readability
          if (exifData.exposureTime && typeof exifData.exposureTime === 'number') {
            if (exifData.exposureTime < 1) {
              exifData.exposureTime = `1/${Math.round(1 / exifData.exposureTime)}`;
            } else {
              exifData.exposureTime = `${exifData.exposureTime}s`;
            }
          }

          // Format f-number
          if (exifData.fNumber && typeof exifData.fNumber === 'number') {
            exifData.fNumber = `f/${exifData.fNumber}`;
          }

          // Format focal length
          if (exifData.focalLength && typeof exifData.focalLength === 'number') {
            exifData.focalLength = `${exifData.focalLength}mm`;
          }

          // Add all EXIF data (including any additional tags)
          const allTags = EXIF.getAllTags(img as any);
          if (allTags && Object.keys(allTags).length > 0) {
            metadata.exif = { ...exifData, ...allTags };
          } else if (Object.keys(exifData).length > 0) {
            metadata.exif = exifData;
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

export function extractExifData(exifData: unknown): Record<string, unknown> {
  if (!exifData || typeof exifData !== 'object') {
    return {};
  }

  const data = exifData as Record<string, unknown>;
  const extracted: Record<string, unknown> = {};

  if (data.GPS && typeof data.GPS === 'object') {
    const gps = data.GPS as Record<string, unknown>;
    if (gps.GPSLatitude && gps.GPSLongitude) {
      extracted.gpsLatitude = gps.GPSLatitude;
      extracted.gpsLongitude = gps.GPSLongitude;
    }
  }

  return extracted;
} 