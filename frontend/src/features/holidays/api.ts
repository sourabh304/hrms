'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from '@/lib/api-client';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'PUBLIC' | 'COMPANY' | 'OPTIONAL';
  locationId: string | null;
  location: { id: string; name: string; city: string } | null;
  description: string | null;
}

export const useHolidays = (year: number, locationId?: string) =>
  useQuery({ queryKey: ['holidays', year, locationId], queryFn: () => get<Holiday[]>('/holidays', { year, locationId }) });

export const useUpcomingHolidays = (limit = 5) =>
  useQuery({ queryKey: ['holidays', 'upcoming', limit], queryFn: () => get<Holiday[]>('/holidays/upcoming', { limit }) });

export function useSaveHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Holiday>) => (id ? patch(`/holidays/${id}`, body) : post('/holidays', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => del(`/holidays/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }) });
}
