import { Role } from '../../common/auth/roles.js';

/** Business processes that route through the approval engine. */
export enum WorkflowType {
  LEAVE = 'LEAVE',
  EXPENSE = 'EXPENSE',
  ATTENDANCE_REGULARIZATION = 'ATTENDANCE_REGULARIZATION',
  SEPARATION = 'SEPARATION',
  JOB_REQUISITION = 'JOB_REQUISITION',
}

export enum ApproverType {
  MANAGER = 'MANAGER',
  SKIP_LEVEL_MANAGER = 'SKIP_LEVEL_MANAGER',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  ROLE = 'ROLE',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum StepStatus {
  WAITING = 'WAITING',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SKIPPED = 'SKIPPED',
}

export interface PolicyCondition {
  /** Key in the request metadata, e.g. `amount` or `days`. */
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: number | string;
}

export interface PolicyStep {
  label: string;
  approverType: ApproverType;
  role?: Role;
  /** Step only applies when the condition holds. */
  condition?: PolicyCondition;
}

/** Emitted once a request reaches a terminal decision. Features listen and update their entity. */
export const WORKFLOW_DECIDED = 'workflow.decided';

export interface WorkflowDecidedEvent {
  requestId: string;
  type: WorkflowType;
  entityId: string;
  status: RequestStatus.APPROVED | RequestStatus.REJECTED;
  decidedByEmployeeId: string | null;
  comment: string | null;
}

export const DEFAULT_POLICIES: {
  type: WorkflowType;
  name: string;
  description: string;
  steps: PolicyStep[];
}[] = [
  {
    type: WorkflowType.LEAVE,
    name: 'Time Off Request',
    description: 'Reporting manager approves; HR also approves requests longer than 5 days.',
    steps: [
      { label: 'Manager approval', approverType: ApproverType.MANAGER },
      {
        label: 'HR approval (extended leave)',
        approverType: ApproverType.ROLE,
        role: Role.HR_ADMIN,
        condition: { field: 'days', operator: 'gt', value: 5 },
      },
    ],
  },
  {
    type: WorkflowType.EXPENSE,
    name: 'Expense Claim',
    description: 'Manager → skip-level for claims above 2,000 → Finance verification.',
    steps: [
      { label: 'Manager approval', approverType: ApproverType.MANAGER },
      {
        label: 'Skip-level approval',
        approverType: ApproverType.SKIP_LEVEL_MANAGER,
        condition: { field: 'amount', operator: 'gt', value: 2000 },
      },
      { label: 'Finance verification', approverType: ApproverType.ROLE, role: Role.FINANCE },
    ],
  },
  {
    type: WorkflowType.ATTENDANCE_REGULARIZATION,
    name: 'Attendance Regularization',
    description: 'Reporting manager approves corrections to attendance records.',
    steps: [{ label: 'Manager approval', approverType: ApproverType.MANAGER }],
  },
  {
    type: WorkflowType.SEPARATION,
    name: 'Resignation / Separation',
    description: 'Reporting manager, then HR confirms last working day.',
    steps: [
      { label: 'Manager acknowledgement', approverType: ApproverType.MANAGER },
      { label: 'HR approval', approverType: ApproverType.ROLE, role: Role.HR_ADMIN },
    ],
  },
  {
    type: WorkflowType.JOB_REQUISITION,
    name: 'Job Requisition',
    description: 'Department head, then HR approves new headcount before the job opens.',
    steps: [
      { label: 'Department head approval', approverType: ApproverType.DEPARTMENT_HEAD },
      { label: 'HR headcount approval', approverType: ApproverType.ROLE, role: Role.HR_ADMIN },
    ],
  },
];
