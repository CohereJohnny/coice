'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PromptManager } from './PromptManager';
import { PipelineManager } from './PipelineManager';
import { Users, Workflow, Settings, HelpCircle, ChevronDown } from 'lucide-react';
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
      description: 'Build multi-stage analysis workflows with templates'
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl">
        {/* Header Section - matching Libraries & Catalogs style */}
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Prompt & Pipeline Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
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

          {/* Tabs - using shadcn/ui Tabs component like Libraries & Catalogs */}
          <Tabs defaultValue="prompts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Prompts
              </TabsTrigger>
              <TabsTrigger value="pipelines" className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Pipelines
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompts">
              <PromptManager
                userRole={userRole}
                userId={userId}
              />
            </TabsContent>

            <TabsContent value="pipelines">
              <PipelineManager
                userRole={userRole}
                userId={userId}
                selectedLibraryId={selectedLibraryId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 