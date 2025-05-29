'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Copy, 
  Edit, 
  Trash2, 
  X, 
  Info,
  Calendar,
  User,
  Library,
  Workflow,
  ArrowDown,
  Play,
  Filter
} from 'lucide-react';
import { Pipeline, PipelineStage, PromptType } from './types';

interface PipelineViewerProps {
  pipeline: Pipeline;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function PipelineViewer({
  pipeline,
  onEdit,
  onDelete,
  onClose,
  canEdit = false,
  canDelete = false
}: PipelineViewerProps) {
  const handleCopyPipeline = async () => {
    try {
      const pipelineData = {
        name: pipeline.name,
        description: pipeline.description,
        stages: pipeline.stages.map(stage => ({
          prompt_id: stage.prompt_id,
          stage_order: stage.stage_order,
          filter_condition: stage.filter_condition,
          prompt_name: stage.prompt?.name
        }))
      };
      await navigator.clipboard.writeText(JSON.stringify(pipelineData, null, 2));
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy pipeline:', error);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilterDescription = (condition?: string) => {
    switch (condition) {
      case 'true':
        return 'Continue only if result is true';
      case 'false':
        return 'Continue only if result is false';
      default:
        return 'No filtering - all images continue';
    }
  };

  const sortedStages = [...pipeline.stages].sort((a, b) => a.stage_order - b.stage_order);

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{pipeline.name}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {formatDate(pipeline.created_at)}
              </div>
              {pipeline.creator_name && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  by {pipeline.creator_name}
                </div>
              )}
              {pipeline.library_name && (
                <div className="flex items-center gap-1">
                  <Library className="w-4 h-4" />
                  {pipeline.library_name}
                </div>
              )}
            </div>
            <p className="text-gray-600">{pipeline.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {canDelete && onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Pipeline Overview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Pipeline Overview</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-blue-700">Total Stages</div>
                  <div className="text-2xl font-bold text-blue-900">{pipeline.stages.length}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-green-700">Filtered Stages</div>
                  <div className="text-2xl font-bold text-green-900">
                    {pipeline.stages.filter(s => s.filter_condition).length}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-purple-700">Prompt Types</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {new Set(pipeline.stages.map(s => s.prompt?.type).filter(Boolean)).size}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pipeline Execution Flow */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Execution Flow</h3>
            <Button variant="outline" size="sm" onClick={handleCopyPipeline}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Configuration
            </Button>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This pipeline will process images through {pipeline.stages.length} stage{pipeline.stages.length > 1 ? 's' : ''} in sequence. 
              Each stage applies an AI prompt to analyze the image, and filtering conditions determine which images continue to the next stage.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {sortedStages.map((stage, index) => (
              <div key={stage.id} className="relative">
                {/* Stage Card */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Stage Number */}
                      <div className="flex flex-col items-center">
                        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-medium text-sm">
                          {stage.stage_order}
                        </div>
                        {index < sortedStages.length - 1 && (
                          <div className="w-px h-8 bg-gray-300 mt-2"></div>
                        )}
                      </div>

                      {/* Stage Content */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-lg">
                            Stage {stage.stage_order}: {stage.prompt?.name || 'Unknown Prompt'}
                          </h4>
                          {stage.prompt?.type && (
                            <Badge className={getPromptTypeColor(stage.prompt.type)}>
                              {stage.prompt.type}
                            </Badge>
                          )}
                        </div>

                        {/* Prompt Details */}
                        {stage.prompt && (
                          <Card className="bg-gray-50">
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700">Prompt:</div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-500 mb-1">AI Model Input:</div>
                                  <div className="text-sm text-gray-800 italic">
                                    &ldquo;{stage.prompt.prompt}&rdquo;
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Expected output: {stage.prompt.type === 'boolean' && 'true or false'}
                                  {stage.prompt.type === 'descriptive' && 'Detailed text description'}
                                  {stage.prompt.type === 'keywords' && 'Comma-separated keywords'}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Filter Condition */}
                        {stage.filter_condition && (
                          <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-orange-600" />
                            <Badge variant="outline" className="text-orange-700 border-orange-300">
                              Filter: {stage.filter_condition}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {getFilterDescription(stage.filter_condition)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Arrow to next stage */}
                {index < sortedStages.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Execution Preview */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Execution Preview</h3>
          <Card className="border-dashed bg-yellow-50">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">How this pipeline works:</span>
                </div>
                <div className="space-y-2 text-sm text-yellow-700">
                  <p>1. Images are processed through each stage in order</p>
                  <p>2. Each stage applies its AI prompt to analyze the image</p>
                  <p>3. Filter conditions determine which images continue to the next stage</p>
                  <p>4. Final results include outputs from all completed stages</p>
                </div>
                {pipeline.stages.some(s => s.filter_condition) && (
                  <Alert className="bg-yellow-100 border-yellow-300">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      This pipeline includes filtering stages. Some images may not complete all stages 
                      depending on the results of boolean prompts.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technical Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Technical Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Pipeline ID</div>
                  <div className="text-sm text-gray-600 font-mono">{pipeline.id}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Library ID</div>
                  <div className="text-sm text-gray-600 font-mono">{pipeline.library_id}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 