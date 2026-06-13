export type AgentId =
  | 'chief'
  | 'story'
  | 'character'
  | 'image'
  | 'video'
  | 'research'
  | 'memory'

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'waiting'
  | 'done'
  | 'error'
  | 'disabled'

export interface AgentConfig {
  id: AgentId
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  color: string
  icon: string
  enabled: boolean
  instructions: string
  capabilities: string[]
  order: number
}

export interface AgentRuntimeState {
  agentId: AgentId
  status: AgentStatus
  currentTask: string | null
  progress: number
  lastAction: string | null
  output: string | null
  error: string | null
  startedAt: number | null
  completedAt: number | null
}

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'chief',
    name: 'Chief Agent',
    nameAr: 'العميل الرئيسي',
    description: 'Orchestrates all agents. Breaks requests into tasks and assembles final output.',
    descriptionAr: 'ينسق جميع العملاء ويقسم الطلبات إلى مهام.',
    color: '#7C6FF7',
    icon: '⚡',
    enabled: true,
    order: 1,
    capabilities: ['orchestration', 'task-planning', 'output-assembly'],
    instructions: 'You are the Chief Agent. Analyze the user request, break it into specific tasks for each specialized agent, assign tasks in order, track progress, and assemble the final output.'
  },
  {
    id: 'story',
    name: 'Story Agent',
    nameAr: 'عميل القصص',
    description: 'Creates cinematic stories, hooks, emotional beats, and scene structure.',
    descriptionAr: 'يكتب قصصاً سينمائية وهياكل مشاهد.',
    color: '#00D2C8',
    icon: '📖',
    enabled: true,
    order: 2,
    capabilities: ['story-writing', 'scene-structure', 'hooks', 'emotional-beats'],
    instructions: 'You are the Story Agent. Create compelling cinematic narratives with clear scene structure, emotional arcs, hooks, and character moments. Output structured story treatments with act breakdowns.'
  },
  {
    id: 'character',
    name: 'Character Agent',
    nameAr: 'عميل الشخصيات',
    description: 'Creates and maintains character bibles. Ensures visual and personality consistency.',
    descriptionAr: 'ينشئ ويحافظ على ملفات الشخصيات.',
    color: '#FFB347',
    icon: '🎭',
    enabled: true,
    order: 3,
    capabilities: ['character-sheets', 'character-bible', 'consistency', 'personality'],
    instructions: 'You are the Character Agent. Create detailed character bibles including appearance, personality, backstory, speech patterns, and visual consistency guides. Store character data for repeated use.'
  },
  {
    id: 'image',
    name: 'Image Agent',
    nameAr: 'عميل الصور',
    description: 'Crafts precise image generation prompts for each scene and asset.',
    descriptionAr: 'يصنع بروميبتات دقيقة لتوليد الصور.',
    color: '#FF6B6B',
    icon: '🎨',
    enabled: true,
    order: 4,
    capabilities: ['image-prompts', 'style-guides', 'comfyui', 'flux', 'midjourney'],
    instructions: 'You are the Image Agent. Create detailed, precise image generation prompts for each scene. Specify style, lighting, composition, camera angle, mood, color palette, and technical parameters compatible with Flux/ComfyUI/Midjourney.'
  },
  {
    id: 'video',
    name: 'Video Agent',
    nameAr: 'عميل الفيديو',
    description: 'Creates video prompts with camera movement, timing, lighting, and motion.',
    descriptionAr: 'يصنع بروميبتات الفيديو مع حركة الكاميرا.',
    color: '#74B9FF',
    icon: '🎬',
    enabled: true,
    order: 5,
    capabilities: ['video-prompts', 'camera-movement', 'kling', 'runway', 'veo'],
    instructions: 'You are the Video Agent. Create detailed video generation prompts including camera movement (pan, tilt, zoom, dolly), duration, lens specification, lighting setup, scene motion, and timing. Compatible with Kling, Runway, Veo, and SuperGrok.'
  },
  {
    id: 'research',
    name: 'Research Agent',
    nameAr: 'عميل البحث',
    description: 'Researches tools, techniques, and current best practices on demand.',
    descriptionAr: 'يبحث عن الأدوات والتقنيات وأفضل الممارسات.',
    color: '#55EFC4',
    icon: '🔍',
    enabled: true,
    order: 6,
    capabilities: ['web-research', 'tool-comparison', 'recommendations', 'summarization'],
    instructions: 'You are the Research Agent. Search and summarize information, compare tools, and provide current recommendations. Only activate when the Chief Agent assigns research tasks.'
  },
  {
    id: 'memory',
    name: 'Memory Agent',
    nameAr: 'عميل الذاكرة',
    description: 'Stores and retrieves project memory, character bibles, and style guides.',
    descriptionAr: 'يخزن ويسترجع ذاكرة المشاريع وملفات الشخصيات.',
    color: '#BD93F9',
    icon: '🧠',
    enabled: true,
    order: 7,
    capabilities: ['memory-storage', 'memory-retrieval', 'character-bibles', 'style-guides'],
    instructions: 'You are the Memory Agent. Store and retrieve project memory including character bibles, style guides, previous prompt packs, and project context. Ensure consistency across sessions.'
  }
]
