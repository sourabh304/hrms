'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, post, type Paginated } from '@/lib/api-client';

export type SeparationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'COMPLETED';

export interface Separation {
  id: string;
  employeeId: string;
  employee: EmployeeMini & { manager?: EmployeeMini | null };
  type: 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT' | 'END_OF_CONTRACT';
  reason: string;
  noticeDate: string;
  requestedLastDay: string;
  approvedLastDay: string | null;
  status: SeparationStatus;
  exitInterview: { overallRating: number; primaryReason: string; wouldRecommend: boolean; feedback: string; submittedAt: string } | null;
  isRehireEligible: boolean | null;
  approvalRequestId: string | null;
  completedAt: string | null;
  createdAt: string;
}

export const useSeparations = (scope: 'me' | 'team' | 'all', page = 1, status?: string) =>
  useQuery({
    queryKey: ['offboarding', scope, page, status],
    queryFn: () => get<Paginated<Separation>>('/offboarding/separations', { scope, page, status, limit: 15 }),
    placeholderData: keepPreviousData,
  });

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['offboarding'] });
    qc.invalidateQueries({ queryKey: ['journeys'] });
    qc.invalidateQueries({ queryKey: ['inbox'] });
  };
}

export function useResign() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: { reason: string; requestedLastDay: string }) => post<Separation>('/offboarding/resign', body), onSuccess: invalidate });
}

export function useInitiateSeparation() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: { employeeId: string; type: string; reason: string; lastDay: string }) => post<Separation>('/offboarding/separations', body), onSuccess: invalidate });
}

export function useSeparationAction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'withdraw' | 'exit-interview' | 'complete'; body?: Record<string, unknown> }) =>
      post<Separation>(`/offboarding/separations/${id}/${action}`, body),
    onSuccess: invalidate,
  });
}
