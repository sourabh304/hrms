'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { del, get, patch, post } from '@/lib/api-client';

export interface ReviewCycle {
  id: string;
  name: string;
  type: 'ANNUAL' | 'HALF_YEARLY' | 'QUARTERLY';
  startDate: string;
  endDate: string;
  selfReviewDue: string;
  managerReviewDue: string;
  status: 'DRAFT' | 'ACTIVE' | 'CALIBRATION' | 'CLOSED';
  competencies: string[];
}

export interface KeyResult {
  id?: string;
  title: string;
  target: number;
  current: number;
  unit: string;
}

export interface Goal {
  id: string;
  employeeId: string | null;
  employee: EmployeeMini | null;
  cycleId: string | null;
  parentGoalId: string | null;
  parentGoal: { id: string; title: string } | null;
  title: string;
  description: string | null;
  category: 'INDIVIDUAL' | 'TEAM' | 'COMPANY' | 'DEVELOPMENT';
  keyResults: KeyResult[];
  weight: number;
  progress: number;
  status: 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'COMPLETED';
  dueDate: string | null;
}

export interface CompetencyRating {
  name: string;
  self: number | null;
  manager: number | null;
}

export interface PerformanceReview {
  id: string;
  cycleId: string;
  cycle: ReviewCycle;
  employeeId: string;
  employee: EmployeeMini;
  reviewerId: string | null;
  reviewer: EmployeeMini | null;
  status: 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'COMPLETED';
  competencies: CompetencyRating[];
  selfRating: number | null;
  selfComments: string | null;
  managerRating: number | null;
  managerComments: string | null;
  strengths: string | null;
  improvements: string | null;
  finalRating: number | null;
  selfSubmittedAt: string | null;
  managerSubmittedAt: string | null;
  goals?: Goal[];
}

export interface Feedback {
  id: string;
  from: EmployeeMini;
  to: EmployeeMini;
  type: 'PRAISE' | 'CONSTRUCTIVE';
  visibility: 'PRIVATE' | 'SHARED_WITH_MANAGER';
  message: string;
  createdAt: string;
}

export const useCycles = () => useQuery({ queryKey: ['performance', 'cycles'], queryFn: () => get<ReviewCycle[]>('/performance/cycles') });
export const useCycleStats = (id?: string) =>
  useQuery({
    queryKey: ['performance', 'cycle-stats', id],
    queryFn: () => get<{ total: number; selfPending: number; managerPending: number; completed: number; distribution: { rating: number; count: number }[] }>(`/performance/cycles/${id}/stats`),
    enabled: !!id,
  });
export const useGoals = (scope: 'me' | 'team' | 'all' | 'company', cycleId?: string) =>
  useQuery({ queryKey: ['performance', 'goals', scope, cycleId], queryFn: () => get<Goal[]>('/performance/goals', { scope, cycleId }) });
export const useReviews = (scope: 'me' | 'team' | 'all', cycleId?: string) =>
  useQuery({ queryKey: ['performance', 'reviews', scope, cycleId], queryFn: () => get<PerformanceReview[]>('/performance/reviews', { scope, cycleId }) });
export const useReview = (id: string | null) =>
  useQuery({ queryKey: ['performance', 'review', id], queryFn: () => get<PerformanceReview>(`/performance/reviews/${id}`), enabled: !!id });
export const useFeedback = (direction: 'received' | 'given' | 'team') =>
  useQuery({ queryKey: ['performance', 'feedback', direction], queryFn: () => get<Feedback[]>(`/performance/feedback/${direction}`) });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['performance'] });
}

export function useSaveGoal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id?: string }) => (id ? patch<Goal>(`/performance/goals/${id}`, body) : post<Goal>('/performance/goals', body)),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => del(`/performance/goals/${id}`), onSuccess: invalidate });
}

export function useSubmitReview() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, as, ...body }: { id: string; as: 'self' | 'manager'; rating: number; comments: string; competencies: { name: string; rating: number }[]; strengths?: string; improvements?: string }) =>
      post<PerformanceReview>(`/performance/reviews/${id}/${as}`, body),
    onSuccess: invalidate,
  });
}

export function useCalibrate() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, finalRating }: { id: string; finalRating: number }) => post(`/performance/reviews/${id}/calibrate`, { finalRating }), onSuccess: invalidate });
}

export function useSaveCycle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ReviewCycle>) => (id ? patch(`/performance/cycles/${id}`, body) : post('/performance/cycles', body)),
    onSuccess: invalidate,
  });
}

export function useLaunchCycle() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => post<{ reviewsCreated: number }>(`/performance/cycles/${id}/launch`), onSuccess: invalidate });
}

export function useGiveFeedback() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: { toId: string; message: string; type: string; visibility: string }) => post('/performance/feedback', body), onSuccess: invalidate });
}
