import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { autonomicSystem, OperationalEvent } from './autonomicSystem';

describe('AutonomicSystem', () => {
  beforeEach(() => {
    // Reset state before each test
    // Since it's a singleton, we need to be careful. 
    // Ideally we would mock the instance or have a reset method, but for now we can manually clear arrays.
    autonomicSystem.opsTimeline = [];
    autonomicSystem.anomalies = [];
    // Reset disabled tools by calling enableTool on known ones or accessing private property if possible (not easily in TS without casting)
    // We'll just rely on unique tool names for tests to avoid collision.
  });

  it('should be a singleton', () => {
    const instance1 = autonomicSystem;
    const instance2 = autonomicSystem; // Accessing the exported instance
    expect(instance1).toBe(instance2);
  });

  it('should log events correctly', () => {
    const listener = vi.fn();
    autonomicSystem.subscribe(listener);

    autonomicSystem.logEvent('INFO', 'Test event');

    expect(autonomicSystem.opsTimeline.length).toBeGreaterThan(0);
    expect(autonomicSystem.opsTimeline[0].message).toBe('Test event');
    expect(autonomicSystem.opsTimeline[0].type).toBe('INFO');
    expect(listener).toHaveBeenCalled();
  });

  it('should report errors and trigger remediation after threshold', () => {
    const source = 'Tool:TestTool';
    
    // Report 1st error
    autonomicSystem.reportError(source, 'Error 1');
    expect(autonomicSystem.opsTimeline[0].type).toBe('ERROR');
    
    // Report 2nd error
    autonomicSystem.reportError(source, 'Error 2');
    
    // Report 3rd error -> Should trigger remediation
    autonomicSystem.reportError(source, 'Error 3');

    // Check for remediation event
    const remediationEvents = autonomicSystem.opsTimeline.filter(e => e.type === 'REMEDIATION');
    const warningEvents = autonomicSystem.opsTimeline.filter(e => e.type === 'WARNING');
    
    // We expect a warning for the anomaly and a remediation log
    expect(warningEvents.some(e => e.message.includes('Anomaly detected'))).toBe(true);
    expect(remediationEvents.some(e => e.message.includes('Disabled tool'))).toBe(true);
  });

  it('should disable and enable tools', () => {
    const toolName = 'UnstableTool';
    
    // Initially allowed
    expect(autonomicSystem.checkPolicy(toolName, 'execute')).toBe(true);

    // Disable tool
    autonomicSystem.disableTool(toolName);

    // Now blocked
    expect(autonomicSystem.checkPolicy(toolName, 'execute')).toBe(false);

    // Enable tool
    autonomicSystem.enableTool(toolName);

    // Allowed again
    expect(autonomicSystem.checkPolicy(toolName, 'execute')).toBe(true);
  });

  it('should enforce policies', () => {
    const resource = 'restricted_resource';
    const action = 'delete';
    
    autonomicSystem.addPolicy({
      resource,
      action,
      condition: () => true // Always block
    });

    expect(autonomicSystem.checkPolicy(resource, action)).toBe(false);
    expect(autonomicSystem.checkPolicy(resource, 'read')).toBe(true); // Different action allowed
  });

  it('should optimize system settings', () => {
    // Simulate high error rate
    for (let i = 0; i < 6; i++) {
        autonomicSystem.logEvent('ERROR', `Error ${i}`);
    }

    const initialRetries = autonomicSystem.config.maxToolRetries;
    
    autonomicSystem.optimize();

    // Should have reduced retries
    expect(autonomicSystem.config.maxToolRetries).toBeLessThan(initialRetries);
  });
});
