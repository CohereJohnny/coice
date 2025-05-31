'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSingleImageState } from './hooks/useSingleImageState';
import { ImageDisplay } from './ImageDisplay';
import { ImageMetadata } from './ImageMetadata';
import { ImageActions } from './ImageActions';
import { ImageChat } from './ImageChat';
import type { SingleImageViewProps } from './types';

/**
 * SingleImageView - Main component for single image viewing and interaction
 * Orchestrates the image display, metadata, and actions
 * Follows component architecture guidelines for clean separation
 */
export function SingleImageView({ 
  libraryId, 
  imageId, 
  className 
}: SingleImageViewProps) {
  const {
    image,
    error,
    isLoading,
    loadingStates,
    generatedContent,
    refresh,
    generateKeywords,
    generateDescription,
    startAnalysis,
    downloadImage,
    deleteImage,
    goToLibrary,
    goToCarousel
  } = useSingleImageState({ libraryId, imageId });

  // Error state
  if (error && !isLoading) {
    return (
      <div className={cn("", className)}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Failed to load image</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex items-center gap-2 justify-center">
              <Button variant="outline" onClick={goToLibrary}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
              <Button onClick={refresh}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={goToLibrary}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
          
          {/* Breadcrumb */}
          {image?.library && (
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="truncate max-w-32" title={image.library.catalog_id?.toString()}>
                Catalog
              </span>
              <span className="mx-2">›</span>
              <span className="truncate max-w-32" title={image.library.name}>
                {image.library.name}
              </span>
              <span className="mx-2">›</span>
              <span className="font-medium text-foreground truncate max-w-48" title={image.metadata.original_filename}>
                {image.metadata.original_filename}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToCarousel}
            className="flex items-center gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Carousel View
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToLibrary}
            className="flex items-center gap-2"
          >
            <Grid className="h-4 w-4" />
            Grid View
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Image Display (takes 2/3 on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <ImageDisplay
            image={image}
            loading={isLoading}
            error={error}
          />
          
          {/* Chat Interface */}
          {image && (
            <ImageChat image={image} />
          )}
          
          {/* Mobile Metadata (shown below image on small screens) */}
          <div className="lg:hidden">
            {image && (
              <ImageMetadata
                metadata={image.metadata}
                imageInfo={{
                  id: image.id,
                  created_at: image.created_at,
                  library_name: image.library?.name,
                  catalog_name: image.library?.catalog_id?.toString()
                }}
                variant="compact"
              />
            )}
          </div>
        </div>

        {/* Right Column - Metadata and Actions (1/3 on large screens) */}
        <div className="space-y-6">
          {/* Desktop Metadata */}
          <div className="hidden lg:block">
            {image && (
              <ImageMetadata
                metadata={image.metadata}
                imageInfo={{
                  id: image.id,
                  created_at: image.created_at,
                  library_name: image.library?.name,
                  catalog_name: image.library?.catalog_id?.toString()
                }}
                variant="sidebar"
              />
            )}
          </div>
          
          {/* Actions Panel */}
          {image && (
            <ImageActions
              image={image}
              loadingStates={loadingStates}
              onGenerateKeywords={generateKeywords}
              onGenerateDescription={generateDescription}
              onStartAnalysis={startAnalysis}
              onDownload={downloadImage}
              onDelete={deleteImage}
              generatedContent={generatedContent}
            />
          )}
        </div>
      </div>
    </div>
  );
} 