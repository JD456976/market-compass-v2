import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format location string to proper title case
 * e.g., "norfolk, ma" -> "Norfolk, MA"
 * Handles city names and state abbreviations correctly
 */
export function formatLocation(location: string): string {
  if (!location) return '';
  
  return location
    .split(',')
    .map((part, index) => {
      const trimmed = part.trim();
      if (index > 0 && trimmed.length <= 2) {
        // State abbreviation - uppercase
        return trimmed.toUpperCase();
      }
      // City name - title case
      return trimmed
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    })
    .join(', ');
}
