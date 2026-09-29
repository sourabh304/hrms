'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, patch, post, type Paginated } from '@/lib/api-client';

export const TICKET_CATEGORIES = ['PAYROLL', 'LEAVE_ATTENDANCE', 'BENEFITS', 'POLICY', 'IT_SUPPORT', 'FACILITIES', 'DOCUMENTS', 'GENERAL'] as const;
export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_EMPLOYEE', 'RESOLVED', 'CLOSED'] as const;

export interface TicketComment {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  author: EmployeeMini;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: (typeof TICKET_CATEGORIES)[number];
  priority: (typeof TICKET_PRIORITIES)[number];
  status: (typeof TICKET_STATUSES)[number];
  raisedById: string;
  raisedBy: EmployeeMini;
  assigneeId: string | null;
  assignee: EmployeeMini | null;
  slaDueAt: string;
  resolvedAt: string | null;
  satisfaction: number | null;
  isOverdue: boolean;
  createdAt: string;
  comments?: TicketComment[];
}

export interface HelpdeskStats {
  open: number;
  overdue: number;
  unassigned: number;
  resolved: number;
  slaCompliance: number;
  avgResolutionHours: number | null;
  csat: number | null;
}

export const useTickets = (query: { scope: 'me' | 'assigned' | 'all'; page: number; status?: string; search?: string }) =>
  useQuery({ queryKey: ['helpdesk', 'list', query], queryFn: () => get<Paginated<Ticket>>('/helpdesk/tickets', { limit: 15, ...query }), placeholderData: keepPreviousData });
export const useTicket = (id: string) => useQuery({ queryKey: ['helpdesk', 'ticket', id], queryFn: () => get<Ticket>(`/helpdesk/tickets/${id}`) });
export const useHelpdeskStats = (enabled: boolean) => useQuery({ queryKey: ['helpdesk', 'stats'], queryFn: () => get<HelpdeskStats>('/helpdesk/tickets/stats'), enabled });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['helpdesk'] });
}

export function useCreateTicket() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: { subject: string; description: string; category: string; priority: string }) => post<Ticket>('/helpdesk/tickets', body), onSuccess: invalidate });
}

export function useUpdateTicket(id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => patch<Ticket>(`/helpdesk/tickets/${id}`, body), onSuccess: invalidate });
}

export function useComment(id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: { message: string; isInternal?: boolean }) => post<Ticket>(`/helpdesk/tickets/${id}/comments`, body), onSuccess: invalidate });
}

export function useRateTicket(id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (satisfaction: number) => post<Ticket>(`/helpdesk/tickets/${id}/rate`, { satisfaction }), onSuccess: invalidate });
}
