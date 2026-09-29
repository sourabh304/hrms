'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, type Paginated } from '@/lib/api-client';
import type { ApprovalRequest, InboxItem, WorkflowPolicy, WorkflowType } from './types';

export const inboxKeys = {
  all: ['inbox'] as const,
  count: ['inbox', 'count'] as const,
};

export function useInbox(type?: WorkflowType) {
  return useQuery({ queryKey: [...inboxKeys.all, type ?? 'all'], queryFn: () => get<InboxItem[]>('/workflow/inbox', { type }) });
}

export function useInboxCount() {
  return useQuery({
    queryKey: inboxKeys.count,
    queryFn: () => get<{ count: number }>('/workflow/inbox/count'),
    refetchInterval: 60_000,
  });
}

export function useMyRequests(query: { page?: number; status?: string; type?: string; scope?: 'mine' | 'all' }) {
  return useQuery({
    queryKey: ['workflow-requests', query],
    queryFn: () => get<Paginated<ApprovalRequest>>('/workflow/requests', { limit: 15, ...query }),
  });
}

export function useApprovalTrail(type: WorkflowType, entityId?: string | null) {
  return useQuery({
    queryKey: ['approval-trail', type, entityId],
    queryFn: () => get<ApprovalRequest | null>(`/workflow/entity/${type}/${entityId}`),
    enabled: !!entityId,
  });
}

/** Approve/reject invalidates everything a decision could affect. */
function useDecisionInvalidation() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [['inbox'], ['workflow-requests'], ['leave'], ['expenses'], ['attendance'], ['offboarding'], ['recruitment'], ['approval-trail'], ['notifications']].map(
        (queryKey) => qc.invalidateQueries({ queryKey }),
      ),
    );
}

export function useDecide() {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: 'approve' | 'reject'; comment?: string }) =>
      post<ApprovalRequest>(`/workflow/requests/${id}/${decision}`, { comment }),
    onSuccess: invalidate,
  });
}

export function useBulkDecide() {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: (body: { requestIds: string[]; decision: 'APPROVED' | 'REJECTED'; comment?: string }) =>
      post<{ id: string; ok: boolean; error?: string }[]>('/workflow/inbox/bulk', body),
    onSuccess: invalidate,
  });
}

export function usePolicies() {
  return useQuery({ queryKey: ['workflow-policies'], queryFn: () => get<WorkflowPolicy[]>('/workflow/policies') });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, ...body }: Partial<WorkflowPolicy> & { type: WorkflowType }) => put<WorkflowPolicy>(`/workflow/policies/${type}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-policies'] }),
  });
}
