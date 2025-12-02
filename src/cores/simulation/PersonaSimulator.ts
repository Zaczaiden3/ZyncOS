import { Persona, SimulationResult } from './types';

export class PersonaSimulator {
  private personas: Persona[];

  constructor() {
    this.personas = [
      {
        id: 'skeptic',
        name: 'The Skeptic',
        systemPrompt: 'Role: You are "The Skeptic".\nDirective: Question necessity, accuracy, and potential failure modes. Identify weak points in the user\'s query or the proposed solution. Be critical but constructive.',
        bias: 'critical'
      },
      {
        id: 'visionary',
        name: 'The Visionary',
        systemPrompt: 'Role: You are "The Visionary".\nDirective: Seek potential, synthesis, and long-term evolution. Look beyond the immediate problem to the broader implications and future possibilities.',
        bias: 'optimistic'
      },
      {
        id: 'engineer',
        name: 'The Engineer',
        systemPrompt: 'Role: You are "The Engineer".\nDirective: Focus on structure, logic, and 3D semantic mapping. Analyze the technical feasibility, architectural integrity, and implementation details.',
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
