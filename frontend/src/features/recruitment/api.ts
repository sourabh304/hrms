'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, patch, post, type Paginated } from '@/lib/api-client';

export const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'] as const;
export type Stage = (typeof STAGES)[number];
export type JobStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
export const CANDIDATE_SOURCES = ['CAREERS_SITE', 'REFERRAL', 'LINKEDIN', 'JOB_BOARD', 'AGENCY', 'CAMPUS', 'DIRECT'] as const;

export interface Job {
  id: string;
  code: string;
  title: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  designationId: string | null;
  designation?: { id: string; title: string } | null;
  locationId: string | null;
  location: { id: string; name: string; city: string; country: string } | null;
  employmentType: string;
  workMode: string;
  openings: number;
  filled: number;
  description: string;
  requirements: string | null;
  skills: string[] | null;
  experienceMin: number;
  experienceMax: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status: JobStatus;
  isPublished: boolean;
  hiringManager?: EmployeeMini | null;
  recruiter?: EmployeeMini | null;
  postedAt: string | null;
  closingDate: string | null;
  approvalRequestId?: string | null;
  createdAt: string;
  pipeline?: Partial<Record<Stage, number>>;
  applicants?: number;
  active?: number;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  currentCompany: string | null;
  currentTitle: string | null;
  experienceYears: number;
  location: string | null;
  source: (typeof CANDIDATE_SOURCES)[number];
  resumeUrl: string | null;
  linkedinUrl: string | null;
  skills: string[] | null;
  notes: string | null;
  referredBy: EmployeeMini | null;
  createdAt: string;
  applications?: Application[];
}

export interface Interview {
  id: string;
  applicationId: string;
  interviewerId: string;
  interviewer?: EmployeeMini;
  round: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: 'VIDEO' | 'ONSITE' | 'PHONE';
  meetingLink: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  rating: number | null;
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE' | null;
  feedback: string | null;
  application?: Application;
}

export interface Application {
  id: string;
  jobId: string;
  job?: Job;
  candidateId: string;
  candidate: Candidate;
  stage: Stage;
  rating: number | null;
  appliedAt: string;
  stageChangedAt: string;
  coverLetter: string | null;
  notes: string | null;
  rejectionReason: string | null;
  offeredSalary: number | null;
  hiredEmployeeId: string | null;
  interviews?: Interview[];
}

export interface RecruitmentStats {
  openJobs: number;
  openPositions: number;
  funnel: Partial<Record<Stage, number>>;
  avgTimeToHireDays: number | null;
  sources: { source: string; count: number }[];
}

export const useJobs = (query: { view: 'manage' | 'board'; page: number; status?: string; search?: string }) =>
  useQuery({ queryKey: ['recruitment', 'jobs', query], queryFn: () => get<Paginated<Job>>('/recruitment/jobs', { limit: 20, ...query }), placeholderData: keepPreviousData });
export const useJob = (id: string) => useQuery({ queryKey: ['recruitment', 'job', id], queryFn: () => get<Job>(`/recruitment/jobs/${id}`) });
export const usePipeline = (jobId: string) =>
  useQuery({ queryKey: ['recruitment', 'pipeline', jobId], queryFn: () => get<{ stage: Stage; applications: Application[] }[]>(`/recruitment/jobs/${jobId}/pipeline`) });
export const useCandidates = (query: { page: number; search?: string; source?: string }, enabled = true) =>
  useQuery({ queryKey: ['recruitment', 'candidates', query], queryFn: () => get<Paginated<Candidate>>('/recruitment/candidates', { limit: 15, ...query }), placeholderData: keepPreviousData, enabled });
export const useCandidate = (id: string | null) => useQuery({ queryKey: ['recruitment', 'candidate', id], queryFn: () => get<Candidate>(`/recruitment/candidates/${id}`), enabled: !!id });
export const useMyInterviews = () => useQuery({ queryKey: ['recruitment', 'my-interviews'], queryFn: () => get<Interview[]>('/recruitment/interviews/me') });
export const useMyReferrals = () => useQuery({ queryKey: ['recruitment', 'my-referrals'], queryFn: () => get<(Candidate & { applications: Application[] })[]>('/recruitment/referrals/me') });
export const useRecruitmentStats = (enabled: boolean) => useQuery({ queryKey: ['recruitment', 'stats'], queryFn: () => get<RecruitmentStats>('/recruitment/stats'), enabled });

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['recruitment'] });
    qc.invalidateQueries({ queryKey: ['inbox'] });
  };
}

const mutation = <TVars, TData>(fn: (v: TVars) => Promise<TData>) =>
  function useRecruitmentMutation() {
    const invalidate = useInvalidate();
    return useMutation({ mutationFn: fn, onSuccess: invalidate });
  };

export const useCreateJob = mutation((body: Record<string, unknown>) => post<Job>('/recruitment/jobs', body));
export const useUpdateJob = mutation(({ id, ...body }: Record<string, unknown> & { id: string }) => patch<Job>(`/recruitment/jobs/${id}`, body));
export const useSubmitJob = mutation((id: string) => post<Job>(`/recruitment/jobs/${id}/submit`));
export const useSetJobStatus = mutation(({ id, status }: { id: string; status: JobStatus }) => post<Job>(`/recruitment/jobs/${id}/status`, { status }));
export const useMoveStage = mutation(({ id, ...body }: { id: string; stage: Stage; rejectionReason?: string; offeredSalary?: number; notes?: string }) => post(`/recruitment/applications/${id}/stage`, body));
export const useRateApplication = mutation(({ id, rating }: { id: string; rating: number }) => post(`/recruitment/applications/${id}/rate`, { rating }));
export const useHire = mutation(({ id, ...body }: { id: string; dateOfJoining: string; managerId?: string; createUserAccount?: boolean }) =>
  post<{ employee: { id: string; fullName: string; employeeCode: string } }>(`/recruitment/applications/${id}/hire`, body),
);
export const useScheduleInterview = mutation(({ applicationId, ...body }: { applicationId: string; interviewerId: string; round: string; scheduledAt: string; mode: string; durationMinutes?: number; meetingLink?: string }) =>
  post(`/recruitment/applications/${applicationId}/interviews`, body),
);
export const useInterviewFeedback = mutation(({ id, ...body }: { id: string; rating: number; recommendation: string; feedback: string }) => post(`/recruitment/interviews/${id}/feedback`, body));
export const useCreateCandidate = mutation((body: Record<string, unknown>) => post<Candidate>('/recruitment/candidates', body));
export const useRefer = mutation((body: Record<string, unknown>) => post('/recruitment/referrals', body));
