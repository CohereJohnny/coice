'use client';

import React, { useState, useEffect } from 'react';
import { PipelineForm } from './PipelineForm';
import { PipelineList } from './PipelineList';
import { PipelineViewer } from './PipelineViewer';
import { PipelineTemplates } from './PipelineTemplates';
import { Pipeline, PipelineFormData } from './types';

interface PipelineManagerProps {
  userRole?: string;
  userId?: string;
  selectedLibraryId?: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'templates';

export function PipelineManager({ userRole, userId, selectedLibraryId }: PipelineManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableLibraries, setAvailableLibraries] = useState<{ id: string; name: string }[]>([]);

  // Permission checks
  const canCreate = userRole === 'admin' || userRole === 'manager';
  const canEdit = (pipeline: Pipeline) => {
    return userRole === 'admin' || pipeline.created_by === userId;
  };
  const canDelete = (pipeline: Pipeline) => {
    return userRole === 'admin' || pipeline.created_by === userId;
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      const response = await fetch('/api/libraries?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAvailableLibraries(data.libraries || []);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedPipeline(null);
    setViewMode('create');
  };

  const handleViewTemplates = () => {
    setViewMode('templates');
  };

  const handleLoadTemplate = (template: any) => {
    // Pre-fill form with template data
    setSelectedPipeline({
      id: '',
      name: template.template_data.name,
      description: template.template_data.description,
      library_id: selectedLibraryId || template.template_data.library_id,
      created_by: userId || '',
      created_at: new Date().toISOString(),
      stages: template.template_data.stages
    } as Pipeline);
    setViewMode('create');
  };

  const handleCreateFromTemplate = (template: any) => {
    // Similar to load template but with a modified name
    setSelectedPipeline({
      id: '',
      name: `${template.template_data.name} (Copy)`,
      description: template.template_data.description,
      library_id: selectedLibraryId || template.template_data.library_id,
      created_by: userId || '',
      created_at: new Date().toISOString(),
      stages: template.template_data.stages
    } as Pipeline);
    setViewMode('create');
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
    if (!window.confirm(`Are you sure you want to delete "${pipeline.name}"?`)) {
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

      alert('Pipeline deleted successfully');
      setViewMode('list');
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: PipelineFormData) => {
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

      alert(`Pipeline ${selectedPipeline?.id ? 'updated' : 'created'} successfully`);
      setViewMode('list');
      setSelectedPipeline(null);
    } catch (error) {
      console.error('Error submitting pipeline:', error);
      alert(error instanceof Error ? error.message : 'Failed to save pipeline');
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
            initialData={selectedPipeline || undefined}
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
            initialData={selectedPipeline}
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

      case 'templates':
        return (
          <PipelineTemplates
            onLoadTemplate={handleLoadTemplate}
            onCreateFromTemplate={handleCreateFromTemplate}
            userRole={userRole}
            userId={userId}
          />
        );

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
          />
        );
    }
  };

  // Navigation tabs
  const renderNavigation = () => (
    <div className="flex gap-4 mb-6">
      <button
        onClick={() => setViewMode('list')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          viewMode === 'list' 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Pipelines
      </button>
      <button
        onClick={handleViewTemplates}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          viewMode === 'templates' 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Templates
      </button>
    </div>
  );

  return (
    <div className="container mx-auto py-6">
      {/* Show navigation only for list and templates views */}
      {(['list', 'templates'].includes(viewMode)) && renderNavigation()}
      {renderContent()}
    </div>
  );
} 