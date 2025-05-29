'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Carousel from '@/components/images/Carousel';
import { Play, Eye, Info, Keyboard } from 'lucide-react';

// Sample images for testing
const sampleImages = [
  {
    id: 1,
    gcs_path: 'test/image1.jpg',
    library_id: 1,
    metadata: {
      filename: 'IMG_001.jpg',
      original_filename: 'Beautiful_Sunset_Beach.jpg',
      file_size: 4567890,
      mime_type: 'image/jpeg',
      width: 4032,
      height: 3024,
      format: 'JPEG',
      uploaded_by: 'john.doe@example.com',
      upload_date: '2024-01-15T14:30:00Z',
      thumbnail: {
        path: 'thumbnails/IMG_001_thumb.jpg',
        width: 300,
        height: 225,
        size: 45678
      },
      camera: 'iPhone 15 Pro',
      lens: 'iPhone 15 Pro back triple camera 6.86mm f/1.78',
      focalLength: '6.86mm',
      aperture: 'f/1.78',
      shutterSpeed: '1/120',
      iso: 100,
      flash: 'No Flash',
      gpsLatitude: 37.7749,
      gpsLongitude: -122.4194,
      gpsAltitude: 52.3
    },
    created_at: '2024-01-15T14:30:00Z',
    signedUrls: {
      original: 'https://picsum.photos/4032/3024?random=1',
      thumbnail: 'https://picsum.photos/300/225?random=1'
    }
  },
  {
    id: 2,
    gcs_path: 'test/image2.jpg',
    library_id: 1,
    metadata: {
      filename: 'IMG_002.jpg',
      original_filename: 'Mountain_Landscape.jpg',
      file_size: 6789012,
      mime_type: 'image/jpeg',
      width: 5472,
      height: 3648,
      format: 'JPEG',
      uploaded_by: 'jane.smith@example.com',
      upload_date: '2024-01-16T09:15:00Z',
      thumbnail: {
        path: 'thumbnails/IMG_002_thumb.jpg',
        width: 300,
        height: 200,
        size: 52341
      },
      camera: 'Canon EOS R5',
      lens: 'RF24-70mm F2.8 L IS USM',
      focalLength: '35mm',
      aperture: 'f/8.0',
      shutterSpeed: '1/250',
      iso: 200,
      flash: 'No Flash',
      gpsLatitude: 46.8182,
      gpsLongitude: -121.7645,
      gpsAltitude: 1200.5
    },
    created_at: '2024-01-16T09:15:00Z',
    signedUrls: {
      original: 'https://picsum.photos/5472/3648?random=2',
      thumbnail: 'https://picsum.photos/300/200?random=2'
    }
  },
  {
    id: 3,
    gcs_path: 'test/image3.jpg',
    library_id: 1,
    metadata: {
      filename: 'IMG_003.jpg',
      original_filename: 'City_Night_Lights.jpg',
      file_size: 3456789,
      mime_type: 'image/jpeg',
      width: 3840,
      height: 2160,
      format: 'JPEG',
      uploaded_by: 'mike.wilson@example.com',
      upload_date: '2024-01-17T20:45:00Z',
      thumbnail: {
        path: 'thumbnails/IMG_003_thumb.jpg',
        width: 300,
        height: 169,
        size: 38901
      },
      camera: 'Sony α7R IV',
      lens: 'FE 24-70mm F2.8 GM',
      focalLength: '50mm',
      aperture: 'f/2.8',
      shutterSpeed: '1/60',
      iso: 800,
      flash: 'No Flash'
    },
    created_at: '2024-01-17T20:45:00Z',
    signedUrls: {
      original: 'https://picsum.photos/3840/2160?random=3',
      thumbnail: 'https://picsum.photos/300/169?random=3'
    }
  },
  {
    id: 4,
    gcs_path: 'test/image4.jpg',
    library_id: 1,
    metadata: {
      filename: 'IMG_004.jpg',
      original_filename: 'Wildlife_Portrait.jpg',
      file_size: 8901234,
      mime_type: 'image/jpeg',
      width: 6000,
      height: 4000,
      format: 'JPEG',
      uploaded_by: 'sarah.jones@example.com',
      upload_date: '2024-01-18T11:30:00Z',
      thumbnail: {
        path: 'thumbnails/IMG_004_thumb.jpg',
        width: 300,
        height: 200,
        size: 61234
      },
      camera: 'Nikon D850',
      lens: 'AF-S NIKKOR 200-500mm f/5.6E ED VR',
      focalLength: '500mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/500',
      iso: 400,
      flash: 'No Flash'
    },
    created_at: '2024-01-18T11:30:00Z',
    signedUrls: {
      original: 'https://picsum.photos/6000/4000?random=4',
      thumbnail: 'https://picsum.photos/300/200?random=4'
    }
  },
  {
    id: 5,
    gcs_path: 'test/image5.jpg',
    library_id: 1,
    metadata: {
      filename: 'IMG_005.jpg',
      original_filename: 'Abstract_Architecture.jpg',
      file_size: 2345678,
      mime_type: 'image/jpeg',
      width: 4096,
      height: 4096,
      format: 'JPEG',
      uploaded_by: 'alex.brown@example.com',
      upload_date: '2024-01-19T16:20:00Z',
      thumbnail: {
        path: 'thumbnails/IMG_005_thumb.jpg',
        width: 300,
        height: 300,
        size: 42567
      },
      camera: 'Fujifilm X-T4',
      lens: 'XF16-55mmF2.8 R LM WR',
      focalLength: '23mm',
      aperture: 'f/4.0',
      shutterSpeed: '1/125',
      iso: 160,
      flash: 'No Flash'
    },
    created_at: '2024-01-19T16:20:00Z',
    signedUrls: {
      original: 'https://picsum.photos/4096/4096?random=5',
      thumbnail: 'https://picsum.photos/300/300?random=5'
    }
  }
];

