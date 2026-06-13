import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_AGENTS } from '@/types/agent'
import type { AgentId, AgentConfig, AgentRuntimeState } from '@/types/agent'
import type { Task } from '@/types/task'
import type { Project, MemoryItem } from '@/types/project'
import type { PromptPack, LogEntry, PermissionRequest } from '@/types/promptPack'

export type SidebarView = 'workspace' | 'memory' | 'packs' | 'agents' | 'settings'

function buildInitialAgentState(agentId: AgentId): AgentRuntimeState {
  return {
    agentId,
    status: 'idle',
    currentTask: null,
    progress: 0,
    lastAction: null,
    output: null,
    error: null,
    startedAt: null,
    completedAt: null
  }
}

const EXAMPLE_PROJECT: Project = {
  id: 'example-project',
  name: 'Hopper — Cute Rabbit',
  description: 'Cute rabbit learns vegetables. 3 scenes, Pixar-inspired 3D animation.',
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now() - 3600000,
  status: 'active',
  tags: ['animation', '3d', 'pixar', 'rabbit'],
  promptPackIds: []
}

interface AppStore {
  // Projects
  projects: Project[]
  currentProjectId: string | null

  // Agents
  agents: AgentConfig[]
  agentStates: Record<string, AgentRuntimeState>

  // Workflow
  isRunning: boolean
  isPaused: boolean
  tasks: Task[]

  // Output
  currentOutput: PromptPack | null
  promptPacks: PromptPack[]

  // Logs
  logs: LogEntry[]

  // Mode
  mode: 'mock' | 'live'

  // UI
  activeView: SidebarView
  commandInput: string

  // Memory
  memoryItems: MemoryItem[]

  // Permissions
  permissionRequests: PermissionRequest[]

  // Actions
  setCurrentProject: (id: string) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void

  updateAgentState: (agentId: AgentId, updates: Partial<AgentRuntimeState>) => void
  updateAgentConfig: (agentId: AgentId, updates: Partial<AgentConfig>) => void

  addTask: (task: Task) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  clearTasks: () => void

  setIsRunning: (running: boolean) => void
  setIsPaused: (paused: boolean) => void
  setMode: (mode: 'mock' | 'live') => void

  addLog: (log: LogEntry) => void
  clearLogs: () => void

  addPromptPack: (pack: PromptPack) => void
  setCurrentOutput: (output: PromptPack | null) => void

  addPermissionRequest: (req: PermissionRequest) => void
  resolvePermission: (reqId: string, granted: boolean) => void

  setActiveView: (view: SidebarView) => void
  setCommandInput: (input: string) => void

  addMemoryItem: (item: MemoryItem) => void
  deleteMemoryItem: (id: string) => void
}

const storedData = (() => {
  try {
    const raw = localStorage.getItem('omar-ai-studio')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})()

export const useAppStore = create<AppStore>((set, get) => ({
  projects: storedData?.projects ?? [EXAMPLE_PROJECT],
  currentProjectId: storedData?.currentProjectId ?? 'example-project',

  agents: DEFAULT_AGENTS,
  agentStates: Object.fromEntries(
    DEFAULT_AGENTS.map((a) => [a.id, buildInitialAgentState(a.id as AgentId)])
  ),

  isRunning: false,
  isPaused: false,
  tasks: [],

  currentOutput: null,
  promptPacks: storedData?.promptPacks ?? [],

  logs: [],

  mode: 'mock',

  activeView: 'workspace',
  commandInput: '',

  memoryItems: storedData?.memoryItems ?? [
    {
      id: uuidv4(),
      projectId: 'example-project',
      type: 'character-bible',
      title: 'Hopper — Character Bible v1',
      content: 'Cream-white rabbit, amber eyes, orange scarf. Pixar proportions. Curious, warm, child-friendly.',
      tags: ['hopper', 'rabbit', 'character'],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000
    }
  ],

  permissionRequests: [],

  // Actions
  setCurrentProject: (id) => {
    set({ currentProjectId: id })
    persist(get())
  },

  addProject: (project) => {
    set((s) => ({ projects: [...s.projects, project] }))
    persist(get())
  },

  updateProject: (id, updates) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p))
    }))
    persist(get())
  },

  updateAgentState: (agentId, updates) => {
    set((s) => ({
      agentStates: {
        ...s.agentStates,
        [agentId]: { ...s.agentStates[agentId], ...updates }
      }
    }))
  },

  updateAgentConfig: (agentId, updates) => {
    set((s) => ({
      agents: s.agents.map((a) => (a.id === agentId ? { ...a, ...updates } : a))
    }))
    persist(get())
  },

  addTask: (task) => {
    set((s) => ({ tasks: [...s.tasks, task] }))
  },

  updateTask: (taskId, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    }))
  },

  clearTasks: () => set({ tasks: [] }),

  setIsRunning: (running) => set({ isRunning: running }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setMode: (mode) => {
    set({ mode })
    persist(get())
  },

  addLog: (log) => {
    set((s) => ({
      logs: [...s.logs.slice(-499), log]
    }))
  },

  clearLogs: () => set({ logs: [] }),

  addPromptPack: (pack) => {
    set((s) => ({ promptPacks: [...s.promptPacks, pack] }))
    persist(get())
  },

  setCurrentOutput: (output) => set({ currentOutput: output }),

  addPermissionRequest: (req) => {
    set((s) => ({ permissionRequests: [...s.permissionRequests, req] }))
  },

  resolvePermission: (reqId, granted) => {
    set((s) => ({
      permissionRequests: s.permissionRequests.map((r) =>
        r.id === reqId ? { ...r, resolved: true, granted } : r
      )
    }))
  },

  setActiveView: (view) => set({ activeView: view }),
  setCommandInput: (input) => set({ commandInput: input }),

  addMemoryItem: (item) => {
    set((s) => ({ memoryItems: [...s.memoryItems, item] }))
    persist(get())
  },

  deleteMemoryItem: (id) => {
    set((s) => ({ memoryItems: s.memoryItems.filter((m) => m.id !== id) }))
    persist(get())
  }
}))

function persist(state: AppStore): void {
  try {
    localStorage.setItem(
      'omar-ai-studio',
      JSON.stringify({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        promptPacks: state.promptPacks,
        memoryItems: state.memoryItems
      })
    )
  } catch {
    // Storage full or unavailable
  }
}
