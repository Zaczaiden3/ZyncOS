import { topologicalMemory } from '../cores/memory/TopologicalMemory';

export class DreamService {
  private isDreaming: boolean = false;
  private dreamInterval: NodeJS.Timeout | null = null;

  startDreaming(callback: (status: string) => void) {
    if (this.isDreaming) return;
    this.isDreaming = true;
    
    console.log("[DreamService] Initiating Dream State...");
    callback("INITIATING_DREAM_STATE");

    // Simulate a multi-stage dream process
    setTimeout(async () => {
        if (!this.isDreaming) return;
        callback("CLUSTERING_MEMORIES");
        try {
            const result = await topologicalMemory.optimize();
            console.log("[DreamService] Memory Optimization Result:", result);
        } catch (e) {
            console.error("[DreamService] Optimization failed", e);
        }
    }, 2000);

    setTimeout(async () => {
        if (!this.isDreaming) return;
        callback("GENERATING_INSIGHTS");
        try {
            // Import dynamically to avoid circular dependency issues if any
            const { neuroSymbolicCore } = await import('../cores/neuro-symbolic/NeuroSymbolicCore');
            const dreamResult = await neuroSymbolicCore.dream();
            console.log("[DreamService] Neuro-Symbolic Dream Result:", dreamResult);
        } catch (e) {
            console.error("[DreamService] Dreaming failed", e);
        }
    }, 5000);

    setTimeout(() => {
        if (!this.isDreaming) return;
        callback("CONSOLIDATING_KNOWLEDGE");
    }, 8000);

    setTimeout(() => {
        if (!this.isDreaming) return;
        callback("DREAM_COMPLETE");
        this.stopDreaming();
    }, 10000);
  }

  stopDreaming() {
    this.isDreaming = false;
    if (this.dreamInterval) {
      clearInterval(this.dreamInterval);
      this.dreamInterval = null;
    }
    console.log("[DreamService] Waking up...");
  }

  isActive() {
    return this.isDreaming;
  }
}

export const dreamService = new DreamService();
