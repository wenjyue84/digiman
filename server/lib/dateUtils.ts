/**
 * Date utility functions for server-side operations
 * Eliminates duplicated date manipulation patterns across route files
 */

/**
 * Get today's date boundary (start of day) for consistent date filtering
 * Used for checkout operations and date-based queries
 * @returns Date object representing start of today (00:00:00)
 */
export const getTodayBoundary = (): Date => {
  const todayStr = new Date().toISOString().split('T')[0];
  return new Date(todayStr + 'T00:00:00');
};

/**
 * Get tomorrow's date boundary (start of day)
 * @returns Date object representing start of tomorrow (00:00:00)
 */
export const getTomorrowBoundary = (): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  return new Date(tomorrowStr + 'T00:00:00');
};

/**
 * Get date boundary for a specific number of days from today
 * @param daysOffset - Number of days to add (positive) or subtract (negative)
 * @returns Date object representing start of the target day
 */
export const getDateBoundary = (daysOffset: number = 0): Date => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysOffset);
  const dateStr = targetDate.toISOString().split('T')[0];
  return new Date(dateStr + 'T00:00:00');
};

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns true if the date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a date is overdue (before today)
 * @param date - Date to check
 * @returns true if the date is before today
 */
export const isOverdue = (date: Date): boolean => {
  const today = getTodayBoundary();
  return date < today;
};

/**
 * Format date for database storage (ISO string)
 * @param date - Date to format
 * @returns ISO string representation
 */
export const formatForDatabase = (date: Date): string => {
  return date.toISOString();
};

/**
 * Format date for display (local date string)
 * @param date - Date to format
 * @returns Local date string
 */
export const formatForDisplay = (date: Date): string => {
  return date.toLocaleDateString();
};

/**
 * Parse date string and ensure it's a valid Date object
 * @param dateString - Date string to parse
 * @returns Date object or null if invalid
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Get date range for filtering operations
 * @param startDaysOffset - Days offset for start date (negative for past)
 * @param endDaysOffset - Days offset for end date (positive for future)
 * @returns Object with start and end Date objects
 */
export const getDateRange = (startDaysOffset: number = 0, endDaysOffset: number = 0) => {
  return {
    start: getDateBoundary(startDaysOffset),
    end: getDateBoundary(endDaysOffset)
  };
};

/**
 * Calculate days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates
 */
export const daysBetween = (startDate: Date, endDate: Date): number => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Add days to a date
 * @param date - Base date
 * @param days - Number of days to add
 * @returns New Date object
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get current timestamp for logging and audit purposes
 * @returns Current timestamp as ISO string
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};