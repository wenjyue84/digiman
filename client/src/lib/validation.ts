import { z } from "zod";

/**
 * Client-side validation utilities
 * These complement the server-side validation for better UX
 */

/**
 * Real-time validation helpers for forms
 */
export const clientValidation = {
  /**
   * Validate email as user types
   */
  validateEmailRealTime: (email: string): { isValid: boolean; message?: string } => {
    if (!email) return { isValid: true }; // Empty is valid for optional fields
    
    if (email.length < 5) {
      return { isValid: false, message: "Email too short" };
    }
    
    if (email.length > 254) {
      return { isValid: false, message: "Email too long" };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Invalid email format" };
    }
    
    return { isValid: true };
  },

  /**
   * Validate phone number as user types
   */
  validatePhoneRealTime: (phone: string): { isValid: boolean; message?: string } => {
    if (!phone) return { isValid: true }; // Empty is valid for optional fields
    
    // Remove spaces and special characters for length check
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    
    if (cleaned.length < 7) {
      return { isValid: false, message: "Phone number too short" };
    }
    
    if (cleaned.length > 20) {
      return { isValid: false, message: "Phone number too long" };
    }
    
    const phoneRegex = /^[+]?[\d\s\-\(\)]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return { isValid: false, message: "Invalid phone number format" };
    }
    
    return { isValid: true };
  },

  /**
   * Validate name as user types
   */
  validateNameRealTime: (name: string): { isValid: boolean; message?: string } => {
    if (!name) return { isValid: true }; // Handle required/optional in schema
    
    if (name.length < 2) {
      return { isValid: false, message: "Name too short" };
    }
    
    if (name.length > 100) {
      return { isValid: false, message: "Name too long" };
    }
    
    const nameRegex = /^[a-zA-Z\s.'-]+$/;
    if (!nameRegex.test(name)) {
      return { isValid: false, message: "Name contains invalid characters" };
    }
    
    return { isValid: true };
  },

  /**
   * Validate password strength as user types
   */
  validatePasswordRealTime: (password: string): { 
    isValid: boolean; 
    strength: 'weak' | 'medium' | 'strong';
    issues: string[];
  } => {
    const issues: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else issues.push("At least 8 characters");

    if (/[a-z]/.test(password)) score += 1;
    else issues.push("One lowercase letter");

    if (/[A-Z]/.test(password)) score += 1;
    else issues.push("One uppercase letter");

    if (/\d/.test(password)) score += 1;
    else issues.push("One number");

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else issues.push("One special character");

    let strength: 'weak' | 'medium' | 'strong';
    if (score < 3) strength = 'weak';
    else if (score < 5) strength = 'medium';
    else strength = 'strong';

    return {
      isValid: score >= 4,
      strength,
      issues
    };
  },

  /**
   * Validate Malaysian IC number
   */
  validateMalaysianIC: (ic: string): { isValid: boolean; message?: string } => {
    if (!ic) return { isValid: true }; // Optional field
    
    const icRegex = /^\d{6}-\d{2}-\d{4}$/;
    if (!icRegex.test(ic)) {
      return { isValid: false, message: "IC must be in format XXXXXX-XX-XXXX" };
    }

    // Validate birth date portion
    const datePart = ic.substring(0, 6);
    const year = parseInt(datePart.substring(0, 2));
    const month = parseInt(datePart.substring(2, 4));
    const day = parseInt(datePart.substring(4, 6));
    
    const fullYear = year < 30 ? 2000 + year : 1900 + year;
    const date = new Date(fullYear, month - 1, day);
    
    if (date.getFullYear() !== fullYear || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day ||
        month < 1 || month > 12 ||
        day < 1 || day > 31) {
      return { isValid: false, message: "IC contains invalid birth date" };
    }

    return { isValid: true };
  },

  /**
   * Validate passport number
   */
  validatePassport: (passport: string): { isValid: boolean; message?: string } => {
    if (!passport) return { isValid: true }; // Optional field
    
    if (passport.length < 6) {
      return { isValid: false, message: "Passport number too short" };
    }
    
    if (passport.length > 15) {
      return { isValid: false, message: "Passport number too long" };
    }
    
    const passportRegex = /^[A-Z0-9]+$/;
    if (!passportRegex.test(passport.toUpperCase())) {
      return { isValid: false, message: "Passport can only contain letters and numbers" };
    }
    
    return { isValid: true };
  },

  /**
   * Validate capsule number
   */
  validateCapsuleNumber: (capsuleNumber: string): { isValid: boolean; message?: string } => {
    if (!capsuleNumber) {
      return { isValid: false, message: "Capsule number is required" };
    }
    
    const capsuleRegex = /^[A-Z]\d{2}$/;
    if (!capsuleRegex.test(capsuleNumber.toUpperCase())) {
      return { isValid: false, message: "Capsule number must be in format A01, B02, etc." };
    }
    
    return { isValid: true };
  },

  /**
   * Validate age
   */
  validateAge: (age: string): { isValid: boolean; message?: string } => {
    if (!age) return { isValid: true }; // Optional field
    
    if (!/^\d{1,3}$/.test(age)) {
      return { isValid: false, message: "Age must be a number" };
    }
    
    const ageNum = parseInt(age);
    if (ageNum < 16 || ageNum > 120) {
      return { isValid: false, message: "Age must be between 16 and 120" };
    }
    
    return { isValid: true };
  },

  /**
   * Validate payment amount
   */
  validatePaymentAmount: (amount: string): { isValid: boolean; message?: string } => {
    if (!amount || amount === "0") return { isValid: true }; // Allow zero/empty
    
    if (!/^\d*\.?\d{0,2}$/.test(amount)) {
      return { isValid: false, message: "Invalid amount format" };
    }
    
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0 || num > 9999.99) {
      return { isValid: false, message: "Amount must be between 0 and 9999.99" };
    }
    
    return { isValid: true };
  }
};

