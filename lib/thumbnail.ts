import sharp from 'sharp';
import { uploadFile, generateStoragePath } from './gcs';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ThumbnailResult {
  thumbnailPath: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Generate thumbnail from image buffer
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const {
    width = 300,
    height = 300,
    quality = 80,
    format = 'jpeg'
  } = options;

  try {
    const thumbnail = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat(format, { quality })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate and upload thumbnail to GCS
 */
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  catalogId: string,
  libraryId: string,
  originalFileName: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  try {
    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(originalImageBuffer, options);
    
    // Get thumbnail metadata
    const metadata = await sharp(thumbnailBuffer).metadata();
    
    // Generate thumbnail filename
    const fileExtension = options.format || 'jpeg';
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    const thumbnailFileName = `${baseName}_thumb.${fileExtension}`;
    
    // Generate storage path for thumbnail
    const thumbnailPath = generateStoragePath(catalogId, libraryId, `thumbnails/${thumbnailFileName}`);
    
    // Upload thumbnail to GCS
    const uploadResult = await uploadFile(thumbnailBuffer, {
      destination: thumbnailPath,
      metadata: {
        originalFile: originalFileName,
        type: 'thumbnail',
        catalogId,
        libraryId,
      },
      public: false,
    });

    return {
      thumbnailPath: uploadResult.gcsPath,
      thumbnailUrl: uploadResult.publicUrl,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: thumbnailBuffer.length,
    };
  } catch (error) {
    throw new Error(`Failed to generate and upload thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate multiple thumbnail sizes
 */
export async function generateMultipleThumbnails(
  originalImageBuffer: Buffer,
  catalogId: string,
  libraryId: string,
  originalFileName: string
): Promise<{ [size: string]: ThumbnailResult }> {
  const sizes = {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 },
  };

  const results: { [size: string]: ThumbnailResult } = {};

  for (const [sizeName, dimensions] of Object.entries(sizes)) {
    try {
      const result = await generateAndUploadThumbnail(
        originalImageBuffer,
        catalogId,
        libraryId,
        originalFileName,
        {
          ...dimensions,
          format: 'jpeg',
          quality: 80,
        }
      );
      results[sizeName] = result;
    } catch (error) {
      console.error(`Failed to generate ${sizeName} thumbnail:`, error);
    }
  }

  return results;
}

/**
 * Extract image dimensions and metadata
 */
export async function getImageMetadata(imageBuffer: Buffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
    };
  } catch (error) {
    throw new Error(`Failed to extract image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 