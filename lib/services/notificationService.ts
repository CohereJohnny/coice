import { toast } from 'sonner';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface NotificationData {
  id?: string;
  type: NotificationType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  enableSounds: boolean;
  enableJobProgress: boolean;
  enableJobCompletion: boolean;
  enableJobFailure: boolean;
  enableSystemNotifications: boolean;
  autoHideDelay: number; // milliseconds
  groupSimilarNotifications: boolean;
}

// Event types for notification service
export type NotificationEventType = 'notification-created' | 'notification-dismissed' | 'preferences-updated';

export interface NotificationEvent {
  type: NotificationEventType;
  data: any;
}

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enableSounds: true,
  enableJobProgress: true,
  enableJobCompletion: true,
  enableJobFailure: true,
  enableSystemNotifications: true,
  autoHideDelay: 5000,
  groupSimilarNotifications: true,
};

class NotificationService {
  private preferences: NotificationPreferences;
  private activeNotifications: Map<string, NotificationData> = new Map();
  private eventListeners: Map<NotificationEventType, Set<(data: any) => void>> = new Map();
  
  constructor() {
    this.preferences = this.loadPreferences();
  }

  // Event management
  addEventListener(type: NotificationEventType, listener: (data: any) => void) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);

    // Return cleanup function
    return () => {
      this.eventListeners.get(type)?.delete(listener);
    };
  }

  private emit(type: NotificationEventType, data: any) {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.warn('Error in notification event listener:', error);
        }
      });
    }
  }

  // Load preferences from localStorage
  private loadPreferences(): NotificationPreferences {
    try {
      const stored = localStorage.getItem('notification-preferences');
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }

  // Save preferences to localStorage
  private savePreferences() {
    try {
      localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
      this.emit('preferences-updated', this.preferences);
    } catch (error) {
      console.warn('Failed to save notification preferences:', error);
    }
  }

  // Update preferences
  updatePreferences(updates: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  // Get current preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Show notification with proper typing and options
  show(notification: NotificationData): string {
    const {
      id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      duration = this.preferences.autoHideDelay,
      action,
      data,
    } = notification;

    // Check if similar notification should be grouped
    if (this.preferences.groupSimilarNotifications) {
      const existingKey = this.findSimilarNotification(notification);
      if (existingKey) {
        // Dismiss existing and show updated
        toast.dismiss(existingKey);
        this.activeNotifications.delete(existingKey);
      }
    }

    const options = {
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    };

    let toastId: string;

    switch (type) {
      case 'success':
        toastId = toast.success(title, {
          ...options,
          description,
        }) as string;
        break;
      case 'error':
        toastId = toast.error(title, {
          ...options,
          description,
          duration: duration * 2, // Keep error messages longer
        }) as string;
        break;
      case 'warning':
        toastId = toast.warning(title, {
          ...options,
          description,
        }) as string;
        break;
      case 'info':
        toastId = toast.info(title, {
          ...options,
          description,
        }) as string;
        break;
      case 'loading':
        toastId = toast.loading(title, {
          ...options,
          description,
          duration: Infinity, // Loading toasts don't auto-dismiss
        }) as string;
        break;
      default:
        toastId = toast(title, {
          ...options,
          description,
        }) as string;
    }

    // Store notification data
    const notificationWithId = { ...notification, id: toastId };
    this.activeNotifications.set(toastId, notificationWithId);

    // Emit event for notification center
    this.emit('notification-created', notificationWithId);

    // Play sound if enabled
    if (this.preferences.enableSounds && type !== 'loading') {
      this.playNotificationSound(type);
    }

    return toastId;
  }

  // Dismiss notification
  dismiss(id: string) {
    toast.dismiss(id);
    this.activeNotifications.delete(id);
    this.emit('notification-dismissed', { id });
  }

  // Dismiss all notifications
  dismissAll() {
    toast.dismiss();
    this.activeNotifications.clear();
    this.emit('notification-dismissed', { all: true });
  }

  // Update loading notification
  updateLoading(id: string, notification: Omit<NotificationData, 'type'>) {
    this.dismiss(id);
    return this.show({ ...notification, type: 'loading' });
  }

  // Convert loading to success
  success(loadingId: string, notification: Omit<NotificationData, 'type'>) {
    this.dismiss(loadingId);
    return this.show({ ...notification, type: 'success' });
  }

  // Convert loading to error
  error(loadingId: string, notification: Omit<NotificationData, 'type'>) {
    this.dismiss(loadingId);
    return this.show({ ...notification, type: 'error' });
  }

  // Job-specific notification methods
  jobStarted(jobId: string, pipelineName: string, imageCount: number) {
    if (!this.preferences.enableJobProgress) return '';

    return this.show({
      id: `job-${jobId}`,
      type: 'info',
      title: 'Analysis Started',
      description: `Pipeline "${pipelineName}" is processing ${imageCount} images`,
      duration: 3000,
      action: {
        label: 'View Details',
        onClick: () => window.open(`/analysis/jobs/${jobId}`, '_blank'),
      },
      data: { jobId, pipelineName, imageCount },
    });
  }

  jobProgress(jobId: string, pipelineName: string, progress: number) {
    if (!this.preferences.enableJobProgress) return '';

    // Only show progress notifications at certain milestones
    const milestones = [25, 50, 75];
    if (!milestones.includes(Math.floor(progress))) return '';

    return this.show({
      id: `job-progress-${jobId}-${Math.floor(progress)}`,
      type: 'info',
      title: `Analysis ${Math.floor(progress)}% Complete`,
      description: `Pipeline "${pipelineName}" is ${Math.floor(progress)}% done`,
      duration: 2000,
      data: { jobId, pipelineName, progress },
    });
  }

  jobCompleted(jobId: string, pipelineName: string, resultCount: number) {
    if (!this.preferences.enableJobCompletion) return '';

    // Dismiss any existing job notifications for this job
    this.dismissJobNotifications(jobId);

    return this.show({
      id: `job-complete-${jobId}`,
      type: 'success',
      title: 'Analysis Complete!',
      description: `Pipeline "${pipelineName}" processed ${resultCount} results`,
      duration: 6000,
      action: {
        label: 'View Results',
        onClick: () => window.open(`/analysis/jobs/${jobId}`, '_blank'),
      },
      data: { jobId, pipelineName, resultCount },
    });
  }

  jobFailed(jobId: string, pipelineName: string, error: string) {
    if (!this.preferences.enableJobFailure) return '';

    // Dismiss any existing job notifications for this job
    this.dismissJobNotifications(jobId);

    return this.show({
      id: `job-failed-${jobId}`,
      type: 'error',
      title: 'Analysis Failed',
      description: `Pipeline "${pipelineName}" failed: ${error}`,
      duration: 10000,
      action: {
        label: 'View Details',
        onClick: () => window.open(`/analysis/jobs/${jobId}`, '_blank'),
      },
      data: { jobId, pipelineName, error },
    });
  }

  // Helper methods
  private findSimilarNotification(notification: NotificationData): string | null {
    for (const [id, existing] of this.activeNotifications) {
      // Group job notifications by job ID
      if (notification.data?.jobId && existing.data?.jobId === notification.data.jobId) {
        return id;
      }
      
      // Group similar titles
      if (existing.title === notification.title && existing.type === notification.type) {
        return id;
      }
    }
    return null;
  }

  private dismissJobNotifications(jobId: string) {
    const toRemove: string[] = [];
    for (const [id, notification] of this.activeNotifications) {
      if (notification.data?.jobId === jobId || id.includes(`job-${jobId}`)) {
        this.dismiss(id);
        toRemove.push(id);
      }
    }
  }

  private playNotificationSound(type: NotificationType) {
    if (!this.preferences.enableSounds) return;

    try {
      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different notification types
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 700,
        loading: 0, // No sound for loading
      };

      if (frequencies[type] === 0) return;

      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Silently fail if audio context is not available
    }
  }

  // Get notification history (from active notifications)
  getActiveNotifications(): NotificationData[] {
    return Array.from(this.activeNotifications.values());
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export convenience methods
export const notify = notificationService.show.bind(notificationService);
export const dismissNotification = notificationService.dismiss.bind(notificationService);
export const dismissAllNotifications = notificationService.dismissAll.bind(notificationService); 