'use client';

import { AuthGuard } from '../components/auth/AuthGuard';
import { PromptPipelineManager } from '@/components/prompts';
import { useAuth } from '@/lib/stores/auth';

export default function PromptsPage() {
  const { user, profile } = useAuth();

  // Check if user has access (managers and admins can create, analysts can view)
  const hasAccess = profile?.role && ['admin', 'manager', 'analyst'].includes(profile.role);

  if (!hasAccess) {
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              You don&apos;t have permission to access prompt and pipeline management.
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <PromptPipelineManager 
        userRole={profile?.role || 'end_user'}
        userId={profile?.id || ''}
        userEmail={profile?.email || ''}
        displayName={profile?.display_name || profile?.email || 'User'}
      />
    </AuthGuard>
  );
} 