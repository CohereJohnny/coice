-- Create notifications table for persistent storage
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info', 'admin_action', 'user_activity', 'system')),
  title TEXT NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  action_label TEXT,
  action_url TEXT,
  related_entity_type TEXT, -- 'user', 'group', 'catalog', 'job', etc.
  related_entity_id TEXT,
  read BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE NOT read;
CREATE INDEX idx_notifications_type ON notifications(type);

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read/archived)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create notification from audit log
CREATE OR REPLACE FUNCTION create_notification_from_audit()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  notification_title TEXT;
  notification_description TEXT;
BEGIN
  -- Determine notification based on audit action
  CASE NEW.action
    WHEN 'user_created' THEN
      -- Notify the created user
      target_user_id := NEW.entity_id::UUID;
      notification_title := 'Welcome to COICE';
      notification_description := 'Your account has been created. You can now access the system.';
      
    WHEN 'user_role_changed' THEN
      -- Notify the affected user
      target_user_id := NEW.entity_id::UUID;
      notification_title := 'Role Updated';
      notification_description := format('Your role has been updated to %s', 
        COALESCE(NEW.changes->>'new_role', 'Unknown'));
      
    WHEN 'user_disabled' THEN
      -- Notify admins
      notification_title := 'User Account Disabled';
      notification_description := format('User account %s has been disabled', 
        COALESCE(NEW.changes->>'email', 'Unknown'));
      -- This would create notifications for all admins
      INSERT INTO notifications (user_id, type, title, description, related_entity_type, related_entity_id)
      SELECT id, 'admin_action', notification_title, notification_description, 'user', NEW.entity_id
      FROM profiles
      WHERE role = 'admin' AND id != NEW.user_id;
      RETURN NEW;
      
    WHEN 'group_created' THEN
      -- Notify all admins
      notification_title := 'New Group Created';
      notification_description := format('Group "%s" has been created', 
        COALESCE(NEW.changes->>'name', 'Unknown'));
      INSERT INTO notifications (user_id, type, title, description, related_entity_type, related_entity_id)
      SELECT id, 'admin_action', notification_title, notification_description, 'group', NEW.entity_id
      FROM profiles
      WHERE role = 'admin';
      RETURN NEW;
      
    WHEN 'feature_flag_toggled' THEN
      -- Notify all admins
      notification_title := 'Feature Flag Updated';
      notification_description := format('Feature flag "%s" has been %s', 
        COALESCE(NEW.changes->>'flag_name', 'Unknown'),
        CASE WHEN (NEW.changes->>'enabled')::boolean THEN 'enabled' ELSE 'disabled' END);
      INSERT INTO notifications (user_id, type, title, description, related_entity_type, related_entity_id)
      SELECT id, 'admin_action', notification_title, notification_description, 'feature_flag', NEW.entity_id
      FROM profiles
      WHERE role = 'admin';
      RETURN NEW;
      
    ELSE
      -- No notification for other actions
      RETURN NEW;
  END CASE;

  -- Create notification for specific user if target_user_id is set
  IF target_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, 
      type, 
      title, 
      description, 
      related_entity_type, 
      related_entity_id,
      data
    ) VALUES (
      target_user_id,
      'admin_action',
      notification_title,
      notification_description,
      NEW.entity_type,
      NEW.entity_id,
      jsonb_build_object(
        'audit_log_id', NEW.id,
        'performed_by', NEW.user_id,
        'changes', NEW.changes
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications from audit logs
CREATE TRIGGER audit_log_notification_trigger
  AFTER INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_from_audit();

-- Function to create notification from user activity
CREATE OR REPLACE FUNCTION create_notification_from_activity()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_description TEXT;
  should_notify BOOLEAN := false;
BEGIN
  -- Determine if activity should generate a notification
  CASE NEW.activity_type
    WHEN 'job_completed' THEN
      notification_title := 'Job Completed';
      notification_description := format('Your analysis job has completed successfully');
      should_notify := true;
      
    WHEN 'job_failed' THEN
      notification_title := 'Job Failed';
      notification_description := 'Your analysis job encountered an error';
      should_notify := true;
      
    WHEN 'bulk_upload_completed' THEN
      notification_title := 'Bulk Upload Completed';
      notification_description := format('%s images uploaded successfully', 
        COALESCE(NEW.metadata->>'count', '0'));
      should_notify := true;
      
    WHEN 'export_ready' THEN
      notification_title := 'Export Ready';
      notification_description := 'Your data export is ready for download';
      should_notify := true;
      
    ELSE
      -- No notification for other activities
      should_notify := false;
  END CASE;

  -- Create notification if needed
  IF should_notify THEN
    INSERT INTO notifications (
      user_id, 
      type, 
      title, 
      description, 
      data
    ) VALUES (
      NEW.user_id,
      'user_activity',
      notification_title,
      notification_description,
      jsonb_build_object(
        'activity_id', NEW.id,
        'activity_type', NEW.activity_type,
        'metadata', NEW.metadata
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications from user activities
CREATE TRIGGER activity_notification_trigger
  AFTER INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_from_activity();

-- Function to clean up old notifications (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications 
  WHERE read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
  -- Delete all notifications older than 90 days
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create index for real-time subscriptions
CREATE INDEX idx_notifications_realtime ON notifications(user_id, created_at DESC) WHERE NOT read; 