export default function CarouselTestPage() {
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const openCarousel = (index: number) => {
    setCarouselIndex(index);
    setShowCarousel(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Carousel Component Test</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the new Carousel component with full-screen image browsing, navigation controls, 
          keyboard shortcuts, and slideshow functionality.
        </p>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => openCarousel(0)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Open Carousel (First Image)
            </Button>
            
            <Button
              variant="outline"
              onClick={() => openCarousel(2)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Open Carousel (Middle Image)
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setAutoplay(true);
                setShowMetadata(true);
                openCarousel(0);
              }}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Slideshow Mode
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts:
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>← → Navigate images</li>
                <li>Space: Play/Pause slideshow</li>
                <li>I: Toggle metadata overlay</li>
                <li>Home/End: First/Last image</li>
                <li>Esc: Exit carousel</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Features to Test:
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Full-screen image display</li>
                <li>• Navigation arrows and thumbnails</li>
                <li>• Auto-hide controls (3s timeout)</li>
                <li>• Metadata overlay toggle</li>
                <li>• Slideshow with play/pause</li>
                <li>• Fullscreen mode toggle</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Images Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Images</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click any image to open the carousel view
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {sampleImages.map((image, index) => (
              <div
                key={image.id}
                className="group cursor-pointer"
                onClick={() => openCarousel(index)}
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={image.signedUrls.thumbnail}
                    alt={image.metadata.original_filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium truncate">
                    {image.metadata.original_filename}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {image.metadata.width} × {image.metadata.height}
                    </Badge>
                    {image.metadata.camera && (
                      <Badge variant="outline" className="text-xs">
                        {image.metadata.camera}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-green-600 dark:text-green-400">✅ Completed Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Full-screen image display</li>
                <li>• Navigation arrows (prev/next)</li>
                <li>• Thumbnail strip navigation</li>
                <li>• Keyboard navigation (arrows, ESC, space, Home/End, I)</li>
                <li>• Auto-hide controls with mouse detection</li>
                <li>• Metadata overlay with toggle</li>
                <li>• Slideshow mode with play/pause</li>
                <li>• Fullscreen toggle</li>
                <li>• Integration with LibraryDetailClient</li>
                <li>• Error boundary integration</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-orange-600 dark:text-orange-400">🚧 Next Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Touch/swipe gestures for mobile</li>
                <li>• Pinch-to-zoom functionality</li>
                <li>• Image preloading for smooth transitions</li>
                <li>• Virtual scrolling for large sets</li>
                <li>• Slideshow timing controls</li>
                <li>• Progress indicators</li>
                <li>• Deep-linking support</li>
                <li>• Enhanced accessibility (ARIA)</li>
                <li>• Performance optimizations</li>
                <li>• Cross-browser testing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carousel Component */}
      <Carousel
        images={sampleImages}
        initialIndex={carouselIndex}
        isOpen={showCarousel}
        onClose={() => {
          setShowCarousel(false);
          setAutoplay(false);
          setShowMetadata(false);
        }}
        showMetadata={showMetadata}
        autoplay={autoplay}
        autoplayDelay={3000}
      />
    </div>
  );
} 