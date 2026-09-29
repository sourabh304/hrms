import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { assertPermission, AuthUser, requireEmployeeId } from '../auth/auth-user.js';
import { Permission } from '../auth/roles.js';
import type { Scope } from '../dto/pagination.dto.js';

/**
 * Restrict a query to the requested data scope:
 *  - me   → records owned by the current employee
 *  - team → records of the current employee's direct reports
 *  - all  → everything (requires the feature's manage permission)
 *
 * `employeeAlias` must be an alias already joined to the owning Employee.
 */
export function applyScope<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  opts: { scope: Scope; user: AuthUser; employeeAlias: string; permission: Permission },
): SelectQueryBuilder<T> {
  const { scope, user, employeeAlias, permission } = opts;
  if (scope === 'all') {
    assertPermission(user, permission);
    return qb;
  }
  const me = requireEmployeeId(user);
  if (scope === 'team') {
    return qb.andWhere(`${employeeAlias}.managerId = :scopeMe`, { scopeMe: me });
  }
  return qb.andWhere(`${employeeAlias}.id = :scopeMe`, { scopeMe: me });
}
