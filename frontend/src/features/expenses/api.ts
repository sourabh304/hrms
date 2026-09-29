'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeMini } from '@/features/employees/types';
import { get, post, type Paginated } from '@/lib/api-client';

export const EXPENSE_CATEGORIES = ['TRAVEL', 'ACCOMMODATION', 'MEALS', 'CLIENT_ENTERTAINMENT', 'EQUIPMENT', 'SOFTWARE', 'TRAINING', 'INTERNET_PHONE', 'OTHER'] as const;
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED' | 'CANCELLED';

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employee: EmployeeMini;
  title: string;
  category: (typeof EXPENSE_CATEGORIES)[number];
  amount: number;
  currency: string;
  expenseDate: string;
  merchant: string | null;
  description: string | null;
  receiptFileId: string | null;
  status: ExpenseStatus;
  approvalRequestId: string | null;
  submittedAt: string | null;
  reimbursedAt: string | null;
  paymentReference: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface ExpenseSummary {
  pending: number;
  approved: number;
  reimbursed: number;
  rejected: number;
  byCategory: { category: string; total: number }[];
}

export const useExpenses = (query: { scope: 'me' | 'team' | 'all'; page: number; status?: string; search?: string }) =>
  useQuery({ queryKey: ['expenses', 'list', query], queryFn: () => get<Paginated<ExpenseClaim>>('/expenses', { limit: 12, ...query }), placeholderData: keepPreviousData });

export const useExpenseSummary = (scope: 'me' | 'all') =>
  useQuery({ queryKey: ['expenses', 'summary', scope], queryFn: () => get<ExpenseSummary>('/expenses/summary', { scope }) });

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['inbox'] });
  };
}

export function useCreateExpense() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => post<ExpenseClaim>('/expenses', body), onSuccess: invalidate });
}

export function useExpenseAction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action, paymentReference }: { id: string; action: 'submit' | 'cancel' | 'reimburse'; paymentReference?: string }) =>
      post<ExpenseClaim>(`/expenses/${id}/${action}`, action === 'reimburse' ? { paymentReference } : undefined),
    onSuccess: invalidate,
  });
}
