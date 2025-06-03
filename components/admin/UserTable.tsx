'use client';

import { useState, useMemo } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Eye,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { EditUserDialog } from './EditUserDialog';
import { UserDetailsDialog } from './UserDetailsDialog';
import { auditService } from '@/lib/services/auditService';
import { notificationService } from '@/lib/services/notificationService';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'end_user';
  display_name?: string;
  created_at: string;
  is_active?: boolean;
  last_login_at?: string;
}

interface UserTableProps {
  users: User[];
  onUserUpdate: (userId: string, updates: Partial<User>) => void;
  onUserDelete: (user: User) => void;
  onRoleChange: (userId: string, newRole: string) => void;
  isLoading?: boolean;
}

export function UserTable({ 
  users, 
  onUserUpdate, 
  onUserDelete, 
  onRoleChange,
  isLoading = false 
}: UserTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    userId: string | null;
  }>({ open: false, userId: null });
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'end_user': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedUsers = useMemo(() => {
    const selectedIndexes = Object.keys(rowSelection).filter(key => rowSelection[key]);
    return selectedIndexes.map(index => users[parseInt(index)]).filter(Boolean);
  }, [rowSelection, users]);

  const handleBulkAction = async (action: 'enable' | 'disable' | 'role', roleValue?: string) => {
    if (selectedUsers.length === 0) return;

    setBulkProcessing(true);
    try {
      for (const user of selectedUsers) {
        if (action === 'enable' || action === 'disable') {
          await onUserUpdate(user.id, { is_active: action === 'enable' });
          if (action === 'enable') {
            await auditService.logUserEnabled(user.id, user.email);
          } else {
            await auditService.logUserDisabled(user.id, user.email);
          }
        } else if (action === 'role' && roleValue) {
          await onRoleChange(user.id, roleValue);
        }
      }

      notificationService.show({
        type: 'success',
        title: 'Bulk Action Completed',
        description: `Successfully updated ${selectedUsers.length} users`,
      });

      setRowSelection({});
    } catch (error) {
      notificationService.show({
        type: 'error',
        title: 'Bulk Action Failed',
        description: 'Some users could not be updated',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const columns: ColumnDef<User>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'display_name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {(user.display_name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium">{user.display_name || 'No name'}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => row.getValue('email'),
      enableSorting: true,
      enableGlobalFilter: true,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Role
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        return (
          <Badge variant={getRoleBadgeVariant(role)}>
            {role}
          </Badge>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Joined
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => formatDate(row.getValue('created_at')),
      enableSorting: true,
    },
    {
      accessorKey: 'last_login_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Last Login
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => formatDate(row.getValue('last_login_at') || ''),
      enableSorting: true,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') !== false;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setDetailsDialog({ open: true, userId: user.id });
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditDialog({ open: true, user });
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">Change Role</DropdownMenuLabel>
              {['admin', 'manager', 'end_user'].map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => onRoleChange(user.id, role)}
                  disabled={user.role === role}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Set as {role}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={() => {
                  const newStatus = user.is_active === false;
                  onUserUpdate(user.id, { is_active: newStatus });
                  if (newStatus) {
                    auditService.logUserEnabled(user.id, user.email);
                  } else {
                    auditService.logUserDisabled(user.id, user.email);
                  }
                }}
              >
                {user.is_active !== false ? 'Disable User' : 'Enable User'}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => setDeleteDialog({ open: true, user })}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [onRoleChange, onUserUpdate]);

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-4">
      {/* Search Bar and Bulk Actions */}
      <div className="flex items-center justify-between py-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Bulk Actions Toolbar */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedUsers.length} selected
            </span>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('enable')}
              disabled={bulkProcessing}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Enable
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('disable')}
              disabled={bulkProcessing}
            >
              <UserX className="h-4 w-4 mr-1" />
              Disable
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={bulkProcessing}>
                  <Shield className="h-4 w-4 mr-1" />
                  Change Role
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Set Role for Selected Users</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('role', 'end_user')}>
                  <Users className="h-4 w-4 mr-2" />
                  End User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('role', 'manager')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('role', 'admin')}>
                  <Shield className="h-4 w-4 mr-2 text-red-500" />
                  Admin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
              disabled={bulkProcessing}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading || bulkProcessing ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {bulkProcessing ? 'Processing bulk action...' : 'Loading...'}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, user: null })}
        onConfirm={() => {
          if (deleteDialog.user) {
            onUserDelete(deleteDialog.user);
          }
        }}
        title="Delete User"
        itemName={deleteDialog.user?.display_name || deleteDialog.user?.email || 'Unknown User'}
        warningMessage="This action cannot be undone. The user will lose access to all catalogs and libraries."
      />
      
      <EditUserDialog
        user={editDialog.user}
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, user: null })}
        onUserUpdated={(updatedUser) => {
          onUserUpdate(updatedUser.id, updatedUser);
          setEditDialog({ open: false, user: null });
        }}
      />
      
      <UserDetailsDialog
        userId={detailsDialog.userId}
        open={detailsDialog.open}
        onOpenChange={(open) => setDetailsDialog({ open, userId: null })}
      />
    </div>
  );
} 