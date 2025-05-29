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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="m-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Welcome, {displayName}</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Role: {userRole}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
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
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex border-b border-gray-200 dark:border-gray-600">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 