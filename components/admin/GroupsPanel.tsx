import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { 
  Trash2, 
  UserPlus, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  X, 
  Edit, 
  Save,
  Shield,
  Library,
  Search,
  UserCheck,
  Settings
} from 'lucide-react';
import { auditService } from '@/lib/services/auditService';
import { notificationService } from '@/lib/services/notificationService';

interface Group {
  id: string;
  name: string;
  created_at: string;
  members: Array<{
    id: string;
    email: string;
    role: string;
    display_name?: string;
  }>;
  catalogs: Array<{
    id: number;
    name: string;
  }>;
  permissions?: {
    can_create_libraries: boolean;
    can_upload_images: boolean;
    can_run_jobs: boolean;
    can_export_data: boolean;
  };
}

interface Catalog {
  id: number;
  name: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  display_name?: string;
  role: string;
}

export function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [selectedCatalogs, setSelectedCatalogs] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    groupId: string | null;
    groupName: string;
  }>({ open: false, groupId: null, groupName: '' });

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      notificationService.show({
        type: 'error',
        title: 'Failed to Load Groups',
        description: 'Could not fetch groups data',
      });
    }
  };

  const fetchCatalogs = async () => {
    try {
      const response = await fetch('/api/admin/catalogs');
      if (response.ok) {
        const data = await response.json();
        setCatalogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch catalogs:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchCatalogs(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: newGroupName.trim() }),
      });
      
      if (response.ok) {
        const newGroup = await response.json();
        await auditService.logGroupCreated(newGroup.id, newGroupName.trim());
        notificationService.show({
          type: 'success',
          title: 'Group Created',
          description: `Successfully created group "${newGroupName.trim()}"`,
        });
        setNewGroupName('');
        await fetchGroups();
      } else {
        throw new Error('Failed to create group');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      notificationService.show({
        type: 'error',
        title: 'Failed to Create Group',
        description: 'Could not create the group',
      });
    }
  };

  const updateGroupName = async (groupId: string) => {
    const newName = editedNames[groupId]?.trim();
    const group = groups.find(g => g.id === groupId);
    
    if (!newName || !group || newName === group.name) {
      setEditingGroup(null);
      return;
    }
    
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, name: newName }),
      });
      
      if (response.ok) {
        await auditService.logGroupUpdated(groupId, { 
          name: { from: group.name, to: newName } 
        });
        notificationService.show({
          type: 'success',
          title: 'Group Updated',
          description: `Group renamed to "${newName}"`,
        });
        setEditingGroup(null);
        await fetchGroups();
      } else {
        throw new Error('Failed to update group');
      }
    } catch (error) {
      console.error('Failed to update group:', error);
      notificationService.show({
        type: 'error',
        title: 'Update Failed',
        description: 'Could not update the group name',
      });
    }
  };

  const addUserToGroup = async (groupId: string) => {
    const userId = selectedUsers[groupId];
    if (!userId) return;
    
    const user = availableUsers.find(u => u.id === userId);
    const group = groups.find(g => g.id === groupId);
    
    if (!user || !group) return;
    
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          group_name: group.name,
          user_email: user.email 
        }),
      });
      
      if (response.ok) {
        await auditService.logGroupUpdated(groupId, {
          member_added: user.email
        });
        notificationService.show({
          type: 'success',
          title: 'User Added',
          description: `Added ${user.email} to ${group.name}`,
        });
        setSelectedUsers(prev => ({ ...prev, [groupId]: '' }));
        await fetchGroups();
      } else {
        throw new Error('Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user to group:', error);
      notificationService.show({
        type: 'error',
        title: 'Failed to Add User',
        description: 'Could not add user to the group',
      });
    }
  };

  const removeUserFromGroup = async (groupId: string, userId: string) => {
    const group = groups.find(g => g.id === groupId);
    const member = group?.members.find(m => m.id === userId);
    
    if (!group || !member) return;
    
    try {
      const response = await fetch('/api/admin/groups/membership', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_id: userId }),
      });
      
      if (response.ok) {
        await auditService.logGroupUpdated(groupId, {
          member_removed: member.email
        });
        notificationService.show({
          type: 'success',
          title: 'User Removed',
          description: `Removed ${member.email} from ${group.name}`,
        });
        await fetchGroups();
      } else {
        throw new Error('Failed to remove user');
      }
    } catch (error) {
      console.error('Failed to remove user from group:', error);
      notificationService.show({
        type: 'error',
        title: 'Failed to Remove User',
        description: 'Could not remove user from the group',
      });
    }
  };

  const assignCatalogToGroup = async (groupId: string) => {
    const catalogId = selectedCatalogs[groupId];
    if (!catalogId) return;
    
    const catalog = catalogs.find(c => c.id.toString() === catalogId);
    const group = groups.find(g => g.id === groupId);
    
    if (!catalog || !group) return;
    
    try {
      const response = await fetch('/api/admin/groups/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, catalog_id: catalogId }),
      });
      
      if (response.ok) {
        await auditService.logGroupUpdated(groupId, {
          catalog_added: catalog.name
        });
        notificationService.show({
          type: 'success',
          title: 'Catalog Assigned',
          description: `Assigned "${catalog.name}" to ${group.name}`,
        });
        setSelectedCatalogs(prev => ({ ...prev, [groupId]: '' }));
        await fetchGroups();
      } else {
        throw new Error('Failed to assign catalog');
      }
    } catch (error) {
      console.error('Failed to assign catalog to group:', error);
      notificationService.show({
        type: 'error',
        title: 'Failed to Assign Catalog',
        description: 'Could not assign catalog to the group',
      });
    }
  };

  const removeCatalogFromGroup = async (groupId: string, catalogId: number) => {
    const group = groups.find(g => g.id === groupId);
    const catalog = group?.catalogs.find(c => c.id === catalogId);
    
    if (!group || !catalog) return;
    
    try {
      const response = await fetch('/api/admin/groups/catalogs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, catalog_id: catalogId }),
      });
      
      if (response.ok) {
        await auditService.logGroupUpdated(groupId, {
          catalog_removed: catalog.name
        });
        notificationService.show({
          type: 'success',
          title: 'Catalog Removed',
          description: `Removed "${catalog.name}" from ${group.name}`,
        });
        await fetchGroups();
      } else {
        throw new Error('Failed to remove catalog');
      }
    } catch (error) {
      console.error('Failed to remove catalog from group:', error);
      notificationService.show({
        type: 'error',
        title: 'Failed to Remove Catalog',
        description: 'Could not remove catalog from the group',
      });
    }
  };

  const deleteGroup = async () => {
    if (!deleteDialog.groupId) return;
    
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: deleteDialog.groupId }),
      });
      
      if (response.ok) {
        await auditService.logAdminAction({
          action: 'group_deleted',
          entity_type: 'group',
          entity_id: deleteDialog.groupId,
          changes: { name: deleteDialog.groupName }
        });
        notificationService.show({
          type: 'success',
          title: 'Group Deleted',
          description: `Successfully deleted group "${deleteDialog.groupName}"`,
        });
        setDeleteDialog({ open: false, groupId: null, groupName: '' });
        await fetchGroups();
      } else {
        throw new Error('Failed to delete group');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      notificationService.show({
        type: 'error',
        title: 'Failed to Delete Group',
        description: 'Could not delete the group',
      });
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getAvailableCatalogs = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const assignedCatalogIds = group?.catalogs.map(c => c.id) || [];
    return catalogs.filter(c => !assignedCatalogIds.includes(c.id));
  };

  const getAvailableUsersForGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const memberIds = group?.members.map(m => m.id) || [];
    return availableUsers.filter(u => !memberIds.includes(u.id));
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.members.some(member => 
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search groups or members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Group */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create New Group
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createGroup()}
            />
            <Button onClick={createGroup} disabled={!newGroupName.trim()}>
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.reduce((acc, group) => acc + group.members.length, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catalog Assignments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.reduce((acc, group) => acc + group.catalogs.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                No groups found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first group.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  {editingGroup === group.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editedNames[group.id] || group.name}
                        onChange={(e) => setEditedNames(prev => ({ ...prev, [group.id]: e.target.value }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') updateGroupName(group.id);
                          if (e.key === 'Escape') setEditingGroup(null);
                        }}
                        className="max-w-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateGroupName(group.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingGroup(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {group.name}
                      <span className="text-sm text-muted-foreground">
                        ({group.members.length} members, {group.catalogs.length} catalogs)
                      </span>
                    </CardTitle>
                  )}
                  <div className="flex items-center gap-2">
                    {editingGroup !== group.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingGroup(group.id);
                          setEditedNames(prev => ({ ...prev, [group.id]: group.name }));
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      {expandedGroups.has(group.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialog({ 
                        open: true, 
                        groupId: group.id, 
                        groupName: group.name 
                      })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedGroups.has(group.id) && (
                <CardContent className="space-y-6">
                  {/* Members Section */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Members
                    </h4>
                    <div className="space-y-2">
                      {group.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {(member.display_name || member.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.display_name || member.email}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                            <Badge variant={member.role === 'admin' ? 'destructive' : member.role === 'manager' ? 'default' : 'secondary'}>
                              {member.role}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUserFromGroup(group.id, member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Select
                          value={selectedUsers[group.id] || ''}
                          onValueChange={(value) => setSelectedUsers(prev => ({ ...prev, [group.id]: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select user to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableUsersForGroup(group.id).map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.display_name || user.email} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={() => addUserToGroup(group.id)}
                          disabled={!selectedUsers[group.id]}
                        >
                          Add User
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Catalogs Section */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Catalog Access
                    </h4>
                    <div className="space-y-2">
                      {group.catalogs.map((catalog) => (
                        <div key={catalog.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="flex items-center gap-2">
                            <Library className="h-4 w-4" />
                            {catalog.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCatalogFromGroup(group.id, catalog.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Select
                          value={selectedCatalogs[group.id] || ''}
                          onValueChange={(value) => setSelectedCatalogs(prev => ({ ...prev, [group.id]: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select catalog to assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableCatalogs(group.id).map((catalog) => (
                              <SelectItem key={catalog.id} value={catalog.id.toString()}>
                                {catalog.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={() => assignCatalogToGroup(group.id)}
                          disabled={!selectedCatalogs[group.id]}
                        >
                          Assign Catalog
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Section */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Group Permissions
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Create Libraries</span>
                        <Badge variant="default">Allowed</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Upload Images</span>
                        <Badge variant="default">Allowed</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Run Analysis Jobs</span>
                        <Badge variant="default">Allowed</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Export Data</span>
                        <Badge variant="default">Allowed</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Note: Group permissions are inherited from the user&apos;s role. Additional granular permissions coming soon.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, groupId: null, groupName: '' })}
        onConfirm={deleteGroup}
        title="Delete Group"
        itemName={deleteDialog.groupName}
        warningMessage="This action cannot be undone. All members will lose access to the group's catalogs."
      />
    </div>
  );
} 