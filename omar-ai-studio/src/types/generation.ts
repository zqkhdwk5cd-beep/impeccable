import type { FluxGenerationParams, WorkflowPreset } from '@/services/comfyui/WorkflowTemplates'
import type { ImageMetadata } from '@/services/OutputService'

export type ModelType = 'flux-dev' | 'flux-dev-fp8' | 'flux-schnell'

export interface GenerationJob {
  id: string
  promptId: string | null
  params: FluxGenerationParams
  modelType: ModelType
  preset: WorkflowPreset | null
  status: 'pending' | 'queued' | 'generating' | 'completed' | 'error' | 'cancelled'
  progress: number
  maxProgress: number
  images: GeneratedImageEntry[]
  error: string | null
  startedAt: number
  completedAt: number | null
}

export interface GeneratedImageEntry {
  id: string
  url: string
  filename: string
  metadata: ImageMetadata | null
}

export interface ComfyUIConnectionState {
  status: 'unknown' | 'connected' | 'disconnected' | 'error'
  checkpoints: string[]
  loras: string[]
  vaes: string[]
  embeddings: string[]
  lastChecked: number | null
  error: string | null
}

export const FLUX_CHECKPOINTS: Record<ModelType, { label: string; description: string; filename: string }> = {
  'flux-dev': {
    label: 'Flux Dev',
    description: 'Full quality 12B parameter model. Best results, slower.',
    filename: 'flux1-dev.safetensors'
  },
  'flux-dev-fp8': {
    label: 'Flux Dev FP8',
    description: 'FP8 quantized version. Near-identical quality, faster on Apple Silicon.',
    filename: 'flux1-dev-fp8.safetensors'
  },
  'flux-schnell': {
    label: 'Flux Schnell',
    description: 'Distilled 4-step model. Very fast, slightly lower quality.',
    filename: 'flux1-schnell.safetensors'
  }
}
