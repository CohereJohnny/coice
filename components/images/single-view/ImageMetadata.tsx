'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Info, 
  Calendar, 
  User, 
  FileImage, 
  Ruler, 
  HardDrive,
  Camera,
  Hash
} from 'lucide-react';
import type { ImageMetadataProps } from './types';

/**
 * ImageMetadata component displays comprehensive image metadata
 * Focused responsibility: Present metadata in organized, readable format
 */
export function ImageMetadata({ 
  metadata, 
  imageInfo,
  variant = 'panel',
  className 
}: ImageMetadataProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const MetadataRow = ({ 
    icon: Icon, 
    label, 
    value, 
    badge = false 
  }: { 
    icon: React.ComponentType<{ className?: string }>;
    label: string; 
    value: string | number | undefined | null; 
    badge?: boolean;
  }) => {
    if (!value) return null;
    
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <div className="text-sm font-medium">
          {badge ? (
            <Badge variant="secondary">{value}</Badge>
          ) : (
            <span>{value}</span>
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div className="space-y-4">
      {/* Basic File Information */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <FileImage className="h-4 w-4" />
          File Information
        </h4>
        <div className="space-y-1">
          <MetadataRow
            icon={Hash}
            label="File Name"
            value={metadata.original_filename}
          />
          <MetadataRow
            icon={FileImage}
            label="File Type"
            value={metadata.mime_type}
            badge
          />
          <MetadataRow
            icon={HardDrive}
            label="File Size"
            value={formatFileSize(metadata.file_size)}
          />
          {metadata.format && (
            <MetadataRow
              icon={Camera}
              label="Format"
              value={metadata.format.toUpperCase()}
              badge
            />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Image Dimensions */}
      {(metadata.width || metadata.height) && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Dimensions
          </h4>
          <div className="space-y-1">
            {metadata.width && metadata.height && (
              <MetadataRow
                icon={Ruler}
                label="Resolution"
                value={`${metadata.width} × ${metadata.height} pixels`}
              />
            )}
            {metadata.width && metadata.height && (
              <MetadataRow
                icon={Ruler}
                label="Aspect Ratio"
                value={`${(metadata.width / metadata.height).toFixed(2)}:1`}
              />
            )}
            {metadata.density && (
              <MetadataRow
                icon={Camera}
                label="Density"
                value={`${metadata.density} DPI`}
              />
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Upload Information */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upload Details
        </h4>
        <div className="space-y-1">
          <MetadataRow
            icon={Calendar}
            label="Upload Date"
            value={formatDate(metadata.upload_date)}
          />
          <MetadataRow
            icon={User}
            label="Uploaded By"
            value={metadata.uploaded_by}
          />
          {imageInfo?.created_at && (
            <MetadataRow
              icon={Calendar}
              label="Created"
              value={formatDate(imageInfo.created_at)}
            />
          )}
        </div>
      </div>

      {/* Library Context */}
      {(imageInfo?.library_name || imageInfo?.catalog_name) && (
        <>
          {/* Divider */}
          <div className="border-t border-border" />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Location
            </h4>
            <div className="space-y-1">
              {imageInfo.catalog_name && (
                <MetadataRow
                  icon={Info}
                  label="Catalog"
                  value={imageInfo.catalog_name}
                />
              )}
              {imageInfo.library_name && (
                <MetadataRow
                  icon={Info}
                  label="Library"
                  value={imageInfo.library_name}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Technical Details */}
      {(metadata.has_alpha !== undefined || metadata.orientation) && (
        <>
          {/* Divider */}
          <div className="border-t border-border" />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Technical Details
            </h4>
            <div className="space-y-1">
              {metadata.has_alpha !== undefined && (
                <MetadataRow
                  icon={Camera}
                  label="Alpha Channel"
                  value={metadata.has_alpha ? 'Yes' : 'No'}
                  badge
                />
              )}
              {metadata.orientation && (
                <MetadataRow
                  icon={Camera}
                  label="Orientation"
                  value={metadata.orientation}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Thumbnail Information */}
      {metadata.thumbnail && (
        <>
          {/* Divider */}
          <div className="border-t border-border" />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Thumbnail
            </h4>
            <div className="space-y-1">
              <MetadataRow
                icon={Ruler}
                label="Thumbnail Size"
                value={`${metadata.thumbnail.width} × ${metadata.thumbnail.height}`}
              />
              <MetadataRow
                icon={HardDrive}
                label="Thumbnail File Size"
                value={formatFileSize(metadata.thumbnail.size)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Compact variant (for smaller spaces)
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        {content}
      </div>
    );
  }

  // Sidebar variant (for side panels)
  if (variant === 'sidebar') {
    return (
      <div className={cn("", className)}>
        <div className="sticky top-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Image Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {content}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Panel variant (default - full card)
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Image Metadata
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
} 