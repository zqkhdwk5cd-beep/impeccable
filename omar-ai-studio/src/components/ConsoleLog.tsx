import React, { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import type { LogEntry } from '@/types/promptPack'

const AGENT_COLORS: Record<string, string> = {
  chief:     '#7C6FF7',
  story:     '#00D2C8',
  character: '#FFB347',
  image:     '#FF6B6B',
  video:     '#74B9FF',
  research:  '#55EFC4',
  memory:    '#BD93F9'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function LogRow({ log }: { log: LogEntry }): React.ReactElement {
  const agentColor = log.agentId ? AGENT_COLORS[log.agentId] : undefined

  return (
    <div className="log-entry" dir="ltr">
      <span className="log-time">{formatTime(log.timestamp)}</span>
      <span className={`log-level ${log.level}`}>{log.level.toUpperCase()}</span>
      <span className="log-agent" style={{ color: agentColor || 'var(--text-muted)' }}>
        {log.agentId ? log.agentId.toUpperCase() : 'SYSTEM'}
      </span>
      <span className="log-message">{log.message}</span>
    </div>
  )
}

export function ConsoleLog(): React.ReactElement {
  const { logs, clearLogs } = useAppStore()
  const { t } = useTranslation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="console">
      <div className="console-header">
        <span>{t.console}</span>
        <span style={{ color: 'var(--text-muted)' }}>{logs.length} {t.entries}</span>
        <button
          onClick={clearLogs}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600,
            padding: '0 4px'
          }}
        >
          {t.clear}
        </button>
      </div>

      <div className="console-body">
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {t.consoleReady}
          </div>
        ) : (
          logs.map((log) => <LogRow key={log.id} log={log} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
