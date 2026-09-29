'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post, put } from '@/lib/api-client';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  costCenter: string | null;
  parentId: string | null;
  headId: string | null;
  head: { id: string; fullName: string; designation?: { title: string } | null } | null;
  parent: { id: string; name: string } | null;
  isActive: boolean;
  headcount: number;
}

export interface Designation {
  id: string;
  title: string;
  level: string;
  jobFamily: string | null;
  description: string | null;
  isActive: boolean;
  headcount: number;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string;
  country: string;
  timezone: string;
  isHeadquarters: boolean;
  isActive: boolean;
  headcount: number;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  legalName: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  dateFormat: string;
  fiscalYearStartMonth: number;
  weeklyOffs: string[];
  standardWorkHours: number;
  probationDays: number;
  noticePeriodDays: number;
  employeeCodePrefix: string;
  emailDomain: string;
  taxSlabs: { from: number; to: number | null; ratePercent: number }[];
}

type Kind = 'departments' | 'designations' | 'locations';

export const useDepartments = () => useQuery({ queryKey: ['org', 'departments'], queryFn: () => get<Department[]>('/organization/departments'), staleTime: 5 * 60_000 });
export const useDesignations = () => useQuery({ queryKey: ['org', 'designations'], queryFn: () => get<Designation[]>('/organization/designations'), staleTime: 5 * 60_000 });
export const useLocations = () => useQuery({ queryKey: ['org', 'locations'], queryFn: () => get<Location[]>('/organization/locations'), staleTime: 5 * 60_000 });
export const useSettings = () => useQuery({ queryKey: ['org', 'settings'], queryFn: () => get<CompanySettings>('/organization/settings'), staleTime: 10 * 60_000 });

/** Currency of the tenant, for money formatting. */
export function useCurrency() {
  return useSettings().data?.currency ?? 'USD';
}

export function useSaveOrgItem(kind: Kind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string } & Record<string, unknown>) =>
      id ? patch(`/organization/${kind}/${id}`, body) : post(`/organization/${kind}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', kind] }),
  });
}

export function useDeleteOrgItem(kind: Kind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/organization/${kind}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', kind] }),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CompanySettings>) => put<CompanySettings>('/organization/settings', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'settings'] }),
  });
}
