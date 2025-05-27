'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Library {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  catalog_id: number;
  children?: Library[];
}

interface Catalog {
  id: number;
  name: string;
}

interface LibraryFormProps {
  initialData?: {
    id?: number;
    name: string;
    description?: string;
    parent_id?: number;
    catalog_id: number;
  };
  catalogs: Catalog[];
  libraries: Library[];
  onSubmit: (data: { 
    name: string; 
    description?: string; 
    catalog_id: number; 
    parent_id?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function LibraryForm({ 
  initialData, 
  catalogs,
  libraries,
  onSubmit, 
  onCancel, 
  isLoading = false, 
  mode 
}: LibraryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    catalog_id: initialData?.catalog_id || (catalogs[0]?.id || 0),
    parent_id: initialData?.parent_id || undefined
  });
  const [errors, setErrors] = useState<{ 
    name?: string; 
    description?: string; 
    catalog_id?: string;
  }>({});

  // Filter libraries for parent selection based on selected catalog
  const availableParents = libraries.filter(lib => 
    lib.catalog_id === formData.catalog_id && 
    lib.id !== initialData?.id // Exclude self when editing
  );

  // Flatten library hierarchy for parent selection
  const flattenLibraries = (libs: Library[]): Library[] => {
    const result: Library[] = [];
    const flatten = (items: Library[], depth = 0) => {
      items.forEach(item => {
        result.push({ ...item, name: '  '.repeat(depth) + item.name });
        if (item.children && item.children.length > 0) {
          flatten(item.children, depth + 1);
        }
      });
    };
    flatten(libs);
    return result;
  };

  const flatParents = flattenLibraries(availableParents);

  const validateForm = () => {
    const newErrors: { name?: string; description?: string; catalog_id?: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Library name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Library name must be at least 2 characters';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Library name must be less than 255 characters';
    }

    if (!formData.catalog_id) {
      newErrors.catalog_id = 'Please select a catalog';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        catalog_id: formData.catalog_id,
        parent_id: formData.parent_id || undefined
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Reset parent selection when catalog changes
  useEffect(() => {
    if (mode === 'create') {
      setFormData(prev => ({ ...prev, parent_id: undefined }));
    }
  }, [formData.catalog_id, mode]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create New Library' : 'Edit Library'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="catalog">Catalog *</Label>
            <select
              id="catalog"
              value={formData.catalog_id}
              onChange={(e) => handleInputChange('catalog_id', parseInt(e.target.value))}
              disabled={isLoading || mode === 'edit'} // Don't allow catalog change when editing
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.catalog_id ? 'border-red-500' : ''}`}
            >
              <option value="">Select a catalog</option>
              {catalogs.map(catalog => (
                <option key={catalog.id} value={catalog.id}>
                  {catalog.name}
                </option>
              ))}
            </select>
            {errors.catalog_id && (
              <p className="text-sm text-red-500">{errors.catalog_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Parent Library (Optional)</Label>
            <select
              id="parent"
              value={formData.parent_id || ''}
              onChange={(e) => handleInputChange('parent_id', e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={isLoading || !formData.catalog_id}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No parent (root level)</option>
              {flatParents.map(library => (
                <option key={library.id} value={library.id}>
                  {library.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Library Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter library name"
              disabled={isLoading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              placeholder="Enter library description (optional)"
              disabled={isLoading}
              rows={3}
              className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.description ? 'border-red-500' : ''}`}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {formData.description.length}/1000 characters
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Library' : 'Update Library'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 