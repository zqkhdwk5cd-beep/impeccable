import { v4 as uuidv4 } from 'uuid'
import { eventBus } from './eventBus'
import { taskQueue } from './taskQueue'
import { runMockTask } from './mockRunner'
import { matchSkills } from './skillMatcher'
import { useAppStore } from '@/store/appStore'
import type { Task } from '@/types/task'
import type { AgentId } from '@/types/agent'
import type { PromptPack } from '@/types/promptPack'

// Keywords that route to Coding Agent
const CODING_KEYWORDS = [
  // Arabic
  'راجع', 'صلح', 'اصلح', 'ضيف agent', 'اعمل integration', 'اعمل سكربت',
  'ابني صفحة', 'حسن المعمارية', 'اعمل test', 'افحص المشروع', 'كود',
  'برمجة', 'باق', 'مشكلة في', 'integration', 'سكربت', 'معمارية',
  // English
  'review code', 'fix bug', 'add agent', 'integrate', 'create script',
  'build page', 'improve architecture', 'run test', 'inspect project',
  'refactor', 'debug', 'typescript', 'component', 'implement', 'coding'
]

function isCodingRequest(request: string): boolean {
  const lower = request.toLowerCase()
  return CODING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

function buildCodingTaskPlan(request: string): Task[] {
  return [
    {
      id: uuidv4(),
      agentId: 'chief' as AgentId,
      title: 'Route to Coding Agent',
      description: 'Detect coding request, route to Coding Agent',
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
      agentId: 'coding' as AgentId,
      title: 'Analyze & Plan',
      description: 'Inspect project, create implementation plan',
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
      agentId: 'memory' as AgentId,
      title: 'Save Coding Notes',
      description: 'Store architecture notes and coding decisions',
      status: 'pending',
      order: 3,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      dependencies: [],
      progress: 0
    }
  ]
}

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

  // Run skill matching for coding requests
  if (isCodingRequest(request)) {
    const allSkills = useAppStore.getState().skills
    const matchResult = matchSkills(request, allSkills)
    useAppStore.getState().setLastSkillMatch(matchResult)

    if (matchResult.matchedSkills.length > 0) {
      store.addLog({
        id: uuidv4(),
        timestamp: Date.now(),
        level: 'info',
        agentId: 'coding',
        message: `[SKILLS] ${matchResult.matchedSkills.length} skills activated: ${matchResult.matchedSkills.map(s => s.name).join(', ')}`,
        details: matchResult.composedPrompt
      })
    }
  }

  const tasks = isCodingRequest(request)
    ? buildCodingTaskPlan(request)
    : buildTaskPlan(request, projectId)
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
    codingOutput: outputs['coding'] || null,
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

export async function runSingleAgent(agentId: AgentId, request: string, projectId: string): Promise<void> {
  const store = useAppStore.getState()

  store.setIsRunning(true)
  store.setIsPaused(false)
  store.clearTasks()

  // Run skill matching for coding agent
  if (agentId === 'coding') {
    const allSkills = useAppStore.getState().skills
    const matchResult = matchSkills(request, allSkills)
    useAppStore.getState().setLastSkillMatch(matchResult)

    if (matchResult.matchedSkills.length > 0) {
      store.addLog({
        id: uuidv4(),
        timestamp: Date.now(),
        level: 'info',
        agentId: 'coding',
        message: `[SKILLS] ${matchResult.matchedSkills.length} skills activated: ${matchResult.matchedSkills.map(s => s.name).join(', ')}`,
        details: matchResult.composedPrompt
      })
    }
  }

  const task: Task = {
    id: uuidv4(),
    agentId,
    title: `${agentId.charAt(0).toUpperCase() + agentId.slice(1)} — Processing Request`,
    description: request.substring(0, 80),
    status: 'pending',
    order: 1,
    output: null,
    error: null,
    startedAt: null,
    completedAt: null,
    dependencies: [],
    progress: 0
  }

  store.addTask(task)
  store.updateTask(task.id, { status: 'running', startedAt: Date.now() })
  store.updateAgentState(agentId, { status: 'thinking', currentTask: task.title, progress: 0, lastAction: 'Starting...' })
  store.addLog({
    id: uuidv4(),
    timestamp: Date.now(),
    level: 'info',
    agentId,
    message: `[${agentId.toUpperCase()}] Single agent run: ${request.substring(0, 50)}`,
    details: null
  })

  try {
    const output = await runMockTask(task, (progress) => {
      store.updateTask(task.id, { progress })
      store.updateAgentState(agentId, { progress })
    })

    const completedAt = Date.now()
    store.updateTask(task.id, { status: 'completed', output, progress: 100, completedAt })
    store.updateAgentState(agentId, {
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
      agentId,
      message: `[${agentId.toUpperCase()}] ✓ Completed`,
      details: null
    })
  } catch (err) {
    const errorMessage = (err as Error).message
    store.updateTask(task.id, { status: 'failed', error: errorMessage })
    store.updateAgentState(agentId, { status: 'error', error: errorMessage, currentTask: null })
    store.addLog({
      id: uuidv4(),
      timestamp: Date.now(),
      level: 'error',
      agentId,
      message: `[${agentId.toUpperCase()}] ✗ Failed`,
      details: errorMessage
    })
  }

  store.setIsRunning(false)
  store.updateAgentState(agentId, { status: 'idle', currentTask: null, progress: 0, lastAction: 'Ready' })
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
