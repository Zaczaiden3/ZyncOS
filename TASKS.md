# ZyncOS Application Development Tasks

## Phase 1: Foundation & Stability (Current Focus)

- [x] **Persistence Layer**

  - [x] Implement `localStorage` or `IndexedDB` to persist chat history across reloads.
  - [x] Create a `SessionManager` to handle multiple chat sessions.
  - [x] Add "Export to JSON" functionality for backup.

- [x] **Authentication System**

  - [x] Persist authentication state locally (keep user logged in).
  - [x] Replace mock `LoginPage` with real authentication (e.g., Firebase Auth, Supabase, or Clerk).
  - [x] Secure API keys (ensure they are not exposed in client-side bundles if possible, or use a proxy).
  - [x] Add user profiles and settings (e.g., preferred voice, theme overrides).

- [x] **Testing & Quality Assurance**
  - [x] Set up Vitest or Jest for unit testing utility functions.
  - [x] Create component tests for `MessageItem`.
  - [x] Create component tests for `SystemVisualizer`.

## Phase 2: Zync AI Cores (New Architecture)

- [x] **Neuro-Symbolic Fusion**

  - [x] Implement `Lattice` for knowledge graph mapping.
  - [x] Implement `NeuroSymbolicCore` for hybrid reasoning.
  - [x] Integrate reasoning trace into `App.tsx` and UI.

- [x] **Persistent Topological Memory**

  - [x] Implement `TopologicalMemory` with `GhostBranch` support.
  - [x] Persist interactions to topological memory.

- [x] **Counterfactual Persona Simulation**

  - [x] Implement `PersonaSimulator` with multiple personas.
  - [x] Connect Simulator to UI via Command Palette (`/simulate`).

- [x] **Visualization & Transparency**
  - [x] Add "Confidence Shaders" to `MessageItem`.
  - [x] Add Neuro Confidence metric to `SystemVisualizer`.
  - [x] Create `NEURO` role for distinct visual feedback.
  - [x] Implement 3D `LatticeVisualizer` for Neuro-Symbolic graph.
  - [x] **Refine AI Core Prompts**: Enhanced Reflex (Cybernetic), Memory (Ghost Branching), and Consensus (Debate) personas.

## Phase 3: Optimization & Deployment

- [x] **Performance Optimization**

  - [x] Optimize React re-renders in `SystemVisualizer` (use `requestAnimationFrame` or WebGL if needed).
  - [x] Implement code splitting for heavy components.
  - [x] Optimize asset loading (images, fonts).

- [x] **Deployment Pipeline**
  - [x] Set up CI/CD (GitHub Actions) for automated testing and building.
  - [x] Configure environment variables for production.
  - [x] Deploy to Vercel, Netlify, or similar platform.

## Backlog / Ideas

- [x] **"Consensus" Mode Expansion**: Allow 3+ models to debate a complex topic.
- [x] **Plugin System**: Allow users to add custom "Tools" (e.g., Calculator, Weather) that the Reflex core can use.
- [x] **Offline Mode**: Basic functionality using a smaller, local LLM (e.g., WebLLM) when offline.
- [x] **Voice Input Enhancement**: Real-time audio visualization and improved UI.

## Phase 4: Cognitive Expansion & Multi-Modal Synthesis

- [x] **Text-to-Speech (TTS) Synthesis**

  - [x] Implement `VoiceSynthesisService` using Web Speech API or external API (e.g., ElevenLabs).
  - [x] Add "Speak" button to `MessageItem` for reading responses.
  - [x] Create a "Mute/Unmute" global toggle in the UI.
  - [x] Implement Voice Configuration UI (Voice selection, Rate, Pitch).

- [x] **Generative UI Components**

  - [x] Allow the AI to render React components (e.g., charts, tables, code blocks) dynamically based on context.
  - [x] Create a `ComponentRenderer` to safely parse and display these elements.

- [x] **"Dream State" Memory Optimization**

  - [x] Implement a background process that clusters and refines topological memory when the system is idle.
  - [x] Visualize this "dreaming" process in the `SystemVisualizer`.

- [x] **External Knowledge Integration**

  - [x] Connect `Reflex` core to a real web search API (e.g., Tavily, Serper) for up-to-date information.
  - [x] Display citations and sources in the UI.

- [x] **Offline Mode Implementation**
  - [x] Integrate `@mlc-ai/web-llm` for local inference.
  - [x] Add UI toggle and status indicators.
  - [x] Verify offline model initialization and response generation.

## Phase 5: Agentic Evolution & Governance (New)

- [ ] **Agentic Workflows & Tools-as-Programs**

  - [ ] **Workflow Chaining**: Allow Reflex to chain tools (search -> calc -> summarize) with visual trace.
  - [ ] **User-Defined Tools**: Implement a simple DSL/JSON schema for custom tools.

- [ ] **Memory Governance & Introspection**

  - [ ] **Memory Inspector**: UI to inspect, edit, and pin nodes in TopologicalMemory.
  - [ ] **Memory Policies**: Implement forgetting, compressing, and redacting with "memory diff".

- [ ] **Persona & Consensus Research Mode**

  - [ ] **Experiment Lab**: Configurable personas, controlled prompts, and exportable logs.
  - [ ] **Evaluation Hooks**: Scoring and user ratings for answer quality.

- [ ] **UX & Productization**

  - [ ] **Role-Based Boards**: Executive (analytics) vs Employee (tasks) views.
  - [ ] **Safety & Policy**: Policy modules (PII masking, restricted calls) and settings toggles.

- [ ] **Technical Hardening**
  - [ ] **Observability**: Instrument cores with metrics (latency, token usage) and "System Health" UI.
  - [ ] **Deterministic Paths**: Schema-validated tool calls and component rendering.
