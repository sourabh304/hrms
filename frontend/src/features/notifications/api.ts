'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api-client';

export interface AppNotification {
  id: string;
  title: string;
  message: string | null;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION';
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const key = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: key,
    queryFn: () => get<{ items: AppNotification[]; unread: number }>('/notifications'),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    meta: { silent: true },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
