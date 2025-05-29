'use client';

import React, { useState, useEffect } from 'react';
import { PipelineForm } from './PipelineForm';
import { PipelineList } from './PipelineList';
import { PipelineViewer } from './PipelineViewer';
import { PipelineTemplates } from './PipelineTemplates';
import { Pipeline, PipelineFormData, PipelineStage } from './types';
import { toast } from 'sonner';

// Types for form data compatibility
interface EditablePipeline {
  id: string;
  name: string;
  description: string;
  library_id: string;
  stages: PipelineStage[];
}

interface PipelineSubmissionData {
  name: string;
  description: string;
  library_id: number;
  stages: any[];
}

interface PipelineManagerProps {
  userRole?: string;
  userId?: string;
  selectedLibraryId?: string;
  onLoadTemplate?: (template: any) => void;
  onCreateFromTemplate?: (template: any) => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view';

export function PipelineManager({ 
  userRole, 
  userId, 
  selectedLibraryId,
  onLoadTemplate,
  onCreateFromTemplate 
}: PipelineManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableLibraries, setAvailableLibraries] = useState<{id: string, name: string}[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Permission checks
  const canCreate = userRole === 'admin' || userRole === 'manager';
  const canEdit = (pipeline: Pipeline) => {
    return userRole === 'admin' || pipeline.created_by === userId;
  };
  const canDelete = (pipeline: Pipeline) => {
    return userRole === 'admin' || pipeline.created_by === userId;
  };

  useEffect(() => {
    if (viewMode === 'create' || viewMode === 'edit') {
      fetchLibraries();
    }
  }, [viewMode]);

  const fetchLibraries = async () => {
    try {
      const response = await fetch('/api/libraries?limit=100&format=flat');
      if (response.ok) {
        const data = await response.json();
        console.log('PipelineManager received libraries:', data);
        // Ensure the data structure matches what PipelineForm expects
        const processedLibraries = (data.libraries || data || []).map((lib: any) => ({
          id: lib.id?.toString() || '',
          name: lib.name || 'Unnamed Library'
        }));
        console.log('PipelineManager processed libraries:', processedLibraries);
        setAvailableLibraries(processedLibraries);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedPipeline(null);
    setViewMode('create');
  };

  // Helper function to convert Pipeline to form-compatible data
  const convertPipelineToFormData = (pipeline: Pipeline | null) => {
    if (!pipeline) return undefined;
    
    return {
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      library_id: pipeline.library_id?.toString() || '',
      stages: pipeline.stages
    };
  };

  const handleEdit = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setViewMode('edit');
  };

  const handleView = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setViewMode('view');
  };

  const handleDelete = async (pipeline: Pipeline) => {
    // Use a promise-based confirmation
    const confirmed = await new Promise<boolean>((resolve) => {
      toast('Are you sure you want to delete this pipeline?', {
        description: `"${pipeline.name}" will be permanently deleted.`,
        action: {
          label: 'Delete',
          onClick: () => resolve(true),
        },
        cancel: {
          label: 'Cancel',
          onClick: () => resolve(false),
        },
      });
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/pipelines/${pipeline.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete pipeline');
      }

      toast.success('Pipeline deleted successfully');
      setViewMode('list');
      const newTrigger = refreshTrigger + 1;
      console.log('PipelineManager: Setting refreshTrigger to:', newTrigger);
      setRefreshTrigger(newTrigger);
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: PipelineSubmissionData) => {
    try {
      setIsLoading(true);
      
      const url = selectedPipeline?.id 
        ? `/api/pipelines/${selectedPipeline.id}`
        : '/api/pipelines';
      
      const method = selectedPipeline?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${selectedPipeline?.id ? 'update' : 'create'} pipeline`);
      }

      const result = await response.json();

      toast.success(`Pipeline ${selectedPipeline?.id ? 'updated' : 'created'} successfully`);
      setViewMode('list');
      setSelectedPipeline(null);
      const newTrigger = refreshTrigger + 1;
      console.log('PipelineManager: Setting refreshTrigger after save to:', newTrigger);
      setRefreshTrigger(newTrigger);
    } catch (error) {
      console.error('Error submitting pipeline:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedPipeline(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPipeline(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <PipelineForm
            initialData={convertPipelineToFormData(selectedPipeline)}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel={selectedPipeline?.id ? "Update Pipeline" : "Create Pipeline"}
            isLoading={isLoading}
            availableLibraries={availableLibraries}
          />
        );

      case 'edit':
        return selectedPipeline ? (
          <PipelineForm
            initialData={convertPipelineToFormData(selectedPipeline)}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Update Pipeline"
            isLoading={isLoading}
            availableLibraries={availableLibraries}
          />
        ) : null;

      case 'view':
        return selectedPipeline ? (
          <PipelineViewer
            pipeline={selectedPipeline}
            onEdit={canEdit(selectedPipeline) ? () => handleEdit(selectedPipeline) : undefined}
            onDelete={canDelete(selectedPipeline) ? () => handleDelete(selectedPipeline) : undefined}
            onClose={handleBackToList}
            canEdit={canEdit(selectedPipeline)}
            canDelete={canDelete(selectedPipeline)}
          />
        ) : null;

      case 'list':
      default:
        return (
          <PipelineList
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            selectedLibraryId={selectedLibraryId}
            refreshTrigger={refreshTrigger}
          />
        );
    }
  };

  return (
    <div className="container mx-auto">
      {renderContent()}
    </div>
  );
} 