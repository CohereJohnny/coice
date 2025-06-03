import { useState, useMemo, useEffect } from 'react';
import { Bell, X, Search, Filter, Settings, Archive, Trash2, Check, Clock, AlertCircle, Shield, Activity } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { notificationService, NotificationData, NotificationPreferences } from '@/lib/services/notificationService';
import { createSupabaseClient } from '@/lib/supabase';

export interface NotificationHistoryItem extends NotificationData {
  id: string;
  timestamp: Date;
  read: boolean;
  archived: boolean;
  dismissed: boolean;
}

export interface NotificationCenterProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxHeight?: string;
  className?: string;
}

export function NotificationCenter({
  open = false,
  onOpenChange,
  maxHeight = '500px',
  className = '',
}: NotificationCenterProps) {
  // State management
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'success' | 'error' | 'warning' | 'info' | 'admin_action' | 'user_activity' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreferences>(notificationService.getPreferences());
  const [showPreferences, setShowPreferences] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const supabase = createSupabaseClient();

  // Load notifications from database when opened
  useEffect(() => {
    if (open) {
      loadNotificationsFromDatabase();
    }
  }, [open]);

  // Load notifications from database
  const loadNotificationsFromDatabase = async () => {
    setIsLoadingFromDb(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbNotifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load notifications:', error);
        return;
      }

      if (dbNotifications) {
        const formattedNotifications: NotificationHistoryItem[] = dbNotifications.map((n: any) => ({
          id: n.id,
          type: n.type as NotificationData['type'],
          title: n.title,
          description: n.description,
          data: n.data,
          timestamp: new Date(n.created_at),
          read: n.read,
          archived: n.archived,
          dismissed: false,
          action: n.action_label && n.action_url ? {
            label: n.action_label,
            onClick: () => window.location.href = n.action_url,
          } : undefined,
        }));

        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoadingFromDb(false);
    }
  };

  // Subscribe to realtime notifications
  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !open) return;

      channel = supabase
        .channel('notification-center')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            const newNotification = payload.new as any;
            const historyItem: NotificationHistoryItem = {
              id: newNotification.id,
              type: newNotification.type,
              title: newNotification.title,
              description: newNotification.description,
              data: newNotification.data,
              timestamp: new Date(newNotification.created_at),
              read: newNotification.read,
              archived: newNotification.archived,
              dismissed: false,
              action: newNotification.action_label && newNotification.action_url ? {
                label: newNotification.action_label,
                onClick: () => window.location.href = newNotification.action_url,
              } : undefined,
            };
            setNotifications(prev => [historyItem, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            const updated = payload.new as any;
            setNotifications(prev => 
              prev.map(n => n.id === updated.id 
                ? { ...n, read: updated.read, archived: updated.archived }
                : n
              )
            );
          }
        )
        .subscribe();
    };

    if (open) {
      setupRealtimeSubscription();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [open, supabase]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Filter by read status
      if (filter === 'unread' && notification.read) return false;
      if (filter === 'archived' && !notification.archived) return false;

      // Filter by type
      if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = notification.title.toLowerCase().includes(searchLower);
        const descriptionMatch = notification.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descriptionMatch) return false;
      }

      return true;
    });
  }, [notifications, filter, typeFilter, searchTerm]);

  // Notification counts
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
  const totalCount = notifications.length;

  // Actions (updated to sync with database)
  const markAsRead = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      return updated;
    });

    // Update in database
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      return updated;
    });

    // Update in database
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
    }
  };

  const archiveNotification = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, archived: true, read: true } : n);
      return updated;
    });

    // Update in database
    await supabase
      .from('notifications')
      .update({ archived: true, read: true })
      .eq('id', id);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      return updated;
    });

    // Delete from database
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
  };

  const clearAll = async () => {
    const notificationIds = notifications.map(n => n.id);
    
    setNotifications([]);
    
    // Delete from database
    if (notificationIds.length > 0) {
      await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
    }
  };

  // Preference handlers
  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    notificationService.updatePreferences(updates);
  };

  // Get notification icon (updated with new types)
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'admin_action':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'user_activity':
        return <Activity className="h-4 w-4 text-indigo-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 60000) return 'Just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Center Trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onOpenChange?.(!open)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Center Panel */}
      {open && (
        <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Notification Preferences</DialogTitle>
                      <DialogDescription>
                        Customize how and when you receive notifications
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Enable sounds</label>
                        <input
                          type="checkbox"
                          checked={preferences.enableSounds}
                          onChange={(e) => updatePreferences({ enableSounds: e.target.checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Job progress notifications</label>
                        <input
                          type="checkbox"
                          checked={preferences.enableJobProgress}
                          onChange={(e) => updatePreferences({ enableJobProgress: e.target.checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Job completion notifications</label>
                        <input
                          type="checkbox"
                          checked={preferences.enableJobCompletion}
                          onChange={(e) => updatePreferences({ enableJobCompletion: e.target.checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Job failure notifications</label>
                        <input
                          type="checkbox"
                          checked={preferences.enableJobFailure}
                          onChange={(e) => updatePreferences({ enableJobFailure: e.target.checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Group similar notifications</label>
                        <input
                          type="checkbox"
                          checked={preferences.groupSimilarNotifications}
                          onChange={(e) => updatePreferences({ groupSimilarNotifications: e.target.checked })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm">Auto-hide delay (seconds)</label>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={preferences.autoHideDelay / 1000}
                          onChange={(e) => updatePreferences({ 
                            autoHideDelay: Math.max(1000, parseInt(e.target.value) * 1000) 
                          })}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" size="sm" onClick={() => onOpenChange?.(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <CardDescription>
              {totalCount} total, {unreadCount} unread
            </CardDescription>

            {/* Filters and Search */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="archived">Archived</option>
                </select>
                
                <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                  <option value="admin_action">Admin</option>
                  <option value="user_activity">Activity</option>
                  <option value="system">System</option>
                </select>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                
                {totalCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div 
              className="overflow-y-auto"
              style={{ maxHeight }}
            >
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications found</p>
                  {searchTerm && (
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      } ${notification.archived ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </p>
                              {notification.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {notification.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(notification.timestamp)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {notification.type}
                                </Badge>
                                {notification.archived && (
                                  <Badge variant="secondary" className="text-xs">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex-shrink-0 flex items-center space-x-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {!notification.archived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => archiveNotification(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Action button from notification */}
                      {notification.action && (
                        <div className="mt-2 pl-7">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={notification.action.onClick}
                            className="text-xs"
                          >
                            {notification.action.label}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 