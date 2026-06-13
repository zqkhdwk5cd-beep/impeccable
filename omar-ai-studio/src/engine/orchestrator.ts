import { v4 as uuidv4 } from 'uuid'
import { eventBus } from './eventBus'
import { taskQueue } from './taskQueue'
import { runMockTask } from './mockRunner'
import { useAppStore } from '@/store/appStore'
import type { Task } from '@/types/task'
import type { AgentId } from '@/types/agent'
import type { PromptPack } from '@/types/promptPack'

function buildTaskPlan(request: string, projectId: string): Task[] {
  const tasks: Task[] = [
    {
      id: uuidv4(),
      agentId: 'chief' as AgentId,
      title: 'Analyze & Plan',
      description: 'Parse request, identify needed agents, create task plan',
      status: 'pending',
      order: 1,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      dependencies: [],
      progress: 0
    },
    {
      id: uuidv4(),
      agentId: 'story' as AgentId,
      title: 'Write Story',
      description: 'Create cinematic story with scene structure and emotional beats',
      status: 'pending',
      order: 2,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      dependencies: [],
      progress: 0
    },
    {
      id: uuidv4(),
      agentId: 'character' as AgentId,
      title: 'Load Character Bible',
      description: 'Retrieve or create character details and visual consistency guide',
      status: 'pending',
      order: 3,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      dependencies: [],
      progress: 0
    },
    {
      id: uuidv4(),
      agentId: 'image' as AgentId,
      title: 'Create Image Prompts',
      description: 'Generate precise image prompts for each scene',
      status: 'pending',
      order: 4,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      dependencies: [],
      progress: 0
    },
    {
      id: uuidv4(),
      agentId: 'video' as AgentId,
      title: 'Create Video Prompts',
      description: 'Generate video prompts with camera movement, lighting, and motion',
      status: 'pending',
      order: 5,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      dependencies: [],
      progress: 0
    },
    {
      id: uuidv4(),
      agentId: 'memory' as AgentId,
      title: 'Save to Memory',
      description: 'Store project, character bibles, and prompt pack',
      status: 'pending',
      order: 6,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      dependencies: [],
      progress: 0
    }
  ]

  return tasks
}

export async function runWorkflow(request: string, projectId: string): Promise<void> {
  const store = useAppStore.getState()

  store.setIsRunning(true)
  store.setIsPaused(false)
  store.clearTasks()

  const tasks = buildTaskPlan(request, projectId)
  tasks.forEach((t) => store.addTask(t))

  eventBus.emit('workflow:start', { projectId, request })
  store.addLog({
    id: uuidv4(),
    timestamp: Date.now(),
    level: 'info',
    agentId: null,
    message: `Workflow started: "${request.substring(0, 60)}${request.length > 60 ? '...' : ''}"`,
    details: null
  })

  taskQueue.clear()
  taskQueue.enqueue(tasks)

  const outputs: Record<AgentId, string> = {} as Record<AgentId, string>

  while (taskQueue.size > 0) {
    if (taskQueue.isPaused) {
      await taskQueue.waitForResume()
    }

    const currentStore = useAppStore.getState()
    if (!currentStore.isRunning) break

    const task = taskQueue.dequeue()
    if (!task) break

    store.updateTask(task.id, { status: 'running', startedAt: Date.now() })
    store.updateAgentState(task.agentId, {
      status: 'thinking',
      currentTask: task.title,
      progress: 0,
      lastAction: 'Starting...'
    })

    store.addLog({
      id: uuidv4(),
      timestamp: Date.now(),
      level: 'info',
      agentId: task.agentId,
      message: `[${task.agentId.toUpperCase()}] Starting: ${task.title}`,
      details: task.description
    })

    eventBus.emit('task:start', { taskId: task.id, agentId: task.agentId })

    try {
      const output = await runMockTask(task, (progress) => {
        store.updateTask(task.id, { progress })
        store.updateAgentState(task.agentId, { progress })
        eventBus.emit('task:progress', { taskId: task.id, progress })
      })

      outputs[task.agentId] = output
      const completedAt = Date.now()

      store.updateTask(task.id, {
        status: 'completed',
        output,
        progress: 100,
        completedAt
      })

      store.updateAgentState(task.agentId, {
        status: 'done',
        currentTask: null,
        progress: 100,
        lastAction: 'Completed',
        output,
        completedAt
      })

      store.addLog({
        id: uuidv4(),
        timestamp: Date.now(),
        level: 'success',
        agentId: task.agentId,
        message: `[${task.agentId.toUpperCase()}] ✓ Completed: ${task.title}`,
        details: null
      })

      eventBus.emit('task:complete', { taskId: task.id, output })
    } catch (err) {
      const errorMessage = (err as Error).message
      store.updateTask(task.id, { status: 'failed', error: errorMessage })
      store.updateAgentState(task.agentId, {
        status: 'error',
        error: errorMessage,
        currentTask: null
      })
      store.addLog({
        id: uuidv4(),
        timestamp: Date.now(),
        level: 'error',
        agentId: task.agentId,
        message: `[${task.agentId.toUpperCase()}] ✗ Failed: ${task.title}`,
        details: errorMessage
      })
      eventBus.emit('task:fail', { taskId: task.id, error: errorMessage })
    }
  }

  // Assemble final prompt pack
  const pack: PromptPack = {
    id: uuidv4(),
    projectId,
    title: `Prompt Pack — ${new Date().toLocaleDateString('ar-EG')}`,
    request,
    createdAt: Date.now(),
    storyOutput: outputs['story'] || null,
    characterOutput: outputs['character'] || null,
    imagePrompts: [],
    videoPrompts: [],
    researchNotes: outputs['research'] || null,
    notes: outputs['chief'] || null,
    tags: ['auto-generated']
  }

  store.addPromptPack(pack)
  store.setCurrentOutput(pack)
  store.setIsRunning(false)

  // Reset agents to idle
  const finalStore = useAppStore.getState()
  finalStore.agents.forEach((agent) => {
    if (agent.enabled) {
      store.updateAgentState(agent.id, {
        status: 'idle',
        currentTask: null,
        progress: 0,
        lastAction: 'Workflow complete'
      })
    }
  })

  store.addLog({
    id: uuidv4(),
    timestamp: Date.now(),
    level: 'success',
    agentId: null,
    message: '✓ Workflow complete — Prompt pack generated',
    details: null
  })

  eventBus.emit('workflow:complete', { projectId, packId: pack.id })
}

export function pauseWorkflow(): void {
  taskQueue.pause()
  useAppStore.getState().setIsPaused(true)
  eventBus.emit('workflow:paused', {})
}

export function resumeWorkflow(): void {
  taskQueue.resume()
  useAppStore.getState().setIsPaused(false)
  eventBus.emit('workflow:resumed', {})
}

export function stopWorkflow(): void {
  taskQueue.clear()
  useAppStore.getState().setIsRunning(false)
  useAppStore.getState().setIsPaused(false)

  const store = useAppStore.getState()
  store.agents.forEach((agent) => {
    store.updateAgentState(agent.id, {
      status: 'idle',
      currentTask: null,
      progress: 0,
      lastAction: 'Stopped'
    })
  })

  store.addLog({
    id: uuidv4(),
    timestamp: Date.now(),
    level: 'warn',
    agentId: null,
    message: 'Workflow stopped by user',
    details: null
  })
}
