'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { validateImage, extractExifMetadata, formatFileSize, type ImageMetadata } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  metadata?: ImageMetadata;
}

interface ImageUploadProps {
  catalogId: string;
  libraryId: string;
  onUploadComplete?: (uploadedImages: any[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export default function ImageUpload({
  catalogId,
  libraryId,
  onUploadComplete,
  maxFiles = 10,
  disabled = false,
}: ImageUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Check file limit
    if (uploadFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newUploadFiles: UploadFile[] = [];

    for (const file of files) {
      const validation = validateImage(file);
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        const metadata = await extractExifMetadata(file);
        newUploadFiles.push({
          file,
          id,
          status: 'pending',
          progress: 0,
          metadata,
        });
      } catch (error) {
        console.error('Metadata extraction failed:', error);
        newUploadFiles.push({
          file,
          id,
          status: 'pending',
          progress: 0,
        });
      }
    }

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  }, [uploadFiles.length, maxFiles]);

  const removeFile = useCallback((id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const uploadSingleFile = async (uploadFile: UploadFile): Promise<any> => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('catalogId', catalogId);
    formData.append('libraryId', libraryId);

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  };

  const startUpload = useCallback(async () => {
    if (uploadFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    const uploadedImages: any[] = [];

    for (const uploadFile of uploadFiles) {
      if (uploadFile.status !== 'pending') continue;

      try {
        // Update status to uploading
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadFiles(prev => 
            prev.map(f => 
              f.id === uploadFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 200);

        const result = await uploadSingleFile(uploadFile);
        
        clearInterval(progressInterval);
        
        // Update to success
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );

        uploadedImages.push(result.image);
        toast.success(`${uploadFile.file.name} uploaded successfully`);

      } catch (error) {
        // Update to error
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  progress: 0,
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : f
          )
        );

        toast.error(`Failed to upload ${uploadFile.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setIsUploading(false);
    
    if (uploadedImages.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedImages);
    }
  }, [uploadFiles, isUploading, catalogId, libraryId, onUploadComplete]);

  const clearCompleted = useCallback(() => {
    setUploadFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading'));
  }, []);

  const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
  const completedFiles = uploadFiles.filter(f => f.status === 'success' || f.status === 'error');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Drop images here or click to browse
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Supports JPEG, PNG, WebP, GIF, BMP, TIFF (max {formatFileSize(50 * 1024 * 1024)})
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Maximum {maxFiles} files
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Queue */}
      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Upload Queue ({uploadFiles.length})</h3>
            <div className="flex gap-2">
              {completedFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                >
                  Clear Completed
                </Button>
              )}
              {pendingFiles.length > 0 && (
                <Button
                  onClick={startUpload}
                  disabled={isUploading}
                  size="sm"
                >
                  {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} Files`}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800"
              >
                <div className="flex-shrink-0">
                  {uploadFile.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : uploadFile.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(uploadFile.file.size)}
                    </span>
                  </div>

                  {uploadFile.metadata && (
                    <p className="text-xs text-gray-500 mb-1">
                      {uploadFile.metadata.width}×{uploadFile.metadata.height}
                      {uploadFile.metadata.exif?.make && ` • ${uploadFile.metadata.exif.make}`}
                    </p>
                  )}

                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="h-1" />
                  )}

                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-500">{uploadFile.error}</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadFile.id)}
                  disabled={uploadFile.status === 'uploading'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 