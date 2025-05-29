'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MetadataDisplay from '@/components/images/MetadataDisplay';
import { Camera, MapPin, Settings } from 'lucide-react';

// Sample metadata for testing
const sampleMetadata = {
  filename: "IMG_2024_001.jpg",
  original_filename: "Beautiful_Sunset_Beach.jpg",
  file_size: 4567890,
  mime_type: "image/jpeg",
  width: 4032,
  height: 3024,
  format: "JPEG",
  uploaded_by: "john.doe@example.com",
  upload_date: "2024-01-15T14:30:00Z",
  thumbnail: {
    path: "thumbnails/IMG_2024_001_thumb.jpg",
    width: 300,
    height: 225,
    size: 45678
  },
  // EXIF data
  make: "Apple",
  model: "iPhone 15 Pro",
  software: "iOS 17.2.1",
  dateTime: "2024:01:15 14:30:22",
  dateTimeOriginal: "2024:01:15 14:30:22",
  dateTimeDigitized: "2024:01:15 14:30:22",
  orientation: 1,
  exposureTime: "1/250",
  fNumber: "f/2.8",
  iso: 100,
  focalLength: "24mm",
  focalLengthIn35mm: 24,
  flash: "No Flash",
  whiteBalance: "Auto",
  meteringMode: "Pattern",
  exposureMode: "Auto",
  exposureProgram: "Normal program",
  exposureBias: "0 EV",
  colorSpace: "sRGB",
  gpsLatitude: 37.7749,
  gpsLongitude: -122.4194,
  gpsAltitude: 15,
  lensModel: "iPhone 15 Pro back triple camera 6.765mm f/2.8",
  artist: "John Doe",
  copyright: "© 2024 John Doe Photography",
  imageDescription: "Beautiful sunset over the Pacific Ocean from Baker Beach, San Francisco",
  userComment: "Shot during golden hour with natural lighting"
};

const minimalMetadata = {
  filename: "simple_photo.png",
  original_filename: "simple_photo.png",
  file_size: 1234567,
  mime_type: "image/png",
  width: 1920,
  height: 1080,
  format: "PNG",
  uploaded_by: "test@example.com",
  upload_date: "2024-01-10T10:00:00Z"
};

export default function MetadataTestPage() {
  const [selectedVariant, setSelectedVariant] = useState<'tooltip' | 'panel' | 'compact'>('panel');
  const [selectedDataset, setSelectedDataset] = useState<'full' | 'minimal'>('full');

  const currentMetadata = selectedDataset === 'full' ? sampleMetadata : minimalMetadata;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">MetadataDisplay Component Test</h1>
        <p className="text-muted-foreground">
          Test the MetadataDisplay component with different variants and data sets
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Variant:</label>
            <div className="flex gap-2">
              {(['tooltip', 'panel', 'compact'] as const).map((variant) => (
                <Button
                  key={variant}
                  variant={selectedVariant === variant ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedVariant(variant)}
                >
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dataset:</label>
            <div className="flex gap-2">
              {(['full', 'minimal'] as const).map((dataset) => (
                <Button
                  key={dataset}
                  variant={selectedDataset === dataset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDataset(dataset)}
                >
                  {dataset === 'full' ? 'Full EXIF Data' : 'Minimal Data'}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {selectedDataset === 'full' ? 'Rich EXIF' : 'Basic Info'}
            </Badge>
            {selectedDataset === 'full' && 'gpsLatitude' in currentMetadata && typeof (currentMetadata as any).gpsLatitude === 'number' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                GPS Data
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sample Image Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="aspect-video bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-80" />
                  <p className="text-lg font-medium">{currentMetadata.original_filename}</p>
                  <p className="text-sm opacity-80">
                    {currentMetadata.width}×{currentMetadata.height} • {(currentMetadata.file_size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Sample image placeholder for testing metadata display
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Metadata Display - {selectedVariant.charAt(0).toUpperCase() + selectedVariant.slice(1)} Variant
              </h3>
              
              {selectedVariant === 'panel' && (
                <MetadataDisplay 
                  metadata={currentMetadata}
                  variant="panel"
                />
              )}

              {selectedVariant === 'tooltip' && (
                <div className="p-4 border rounded-lg bg-popover">
                  <p className="text-sm text-muted-foreground mb-3">Tooltip variant (normally shown on hover):</p>
                  <MetadataDisplay 
                    metadata={currentMetadata}
                    variant="tooltip"
                  />
                </div>
              )}

              {selectedVariant === 'compact' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Compact variant (for inline display):</p>
                  <div className="p-4 border rounded-lg">
                    <MetadataDisplay 
                      metadata={currentMetadata}
                      variant="compact"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Component Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Panel Variant</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Expandable sections</li>
                <li>• Copy to clipboard</li>
                <li>• GPS map integration</li>
                <li>• Organized categories</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Tooltip Variant</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Compact hover display</li>
                <li>• Key metadata only</li>
                <li>• Quick preview</li>
                <li>• Minimal footprint</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Compact Variant</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Inline summary</li>
                <li>• Essential info only</li>
                <li>• Space efficient</li>
                <li>• List view friendly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">How to Test:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Switch between different variants using the controls above</li>
              <li>Toggle between full EXIF data and minimal data sets</li>
              <li>In panel variant, click section headers to expand/collapse</li>
              <li>Try copying GPS coordinates (if available) using the copy button</li>
              <li>Click the map icon to open GPS location in Google Maps</li>
              <li>Test with both light and dark themes</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Integration Testing:</h4>
            <p className="text-sm text-muted-foreground">
              To test with real images, go to any library page and:
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click on any image to open the metadata dialog</li>
              <li>Select multiple images and click &quot;View Metadata&quot;</li>
              <li>Check that all three variants display correctly</li>
              <li>Verify GPS coordinates work if images have location data</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 