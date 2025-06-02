'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Wand2, 
  Download, 
  Trash2, 
  BarChart3,
  Loader2,
  Tags,
  FileText,
  AlertTriangle,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageActionsProps } from './types';

/**
 * ImageActions component provides action buttons and generated content display
 * Focused responsibility: Handle user actions and display generated content
 */
export function ImageActions({
  image,
  loadingStates,
  onGenerateKeywords,
  onGenerateDescription,
  onStartAnalysis,
  onDownload,
  onDelete,
  onFindSimilar,
  generatedContent,
  className
}: ImageActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    
    await onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Image Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI/ML Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              AI Analysis
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={onGenerateKeywords}
                disabled={loadingStates.keywords}
                className="w-full justify-start"
              >
                {loadingStates.keywords ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Tags className="h-4 w-4 mr-2" />
                )}
                Generate Keywords
              </Button>
              
              <Button
                variant="outline"
                onClick={onGenerateDescription}
                disabled={loadingStates.description}
                className="w-full justify-start"
              >
                {loadingStates.description ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate Description
              </Button>
              
              <Button
                variant="outline"
                onClick={onFindSimilar}
                disabled={loadingStates.findSimilar}
                className="w-full justify-start"
              >
                {loadingStates.findSimilar ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Find Similar Images
              </Button>
              
              <Button
                variant="outline"
                onClick={onStartAnalysis}
                disabled={loadingStates.analysis}
                className="w-full justify-start sm:col-span-2"
              >
                {loadingStates.analysis ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Run Analysis Pipeline
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* File Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              File Actions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={onDownload}
                disabled={loadingStates.download}
                className="w-full justify-start"
              >
                {loadingStates.download ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Image
              </Button>
              
              <Button
                variant={showDeleteConfirm ? "destructive" : "outline"}
                onClick={handleDelete}
                disabled={loadingStates.delete}
                className="w-full justify-start"
                onBlur={() => setShowDeleteConfirm(false)}
              >
                {loadingStates.delete ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : showDeleteConfirm ? (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {showDeleteConfirm ? "Confirm Delete" : "Delete Image"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Keywords */}
      {generatedContent?.keywords && generatedContent.keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Generated Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {generatedContent.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Description */}
      {generatedContent?.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generated Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedContent.description}
              readOnly
              className="min-h-[120px] resize-none"
            />
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {generatedContent?.analysisResults && generatedContent.analysisResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedContent.analysisResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">Analysis #{index + 1}</h5>
                    {result.confidence && (
                      <Badge variant="outline">
                        {Math.round(result.confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 