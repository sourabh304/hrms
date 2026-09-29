'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from '@/lib/api-client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'GENERAL' | 'POLICY' | 'EVENT' | 'CELEBRATION' | 'URGENT';
  isPinned: boolean;
  publishedAt: string;
  expiresOn: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  author: { id: string; fullName: string; avatarUrl: string | null; designation?: { title: string } | null } | null;
}

export const useAnnouncements = (all = false) =>
  useQuery({ queryKey: ['announcements', all], queryFn: () => get<Announcement[]>('/announcements', { all: all ? 'true' : undefined }) });

export function useSaveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id?: string }) => (id ? patch(`/announcements/${id}`, body) : post('/announcements', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => del(`/announcements/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
}
