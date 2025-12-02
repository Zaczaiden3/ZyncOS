# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability, please report it immediately.

### How to Report

Please email <security@zync.ai> with a detailed description of the issue. We aim to acknowledge reports within 24 hours.

### API Key Management

- **NEVER** commit API keys to the repository.
- Use `.env` files for local development.
- Ensure `.env` is listed in `.gitignore`.
- If a key is leaked, revoke it immediately via the respective provider console (Google Cloud, OpenRouter, etc.).

### Data Privacy

- Local chat history is stored in the user's browser using IndexedDB.
- No personal data is sent to our servers unless explicitly enabled for cloud sync (future feature).
- When using external LLMs (Gemini, OpenRouter), data is sent to these providers according to their privacy policies.

### Offline Mode

- Offline mode uses WebLLM to run models locally in the browser.
- No data leaves the device in offline mode.
