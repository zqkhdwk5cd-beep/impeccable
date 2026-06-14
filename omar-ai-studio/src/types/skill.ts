export interface Skill {
  id: string
  name: string
  nameAr: string
  category: 'Memory' | 'Analysis' | 'Planning' | 'Execution' | 'Coding' | 'Verification' | 'Architecture' | 'Multi-Agent'
  priority: number
  version: string
  description: string
  triggers: string[]
  rules: string[]
  outputSections: string[]
  safetyNotes: string[]
  exampleRequests: string[]
  isDefault: boolean
  enabled: boolean
  icon: string
  color: string
  packId?: string
}

export interface SkillPack {
  id: string
  name: string
  nameAr: string
  description: string
  isBuiltIn: boolean
  version: string
  author?: string
}

export const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'architecture',
    name: 'Architecture Review',
    nameAr: 'مراجعة المعمارية',
    category: 'Architecture',
    priority: 97,
    version: '1.0.0',
    description: 'Inspect and evaluate the current codebase architecture. Identify patterns, anti-patterns, and improvement opportunities without modifying code.',
    triggers: ['review architecture', 'راجع المعمارية', 'inspect project', 'افحص المشروع', 'project structure', 'how is the code organized', 'تحسين المعمارية'],
    rules: [
      'Always read-only — never modify files during architecture review',
      'Map all major modules and their relationships',
      'Identify circular dependencies',
      'Assess separation of concerns',
      'Evaluate state management approach',
      'Check for duplicated logic',
      'Assess testability of each module',
      'Rate overall maintainability on a scale of 1-10'
    ],
    outputSections: ['Project Map', 'Module Analysis', 'Strengths', 'Concerns', 'Priority Improvements', 'Estimated Refactor Cost'],
    safetyNotes: ['No file modifications', 'No installs', 'No shell commands', 'Read-only inspection only'],
    exampleRequests: ['Review the current architecture', 'راجع المعمارية', 'How is the project organized?'],
    isDefault: true,
    enabled: true,
    icon: '🏗️',
    color: '#7C6FF7',
    packId: 'default'
  },
  {
    id: 'debugging',
    name: 'Bug Detection',
    nameAr: 'اكتشاف الأخطاء',
    category: 'Coding',
    priority: 90,
    version: '1.0.0',
    description: 'Find, diagnose, and fix bugs. Always reproduce the bug first, identify root cause, then apply minimal fix.',
    triggers: ['fix bug', 'صلح بق', 'اصلح', 'debug', 'error', 'crash', 'خطأ', 'مشكلة في', 'not working', 'broken'],
    rules: [
      'Reproduce the bug before attempting a fix',
      'Identify the root cause, not just the symptom',
      'Create a backup before any file modification',
      'Make the smallest possible change to fix the issue',
      'Verify the fix does not break other functionality',
      'Add a note to memory about the bug and fix'
    ],
    outputSections: ['Bug Report', 'Root Cause Analysis', 'Fix Applied', 'Verification Steps', 'Prevention Notes'],
    safetyNotes: ['Always create backup before modifying files', 'Test after every change', 'Never modify more than 3 files at once without permission'],
    exampleRequests: ['Fix this bug', 'صلح البق', 'Debug the crash'],
    isDefault: true,
    enabled: true,
    icon: '🐛',
    color: '#FF6B6B',
    packId: 'default'
  },
  {
    id: 'refactor',
    name: 'Code Refactoring',
    nameAr: 'إعادة هيكلة الكود',
    category: 'Coding',
    priority: 88,
    version: '1.0.0',
    description: 'Improve code quality, readability, and maintainability without changing external behavior.',
    triggers: ['refactor', 'اعد هيكلة', 'clean code', 'improve code quality', 'نظّف الكود', 'reorganize', 'simplify'],
    rules: [
      'Never change external behavior — only internal structure',
      'Refactor in small steps, verify TypeScript after each step',
      'Do not introduce new dependencies',
      'Keep the same public API surface',
      'Document why the refactor was needed in memory',
      'Run type check after every file modification'
    ],
    outputSections: ['Current Issues', 'Refactoring Plan', 'Changes Made', 'Before / After Comparison', 'Verification'],
    safetyNotes: ['Create backup first', 'One file at a time', 'Do not change public interfaces without explicit approval'],
    exampleRequests: ['Refactor this file', 'اعد هيكلة الكود', 'Clean up the component'],
    isDefault: true,
    enabled: true,
    icon: '🔧',
    color: '#74B9FF',
    packId: 'default'
  },
  {
    id: 'integration',
    name: 'Integration Planning',
    nameAr: 'تخطيط التكامل',
    category: 'Execution',
    priority: 91,
    version: '1.0.0',
    description: 'Plan and implement integrations with external services, APIs, and tools.',
    triggers: ['integrate', 'connect to', 'add api', 'comfyui', 'ollama', 'openai', 'anthropic', 'kling', 'runway', 'add real ai', 'live mode', 'اعمل integration', 'وصّل'],
    rules: [
      'Document the target API before writing any code',
      'Create a typed interface for the external service',
      'Implement with a mock/fallback first, then real API',
      'Never hardcode API keys — use environment variables',
      'Add error handling for all network calls',
      'Add timeout and retry logic',
      'Test mock mode still works after adding real integration'
    ],
    outputSections: ['Integration Target', 'API Documentation Summary', 'Typed Interface Design', 'Implementation Plan', 'Environment Variables Required', 'Error Handling Strategy', 'Test Plan'],
    safetyNotes: ['Never commit API keys', 'Require explicit permission before making real API calls', 'Keep mock mode as default until user confirms live mode'],
    exampleRequests: ['Integrate with ComfyUI', 'اعمل integration مع OpenAI', 'Connect to external API'],
    isDefault: true,
    enabled: true,
    icon: '🔌',
    color: '#55EFC4',
    packId: 'default'
  }
]