/**
 * Input formatters for better UX
 */
export const inputFormatters = {
  /**
   * Format phone number as user types
   */
  formatPhone: (input: string): string => {
    // Remove all non-digit characters except +
    let cleaned = input.replace(/[^\d+]/g, '');
    
    // Handle Malaysian phone numbers
    if (cleaned.startsWith('60') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    // Add formatting for Malaysian numbers (+60XXXXXXXXX)
    if (cleaned.startsWith('+60') && cleaned.length > 3) {
      const number = cleaned.substring(3);
      if (number.length <= 2) return cleaned;
      if (number.length <= 5) return `${cleaned.substring(0, 6)} ${number.substring(2)}`;
      if (number.length <= 8) return `${cleaned.substring(0, 6)} ${number.substring(2, 5)} ${number.substring(5)}`;
      return `${cleaned.substring(0, 6)} ${number.substring(2, 5)} ${number.substring(5, 9)}`;
    }
    
    return cleaned;
  },

  /**
   * Format IC number as user types
   */
  formatIC: (input: string): string => {
    // Remove all non-digit characters
    const cleaned = input.replace(/\D/g, '');
    
    // Format as XXXXXX-XX-XXXX
    if (cleaned.length <= 6) return cleaned;
    if (cleaned.length <= 8) return `${cleaned.substring(0, 6)}-${cleaned.substring(6)}`;
    return `${cleaned.substring(0, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8, 12)}`;
  },

  /**
   * Format name (title case)
   */
  formatName: (input: string): string => {
    return input
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Format capsule number
   */
  formatCapsuleNumber: (input: string): string => {
    return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  },

  /**
   * Format payment amount
   */
  formatPaymentAmount: (input: string): string => {
    // Only allow digits and one decimal point
    let cleaned = input.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts[1];
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  }
};

/**
 * Custom hooks for form validation
 */
export const useFormValidation = () => {
  const validateField = (value: string, validationFn: (val: string) => { isValid: boolean; message?: string }) => {
    const result = validationFn(value);
    return {
      isValid: result.isValid,
      errorMessage: result.message || null
    };
  };

  const validateRequired = (value: string, fieldName: string) => {
    if (!value || value.trim().length === 0) {
      return {
        isValid: false,
        errorMessage: `${fieldName} is required`
      };
    }
    return { isValid: true, errorMessage: null };
  };

  return {
    validateField,
    validateRequired
  };
};

/**
 * Validation schemas for common use cases
 */
export const quickValidation = {
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isPhone: (phone: string): boolean => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{7,20}$/;
    return phoneRegex.test(phone);
  },
  
  isName: (name: string): boolean => {
    const nameRegex = /^[a-zA-Z\s.'-]{2,100}$/;
    return nameRegex.test(name);
  },
  
  isCapsuleNumber: (capsule: string): boolean => {
    const capsuleRegex = /^[A-Z]\d{2}$/;
    return capsuleRegex.test(capsule.toUpperCase());
  },
  
  isIC: (ic: string): boolean => {
    return clientValidation.validateMalaysianIC(ic).isValid;
  },
  
  isPassport: (passport: string): boolean => {
    return clientValidation.validatePassport(passport).isValid;
  }
};

/**
 * React Hook Form validation rules factory
 * Creates consistent validation rules for react-hook-form register()
 * Eliminates duplication across form components
 */
export const createFormValidationRules = {
  /**
   * Required field validation rule
   */
  required: (fieldName: string) => ({
    required: `${fieldName} is required`,
  }),

  /**
   * Email field validation rules
   */
  email: (required: boolean = false, fieldName: string = "Email") => ({
    ...(required && createFormValidationRules.required(fieldName)),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validateEmailRealTime(value);
      return result.isValid || result.message || "Invalid email";
    },
  }),

  /**
   * Phone field validation rules
   */
  phone: (required: boolean = false, fieldName: string = "Phone number") => ({
    ...(required && createFormValidationRules.required(fieldName)),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validatePhoneRealTime(value);
      return result.isValid || result.message || "Invalid phone number";
    },
  }),

  /**
   * Name field validation rules
   */
  name: (required: boolean = true, fieldName: string = "Name") => ({
    ...(required && createFormValidationRules.required(fieldName)),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validateNameRealTime(value);
      return result.isValid || result.message || "Invalid name";
    },
  }),

  /**
   * IC number validation rules (for Malaysian nationals)
   */
  icNumber: (required: boolean = false) => ({
    ...(required && createFormValidationRules.required("IC number")),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validateMalaysianIC(value);
      return result.isValid || result.message || "Invalid IC number";
    },
  }),

  /**
   * Passport number validation rules (for non-Malaysian nationals)
   */
  passport: (required: boolean = false) => ({
    ...(required && createFormValidationRules.required("Passport number")),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validatePassport(value);
      return result.isValid || result.message || "Invalid passport number";
    },
  }),

  /**
   * Payment amount validation rules
   */
  paymentAmount: (required: boolean = true) => ({
    ...(required && createFormValidationRules.required("Payment amount")),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validatePaymentAmount(value);
      return result.isValid || result.message || "Invalid payment amount";
    },
  }),

  /**
   * Capsule number validation rules
   */
  capsuleNumber: (required: boolean = true) => ({
    ...(required && createFormValidationRules.required("Capsule number")),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validateCapsuleNumber(value);
      return result.isValid || result.message || "Invalid capsule number";
    },
  }),

  /**
   * Age validation rules
   */
  age: (required: boolean = false) => ({
    ...(required && createFormValidationRules.required("Age")),
    validate: (value: string) => {
      if (!required && !value) return true;
      const result = clientValidation.validateAge(value);
      return result.isValid || result.message || "Invalid age";
    },
  }),

  /**
   * Date validation rules
   */
  date: (required: boolean = true, fieldName: string = "Date") => ({
    ...(required && createFormValidationRules.required(fieldName)),
    validate: (value: string) => {
      if (!required && !value) return true;
      if (!value || value.trim() === "") return required ? `${fieldName} is required` : true;
      const date = new Date(value);
      return !isNaN(date.getTime()) || `${fieldName} must be a valid date`;
    },
  }),

  /**
   * Future date validation rules (for expected checkout dates)
   */
  futureDate: (required: boolean = false, fieldName: string = "Date") => ({
    ...(required && createFormValidationRules.required(fieldName)),
    validate: (value: string) => {
      if (!required && !value) return true;
      if (!value || value.trim() === "") return required ? `${fieldName} is required` : true;
      const date = new Date(value);
      if (isNaN(date.getTime())) return `${fieldName} must be a valid date`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today || `${fieldName} must be today or in the future`;
    },
  }),

  /**
   * Text field with length constraints
   */
  text: (required: boolean = false, minLength: number = 0, maxLength: number = 255, fieldName: string = "Field") => ({
    ...(required && createFormValidationRules.required(fieldName)),
    minLength: minLength > 0 ? {
      value: minLength,
      message: `${fieldName} must be at least ${minLength} characters long`,
    } : undefined,
    maxLength: maxLength > 0 ? {
      value: maxLength,
      message: `${fieldName} must be no more than ${maxLength} characters long`,
    } : undefined,
  }),

  /**
   * Numeric field validation rules
   */
  number: (required: boolean = false, min?: number, max?: number, fieldName: string = "Number") => ({
    ...(required && createFormValidationRules.required(fieldName)),
    validate: (value: string | number) => {
      if (!required && (value === "" || value === null || value === undefined)) return true;
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(num)) return `${fieldName} must be a valid number`;
      if (min !== undefined && num < min) return `${fieldName} must be at least ${min}`;
      if (max !== undefined && num > max) return `${fieldName} must be no more than ${max}`;
      return true;
    },
  }),
};

