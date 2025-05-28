'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkAuthState = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/debug');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      setDebugInfo({ error: 'Failed to fetch debug info' });
    } finally {
      setLoading(false);
    }
  };

  const forceLogout = async () => {
    setLoading(true);
    try {
      // Clear client storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Call force logout API
      await fetch('/api/auth/debug', { method: 'POST' });
      
      // Redirect to login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Force logout error:', error);
      // Force redirect anyway
      window.location.href = '/auth/login';
    }
  };

  const clearClientStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert('Client storage cleared. Refresh the page.');
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <Button onClick={checkAuthState} disabled={loading}>
          {loading ? 'Checking...' : 'Check Auth State'}
        </Button>
        
        <Button onClick={forceLogout} variant="destructive" disabled={loading}>
          Force Logout & Redirect
        </Button>
        
        <Button onClick={clearClientStorage} variant="outline">
          Clear Client Storage
        </Button>
      </div>

      {debugInfo && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Manual Steps:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click "Check Auth State" to see current session info</li>
          <li>If there are issues, click "Force Logout & Redirect"</li>
          <li>Log back in with your credentials</li>
          <li>Test admin features again</li>
        </ol>
      </div>
    </div>
  );
} 