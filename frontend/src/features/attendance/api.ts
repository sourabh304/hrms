'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, type Paginated } from '@/lib/api-client';

export type DayStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND' | 'NOT_MARKED' | 'UPCOMING';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workMinutes: number;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT';
  isLate: boolean;
  lateMinutes: number;
  source: string;
  notes: string | null;
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  breakMinutes: number;
  isDefault: boolean;
}

export interface TodayInfo {
  date: string;
  record: AttendanceRecord | null;
  shift: Pick<Shift, 'name' | 'startTime' | 'endTime' | 'graceMinutes' | 'breakMinutes'>;
  day: { date: string; kind: 'WORKING' | 'WEEKEND' | 'HOLIDAY'; holiday?: string };
}

export interface MonthDay {
  date: string;
  status: DayStatus;
  holiday: string | null;
  leaveType: string | null;
  record: AttendanceRecord | null;
}

export interface MonthView {
  month: string;
  days: MonthDay[];
  summary: { present: number; late: number; halfDay: number; absent: number; onLeave: number; holidays: number; workingDays: number; totalHours: number; avgHours: number };
}

export interface RosterRow {
  employee: { id: string; fullName: string; employeeCode: string; avatarUrl: string | null; designation: string | null; department: string | null };
  record: AttendanceRecord | null;
  leaveType: string | null;
  status: DayStatus;
}

export interface Roster {
  date: string;
  rows: RosterRow[];
  summary: { total: number; present: number; late: number; absent: number; onLeave: number; notMarked: number };
}

export interface Regularization {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalRequestId: string | null;
  createdAt: string;
  employee: { id: string; fullName: string; avatarUrl: string | null };
}

export const useToday = () => useQuery({ queryKey: ['attendance', 'today'], queryFn: () => get<TodayInfo>('/attendance/today') });

export const useMonth = (month: string, employeeId?: string) =>
  useQuery({ queryKey: ['attendance', 'month', month, employeeId], queryFn: () => get<MonthView>('/attendance/month', { month, employeeId }) });

export const useRoster = (date: string, scope: 'team' | 'all', departmentId?: string, enabled = true) =>
  useQuery({ queryKey: ['attendance', 'roster', date, scope, departmentId], queryFn: () => get<Roster>('/attendance/roster', { date, scope, departmentId }), enabled });

export const useRegularizations = (scope: 'me' | 'team' | 'all', page = 1) =>
  useQuery({ queryKey: ['attendance', 'regularizations', scope, page], queryFn: () => get<Paginated<Regularization>>('/attendance/regularizations', { scope, page, limit: 10 }) });

export const useShifts = () => useQuery({ queryKey: ['attendance', 'shifts'], queryFn: () => get<Shift[]>('/attendance/shifts') });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['attendance'] });
}

export function usePunch() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (kind: 'clock-in' | 'clock-out') => post<AttendanceRecord>(`/attendance/${kind}`, { source: 'WEB' }),
    onSuccess: invalidate,
  });
}

export function useRegularize() {
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string; checkIn: string; checkOut: string; reason: string }) => post('/attendance/regularizations', body),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['workflow-requests'] });
    },
  });
}

export function useSaveShift() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Shift>) => (id ? patch(`/attendance/shifts/${id}`, body) : post('/attendance/shifts', body)),
    onSuccess: invalidate,
  });
}
