import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_AGENTS } from '@/types/agent'
import type { AgentId, AgentConfig, AgentRuntimeState } from '@/types/agent'
import type { Task } from '@/types/task'
import type { Project, MemoryItem } from '@/types/project'
import type { PromptPack, LogEntry, PermissionRequest } from '@/types/promptPack'
import type { Language } from '@/i18n/translations'
import { DEFAULT_SKILLS, ADVANCED_CODING_SKILLS } from '@/types/skill'
import type { Skill } from '@/types/skill'
import type { SkillMatchResult } from '@/engine/skillMatcher'
import type { GenerationJob, ComfyUIConnectionState } from '@/types/generation'
import type { FluxGenerationParams, WorkflowPreset } from '@/services/comfyui/WorkflowTemplates'
import type { ModelType } from '@/types/generation'

export type SidebarView = 'workspace' | 'memory' | 'packs' | 'agents' | 'settings' | 'coding' | 'skills'

export type ActiveSection = 'studio' | 'coding' | 'image-gen'
export type StudioView = 'overview' | 'chief' | 'story' | 'character' | 'image' | 'video' | 'research' | 'memory'
export type CodingView = 'lab' | 'new-project' | 'skills' | 'history'
export type ImageGenView = 'generate' | 'hardware'

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

  // Language
  language: Language

  // UI
  activeView: SidebarView
  commandInput: string

  // New section-based navigation
  activeSection: ActiveSection
  studioView: StudioView
  codingView: CodingView
  imageGenView: ImageGenView

  // Memory
  memoryItems: MemoryItem[]

  // Permissions
  permissionRequests: PermissionRequest[]

  // Coding workspace
  codingProjectPath: string | null

  // Skills
  skills: Skill[]

  // Last skill match result
  lastSkillMatch: SkillMatchResult | null

  // Image Generation
  comfyUIConnection: ComfyUIConnectionState
  generationJobs: GenerationJob[]
  activeGenerationId: string | null
  imageGenParams: FluxGenerationParams
  selectedModelType: ModelType
  selectedPreset: WorkflowPreset | null

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
  setLanguage: (lang: Language) => void

  addLog: (log: LogEntry) => void
  clearLogs: () => void

  addPromptPack: (pack: PromptPack) => void
  setCurrentOutput: (output: PromptPack | null) => void

  addPermissionRequest: (req: PermissionRequest) => void
  resolvePermission: (reqId: string, granted: boolean) => void

  setActiveView: (view: SidebarView) => void
  setCommandInput: (input: string) => void

  // New section-based navigation actions
  setActiveSection: (section: ActiveSection) => void
  setStudioView: (view: StudioView) => void
  setCodingView: (view: CodingView) => void
  setImageGenView: (view: ImageGenView) => void

  addMemoryItem: (item: MemoryItem) => void
  deleteMemoryItem: (id: string) => void

  setCodingProjectPath: (path: string | null) => void
  updateSkill: (id: string, updates: Partial<Skill>) => void
  addSkill: (skill: Skill) => void
  deleteSkill: (id: string) => void
  setLastSkillMatch: (result: SkillMatchResult | null) => void

  // Image generation actions
  setComfyUIConnection: (state: Partial<ComfyUIConnectionState>) => void
  addGenerationJob: (job: GenerationJob) => void
  updateGenerationJob: (id: string, updates: Partial<GenerationJob>) => void
  setActiveGenerationId: (id: string | null) => void
  setImageGenParams: (params: Partial<FluxGenerationParams>) => void
  setSelectedModelType: (model: ModelType) => void
  setSelectedPreset: (preset: WorkflowPreset | null) => void
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

  language: (storedData?.language ?? 'en') as Language,

  activeView: 'workspace',
  commandInput: '',

  // New section navigation — default to studio/overview
  activeSection: 'studio',
  studioView: 'overview',
  codingView: 'lab',
  imageGenView: 'generate',

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

  codingProjectPath: storedData?.codingProjectPath ?? null,

  skills: storedData?.skills ?? [...DEFAULT_SKILLS, ...ADVANCED_CODING_SKILLS],

  lastSkillMatch: null,

  // Image Generation defaults
  comfyUIConnection: {
    status: 'unknown',
    checkpoints: [],
    loras: [],
    vaes: [],
    embeddings: [],
    lastChecked: null,
    error: null
  },
  generationJobs: [],
  activeGenerationId: null,
  selectedModelType: 'flux-dev',
  selectedPreset: null,
  imageGenParams: {
    checkpoint: 'flux1-dev.safetensors',
    prompt: '',
    negativePrompt: '',
    width: 1024,
    height: 1024,
    steps: 28,
    cfg: 3.5,
    seed: -1,
    sampler: 'euler',
    scheduler: 'simple',
    batchSize: 1
  },

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

  setLanguage: (language) => {
    set({ language })
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

  setActiveSection: (section) => set({ activeSection: section }),
  setStudioView: (view) => set({ studioView: view }),
  setCodingView: (view) => set({ codingView: view }),
  setImageGenView: (view) => set({ imageGenView: view }),

  addMemoryItem: (item) => {
    set((s) => ({ memoryItems: [...s.memoryItems, item] }))
    persist(get())
  },

  deleteMemoryItem: (id) => {
    set((s) => ({ memoryItems: s.memoryItems.filter((m) => m.id !== id) }))
    persist(get())
  },

  setCodingProjectPath: (path) => {
    set({ codingProjectPath: path })
    persist(get())
  },

  updateSkill: (id, updates) => {
    set((s) => ({
      skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...updates } : sk))
    }))
    persist(get())
  },

  addSkill: (skill) => {
    set((s) => ({ skills: [...s.skills, skill] }))
    persist(get())
  },

  deleteSkill: (id) => {
    set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) }))
    persist(get())
  },

  setLastSkillMatch: (result) => set({ lastSkillMatch: result }),

  setComfyUIConnection: (updates) => {
    set((s) => ({ comfyUIConnection: { ...s.comfyUIConnection, ...updates } }))
  },

  addGenerationJob: (job) => {
    set((s) => ({ generationJobs: [job, ...s.generationJobs].slice(0, 50) }))
  },

  updateGenerationJob: (id, updates) => {
    set((s) => ({
      generationJobs: s.generationJobs.map((j) => (j.id === id ? { ...j, ...updates } : j))
    }))
  },

  setActiveGenerationId: (id) => set({ activeGenerationId: id }),

  setImageGenParams: (params) => {
    set((s) => ({ imageGenParams: { ...s.imageGenParams, ...params } }))
  },

  setSelectedModelType: (model) => set({ selectedModelType: model }),
  setSelectedPreset: (preset) => set({ selectedPreset: preset })
}))

function persist(state: AppStore): void {
  try {
    localStorage.setItem(
      'omar-ai-studio',
      JSON.stringify({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        promptPacks: state.promptPacks,
        memoryItems: state.memoryItems,
        language: state.language,
        codingProjectPath: state.codingProjectPath,
        skills: state.skills
      })
    )
  } catch {
    // Storage full or unavailable
  }
}
