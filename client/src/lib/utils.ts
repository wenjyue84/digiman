import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for proper CSS class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the initials of a given name.
 * e.g. "Southern Homestay" -> "SH"
 */
export function getInitials(name: string): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}
