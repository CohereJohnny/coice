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
  Type,
  MessageSquare
} from 'lucide-react';

type PromptType = 'boolean' | 'descriptive' | 'keywords';

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  type: PromptType;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

interface PromptViewerProps {
  prompt: Prompt;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const promptTypeDescriptions: Record<PromptType, string> = {
  boolean: 'Returns true/false answers for binary classification tasks',
  descriptive: 'Returns detailed text descriptions for comprehensive analysis',
  keywords: 'Returns comma-separated keywords for tagging and categorization'
};

const promptTypeExamples: Record<PromptType, string> = {
  boolean: 'Expected output: true or false',
  descriptive: 'Expected output: Detailed text description',
  keywords: 'Expected output: keyword1, keyword2, keyword3'
};

export function PromptViewer({
  prompt,
  onEdit,
  onDelete,
  onClose,
  canEdit = false,
  canDelete = false
}: PromptViewerProps) {
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const getTypeColor = (type: PromptType) => {
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

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{prompt.name}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {formatDate(prompt.created_at)}
              </div>
              {prompt.creator_name && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  by {prompt.creator_name}
                </div>
              )}
            </div>
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
        {/* Prompt Type */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Prompt Type</h3>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getTypeColor(prompt.type)}>
              {prompt.type.charAt(0).toUpperCase() + prompt.type.slice(1)}
            </Badge>
            <span className="text-gray-600">
              {promptTypeDescriptions[prompt.type]}
            </span>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {promptTypeExamples[prompt.type]}
            </AlertDescription>
          </Alert>
        </div>

        {/* Prompt Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Prompt Content</h3>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
          
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {prompt.prompt}
              </pre>
            </CardContent>
          </Card>
          
          <div className="text-sm text-gray-600">
            {prompt.prompt.length} characters
          </div>
        </div>

        {/* Usage Preview */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Usage Preview</h3>
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">
                  When this prompt is used in a pipeline:
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-500 mb-1">AI Model Input:</div>
                  <div className="text-sm text-gray-800 italic">
                    &ldquo;{prompt.prompt}&rdquo;
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-500 mb-1">Expected Output Format:</div>
                  <div className="text-sm text-gray-600">
                    {prompt.type === 'boolean' && 'true or false'}
                    {prompt.type === 'descriptive' && 'Detailed text description of the image content'}
                    {prompt.type === 'keywords' && 'keyword1, keyword2, keyword3, ...'}
                  </div>
                </div>
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
                  <div className="text-sm font-medium text-gray-700">Prompt ID</div>
                  <div className="text-sm text-gray-600 font-mono">{prompt.id}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Character Count</div>
                  <div className="text-sm text-gray-600">{prompt.prompt.length} characters</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 