/**
 * Strip non-numeric characters (except decimal point) from a price string.
 * e.g., "$1,000,000.50" -> "1000000.50"
 */
export function stripCurrencyChars(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

/**
 * Format a numeric string as US currency display (no $ sign).
 * e.g., "1000000" -> "1,000,000"
 */
export function formatPriceDisplay(value: string): string {
  const stripped = stripCurrencyChars(value);
  if (!stripped) return '';
  
  const parts = stripped.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (parts.length > 1) {
    return `${intPart}.${parts[1]}`;
  }
  return intPart;
}

/**
 * Parse a formatted price string to a number.
 * e.g., "1,000,000" -> 1000000
 */
export function parsePriceValue(value: string): number {
  return parseFloat(stripCurrencyChars(value)) || 0;
}
