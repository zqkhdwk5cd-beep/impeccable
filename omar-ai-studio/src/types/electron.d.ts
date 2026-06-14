export interface FileEntry {
  path: string
  name: string
  isDir: boolean
  size: number
  ext: string
}

export interface HardwareInfo {
  cpuBrand: string
  cpuCores: number
  totalMemBytes: number
  freeMemBytes: number
  appleSiliconModel: string | null
  platform: string
  arch: string
}

declare global {
  interface Window {
    api: {
      fs: {
        readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
        writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
        getDataDir: () => Promise<string>
        readDir: (dirPath: string, maxDepth?: number) => Promise<{ success: boolean; data?: FileEntry[]; error?: string }>
      }
      dialog: {
        showSaveDialog: (options: unknown) => Promise<{ canceled: boolean; filePath?: string }>
        showOpenDialog: (options: unknown) => Promise<{ canceled: boolean; filePaths?: string[] }>
      }
      system: {
        getHardwareInfo: () => Promise<HardwareInfo>
      }
      comfyui: {
        get: (path: string) => Promise<{ ok: boolean; data: unknown; status: number }>
        post: (path: string, body: string) => Promise<{ ok: boolean; data: unknown; status: number }>
      }
    }
  }
}
