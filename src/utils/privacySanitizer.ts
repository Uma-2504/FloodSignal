/**
 * Privacy Sanitizer Utility
 *
 * Masks personal identifiable information (phone numbers and email addresses)
 * before sending user text to external AI inference models (e.g. Groq).
 *
 * The original text is preserved intact for database storage and emergency responder view.
 */

// Matches standard email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Matches Indian and international 10-digit mobile number patterns
// Handles prefixes (+91, 0), spaces, and hyphens (e.g., +91 98765 43210, 98765-43210, 9876543210)
const PHONE_REGEX = /(?:\+?91[\s.-]?)?(?:0)?([6-9]\d{4}[\s.-]?\d{5}|\b[6-9]\d{9}\b)/g;

/**
 * Redacts personal contact information from report descriptions.
 * Does not mutate original string; returns a sanitized copy.
 */
export function sanitizeTextForAI(rawText: string): string {
  if (!rawText) return '';

  return rawText
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(PHONE_REGEX, '[PHONE_REDACTED]');
}

