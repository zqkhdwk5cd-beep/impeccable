export interface ImagePrompt {
  scene: number
  title: string
  description: string
  prompt: string
  negativePrompt: string
  style: string
  camera: string
  lighting: string
  aspectRatio: string
}

export interface VideoPrompt {
  scene: number
  title: string
  description: string
  prompt: string
  camera: string
  duration: number
  lighting: string
  motion: string
  lens: string
  fps: number
}

export interface PromptPack {
  id: string
  projectId: string
  title: string
  request: string
  createdAt: number
  storyOutput: string | null
  characterOutput: string | null
  imagePrompts: ImagePrompt[]
  videoPrompts: VideoPrompt[]
  researchNotes: string | null
  notes: string | null
  codingOutput: string | null
  tags: string[]
}

export interface LogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'success' | 'debug'
  agentId: string | null
  message: string
  details: string | null
}

export interface PermissionRequest {
  id: string
  action: string
  description: string
  details: string
  riskLevel: 'low' | 'medium' | 'high'
  resolved: boolean
  granted: boolean | null
  timestamp: number
}
