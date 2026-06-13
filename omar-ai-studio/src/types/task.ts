import type { AgentId } from './agent'

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface Task {
  id: string
  agentId: AgentId
  title: string
  description: string
  status: TaskStatus
  order: number
  output: string | null
  error: string | null
  startedAt: number | null
  completedAt: number | null
  dependencies: string[]
  progress: number
}

export interface TaskPlan {
  tasks: Task[]
  projectContext: string
  estimatedDuration: number
}
