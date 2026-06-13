export interface Project {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
  status: 'active' | 'archived'
  tags: string[]
  promptPackIds: string[]
}

export interface MemoryItem {
  id: string
  projectId: string | null
  type: 'character-bible' | 'style-guide' | 'prompt-pack' | 'note' | 'reference'
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}
