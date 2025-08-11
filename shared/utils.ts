/**
 * Utility functions for the application
 */

/**
 * Calculates age from Malaysian IC number
 * Malaysian IC format: YYMMDD-PB-XXXX
 * First 6 digits represent birth date: YYMMDD
 * @param icNumber - 12-digit Malaysian IC number
 * @returns calculated age in years, or null if invalid
 */
export function calculateAgeFromIC(icNumber: string): number | null {
  if (!icNumber || icNumber.length !== 12) {
    return null;
  }

  try {
    // Extract date parts from IC (first 6 digits: YYMMDD)
    const year = parseInt(icNumber.substring(0, 2));
    const month = parseInt(icNumber.substring(2, 4));
    const day = parseInt(icNumber.substring(4, 6));

    // Validate date parts
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    // Convert 2-digit year to 4-digit year
    // Malaysian IC uses 2-digit years where:
    // 00-29 = 2000-2029
    // 30-99 = 1930-1999
    let fullYear: number;
    if (year <= 29) {
      fullYear = 2000 + year;
    } else {
      fullYear = 1900 + year;
    }

    // Create birth date
    const birthDate = new Date(fullYear, month - 1, day);
    
    // Validate the date (handles leap years, etc.)
    if (birthDate.getFullYear() !== fullYear || 
        birthDate.getMonth() !== month - 1 || 
        birthDate.getDate() !== day) {
      return null;
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validate age is reasonable (0-120 years)
    if (age < 0 || age > 120) {
      return null;
    }

    return age;
  } catch (error) {
    return null;
  }
}

/**
 * Validates if a string is a valid Malaysian IC number
 * @param icNumber - IC number to validate
 * @returns true if valid, false otherwise
 */
export function isValidMalaysianIC(icNumber: string): boolean {
  if (!icNumber || icNumber.length !== 12) {
    return false;
  }

  // Check if all characters are digits
  if (!/^\d{12}$/.test(icNumber)) {
    return false;
  }

  // Check if age calculation is successful
  return calculateAgeFromIC(icNumber) !== null;
}