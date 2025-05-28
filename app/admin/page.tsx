'use client';

import { AuthGuard } from '../components/auth/AuthGuard';
import { AdminPanel } from '@/components/admin/AdminPanel';

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and system settings
          </p>
        </div>
        
        <AdminPanel />
      </div>
    </AuthGuard>
  );
} 