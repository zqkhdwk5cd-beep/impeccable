import React from 'react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import type { AgentConfig, AgentRuntimeState } from '@/types/agent'

interface AgentCardProps {
  agent: AgentConfig
  state: AgentRuntimeState
}

export function AgentCard({ agent, state }: AgentCardProps): React.ReactElement {
  const { updateAgentConfig } = useAppStore()
  const { t, isAr } = useTranslation()

  const STATUS_LABELS: Record<string, string> = {
    idle:      t.idle,
    thinking:  t.thinking,
    working:   t.working,
    waiting:   t.waiting,
    done:      t.done,
    error:     t.error,
    disabled:  t.disabled,
    analyzing: t.analyzing,
    planning:  t.planning,
    editing:   t.editing,
    testing:   t.testing,
    reviewing: t.reviewing
  }

  const handleToggle = () => updateAgentConfig(agent.id, { enabled: !agent.enabled })
  const cardStatus = agent.enabled ? state.status : 'disabled'

  return (
    <div
      className={`agent-card ${cardStatus}`}
      style={{ '--agent-color': agent.color } as React.CSSProperties}
    >
      <div className="agent-card-glow" style={{ background: agent.color }} />

      <div className="agent-card-header">
        <div
          className="agent-icon"
          style={{
            background: `${agent.color}18`,
            border: `1px solid ${agent.color}30`,
            color: agent.color
          }}
        >
          {agent.icon}
        </div>

        <div className="agent-card-info">
          <div className="agent-name">
            {isAr ? agent.nameAr : agent.name}
          </div>
          <div className="agent-name-ar" dir={isAr ? 'ltr' : 'rtl'}>
            {isAr ? agent.name : agent.nameAr}
          </div>
        </div>

        <div className="toggle" onClick={handleToggle}>
          <div className={`toggle-track ${agent.enabled ? 'on' : ''}`}>
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      {agent.enabled && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span
              className={`agent-status-badge ${cardStatus}`}
              style={
                ['working', 'thinking', 'analyzing', 'planning', 'editing', 'testing', 'reviewing'].includes(cardStatus)
                  ? { color: agent.color, background: `${agent.color}15`, border: `1px solid ${agent.color}25` }
                  : {}
              }
            >
              <span className="status-dot" />
              {STATUS_LABELS[cardStatus] || cardStatus}
            </span>

            {state.progress > 0 && state.progress < 100 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {state.progress}%
              </span>
            )}
          </div>

          {state.currentTask && (
            <div className="agent-current-task">{state.currentTask}</div>
          )}

          <div className="agent-progress-bar">
            <div
              className="agent-progress-fill"
              style={{ width: `${state.progress}%`, background: agent.color }}
            />
          </div>

          {state.lastAction && (
            <div className="agent-last-action">{state.lastAction}</div>
          )}
        </>
      )}

      {!agent.enabled && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          {t.agentDisabledMsg}
        </div>
      )}
    </div>
  )
}

export function AgentsPanel(): React.ReactElement {
  const { agents, agentStates } = useAppStore()
  const { t } = useTranslation()

  const runningCount = agents.filter(
    (a) => a.enabled && ['thinking', 'working', 'analyzing', 'planning', 'editing', 'testing', 'reviewing'].includes(agentStates[a.id]?.status)
  ).length

  return (
    <div className="agents-panel">
      <div className="agents-panel-header">
        <span>{t.agentsPanel}</span>
        {runningCount > 0 && (
          <span style={{
            background: 'rgba(124,111,247,0.15)',
            color: 'var(--agent-chief)',
            padding: '1px 8px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700
          }}>
            {runningCount} {t.active}
          </span>
        )}
      </div>

      <div className="agents-list">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            state={agentStates[agent.id] || {
              agentId: agent.id,
              status: 'idle',
              currentTask: null,
              progress: 0,
              lastAction: null,
              output: null,
              error: null,
              startedAt: null,
              completedAt: null
            }}
          />
        ))}
      </div>
    </div>
  )
}
