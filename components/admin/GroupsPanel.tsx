import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, UserPlus, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  created_at: string;
  members: Array<{
    id: string;
    email: string;
    role: string;
  }>;
}

export function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newGroupName, setNewGroupName] = useState('');
  const [addUserEmail, setAddUserEmail] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/groups');
      if (!res.ok) throw new Error('Failed to fetch groups');
      const data = await res.json();
      setGroups(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: newGroupName.trim() })
      });
      if (!res.ok) throw new Error('Failed to create group');
      setNewGroupName('');
      await fetchGroups();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Delete this group?')) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId })
      });
      if (!res.ok) throw new Error('Failed to delete group');
      await fetchGroups();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddUser = async (groupId: string) => {
    const email = addUserEmail[groupId]?.trim();
    if (!email) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: groups.find(g => g.id === groupId)?.name, user_email: email })
      });
      if (!res.ok) throw new Error('Failed to add user');
      setAddUserEmail((prev) => ({ ...prev, [groupId]: '' }));
      await fetchGroups();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemoveUser = async (groupId: string, userId: string) => {
    if (!window.confirm('Remove this user from the group?')) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/groups/membership', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_id: userId })
      });
      if (!res.ok) throw new Error('Failed to remove user from group');
      await fetchGroups();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="New group name"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              disabled={creating}
            />
            <Button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()}>
              <UserPlus className="h-4 w-4 mr-2" />Create Group
            </Button>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {loading ? (
            <div>Loading groups...</div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <Card key={group.id} className="border p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">{group.name}</span>
                      <span className="text-xs text-gray-400">({group.members.length} members)</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpanded(e => ({ ...e, [group.id]: !e[group.id] }))}
                        aria-label={expanded[group.id] ? 'Collapse' : 'Expand'}
                      >
                        {expanded[group.id] ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteGroup(group.id)}
                        aria-label="Delete group"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  {expanded[group.id] && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Add user by email"
                          value={addUserEmail[group.id] || ''}
                          onChange={e => setAddUserEmail(prev => ({ ...prev, [group.id]: e.target.value }))}
                        />
                        <Button
                          onClick={() => handleAddUser(group.id)}
                          disabled={!addUserEmail[group.id]?.trim()}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />Add User
                        </Button>
                      </div>
                      <div>
                        {group.members.length === 0 ? (
                          <div className="text-gray-400 text-sm">No members</div>
                        ) : (
                          <ul className="space-y-1">
                            {group.members.map(member => (
                              <li key={member.id} className="flex items-center gap-2">
                                <span className="font-mono text-xs">{member.email}</span>
                                <span className="text-xs text-gray-500">({member.role})</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveUser(group.id, member.id)}
                                  aria-label="Remove user"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              {groups.length === 0 && <div className="text-gray-400">No groups found.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 