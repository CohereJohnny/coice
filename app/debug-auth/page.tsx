'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth, useAuthActions } from '@/lib/stores/auth';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<{
    syncIssue?: {
      mismatch?: boolean;
      clientHasSession?: boolean;
      serverHasSession?: boolean;
    };
    [key: string]: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const { reset } = useAuthActions();

  const checkAuthState = async () => {
    setLoading(true);
    try {
      // Get client-side auth state
      const supabase = createSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Get server-side auth state
      const response = await fetch('/api/auth/debug');
      const serverData = await response.json();
      
      setDebugInfo({
        client: {
          session: session ? { 
            user: { id: session.user.id, email: session.user.email },
            hasAccessToken: !!session.access_token 
          } : null,
          sessionError: sessionError?.message || null,
          zustandState: {
            user: auth.user ? { id: auth.user.id, email: auth.user.email } : null,
            profile: auth.profile ? { email: auth.profile.email, role: auth.profile.role } : null,
            loading: auth.loading,
            initialized: auth.initialized,
            isAuthenticated: auth.isAuthenticated
          }
        },
        server: serverData,
        syncIssue: {
          clientHasSession: !!session?.user,
          serverHasSession: !!serverData.user,
          mismatch: (!!session?.user) !== (!!serverData.user)
        }
      });
    } catch (error) {
      setDebugInfo({ error: 'Failed to fetch debug info', details: error });
    } finally {
      setLoading(false);
    }
  };

  const forceLogout = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear client storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Reset Zustand store
      reset();
      
      // Call server-side logout
      await fetch('/api/auth/debug', { method: 'POST' });
      
      // Redirect to login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Force logout error:', error);
      // Force redirect anyway
      window.location.href = '/auth/login';
    }
  };

  const fixSyncIssue = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      
      // Force sign out to clear any stale sessions
      await supabase.auth.signOut();
      
      // Clear all client storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Reset auth store
      reset();
      
      // Call server-side logout
      await fetch('/api/auth/debug', { method: 'POST' });
      
      alert('Sync issue fixed! Please refresh the page and log in again.');
      
      // Refresh the page to restart the auth flow
      window.location.reload();
    } catch (error) {
      console.error('Fix sync error:', error);
      alert('Error fixing sync issue. Try manual logout.');
    } finally {
      setLoading(false);
    }
  };

  const clearClientStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    reset();
    alert('Client storage cleared. Refresh the page.');
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>
      
      <div className="space-y-4 mb-6">
        <Button onClick={checkAuthState} disabled={loading}>
          {loading ? 'Checking...' : 'Check Auth State'}
        </Button>
        
        <Button onClick={fixSyncIssue} variant="destructive" disabled={loading}>
          Fix Sync Issue & Restart
        </Button>
        
        <Button onClick={forceLogout} variant="destructive" disabled={loading}>
          Force Logout & Redirect
        </Button>
        
        <Button onClick={clearClientStorage} variant="outline">
          Clear Client Storage
        </Button>
      </div>

      {debugInfo && (
        <div className="space-y-4">
          {debugInfo.syncIssue?.mismatch && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                🚨 Sync Issue Detected!
              </h3>
              <p className="text-red-700 dark:text-red-300">
                Client thinks user is {debugInfo.syncIssue.clientHasSession ? 'logged in' : 'logged out'}, 
                but server thinks user is {debugInfo.syncIssue.serverHasSession ? 'logged in' : 'logged out'}.
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Click &quot;Fix Sync Issue &amp; Restart&quot; to resolve this.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Client State</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(debugInfo.client, null, 2)}
              </pre>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Server State</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(debugInfo.server, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current Zustand Auth State:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify({
            user: auth.user ? { id: auth.user.id, email: auth.user.email } : null,
            profile: auth.profile ? { email: auth.profile.email, role: auth.profile.role } : null,
            loading: auth.loading,
            initialized: auth.initialized,
            isAuthenticated: auth.isAuthenticated,
            isAdmin: auth.isAdmin
          }, null, 2)}
        </pre>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Manual Steps:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click &quot;Check Auth State&quot; to see current session info</li>
          <li>If there&apos;s a sync mismatch, click &quot;Fix Sync Issue &amp; Restart&quot;</li>
          <li>If that doesn&apos;t work, click &quot;Force Logout &amp; Redirect&quot;</li>
          <li>Log back in with your credentials</li>
          <li>Test admin features again</li>
        </ol>
      </div>
    </div>
  );
} 