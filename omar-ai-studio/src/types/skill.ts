export interface Skill {
  id: string
  name: string
  nameAr: string
  description: string
  triggers: string[]
  rules: string[]
  outputSections: string[]
  safetyNotes: string[]
  isDefault: boolean
  enabled: boolean
  icon: string
  color: string
}

export const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'architecture',
    name: 'Architecture Review',
    nameAr: 'مراجعة المعمارية',
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
    isDefault: true,
    enabled: true,
    icon: '🏗️',
    color: '#7C6FF7'
  },
  {
    id: 'debugging',
    name: 'Bug Detection',
    nameAr: 'اكتشاف الأخطاء',
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
    isDefault: true,
    enabled: true,
    icon: '🐛',
    color: '#FF6B6B'
  },
  {
    id: 'refactor',
    name: 'Code Refactoring',
    nameAr: 'إعادة هيكلة الكود',
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
    isDefault: true,
    enabled: true,
    icon: '🔧',
    color: '#74B9FF'
  },
  {
    id: 'integration',
    name: 'Integration Planning',
    nameAr: 'تخطيط التكامل',
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
    isDefault: true,
    enabled: true,
    icon: '🔌',
    color: '#55EFC4'
  }
]
