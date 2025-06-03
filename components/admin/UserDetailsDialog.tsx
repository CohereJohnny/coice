'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Calendar, 
  Clock, 
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
  Search,
  LogOut,
  LogIn,
  Briefcase,
  FileText
} from 'lucide-react';
import { User } from './UserTable';

interface UserDetailsDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserDetails extends User {
  total_images?: number;
  total_jobs?: number;
  total_libraries?: number;
}

interface UserActivity {
  id: string;
  activity_type: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  changes?: Record<string, any>;
  created_at: string;
  performed_by?: {
    email: string;
    display_name?: string;
  };
}

export function UserDetailsDialog({
  userId,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userId && open) {
      fetchUserDetails();
    }
  }, [userId, open]);

  const fetchUserDetails = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch user details
      const userResponse = await fetch(`/api/admin/users/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      // Fetch user activities
      const activitiesResponse = await fetch(`/api/admin/users/${userId}/activities`);
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities || []);
      }

      // Fetch audit logs
      const auditResponse = await fetch(`/api/admin/users/${userId}/audit-logs`);
      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setAuditLogs(auditData.logs || []);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="h-4 w-4 text-green-500" />;
      case 'logout': return <LogOut className="h-4 w-4 text-gray-500" />;
      case 'image_upload': return <Upload className="h-4 w-4 text-blue-500" />;
      case 'job_created': return <Briefcase className="h-4 w-4 text-purple-500" />;
      case 'job_completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'job_failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'search_performed': return <Search className="h-4 w-4 text-indigo-500" />;
      case 'export_ready': return <FileText className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityDescription = (activity: UserActivity) => {
    const metadata = activity.metadata || {};
    
    switch (activity.activity_type) {
      case 'login': return 'Logged in';
      case 'logout': return 'Logged out';
      case 'image_upload': return `Uploaded image: ${metadata.file_name || 'Unknown'}`;
      case 'job_created': return `Created job with ${metadata.pipeline_name || 'Unknown'} pipeline`;
      case 'job_completed': return `Job completed successfully`;
      case 'job_failed': return `Job failed: ${metadata.error || 'Unknown error'}`;
      case 'search_performed': return `Searched for: "${metadata.query || 'Unknown'}" (${metadata.result_count || 0} results)`;
      case 'export_ready': return `Export ready: ${metadata.file_name || 'Unknown'}`;
      default: return activity.activity_type.replace(/_/g, ' ');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'end_user': return 'secondary';
      default: return 'outline';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity History</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-auto">
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* User Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-medium text-gray-600 dark:text-gray-300">
                          {(user.display_name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{user.display_name || 'No name'}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Role</p>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={user.is_active !== false ? 'default' : 'secondary'}>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="text-sm">{formatDate(user.created_at)}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Last Login</p>
                        <p className="text-sm">{user.last_login_at ? formatDate(user.last_login_at) : 'Never'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Usage Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{user.total_images || 0}</p>
                        <p className="text-sm text-muted-foreground">Images Uploaded</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{user.total_jobs || 0}</p>
                        <p className="text-sm text-muted-foreground">Jobs Created</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{user.total_libraries || 0}</p>
                        <p className="text-sm text-muted-foreground">Libraries</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No activity recorded yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{getActivityDescription(activity)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(activity.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="audit" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Audit Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {auditLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No audit logs found
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="border-b pb-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {log.action.replace(/_/g, ' ').charAt(0).toUpperCase() + log.action.slice(1).replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(log.created_at)}
                              </p>
                            </div>
                            {log.performed_by && (
                              <p className="text-xs text-muted-foreground mt-1">
                                By: {log.performed_by.display_name || log.performed_by.email}
                              </p>
                            )}
                            {log.changes && Object.keys(log.changes).length > 0 && (
                              <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
} 