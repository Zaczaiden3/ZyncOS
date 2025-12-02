import { describe, it, expect } from 'vitest';
import { SafetyUtils } from './safety';

describe('SafetyUtils', () => {
  it('should mask emails', () => {
    const text = 'Contact me at test@example.com';
    const masked = SafetyUtils.maskPII(text);
    expect(masked).toBe('Contact me at [REDACTED: EMAIL]');
  });

  it('should mask phone numbers', () => {
    const text = 'Call 123-456-7890';
    const masked = SafetyUtils.maskPII(text);
    expect(masked).toBe('Call [REDACTED: PHONE]');
  });

  it('should mask credit cards', () => {
    const text = 'Card: 1234-5678-9012-3456';
    const masked = SafetyUtils.maskPII(text);
    expect(masked).toBe('Card: [REDACTED: CREDIT_CARD]');
  });

  it('should mask SSNs', () => {
    const text = 'SSN: 123-45-6789';
    const masked = SafetyUtils.maskPII(text);
    expect(masked).toBe('SSN: [REDACTED: SSN]');
  });

  it('should mask IPv4 addresses', () => {
    const text = 'IP: 192.168.1.1';
    const masked = SafetyUtils.maskPII(text);
    expect(masked).toBe('IP: [REDACTED: IP]');
  });

  it('should detect PII', () => {
    expect(SafetyUtils.containsPII('test@example.com')).toBe(true);
    expect(SafetyUtils.containsPII('Hello World')).toBe(false);
  });
});
