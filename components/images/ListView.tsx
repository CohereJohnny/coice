'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Download,
  Trash2,
  Eye,
  Calendar,
  FileImage,
  HardDrive,
  ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { animations, microInteractions } from '@/lib/utils/animations';

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
}

interface Image {
  id: number;
  gcs_path: string;
  library_id: number;
  metadata: ImageMetadata;
  created_at: string;
  signedUrls?: {
    original?: string;
    thumbnail?: string;
  };
}

interface ListViewProps {
  images: Image[];
  loading?: boolean;
  selectedImages?: Set<number>;
  onImageSelect?: (imageId: number, selected: boolean) => void;
  onImageDownload?: (image: Image) => void;
  onImageDelete?: (imageId: number) => void;
  onImagePreview?: (image: Image) => void;
  pageSize?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ListView({
  images,
  loading = false,
  selectedImages = new Set(),
  onImageSelect,
  onImageDownload,
  onImageDelete,
  onImagePreview,
  pageSize = 20
}: ListViewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const columns: ColumnDef<Image>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value: boolean) => {
              table.toggleAllPageRowsSelected(!!value);
              // Update parent selection state
              if (onImageSelect) {
                const pageRows = table.getRowModel().rows;
                pageRows.forEach(row => {
                  onImageSelect(row.original.id, !!value);
                });
              }
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: boolean) => {
              row.toggleSelected(!!value);
              onImageSelect?.(row.original.id, !!value);
            }}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'thumbnail',
        header: 'Preview',
        cell: ({ row }) => {
          const image = row.original;
          const imageUrl = image.signedUrls?.thumbnail || image.signedUrls?.original;
          
          return (
            <div className="w-12 h-12 border rounded overflow-hidden bg-muted flex-shrink-0">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={image.metadata.original_filename || 'Image'}
                  width={48}
                  height={48}
                  className={`object-cover cursor-pointer ${microInteractions.image.thumbnail}`}
                  onClick={() => onImagePreview?.(image)}
                  priority={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 60,
      },
      {
        accessorKey: 'metadata.original_filename',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Filename
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const filename = row.original.metadata.original_filename || 'Unknown';
          return (
            <div className="font-medium truncate max-w-xs" title={filename}>
              {filename}
            </div>
          );
        },
      },
      {
        accessorKey: 'metadata.file_size',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Size
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const size = row.original.metadata.file_size;
          return (
            <div className="text-sm text-muted-foreground">
              {size ? formatFileSize(size) : 'Unknown'}
            </div>
          );
        },
      },
      {
        id: 'dimensions',
        header: 'Dimensions',
        accessorFn: (row) => `${row.metadata.width}x${row.metadata.height}`,
        cell: ({ row }) => {
          const { width, height } = row.original.metadata;
          return (
            <div className="text-sm text-muted-foreground">
              {width && height ? `${width}×${height}` : 'Unknown'}
            </div>
          );
        },
      },
      {
        accessorKey: 'metadata.mime_type',
        header: 'Type',
        cell: ({ row }) => {
          const mimeType = row.original.metadata.mime_type;
          const format = mimeType?.split('/')[1]?.toUpperCase() || 'Unknown';
          return (
            <Badge variant="secondary" className="text-xs">
              {format}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Date Added
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDate(row.original.created_at)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const image = row.original;
          return (
            <div className="flex gap-1">
              {onImageDownload && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onImageDownload(image)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {onImageDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onImageDelete(image.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 80,
      },
    ],
    [onImageSelect, onImageDownload, onImageDelete, onImagePreview]
  );

  // Sync external selection state with table selection
  React.useEffect(() => {
    const newRowSelection: RowSelectionState = {};
    images.forEach((image, index) => {
      if (selectedImages.has(image.id)) {
        newRowSelection[index] = true;
      }
    });
    setRowSelection(newRowSelection);
  }, [selectedImages, images]);

  const handleRowClick = (image: Image, event: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    if ((event.target as HTMLElement).closest('button, input, [role="checkbox"]')) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      onImageSelect?.(image.id, !selectedImages.has(image.id));
    } else if (event.shiftKey && selectedImages.size > 0) {
      // Range select with Shift
      const imageIds = images.map(img => img.id);
      const currentIndex = imageIds.indexOf(image.id);
      const lastSelectedIndex = imageIds.findIndex(id => selectedImages.has(id));
      
      if (lastSelectedIndex !== -1) {
        const start = Math.min(currentIndex, lastSelectedIndex);
        const end = Math.max(currentIndex, lastSelectedIndex);
        
        for (let i = start; i <= end; i++) {
          onImageSelect?.(imageIds[i], true);
        }
      }
    } else {
      // Default: preview image
      if (onImagePreview) {
        onImagePreview(image);
      } else {
        onImageSelect?.(image.id, !selectedImages.has(image.id));
      }
    }
  };

  const table = useReactTable({
    data: images,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="border rounded-lg">
          <div className="h-12 bg-muted animate-pulse" />
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-16 border-t bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No images found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or upload some images</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8 max-w-sm"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value: boolean) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={`cursor-pointer ${microInteractions.card.subtle} ${animations.fadeIn}`}
                  style={{ animationDelay: `${index * 20}ms` }}
                  onClick={(e) => handleRowClick(row.original, e)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 w-[70px] rounded border border-input bg-background px-3 py-1 text-sm"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 