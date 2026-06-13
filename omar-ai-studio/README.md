# Omar AI Studio

Visual multi-agent AI command center for creative content production.

## What It Does

Omar AI Studio is a desktop app where 7 specialized AI agents work together in real time to produce creative prompt packs for video, image, and story production. Watch each agent activate, think, and produce output — all visualized on a professional dark dashboard.

## The 7 Agents

| Agent | Color | Role |
|-------|-------|------|
| ⚡ Chief Agent | Purple | Orchestrates all agents, plans tasks, assembles final output |
| 📖 Story Agent | Teal | Cinematic stories, scene structure, emotional beats |
| 🎭 Character Agent | Gold | Character bibles, visual consistency, personality guides |
| 🎨 Image Agent | Coral | Image prompts for Flux / ComfyUI / Midjourney |
| 🎬 Video Agent | Blue | Video prompts for Kling / Runway / Veo / SuperGrok |
| 🔍 Research Agent | Mint | Tool research, comparisons, recommendations |
| 🧠 Memory Agent | Lavender | Stores character bibles, style guides, prompt packs |

## Installation

```bash
cd omar-ai-studio
npm install
```

### One-time Playwright setup (for development)
```bash
npx playwright install chromium
```

## Running

```bash
# Development (with hot reload)
npm run dev

# Build for distribution
npm run build
npm run package
```

## Example Request

Type this in the command input:

```
اعمل حلقة جديدة للأرنب Hopper مدتها 15 ثانية
```

The app will:
1. Chief Agent analyzes the request and creates a task plan
2. Story Agent writes a 3-scene cinematic story with emotional beats
3. Character Agent loads the Hopper character bible
4. Image Agent creates Flux-compatible image prompts for each scene
5. Video Agent creates Kling/Runway video prompts with camera specs
6. Memory Agent saves the project and prompt pack

All steps are shown live as animated task cards with progress indicators.

## Modes

- **Mock Mode** — No API keys needed. Agents simulate realistic behavior with delays. Perfect for testing the UI and workflow.
- **Live Mode** — Connect to real AI APIs (OpenAI, Anthropic, Ollama). Edit each agent's system prompt from the Agents settings panel.

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  ⚡ Omar AI Studio  │  Project Name  │  Mode  │ ▶ Run│
├──────────┬──────────────────────────┬────────────────┤
│          │  Command Input           │                │
│ Sidebar  │  ─────────────────────  │  Agent Panel   │
│          │  Workflow Timeline       │  ⚡ Chief       │
│ Projects │  • Task Card 1          │  📖 Story       │
│ Memory   │  • Task Card 2          │  🎭 Character   │
│ Packs    │  • Task Card 3          │  🎨 Image       │
│ Agents   │                         │  🎬 Video       │
│ Settings │  Output Preview         │  🔍 Research   │
│          │                         │  🧠 Memory     │
├──────────┴──────────────────────────┴────────────────┤
│  Console  [SYSTEM] Ready. Enter a command...         │
└─────────────────────────────────────────────────────┘
```

## Folder Structure

```
omar-ai-studio/
├── electron/
│   ├── main.ts          # Electron main process
│   └── preload.ts       # IPC bridge
├── src/
│   ├── types/
│   │   ├── agent.ts     # Agent types + DEFAULT_AGENTS config
│   │   ├── task.ts      # Task types
│   │   ├── project.ts   # Project + Memory types
│   │   └── promptPack.ts # PromptPack + LogEntry types
│   ├── engine/
│   │   ├── eventBus.ts       # Typed pub/sub event system
│   │   ├── taskQueue.ts      # FIFO task queue with pause/resume
│   │   ├── permissionManager.ts # Permission request/resolve
│   │   ├── mockRunner.ts     # Simulated agent execution with delays
│   │   └── orchestrator.ts   # Main workflow coordinator
│   ├── store/
│   │   └── appStore.ts  # Zustand global state
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── AgentCard.tsx      # Individual + panel components
│   │   ├── TaskCard.tsx
│   │   ├── WorkflowTimeline.tsx
│   │   ├── ConsoleLog.tsx
│   │   ├── OutputPreview.tsx
│   │   ├── AgentSettings.tsx
│   │   ├── MemoryView.tsx
│   │   ├── PromptPacksView.tsx
│   │   └── PermissionModal.tsx
│   ├── styles/
│   │   └── globals.css  # Full design system in CSS variables
│   ├── App.tsx
│   └── main.tsx
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

## Adding Real API Calls

The mock runner in `src/engine/mockRunner.ts` is the only place to change for v2:

```typescript
// Replace runMockTask() with a real API call:
export async function runLiveTask(task: Task, apiKey: string): Promise<string> {
  // Call OpenAI / Anthropic / Ollama here
  // Return the agent's output as a string
}
```

Each agent's `instructions` field (in `src/types/agent.ts`) becomes the system prompt.

## Connecting External Tools

| Tool | Where to connect |
|------|-----------------|
| Flux / ComfyUI | Image Agent output → POST to ComfyUI API |
| Kling / Runway | Video Agent output → submit to platform API |
| OpenAI | Replace mockRunner with openai.chat.completions.create |
| Anthropic | Replace mockRunner with anthropic.messages.create |
| Ollama | Replace mockRunner with local Ollama HTTP API |

## Permissions

The Permission Manager requires user confirmation before:
- Deleting files
- Overwriting memory
- Making paid API calls
- Publishing content
- Sending external requests
- Exporting files outside the app folder

## Example Project (Pre-loaded)

**"Hopper — Cute Rabbit"**
- Cute rabbit learns vegetables
- 3 scenes, Pixar-inspired 3D animation
- Character bible pre-loaded in Memory

Run: `اعمل حلقة جديدة للأرنب Hopper مدتها 15 ثانية`

## Tech Stack

- **Electron 31** — Desktop wrapper
- **React 18** — UI
- **TypeScript** — Full type safety
- **Zustand** — State management
- **electron-vite** — Build system
- **localStorage** — Persistence (v1)
