// ComfyUI HTTP + WebSocket client for local image generation
// Connects to http://127.0.0.1:8188 by default

export interface ComfyUIConfig {
  host: string
  port: number
}

export interface ModelList {
  checkpoints: string[]
  loras: string[]
  vaes: string[]
  embeddings: string[]
  upscaleModels: string[]
  controlnet: string[]
}

export interface QueueItem {
  prompt_id: string
  number: number
}

export interface HistoryItem {
  prompt: unknown
  outputs: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }>
  status: { completed: boolean; status_str: string; messages: unknown[] }
}

export type GenerationStatus =
  | { type: 'queued'; position: number; promptId: string }
  | { type: 'progress'; value: number; max: number; promptId: string }
  | { type: 'completed'; promptId: string; images: GeneratedImage[] }
  | { type: 'error'; message: string; promptId: string }

export interface GeneratedImage {
  filename: string
  subfolder: string
  type: string
  url: string
}

export type StatusCallback = (status: GenerationStatus) => void

const DEFAULT_CONFIG: ComfyUIConfig = { host: '127.0.0.1', port: 8188 }

class ComfyUIService {
  private config: ComfyUIConfig = DEFAULT_CONFIG
  private ws: WebSocket | null = null
  private clientId: string = crypto.randomUUID()
  private statusCallbacks = new Map<string, StatusCallback>()
  private connected = false

  get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`
  }

  get wsUrl(): string {
    return `ws://${this.config.host}:${this.config.port}/ws?clientId=${this.clientId}`
  }

  configure(config: Partial<ComfyUIConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/system_stats`, { signal: AbortSignal.timeout(3000) })
      this.connected = res.ok
      return res.ok
    } catch {
      this.connected = false
      return false
    }
  }

  async getSystemStats(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/system_stats`)
    if (!res.ok) throw new Error(`ComfyUI unreachable: ${res.status}`)
    return res.json()
  }

  async getModels(): Promise<ModelList> {
    const fetchList = async (type: string): Promise<string[]> => {
      try {
        const res = await fetch(`${this.baseUrl}/object_info/${type}`)
        if (!res.ok) return []
        const data = await res.json()
        // ComfyUI returns object_info for a node; extract input options
        const nodeData = data[type]
        if (!nodeData) return []
        const inputs = nodeData.input?.required || nodeData.input?.optional || {}
        for (const [, value] of Object.entries(inputs)) {
          if (Array.isArray(value) && Array.isArray(value[0])) {
            return value[0] as string[]
          }
        }
        return []
      } catch {
        return []
      }
    }

    const [checkpoints, loras, vaes, embeddings, upscaleModels, controlnet] = await Promise.all([
      this.getCheckpointList(),
      this.getLoraList(),
      fetchList('VAELoader'),
      fetchList('EmbeddingLoader'),
      fetchList('UpscaleModelLoader'),
      fetchList('ControlNetLoader')
    ])

    return { checkpoints, loras, vaes, embeddings, upscaleModels, controlnet }
  }

  async getCheckpointList(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/object_info/CheckpointLoaderSimple`)
      if (!res.ok) return []
      const data = await res.json()
      const node = data['CheckpointLoaderSimple']
      if (!node) return []
      return node.input?.required?.ckpt_name?.[0] || []
    } catch {
      return []
    }
  }

  async getLoraList(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/object_info/LoraLoader`)
      if (!res.ok) return []
      const data = await res.json()
      const node = data['LoraLoader']
      if (!node) return []
      return node.input?.required?.lora_name?.[0] || []
    } catch {
      return []
    }
  }

  async queuePrompt(workflow: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: this.clientId })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to queue prompt: ${text}`)
    }
    const data = await res.json()
    return data.prompt_id
  }

  async getHistory(promptId?: string): Promise<Record<string, HistoryItem>> {
    const url = promptId
      ? `${this.baseUrl}/history/${promptId}`
      : `${this.baseUrl}/history`
    const res = await fetch(url)
    if (!res.ok) return {}
    return res.json()
  }

  async getQueue(): Promise<{ running: QueueItem[]; pending: QueueItem[] }> {
    const res = await fetch(`${this.baseUrl}/queue`)
    if (!res.ok) return { running: [], pending: [] }
    const data = await res.json()
    return {
      running: data.queue_running || [],
      pending: data.queue_pending || []
    }
  }

  async interruptGeneration(): Promise<void> {
    await fetch(`${this.baseUrl}/interrupt`, { method: 'POST' })
  }

  imageUrl(image: { filename: string; subfolder: string; type: string }): string {
    const params = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder,
      type: image.type
    })
    return `${this.baseUrl}/view?${params}`
  }

  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        this.connected = true
        resolve()
      }

      this.ws.onerror = () => {
        reject(new Error('WebSocket connection failed'))
      }

      this.ws.onclose = () => {
        this.connected = false
        this.ws = null
      }

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event)
      }
    })
  }

  disconnectWebSocket(): void {
    this.ws?.close()
    this.ws = null
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const msg = JSON.parse(event.data as string)
      const { type, data } = msg

      if (type === 'progress') {
        const cb = this.statusCallbacks.get(data.prompt_id)
        cb?.({ type: 'progress', value: data.value, max: data.max, promptId: data.prompt_id })
      }

      if (type === 'executed') {
        const promptId: string = data.prompt_id
        const images: GeneratedImage[] = []

        if (data.output?.images) {
          for (const img of data.output.images) {
            images.push({
              ...img,
              url: this.imageUrl(img)
            })
          }
        }

        const cb = this.statusCallbacks.get(promptId)
        cb?.({ type: 'completed', promptId, images })
        this.statusCallbacks.delete(promptId)
      }

      if (type === 'execution_error') {
        const cb = this.statusCallbacks.get(data.prompt_id)
        cb?.({ type: 'error', message: data.exception_message || 'Unknown error', promptId: data.prompt_id })
        this.statusCallbacks.delete(data.prompt_id)
      }

      if (type === 'execution_cached') {
        // cached result — treat as completed
        const promptId: string = data.prompt_id
        const cb = this.statusCallbacks.get(promptId)
        if (cb) {
          this.getHistory(promptId).then(history => {
            const item = history[promptId]
            if (item?.outputs) {
              const images: GeneratedImage[] = []
              for (const output of Object.values(item.outputs)) {
                if (output.images) {
                  for (const img of output.images) {
                    images.push({ ...img, url: this.imageUrl(img) })
                  }
                }
              }
              cb({ type: 'completed', promptId, images })
            }
          })
          this.statusCallbacks.delete(promptId)
        }
      }
    } catch {
      // non-JSON message (binary preview frames, etc.) — ignore
    }
  }

  registerCallback(promptId: string, cb: StatusCallback): void {
    this.statusCallbacks.set(promptId, cb)
  }

  async generateWithProgress(
    workflow: Record<string, unknown>,
    onStatus: StatusCallback
  ): Promise<GeneratedImage[]> {
    // Ensure WS is connected for real-time progress
    await this.connectWebSocket()

    const promptId = await this.queuePrompt(workflow)
    onStatus({ type: 'queued', position: 0, promptId })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.statusCallbacks.delete(promptId)
        reject(new Error('Generation timed out after 5 minutes'))
      }, 5 * 60 * 1000)

      this.registerCallback(promptId, (status) => {
        onStatus(status)
        if (status.type === 'completed') {
          clearTimeout(timeout)
          resolve(status.images)
        } else if (status.type === 'error') {
          clearTimeout(timeout)
          reject(new Error(status.message))
        }
      })
    })
  }
}

export const comfyUIService = new ComfyUIService()
