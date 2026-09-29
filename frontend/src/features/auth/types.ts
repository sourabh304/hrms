export const PERMISSIONS = {
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_WRITE: 'employee:write',
  ORG_MANAGE: 'org:manage',
  ATTENDANCE_MANAGE: 'attendance:manage',
  LEAVE_MANAGE: 'leave:manage',
  PAYROLL_MANAGE: 'payroll:manage',
  RECRUITMENT_MANAGE: 'recruitment:manage',
  ONBOARDING_MANAGE: 'onboarding:manage',
  OFFBOARDING_MANAGE: 'offboarding:manage',
  PERFORMANCE_MANAGE: 'performance:manage',
  LEARNING_MANAGE: 'learning:manage',
  EXPENSE_MANAGE: 'expense:manage',
  ASSET_MANAGE: 'asset:manage',
  HELPDESK_MANAGE: 'helpdesk:manage',
  ANNOUNCEMENT_MANAGE: 'announcement:manage',
  ENGAGEMENT_MANAGE: 'engagement:manage',
  DOCUMENT_MANAGE: 'document:manage',
  ANALYTICS_VIEW: 'analytics:view',
  AUDIT_VIEW: 'audit:view',
  USER_MANAGE: 'user:manage',
  WORKFLOW_MANAGE: 'workflow:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN', 'RECRUITER', 'FINANCE', 'IT_ADMIN', 'MANAGER', 'EMPLOYEE'] as const;
export type Role = (typeof ROLES)[number];

export interface SessionEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  workEmail: string;
  avatarUrl: string | null;
  managerId: string | null;
  designation: { id: string; title: string; level: string } | null;
  department: { id: string; name: string } | null;
  location: { id: string; name: string; city: string } | null;
}

export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  isManager: boolean;
  directReports: number;
  employee: SessionEmployee | null;
}
