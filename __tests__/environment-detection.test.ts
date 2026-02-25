import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  getClientEnvironment, 
  getServerEnvironment, 
  getEnvironment,
  shouldShowDemoFeatures,
  shouldEnablePWA,
  getEnvironmentConfig 
} from '../shared/utils';

// Mock environment variables for testing
const originalEnv = process.env;
const originalWindow = global.window;

describe('Environment Detection Utilities', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    
    // Mock window object for client-side tests
    global.window = {
      ...originalWindow,
      location: {
        hostname: 'localhost'
      }
    } as any;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    global.window = originalWindow;
  });

  describe('getClientEnvironment()', () => {
    it('should detect localhost correctly', () => {
      (global.window as any).location.hostname = 'localhost';
      const env = getClientEnvironment();
      
      expect(env.isLocalhost).toBe(true);
      expect(env.isReplit).toBe(false);
      expect(env.environment).toBe('localhost');
    });

    it('should detect Replit correctly', () => {
      (global.window as any).location.hostname = 'my-app.replit.dev';
      const env = getClientEnvironment();
      
      expect(env.isReplit).toBe(true);
      expect(env.isLocalhost).toBe(false);
      expect(env.environment).toBe('replit');
    });

    it('should detect production correctly', () => {
      process.env.NODE_ENV = 'production';
      (global.window as any).location.hostname = 'example.com';
      const env = getClientEnvironment();
      
      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
      expect(env.environment).toBe('production');
    });

    it('should handle server-side rendering', () => {
      // Remove window object to simulate SSR
      delete (global as any).window;
      const env = getClientEnvironment();
      
      expect(env.isLocalhost).toBe(false);
      expect(env.isReplit).toBe(false);
      expect(env.environment).toBe('development');
    });
  });

  describe('getServerEnvironment()', () => {
    it('should detect localhost correctly', () => {
      process.env.NODE_ENV = 'development';
      const env = getServerEnvironment();
      
      expect(env.isLocalhost).toBe(true);
      expect(env.isDevelopment).toBe(true);
    });

    it('should detect Replit correctly', () => {
      process.env.REPL_ID = 'test-repl-id';
      const env = getServerEnvironment();
      
      expect(env.isReplit).toBe(true);
      expect(env.environment).toBe('replit');
    });

    it('should detect database mode correctly', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      const env = getServerEnvironment();
      
      expect(env.isMemoryStorage).toBe(false);
      expect(env.isLocalhost).toBe(false);
    });

    it('should detect memory storage correctly', () => {
      delete process.env.DATABASE_URL;
      delete process.env.PRIVATE_DATABASE_URL;
      const env = getServerEnvironment();
      
      expect(env.isMemoryStorage).toBe(true);
    });
  });

  describe('getEnvironment()', () => {
    it('should work on both client and server side', () => {
      // Test client-side
      (global.window as any).location.hostname = 'localhost';
      let env = getEnvironment();
      expect(env.isLocalhost).toBe(true);
      
      // Test server-side
      delete (global as any).window;
      env = getEnvironment();
      expect(env.environment).toBe('development');
    });
  });

  describe('shouldShowDemoFeatures()', () => {
    it('should return true for localhost', () => {
      (global.window as any).location.hostname = 'localhost';
      expect(shouldShowDemoFeatures()).toBe(true);
    });

    it('should return true for development', () => {
      process.env.NODE_ENV = 'development';
      delete (global as any).window;
      expect(shouldShowDemoFeatures()).toBe(true);
    });

    it('should return false for production', () => {
      process.env.NODE_ENV = 'production';
      (global.window as any).location.hostname = 'example.com';
      expect(shouldShowDemoFeatures()).toBe(false);
    });
  });

  describe('shouldEnablePWA()', () => {
    it('should return true for localhost', () => {
      (global.window as any).location.hostname = 'localhost';
      expect(shouldEnablePWA()).toBe(true);
    });

    it('should return true for Replit', () => {
      (global.window as any).location.hostname = 'my-app.replit.dev';
      expect(shouldEnablePWA()).toBe(true);
    });

    it('should return true for production', () => {
      process.env.NODE_ENV = 'production';
      (global.window as any).location.hostname = 'example.com';
      expect(shouldEnablePWA()).toBe(true);
    });
  });

  describe('getEnvironmentConfig()', () => {
    it('should return correct database config for localhost', () => {
      (global.window as any).location.hostname = 'localhost';
      const config = getEnvironmentConfig();
      
      expect(config.database.type).toBe('memory');
      expect(config.showDemoFeatures).toBe(true);
      expect(config.enablePWA).toBe(true);
    });

    it('should return correct database config for Replit', () => {
      (global.window as any).location.hostname = 'my-app.replit.dev';
      const config = getEnvironmentConfig();
      
      expect(config.database.type).toBe('replit');
      expect(config.showDemoFeatures).toBe(true);
      expect(config.enablePWA).toBe(true);
      expect(config.uploadStrategy).toBe('replit-object-storage');
    });

    it('should return correct database config for production', () => {
      process.env.NODE_ENV = 'production';
      (global.window as any).location.hostname = 'example.com';
      const config = getEnvironmentConfig();
      
      expect(config.database.type).toBe('memory');
      expect(config.showDemoFeatures).toBe(false);
      expect(config.enablePWA).toBe(true);
      expect(config.uploadStrategy).toBe('local-filesystem');
    });
  });

  describe('Edge Cases', () => {
    it('should handle 127.0.0.1 as localhost', () => {
      (global.window as any).location.hostname = '127.0.0.1';
      const env = getClientEnvironment();
      
      expect(env.isLocalhost).toBe(true);
      expect(env.environment).toBe('localhost');
    });

    it('should handle various Replit domains', () => {
      const replitDomains = [
        'my-app.replit.dev',
        'another-app.replit.app',
        'test.replit.co'
      ];
      
      replitDomains.forEach(domain => {
        (global.window as any).location.hostname = domain;
        const env = getClientEnvironment();
        expect(env.isReplit).toBe(true);
      });
    });

    it('should handle missing environment variables gracefully', () => {
      delete process.env.NODE_ENV;
      delete process.env.DATABASE_URL;
      delete process.env.REPL_ID;
      
      const env = getServerEnvironment();
      expect(env.environment).toBe('development');
      expect(env.isMemoryStorage).toBe(true);
    });
  });
});
