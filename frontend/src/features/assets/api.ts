'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, patch, post, type Paginated } from '@/lib/api-client';

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_REPAIR' | 'RETIRED' | 'LOST';
export const ASSET_CATEGORIES = ['LAPTOP', 'DESKTOP', 'MONITOR', 'PHONE', 'TABLET', 'PERIPHERAL', 'ACCESS_CARD', 'FURNITURE', 'SOFTWARE_LICENSE', 'VEHICLE', 'OTHER'] as const;
export const ASSET_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR'] as const;

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: (typeof ASSET_CATEGORIES)[number];
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyUntil: string | null;
  status: AssetStatus;
  condition: (typeof ASSET_CONDITIONS)[number];
  assignedToId: string | null;
  assignedTo: EmployeeMini | null;
  assignedAt: string | null;
  notes: string | null;
  history?: { id: string; employee: EmployeeMini; assignedAt: string; returnedAt: string | null; conditionOnReturn: string | null; notes: string | null }[];
}

export const useMyAssets = () => useQuery({ queryKey: ['assets', 'mine'], queryFn: () => get<Asset[]>('/assets/me') });
export const useAssets = (query: { page: number; status?: string; category?: string; search?: string }) =>
  useQuery({ queryKey: ['assets', 'list', query], queryFn: () => get<Paginated<Asset>>('/assets', { limit: 15, ...query }), placeholderData: keepPreviousData });
export const useAsset = (id: string | null) => useQuery({ queryKey: ['assets', 'detail', id], queryFn: () => get<Asset>(`/assets/${id}`), enabled: !!id });
export const useAssetStats = () =>
  useQuery({ queryKey: ['assets', 'stats'], queryFn: () => get<{ byStatus: Record<string, number>; byCategory: Record<string, number>; totalValue: number }>('/assets/stats') });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['assets'] });
}

export function useSaveAsset() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, ...body }: Partial<Asset>) => (id ? patch(`/assets/${id}`, body) : post('/assets', body)), onSuccess: invalidate });
}

export function useAssignAsset() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, employeeId, notes }: { id: string; employeeId: string; notes?: string }) => post(`/assets/${id}/assign`, { employeeId, notes }), onSuccess: invalidate });
}

export function useReturnAsset() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, condition, notes }: { id: string; condition: string; notes?: string }) => post(`/assets/${id}/return`, { condition, notes }), onSuccess: invalidate });
}
