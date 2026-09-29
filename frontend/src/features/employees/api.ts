'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, type Paginated } from '@/lib/api-client';
import type { Celebration, Employee, EmployeeDetail, EmploymentEvent, LookupEmployee, OrgChartNode } from './types';

export interface EmployeeFilters {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  locationId?: string;
  designationId?: string;
  status?: string;
  employmentType?: string;
  managerId?: string;
  includeExited?: boolean;
  sort?: 'name' | 'joined' | 'code';
}

export const employeeKeys = {
  all: ['employees'] as const,
  list: (f: EmployeeFilters) => ['employees', 'list', f] as const,
  detail: (id: string) => ['employees', 'detail', id] as const,
  me: ['employees', 'me'] as const,
};

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => get<Paginated<Employee>>('/employees', { limit: 20, ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: string) {
  return useQuery({ queryKey: employeeKeys.detail(id), queryFn: () => get<EmployeeDetail>(`/employees/${id}`) });
}

export function useMyProfile() {
  return useQuery({ queryKey: employeeKeys.me, queryFn: () => get<EmployeeDetail>('/employees/me') });
}

export function useTimeline(id: string) {
  return useQuery({ queryKey: ['employees', 'timeline', id], queryFn: () => get<EmploymentEvent[]>(`/employees/${id}/timeline`) });
}

export function useEmployeeLookup(search: string, enabled = true) {
  return useQuery({
    queryKey: ['lookup', search],
    queryFn: () => get<LookupEmployee[]>('/employees/lookup', { search }),
    enabled,
    staleTime: 60_000,
  });
}

export function useOrgChart() {
  return useQuery({ queryKey: ['employees', 'org-chart'], queryFn: () => get<OrgChartNode[]>('/employees/org-chart'), staleTime: 5 * 60_000 });
}

export function useCelebrations(days = 30) {
  return useQuery({ queryKey: ['employees', 'celebrations', days], queryFn: () => get<Celebration[]>('/employees/celebrations', { days }) });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<EmployeeDetail>('/employees', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => patch<Employee>(`/employees/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => patch<EmployeeDetail>('/employees/me', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: ['session'] });
    },
  });
}
