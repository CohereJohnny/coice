'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PromptManager } from './PromptManager';
import { PipelineManager } from './PipelineManager';
import { PipelineTemplates } from './PipelineTemplates';
import { Users, Workflow, Settings, FileText, HelpCircle, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface PromptPipelineManagerProps {
  userRole: string;
  userId: string;
  userEmail: string;
  displayName: string;
  selectedLibraryId?: string;
}

export function PromptPipelineManager({
  userRole,
  userId,
  userEmail,
  displayName,
  selectedLibraryId
}: PromptPipelineManagerProps) {
  const [activeTab, setActiveTab] = useState('prompts');

  const tabs = [
    {
      value: 'prompts',
      label: 'Prompts',
      icon: Settings,
      description: 'Create and manage AI prompts for image analysis'
    },
    {
      value: 'pipelines',
      label: 'Pipelines',
      icon: Workflow,
      description: 'Build multi-stage analysis workflows'
    },
    {
      value: 'templates',
      label: 'Templates',
      icon: FileText,
      description: 'Use pre-built pipeline templates'
    }
  ];

  const helpItems = [
    {
      title: 'Creating Prompts',
      description: 'Learn how to create effective AI prompts for different analysis types'
    },
    {
      title: 'Building Pipelines',
      description: 'Understand how to chain prompts together for complex workflows'
    },
    {
      title: 'Using Templates',
      description: 'Explore pre-built pipeline templates for common use cases'
    },
    {
      title: 'Role Permissions',
      description: 'Understand what actions are available for your role level'
    }
  ];

  // Handler for when a template is loaded - switch to pipelines tab in create mode
  const handleLoadTemplate = (template: any) => {
    // Create a temporary pipeline data that will be passed to PipelineManager
    const pipelineData = {
      id: '',
      name: template.template_data.name,
      description: template.template_data.description,
      library_id: selectedLibraryId || template.template_data.library_id,
      created_by: userId || '',
      created_at: new Date().toISOString(),
      stages: template.template_data.stages
    };
    
    // Switch to pipelines tab and trigger create mode with template data
    setActiveTab('pipelines');
    // We'll need to pass this data to PipelineManager
  };

  const handleCreateFromTemplate = (template: any) => {
    // Similar to load template but with a modified name
    const pipelineData = {
      id: '',
      name: `${template.template_data.name} (Copy)`,
      description: template.template_data.description,
      library_id: selectedLibraryId || template.template_data.library_id,
      created_by: userId || '',
      created_at: new Date().toISOString(),
      stages: template.template_data.stages
    };
    
    setActiveTab('pipelines');
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl">
        {/* Header Section - matching Libraries & Catalogs style */}
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Prompt & Pipeline Management
              </h1>
              <p className="text-muted-foreground">
                Create and manage AI prompts and multi-stage analysis pipelines
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <Users className="w-4 h-4" />
                  <span>{displayName}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Role: {userRole}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    Quick Access
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Full access to create and manage prompts & pipelines
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabs - now with three main tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Prompts
              </TabsTrigger>
              <TabsTrigger value="pipelines" className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Pipelines
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompts" className="mt-6">
              <PromptManager
                userRole={userRole}
                userId={userId}
              />
            </TabsContent>

            <TabsContent value="pipelines" className="mt-6">
              <PipelineManager
                userRole={userRole}
                userId={userId}
                selectedLibraryId={selectedLibraryId}
                onLoadTemplate={handleLoadTemplate}
                onCreateFromTemplate={handleCreateFromTemplate}
              />
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <PipelineTemplates
                onLoadTemplate={handleLoadTemplate}
                onCreateFromTemplate={handleCreateFromTemplate}
                userRole={userRole}
                userId={userId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 