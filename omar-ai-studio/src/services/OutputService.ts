// Output save service — writes generated images + metadata to disk via Electron IPC

import type { FluxGenerationParams } from './comfyui/WorkflowTemplates'

export interface ImageMetadata {
  id: string
  filename: string
  prompt: string
  negativePrompt: string
  model: string
  checkpoint: string
  width: number
  height: number
  steps: number
  cfg: number
  seed: number
  sampler: string
  scheduler: string
  lora?: { name: string; strength: number }
  generatedAt: number
  projectId?: string
  tags: string[]
}

export interface SavedImage {
  metadata: ImageMetadata
  localPath: string
  thumbnailPath?: string
}

const OUTPUT_SUBFOLDERS = ['images', 'projects', 'workflows', 'prompts'] as const

class OutputService {
  private outputRoot: string | null = null

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !window.api) return

    try {
      const result = await window.api.fs.getDataDir()
      if (result.success && result.data) {
        this.outputRoot = `${result.data}/outputs`
        // Create output subfolders
        for (const sub of OUTPUT_SUBFOLDERS) {
          await window.api.fs.writeFile(
            `${this.outputRoot}/${sub}/.keep`,
            ''
          )
        }
      }
    } catch {
      // Filesystem not available (e.g., browser mode)
    }
  }

  async saveGeneratedImage(
    imageUrl: string,
    params: FluxGenerationParams,
    projectId?: string
  ): Promise<ImageMetadata | null> {
    if (!this.outputRoot || typeof window === 'undefined' || !window.api) {
      return null
    }

    const id = crypto.randomUUID()
    const timestamp = Date.now()
    const filename = `flux_${timestamp}_${id.slice(0, 8)}.png`

    // Fetch image data from ComfyUI view endpoint
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((acc, b) => acc + String.fromCharCode(b), '')
      )

      // Save image via IPC
      const imagePath = `${this.outputRoot}/images/${filename}`
      await window.api.fs.writeFile(imagePath, base64)

      const metadata: ImageMetadata = {
        id,
        filename,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model: 'flux',
        checkpoint: params.checkpoint,
        width: params.width,
        height: params.height,
        steps: params.steps,
        cfg: params.cfg,
        seed: params.seed,
        sampler: params.sampler,
        scheduler: params.scheduler,
        lora: params.lora,
        generatedAt: timestamp,
        projectId,
        tags: ['auto-generated']
      }

      // Save metadata JSON
      const metaPath = `${this.outputRoot}/prompts/${id}.json`
      await window.api.fs.writeFile(metaPath, JSON.stringify(metadata, null, 2))

      return metadata
    } catch {
      return null
    }
  }

  getOutputRoot(): string | null {
    return this.outputRoot
  }

  imageOutputPath(filename: string): string | null {
    if (!this.outputRoot) return null
    return `${this.outputRoot}/images/${filename}`
  }
}

export const outputService = new OutputService()
