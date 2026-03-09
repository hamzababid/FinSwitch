/**
 * Password Service Tests
 */

import { PasswordService } from '../PasswordService';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(passwordService.isValidBcryptHash(hash)).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should reject passwords shorter than 8 characters', async () => {
      const password = 'Short1!';
      await expect(passwordService.hashPassword(password)).rejects.toThrow();
    });

    it('should reject empty passwords', async () => {
      await expect(passwordService.hashPassword('')).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hashPassword(password);
      const isValid = await passwordService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123!';
      const wrongPassword = 'WrongPass123!';
      const hash = await passwordService.hashPassword(password);
      const isValid = await passwordService.verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hashPassword(password);
      const isValid = await passwordService.verifyPassword('securepass123!', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = passwordService.validatePasswordStrength('SecurePass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without uppercase', () => {
      const result = passwordService.validatePasswordStrength('securepass123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = passwordService.validatePasswordStrength('SECUREPASS123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = passwordService.validatePasswordStrength('SecurePass!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = passwordService.validatePasswordStrength('SecurePass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = passwordService.validatePasswordStrength('Sec1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return multiple errors for weak password', () => {
      const result = passwordService.validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('isValidBcryptHash', () => {
    it('should recognize valid bcrypt hash', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hashPassword(password);
      expect(passwordService.isValidBcryptHash(hash)).toBe(true);
    });

    it('should reject invalid hash format', () => {
      expect(passwordService.isValidBcryptHash('invalid-hash')).toBe(false);
      expect(passwordService.isValidBcryptHash('$2a$10$short')).toBe(false);
      expect(passwordService.isValidBcryptHash('')).toBe(false);
    });
  });

  describe('getCostFactor', () => {
    it('should extract cost factor from hash', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hashPassword(password);
      const costFactor = passwordService.getCostFactor(hash);

      expect(costFactor).toBeGreaterThanOrEqual(10);
    });

    it('should return null for invalid hash', () => {
      expect(passwordService.getCostFactor('invalid-hash')).toBeNull();
    });
  });
});
