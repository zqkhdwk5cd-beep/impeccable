import type { AgentId, AgentStatus } from '@/types/agent'
import type { TaskStatus } from '@/types/task'
import type { LogEntry, PermissionRequest } from '@/types/promptPack'

export interface EventMap {
  'agent:status': { agentId: AgentId; status: AgentStatus; task?: string; progress?: number; lastAction?: string }
  'agent:output': { agentId: AgentId; output: string }
  'task:start': { taskId: string; agentId: AgentId }
  'task:progress': { taskId: string; progress: number }
  'task:complete': { taskId: string; output: string }
  'task:fail': { taskId: string; error: string }
  'task:status': { taskId: string; status: TaskStatus }
  'workflow:start': { projectId: string; request: string }
  'workflow:complete': { projectId: string; packId: string }
  'workflow:error': { error: string }
  'workflow:paused': Record<string, never>
  'workflow:resumed': Record<string, never>
  'log': LogEntry
  'permission:request': PermissionRequest
  'permission:resolved': { id: string; granted: boolean }
}

type EventHandler<T> = (data: T) => void

class EventBus {
  private listeners: Map<string, Set<EventHandler<unknown>>> = new Map()

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>)
    return () => this.off(event, handler)
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>)
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach((handler) => handler(data))
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()
