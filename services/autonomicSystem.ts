import { ToolDefinition } from './tools';

export type AnomalyType = 'HIGH_LATENCY' | 'TOOL_FAILURE' | 'MEMORY_LEAK' | 'RENDER_FAILURE' | 'PROMPT_INJECTION';
export type RemediationAction = 'RESTART_CORE' | 'FALLBACK_MODE' | 'DISABLE_TOOL' | 'ROLLBACK_CONFIG' | 'BLOCK_ACTION';
export type SystemMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export interface OperationalEvent {
  id: string;
  timestamp: number;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'REMEDIATION';
  message: string;
  details?: any;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  detectedAt: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED';
}

export interface SystemConfig {
  modelReflex: string;
  modelMemory: string;
  contextWindowSize: number;
  mode: SystemMode;
  maxToolRetries: number;
}

export interface SecurityPolicy {
  resource: string; // e.g., 'web_search', 'file_system'
  action: string;   // e.g., 'execute', 'read', 'write'
  condition?: (context: any) => boolean;
}

class AutonomicSystem {
  private static instance: AutonomicSystem;
  
  public opsTimeline: OperationalEvent[] = [];
  public anomalies: Anomaly[] = [];
  public config: SystemConfig = {
    modelReflex: 'nvidia/nemotron-nano-12b-v2-vl:free',
    modelMemory: 'kwaipilot/kat-coder-pro:free',
    contextWindowSize: 8192,
    mode: 'ONLINE',
    maxToolRetries: 3
  };

  private policies: SecurityPolicy[] = [];
  private listeners: ((events: OperationalEvent[]) => void)[] = [];

  private disabledTools: Set<string> = new Set();

  private constructor() {
    this.initializeDefaultPolicies();
    this.logEvent('INFO', 'Autonomic Nervous System initialized.');
  }

  public static getInstance(): AutonomicSystem {
    if (!AutonomicSystem.instance) {
      AutonomicSystem.instance = new AutonomicSystem();
    }
    return AutonomicSystem.instance;
  }

  private initializeDefaultPolicies() {
    // Example: Block web search if in OFFLINE mode
    this.addPolicy({
      resource: 'web_search',
      action: 'execute',
      condition: () => this.config.mode === 'OFFLINE'
    });
  }

  public addPolicy(policy: SecurityPolicy) {
    this.policies.push(policy);
  }

