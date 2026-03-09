/**
 * User Management Service
 * Business logic for user CRUD operations
 * Implements Requirements 7.1, 7.7
 */

import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/UserRepository';
import { PasswordService } from './PasswordService';
import { AuditLogger } from './AuditLogger';
import { logger } from '../utils/logger';
import { 
  ValidationError, 
  NotFoundError,
  AuthorizationError,
  DatabaseError 
} from '@finswitch/shared';
import { IUser } from '../models/User';

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  roles: string[];
  createdBy: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  };
}

export interface UpdateUserDTO {
  email?: string;
  roles?: string[];
  isActive?: boolean;
  lastModifiedBy: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  };
}

export interface UserResponseDTO {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedUsersResponse {
  users: UserResponseDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UserManagementService {
  private userRepository: UserRepository;
  private passwordService: PasswordService;
  private auditLogger: AuditLogger;
  private readonly validRoles = ['Admin', 'Operations', 'Auditor', 'Developer'];

  constructor() {
    this.userRepository = new UserRepository();
    this.passwordService = new PasswordService();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
    // Validate required fields
    this.validateRequiredFields(dto);

    // Validate email format
    this.validateEmail(dto.email);

    // Validate password strength
    this.validatePassword(dto.password);

    // Validate roles
    this.validateRoles(dto.roles);

    // Check for existing username
    await this.checkUsernameAvailability(dto.username);

    // Check for existing email
    await this.checkEmailAvailability(dto.email);

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // Create user
    const userId = uuidv4();
    const user = await this.userRepository.create({
      userId,
      username: dto.username,
      email: dto.email,
      passwordHash,
      roles: dto.roles,
      createdBy: dto.createdBy,
    });

    logger.info('User created', {
      userId: user.userId,
      username: user.username,
      roles: user.roles,
      createdBy: dto.createdBy,
      correlationId: dto.metadata?.correlationId,
    });

    // Audit log
    await this.auditLogger.logUserCreated(
      dto.createdBy,
      dto.createdBy,
      user,
      dto.metadata
    );

    return this.sanitizeUser(user);
  }

  /**
   * Get paginated list of users
   */
  async listUsers(page: number, limit: number): Promise<PaginatedUsersResponse> {
    // Validate pagination parameters
    if (page < 1) {
      throw new ValidationError('Page must be greater than 0', 'page');
    }
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100', 'limit');
    }

    const { users, total } = await this.userRepository.findAll(page, limit);

    return {
      users: users.map(user => this.sanitizeUser(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID with authorization check
   */
  async getUserById(
    userId: string,
    requestingUserId: string,
    requestingUserRoles: string[],
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<UserResponseDTO> {
    // Authorization check: users can only view their own profile unless they're Admin
    if (requestingUserId !== userId && !requestingUserRoles.includes('Admin')) {
      throw new AuthorizationError('You can only view your own profile');
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Audit log
    await this.auditLogger.logUserViewed(
      requestingUserId,
      requestingUserId,
      user.userId,
      metadata
    );

    return this.sanitizeUser(user);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User', userId);
    }

    // Validate email if provided
    if (dto.email) {
      this.validateEmail(dto.email);
      await this.checkEmailAvailability(dto.email, userId);
    }

    // Validate roles if provided
    if (dto.roles) {
      this.validateRoles(dto.roles);
    }

    // Update user
    const updatedUser = await this.userRepository.update(userId, {
      email: dto.email,
      roles: dto.roles,
      isActive: dto.isActive,
      lastModifiedBy: dto.lastModifiedBy,
    });

    if (!updatedUser) {
      throw new DatabaseError('Failed to update user');
    }

    logger.info('User updated', {
      userId: updatedUser.userId,
      username: updatedUser.username,
      lastModifiedBy: dto.lastModifiedBy,
      correlationId: dto.metadata?.correlationId,
    });

    // Audit log
    await this.auditLogger.logUserUpdated(
      dto.lastModifiedBy,
      dto.lastModifiedBy,
      userId,
      existingUser,
      updatedUser,
      dto.metadata
    );

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(
    userId: string,
    deactivatedBy: string,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User', userId);
    }

    // Prevent self-deactivation
    if (deactivatedBy === userId) {
      throw new ValidationError('You cannot deactivate your own account');
    }

    // Deactivate user
    const success = await this.userRepository.deactivate(userId, deactivatedBy);

    if (!success) {
      throw new DatabaseError('Failed to deactivate user');
    }

    logger.info('User deactivated', {
      userId,
      username: existingUser.username,
      deactivatedBy,
      correlationId: metadata?.correlationId,
    });

    // Audit log
    await this.auditLogger.logUserDeactivated(
      deactivatedBy,
      deactivatedBy,
      existingUser,
      metadata
    );
  }

  /**
   * Private helper methods
   */

  private validateRequiredFields(dto: CreateUserDTO): void {
    if (!dto.username || !dto.email || !dto.password || !dto.roles) {
      throw new ValidationError('Username, email, password, and roles are required');
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
  }

  private validatePassword(password: string): void {
    const passwordValidation = this.passwordService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new ValidationError(
        passwordValidation.errors.join(', '),
        'password',
        { errors: passwordValidation.errors }
      );
    }
  }

  private validateRoles(roles: string[]): void {
    const invalidRoles = roles.filter(role => !this.validRoles.includes(role));
    if (invalidRoles.length > 0) {
      throw new ValidationError(
        `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${this.validRoles.join(', ')}`,
        'roles'
      );
    }
  }

  private async checkUsernameAvailability(username: string): Promise<void> {
    const existingUsername = await this.userRepository.usernameExists(username);
    if (existingUsername) {
      throw new ValidationError('Username already exists', 'username');
    }
  }

  private async checkEmailAvailability(email: string, excludeUserId?: string): Promise<void> {
    const emailUser = await this.userRepository.findByEmail(email);
    if (emailUser && emailUser.userId !== excludeUserId) {
      throw new ValidationError('Email already exists', 'email');
    }
  }

  private sanitizeUser(user: IUser): UserResponseDTO {
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
