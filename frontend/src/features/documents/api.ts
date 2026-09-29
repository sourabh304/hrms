'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post, type Paginated } from '@/lib/api-client';

export type DocumentCategory = 'POLICY' | 'HANDBOOK' | 'FORM' | 'COMPLIANCE' | 'CONTRACT' | 'LETTER' | 'ID_PROOF' | 'CERTIFICATE' | 'OTHER';

export interface HrDocument {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  content: string | null;
  fileId: string | null;
  file: { id: string; originalName: string; mimeType: string; size: number } | null;
  version: string;
  requiresAcknowledgment: boolean;
  employeeId: string | null;
  expiresOn: string | null;
  acknowledgedAt?: string | null;
  updatedAt: string;
}

export interface AckReport {
  document: HrDocument;
  total: number;
  acknowledged: number;
  rows: { employee: { id: string; fullName: string; employeeCode: string; department: string | null }; acknowledgedAt: string | null }[];
}

export function useDocuments(query: { scope: 'company' | 'personal'; category?: string; search?: string; employeeId?: string; page?: number }) {
  return useQuery({
    queryKey: ['documents', query],
    queryFn: () => get<Paginated<HrDocument>>('/documents', { limit: 50, ...query }),
    placeholderData: keepPreviousData,
  });
}

export const usePendingAcknowledgments = () =>
  useQuery({ queryKey: ['documents', 'pending'], queryFn: () => get<HrDocument[]>('/documents/pending-acknowledgments') });

export const useAckReport = (id: string | null) =>
  useQuery({ queryKey: ['documents', 'ack-report', id], queryFn: () => get<AckReport>(`/documents/${id}/acknowledgments`), enabled: !!id });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['documents'] });
}

export function useAcknowledge() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => post(`/documents/${id}/acknowledge`), onSuccess: invalidate });
}

export function useSaveDocument() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id?: string }) => (id ? patch(`/documents/${id}`, body) : post('/documents', body)),
    onSuccess: invalidate,
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => del(`/documents/${id}`), onSuccess: invalidate });
}
