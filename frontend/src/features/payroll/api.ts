'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Employee, EmployeeMini } from '@/features/employees/types';
import { del, get, post, put, type Paginated } from '@/lib/api-client';

export interface SalaryComponent {
  code: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  calculation: 'FIXED' | 'PERCENT_OF_CTC' | 'PERCENT_OF_BASIC' | 'BALANCE';
  value: number;
}

export interface PayLine {
  code: string;
  name: string;
  amount: number;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  annualCtc: number;
  currency: string;
  components: SalaryComponent[];
  effectiveFrom: string;
  isCurrent: boolean;
  notes: string | null;
}

export interface Breakdown {
  earnings: PayLine[];
  deductions: PayLine[];
  gross: number;
  totalDeductions: number;
  net: number;
}

export interface PayrollRun {
  id: string;
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'PROCESSED' | 'PAID';
  currency: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  processedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employee?: Employee;
  year: number;
  month: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
  annualCtc: number;
  earnings: PayLine[];
  deductions: PayLine[];
  gross: number;
  totalDeductions: number;
  net: number;
  currency: string;
  isPublished: boolean;
  company?: { name: string; legalName: string | null };
}

export type EmployeeWithSalary = EmployeeMini & { salary: SalaryStructure | null; status: string };

export const usePayrollRuns = () => useQuery({ queryKey: ['payroll', 'runs'], queryFn: () => get<PayrollRun[]>('/payroll/runs') });
export const usePayrollRun = (id: string) =>
  useQuery({ queryKey: ['payroll', 'run', id], queryFn: () => get<PayrollRun & { payslips: Payslip[] }>(`/payroll/runs/${id}`) });
export const usePayrollSummary = () =>
  useQuery({ queryKey: ['payroll', 'summary'], queryFn: () => get<{ period: string; gross: number; net: number; deductions: number; employees: number }[]>('/payroll/summary') });
export const useMyPayslips = () => useQuery({ queryKey: ['payroll', 'my-payslips'], queryFn: () => get<Payslip[]>('/payroll/payslips/me') });
export const usePayslip = (id: string) => useQuery({ queryKey: ['payroll', 'payslip', id], queryFn: () => get<Payslip>(`/payroll/payslips/${id}`) });

export function useSalaryStructures(query: { page: number; search?: string; filter?: 'all' | 'missing' }) {
  return useQuery({
    queryKey: ['payroll', 'structures', query],
    queryFn: () => get<Paginated<EmployeeWithSalary>>('/payroll/salary-structures', { limit: 15, ...query }),
    placeholderData: keepPreviousData,
  });
}

export function useCompensation(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: ['payroll', 'compensation', employeeId],
    queryFn: () => get<{ structure: SalaryStructure | null; breakdown: Breakdown | null; history: SalaryStructure[] }>(`/payroll/salary-structures/${employeeId}`),
    enabled,
  });
}

function useInvalidatePayroll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['payroll'] });
}

export function useSaveStructure() {
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: ({ employeeId, ...body }: { employeeId: string; annualCtc: number; effectiveFrom: string; components?: SalaryComponent[]; notes?: string }) =>
      put<SalaryStructure>(`/payroll/salary-structures/${employeeId}`, body),
    onSuccess: invalidate,
  });
}

export function useCreateRun() {
  const invalidate = useInvalidatePayroll();
  return useMutation({ mutationFn: (body: { year: number; month: number; notes?: string }) => post<PayrollRun>('/payroll/runs', body), onSuccess: invalidate });
}

export function useRunAction() {
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'recalculate' | 'finalize' | 'mark-paid' | 'delete' }) =>
      action === 'delete' ? del(`/payroll/runs/${id}`) : post(`/payroll/runs/${id}/${action}`),
    onSuccess: invalidate,
  });
}
