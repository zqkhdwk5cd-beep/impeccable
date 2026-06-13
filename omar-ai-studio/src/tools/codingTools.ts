// Coding Agent tool interfaces
// Mock implementations for v1 — replace with real filesystem access in v2

export interface FileInfo {
  path: string
  size: number
  type: 'file' | 'directory'
  extension: string
}

export interface CodeReviewIssue {
  severity: 'error' | 'warning' | 'suggestion'
  file: string
  line?: number
  message: string
  category: 'bug' | 'style' | 'performance' | 'architecture' | 'security'
}

export interface ImplementationPlan {
  title: string
  summary: string
  riskLevel: 'low' | 'medium' | 'high'
  requiresPermission: boolean
  steps: PlanStep[]
  filesToModify: string[]
  filesToCreate: string[]
  estimatedTime: string
}

export interface PlanStep {
  order: number
  action: string
  description: string
  reversible: boolean
}

export interface CodingReport {
  requestSummary: string
  analysis: string
  plan: ImplementationPlan | null
  executionLog: string[]
  filesChanged: string[]
  verificationResult: string
  finalReport: string
  status: 'completed' | 'planned' | 'failed' | 'awaiting-permission'
}

// Tool implementations (mock for v1)
export const codingTools = {
  // TODO(v2): Replace with real Electron IPC calls to main process filesystem
  listProjectFiles(): FileInfo[] {
    return [
      { path: 'electron/main.ts',                   size: 2100, type: 'file', extension: 'ts' },
      { path: 'electron/preload.ts',                size: 890,  type: 'file', extension: 'ts' },
      { path: 'src/App.tsx',                        size: 6200, type: 'file', extension: 'tsx' },
      { path: 'src/main.tsx',                       size: 180,  type: 'file', extension: 'tsx' },
      { path: 'src/types/agent.ts',                 size: 4100, type: 'file', extension: 'ts' },
      { path: 'src/types/task.ts',                  size: 420,  type: 'file', extension: 'ts' },
      { path: 'src/types/project.ts',               size: 380,  type: 'file', extension: 'ts' },
      { path: 'src/types/promptPack.ts',            size: 740,  type: 'file', extension: 'ts' },
      { path: 'src/engine/eventBus.ts',             size: 1100, type: 'file', extension: 'ts' },
      { path: 'src/engine/taskQueue.ts',            size: 780,  type: 'file', extension: 'ts' },
      { path: 'src/engine/permissionManager.ts',    size: 560,  type: 'file', extension: 'ts' },
      { path: 'src/engine/mockRunner.ts',           size: 5800, type: 'file', extension: 'ts' },
      { path: 'src/engine/orchestrator.ts',         size: 3900, type: 'file', extension: 'ts' },
      { path: 'src/store/appStore.ts',              size: 5200, type: 'file', extension: 'ts' },
      { path: 'src/tools/codingTools.ts',           size: 1800, type: 'file', extension: 'ts' },
      { path: 'src/i18n/translations.ts',           size: 7100, type: 'file', extension: 'ts' },
      { path: 'src/i18n/useTranslation.ts',         size: 200,  type: 'file', extension: 'ts' },
      { path: 'src/components/AgentCard.tsx',       size: 3200, type: 'file', extension: 'tsx' },
      { path: 'src/components/AgentSettings.tsx',   size: 2600, type: 'file', extension: 'tsx' },
      { path: 'src/components/ConsoleLog.tsx',      size: 1800, type: 'file', extension: 'tsx' },
      { path: 'src/components/OutputPreview.tsx',   size: 5400, type: 'file', extension: 'tsx' },
      { path: 'src/components/Sidebar.tsx',         size: 2200, type: 'file', extension: 'tsx' },
      { path: 'src/components/TaskCard.tsx',        size: 1900, type: 'file', extension: 'tsx' },
      { path: 'src/components/TopBar.tsx',          size: 2100, type: 'file', extension: 'tsx' },
      { path: 'src/components/WorkflowTimeline.tsx',size: 1100, type: 'file', extension: 'tsx' },
      { path: 'src/styles/globals.css',             size: 9800, type: 'file', extension: 'css' },
      { path: 'src/skills/coding/architecture.skill.json', size: 680, type: 'file', extension: 'json' },
      { path: 'src/skills/coding/debugging.skill.json',    size: 620, type: 'file', extension: 'json' },
      { path: 'src/skills/coding/refactor.skill.json',     size: 590, type: 'file', extension: 'json' },
      { path: 'src/skills/coding/integration.skill.json',  size: 710, type: 'file', extension: 'json' },
      { path: 'package.json',                       size: 1400, type: 'file', extension: 'json' },
      { path: 'electron.vite.config.ts',            size: 620,  type: 'file', extension: 'ts' }
    ]
  },

  // TODO(v2): Read actual file content via IPC
  readProjectFile(path: string): string {
    return `[Mock] Content of ${path} — connect real filesystem in v2`
  },

  // TODO(v2): Grep real files
  searchInProject(query: string): { file: string; line: number; match: string }[] {
    return [
      { file: 'src/engine/orchestrator.ts', line: 12, match: `// Contains: ${query}` }
    ]
  },

  // TODO(v2): Write via Electron IPC
  createProjectFile(path: string, content: string): { success: boolean; message: string } {
    console.log(`[MOCK] Would create file: ${path}`)
    return { success: true, message: `[Mock] File ${path} would be created in v2` }
  },

  // TODO(v2): Patch via Electron IPC with backup
  editProjectFile(path: string, patch: string): { success: boolean; message: string } {
    console.log(`[MOCK] Would edit file: ${path}`)
    return { success: true, message: `[Mock] File ${path} would be edited in v2` }
  },

  // TODO(v2): Real backup via filesystem
  createBackup(path: string): { backupPath: string } {
    return { backupPath: `${path}.backup.${Date.now()}` }
  },

  // TODO(v2): Run via Electron IPC shell execution with permission
  runCommand(command: string): { stdout: string; stderr: string; exitCode: number } {
    return {
      stdout: `[Mock] Would run: ${command}`,
      stderr: '',
      exitCode: 0
    }
  },

  // TODO(v2): Run tsc --noEmit
  runTypeCheck(): { passed: boolean; errors: string[] } {
    return { passed: true, errors: [] }
  },

  // TODO(v2): Run actual test suite
  runTests(): { passed: number; failed: number; output: string } {
    return { passed: 0, failed: 0, output: '[Mock] No tests configured yet' }
  },

  summarizeCodebase(): string {
    const files = codingTools.listProjectFiles()
    const byExtension = files.reduce<Record<string, number>>((acc, f) => {
      acc[f.extension] = (acc[f.extension] || 0) + 1
      return acc
    }, {})
    return `${files.length} files: ${Object.entries(byExtension).map(([k, v]) => `${v} ${k}`).join(', ')}`
  },

  generateImplementationPlan(request: string): ImplementationPlan {
    return {
      title: `Implementation Plan: ${request.substring(0, 40)}`,
      summary: 'Generated plan — connect real LLM in v2 for intelligent planning',
      riskLevel: 'low',
      requiresPermission: false,
      steps: [
        { order: 1, action: 'Analyze', description: 'Inspect affected files and dependencies', reversible: true },
        { order: 2, action: 'Plan',    description: 'Define changes required', reversible: true },
        { order: 3, action: 'Execute', description: 'Apply changes incrementally', reversible: true },
        { order: 4, action: 'Verify',  description: 'Run type check and tests', reversible: true }
      ],
      filesToModify: [],
      filesToCreate: [],
      estimatedTime: '30 minutes'
    }
  },

  generateCodeReviewReport(): CodeReviewIssue[] {
    return [
      {
        severity: 'suggestion',
        file: 'src/engine/orchestrator.ts',
        message: 'Task plan is hardcoded — consider dynamic planning based on request type',
        category: 'architecture'
      },
      {
        severity: 'suggestion',
        file: 'src/engine/mockRunner.ts',
        message: 'Mock outputs are inline strings — consider moving to separate data files',
        category: 'style'
      },
      {
        severity: 'warning',
        file: 'src/store/appStore.ts',
        message: 'localStorage has 5MB limit — add size check before persisting',
        category: 'performance'
      }
    ]
  }
}
