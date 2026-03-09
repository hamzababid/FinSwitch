/**
 * Role Repository
 * Data access layer for role operations
 * Implements Requirement 7.3
 */

import { Role, IRole } from '../models/Role';
import { logger } from '../utils/logger';

export class RoleRepository {
  /**
   * Find role by name
   */
  async findByName(roleName: string): Promise<IRole | null> {
    try {
      return await Role.findOne({ roleName });
    } catch (error: any) {
      logger.error('Failed to find role by name', error, { roleName });
      throw error;
    }
  }

  /**
   * Find all roles
   */
  async findAll(): Promise<IRole[]> {
    try {
      return await Role.find().sort({ roleName: 1 });
    } catch (error: any) {
      logger.error('Failed to find all roles', error);
      throw error;
    }
  }

  /**
   * Find multiple roles by names
   */
  async findByNames(roleNames: string[]): Promise<IRole[]> {
    try {
      return await Role.find({ roleName: { $in: roleNames } });
    } catch (error: any) {
      logger.error('Failed to find roles by names', error, { roleNames });
      throw error;
    }
  }

  /**
   * Validate that all role names exist
   */
  async validateRoles(roleNames: string[]): Promise<boolean> {
    try {
      const roles = await this.findByNames(roleNames);
      return roles.length === roleNames.length;
    } catch (error: any) {
      logger.error('Failed to validate roles', error, { roleNames });
      throw error;
    }
  }

  /**
   * Get permissions for roles
   */
  async getPermissionsForRoles(roleNames: string[]): Promise<Map<string, Set<string>>> {
    try {
      const roles = await this.findByNames(roleNames);
      const permissionMap = new Map<string, Set<string>>();

      roles.forEach(role => {
        role.permissions.forEach(permission => {
          if (!permissionMap.has(permission.resource)) {
            permissionMap.set(permission.resource, new Set());
          }
          const actions = permissionMap.get(permission.resource)!;
          permission.actions.forEach(action => actions.add(action));
        });
      });

      return permissionMap;
    } catch (error: any) {
      logger.error('Failed to get permissions for roles', error, { roleNames });
      throw error;
    }
  }
}
