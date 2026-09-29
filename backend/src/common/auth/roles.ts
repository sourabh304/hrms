/**
 * Role-based access control model.
 *
 * Every authenticated user gets employee self-service by default. Roles grant
 * additional permissions; team-level (manager) access is derived from the
 * reporting hierarchy at query time rather than from a permission.
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
  PAYROLL_ADMIN = 'PAYROLL_ADMIN',
  RECRUITER = 'RECRUITER',
  FINANCE = 'FINANCE',
  IT_ADMIN = 'IT_ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum Permission {
  EMPLOYEE_READ = 'employee:read',
  EMPLOYEE_WRITE = 'employee:write',
  ORG_MANAGE = 'org:manage',
  ATTENDANCE_MANAGE = 'attendance:manage',
  LEAVE_MANAGE = 'leave:manage',
  PAYROLL_MANAGE = 'payroll:manage',
  RECRUITMENT_MANAGE = 'recruitment:manage',
  ONBOARDING_MANAGE = 'onboarding:manage',
  OFFBOARDING_MANAGE = 'offboarding:manage',
  PERFORMANCE_MANAGE = 'performance:manage',
  LEARNING_MANAGE = 'learning:manage',
  EXPENSE_MANAGE = 'expense:manage',
  ASSET_MANAGE = 'asset:manage',
  HELPDESK_MANAGE = 'helpdesk:manage',
  ANNOUNCEMENT_MANAGE = 'announcement:manage',
  ENGAGEMENT_MANAGE = 'engagement:manage',
  DOCUMENT_MANAGE = 'document:manage',
  ANALYTICS_VIEW = 'analytics:view',
  AUDIT_VIEW = 'audit:view',
  USER_MANAGE = 'user:manage',
  WORKFLOW_MANAGE = 'workflow:manage',
}

const ALL_PERMISSIONS = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: ALL_PERMISSIONS,
  [Role.HR_ADMIN]: ALL_PERMISSIONS.filter((p) => p !== Permission.AUDIT_VIEW),
  [Role.PAYROLL_ADMIN]: [
    Permission.EMPLOYEE_READ,
    Permission.PAYROLL_MANAGE,
    Permission.ANALYTICS_VIEW,
  ],
  [Role.RECRUITER]: [
    Permission.EMPLOYEE_READ,
    Permission.RECRUITMENT_MANAGE,
    Permission.ONBOARDING_MANAGE,
  ],
  [Role.FINANCE]: [
    Permission.EMPLOYEE_READ,
    Permission.EXPENSE_MANAGE,
    Permission.ANALYTICS_VIEW,
  ],
  [Role.IT_ADMIN]: [
    Permission.EMPLOYEE_READ,
    Permission.ASSET_MANAGE,
    Permission.HELPDESK_MANAGE,
  ],
  [Role.MANAGER]: [Permission.EMPLOYEE_READ],
  [Role.EMPLOYEE]: [Permission.EMPLOYEE_READ],
};

export function permissionsForRoles(roles: Role[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p);
  }
  return [...set];
}
