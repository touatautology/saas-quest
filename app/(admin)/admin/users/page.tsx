'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { requireAdmin } from '@/lib/admin/queries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { UserRole } from '@/lib/db/schema';

type UserData = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  planName: string | null;
  subscriptionStatus: string | null;
};

type UsersResponse = {
  users: UserData[];
  total: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'owner':
      return 'default';
    default:
      return 'secondary';
  }
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const { data, isLoading, error } = useSWR<UsersResponse>(
    `/api/admin/users?page=${page}&limit=20`,
    fetcher
  );

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setIsUpdating(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        mutate(`/api/admin/users?page=${page}&limit=20`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch {
      alert('Failed to update role');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (userId: number) => {
    setIsDeleting(userId);
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        mutate(`/api/admin/users?page=${page}&limit=20`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch {
      alert('Failed to delete user');
    } finally {
      setIsDeleting(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        User Management
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-red-500">Failed to load users</div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={
                            user.planName
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-600'
                          }
                        >
                          {user.planName || 'Free'}
                        </Badge>
                        {user.subscriptionStatus && (
                          <Badge
                            variant="outline"
                            className={
                              user.subscriptionStatus === 'active'
                                ? 'text-green-600 border-green-300'
                                : user.subscriptionStatus === 'trialing'
                                ? 'text-blue-600 border-blue-300'
                                : 'text-gray-500 border-gray-300'
                            }
                          >
                            {user.subscriptionStatus}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value as UserRole)
                        }
                        disabled={isUpdating === user.id}
                      >
                        <SelectTrigger className="w-[120px]">
                          {isUpdating === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {user.role}
                              </Badge>
                            </SelectValue>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">
                            <Badge variant="secondary">member</Badge>
                          </SelectItem>
                          <SelectItem value="owner">
                            <Badge variant="default">owner</Badge>
                          </SelectItem>
                          <SelectItem value="admin">
                            <Badge variant="destructive">admin</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.createdAt), 'yyyy/MM/dd', {
                        locale: ja,
                      })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            disabled={isDeleting === user.id}
                          >
                            {isDeleting === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete User
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.email}? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Total: {data?.total} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
