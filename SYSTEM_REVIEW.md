# System End-to-End Review: ZyncAi

This document outlines the structured review of the ZyncAi application system, covering scope, architecture, code, data, testing, security, and operations.

## 1. Scope

**Current Status:**

- **Core Functionality:** AI Chat interface with multi-model support (Gemini, OpenRouter, Local/Offline LLM).
- **Advanced Features:**
  - **Neuro-Symbolic Core:** Hybrid AI reasoning with graph-based memory.
  - **Multi-Core System:** Reflex, Memory, and Consensus cores with distinct personas.
  - **Plugin System:** Extensible tool integration.
  - **Offline Mode:** In-browser inference using WebLLM.
- **Target Audience:** Developers/Power users requiring advanced AI reasoning and local privacy options.

## 2. Architecture

**Current Status:**

- **Frontend:** React 19 + Vite.
- **Language:** TypeScript.
- **State Management:** React Context + Local State.
- **AI Integration:**
  - Cloud: Google GenAI SDK, OpenRouter SDK.
  - Local: MLC AI WebLLM.
- **Persistence:** IndexedDB (`idb`) for local storage, potentially Firebase for cloud sync (to be verified).
- **Deployment:** Docker support (`Dockerfile` present).

**Findings:**

- **Project Structure:** Non-standard. Source code (`components`, `services`, `cores`, `App.tsx`) resides in the **root directory** rather than a `src/` folder. The `src/` folder exists but only contains `assets` and `test`.
- **Configuration:** Vite is configured to alias `@` to the root `.` directory.

## 3. Code

**Current Status:**

- **Quality:** TypeScript is used, but strictness levels need verification.
- **Linting:** `npm run lint` script exists (`tsc --noEmit`).
- **Patterns:** Service-based architecture for AI logic (`services/`), Component-based UI (`components/`).

**Findings:**

- **Structure:** The root-level source files clutter the project root and deviate from standard React/Vite conventions (`src/` directory).

## 4. Data

**Current Status:**

- **Local Storage:** Uses IndexedDB (`idb`) for storing sessions/chat history (implied by dependencies).
- **Cloud Storage:** Firebase dependencies are present, but usage needs confirmation (no `firebase.json` found in root list, though `firebase` is in `package.json`).

## 5. Testing

**Current Status:**

- **Framework:** Vitest + React Testing Library.
- **Coverage:** 6 Test Files, 27 Tests.
- **Status:** **PASSING**.
  - 27 Tests Passed.

**Action Item:** Monitor tests for regressions.

## 6. Security

**Current Status:**

- **Policy:** `SECURITY.md` exists but is a **template**.
- **API Keys:** History of API key leaks. Need to ensure keys are strictly environment-variable managed (`.env`).
- **Input Validation:**
  - `auth.ts`: Relies on Firebase Auth for validation. Client-side validation exists in `LoginPage.tsx`.
  - `gemini.ts`: User input is embedded in prompts. Potential risk of Prompt Injection via conversation history (Context Stuffing). Recommended to switch to structured `history` arrays for Gemini API.

**Action Item:** Update `SECURITY.md` with actual policies and contact info. Ensure `.env` is in `.gitignore` (it is).

## 7. Operations

**Current Status:**

- **Build:** `npm run build` (Vite build).
- **Containerization:** `Dockerfile` is present.
- **CI/CD:** `.github` directory exists, suggesting GitHub Actions workflows.

## Action Plan

1. **Fix Testing:** Run tests and resolve the failing test case. (COMPLETED)
2. **Refactor Structure:** Move source code into `src/` to align with standards. (COMPLETED - `services/` folder cleanup verified)
3. **Update Documentation:** Fill out `SECURITY.md`.
4. **Verify Firebase:** Confirmed `auth.ts` uses Firebase Auth. `firebase.json` is missing, likely manual setup or only using Auth/Firestore SDKs without hosting config.
5. **Audit Code:** `gemini.ts` uses manual history injection. Recommend refactoring to use native ChatSession or structured content arrays.

## 8. Latest Verification (2025-12-02)

- **Linting:** Passed (`tsc --noEmit`).
- **File Structure:** Cleaned up redundant `services/` directory in root.
- **APIs:** Verified `gemini.ts` and `pluginManager.ts` integration.
- **Connectors:** Verified `NeuroSymbolicCore` and `tools.ts` registration.
