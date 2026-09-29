'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, post } from '@/lib/api-client';

export const BADGES = {
  TEAM_PLAYER: { label: 'Team Player', emoji: '🤝' },
  INNOVATOR: { label: 'Innovator', emoji: '💡' },
  CUSTOMER_HERO: { label: 'Customer Hero', emoji: '🦸' },
  LEADERSHIP: { label: 'Leadership', emoji: '🧭' },
  ABOVE_AND_BEYOND: { label: 'Above & Beyond', emoji: '🚀' },
  MENTOR: { label: 'Mentor', emoji: '🌱' },
} as const;
export type Badge = keyof typeof BADGES;

export interface Kudos {
  id: string;
  from: EmployeeMini;
  to: EmployeeMini;
  badge: Badge;
  message: string;
  likes: string[];
  createdAt: string;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'RATING' | 'ENPS' | 'TEXT' | 'CHOICE';
  options?: string[];
  required?: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  isAnonymous: boolean;
  closesOn: string | null;
  hasResponded?: boolean;
  responseCount?: number;
  createdAt: string;
}

export interface SurveyResults {
  survey: Survey;
  totalResponses: number;
  responseRate: number;
  questions: (SurveyQuestion & { responses: number; average?: number | null; enps?: number | null; distribution?: { option: string; count: number }[]; comments?: string[] })[];
  byDepartment: { department: string; count: number }[];
}

export const useKudos = () => useQuery({ queryKey: ['engagement', 'kudos'], queryFn: () => get<Kudos[]>('/engagement/kudos') });
export const useLeaderboard = () =>
  useQuery({ queryKey: ['engagement', 'leaderboard'], queryFn: () => get<{ count: number; employee: { id: string; fullName: string; avatarUrl: string | null; designation: string | null } | null }[]>('/engagement/kudos/leaderboard') });
export const useSurveys = () => useQuery({ queryKey: ['engagement', 'surveys'], queryFn: () => get<Survey[]>('/engagement/surveys') });
export const useSurveyResults = (id: string | null) => useQuery({ queryKey: ['engagement', 'results', id], queryFn: () => get<SurveyResults>(`/engagement/surveys/${id}/results`), enabled: !!id });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['engagement'] });
}

export function useGiveKudos() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: { toId: string; badge: Badge; message: string }) => post('/engagement/kudos', body), onSuccess: invalidate });
}

export function useLikeKudos() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => post(`/engagement/kudos/${id}/like`), onSuccess: invalidate, meta: { silent: true } });
}

export function useRespond() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, answers }: { id: string; answers: Record<string, string | number> }) => post(`/engagement/surveys/${id}/respond`, { answers }), onSuccess: invalidate });
}

export function useCreateSurvey() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => post<Survey>('/engagement/surveys', body), onSuccess: invalidate });
}

export function useSurveyStatus() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: Survey['status'] }) => post(`/engagement/surveys/${id}/status`, { status }), onSuccess: invalidate });
}