/**
 * Form data sanitization utilities
 * Cleans and formats form data before submission
 * Ensures consistent data format across the application
 */
export const formDataSanitizer = {
  /**
   * Sanitizes complete guest form data
   */
  sanitizeGuestData: (data: any) => {
    const sanitized = { ...data };

    // Sanitize text fields
    if (sanitized.name) {
      sanitized.name = inputFormatters.formatName(sanitized.name);
    }
    
    if (sanitized.email) {
      sanitized.email = sanitized.email.trim().toLowerCase();
    }
    
    if (sanitized.phoneNumber) {
      sanitized.phoneNumber = sanitized.phoneNumber.replace(/[\s\-\(\)]/g, "");
    }
    
    if (sanitized.idNumber && sanitized.nationality === "Malaysian") {
      sanitized.idNumber = inputFormatters.formatIC(sanitized.idNumber);
    } else if (sanitized.idNumber) {
      sanitized.idNumber = sanitized.idNumber.toUpperCase().trim();
    }
    
    if (sanitized.capsuleNumber) {
      sanitized.capsuleNumber = inputFormatters.formatCapsuleNumber(sanitized.capsuleNumber);
    }
    
    if (sanitized.paymentAmount) {
      const amount = parseFloat(sanitized.paymentAmount);
      sanitized.paymentAmount = isNaN(amount) ? "0" : amount.toFixed(2);
    }
    
    // Sanitize optional fields (remove empty strings)
    const optionalFields = ['email', 'phoneNumber', 'idNumber', 'emergencyContact', 'emergencyPhone', 'notes'];
    optionalFields.forEach(field => {
      if (sanitized[field] === "") {
        sanitized[field] = null;
      }
    });
    
    return sanitized;
  },

  /**
   * Sanitizes settings form data
   */
  sanitizeSettingsData: (data: any) => {
    const sanitized = { ...data };
    
    // Sanitize URLs (remove trailing slashes, ensure protocol)
    const urlFields = ['websiteUrl', 'supportUrl', 'bookingUrl'];
    urlFields.forEach(field => {
      if (sanitized[field] && sanitized[field] !== "") {
        let url = sanitized[field].trim();
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        sanitized[field] = url.replace(/\/+$/, ""); // Remove trailing slashes
      }
    });
    
    // Sanitize email addresses
    const emailFields = ['adminEmail', 'supportEmail', 'notificationEmail'];
    emailFields.forEach(field => {
      if (sanitized[field] && sanitized[field] !== "") {
        sanitized[field] = sanitized[field].trim().toLowerCase();
      }
    });
    
    // Sanitize numeric fields
    const numericFields = ['maxGuestStayDays', 'totalCapsules', 'maxPaymentAmount'];
    numericFields.forEach(field => {
      if (sanitized[field] !== undefined && sanitized[field] !== "") {
        const num = parseFloat(sanitized[field]);
        sanitized[field] = isNaN(num) ? 0 : num;
      }
    });
    
    return sanitized;
  },

  /**
   * General purpose sanitizer for any form data
   */
  sanitizeGeneral: (data: any) => {
    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      
      if (typeof value === "string") {
        // Trim whitespace
        const trimmed = value.trim();
        
        // Convert empty strings to null for optional fields
        if (trimmed === "") {
          sanitized[key] = null;
        } else {
          sanitized[key] = trimmed;
        }
      }
    });
    
    return sanitized;
  },
};

