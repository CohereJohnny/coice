'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFeatureFlag } from '@/lib/featureFlags';
import { 
  Users, 
  Database, 
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Server,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'end_user';
  display_name?: string;
  created_at: string;
  is_active?: boolean;
  last_login_at?: string;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalImages: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalLibraries: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string;
  diskUsage: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface AdminDashboardProps {
  users: User[];
}

export function AdminDashboard({ users }: AdminDashboardProps) {
  const systemMonitoringEnabled = useFeatureFlag('systemMonitoring');
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalImages: 0,
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalLibraries: 0,
    systemHealth: 'healthy',
    lastBackup: '',
    diskUsage: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchSystemMetrics();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor application metrics and system performance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {formatDateTime(lastRefresh)}
          </div>
          <Button 
            onClick={fetchSystemMetrics} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview - Only show if system monitoring enabled */}
      {systemMonitoringEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getHealthIcon(metrics.systemHealth)}
              System Health
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full ml-2">
                Experimental
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Overall Status</p>
                <p className={`text-lg font-bold capitalize ${getHealthColor(metrics.systemHealth)}`}>
                  {metrics.systemHealth}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">CPU Usage</p>
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metrics.cpuUsage > 80 ? 'bg-red-600' : 
                        metrics.cpuUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${metrics.cpuUsage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{metrics.cpuUsage}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Memory Usage</p>
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metrics.memoryUsage > 80 ? 'bg-red-600' : 
                        metrics.memoryUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${metrics.memoryUsage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{metrics.memoryUsage}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Disk Usage</p>
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metrics.diskUsage > 80 ? 'bg-red-600' : 
                        metrics.diskUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${metrics.diskUsage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{metrics.diskUsage}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Statistics - Always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.is_active !== false).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Libraries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLibraries}</div>
            <p className="text-xs text-muted-foreground">
              Image collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalImages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all libraries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Statistics - Always visible */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              All time processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Information - Only show if system monitoring enabled */}
      {systemMonitoringEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Resources
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full ml-2">
                  Experimental
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">CPU</span>
                </div>
                <span className="text-sm font-medium">{metrics.cpuUsage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Memory</span>
                </div>
                <span className="text-sm font-medium">{metrics.memoryUsage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Disk</span>
                </div>
                <span className="text-sm font-medium">{metrics.diskUsage}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                System Information
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full ml-2">
                  Experimental
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">System Status</span>
                <span className={`text-sm font-medium capitalize ${getHealthColor(metrics.systemHealth)}`}>
                  {metrics.systemHealth}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Backup</span>
                <span className="text-sm font-medium">
                  {metrics.lastBackup || 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium">99.9%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 