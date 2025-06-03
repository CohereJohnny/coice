'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Settings, CheckCircle, XCircle, Clock, ToggleLeft, ToggleRight, Search, Beaker, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { auditService } from '@/lib/services/auditService';
import { notificationService } from '@/lib/services/notificationService';

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  created_at: string;
}

export function FeatureFlagManager() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Load feature flags
  const loadFeatureFlags = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/admin/feature-flags');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feature flags');
      }
      
      if (data.success) {
        setFeatureFlags(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch feature flags');
      }
      
    } catch (err) {
      console.error('Error loading feature flags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  // Update a feature flag
  const updateFeatureFlag = async (flagId: string, name: string, enabled: boolean) => {
    try {
      setUpdating(prev => new Set(prev).add(name));
      setError('');
      
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, enabled }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update feature flag');
      }
      
      if (data.success) {
        // Update local state
        setFeatureFlags(prev => 
          prev.map(flag => 
            flag.name === name 
              ? { ...flag, enabled }
              : flag
          )
        );
        
        // Log the change
        await auditService.logFeatureFlagToggled(flagId, name, enabled);
        
        // Show success notification
        notificationService.show({
          type: 'success',
          title: 'Feature Flag Updated',
          description: `${getDisplayName(name)} has been ${enabled ? 'enabled' : 'disabled'}`,
        });
      } else {
        throw new Error(data.error || 'Failed to update feature flag');
      }
      
    } catch (err) {
      console.error('Error updating feature flag:', err);
      setError(err instanceof Error ? err.message : 'Failed to update feature flag');
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });
    }
  };

  // Toggle a feature flag
  const toggleFeatureFlag = (flagId: string, name: string, currentlyEnabled: boolean) => {
    updateFeatureFlag(flagId, name, !currentlyEnabled);
  };

  // Refresh cache
  const refreshCache = async () => {
    try {
      setError('');
      
      const response = await fetch('/api/admin/feature-flags/refresh', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh cache');
      }
      
      if (data.success) {
        await loadFeatureFlags(); // Reload flags after cache refresh
        notificationService.show({
          type: 'success',
          title: 'Cache Refreshed',
          description: 'Feature flag cache has been refreshed across the system',
        });
      } else {
        throw new Error(data.error || 'Failed to refresh cache');
      }
      
    } catch (err) {
      console.error('Error refreshing cache:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh cache');
    }
  };

  // Load feature flags on mount
  useEffect(() => {
    loadFeatureFlags();
  }, []);

  // Get display name from technical name
  const getDisplayName = (name: string): string => {
    const displayNames: Record<string, string> = {
      'job_analytics_dashboard': 'Job Analytics Dashboard',
      'job_comparison_tools': 'Job Comparison Tools',
      'result_validation': 'Result Validation',
      'advanced_pipeline_editor': 'Advanced Pipeline Editor',
      'prompt_versioning': 'Prompt Versioning',
      'real_time_collaboration': 'Real-time Collaboration',
      'real_time_notifications': 'Real-time Notifications',
      'google_oauth': 'Google OAuth',
      'advanced_search': 'Advanced Search',
      'bulk_operations': 'Bulk Operations',
    };
    
    return displayNames[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get status color
  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  // Get status icon
  const getStatusIcon = (enabled: boolean) => {
    return enabled ? CheckCircle : XCircle;
  };

  // Get category for a feature flag
  const getCategory = (name: string): string => {
    const categories: Record<string, string> = {
      'job_analytics_dashboard': 'Job Management',
      'job_comparison_tools': 'Job Management',
      'result_validation': 'Job Management',
      'advanced_pipeline_editor': 'Pipeline Features',
      'prompt_versioning': 'Pipeline Features',
      'real_time_collaboration': 'System Features',
      'real_time_notifications': 'System Features',
      'google_oauth': 'Authentication',
      'advanced_search': 'Search & Discovery',
      'bulk_operations': 'Data Management',
    };
    
    return categories[name] || 'Other';
  };

  // Filter flags based on search term
  const filteredFlags = useMemo(() => {
    if (!searchTerm) return featureFlags;
    
    const term = searchTerm.toLowerCase();
    return featureFlags.filter(flag => 
      flag.name.toLowerCase().includes(term) ||
      flag.description.toLowerCase().includes(term) ||
      getDisplayName(flag.name).toLowerCase().includes(term) ||
      getCategory(flag.name).toLowerCase().includes(term)
    );
  }, [featureFlags, searchTerm]);

  // Group feature flags by category
  const groupedFlags = useMemo(() => {
    const groups: Record<string, FeatureFlag[]> = {};
    
    filteredFlags.forEach(flag => {
      const category = getCategory(flag.name);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(flag);
    });
    
    return groups;
  }, [filteredFlags]);

  // Get stability status for feature
  const getStabilityStatus = (name: string): 'stable' | 'experimental' => {
    const stableFeatures = ['real_time_notifications', 'google_oauth'];
    return stableFeatures.includes(name) ? 'stable' : 'experimental';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Flags
          </CardTitle>
          <CardDescription>
            Manage system feature flags and experimental features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Manage system feature flags and experimental features
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshCache}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Cache
            </Button>
            <Button variant="outline" size="sm" onClick={loadFeatureFlags}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search feature flags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedFlags).map(([category, flags]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                {category}
              </h3>
              {flags.map((flag) => {
                const StatusIcon = getStatusIcon(flag.enabled);
                const isUpdating = updating.has(flag.name);
                const ToggleIcon = flag.enabled ? ToggleRight : ToggleLeft;
                const stability = getStabilityStatus(flag.name);
                const StabilityIcon = stability === 'stable' ? ShieldCheck : Beaker;
                
                return (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusIcon 
                          className={`h-5 w-5 ${flag.enabled ? 'text-green-600' : 'text-gray-400'}`} 
                        />
                        <h3 className="font-medium text-gray-900">
                          {getDisplayName(flag.name)}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={getStatusColor(flag.enabled)}
                        >
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={stability === 'stable' ? 'border-green-500 text-green-700' : 'border-orange-500 text-orange-700'}
                        >
                          <StabilityIcon className="h-3 w-3 mr-1" />
                          {stability === 'stable' ? 'Stable' : 'Experimental'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {flag.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatDistanceToNow(new Date(flag.created_at))} ago
                        </span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {flag.name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      {isUpdating && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeatureFlag(flag.id, flag.name, flag.enabled)}
                        disabled={isUpdating}
                        className={`flex items-center gap-2 px-3 py-2 ${
                          flag.enabled 
                            ? 'text-green-700 hover:text-green-800 hover:bg-green-50' 
                            : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <ToggleIcon 
                          className={`h-5 w-5 ${flag.enabled ? 'text-green-600' : 'text-gray-400'}`} 
                        />
                        <span className="text-sm font-medium">
                          {flag.enabled ? 'Disable' : 'Enable'}
                        </span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {featureFlags.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Feature Flags Found</h3>
            <p>No feature flags are currently configured in the system.</p>
          </div>
        )}

        {featureFlags.length > 0 && Object.keys(groupedFlags).length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No matches found</h3>
            <p>Try adjusting your search terms.</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            About Feature Flags
          </h4>
          <p className="text-sm text-blue-800">
            Feature flags allow you to enable or disable features without deploying new code. 
            Changes take effect immediately but may be cached for up to 5 minutes. 
            Use the &quot;Refresh Cache&quot; button to force immediate updates across the system.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 