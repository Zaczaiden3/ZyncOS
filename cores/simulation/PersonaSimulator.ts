import { Persona, SimulationResult } from './types';

export class PersonaSimulator {
  private personas: Persona[];

  constructor() {
    this.personas = [
      {
        id: 'skeptic',
        name: 'The Skeptic',
        systemPrompt: 'You are a critical thinker. Question every assumption. Look for flaws in logic.',
        bias: 'critical'
      },
      {
        id: 'optimist',
        name: 'The Visionary',
        systemPrompt: 'You are an optimist. Focus on potential, growth, and future possibilities.',
        bias: 'optimistic'
      },
      {
        id: 'logician',
        name: 'The Logician',
        systemPrompt: 'You are a pure logician. Focus on facts, axioms, and deductive reasoning. Ignore emotion.',
        bias: 'logical'
      }
    ];
  }

  // In a real system, this would call the LLM with the specific system prompt
  async simulate(query: string, mockResponseGenerator: (persona: Persona, query: string) => Promise<string>): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];

    for (const persona of this.personas) {
      const response = await mockResponseGenerator(persona, query);
      results.push({
        personaId: persona.id,
        response,
        confidence: 0.85 // Placeholder
      });
    }

    return results;
  }

  getPersonas(): Persona[] {
    return this.personas;
  }
}

export const personaSimulator = new PersonaSimulator();
