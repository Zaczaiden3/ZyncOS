import { Workflow, WorkflowStep, WorkflowExecutionLog } from '../types';
import { pluginManager } from './pluginManager';

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executionLogs: WorkflowExecutionLog[] = [];

  private listeners: ((logs: WorkflowExecutionLog[]) => void)[] = [];

  constructor() {}

  registerWorkflow(workflow: Workflow) {
    this.workflows.set(workflow.id, workflow);
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  subscribe(listener: (logs: WorkflowExecutionLog[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.executionLogs]));
  }

  async executeWorkflow(workflowId: string, initialInput: any): Promise<Map<string, any>> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const stepOutputs: Map<string, any> = new Map();
    const executedSteps: Set<string> = new Set();

    for (const step of workflow.steps) {
      // Check dependencies
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          if (!stepOutputs.has(depId)) {
             throw new Error(`Dependency ${depId} for step ${step.id} not yet executed.`);
          }
        }
      }

      // Prepare args
      const args = this.resolveArgs(step.argsTemplate, stepOutputs, initialInput);

      // Log start
      this.logExecution(workflowId, step.id, 'running', args);

      try {
        // Execute tool
        const plugin = pluginManager.getPlugin(step.toolName);
        if (!plugin) {
            throw new Error(`Tool ${step.toolName} not found`);
        }
        const result = await plugin.definition.execute(args);
        
        stepOutputs.set(step.id, result);
        executedSteps.add(step.id);
        
        // Log success
        this.logExecution(workflowId, step.id, 'completed', args, result);
      } catch (error: any) {
        // Log failure
        this.logExecution(workflowId, step.id, 'failed', args, undefined, error.message);
        throw error;
      }
    }

    return stepOutputs;
  }

  private resolveArgs(template: Record<string, any> | undefined, stepOutputs: Map<string, any>, initialInput: any): any {
    if (!template) return {};
    
    // Simple template replacement: {{stepId.output}} or {{input.field}}
    // This is a basic implementation.
    const resolvedArgs: any = {};
    
    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        if (path.startsWith('input')) {
            // Handle input access, e.g. input.query
            // For now just return initialInput if path is 'input'
            resolvedArgs[key] = initialInput; // Simplified
        } else {
            // Handle step output, e.g. step1.output
            // For now assume path is just stepId
            resolvedArgs[key] = stepOutputs.get(path);
        }
      } else {
        resolvedArgs[key] = value;
      }
    }
    return resolvedArgs;
  }

  private logExecution(workflowId: string, stepId: string, status: 'pending' | 'running' | 'completed' | 'failed', input: any, output?: any, error?: string) {
    this.executionLogs.push({
      workflowId,
      stepId,
      status,
      input,
      output,
      error,
      timestamp: Date.now()
    });
    this.notifyListeners();
  }

  getLogs(workflowId: string): WorkflowExecutionLog[] {
    return this.executionLogs.filter(log => log.workflowId === workflowId);
  }
}

export const workflowEngine = new WorkflowEngine();
