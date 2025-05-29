'use client';

import React, { useState } from 'react';
import { PromptForm } from './PromptForm';
import { PromptList } from './PromptList';
import { PromptViewer } from './PromptViewer';

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

interface PromptFormData {
  name: string;
  prompt: string;
  type: PromptType | '';
}

interface PromptManagerProps {
  userRole?: string;
  userId?: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view';

export function PromptManager({ userRole, userId }: PromptManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Permission checks
  const canCreate = userRole === 'admin' || userRole === 'manager';
  const canEdit = (prompt: Prompt) => {
    return userRole === 'admin' || prompt.created_by === userId;
  };
  const canDelete = (prompt: Prompt) => {
    return userRole === 'admin' || prompt.created_by === userId;
  };

  const handleCreateNew = () => {
    setSelectedPrompt(null);
    setViewMode('create');
  };

  const handleEdit = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setViewMode('edit');
  };

  const handleView = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setViewMode('view');
  };

  const handleDelete = async (prompt: Prompt) => {
    if (!window.confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete prompt');
      }

      alert('Prompt deleted successfully');
      setViewMode('list');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: PromptFormData) => {
    try {
      setIsLoading(true);
      
      const url = selectedPrompt 
        ? `/api/prompts/${selectedPrompt.id}`
        : '/api/prompts';
      
      const method = selectedPrompt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${selectedPrompt ? 'update' : 'create'} prompt`);
      }

      const result = await response.json();

      alert(`Prompt ${selectedPrompt ? 'updated' : 'created'} successfully`);
      setViewMode('list');
      setSelectedPrompt(null);
    } catch (error) {
      console.error('Error submitting prompt:', error);
      alert(error instanceof Error ? error.message : 'Failed to save prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedPrompt(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPrompt(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <PromptForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Create Prompt"
            isLoading={isLoading}
          />
        );

      case 'edit':
        return selectedPrompt ? (
          <PromptForm
            initialData={selectedPrompt}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Update Prompt"
            isLoading={isLoading}
          />
        ) : null;

      case 'view':
        return selectedPrompt ? (
          <PromptViewer
            prompt={selectedPrompt}
            onEdit={canEdit(selectedPrompt) ? () => handleEdit(selectedPrompt) : undefined}
            onDelete={canDelete(selectedPrompt) ? () => handleDelete(selectedPrompt) : undefined}
            onClose={handleBackToList}
            canEdit={canEdit(selectedPrompt)}
            canDelete={canDelete(selectedPrompt)}
          />
        ) : null;

      case 'list':
      default:
        return (
          <PromptList
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
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