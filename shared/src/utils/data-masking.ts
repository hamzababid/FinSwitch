/**
 * Data masking utilities for sensitive information
 * Implements security requirements for data protection in logs
 */

/**
 * Mask card number - show first 6 and last 4 digits
 * Example: 4111111111111111 -> 411111******1111
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 10) {
    return '****';
  }

  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.length < 10) {
    return '****';
  }

  const first6 = cleaned.slice(0, 6);
  const last4 = cleaned.slice(-4);
  const masked = '*'.repeat(cleaned.length - 10);

  return `${first6}${masked}${last4}`;
}

/**
 * Mask CVV completely
 */
export function maskCVV(cvv: string): string {
  return '***';
}

/**
 * Mask email - show first character and domain
 * Example: user@example.com -> u***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***';
  }

  const [local, domain] = email.split('@');
  if (local.length === 0) {
    return '***@' + domain;
  }

  return `${local[0]}***@${domain}`;
}

/**
 * Mask password completely
 */
export function maskPassword(password: string): string {
  return '[REDACTED]';
}

/**
 * Mask sensitive data in an object
 * Recursively processes nested objects and arrays
 */
export function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (typeof data !== 'object') {
    return data;
  }

  const masked: any = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Mask card numbers
    if (lowerKey.includes('card') && lowerKey.includes('number')) {
      masked[key] = typeof value === 'string' ? maskCardNumber(value) : value;
    }
    // Mask CVV
    else if (lowerKey === 'cvv' || lowerKey === 'cvc' || lowerKey === 'securitycode') {
      masked[key] = typeof value === 'string' ? maskCVV(value) : value;
    }
    // Mask passwords
    else if (lowerKey.includes('password') || lowerKey.includes('secret')) {
      masked[key] = maskPassword(String(value));
    }
    // Mask emails
    else if (lowerKey === 'email' && typeof value === 'string') {
      masked[key] = maskEmail(value);
    }
    // Recursively process nested objects
    else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    }
    // Keep other values as-is
    else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Get card BIN (first 6 digits) from card number
 */
export function getCardBIN(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  return cleaned.slice(0, 6);
}

/**
 * Get last 4 digits of card number
 */
export function getCardLast4(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  return cleaned.slice(-4);
}
