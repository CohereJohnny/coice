'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Download,
  Upload,
  Filter,
  Loader2,
  Workflow,
  Star,
  StarOff,
  Users,
  Lock
} from 'lucide-react';
import { PipelineFormData, PromptType } from './types';

interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_public: boolean;
  is_featured: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  creator_name?: string;
  template_data: PipelineFormData;
  tags: string[];
}

interface PipelineTemplatesProps {
  onLoadTemplate: (template: PipelineTemplate) => void;
  onCreateFromTemplate?: (template: PipelineTemplate) => void;
  userRole?: string;
  userId?: string;
}

const templateCategories = [
  'Quality Control',
  'Safety & Compliance', 
  'Content Analysis',
  'Product Classification',
  'Scene Understanding',
  'General Purpose',
  'Custom'
];

export function PipelineTemplates({
  onLoadTemplate,
  onCreateFromTemplate,
  userRole,
  userId
}: PipelineTemplatesProps) {
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration - in real implementation, this would come from API
  const mockTemplates: PipelineTemplate[] = [
    {
      id: '1',
      name: 'Safety Equipment Detection',
      description: 'Detects PPE compliance including hard hats, safety vests, and protective gear',
      category: 'Safety & Compliance',
      is_public: true,
      is_featured: true,
      usage_count: 245,
      created_by: 'system',
      created_at: '2024-01-15T00:00:00Z',
      creator_name: 'System',
      template_data: {
        name: 'Safety Equipment Detection',
        description: 'Multi-stage pipeline for comprehensive PPE detection and compliance checking',
        library_id: '',
        stages: [
          {
            prompt_id: 'safety-detection-boolean',
            stage_order: 1,
            filter_condition: 'true'
          },
          {
            prompt_id: 'ppe-details-descriptive',
            stage_order: 2
          }
        ]
      },
      tags: ['safety', 'ppe', 'compliance', 'detection']
    },
    {
      id: '2',
      name: 'Product Quality Assessment',
      description: 'Comprehensive quality control pipeline for manufacturing and retail',
      category: 'Quality Control',
      is_public: true,
      is_featured: false,
      usage_count: 89,
      created_by: 'user-123',
      created_at: '2024-02-01T00:00:00Z',
      creator_name: 'John Smith',
      template_data: {
        name: 'Product Quality Assessment',
        description: 'Analyzes product defects, condition, and overall quality metrics',
        library_id: '',
        stages: [
          {
            prompt_id: 'defect-detection-boolean',
            stage_order: 1,
            filter_condition: 'true'
          },
          {
            prompt_id: 'quality-keywords',
            stage_order: 2
          },
          {
            prompt_id: 'condition-description',
            stage_order: 3
          }
        ]
      },
      tags: ['quality', 'manufacturing', 'defects', 'assessment']
    }
  ];

  useEffect(() => {
    // In real implementation, fetch from API
    setLoading(true);
    setTimeout(() => {
      setTemplates(mockTemplates);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesPublic = !showPublicOnly || template.is_public;
    const matchesFeatured = !showFeaturedOnly || template.is_featured;

    return matchesSearch && matchesCategory && matchesPublic && matchesFeatured;
  });

  const handleUseTemplate = (template: PipelineTemplate) => {
    onLoadTemplate(template);
  };

  const handleCreateFromTemplate = (template: PipelineTemplate) => {
    if (onCreateFromTemplate) {
      onCreateFromTemplate(template);
    }
  };

  const handleExportTemplate = async (template: PipelineTemplate) => {
    try {
      const dataStr = JSON.stringify(template, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name.replace(/\s+/g, '_')}_template.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting template:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button 
              onClick={() => setError(null)} 
              variant="outline" 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline Templates</h2>
          <p className="text-gray-600">Browse and use pre-built pipeline configurations</p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-full lg:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {templateCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Filters */}
            <div className="flex gap-2">
              <Button
                variant={showFeaturedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              >
                <Star className="w-4 h-4 mr-2" />
                Featured
              </Button>
              <Button
                variant={showPublicOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPublicOnly(!showPublicOnly)}
              >
                <Users className="w-4 h-4 mr-2" />
                Public
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading templates...
            </div>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Workflow className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No templates found matching your criteria.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.is_featured && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {!template.is_public && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <Badge variant="outline" className="mb-2">
                      {template.category}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                        <Workflow className="w-4 h-4 mr-2" />
                        Use Template
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCreateFromTemplate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Create From Template
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportTemplate(template)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {template.description}
                </p>

                {/* Template Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Stages:</span>
                    <span className="font-medium">{template.template_data.stages.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Used:</span>
                    <span className="font-medium">{template.usage_count} times</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium">{formatDate(template.created_at)}</span>
                  </div>
                  {template.creator_name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">By:</span>
                      <span className="font-medium">{template.creator_name}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1"
                    size="sm"
                  >
                    <Workflow className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 