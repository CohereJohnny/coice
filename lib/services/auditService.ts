import { createSupabaseClient } from '@/lib/supabase';

export interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface UserActivityEntry {
  activity_type: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

class AuditService {
  private supabase = createSupabaseClient();

  // Log an admin action
  async logAdminAction(entry: AuditLogEntry): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Get IP and user agent from browser context
      const ipAddress = entry.ip_address || null;
      const userAgent = entry.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : null);

      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: entry.action,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
          changes: entry.changes || {},
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (error) {
        console.error('Failed to log admin action:', error);
      }
    } catch (error) {
      console.error('Error in logAdminAction:', error);
    }
  }

  // Log a user activity
  async logUserActivity(entry: UserActivityEntry): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Get IP and user agent from browser context
      const ipAddress = entry.ip_address || null;
      const userAgent = entry.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : null);

      const { error } = await this.supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: entry.activity_type,
          metadata: entry.metadata || {},
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (error) {
        console.error('Failed to log user activity:', error);
      }
    } catch (error) {
      console.error('Error in logUserActivity:', error);
    }
  }

  // Specific admin action helpers
  async logUserCreated(userId: string, email: string, role: string) {
    await this.logAdminAction({
      action: 'user_created',
      entity_type: 'user',
      entity_id: userId,
      changes: { email, role },
    });
  }

  async logUserUpdated(userId: string, changes: Record<string, any>) {
    await this.logAdminAction({
      action: 'user_updated',
      entity_type: 'user',
      entity_id: userId,
      changes,
    });
  }

  async logUserRoleChanged(userId: string, oldRole: string, newRole: string) {
    await this.logAdminAction({
      action: 'user_role_changed',
      entity_type: 'user',
      entity_id: userId,
      changes: { old_role: oldRole, new_role: newRole },
    });
  }

  async logUserDisabled(userId: string, email: string) {
    await this.logAdminAction({
      action: 'user_disabled',
      entity_type: 'user',
      entity_id: userId,
      changes: { email, is_active: false },
    });
  }

  async logUserEnabled(userId: string, email: string) {
    await this.logAdminAction({
      action: 'user_enabled',
      entity_type: 'user',
      entity_id: userId,
      changes: { email, is_active: true },
    });
  }

  async logGroupCreated(groupId: string, name: string) {
    await this.logAdminAction({
      action: 'group_created',
      entity_type: 'group',
      entity_id: groupId,
      changes: { name },
    });
  }

  async logGroupUpdated(groupId: string, changes: Record<string, any>) {
    await this.logAdminAction({
      action: 'group_updated',
      entity_type: 'group',
      entity_id: groupId,
      changes,
    });
  }

  async logFeatureFlagToggled(flagId: string, flagName: string, enabled: boolean) {
    await this.logAdminAction({
      action: 'feature_flag_toggled',
      entity_type: 'feature_flag',
      entity_id: flagId,
      changes: { flag_name: flagName, enabled },
    });
  }

  // Specific user activity helpers
  async logLogin() {
    await this.logUserActivity({
      activity_type: 'login',
    });
  }

  async logLogout() {
    await this.logUserActivity({
      activity_type: 'logout',
    });
  }

  async logImageUpload(imageId: string, fileName: string) {
    await this.logUserActivity({
      activity_type: 'image_upload',
      metadata: { image_id: imageId, file_name: fileName },
    });
  }

  async logBulkUploadCompleted(count: number) {
    await this.logUserActivity({
      activity_type: 'bulk_upload_completed',
      metadata: { count },
    });
  }

  async logJobCreated(jobId: string, pipelineName: string) {
    await this.logUserActivity({
      activity_type: 'job_created',
      metadata: { job_id: jobId, pipeline_name: pipelineName },
    });
  }

  async logJobCompleted(jobId: string) {
    await this.logUserActivity({
      activity_type: 'job_completed',
      metadata: { job_id: jobId },
    });
  }

  async logJobFailed(jobId: string, error?: string) {
    await this.logUserActivity({
      activity_type: 'job_failed',
      metadata: { job_id: jobId, error },
    });
  }

  async logExportReady(exportType: string, fileName: string) {
    await this.logUserActivity({
      activity_type: 'export_ready',
      metadata: { export_type: exportType, file_name: fileName },
    });
  }

  async logSearchPerformed(query: string, resultCount: number) {
    await this.logUserActivity({
      activity_type: 'search_performed',
      metadata: { query, result_count: resultCount },
    });
  }
}

// Create singleton instance
export const auditService = new AuditService(); 