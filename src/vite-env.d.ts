/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_NVIDIA_KEY: string
  readonly VITE_R1T_CHIMERA_KEY: string
  readonly VITE_REFLEX_MODEL: string
  readonly VITE_MEMORY_MODEL: string
  readonly VITE_CONSENSUS_MODEL: string
  readonly VITE_ENABLE_OFFLINE_MODE: string
  readonly VITE_ENABLE_VOICE_INPUT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
