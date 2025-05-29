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
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  GripVertical,
  Info,
  ArrowDown,
  ArrowUp
} from 'lucide-react';

type PromptType = 'boolean' | 'descriptive' | 'keywords';

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  type: PromptType;
}

interface PipelineStage {
  id?: string;
  prompt_id: string;
  stage_order: number;
  filter_condition?: string;
  prompt?: Prompt; // For display purposes
}

interface PipelineFormData {
  name: string;
  description: string;
  library_id: string;
  stages: PipelineStage[];
}

interface PipelineFormProps {
  initialData?: {
    id: string;
    name: string;
    description: string;
    library_id: string;
    stages: PipelineStage[];
  };
  onSubmit: (data: PipelineFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  availableLibraries?: { id: string; name: string }[];
}

export function PipelineForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel = 'Create Pipeline',
  isLoading = false,
  availableLibraries = []
}: PipelineFormProps) {
  const [formData, setFormData] = useState<PipelineFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    library_id: initialData?.library_id || '',
    stages: initialData?.stages || []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<Prompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  useEffect(() => {
    setIsDirty(
      formData.name !== (initialData?.name || '') ||
      formData.description !== (initialData?.description || '') ||
      formData.library_id !== (initialData?.library_id || '') ||
      JSON.stringify(formData.stages) !== JSON.stringify(initialData?.stages || [])
    );
  }, [formData, initialData]);

  useEffect(() => {
    fetchAvailablePrompts();
  }, []);

  // Debug logging for available libraries
  useEffect(() => {
    console.log('PipelineForm received availableLibraries:', availableLibraries);
  }, [availableLibraries]);

  const fetchAvailablePrompts = async () => {
    try {
      setLoadingPrompts(true);
      const response = await fetch('/api/prompts?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAvailablePrompts(data.prompts || []);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Pipeline name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    if (!formData.library_id) {
      newErrors.library_id = 'Library selection is required';
    }

    if (formData.stages.length === 0) {
      newErrors.stages = 'At least one stage is required';
    }

    // Validate each stage
    formData.stages.forEach((stage, index) => {
      if (!stage.prompt_id) {
        newErrors[`stage_${index}_prompt`] = 'Prompt selection is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Ensure stage orders are sequential
      const stagesWithOrder = formData.stages.map((stage, index) => ({
        ...stage,
        stage_order: index + 1
      }));

      await onSubmit({
        ...formData,
        stages: stagesWithOrder
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const addStage = () => {
    const newStage: PipelineStage = {
      prompt_id: '',
      stage_order: formData.stages.length + 1,
      filter_condition: ''
    };
    setFormData(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
  };

  const removeStage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index)
    }));
  };

  const updateStage = (index: number, updates: Partial<PipelineStage>) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.map((stage, i) => 
        i === index ? { ...stage, ...updates } : stage
      )
    }));
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.stages.length) return;

    setFormData(prev => {
      const newStages = [...prev.stages];
      [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
      return { ...prev, stages: newStages };
    });
  };

  const getPromptById = (promptId: string): Prompt | undefined => {
    return availablePrompts.find(p => p.id === promptId);
  };

  const getPromptTypeColor = (type: PromptType) => {
    switch (type) {
      case 'boolean':
        return 'bg-green-100 text-green-800';
      case 'descriptive':
        return 'bg-blue-100 text-blue-800';
      case 'keywords':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Pipeline' : 'Create New Pipeline'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pipeline Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Pipeline Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter pipeline name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
              <p className="text-sm text-gray-600">
                {formData.name.length}/100 characters
              </p>
            </div>

            {/* Library Selection */}
            <div className="space-y-2">
              <Label htmlFor="library">Library *</Label>
              <Select 
                value={formData.library_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, library_id: value }))}
              >
                <SelectTrigger className={errors.library_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select library" />
                </SelectTrigger>
                <SelectContent>
                  {availableLibraries.map((library) => (
                    <SelectItem key={library.id} value={library.id}>
                      {library.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.library_id && (
                <p className="text-sm text-red-600">{errors.library_id}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this pipeline does and when to use it"
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
            <p className="text-sm text-gray-600">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Pipeline Stages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Pipeline Stages *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStage}
                disabled={loadingPrompts}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            </div>

            {errors.stages && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-red-600">
                  {errors.stages}
                </AlertDescription>
              </Alert>
            )}

            {formData.stages.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 mb-4">No stages added yet</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStage}
                    disabled={loadingPrompts}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Stage
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.stages.map((stage, index) => {
                  const selectedPrompt = getPromptById(stage.prompt_id);
                  return (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Stage Order Controls */}
                          <div className="flex flex-col items-center gap-1 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveStage(index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                              <GripVertical className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">{index + 1}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveStage(index, 'down')}
                              disabled={index === formData.stages.length - 1}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Stage Configuration */}
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Stage {index + 1}</h4>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStage(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Prompt Selection */}
                            <div className="space-y-2">
                              <Label>Prompt *</Label>
                              <Select
                                value={stage.prompt_id}
                                onValueChange={(value) => updateStage(index, { prompt_id: value })}
                              >
                                <SelectTrigger className={errors[`stage_${index}_prompt`] ? 'border-red-500' : ''}>
                                  <SelectValue placeholder="Select a prompt" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePrompts.map((prompt) => (
                                    <SelectItem key={prompt.id} value={prompt.id}>
                                      <div className="flex items-center gap-2">
                                        <Badge className={getPromptTypeColor(prompt.type)}>
                                          {prompt.type}
                                        </Badge>
                                        {prompt.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors[`stage_${index}_prompt`] && (
                                <p className="text-sm text-red-600">{errors[`stage_${index}_prompt`]}</p>
                              )}
                            </div>

                            {/* Selected Prompt Preview */}
                            {selectedPrompt && (
                              <Card className="bg-gray-50">
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge className={getPromptTypeColor(selectedPrompt.type)}>
                                        {selectedPrompt.type}
                                      </Badge>
                                      <span className="font-medium">{selectedPrompt.name}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                      {selectedPrompt.prompt}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Filter Condition (for boolean prompts) */}
                            {selectedPrompt?.type === 'boolean' && (
                              <div className="space-y-2">
                                <Label>Filter Condition (Optional)</Label>
                                <Select
                                  value={stage.filter_condition || ''}
                                  onValueChange={(value) => updateStage(index, { filter_condition: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="No filtering" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">No filtering</SelectItem>
                                    <SelectItem value="true">Continue only if true</SelectItem>
                                    <SelectItem value="false">Continue only if false</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">
                                  Filter condition determines which images continue to the next stage
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline Preview */}
          {formData.stages.length > 0 && (
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Pipeline Preview</Label>
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-blue-800">
                      This pipeline will execute {formData.stages.length} stage{formData.stages.length > 1 ? 's' : ''} in sequence:
                    </p>
                    <div className="space-y-2">
                      {formData.stages.map((stage, index) => {
                        const prompt = getPromptById(stage.prompt_id);
                        return (
                          <div key={index} className="flex items-center gap-3 text-sm">
                            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                              {index + 1}
                            </span>
                            <span>{prompt?.name || 'Select a prompt'}</span>
                            {stage.filter_condition && (
                              <Badge variant="outline" className="text-xs">
                                Filter: {stage.filter_condition}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
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