export const SafetyUtils = {
  // Regex patterns for common PII
  patterns: {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g,
    creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
  },

  /**
   * Masks PII in a string with [REDACTED: TYPE]
   */
  maskPII: (text: string): string => {
    let masked = text;
    masked = masked.replace(SafetyUtils.patterns.email, '[REDACTED: EMAIL]');
    masked = masked.replace(SafetyUtils.patterns.phone, '[REDACTED: PHONE]');
    masked = masked.replace(SafetyUtils.patterns.creditCard, '[REDACTED: CREDIT_CARD]');
    masked = masked.replace(SafetyUtils.patterns.ssn, '[REDACTED: SSN]');
    masked = masked.replace(SafetyUtils.patterns.ipv4, '[REDACTED: IP]');
    return masked;
  },

  /**
   * Checks if text contains any PII
   */
  containsPII: (text: string): boolean => {
    return (
      SafetyUtils.patterns.email.test(text) ||
      SafetyUtils.patterns.phone.test(text) ||
      SafetyUtils.patterns.creditCard.test(text) ||
      SafetyUtils.patterns.ssn.test(text) ||
      SafetyUtils.patterns.ipv4.test(text)
    );
  }
};
