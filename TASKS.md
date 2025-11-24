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
  - [ ] Implement E2E tests using Playwright or Cypress for the main chat flow.

## Phase 2: Feature Enhancement

- [ ] **Expanded Multimodal Capabilities**
  - [x] Add support for text file analysis (TXT, MD, JSON, CSV, Code).
  - [ ] Add support for PDF analysis.
  - [x] Implement Audio Input/Output (Speech-to-Text and Text-to-Speech) using the browser API or Gemini's multimodal capabilities.
  - [ ] Add "Vision" mode for real-time camera analysis (if applicable).

- [ ] **Advanced Memory Core**
  - [ ] Implement a vector database (client-side like `voy` or server-side) for long-term memory.
  - [ ] Allow the "Memory" core to reference past conversations (beyond the current session).
  - [ ] Add "Knowledge Graph" visualization for the Memory core's analysis.

- [ ] **UI/UX Polish**
  - [x] Add more granular "System Status" indicators (e.g., network latency, API quota usage).
  - [x] Improve mobile responsiveness for the "System Visualizer" (maybe a simplified view).
  - [ ] Add keyboard shortcuts for power users (beyond Command Palette).

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
