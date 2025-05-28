'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { GridSize } from './ViewSwitcher';
import ImageErrorBoundary from './ImageErrorBoundary';
import { Checkbox } from '@/components/ui/checkbox';
import { MetadataDisplay } from './MetadataDisplay';
import { formatFileSize } from '@/lib/image-utils';
import { Calendar, HardDrive, Image as ImageIcon } from 'lucide-react';

interface Image {
  id: number;
  gcs_path: string;
  signed_url?: string;
  metadata: {
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
    [key: string]: any;
  };
  created_at: string;
}

interface VirtualizedCardViewProps {
  images: Image[];
  selectedImages: Set<number>;
  onImageSelect: (imageId: number, selected: boolean) => void;
  onImageClick: (image: Image) => void;
  gridSize: GridSize;
  showMetadata: boolean;
  containerWidth: number;
  containerHeight: number;
}

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    images: Image[];
    selectedImages: Set<number>;
    onImageSelect: (imageId: number, selected: boolean) => void;
    onImageClick: (image: Image) => void;
    showMetadata: boolean;
    columnsPerRow: number;
    cardSize: number;
  };
}

const Cell: React.FC<CellProps> = ({ columnIndex, rowIndex, style, data }) => {
  const {
    images,
    selectedImages,
    onImageSelect,
    onImageClick,
    showMetadata,
    columnsPerRow,
    cardSize
  } = data;

  const imageIndex = rowIndex * columnsPerRow + columnIndex;
  const image = images[imageIndex];

  if (!image) {
    return <div style={style} />;
  }

  const isSelected = selectedImages.has(image.id);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelect(image.id, !isSelected);
  };

  const handleClick = () => {
    onImageClick(image);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div style={style} className="p-2">
      <div
        className={`relative group bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${
          isSelected 
            ? 'border-blue-500 shadow-lg' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Image ${image.metadata.original_filename}`}
        style={{ width: cardSize - 16, height: cardSize - 16 }}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onImageSelect(image.id, !!checked)}
            onClick={handleSelect}
            className="bg-white/90 border-gray-300"
          />
        </div>

        {/* Image */}
        <div className="relative w-full h-full overflow-hidden rounded-lg">
          <ImageErrorBoundary>
            <img
              src={image.signed_url || '/placeholder-image.jpg'}
              alt={image.metadata.original_filename}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          </ImageErrorBoundary>

          {/* Metadata Overlay */}
          {showMetadata && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs">
              <div className="space-y-1">
                <div className="font-medium truncate">
                  {image.metadata.original_filename}
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    <span>{image.metadata.width}×{image.metadata.height}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatFileSize(image.metadata.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {image.metadata.make && image.metadata.model && (
                  <div className="text-gray-300 truncate">
                    {image.metadata.make} {image.metadata.model}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function VirtualizedCardView({
  images,
  selectedImages,
  onImageSelect,
  onImageClick,
  gridSize,
  showMetadata,
  containerWidth,
  containerHeight
}: VirtualizedCardViewProps) {
  const gridRef = useRef<Grid>(null);

  // Calculate grid dimensions based on container width and grid size
  const { cardSize, columnsPerRow, rowCount } = useMemo(() => {
    const sizes = {
      small: 200,
      medium: 280,
      large: 360
    };
    
    const cardSize = sizes[gridSize];
    const columnsPerRow = Math.floor(containerWidth / cardSize);
    const rowCount = Math.ceil(images.length / columnsPerRow);
    
    return { cardSize, columnsPerRow, rowCount };
  }, [containerWidth, gridSize, images.length]);

  // Prepare data for the grid
  const gridData = useMemo(() => ({
    images,
    selectedImages,
    onImageSelect,
    onImageClick,
    showMetadata,
    columnsPerRow,
    cardSize
  }), [images, selectedImages, onImageSelect, onImageClick, showMetadata, columnsPerRow, cardSize]);

  // Reset grid when images change
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollToItem({ rowIndex: 0, columnIndex: 0 });
    }
  }, [images]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <ImageIcon className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No images found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Grid
        ref={gridRef}
        columnCount={columnsPerRow}
        columnWidth={cardSize}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={cardSize}
        width={containerWidth}
        itemData={gridData}
        overscanRowCount={2}
        overscanColumnCount={2}
      >
        {Cell}
      </Grid>
    </div>
  );
}

export default VirtualizedCardView; 