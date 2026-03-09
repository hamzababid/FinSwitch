/**
 * User Repository
 * Data access layer for user operations
 * Implements Requirements 7.1, 7.6
 */

import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';

export interface CreateUserDTO {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  roles: string[];
  createdBy: string;
}

export interface UpdateUserDTO {
  email?: string;
  roles?: string[];
  isActive?: boolean;
  lastModifiedBy: string;
}

export class UserRepository {
  /**
   * Create a new user
   */
  async create(data: CreateUserDTO): Promise<IUser> {
    try {
      const user = new User({
        userId: data.userId,
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        roles: data.roles,
        isActive: true,
        metadata: {
          createdBy: data.createdBy,
          lastModifiedBy: data.createdBy,
        },
      });

      await user.save();
      logger.info('User created', { userId: user.userId, username: user.username });
      return user;
    } catch (error: any) {
      logger.error('Failed to create user', error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<IUser | null> {
    try {
      return await User.findOne({ username, isActive: true });
    } catch (error: any) {
      logger.error('Failed to find user by username', error, { username });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email: email.toLowerCase(), isActive: true });
    } catch (error: any) {
      logger.error('Failed to find user by email', error, { email });
      throw error;
    }
  }

  /**
   * Find user by userId
   */
  async findById(userId: string): Promise<IUser | null> {
    try {
      return await User.findOne({ userId, isActive: true });
    } catch (error: any) {
      logger.error('Failed to find user by ID', error, { userId });
      throw error;
    }
  }

  /**
   * Find all users with pagination
   */
  async findAll(page: number = 1, limit: number = 50): Promise<{ users: IUser[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find({ isActive: true })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments({ isActive: true }),
      ]);

      return { users, total };
    } catch (error: any) {
      logger.error('Failed to find all users', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(userId: string, data: UpdateUserDTO): Promise<IUser | null> {
    try {
      const updateData: any = {
        'metadata.lastModifiedBy': data.lastModifiedBy,
      };

      if (data.email !== undefined) {
        updateData.email = data.email.toLowerCase();
      }
      if (data.roles !== undefined) {
        updateData.roles = data.roles;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      const user = await User.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (user) {
        logger.info('User updated', { userId, updatedBy: data.lastModifiedBy });
      }

      return user;
    } catch (error: any) {
      logger.error('Failed to update user', error, { userId });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await User.updateOne({ userId }, { $set: { lastLoginAt: new Date() } });
      logger.debug('Updated last login', { userId });
    } catch (error: any) {
      logger.error('Failed to update last login', error, { userId });
      // Don't throw - this is not critical
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(userId: string, deactivatedBy: string): Promise<boolean> {
    try {
      const result = await User.updateOne(
        { userId },
        {
          $set: {
            isActive: false,
            'metadata.lastModifiedBy': deactivatedBy,
          },
        }
      );

      const success = result.modifiedCount > 0;
      if (success) {
        logger.info('User deactivated', { userId, deactivatedBy });
      }

      return success;
    } catch (error: any) {
      logger.error('Failed to deactivate user', error, { userId });
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    try {
      const count = await User.countDocuments({ username });
      return count > 0;
    } catch (error: any) {
      logger.error('Failed to check username existence', error, { username });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await User.countDocuments({ email: email.toLowerCase() });
      return count > 0;
    } catch (error: any) {
      logger.error('Failed to check email existence', error, { email });
      throw error;
    }
  }
}
