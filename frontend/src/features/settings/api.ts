'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Permission, Role } from '@/features/auth/types';
import type { EmployeeMini } from '@/features/employees/types';
import { get, patch, post, type Paginated } from '@/lib/api-client';

export interface UserAccount {
  id: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  employee: EmployeeMini | null;
}

export const useUsers = (query: { page: number; search?: string; role?: string }) =>
  useQuery({ queryKey: ['users', query], queryFn: () => get<Paginated<UserAccount>>('/users', { limit: 15, ...query }), placeholderData: keepPreviousData });

export const useRoleMatrix = () => useQuery({ queryKey: ['users', 'roles'], queryFn: () => get<{ role: Role; permissions: Permission[] }[]>('/users/roles'), staleTime: Infinity });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['users'] });
}

export function useUpdateRoles() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, roles }: { id: string; roles: Role[] }) => patch(`/users/${id}/roles`, { roles }), onSuccess: invalidate });
}

export function useSetUserStatus() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => patch(`/users/${id}/status`, { isActive }), onSuccess: invalidate });
}

export function useResetPassword() {
  return useMutation({ mutationFn: (id: string) => post<{ temporaryPassword: string }>(`/users/${id}/reset-password`) });
}
