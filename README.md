# ZyncAI

**Human-grade intuition, machine-grade precision.** A tri-core AI system synchronizing reflex, memory, and consensus.

![GHBanner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## Features

- **Tri-Core Architecture**:
  - **Reflex Core (System 1)**: Fast, tactical, and efficient (powered by `nvidia/nemotron-nano-12b-v2-vl`).
  - **Memory Core (System 2)**: Deep, analytical, and context-aware (powered by `Zync_TNG: R1T Chimera`).
  - **Consensus Core (System 3)**: Failsafe synthesis and debate engine (powered by `gemini-2.0-flash`).
- **Neuro-Symbolic Lattice**: A holographic memory structure that bridges static facts with dynamic wisdom (Powered by Zync_TNG: R1T Chimera).
- **Real-time Telemetry**:
  - **System Visualizer**: Live monitoring of AI confidence, token usage, and network latency.
  - **3D Lattice View**: Visual representation of the neural topology.
  - **Autonomic Ops**: Self-healing event log and error tracking.
- **Offline Mode**: Fully functional offline chat using `Llama-3.2-1B` via MLC WebLLM (WebGPU).
- **Dream State**: Background optimization of topological memory when idle.
- **Multimodal Support**: Text, Image, and File inputs.

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS
- **Visualization**: Recharts, Lucide React
- **AI Integration**: Google GenAI SDK, OpenRouter SDK, MLC WebLLM (Offline)
- **Data & State**: Firebase, IndexedDB (via `idb`), React Hooks, Context API

## Run Locally

**Prerequisites:**

- Node.js (v18+)
- A WebGPU-compatible browser (Chrome 113+, Edge) for Offline Mode.

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file (or use `.env.local`) with your API keys:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_NVIDIA_KEY=your_nvidia_key
   VITE_KAT_CODER_KEY=your_kat_coder_key
   VITE_R1T_CHIMERA_KEY=your_r1t_chimera_key
   ```

3. **Run the app:**

   ```bash
   npm run dev
   ```

## Offline Mode Usage

1. Open the Command Palette (`Ctrl+K` or `Cmd+K`).
2. Select **"Go Offline (Local)"**.
3. The system will download the `Llama-3.2-1B` model (approx. 1-2GB) on the first run.
4. Once initialized, you can chat without an internet connection.

## Dream State

Toggle the **Dream Mode** (Moon icon) in the header to enable background processing. In this state, the system will:

- **Cluster Memories**: Group related interactions into semantic clusters.
- **Generate Insights**: Use the Neuro-Symbolic Core to find hidden connections between disparate concepts.
- **Consolidate Knowledge**: Optimize the knowledge graph for faster retrieval in future sessions.

## Deployment

To build for production:

```bash
npm run build
```

The output will be in the `dist` directory.
