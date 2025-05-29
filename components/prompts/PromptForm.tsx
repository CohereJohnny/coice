'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, Info } from 'lucide-react';

type PromptType = 'boolean' | 'descriptive' | 'keywords';

interface PromptFormData {
  name: string;
  prompt: string;
  type: PromptType | '';
}

interface PromptFormProps {
  initialData?: {
    id: string;
    name: string;
    prompt: string;
    type: PromptType;
  };
  onSubmit: (data: PromptFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const promptTypeDescriptions: Record<PromptType, string> = {
  boolean: 'Returns true/false answers. Example: "Is there a person in the image?"',
  descriptive: 'Returns detailed text descriptions. Example: "Describe what you see in this image."',
  keywords: 'Returns comma-separated keywords. Example: "List the main objects visible in this image."'
};

const promptTypeExamples: Record<PromptType, { name: string; prompt: string }> = {
  boolean: {
    name: 'Safety Equipment Detection',
    prompt: 'Is the person wearing a hard hat and safety vest? Answer with true if both are visible, false otherwise.'
  },
  descriptive: {
    name: 'Scene Description',
    prompt: 'Provide a detailed description of the scene, including the setting, people, objects, and activities visible in the image.'
  },
  keywords: {
    name: 'Object Detection',
    prompt: 'List the main objects, equipment, and features visible in this image as comma-separated keywords.'
  }
};

export function PromptForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel = 'Create Prompt',
  isLoading = false 
}: PromptFormProps) {
  const [formData, setFormData] = useState<PromptFormData>({
    name: initialData?.name || '',
    prompt: initialData?.prompt || '',
    type: initialData?.type || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(
      formData.name !== (initialData?.name || '') ||
      formData.prompt !== (initialData?.prompt || '') ||
      formData.type !== (initialData?.type || '')
    );
  }, [formData, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (!formData.prompt.trim()) {
      newErrors.prompt = 'Prompt text is required';
    } else if (formData.prompt.length > 2000) {
      newErrors.prompt = 'Prompt must be 2000 characters or less';
    }

    if (!formData.type) {
      newErrors.type = 'Prompt type is required';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleTypeChange = (type: PromptType) => {
    setFormData(prev => ({ ...prev, type }));
    
    // If form is empty, populate with example
    if (!formData.name.trim() && !formData.prompt.trim()) {
      const example = promptTypeExamples[type];
      setFormData(prev => ({
        ...prev,
        type,
        name: example.name,
        prompt: example.prompt
      }));
    }
  };

  const loadExample = () => {
    if (formData.type && isValidType(formData.type)) {
      const example = promptTypeExamples[formData.type];
      setFormData(prev => ({
        ...prev,
        name: example.name,
        prompt: example.prompt
      }));
    }
  };

  const isValidType = (type: string): type is PromptType => {
    return ['boolean', 'descriptive', 'keywords'].includes(type);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Prompt' : 'Create New Prompt'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prompt Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Prompt Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select prompt type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                <SelectItem value="descriptive">Descriptive (Text)</SelectItem>
                <SelectItem value="keywords">Keywords (List)</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type}</p>
            )}
            {formData.type && isValidType(formData.type) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {promptTypeDescriptions[formData.type]}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Prompt Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Prompt Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter a descriptive name for your prompt"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
            <p className="text-sm text-gray-600">
              {formData.name.length}/100 characters
            </p>
          </div>

          {/* Prompt Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">Prompt Text *</Label>
              {formData.type && isValidType(formData.type) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadExample}
                >
                  Load Example
                </Button>
              )}
            </div>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Enter the prompt text that will be sent to the AI model"
              rows={6}
              className={errors.prompt ? 'border-red-500' : ''}
            />
            {errors.prompt && (
              <p className="text-sm text-red-600">{errors.prompt}</p>
            )}
            <p className="text-sm text-gray-600">
              {formData.prompt.length}/2000 characters
            </p>
          </div>

          {/* Preview Section */}
          {formData.type && isValidType(formData.type) && formData.prompt && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Type:</span>
                      <span className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {formData.type}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Prompt:</span>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                        {formData.prompt}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Expected Output:</span>
                      {formData.type === 'boolean' && ' true or false'}
                      {formData.type === 'descriptive' && ' Detailed text description'}
                      {formData.type === 'keywords' && ' Comma-separated keywords'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isDirty}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 