/**
 * Utility functions for data validation and formatting
 */

/**
 * Validates if a string is a valid URL
 * @param url - The URL string to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid phone number
 * Supports Turkish phone number formats:
 * - +90 XXX XXX XX XX
 * - 0XXX XXX XX XX
 * - (0XXX) XXX XX XX
 * - Various formats with spaces, dashes, or parentheses
 * @param phone - The phone number string to validate
 * @returns true if valid phone number, false otherwise
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Turkish phone number patterns
  // +90XXXXXXXXXX (12-13 digits with +)
  // 0XXXXXXXXXX (11 digits starting with 0)
  // XXXXXXXXXX (10 digits)
  
  if (cleaned.startsWith('+90')) {
    return cleaned.length === 13; // +90 + 10 digits
  } else if (cleaned.startsWith('0')) {
    return cleaned.length === 11; // 0 + 10 digits
  } else {
    return cleaned.length === 10; // 10 digits
  }
}

/**
 * Formats a phone number to a consistent display format
 * @param phone - The phone number to format
 * @returns Formatted phone number or null if invalid
 */
export function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone || !isValidPhoneNumber(phone)) return null;
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Format to: +90 XXX XXX XX XX or 0XXX XXX XX XX
  if (cleaned.startsWith('+90')) {
    const digits = cleaned.slice(3);
    return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  } else if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  } else {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
}

/**
 * Formats a URL to ensure it has a protocol
 * @param url - The URL to format
 * @returns Formatted URL or null if invalid
 */
export function formatUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  // If URL already has protocol, validate and return
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return isValidUrl(trimmed) ? trimmed : null;
  }
  
  // Add https:// protocol
  const formatted = `https://${trimmed}`;
  return isValidUrl(formatted) ? formatted : null;
}

/**
 * Validates if a search term is valid (non-empty after trimming)
 * @param searchTerm - The search term to validate
 * @returns true if valid, false otherwise
 */
export function isValidSearchTerm(searchTerm: string | null | undefined): boolean {
  return !!searchTerm && searchTerm.trim().length > 0;
}

/**
 * Generates a unique ID for business data
 * @returns Unique identifier string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates BusinessData object
 * @param data - The business data to validate
 * @returns true if valid, false otherwise
 */
export function isValidBusinessData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  return (
    typeof data.id === 'string' &&
    typeof data.businessName === 'string' &&
    data.businessName.trim().length > 0 &&
    (data.website === null || typeof data.website === 'string') &&
    (data.phoneNumber === null || typeof data.phoneNumber === 'string') &&
    data.scrapedAt instanceof Date
  );
}

/**
 * Checks if a phone number is a Turkish mobile number
 * Turkish mobile numbers start with 05XX (0500-0599)
 * @param phone - The phone number to check
 * @returns true if mobile number, false otherwise
 */
export function isMobileNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it's a Turkish mobile number (05XX)
  if (cleaned.startsWith('+905')) {
    // +905XX format - check if it's 0500-0599 range
    const areaCode = cleaned.substring(3, 6); // Get digits after +90
    return areaCode >= '500' && areaCode <= '599';
  } else if (cleaned.startsWith('05')) {
    // 05XX format
    const areaCode = cleaned.substring(0, 4); // Get first 4 digits
    return areaCode >= '0500' && areaCode <= '0599';
  } else if (cleaned.startsWith('905') && cleaned.length === 12) {
    // 905XX format (without +)
    const areaCode = cleaned.substring(2, 5); // Get digits after 90
    return areaCode >= '500' && areaCode <= '599';
  }
  
  return false;
}

/**
 * Formats phone number for WhatsApp URL
 * WhatsApp format: +90XXXXXXXXXX (country code + number without leading 0)
 * @param phone - The phone number to format
 * @returns Formatted phone number for WhatsApp or null
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Convert to WhatsApp format
  if (cleaned.startsWith('+90')) {
    // Already in correct format
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    // Remove leading 0 and add +90
    return `+90${cleaned.substring(1)}`;
  } else if (cleaned.startsWith('90') && cleaned.length === 12) {
    // 90XX format without +
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    // 10 digits - add +90
    return `+90${cleaned}`;
  }
  
  return null;
}

