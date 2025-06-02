'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/stores/auth';
import { auditService } from '@/lib/services/auditService';
import { notificationService } from '@/lib/services/notificationService';
import { User } from './UserTable';

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: (user: User) => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: EditUserDialogProps) {
  const { profile: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    role: 'end_user' as 'admin' | 'manager' | 'end_user',
    is_active: true,
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        email: user.email,
        role: user.role,
        is_active: user.is_active !== false,
      });
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.display_name && formData.display_name.length > 100) {
      newErrors.display_name = 'Display name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      // Track what changed for audit logging
      const changes: string[] = [];
      if (formData.email !== user.email) {
        changes.push(`email: ${user.email} → ${formData.email}`);
      }
      if (formData.display_name !== (user.display_name || '')) {
        changes.push(`name: ${user.display_name || 'none'} → ${formData.display_name || 'none'}`);
      }
      if (formData.role !== user.role) {
        changes.push(`role: ${user.role} → ${formData.role}`);
      }
      if (formData.is_active !== (user.is_active !== false)) {
        changes.push(`status: ${user.is_active !== false ? 'active' : 'inactive'} → ${formData.is_active ? 'active' : 'inactive'}`);
      }

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const updatedUser = await response.json();

      // Log the update
      if (changes.length > 0) {
        const changeObject: Record<string, any> = {};
        
        if (formData.email !== user.email) {
          changeObject.email = { from: user.email, to: formData.email };
        }
        if (formData.display_name !== (user.display_name || '')) {
          changeObject.display_name = { from: user.display_name || null, to: formData.display_name || null };
        }
        if (formData.role !== user.role) {
          changeObject.role = { from: user.role, to: formData.role };
        }
        if (formData.is_active !== (user.is_active !== false)) {
          changeObject.is_active = { from: user.is_active !== false, to: formData.is_active };
        }
        
        await auditService.logUserUpdated(user.id, changeObject);
      }

      // Show success notification
      notificationService.show({
        type: 'success',
        title: 'User Updated',
        description: `Successfully updated ${updatedUser.email}`,
      });

      onUserUpdated(updatedUser);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      notificationService.show({
        type: 'error',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update user',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                disabled={loading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="John Doe"
                disabled={loading}
                className={errors.display_name ? 'border-red-500' : ''}
              />
              {errors.display_name && (
                <p className="text-sm text-red-500">{errors.display_name}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                disabled={loading || (currentUser?.id === user.id && formData.role === 'admin')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_user">End User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {currentUser?.id === user.id && formData.role === 'admin' && (
                <p className="text-sm text-muted-foreground">
                  You cannot change your own admin role
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_active: checked as boolean })
                }
                disabled={loading || currentUser?.id === user.id}
              />
              <Label 
                htmlFor="is_active" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Active account
              </Label>
            </div>
            {currentUser?.id === user.id && (
              <p className="text-sm text-muted-foreground -mt-2">
                You cannot deactivate your own account
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 