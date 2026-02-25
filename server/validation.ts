import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import { validationUtils } from "@shared/schema";

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Zod schema
 */
export function validateData(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('Validation middleware - validating', source, 'data:', req[source]);
    try {
      const dataToValidate = req[source];
      const validatedData = schema.parse(dataToValidate);
      console.log('Validation middleware - validation successful:', validatedData);
      
      // Replace the original data with validated and sanitized data
      req[source] = validatedData;
      next();
    } catch (error) {
      console.error('Validation middleware - validation failed:', error);
      if (error instanceof z.ZodError) {
        const friendlyErrors = error.errors.map(err => {
          const field = err.path.join('.');
          let friendlyMessage = err.message;
          
          // Add more context for specific validation errors
          if (err.code === 'invalid_string' && err.validation === 'email') {
            friendlyMessage = `${friendlyMessage}. Check for typos in your email address.`;
          } else if (err.code === 'too_small' && err.type === 'string') {
            friendlyMessage = `${friendlyMessage}. This field needs more characters.`;
          } else if (err.code === 'too_big' && err.type === 'string') {
            friendlyMessage = `${friendlyMessage}. Please shorten this field.`;
          } else if (err.code === 'invalid_string' && err.validation === 'regex') {
            friendlyMessage = `${friendlyMessage}. Please check the format requirements.`;
          }
          
          return {
            field: field,
            message: friendlyMessage,
            code: err.code,
            expected: (err as any).expected || undefined,
            received: (err as any).received || undefined
          };
        });
        
        console.log('Validation middleware - returning validation errors:', friendlyErrors);
        return res.status(400).json({
          message: "Please fix the following issues:",
          errors: friendlyErrors,
          totalErrors: friendlyErrors.length
        });
      }
      
      console.error("Validation middleware error:", error);
      res.status(500).json({ message: "Internal validation error" });
    }
  };
}

/**
 * Sanitization utilities
 */
export const sanitizers = {
  /**
   * Sanitize string input to prevent XSS and other attacks
   */
  sanitizeString: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  },

  /**
   * Sanitize email input
   */
  sanitizeEmail: (email: string): string => {
    return email.toLowerCase().trim().substring(0, 254);
  },

  /**
   * Sanitize phone number
   */
  sanitizePhone: (phone: string): string => {
    return phone.replace(/[^\d\+\-\(\)\s]/g, '').substring(0, 20);
  },

  /**
   * Sanitize name input
   */
  sanitizeName: (name: string): string => {
    return name
      .trim()
      .replace(/[^\w\s\.\'-]/g, '') // Only allow word chars, spaces, dots, apostrophes, hyphens
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 100);
  },

  /**
   * Sanitize unit number
   */
  sanitizeunitNumber: (unitNumber: string): string => {
    return unitNumber.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
  }
};

/**
 * Advanced validation rules
 */
export const validators = {
  /**
   * Check if a date is within business rules
   */
  isValidBusinessDate: (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    return date >= today && date <= oneYearFromNow;
  },

  /**
   * Validate Malaysian IC number format and checksum
   */
  isValidMalaysianIC: (ic: string): boolean => {
    return validationUtils.isValidMalaysianIC(ic);
  },

  /**
   * Check if password meets strength requirements
   */
  isStrongPassword: (password: string): {
    isValid: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];
    
    if (password.length < 6) {
      issues.push("Password must be at least 6 characters long");
    }
    
    // Simple requirements - just need letters and numbers
    if (!/[a-zA-Z]/.test(password)) {
      issues.push("Password must contain at least one letter");
    }
    
    if (!/\d/.test(password)) {
      issues.push("Password must contain at least one number");
    }
    
    // Check for extremely weak patterns only
    const veryWeakPasswords = [
      '123456',
      'password',
      '000000',
      '111111',
      'qwerty'
    ];
    
    if (veryWeakPasswords.includes(password.toLowerCase())) {
      issues.push("Password is too common. Please choose a different password");
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  },

  /**
   * Validate phone number format for different countries
   */
  isValidInternationalPhone: (phone: string): boolean => {
    // Remove all non-digit characters except + at the start
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Check various international phone number patterns
    const patterns = [
      /^\+60\d{8,10}$/, // Malaysia
      /^\+65\d{8}$/, // Singapore
      /^\+86\d{11}$/, // China
      /^\+1\d{10}$/, // US/Canada
      /^\+44\d{10}$/, // UK
      /^\+\d{7,15}$/, // General international format
      /^60\d{8,10}$/, // Malaysia without +
      /^65\d{8}$/, // Singapore without +
      /^86\d{11}$/, // China without +
      /^1\d{10}$/, // US/Canada without +
      /^44\d{10}$/, // UK without +
      /^\d{7,15}$/ // General format without +
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  },

  /**
   * Check if email domain is valid
   */
  isValidEmailDomain: async (email: string): Promise<boolean> => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // List of known disposable email domains to block
    const blockedDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com'
    ];
    
    return !blockedDomains.includes(domain.toLowerCase());
  },

  /**
   * Validate unit number format and check if it exists
   */
  isValidunitFormat: (unitNumber: string): boolean => {
    // Must be in format like C1, C2, C24 etc.
    return /^C\d+$/.test(unitNumber);
  }
};

