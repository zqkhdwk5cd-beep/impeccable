// Coding Agent tool interfaces
// v2: Real filesystem access via Electron IPC when project path is set

import type { FileEntry } from '@/types/electron'

export interface FileInfo {
  path: string
  name: string
  type: 'typescript' | 'javascript' | 'css' | 'html' | 'json' | 'markdown' | 'other'
  size: number
  lines: number
  lastModified: number
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

function getFileType(ext: string): FileInfo['type'] {
  const map: Record<string, FileInfo['type']> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown'
  }
  return map[ext] || 'other'
}

const MOCK_FILE_LIST: FileInfo[] = [
  { path: 'electron/main.ts',                    name: 'main.ts',           type: 'typescript',  size: 2100, lines: 52,  lastModified: Date.now() },
  { path: 'electron/preload.ts',                 name: 'preload.ts',        type: 'typescript',  size: 890,  lines: 22,  lastModified: Date.now() },
  { path: 'src/App.tsx',                         name: 'App.tsx',           type: 'typescript',  size: 6200, lines: 155, lastModified: Date.now() },
  { path: 'src/main.tsx',                        name: 'main.tsx',          type: 'typescript',  size: 180,  lines: 6,   lastModified: Date.now() },
  { path: 'src/types/agent.ts',                  name: 'agent.ts',          type: 'typescript',  size: 4100, lines: 103, lastModified: Date.now() },
  { path: 'src/types/task.ts',                   name: 'task.ts',           type: 'typescript',  size: 420,  lines: 14,  lastModified: Date.now() },
  { path: 'src/types/project.ts',                name: 'project.ts',        type: 'typescript',  size: 380,  lines: 12,  lastModified: Date.now() },
  { path: 'src/types/promptPack.ts',             name: 'promptPack.ts',     type: 'typescript',  size: 740,  lines: 26,  lastModified: Date.now() },
  { path: 'src/engine/eventBus.ts',              name: 'eventBus.ts',       type: 'typescript',  size: 1100, lines: 35,  lastModified: Date.now() },
  { path: 'src/engine/taskQueue.ts',             name: 'taskQueue.ts',      type: 'typescript',  size: 780,  lines: 28,  lastModified: Date.now() },
  { path: 'src/engine/permissionManager.ts',     name: 'permissionManager.ts', type: 'typescript', size: 560, lines: 18, lastModified: Date.now() },
  { path: 'src/engine/mockRunner.ts',            name: 'mockRunner.ts',     type: 'typescript',  size: 5800, lines: 145, lastModified: Date.now() },
  { path: 'src/engine/orchestrator.ts',          name: 'orchestrator.ts',   type: 'typescript',  size: 3900, lines: 98,  lastModified: Date.now() },
  { path: 'src/store/appStore.ts',               name: 'appStore.ts',       type: 'typescript',  size: 5200, lines: 130, lastModified: Date.now() },
  { path: 'src/tools/codingTools.ts',            name: 'codingTools.ts',    type: 'typescript',  size: 1800, lines: 45,  lastModified: Date.now() },
  { path: 'src/i18n/translations.ts',            name: 'translations.ts',   type: 'typescript',  size: 7100, lines: 178, lastModified: Date.now() },
  { path: 'src/i18n/useTranslation.ts',          name: 'useTranslation.ts', type: 'typescript',  size: 200,  lines: 8,   lastModified: Date.now() },
  { path: 'src/components/AgentCard.tsx',        name: 'AgentCard.tsx',     type: 'typescript',  size: 3200, lines: 80,  lastModified: Date.now() },
  { path: 'src/components/Sidebar.tsx',          name: 'Sidebar.tsx',       type: 'typescript',  size: 2200, lines: 55,  lastModified: Date.now() },
  { path: 'src/components/OutputPreview.tsx',    name: 'OutputPreview.tsx', type: 'typescript',  size: 5400, lines: 135, lastModified: Date.now() },
  { path: 'src/styles/globals.css',              name: 'globals.css',       type: 'css',         size: 9800, lines: 245, lastModified: Date.now() },
  { path: 'package.json',                        name: 'package.json',      type: 'json',        size: 1400, lines: 35,  lastModified: Date.now() },
  { path: 'electron.vite.config.ts',             name: 'electron.vite.config.ts', type: 'typescript', size: 620, lines: 18, lastModified: Date.now() }
]

// Tool implementations
export const codingTools = {
  listProjectFiles: async (projectPath?: string): Promise<FileInfo[]> => {
    if (projectPath && typeof window !== 'undefined' && window.api) {
      const result = await window.api.fs.readDir(projectPath, 3)
      if (result.success && result.data) {
        return result.data
          .filter((f: FileEntry) => !f.isDir)
          .map((f: FileEntry) => ({
            path: f.path.replace(projectPath + '/', ''),
            name: f.name,
            type: getFileType(f.ext),
            size: f.size,
            lines: Math.floor(f.size / 40),
            lastModified: Date.now()
          }))
      }
    }
    return MOCK_FILE_LIST
  },

  readProjectFile: async (filePath: string, projectPath?: string): Promise<string> => {
    const fullPath = projectPath ? `${projectPath}/${filePath}` : filePath
    if (typeof window !== 'undefined' && window.api) {
      const result = await window.api.fs.readFile(fullPath)
      if (result.success && result.data) return result.data
    }
    return `// Mock content for ${filePath}\n// Real content requires a project to be selected.`
  },

  searchInProject(query: string): { file: string; line: number; match: string }[] {
    return [
      { file: 'src/engine/orchestrator.ts', line: 12, match: `// Contains: ${query}` }
    ]
  },

  createProjectFile(path: string, content: string): { success: boolean; message: string } {
    console.log(`[MOCK] Would create file: ${path}`)
    return { success: true, message: `[Mock] File ${path} would be created in v2` }
  },

  editProjectFile(path: string, patch: string): { success: boolean; message: string } {
    console.log(`[MOCK] Would edit file: ${path}`)
    return { success: true, message: `[Mock] File ${path} would be edited in v2` }
  },

  createBackup(path: string): { backupPath: string } {
    return { backupPath: `${path}.backup.${Date.now()}` }
  },

  runCommand(command: string): { stdout: string; stderr: string; exitCode: number } {
    return {
      stdout: `[Mock] Would run: ${command}`,
      stderr: '',
      exitCode: 0
    }
  },

  runTypeCheck(): { passed: boolean; errors: string[] } {
    return { passed: true, errors: [] }
  },

  runTests(): { passed: number; failed: number; output: string } {
    return { passed: 0, failed: 0, output: '[Mock] No tests configured yet' }
  },

  summarizeCodebase(): string {
    const files = MOCK_FILE_LIST
    const byType = files.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1
      return acc
    }, {})
    return `${files.length} files: ${Object.entries(byType).map(([k, v]) => `${v} ${k}`).join(', ')}`
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