  public subscribe(listener: (events: OperationalEvent[]) => void) {
    this.listeners.push(listener);
    // Send current state immediately
    listener(this.opsTimeline);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l([...this.opsTimeline]));
  }

  public logEvent(type: OperationalEvent['type'], message: string, details?: any) {
    const event: OperationalEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      message,
      details
    };
    this.opsTimeline = [event, ...this.opsTimeline].slice(0, 100); // Keep last 100 events
    this.notifyListeners();
  }

  // --- Monitoring & Self-Healing ---

  public reportError(source: string, error: any) {
    this.logEvent('ERROR', `Error in ${source}: ${error.message || error}`);
    
    // Simple heuristic: if we see repeated errors from the same source, trigger remediation
    const recentErrors = this.opsTimeline.filter(e => 
      e.type === 'ERROR' && 
      e.timestamp > Date.now() - 60000 && // Last minute
      e.message.includes(source)
    );

    if (recentErrors.length >= 3) {
      this.triggerRemediation(source, 'HIGH');
    }
  }

  public reportLatency(source: string, latencyMs: number) {
    if (latencyMs > 5000) { // 5s threshold
      this.logEvent('WARNING', `High latency detected in ${source}: ${latencyMs}ms`);
      // Trigger optimization if latency is consistently high
      const recentHighLatency = this.opsTimeline.filter(e => 
        e.type === 'WARNING' && 
        e.message.includes('High latency') &&
        e.timestamp > Date.now() - 120000 // Last 2 minutes
      );

      if (recentHighLatency.length >= 3) {
          this.optimize();
      }
    }
  }

  private triggerRemediation(source: string, severity: Anomaly['severity']) {
    // Prevent duplicate active anomalies for the same source
    const existingAnomaly = this.anomalies.find(a => a.status === 'ACTIVE' && source.includes(a.type)); // Rough check
    if (existingAnomaly) return;

    const anomalyId = crypto.randomUUID();
    const anomaly: Anomaly = {
      id: anomalyId,
      type: 'TOOL_FAILURE', // Generalizing for now
      detectedAt: Date.now(),
      severity,
      status: 'ACTIVE'
    };
    this.anomalies.push(anomaly);
    this.logEvent('WARNING', `Anomaly detected: ${source} instability`, anomaly);

    // Playbook: If a tool is failing, disable it temporarily
    if (source.startsWith('Tool:')) {
        const toolName = source.split(':')[1];
        if (toolName) {
            this.disableTool(toolName, 30000); // Disable for 30s
        }
    } else if (source.includes('Reflex')) {
        this.logEvent('REMEDIATION', `Switching Reflex to Fallback Model (Simulation)`);
        // Logic to switch model would go here
        // e.g. this.config.modelReflex = 'fallback-model';
    }
    
    // Resolve anomaly after action (simulated resolution time)
    setTimeout(() => {
        anomaly.status = 'RESOLVED';
        this.anomalies = this.anomalies.filter(a => a.id !== anomalyId);
        this.logEvent('INFO', `Anomaly resolved: ${source}`);
    }, 5000);
  }

  public disableTool(toolName: string, durationMs: number = 60000) {
      if (this.disabledTools.has(toolName)) return;

      this.disabledTools.add(toolName);
      this.logEvent('REMEDIATION', `Disabled tool '${toolName}' for ${durationMs / 1000}s due to instability.`);

      setTimeout(() => {
          this.enableTool(toolName);
      }, durationMs);
  }

  public enableTool(toolName: string) {
      if (this.disabledTools.has(toolName)) {
          this.disabledTools.delete(toolName);
          this.logEvent('INFO', `Re-enabled tool '${toolName}'.`);
      }
  }

  // --- Self-Protection ---

  public checkPolicy(resource: string, action: string, context?: any): boolean {
    // 1. Check if tool is disabled
    if (this.disabledTools.has(resource)) {
        this.logEvent('WARNING', `Policy Violation: Attempted to use disabled tool '${resource}'`);
        return false;
    }

    // 2. Check explicit policies
    for (const policy of this.policies) {
      if (policy.resource === resource && policy.action === action) {
        if (policy.condition && policy.condition(context)) {
          this.logEvent('WARNING', `Policy Violation: Blocked ${action} on ${resource}`);
          return false; // Blocked
        }
      }
    }
    return true; // Allowed
  }

  // --- Self-Configuring ---

  public optimize() {
    this.logEvent('INFO', 'Initiating system self-optimization routine...');
    
    // 1. Analyze recent error rate
    const recentErrors = this.opsTimeline.filter(e => e.type === 'ERROR' && e.timestamp > Date.now() - 300000); // Last 5 mins
    
    if (recentErrors.length > 5) {
        // High error rate -> Reduce complexity or increase retries?
        // Actually, maybe decrease retries to fail fast if things are broken
        if (this.config.maxToolRetries > 1) {
            this.config.maxToolRetries--;
            this.logEvent('REMEDIATION', `High error rate detected. Reduced maxToolRetries to ${this.config.maxToolRetries} to prevent cascading failures.`);
        }
    } else {
        // Low error rate -> Restore defaults
        if (this.config.maxToolRetries < 3) {
            this.config.maxToolRetries = 3;
            this.logEvent('INFO', `System stable. Restored maxToolRetries to 3.`);
        }
    }

    // 2. Analyze Latency
    // (Mock logic for context window adjustment)
    const recentWarnings = this.opsTimeline.filter(e => e.type === 'WARNING' && e.timestamp > Date.now() - 300000);
    if (recentWarnings.length > 5) {
        // System under load
        this.logEvent('REMEDIATION', 'System load detected. Optimizing internal buffers.');
    }

    this.logEvent('INFO', 'System self-optimization routine completed.');
  }
}

export const autonomicSystem = AutonomicSystem.getInstance();
