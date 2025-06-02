'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { FeatureFlagManager } from '@/components/admin/FeatureFlagManager';
import { UserTable } from '@/components/admin/UserTable';
import { 
  Users, 
  UserPlus, 
  Shield,
} from 'lucide-react';
import { GroupsPanel } from './GroupsPanel';
import { auditService } from '@/lib/services/auditService';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'end_user';
  display_name?: string;
  created_at: string;
  is_active?: boolean;
  last_login_at?: string;
}

interface AdminPanelProps {
  className?: string;
}

export function AdminPanel({ className }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'feature-flags'>('users');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setUsers(users.filter(u => u.id !== user.id));
      } else {
        console.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (response.ok) {
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, role: newRole as 'admin' | 'manager' | 'end_user' }
            : user
        ));
        
        // Log the role change
        auditService.logUserRoleChanged(userId, user.role, newRole);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleUserUpdate = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, ...updates }
            : user
        ));
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <div className={className}>
      {/* Tabs for Users/Groups */}
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'users' ? 'default' : 'outline'} onClick={() => setActiveTab('users')}>Users</Button>
        <Button variant={activeTab === 'groups' ? 'default' : 'outline'} onClick={() => setActiveTab('groups')}>Groups</Button>
        <Button variant={activeTab === 'feature-flags' ? 'default' : 'outline'} onClick={() => setActiveTab('feature-flags')}>Feature Flags</Button>
      </div>
      {activeTab === 'users' ? (
        <>
          {/* Header with Add User */}
          <div className="flex justify-end mb-6">
            <Button onClick={() => setCreateUserDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Managers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.role === 'manager').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <UserTable
                users={users}
                isLoading={isLoading}
                onUserUpdate={handleUserUpdate}
                onUserDelete={handleDeleteUser}
                onRoleChange={handleRoleChange}
              />
            </CardContent>
          </Card>

          <CreateUserDialog
            open={createUserDialog}
            onOpenChange={setCreateUserDialog}
            onUserCreated={(newUser) => {
              setUsers([newUser as unknown as User, ...users]);
            }}
          />
        </>
      ) : activeTab === 'groups' ? (
        <GroupsPanel />
      ) : (
        <FeatureFlagManager />
      )}
    </div>
  );
} 