export const ADVANCED_CODING_PACK: SkillPack = {
  id: 'advanced-coding-pack',
  name: 'Advanced Coding Pack',
  nameAr: 'حزمة البرمجة الوكيلية المتقدمة',
  description: 'A professional coding skill pack for Omar AI Studio\'s Coding Agent. Improves planning, repository understanding, context compression, tool orchestration, patch generation, verification, self-correction, memory, and multi-agent collaboration.',
  isBuiltIn: true,
  version: '1.0.0',
  author: 'Omar AI Studio'
}

export const ADVANCED_CODING_SKILLS: Skill[] = [
  {
    id: 'context-compression',
    name: 'Context Compression',
    nameAr: 'ضغط السياق',
    category: 'Memory',
    priority: 95,
    version: '1.0.0',
    description: 'Compresses large project context into concise, task-relevant summaries so the Coding Agent can work on large repositories without losing important information.',
    triggers: ['context', 'large project', 'long conversation', 'summarize project', 'too much code', 'memory', 'compress', 'ملخص', 'سياق', 'مشروع كبير'],
    rules: [
      'Before working on a large repository, summarize the project into a compact technical brief',
      'Preserve only task-relevant architecture, files, decisions, errors, and constraints',
      'Remove duplicated or irrelevant details',
      'Keep stable project facts in memory',
      'Refresh the summary after major code changes',
      'Never discard unresolved bugs, user requirements, or critical constraints',
      'Use compressed context before asking the model to make broad architectural decisions'
    ],
    outputSections: ['Context Summary', 'Relevant Files', 'Stable Decisions', 'Open Questions', 'Constraints', 'Next Actions'],
    safetyNotes: ['Do not remove important user requirements', 'Do not summarize code in a way that changes meaning', 'If context is uncertain, mark it as uncertain'],
    exampleRequests: ['Summarize this project before we continue', 'ضغط سياق المشروع', 'اعمل ملخص تقني للمشروع', 'The codebase is too large; compress the context first'],
    isDefault: true, enabled: true, icon: '🗜️', color: '#A29BFE', packId: 'advanced-coding-pack'
  },
  {
    id: 'repository-intelligence',
    name: 'Repository Intelligence',
    nameAr: 'فهم المستودع',
    category: 'Analysis',
    priority: 100,
    version: '1.0.0',
    description: 'Analyzes repository structure, frameworks, entry points, dependencies, and file relationships before code changes.',
    triggers: ['repo', 'repository', 'codebase', 'project structure', 'architecture', 'entry points', 'files', 'analyze project', 'هيكل المشروع', 'المستودع', 'افحص المشروع'],
    rules: [
      'Inspect project structure before modifying code',
      'Identify framework, language, build tool, package manager, and runtime',
      'Locate main entry points',
      'Locate state management, routing, storage, and service layers',
      'Identify where agents, tools, memory, and UI components live',
      'Map affected files before implementation',
      'Detect fragile or tightly coupled areas'
    ],
    outputSections: ['Project Summary', 'Frameworks', 'Entry Points', 'Important Folders', 'Dependency Map', 'Risk Areas', 'Recommended Next Step'],
    safetyNotes: ['Do not assume architecture without inspecting files', 'Do not modify files during repository analysis', 'Report uncertainty explicitly'],
    exampleRequests: ['Analyze the current app architecture', 'افحص المشروع وقولي مبني بإيه', 'Find the main files responsible for the agent workflow'],
    isDefault: true, enabled: true, icon: '🔭', color: '#00CEC9', packId: 'advanced-coding-pack'
  },
  {
    id: 'long-horizon-planning',
    name: 'Long Horizon Planning',
    nameAr: 'التخطيط طويل المدى',
    category: 'Planning',
    priority: 98,
    version: '1.0.0',
    description: 'Breaks large engineering goals into phases, milestones, risks, dependencies, and verification steps.',
    triggers: ['roadmap', 'large feature', 'big project', 'version 2', 'milestone', 'plan', 'architecture roadmap', 'خطة', 'مراحل', 'مشروع كبير'],
    rules: [
      'Break large tasks into clear phases',
      'Separate UI, engine, storage, integration, testing, and release work',
      'Identify what must be done now and what can wait',
      'Avoid rebuilding the whole app unless necessary',
      'Prefer incremental, reversible implementation',
      'Define validation criteria for each phase',
      'Create a realistic execution order'
    ],
    outputSections: ['Goal', 'Phase Plan', 'Milestones', 'Dependencies', 'Risks', 'Validation Criteria', 'Recommended First Task'],
    safetyNotes: ['Do not over-scope the first implementation', 'Do not mix unrelated features in one phase', 'Avoid destructive rewrites'],
    exampleRequests: ['Plan v2 of Omar AI Studio', 'حط خطة تطوير للتطبيق', 'Break this into stages before coding'],
    isDefault: true, enabled: true, icon: '🗺️', color: '#6C5CE7', packId: 'advanced-coding-pack'
  },
  {
    id: 'self-correction',
    name: 'Self Correction',
    nameAr: 'التصحيح الذاتي',
    category: 'Verification',
    priority: 90,
    version: '1.0.0',
    description: 'Reviews the agent\'s own plan, code changes, and final result to find mistakes before handing off to the user.',
    triggers: ['review your work', 'double check', 'verify', 'self review', 'check mistakes', 'راجع نفسك', 'اتأكد', 'اختبر'],
    rules: [
      'After creating a plan, review it for missing steps',
      'After editing code, review the diff',
      'After generating output, check if it satisfies the original request',
      'If a mistake is found, explain it and fix it if safe',
      'Compare final result against acceptance criteria',
      'Prefer evidence from build logs, tests, and type checks'
    ],
    outputSections: ['Self Review', 'Issues Found', 'Fixes Applied', 'Remaining Risks', 'Confidence Level'],
    safetyNotes: ['Do not claim verification without actually running available checks', 'Do not hide mistakes', 'If verification is incomplete, say exactly what was not verified'],
    exampleRequests: ['Review your last changes', 'اتأكد إن كل حاجة صح', 'Double check the implementation'],
    isDefault: true, enabled: true, icon: '🔄', color: '#FDCB6E', packId: 'advanced-coding-pack'
  },
  {
    id: 'tool-orchestration',
    name: 'Tool Orchestration',
    nameAr: 'تنسيق الأدوات',
    category: 'Execution',
    priority: 93,
    version: '1.0.0',
    description: 'Chooses and sequences the right tools for reading files, searching code, editing files, running commands, testing, and saving memory.',
    triggers: ['tools', 'workflow', 'execute', 'run command', 'edit files', 'search code', 'tool use', 'شغل', 'نفذ', 'أدوات'],
    rules: [
      'Select the least risky tool for each step',
      'Read before editing',
      'Search before assuming',
      'Backup before risky edits',
      'Run verification after changes',
      'Log every tool action',
      'Use tool results as evidence',
      'Do not call external APIs unless explicitly approved'
    ],
    outputSections: ['Selected Tools', 'Execution Order', 'Tool Results', 'Errors', 'Next Tool Action'],
    safetyNotes: ['Require confirmation before destructive commands', 'Do not run install commands without approval', 'Do not expose API keys in logs'],
    exampleRequests: ['Run checks after changes', 'استخدم الأدوات المناسبة وعدل المشروع', 'Search the project then fix the bug'],
    isDefault: true, enabled: true, icon: '🔧', color: '#00B894', packId: 'advanced-coding-pack'
  },
  {
    id: 'memory-system',
    name: 'Memory System',
    nameAr: 'نظام الذاكرة',
    category: 'Memory',
    priority: 88,
    version: '1.0.0',
    description: 'Stores project decisions, architecture notes, successful fixes, recurring bugs, style preferences, and integration plans.',
    triggers: ['remember', 'memory', 'store decision', 'project notes', 'save context', 'افتكر', 'احفظ', 'ذاكرة'],
    rules: [
      'Save durable project facts',
      'Save architecture decisions',
      'Save recurring bugs and known fixes',
      'Save user preferences',
      'Save integration settings without secrets',
      'Retrieve relevant memories before planning',
      'Update memory after successful implementation'
    ],
    outputSections: ['Retrieved Memories', 'New Memory', 'Updated Decisions', 'Reuse Suggestions'],
    safetyNotes: ['Never store API keys or secrets', 'Do not store temporary noise', 'Ask before overwriting important memory'],
    exampleRequests: ['Remember this architecture decision', 'احفظ إننا هنستخدم ComfyUI للصور', 'What do we know about Hopper?'],
    isDefault: true, enabled: true, icon: '💾', color: '#74B9FF', packId: 'advanced-coding-pack'
  },
  {
    id: 'codebase-navigation',
    name: 'Codebase Navigation',
    nameAr: 'التنقل داخل الكود',
    category: 'Analysis',
    priority: 92,
    version: '1.0.0',
    description: 'Finds relevant files, functions, components, imports, references, and call paths inside the project.',
    triggers: ['where', 'find', 'locate', 'reference', 'usage', 'function', 'component', 'فين', 'دور', 'مكان', 'استخدم'],
    rules: [
      'Search for exact names first',
      'Search for related concepts if exact names fail',
      'Follow imports and exports',
      'Identify call chains',
      'Identify UI component ownership',
      'Identify engine and storage connections',
      'Report file paths clearly'
    ],
    outputSections: ['Matches', 'Related Files', 'Call Path', 'Components', 'Suggested File to Edit'],
    safetyNotes: ['Do not edit files during navigation', 'Avoid guessing file paths', 'If multiple candidates exist, list them'],
    exampleRequests: ['Where is mockRunner used?', 'فين ملف Image Agent؟', 'Find all files related to memory'],
    isDefault: true, enabled: true, icon: '🧭', color: '#55EFC4', packId: 'advanced-coding-pack'
  },
  {
    id: 'autonomous-execution',
    name: 'Autonomous Execution',
    nameAr: 'التنفيذ الذاتي المنظم',
    category: 'Execution',
    priority: 85,
    version: '1.0.0',
    description: 'Executes approved multi-step tasks without stopping after every tiny step, while still respecting permissions for risky actions.',
    triggers: ['continue', 'complete task', 'do it', 'implement fully', 'finish', 'كمل', 'نفذ', 'خلص'],
    rules: [
      'Continue through safe steps without unnecessary interruptions',
      'Stop only for destructive, paid, external, or high-risk actions',
      'Keep progress visible',
      'Update task status after every step',
      'Recover from minor errors when possible',
      'Escalate only when user decision is required'
    ],
    outputSections: ['Current Step', 'Progress', 'Completed Work', 'Blockers', 'Next Action'],
    safetyNotes: ['Do not bypass permission rules', 'Do not delete or overwrite without confirmation', 'Do not make paid API calls without approval'],
    exampleRequests: ['Complete the implementation', 'كمل من غير ما تسألني في كل خطوة', 'Finish the feature safely'],
    isDefault: true, enabled: true, icon: '⚡', color: '#FFEAA7', packId: 'advanced-coding-pack'
  },
  {
    id: 'patch-generation',
    name: 'Patch Generation',
    nameAr: 'إنشاء تعديلات دقيقة',
    category: 'Coding',
    priority: 91,
    version: '1.0.0',
    description: 'Creates minimal, targeted code changes instead of rewriting entire files unnecessarily.',
    triggers: ['patch', 'edit', 'modify', 'change', 'fix file', 'small change', 'عدل', 'صلح', 'تعديل'],
    rules: [
      'Prefer small patches',
      'Read file before editing',
      'Preserve existing style',
      'Preserve unrelated code',
      'Avoid large rewrites unless justified',
      'Explain exactly what changed',
      'Keep changes reversible'
    ],
    outputSections: ['Files Changed', 'Patch Summary', 'Reason', 'Before/After Notes', 'Risk Level'],
    safetyNotes: ['Backup before risky edits', 'Do not modify unrelated sections', 'Do not silently overwrite user work'],
    exampleRequests: ['Fix this function only', 'عدل الجزء ده بس', 'Create a small patch for this bug'],
    isDefault: true, enabled: true, icon: '🩹', color: '#FF7675', packId: 'advanced-coding-pack'
  },
  {
    id: 'verification-engine',
    name: 'Verification Engine',
    nameAr: 'محرك التحقق',
    category: 'Verification',
    priority: 96,
    version: '1.0.0',
    description: 'Runs or recommends builds, type checks, linting, tests, and manual verification after code changes.',
    triggers: ['test', 'verify', 'build', 'typecheck', 'lint', 'run', 'check', 'اختبر', 'تحقق', 'شغل'],
    rules: [
      'Identify available verification commands',
      'Prefer existing package scripts',
      'Run type checks if available',
      'Run tests if available',
      'Run build if changes affect production',
      'Report exact command results',
      'If checks fail, route to Debugger'
    ],
    outputSections: ['Available Checks', 'Commands Run', 'Results', 'Failures', 'Next Fix'],
    safetyNotes: ['Ask before install commands', 'Do not claim success if checks were skipped', 'Report environment limitations'],
    exampleRequests: ['Run tests', 'اختبر المشروع', 'Build the app and fix errors'],
    isDefault: true, enabled: true, icon: '✅', color: '#00B894', packId: 'advanced-coding-pack'
  },
  {
    id: 'multi-step-reasoning',
    name: 'Multi-Step Reasoning',
    nameAr: 'الاستدلال متعدد الخطوات',
    category: 'Planning',
    priority: 87,
    version: '1.0.0',
    description: 'Solves complex requests through explicit staged reasoning: analyze, plan, execute, verify, report.',
    triggers: ['complex', 'hard', 'multi step', 'think through', 'analyze', 'مهمة معقدة', 'حلل', 'خطوات'],
    rules: [
      'Convert vague requests into structured steps',
      'Identify missing information',
      'Make reasonable assumptions only when safe',
      'Keep reasoning operational and concise',
      'Move from analysis to action only after plan',
      'Produce a final structured report'
    ],
    outputSections: ['Understanding', 'Assumptions', 'Steps', 'Decision Points', 'Result'],
    safetyNotes: ['Do not expose hidden chain-of-thought', 'Provide concise reasoning summaries instead', 'Ask only when a missing detail blocks execution'],
    exampleRequests: ['Think through this feature', 'حلل المهمة دي خطوة خطوة', 'This is complex; plan it first'],
    isDefault: true, enabled: true, icon: '🧠', color: '#B2BEC3', packId: 'advanced-coding-pack'
  },
  {
    id: 'knowledge-extraction',
    name: 'Knowledge Extraction',
    nameAr: 'استخراج المعرفة',
    category: 'Memory',
    priority: 82,
    version: '1.0.0',
    description: 'Extracts reusable knowledge from repositories, logs, project outcomes, user feedback, and generated outputs.',
    triggers: ['extract', 'learn from', 'document', 'knowledge', 'notes', 'استخرج', 'تعلم', 'وثق'],
    rules: [
      'Extract reusable patterns',
      'Extract project conventions',
      'Extract common mistakes',
      'Extract integration notes',
      'Convert repeated lessons into skills or memory',
      'Store knowledge only when durable'
    ],
    outputSections: ['Extracted Knowledge', 'Patterns', 'Conventions', 'Reusable Rules', 'Suggested Memory Entries'],
    safetyNotes: ['Do not store private secrets', 'Do not overfit from one failed attempt', 'Mark uncertain knowledge as tentative'],
    exampleRequests: ['Extract lessons from this bug', 'استخرج قواعد من المشروع', 'Document what we learned'],
    isDefault: true, enabled: true, icon: '📚', color: '#E17055', packId: 'advanced-coding-pack'
  },
  {
    id: 'coding-memory',
    name: 'Coding Memory',
    nameAr: 'ذاكرة البرمجة',
    category: 'Memory',
    priority: 89,
    version: '1.0.0',
    description: 'Keeps a coding-specific memory of patterns, decisions, known bugs, successful fixes, project conventions, and preferred architecture.',
    triggers: ['coding memory', 'known bug', 'previous fix', 'decision', 'pattern', 'ذاكرة البرمجة', 'حل سابق', 'قرار'],
    rules: [
      'Retrieve relevant coding memory before planning',
      'Save successful fixes',
      'Save project conventions',
      'Save known fragile files',
      'Save preferred libraries and design choices',
      'Suggest reuse of proven patterns',
      'Keep coding memory separate from creative memory'
    ],
    outputSections: ['Relevant Coding Memory', 'Known Bugs', 'Previous Fixes', 'Project Conventions', 'Memory Updates'],
    safetyNotes: ['Do not store credentials', 'Do not store temporary debug noise', 'Ask before deleting coding memory'],
    exampleRequests: ['Remember this fix', 'افتكر إن المشكلة دي اتحلت بالطريقة دي', 'What coding decisions did we make?'],
    isDefault: true, enabled: true, icon: '🗂️', color: '#0984E3', packId: 'advanced-coding-pack'
  },
  {
    id: 'project-architect',
    name: 'Project Architect',
    nameAr: 'معماري المشروع',
    category: 'Architecture',
    priority: 97,
    version: '1.0.0',
    description: 'Designs scalable project architecture, modular systems, plugin systems, provider adapters, and maintainable file structures.',
    triggers: ['architect', 'architecture', 'design system', 'scalable', 'plugin', 'adapter', 'structure', 'معمارية', 'تصميم', 'هيكل'],
    rules: [
      'Design modular architecture',
      'Separate UI, engine, storage, tools, and providers',
      'Prefer provider adapters for external AI services',
      'Keep agents independent but coordinated',
      'Avoid monolithic files',
      'Design for future expansion',
      'Document architecture decisions'
    ],
    outputSections: ['Proposed Architecture', 'Modules', 'Data Flow', 'Extension Points', 'Migration Plan', 'Risks'],
    safetyNotes: ['Do not rewrite architecture without approval', 'Prefer incremental migration', 'Preserve existing working features'],
    exampleRequests: ['Design the ComfyUI integration architecture', 'صمم معمارية التطبيق', 'Make the app scalable for 20 agents'],
    isDefault: true, enabled: true, icon: '🏛️', color: '#A29BFE', packId: 'advanced-coding-pack'
  },
  {
    id: 'agent-supervisor',
    name: 'Agent Supervisor',
    nameAr: 'مشرف الوكلاء',
    category: 'Multi-Agent',
    priority: 94,
    version: '1.0.0',
    description: 'Supervises multiple agents, assigns work, tracks agent status, merges outputs, resolves conflicts, and produces final results.',
    triggers: ['multi agent', 'agents', 'workflow', 'delegate', 'orchestrate', 'supervise', 'وكلاء', 'ايجنت', 'وزع', 'نسق'],
    rules: [
      'Identify which agents are needed',
      'Assign each task to the correct agent',
      'Track status, blockers, and outputs',
      'Merge agent outputs into one final result',
      'Resolve conflicts between agents',
      'Ask Memory Agent for relevant context',
      'Ask Research Agent only when current information is needed',
      'Ask Coding Agent for implementation tasks',
      'Ask Image/Video Agents only for media-generation tasks'
    ],
    outputSections: ['Selected Agents', 'Task Assignments', 'Workflow Status', 'Agent Outputs', 'Final Combined Result'],
    safetyNotes: ['Do not send tasks to external services without approval', 'Do not allow one agent to overwrite another agent\'s output silently', 'Log all handoffs'],
    exampleRequests: ['Make the agents work together', 'خلي كل ايجنت يعمل الجزء بتاعه', 'Coordinate the workflow for this project'],
    isDefault: true, enabled: true, icon: '👥', color: '#FD79A8', packId: 'advanced-coding-pack'
  }
]
