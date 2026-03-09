/**
 * Password Service
 * Handles password hashing and verification using bcrypt
 * Implements Requirement 7.2
 */

import bcrypt from 'bcrypt';
import { config } from '../config';
import { logger } from '../utils/logger';

export class PasswordService {
  private readonly saltRounds: number;

  constructor() {
    this.saltRounds = config.bcrypt.saltRounds;
    
    if (this.saltRounds < 10) {
      throw new Error('BCRYPT_SALT_ROUNDS must be at least 10 for security');
    }
  }

  /**
   * Hash a password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const hash = await bcrypt.hash(password, this.saltRounds);
      logger.debug('Password hashed successfully');
      return hash;
    } catch (error: any) {
      logger.error('Failed to hash password', error);
      throw error;
    }
  }

  /**
   * Verify a password against a hash
   * @param password - Plain text password
   * @param hash - Hashed password to compare against
   * @returns True if password matches, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Handle PHP bcrypt format ($2y$) by converting to Node.js format ($2a$)
      // PHP uses $2y$ but the algorithm is compatible with $2a$
      let normalizedHash = hash;
      if (hash.startsWith('$2y$')) {
        normalizedHash = '$2a$' + hash.substring(4);
        logger.debug('Converted PHP bcrypt hash format to Node.js format');
      }

      const isMatch = await bcrypt.compare(password, normalizedHash);
      logger.debug('Password verification completed', { isMatch });
      return isMatch;
    } catch (error: any) {
      logger.error('Failed to verify password', error);
      throw error;
    }
  }
  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Object with validation result and error messages
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a hash is a valid bcrypt hash
   * @param hash - Hash to validate
   * @returns True if valid bcrypt hash
   */
  isValidBcryptHash(hash: string): boolean {
    // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
    const bcryptPattern = /^\$2[aby]\$\d{2}\$.{53}$/;
    return bcryptPattern.test(hash);
  }

  /**
   * Get the cost factor (salt rounds) from a bcrypt hash
   * @param hash - Bcrypt hash
   * @returns Cost factor or null if invalid
   */
  getCostFactor(hash: string): number | null {
    try {
      if (!this.isValidBcryptHash(hash)) {
        return null;
      }
      const costStr = hash.substring(4, 6);
      return parseInt(costStr, 10);
    } catch (error) {
      return null;
    }
  }
}
