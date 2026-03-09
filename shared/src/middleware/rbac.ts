/**
 * Role-Based Access Control (RBAC) middleware
 * Implements Requirements 7.5, 7.7
 */

import { AuthorizationError } from '../errors';
import { JWTPayload } from './auth';

/**
 * Resource types in the system
 */
export type Resource = 
  | 'payments' 
  | 'users' 
  | 'routing' 
  | 'settlements' 
  | 'reconciliation' 
  | 'audit';

/**
 * Action types
 */
export type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * Permission definition
 */
export interface Permission {
  resource: Resource;
  actions: Action[];
}

/**
 * Role definitions with permissions
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  Admin: [
    { resource: 'payments', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'routing', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'settlements', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reconciliation', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'audit', actions: ['read'] }
  ],
  Operations: [
    { resource: 'payments', actions: ['read'] },
    { resource: 'routing', actions: ['create', 'read', 'update'] },
    { resource: 'settlements', actions: ['create', 'read'] },
    { resource: 'reconciliation', actions: ['read'] }
  ],
  Auditor: [
    { resource: 'payments', actions: ['read'] },
    { resource: 'settlements', actions: ['read'] },
    { resource: 'reconciliation', actions: ['read'] },
    { resource: 'audit', actions: ['read'] }
  ],
  Developer: [
    { resource: 'payments', actions: ['create', 'read'] },
    { resource: 'routing', actions: ['read'] }
  ]
};

/**
 * Check if user has permission for a resource and action
 */
export function hasPermission(
  userRoles: string[],
  resource: Resource,
  action: Action
): boolean {
  return userRoles.some(role => {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) {
      return false;
    }

    return permissions.some(
      permission =>
        permission.resource === resource &&
        permission.actions.includes(action)
    );
  });
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.every(role => userRoles.includes(role));
}

/**
 * Verify user has required permission
 * Throws AuthorizationError if not authorized
 */
export function requirePermission(
  user: JWTPayload | undefined,
  resource: Resource,
  action: Action
): void {
  if (!user) {
    throw new AuthorizationError('Authentication required');
  }

  if (!hasPermission(user.roles, resource, action)) {
    throw new AuthorizationError(
      `Insufficient permissions. Required: ${action} on ${resource}`
    );
  }
}

/**
 * Verify user has at least one of the required roles
 * Throws AuthorizationError if not authorized
 */
export function requireAnyRole(
  user: JWTPayload | undefined,
  requiredRoles: string[]
): void {
  if (!user) {
    throw new AuthorizationError('Authentication required');
  }

  if (!hasAnyRole(user.roles, requiredRoles)) {
    throw new AuthorizationError(
      `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`
    );
  }
}

/**
 * Get all permissions for a user's roles
 */
export function getUserPermissions(userRoles: string[]): Permission[] {
  const allPermissions: Permission[] = [];
  const resourceMap = new Map<Resource, Set<Action>>();

  userRoles.forEach(role => {
    const permissions = ROLE_PERMISSIONS[role];
    if (permissions) {
      permissions.forEach(permission => {
        if (!resourceMap.has(permission.resource)) {
          resourceMap.set(permission.resource, new Set());
        }
        const actions = resourceMap.get(permission.resource)!;
        permission.actions.forEach(action => actions.add(action));
      });
    }
  });

  resourceMap.forEach((actions, resource) => {
    allPermissions.push({
      resource,
      actions: Array.from(actions)
    });
  });

  return allPermissions;
}
