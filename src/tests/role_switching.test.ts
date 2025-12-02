import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, saveSettings } from '../services/settings';

describe('Role-Based Access Control', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should default to DEVELOPER role', () => {
    const settings = getSettings();
    expect(settings.userRole).toBe('DEVELOPER');
  });

  it('should update user role and dispatch event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    
    saveSettings({ userRole: 'EXECUTIVE' });
    
    const updated = getSettings();
    expect(updated.userRole).toBe('EXECUTIVE');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
    expect(dispatchSpy.mock.calls[0][0].type).toBe('zync-settings-changed');
  });

  it('should persist role across reloads (mocked)', () => {
    saveSettings({ userRole: 'ADMIN' });
    const settings = getSettings();
    expect(settings.userRole).toBe('ADMIN');
  });
});
