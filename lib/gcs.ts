import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage client
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME environment variable is required');
}

const bucket = storage.bucket(bucketName);

export interface UploadOptions {
  destination: string;
  metadata?: {
    [key: string]: string;
  };
  public?: boolean;
}

export interface UploadResult {
  fileName: string;
  publicUrl?: string;
  gcsPath: string;
}

/**
 * Upload a file to Google Cloud Storage
 */
export async function uploadFile(
  fileBuffer: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const file = bucket.file(options.destination);
    
    const stream = file.createWriteStream({
      metadata: {
        metadata: options.metadata || {},
      },
      public: options.public || false,
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        reject(new Error(`Upload failed: ${error.message}`));
      });

      stream.on('finish', () => {
        const result: UploadResult = {
          fileName: options.destination,
          gcsPath: `gs://${bucketName}/${options.destination}`,
        };

        if (options.public) {
          result.publicUrl = `https://storage.googleapis.com/${bucketName}/${options.destination}`;
        }

        resolve(result);
      });

      stream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from Google Cloud Storage
 */
export async function deleteFile(fileName: string): Promise<void> {
  try {
    await bucket.file(fileName).delete();
  } catch (error) {
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a signed URL for a file (for private access)
 */
export async function getSignedUrl(
  fileName: string,
  action: 'read' | 'write' = 'read',
  expires: Date = new Date(Date.now() + 60 * 60 * 1000) // 1 hour default
): Promise<string> {
  try {
    const [url] = await bucket.file(fileName).getSignedUrl({
      action,
      expires,
    });
    return url;
  } catch (error) {
    throw new Error(`Failed to get signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List files in a directory (prefix)
 */
export async function listFiles(prefix: string): Promise<string[]> {
  try {
    const [files] = await bucket.getFiles({ prefix });
    return files.map(file => file.name);
  } catch (error) {
    throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(fileName: string): Promise<boolean> {
  try {
    const [exists] = await bucket.file(fileName).exists();
    return exists;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileName: string) {
  try {
    const [metadata] = await bucket.file(fileName).getMetadata();
    return metadata;
  } catch (error) {
    throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate storage path for catalog/library structure
 */
export function generateStoragePath(catalogId: string, libraryId: string, fileName: string): string {
  // Clean filename to prevent path issues
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `catalogs/${catalogId}/${libraryId}/${cleanFileName}`;
}

/**
 * Test GCS connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await bucket.getMetadata();
    return true;
  } catch (error) {
    console.error('GCS connection test failed:', error);
    return false;
  }
} 