/**
 * Rate limiting validation
 */
export const rateLimitValidation = {
  /**
   * Check if request rate is within limits
   */
  checkRateLimit: (req: Request, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): boolean => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // This would typically use Redis or a similar store in production
    // For demo purposes, we'll use a simple in-memory store
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }
    
    const key = `rate_limit_${ip}`;
    const requests = global.rateLimitStore.get(key) || [];
    
    // Remove requests outside the time window
    const validRequests = requests.filter((timestamp: number) => now - timestamp < windowMs);
    
    // Check if under limit
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    global.rateLimitStore.set(key, validRequests);
    
    return true;
  }
};

/**
 * Security validation helpers
 */
export const securityValidation = {
  /**
   * Check for SQL injection patterns
   */
  hasSQLInjection: (input: string): boolean => {
    const sqlPatterns = [
      // Only block actual SQL keywords and dangerous patterns
      /(union\s+select|select\s+union)/i,
      /(insert\s+into|update\s+set|delete\s+from)/i,
      /(drop\s+table|create\s+table|alter\s+table)/i,
      /(exec\s*\(|execute\s*\(|sp_executesql)/i,
      /(\-\-|\/\*|\*\/)/i, // SQL comments
      /(xp_cmdshell|sp_configure)/i // Dangerous stored procedures
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  },

  /**
   * Check for XSS patterns
   */
  hasXSSAttempt: (input: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src[^>]*=.*?>/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  },

  /**
   * Sanitize input to prevent common attacks
   */
  sanitizeForSecurity: (input: string): string => {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }
};

/**
 * Validation middleware for common security checks
 */
export const securityValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('Security validation middleware - checking request');
  
  const checkInput = (obj: any, path: string = ''): Response | undefined => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const currentPath = path ? `${path}.${key}` : key;
        // Skip sanitizing known safe large fields like base64 images/URLs
        if (currentPath === 'profilePhotoUrl') {
          continue;
        }
        
        if (securityValidation.hasSQLInjection(obj[key])) {
          console.log('Security validation - SQL injection detected in:', currentPath);
          return res.status(400).json({
            message: "Security Issue Detected",
            error: `The ${currentPath} field contains potentially harmful characters. Please remove any SQL-related keywords and special characters.`,
            field: currentPath,
            suggestion: "Try using only letters, numbers, and common punctuation."
          });
        }
        
        if (securityValidation.hasXSSAttempt(obj[key])) {
          console.log('Security validation - XSS attempt detected in:', currentPath);
          return res.status(400).json({
            message: "Security Issue Detected",
            error: `The ${currentPath} field contains potentially harmful code. Please remove any HTML tags, scripts, or javascript code.`,
            field: currentPath,
            suggestion: "Please enter plain text only without HTML or code."
          });
        }
        
        // Sanitize the input
        obj[key] = securityValidation.sanitizeForSecurity(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        const result: Response | undefined = checkInput(obj[key], path ? `${path}.${key}` : key);
        if (result) return result;
      }
    }
  };
  
  // Check all input sources
  if (req.body && typeof req.body === 'object') {
    console.log('Security validation - checking body:', req.body);
    const result = checkInput(req.body);
    if (result) return result;
  }
  
  if (req.query && typeof req.query === 'object') {
    console.log('Security validation - checking query:', req.query);
    const result = checkInput(req.query);
    if (result) return result;
  }
  
  if (req.params && typeof req.params === 'object') {
    console.log('Security validation - checking params:', req.params);
    const result = checkInput(req.params);
    if (result) return result;
  }
  
  console.log('Security validation - passed, calling next()');
  next();
};

declare global {
  var rateLimitStore: Map<string, number[]>;
}
