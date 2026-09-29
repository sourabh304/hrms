'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, patch, post, type Paginated } from '@/lib/api-client';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  annualQuota: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryForward: number;
  allowHalfDay: boolean;
  maxConsecutiveDays: number | null;
  applicableGender: string | null;
  isActive: boolean;
}

export interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  allocated: number;
  carriedForward: number;
  used: number;
  pending: number;
  available: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: EmployeeMini;
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay: boolean;
  halfDaySession: 'FIRST' | 'SECOND' | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvalRequestId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export const useLeaveTypes = (includeInactive = false) =>
  useQuery({ queryKey: ['leave', 'types', includeInactive], queryFn: () => get<LeaveType[]>('/leave/types', { includeInactive }) });

export const useBalances = (employeeId?: string, year?: number) =>
  useQuery({ queryKey: ['leave', 'balances', employeeId, year], queryFn: () => get<LeaveBalance[]>('/leave/balances', { employeeId, year }) });

export function useLeaveRequests(query: { scope: 'me' | 'team' | 'all'; page: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['leave', 'requests', query],
    queryFn: () => get<Paginated<LeaveRequest>>('/leave/requests', { limit: 12, ...query }),
    placeholderData: keepPreviousData,
  });
}

export const useLeaveCalendar = (from: string, to: string, scope: 'team' | 'all' = 'team') =>
  useQuery({ queryKey: ['leave', 'calendar', from, to, scope], queryFn: () => get<LeaveRequest[]>('/leave/calendar', { from, to, scope }) });

export const useLeavePreview = (startDate: string, endDate: string, isHalfDay: boolean, enabled = true) =>
  useQuery({
    queryKey: ['leave', 'preview', startDate, endDate, isHalfDay],
    queryFn: () => get<{ days: number; breakdown: { date: string; kind: string; holiday?: string }[] }>('/leave/preview', { startDate, endDate, isHalfDay }),
    enabled: enabled && !!startDate && !!endDate && endDate >= startDate,
  });

function useInvalidateLeave() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['leave'] });
    qc.invalidateQueries({ queryKey: ['inbox'] });
    qc.invalidateQueries({ queryKey: ['workflow-requests'] });
  };
}

export function useApplyLeave() {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: (body: { leaveTypeId: string; startDate: string; endDate: string; isHalfDay?: boolean; halfDaySession?: string; reason: string }) =>
      post<LeaveRequest>('/leave/requests', body),
    onSuccess: invalidate,
  });
}

export function useCancelLeave() {
  const invalidate = useInvalidateLeave();
  return useMutation({ mutationFn: (id: string) => post<LeaveRequest>(`/leave/requests/${id}/cancel`), onSuccess: invalidate });
}

export function useSaveLeaveType() {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<LeaveType>) => (id ? patch(`/leave/types/${id}`, body) : post('/leave/types', body)),
    onSuccess: invalidate,
  });
}

export function useAllocateYear() {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: (year: number) => post<{ year: number; employees: number; balancesCreated: number }>('/leave/balances/allocate', { year }),
    onSuccess: invalidate,
  });
}
