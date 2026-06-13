import React from 'react'
import { useAppStore } from '@/store/appStore'
import { TaskCard } from './TaskCard'

export function WorkflowTimeline(): React.ReactElement {
  const tasks = useAppStore((s) => s.tasks)
  const isRunning = useAppStore((s) => s.isRunning)

  if (tasks.length === 0) {
    return (
      <div className="no-content">
        <div className="no-content-icon" style={{ fontSize: 40 }}>⟳</div>
        <p>Enter a command above and press Run to start the workflow</p>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          All 7 agents will activate sequentially
        </div>
      </div>
    )
  }

  return (
    <div className="timeline">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}

      {!isRunning && tasks.every((t) => t.status === 'completed') && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(85,239,196,0.06)',
            border: '1px solid rgba(85,239,196,0.2)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 4,
            animation: 'slideIn 0.3s ease'
          }}
        >
          <span style={{ fontSize: 18 }}>✓</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-done)' }}>
              Workflow Complete
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Prompt pack generated — check the Output tab
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
