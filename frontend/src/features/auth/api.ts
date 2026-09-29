'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api-client';
import type { Permission, SessionUser } from './types';

export const sessionKey = ['session'] as const;

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => get<SessionUser>('/auth/me'),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Permission helpers bound to the current session. */
export function useAccess() {
  const { data: user } = useSession();
  const can = (...perms: Permission[]) => !!user && perms.every((p) => user.permissions.includes(p));
  const canAny = (...perms: Permission[]) => !!user && perms.some((p) => user.permissions.includes(p));
  return { user, can, canAny, isManager: !!user?.isManager, employeeId: user?.employee?.id ?? null };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => post<{ user: SessionUser }>('/auth/login', body),
    onSuccess: ({ user }) => qc.setQueryData(sessionKey, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/auth/logout'),
    onSettled: () => {
      qc.clear();
      window.location.replace('/login');
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) => post('/auth/change-password', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKey }),
  });
}
