/**
 * Auth Service Tests
 */

import { AuthService } from '../AuthService';
import { IUser } from '../../models/User';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUser: Partial<IUser>;

  beforeEach(() => {
    authService = new AuthService();
    mockUser = {
      userId: 'user_123',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['Developer'],
    };
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const result = authService.generateToken(mockUser as IUser);

      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.user.userId).toBe(mockUser.userId);
      expect(result.user.username).toBe(mockUser.username);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.roles).toEqual(mockUser.roles);
    });

    it('should generate different tokens for same user', () => {
      const result1 = authService.generateToken(mockUser as IUser);
      // Wait a moment to ensure different iat
      const result2 = authService.generateToken(mockUser as IUser);

      expect(result1.token).not.toBe(result2.token);
    });

    it('should include all required payload fields', () => {
      const result = authService.generateToken(mockUser as IUser);
      const decoded = authService.decodeToken(result.token);

      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(mockUser.userId);
      expect(decoded!.username).toBe(mockUser.username);
      expect(decoded!.roles).toEqual(mockUser.roles);
      expect(decoded!.iat).toBeDefined();
      expect(decoded!.exp).toBeDefined();
    });
  });

  describe('validateToken', () => {
    it('should validate valid token', () => {
      const result = authService.generateToken(mockUser as IUser);
      const payload = authService.validateToken(result.token);

      expect(payload.userId).toBe(mockUser.userId);
      expect(payload.username).toBe(mockUser.username);
      expect(payload.roles).toEqual(mockUser.roles);
    });

    it('should reject invalid token', () => {
      expect(() => authService.validateToken('invalid-token')).toThrow('Invalid token');
    });

    it('should reject malformed token', () => {
      expect(() => authService.validateToken('not.a.token')).toThrow();
    });

    it('should reject empty token', () => {
      expect(() => authService.validateToken('')).toThrow();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const result = authService.generateToken(mockUser as IUser);
      expect(authService.isTokenExpired(result.token)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(authService.isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const result = authService.generateToken(mockUser as IUser);
      const expiration = authService.getTokenExpiration(result.token);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      expect(authService.getTokenExpiration('invalid-token')).toBeNull();
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return positive time for valid token', () => {
      const result = authService.generateToken(mockUser as IUser);
      const timeLeft = authService.getTimeUntilExpiration(result.token);

      expect(timeLeft).toBeGreaterThan(0);
      expect(timeLeft).toBeLessThanOrEqual(result.expiresIn);
    });

    it('should return 0 for invalid token', () => {
      expect(authService.getTimeUntilExpiration('invalid-token')).toBe(0);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const header = `Bearer ${token}`;
      
      expect(authService.extractTokenFromHeader(header)).toBe(token);
    });

    it('should reject header without Bearer prefix', () => {
      expect(() => authService.extractTokenFromHeader('token')).toThrow(
        'Invalid authorization header format'
      );
    });

    it('should reject undefined header', () => {
      expect(() => authService.extractTokenFromHeader(undefined)).toThrow(
        'Authorization header is required'
      );
    });

    it('should reject empty header', () => {
      expect(() => authService.extractTokenFromHeader('')).toThrow(
        'Authorization header is required'
      );
    });

    it('should reject malformed header', () => {
      expect(() => authService.extractTokenFromHeader('Bearer')).toThrow(
        'Invalid authorization header format'
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const result = authService.generateToken(mockUser as IUser);
      const decoded = authService.decodeToken(result.token);

      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(mockUser.userId);
    });

    it('should return null for invalid token', () => {
      expect(authService.decodeToken('invalid')).toBeNull();
    });
  });
});
