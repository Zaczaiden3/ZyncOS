# ZyncOS Application Development Tasks

## Phase 1: Foundation & Stability (Current Focus)

- [x] **Persistence Layer**
  - [x] Implement `localStorage` or `IndexedDB` to persist chat history across reloads.
  - [ ] Create a `SessionManager` to handle multiple chat sessions.
  - [ ] Add "Export to JSON" functionality for backup.

- [ ] **Authentication System**
  - [x] Persist authentication state locally (keep user logged in).
  - [ ] Replace mock `LoginPage` with real authentication (e.g., Firebase Auth, Supabase, or Clerk).
  - [ ] Secure API keys (ensure they are not exposed in client-side bundles if possible, or use a proxy).
  - [ ] Add user profiles and settings (e.g., preferred voice, theme overrides).

- [ ] **Testing & Quality Assurance**
  - [ ] Set up Vitest or Jest for unit testing utility functions.
  - [ ] Create component tests for `SystemVisualizer` and `MessageItem`.

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

- [x] **Visualization & Transparency**
  - [x] Add "Confidence Shaders" to `MessageItem`.
  - [x] Add Neuro Confidence metric to `SystemVisualizer`.
  - [x] Create `NEURO` role for distinct visual feedback.

## Phase 3: Optimization & Deployment

- [ ] **Performance Optimization**
  - [ ] Optimize React re-renders in `SystemVisualizer` (use `requestAnimationFrame` or WebGL if needed).
  - [ ] Implement code splitting for heavy components.
  - [ ] Optimize asset loading (images, fonts).

- [ ] **Deployment Pipeline**
  - [x] Set up CI/CD (GitHub Actions) for automated testing and building.
  - [x] Configure environment variables for production.
  - [x] Deploy to Vercel, Netlify, or similar platform.

## Backlog / Ideas

- [ ] **"Consensus" Mode Expansion**: Allow 3+ models to debate a complex topic.
- [ ] **Plugin System**: Allow users to add custom "Tools" (e.g., Calculator, Weather) that the Reflex core can use.
- [ ] **Offline Mode**: Basic functionality using a smaller, local LLM (e.g., WebLLM) when offline.
