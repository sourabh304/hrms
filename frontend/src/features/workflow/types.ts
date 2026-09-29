import type { EmployeeMini } from '@/features/employees/types';

export type WorkflowType = 'LEAVE' | 'EXPENSE' | 'ATTENDANCE_REGULARIZATION' | 'SEPARATION' | 'JOB_REQUISITION';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type StepStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
export type ApproverType = 'MANAGER' | 'SKIP_LEVEL_MANAGER' | 'DEPARTMENT_HEAD' | 'ROLE';

export interface ApprovalStep {
  id: string;
  stepOrder: number;
  label: string;
  approverType: ApproverType;
  approverEmployeeId: string | null;
  approverEmployee?: EmployeeMini | null;
  approverRole: string | null;
  status: StepStatus;
  actedBy?: EmployeeMini | null;
  actedAt: string | null;
  comment: string | null;
}

export interface ApprovalRequest {
  id: string;
  type: WorkflowType;
  entityId: string;
  title: string;
  summary: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
  link: string | null;
  requesterId: string;
  requester: EmployeeMini;
  status: RequestStatus;
  currentStep: number;
  completedAt: string | null;
  createdAt: string;
  steps: ApprovalStep[];
}

export interface InboxItem {
  step: ApprovalStep;
  request: ApprovalRequest;
}

export interface PolicyStep {
  label: string;
  approverType: ApproverType;
  role?: string;
  condition?: { field: string; operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'; value: number | string };
}

export interface WorkflowPolicy {
  id: string;
  type: WorkflowType;
  name: string;
  description: string | null;
  steps: PolicyStep[];
  isActive: boolean;
}

export const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  LEAVE: 'Time off',
  EXPENSE: 'Expense',
  ATTENDANCE_REGULARIZATION: 'Attendance',
  SEPARATION: 'Separation',
  JOB_REQUISITION: 'Requisition',
};
