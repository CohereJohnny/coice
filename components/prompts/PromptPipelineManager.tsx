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
    <div className="space-y-6">
      {/* User Info & Quick Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-full flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  Welcome, {displayName}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-500">Quick Access</p>
                <p className="text-xs text-gray-400 max-w-48">
                  {userRole === 'admin' || userRole === 'manager' 
                    ? 'Full access to create and manage prompts & pipelines'
                    : 'View and use existing prompts & pipelines'
                  }
                </p>
              </div>
              {/* Help Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <HelpCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Help</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {helpItems.map((item, index) => (
                    <DropdownMenuItem key={index} className="flex-col items-start p-3">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation - Desktop Tabs */}
      <div className="hidden sm:block border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`-ml-0.5 mr-2 h-5 w-5 transition-colors ${
                  isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Navigation - Mobile Dropdown */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                {currentTab && (
                  <>
                    <currentTab.icon className="w-4 h-4" />
                    <span>{currentTab.mobileLabel}</span>
                  </>
                )}
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 p-3"
                >
                  <Icon className="w-4 h-4" />
                  <div>
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tab Description */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
        <p className="text-sm text-gray-600">
          {currentTab?.description}
        </p>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px] transition-opacity duration-200">
        {renderTabContent()}
      </div>
    </div>
  );
} 