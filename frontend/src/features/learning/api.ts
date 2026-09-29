'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, patch, post, type Paginated } from '@/lib/api-client';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  provider: string | null;
  durationHours: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  format: 'VIDEO' | 'CLASSROOM' | 'WEBINAR' | 'DOCUMENT' | 'INTERACTIVE';
  contentUrl: string | null;
  isMandatory: boolean;
  skills: string[] | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  enrolledCount?: number;
  completedCount?: number;
  myEnrollment?: Enrollment | null;
}

export interface Enrollment {
  id: string;
  courseId: string;
  course?: Course;
  employeeId: string;
  employee?: EmployeeMini;
  status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';
  progress: number;
  dueDate: string | null;
  completedAt: string | null;
}

export const useCourses = (query: { page: number; search?: string; category?: string; level?: string }) =>
  useQuery({ queryKey: ['learning', 'courses', query], queryFn: () => get<Paginated<Course>>('/learning/courses', { limit: 24, ...query }), placeholderData: keepPreviousData });
export const useCategories = () => useQuery({ queryKey: ['learning', 'categories'], queryFn: () => get<string[]>('/learning/categories') });
export const useMyLearning = () => useQuery({ queryKey: ['learning', 'mine'], queryFn: () => get<Enrollment[]>('/learning/enrollments/me') });
export const useCourseEnrollments = (id: string | null) =>
  useQuery({ queryKey: ['learning', 'course-enrollments', id], queryFn: () => get<Enrollment[]>(`/learning/courses/${id}/enrollments`), enabled: !!id });
export const useLearningStats = (enabled: boolean) =>
  useQuery({ queryKey: ['learning', 'stats'], queryFn: () => get<{ totalEnrollments: number; completed: number; inProgress: number; overdue: number; mandatoryCompliance: number }>('/learning/stats'), enabled });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['learning'] });
}

export function useEnroll() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (courseId: string) => post<Enrollment>(`/learning/courses/${courseId}/enroll`), onSuccess: invalidate });
}

export function useUpdateProgress() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, progress }: { id: string; progress: number }) => patch<Enrollment>(`/learning/enrollments/${id}/progress`, { progress }), onSuccess: invalidate });
}

export function useAssignCourse() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { courseId: string; employeeIds?: string[]; departmentId?: string; dueDate?: string }) => post<{ assigned: number; alreadyEnrolled: number }>('/learning/assign', body),
    onSuccess: invalidate,
  });
}

export function useSaveCourse() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, ...body }: Partial<Course>) => (id ? patch(`/learning/courses/${id}`, body) : post('/learning/courses', body)), onSuccess: invalidate });
}
