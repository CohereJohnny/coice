import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, UserPlus, Users, ChevronDown, ChevronUp, Building2, X } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  created_at: string;
  members: Array<{
    id: string;
    email: string;
    role: string;
  }>;
  catalogs: Array<{
    id: number;
    name: string;
  }>;
}

interface Catalog {
  id: number;
  name: string;
  created_at: string;
}

export function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');
  const [addUserEmails, setAddUserEmails] = useState<Record<string, string>>({});
  const [selectedCatalogs, setSelectedCatalogs] = useState<Record<string, string>>({});

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchCatalogs()]);
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
        setNewGroupName('');
        await fetchGroups();
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const addUserToGroup = async (groupId: string) => {
    const email = addUserEmails[groupId]?.trim();
    if (!email) return;
    
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          group_name: groups.find(g => g.id === groupId)?.name,
          user_email: email 
        }),
      });
      
      if (response.ok) {
        setAddUserEmails(prev => ({ ...prev, [groupId]: '' }));
        await fetchGroups();
      }
    } catch (error) {
      console.error('Failed to add user to group:', error);
    }
  };

  const removeUserFromGroup = async (groupId: string, userId: string) => {
    try {
      const response = await fetch('/api/admin/groups/membership', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_id: userId }),
      });
      
      if (response.ok) {
        await fetchGroups();
      }
    } catch (error) {
      console.error('Failed to remove user from group:', error);
    }
  };

  const assignCatalogToGroup = async (groupId: string) => {
    const catalogId = selectedCatalogs[groupId];
    if (!catalogId) return;
    
    try {
      const response = await fetch('/api/admin/groups/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, catalog_id: catalogId }),
      });
      
      if (response.ok) {
        setSelectedCatalogs(prev => ({ ...prev, [groupId]: '' }));
        await fetchGroups();
      }
    } catch (error) {
      console.error('Failed to assign catalog to group:', error);
    }
  };

  const removeCatalogFromGroup = async (groupId: string, catalogId: number) => {
    try {
      const response = await fetch('/api/admin/groups/catalogs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, catalog_id: catalogId }),
      });
      
      if (response.ok) {
        await fetchGroups();
      }
    } catch (error) {
      console.error('Failed to remove catalog from group:', error);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      });
      
      if (response.ok) {
        await fetchGroups();
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
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

  if (loading) {
    return <div className="p-4">Loading groups...</div>;
  }

  return (
    <div className="space-y-6">
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

      {/* Groups List */}
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {group.name}
                  <span className="text-sm text-muted-foreground">
                    ({group.members.length} members, {group.catalogs.length} catalogs)
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
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
                    onClick={() => deleteGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {expandedGroups.has(group.id) && (
              <CardContent className="space-y-4">
                {/* Members Section */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Members
                  </h4>
                  <div className="space-y-2">
                    {group.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{member.email} ({member.role})</span>
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
                      <Input
                        placeholder="User email"
                        value={addUserEmails[group.id] || ''}
                        onChange={(e) => setAddUserEmails(prev => ({ ...prev, [group.id]: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && addUserToGroup(group.id)}
                      />
                      <Button onClick={() => addUserToGroup(group.id)}>
                        Add User
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Catalogs Section */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Catalog Access
                  </h4>
                  <div className="space-y-2">
                    {group.catalogs.map((catalog) => (
                      <div key={catalog.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{catalog.name}</span>
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
                        onValueChange={(value: string) => setSelectedCatalogs(prev => ({ ...prev, [group.id]: value }))}
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
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 