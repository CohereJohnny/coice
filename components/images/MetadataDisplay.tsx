'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Image as ImageIcon, 
  Settings, 
  Info,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import { formatFileSize } from '@/lib/image-utils';
import { toast } from 'sonner';

interface ImageMetadata {
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
  // EXIF data
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  orientation?: number;
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  focalLength?: string;
  focalLengthIn35mm?: number;
  flash?: string;
  whiteBalance?: string;
  meteringMode?: string;
  exposureMode?: string;
  exposureProgram?: string;
  exposureBias?: string;
  colorSpace?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  lensModel?: string;
  artist?: string;
  copyright?: string;
  [key: string]: any;
}

interface MetadataDisplayProps {
  metadata: ImageMetadata;
  variant?: 'tooltip' | 'panel' | 'compact';
  className?: string;
}

interface MetadataItem {
  label: string;
  value: string | number | undefined;
  copyable?: boolean;
  actionable?: boolean;
}

export function MetadataDisplay({ metadata, variant = 'panel', className = '' }: MetadataDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openInMaps = () => {
    if (metadata.gpsLatitude && metadata.gpsLongitude) {
      const url = `https://maps.google.com/?q=${metadata.gpsLatitude},${metadata.gpsLongitude}`;
      window.open(url, '_blank');
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`text-xs text-muted-foreground space-y-1 ${className}`}>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-3 w-3" />
          <span>{metadata.width}×{metadata.height}</span>
          <span>•</span>
          <span>{formatFileSize(metadata.file_size)}</span>
        </div>
        {metadata.make && metadata.model && (
          <div className="flex items-center gap-2">
            <Camera className="h-3 w-3" />
            <span>{metadata.make} {metadata.model}</span>
          </div>
        )}
        {metadata.gpsLatitude && metadata.gpsLongitude && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span>GPS: {metadata.gpsLatitude.toFixed(4)}, {metadata.gpsLongitude.toFixed(4)}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'tooltip') {
    return (
      <div className={`p-3 space-y-2 max-w-sm ${className}`}>
        <div className="font-medium text-sm">{metadata.original_filename}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Size:</span>
            <div>{metadata.width}×{metadata.height}</div>
          </div>
          <div>
            <span className="text-muted-foreground">File Size:</span>
            <div>{formatFileSize(metadata.file_size)}</div>
          </div>
          {metadata.make && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Camera:</span>
              <div>{metadata.make} {metadata.model}</div>
            </div>
          )}
          {metadata.exposureTime && (
            <div>
              <span className="text-muted-foreground">Exposure:</span>
              <div>{metadata.exposureTime}</div>
            </div>
          )}
          {metadata.fNumber && (
            <div>
              <span className="text-muted-foreground">Aperture:</span>
              <div>{metadata.fNumber}</div>
            </div>
          )}
          {metadata.iso && (
            <div>
              <span className="text-muted-foreground">ISO:</span>
              <div>{metadata.iso}</div>
            </div>
          )}
          {metadata.focalLength && (
            <div>
              <span className="text-muted-foreground">Focal Length:</span>
              <div>{metadata.focalLength}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Panel variant (full detailed view)
  const sections: Array<{
    id: string;
    title: string;
    icon: any;
    items: MetadataItem[];
  }> = [
    {
      id: 'basic',
      title: 'Basic Information',
      icon: Info,
      items: [
        { label: 'Filename', value: metadata.original_filename },
        { label: 'File Size', value: formatFileSize(metadata.file_size) },
        { label: 'MIME Type', value: metadata.mime_type },
        { label: 'Dimensions', value: `${metadata.width}×${metadata.height}` },
        { label: 'Format', value: metadata.format },
        { label: 'Upload Date', value: new Date(metadata.upload_date).toLocaleString() },
      ].filter(item => item.value) as MetadataItem[]
    },
    {
      id: 'camera',
      title: 'Camera Information',
      icon: Camera,
      items: [
        { label: 'Make', value: metadata.make },
        { label: 'Model', value: metadata.model },
        { label: 'Software', value: metadata.software },
        { label: 'Lens Model', value: metadata.lensModel },
        { label: 'Date Taken', value: metadata.dateTimeOriginal || metadata.dateTime },
      ].filter(item => item.value) as MetadataItem[]
    },
    {
      id: 'settings',
      title: 'Camera Settings',
      icon: Settings,
      items: [
        { label: 'Exposure Time', value: metadata.exposureTime },
        { label: 'Aperture', value: metadata.fNumber },
        { label: 'ISO', value: metadata.iso },
        { label: 'Focal Length', value: metadata.focalLength },
        { label: 'Focal Length (35mm)', value: metadata.focalLengthIn35mm ? `${metadata.focalLengthIn35mm}mm` : undefined },
        { label: 'Flash', value: metadata.flash },
        { label: 'White Balance', value: metadata.whiteBalance },
        { label: 'Metering Mode', value: metadata.meteringMode },
        { label: 'Exposure Mode', value: metadata.exposureMode },
        { label: 'Exposure Program', value: metadata.exposureProgram },
        { label: 'Exposure Bias', value: metadata.exposureBias },
      ].filter(item => item.value) as MetadataItem[]
    },
    {
      id: 'location',
      title: 'Location Information',
      icon: MapPin,
      items: [
        { 
          label: 'GPS Coordinates', 
          value: metadata.gpsLatitude && metadata.gpsLongitude 
            ? `${metadata.gpsLatitude.toFixed(6)}, ${metadata.gpsLongitude.toFixed(6)}`
            : undefined,
          copyable: true,
          actionable: true
        },
        { label: 'GPS Altitude', value: metadata.gpsAltitude ? `${metadata.gpsAltitude}m` : undefined },
      ].filter(item => item.value) as MetadataItem[]
    },
    {
      id: 'technical',
      title: 'Technical Details',
      icon: ImageIcon,
      items: [
        { label: 'Color Space', value: metadata.colorSpace },
        { label: 'Orientation', value: metadata.orientation },
        { label: 'Artist', value: metadata.artist },
        { label: 'Copyright', value: metadata.copyright },
      ].filter(item => item.value) as MetadataItem[]
    }
  ].filter(section => section.items.length > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Image Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const Icon = section.icon;
          
          return (
            <div key={section.id} className="border rounded-lg">
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{section.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {section.items.length}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {section.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">{item.label}:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{item.value}</span>
                        {item.copyable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(item.value!.toString(), item.label)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {item.actionable && section.id === 'location' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={openInMaps}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default MetadataDisplay; 