/**
 * Validation utility for handling nationality-based ID validation
 * Handles the common pattern of IC vs Passport validation based on nationality
 */
export const nationalityValidation = {
  /**
   * Gets appropriate ID validation based on nationality
   */
  getIdValidation: (nationality: string, required: boolean = false) => {
    if (nationality === "Malaysian") {
      return createFormValidationRules.icNumber(required);
    } else {
      return createFormValidationRules.passport(required);
    }
  },

  /**
   * Gets appropriate ID label based on nationality
   */
  getIdLabel: (nationality: string) => {
    return nationality === "Malaysian" ? "IC Number" : "Passport Number";
  },

  /**
   * Gets appropriate ID placeholder based on nationality
   */
  getIdPlaceholder: (nationality: string) => {
    return nationality === "Malaysian" ? "123456-78-9012" : "A1234567";
  },

  /**
   * Validates ID based on nationality
   */
  validateId: (id: string, nationality: string) => {
    if (nationality === "Malaysian") {
      return clientValidation.validateMalaysianIC(id);
    } else {
      return clientValidation.validatePassport(id);
    }
  },
};

/**
 * Bulk validation utilities for validating multiple fields at once
 * Useful for form submission validation and displaying multiple errors
 */
export const bulkValidation = {
  /**
   * Validates guest form data and returns all errors
   */
  validateGuestForm: (data: any) => {
    const errors: Record<string, string> = {};
    
    // Name validation
    if (!data.name || data.name.trim() === "") {
      errors.name = "Name is required";
    } else {
      const nameResult = clientValidation.validateNameRealTime(data.name);
      if (!nameResult.isValid && nameResult.message) {
        errors.name = nameResult.message;
      }
    }
    
    // Email validation (optional)
    if (data.email && data.email.trim() !== "") {
      const emailResult = clientValidation.validateEmailRealTime(data.email);
      if (!emailResult.isValid && emailResult.message) {
        errors.email = emailResult.message;
      }
    }
    
    // Phone validation (optional)
    if (data.phoneNumber && data.phoneNumber.trim() !== "") {
      const phoneResult = clientValidation.validatePhoneRealTime(data.phoneNumber);
      if (!phoneResult.isValid && phoneResult.message) {
        errors.phoneNumber = phoneResult.message;
      }
    }
    
    // ID validation based on nationality
    if (data.idNumber && data.idNumber.trim() !== "") {
      const idResult = nationalityValidation.validateId(data.idNumber, data.nationality || "Malaysian");
      if (!idResult.isValid && idResult.message) {
        errors.idNumber = idResult.message;
      }
    }
    
    // Capsule number validation
    if (!data.capsuleNumber || data.capsuleNumber.trim() === "") {
      errors.capsuleNumber = "Capsule number is required";
    } else {
      const capsuleResult = clientValidation.validateCapsuleNumber(data.capsuleNumber);
      if (!capsuleResult.isValid && capsuleResult.message) {
        errors.capsuleNumber = capsuleResult.message;
      }
    }
    
    // Payment amount validation
    if (data.paymentAmount !== undefined && data.paymentAmount !== "") {
      const amountResult = clientValidation.validatePaymentAmount(data.paymentAmount);
      if (!amountResult.isValid && amountResult.message) {
        errors.paymentAmount = amountResult.message;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};