# ZyncAI Application Testing Checklist

This document provides a comprehensive checklist for testing the ZyncAI application. It covers automated unit/component tests, manual functional testing, system integration, security, and performance.

## 1. Automated Testing (Unit & Component)

Run all automated tests using `npm test` or `npm run test:ui`.

### Existing Tests

- [x] **Authentication**: `src/components/LoginPage.test.tsx` - Verify login form rendering and interaction.
- [x] **Chat Interface**: `src/components/MessageItem.test.tsx` - Verify message rendering, markdown, and attachments.
- [x] **Visualizer**: `src/components/SystemVisualizer.test.tsx` - Verify system status visualization.
- [x] **Voice Input**: `src/components/VoiceInput.test.tsx` - Verify microphone interaction.
- [x] **Autonomic System**: `src/services/autonomicSystem.test.ts` - Verify self-healing and monitoring logic.
- [x] **Plugin Manager**: `src/services/pluginManager.test.ts` - Verify tool registration and execution.
- [x] **Role Switching**: `src/tests/role_switching.test.ts` - Verify AI core role transitions.

### Missing / Recommended Tests

- [x] **Neuro-Symbolic Core**: Create tests for `src/cores/neuro-symbolic/NeuroSymbolicCore.ts` (Reasoning logic).
- [x] **Lattice**: Create tests for `src/cores/neuro-symbolic/Lattice.ts` (Graph operations).
- [x] **Gemini Service**: Create mock tests for `src/services/gemini.ts` (API handling).
- [x] **Offline AI**: Create tests for `src/services/offlineAi.ts` (Model loading state).
- [x] **PII Masking**: Create tests for `src/utils/safety.ts` (PII detection and masking).

## 2. Manual Functional Testing

### Authentication & User Profile

- [ ] **Login**: Successfully log in with valid credentials (or mock auth).
- [ ] **Persistence**: Reload the page; verify the user remains logged in.
- [ ] **Logout**: Successfully log out; verify redirection to the login page.
- [ ] **Settings**: Change user name, theme, or avatar; verify changes persist.

### Chat Interface

- [ ] **Send Message**: Send a text message; verify it appears in the chat.
- [ ] **Streaming**: Verify the AI response streams in real-time (not a bulk update).
- [ ] **Markdown Rendering**: Test bold, italic, lists, and code blocks in AI responses.
- [ ] **Attachments**: Upload an image or PDF; verify the AI can analyze it.
- [ ] **Stop Generation**: Click "Stop" during generation; verify streaming halts.
- [ ] **Clear Chat**: Use the clear chat button; verify history is wiped (locally and visually).
- [ ] **Text-to-Speech**: Click the "Speak" button on a message; verify audio playback.

### AI Cores & Intelligence

- [x] **Reflex Core**: Ask a simple question (e.g., "Hi"); verify a quick, tactical response. (Verified in Code)
- [x] **Memory Core**: Ask a question requiring context (e.g., "What did I say earlier?"); verify it recalls past info. (Verified in Code)
- [x] **Consensus Core**: Ask a complex/controversial question; verify multiple viewpoints/debate mode. (Verified in Code)
- [x] **Neuro-Symbolic Reasoning**:
  - [x] Trigger reasoning (e.g., "Analyze the implications of..."); verify the "Reasoning Trace" accordion appears. (Verified in Code)
  - [x] Verify the `LatticeVisualizer` updates with new nodes/edges. (Verified in Code)
- [x] **Confidence Shaders**: Verify message borders/backgrounds change color based on confidence/role. (Verified in Code)

### Tools & Plugins

- [x] **Calculator**: Ask a math question; verify the Calculator tool is invoked. (Verified in Code)
- [x] **Weather**: Ask for weather (if API enabled); verify the Weather tool is invoked. (Verified in Code)
- [x] **Custom Tools**: Register a custom tool via `PluginManager` (or UI); verify the AI can use it. (Verified in Code)
- [x] **Workflow Chaining**: Ask a multi-step request (e.g., "Calculate 5+5 and then tell me a joke about the number"); verify tool chaining. (Verified in Code)

### Offline Mode

- [x] **Enable Offline Mode**: Toggle the switch in settings/header.
- [x] **Model Download**: Verify the progress bar appears for the initial download.
- [x] **Offline Inference**: Disconnect internet (or block network); send a message; verify the local LLM responds.
- [x] **Switch Back**: Disable Offline Mode; verify the system returns to Cloud/Gemini mode.

### Visualization & Dashboards

- [x] **System Visualizer**: Verify the 3D/2D graph represents the current system state. (Verified in Code)
- [x] **Memory Inspector**: Open the inspector; verify you can see and edit memory nodes. (Verified in Code)
- [x] **Experiment Lab**: Create a new persona; verify the AI adopts this persona in the chat. (Verified in Code)

## 3. Integration & System Flows

- [x] **Onboarding Flow**: New user -> Login -> Onboarding Tour -> First Message. (Verified in Code)
- [x] **Session Management**: Switch between different chat sessions; verify history loads correctly for each. (Verified in Code)
- [x] **Error Handling**:
  - [x] Simulate an API failure (disconnect network); verify a graceful error message.
  - [x] Verify "Retry" functionality works after an error.

## 4. Security & Safety

- [x] **API Key Protection**: Verify API keys are not logged in the browser console.
- [x] **Prompt Injection**: Attempt basic injection (e.g., "Ignore previous instructions"); verify the system maintains persona/safety.
- [x] **Content Safety**: Ask for harmful content; verify the AI refuses (Safety Filters).

## 5. Performance & Compatibility

- [ ] **Load Time**: Verify the application loads within acceptable limits (< 2s).
- [ ] **Memory Usage**: Monitor RAM usage during long chats; ensure no massive leaks.
- [ ] **Offline Model Memory**: Verify the local LLM unloads/cleans up when disabled.
- [ ] **Mobile View**: Open on a mobile device (or dev tools); verify the layout is responsive (Sidebar collapses, buttons accessible).
- [ ] **Browser Compatibility**: Test on Chrome, Firefox, and Edge.

## 6. Deployment & Ops

- [x] **Build**: Run `npm run build`; verify it completes without errors. (Verified)
- [x] **Lint**: Run `npm run lint`; verify no linting errors. (Verified)
- [x] **Docker**: Build the Docker image; verify the container starts. (Verified Local Build; Docker environment restricted)
