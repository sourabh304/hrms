'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { del, get, patch, post } from '@/lib/api-client';

export type JourneyType = 'ONBOARDING' | 'OFFBOARDING';
export type TaskAssignee = 'HR' | 'IT' | 'FINANCE' | 'MANAGER' | 'EMPLOYEE';

export interface TemplateTask {
  title: string;
  description?: string;
  category: string;
  assignee: TaskAssignee;
  dueOffsetDays: number;
}

export interface JourneyTemplate {
  id: string;
  name: string;
  type: JourneyType;
  description: string | null;
  isDefault: boolean;
  tasks: TemplateTask[];
}

export interface JourneyTask {
  id: string;
  journeyId: string;
  title: string;
  description: string | null;
  category: string;
  assigneeType: TaskAssignee;
  assigneeEmployeeId: string | null;
  assigneeEmployee?: EmployeeMini | null;
  assigneeRole: string | null;
  dueDate: string;
  status: 'PENDING' | 'DONE' | 'SKIPPED';
  completedAt: string | null;
  sortOrder: number;
  journey?: Journey;
}

export interface Journey {
  id: string;
  employeeId: string;
  employee: EmployeeMini & { manager?: EmployeeMini | null };
  type: JourneyType;
  templateName: string;
  startDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  completedAt: string | null;
  tasks: JourneyTask[];
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

export const useJourneys = (type?: JourneyType, status?: string) =>
  useQuery({ queryKey: ['journeys', type, status], queryFn: () => get<Journey[]>('/journeys', { type, status }) });

export const useJourney = (id: string) => useQuery({ queryKey: ['journeys', 'detail', id], queryFn: () => get<Journey>(`/journeys/${id}`) });

export const useMyTasks = () => useQuery({ queryKey: ['journeys', 'my-tasks'], queryFn: () => get<JourneyTask[]>('/journeys/tasks/me') });

export const useTemplates = (type?: JourneyType) =>
  useQuery({ queryKey: ['journeys', 'templates', type], queryFn: () => get<JourneyTemplate[]>('/journeys/templates', { type }) });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['journeys'] });
}

export function useUpdateTask() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: JourneyTask['status'] }) => patch<Journey>(`/journeys/tasks/${id}`, { status }), onSuccess: invalidate });
}

export function useStartJourney() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: { employeeId: string; type: JourneyType; templateId?: string; startDate?: string }) => post<Journey>('/journeys', body), onSuccess: invalidate });
}

export function useSaveTemplate() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<JourneyTemplate>) => (id ? patch(`/journeys/templates/${id}`, body) : post('/journeys/templates', body)),
    onSuccess: invalidate,
  });
}

export function useDeleteTemplate() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => del(`/journeys/templates/${id}`), onSuccess: invalidate });
}
