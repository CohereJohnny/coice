'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

type TabMode = 'prompts' | 'pipelines';

export function PromptPipelineManager({
  userRole,
  userId,
  userEmail,
  displayName,
  selectedLibraryId
}: PromptPipelineManagerProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('prompts');

  const tabs = [
    {
      id: 'prompts' as TabMode,
      label: 'Prompts',
      icon: Settings,
      description: 'Create and manage AI prompts for image analysis',
      mobileLabel: 'Prompts'
    },
    {
      id: 'pipelines' as TabMode,
      label: 'Pipelines',
      icon: Workflow,
      description: 'Build multi-stage analysis workflows with templates',
      mobileLabel: 'Pipelines'
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'prompts':
        return (
          <PromptManager
            userRole={userRole}
            userId={userId}
          />
        );
      case 'pipelines':
        return (
          <PipelineManager
            userRole={userRole}
            userId={userId}
            selectedLibraryId={selectedLibraryId}
          />
        );
      default:
        return null;
    }
  };

  const currentTab = tabs.find(tab => tab.id === activeTab);

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
                  <DropdownMenuItem onClick={() => setActiveTab('prompts')}>
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

          {/* Tab Navigation - pill style like Libraries & Catalogs */}
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
} 