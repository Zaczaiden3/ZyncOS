export interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  bias: 'logical' | 'creative' | 'critical' | 'optimistic';
}

export interface SimulationResult {
  personaId: string;
  response: string;
  confidence: number;
}
