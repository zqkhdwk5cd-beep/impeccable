import React from 'react'
import { useAppStore } from '@/store/appStore'
import type { Task } from '@/types/task'
import { DEFAULT_AGENTS } from '@/types/agent'

interface TaskCardProps {
  task: Task
}

const AGENT_COLORS: Record<string, string> = {
  chief:     '#7C6FF7',
  story:     '#00D2C8',
  character: '#FFB347',
  image:     '#FF6B6B',
  video:     '#74B9FF',
  research:  '#55EFC4',
  memory:    '#BD93F9'
}

const AGENT_ICONS: Record<string, string> = {
  chief:     '⚡',
  story:     '📖',
  character: '🎭',
  image:     '🎨',
  video:     '🎬',
  research:  '🔍',
  memory:    '🧠'
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  running:   'Running',
  completed: 'Done',
  failed:    'Failed',
  skipped:   'Skipped'
}

export function TaskCard({ task }: TaskCardProps): React.ReactElement {
  const color = AGENT_COLORS[task.agentId] || '#7C6FF7'
  const icon = AGENT_ICONS[task.agentId] || '⚡'
  const agentConfig = DEFAULT_AGENTS.find((a) => a.id === task.agentId)

  return (
    <div
      className={`task-card ${task.status} animate-slide-in`}
      style={{ '--task-color': color } as React.CSSProperties}
    >
      <div
        className="task-agent-dot"
        style={
          task.status === 'running'
            ? { background: `${color}15`, borderColor: `${color}50`, color }
            : { color }
        }
      >
        {icon}
      </div>

      <div className="task-info">
        <div className="task-title">{task.title}</div>
        <div className="task-desc">
          {task.status === 'running' && task.progress > 0
            ? (agentConfig?.name || task.agentId) + ' is working...'
            : task.description}
        </div>

        {(task.status === 'running' || task.status === 'completed') && (
          <div className="task-progress-bar">
            <div
              className="task-progress-fill"
              style={{ width: `${task.progress}%`, background: color }}
            />
          </div>
        )}

        {task.status === 'failed' && task.error && (
          <div style={{ fontSize: 10, color: 'var(--status-error)', marginTop: 4 }}>
            ✗ {task.error}
          </div>
        )}
      </div>

      <div className={`task-status-badge ${task.status}`}>
        {task.status === 'running' && '⟳ '}
        {task.status === 'completed' && '✓ '}
        {task.status === 'failed' && '✗ '}
        {STATUS_LABELS[task.status]}
      </div>
    </div>
  )
}
