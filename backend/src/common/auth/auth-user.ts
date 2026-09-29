import { ForbiddenException } from '@nestjs/common';
import { Permission, Role } from './roles.js';

/** The authenticated principal attached to every request by the JWT strategy. */
export interface AuthUser {
  id: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  employeeId: string | null;
}

export function hasPermission(user: AuthUser, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

export function assertPermission(user: AuthUser, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}

export function requireEmployeeId(user: AuthUser): string {
  if (!user.employeeId) {
    throw new ForbiddenException('Your account is not linked to an employee profile');
  }
  return user.employeeId;
}

export const isSuperAdmin = (user: AuthUser) => user.roles.includes(Role.SUPER_ADMIN);
