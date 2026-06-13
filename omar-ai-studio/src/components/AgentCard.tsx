import React from 'react'
import { useAppStore } from '@/store/appStore'
import type { AgentConfig, AgentRuntimeState } from '@/types/agent'

interface AgentCardProps {
  agent: AgentConfig
  state: AgentRuntimeState
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  working: 'Working',
  waiting: 'Waiting',
  done: 'Done',
  error: 'Error',
  disabled: 'Off'
}

export function AgentCard({ agent, state }: AgentCardProps): React.ReactElement {
  const { updateAgentConfig } = useAppStore()

  const handleToggle = () => {
    updateAgentConfig(agent.id, { enabled: !agent.enabled })
  }

  const cardClass = agent.enabled ? state.status : 'disabled'
  const displayStatus = agent.enabled ? state.status : 'disabled'

  return (
    <div
      className={`agent-card ${cardClass}`}
      style={{ '--agent-color': agent.color } as React.CSSProperties}
    >
      <div
        className="agent-card-glow"
        style={{ background: agent.color }}
      />

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
          <div className="agent-name">{agent.name}</div>
          <div className="agent-name-ar">{agent.nameAr}</div>
        </div>

        <div
          className="toggle"
          onClick={handleToggle}
          title={agent.enabled ? 'Disable agent' : 'Enable agent'}
        >
          <div className={`toggle-track ${agent.enabled ? 'on' : ''}`}>
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      {agent.enabled && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span
              className={`agent-status-badge ${displayStatus}`}
              style={
                displayStatus === 'working' || displayStatus === 'thinking'
                  ? { color: agent.color, background: `${agent.color}15`, border: `1px solid ${agent.color}25` }
                  : {}
              }
            >
              <span className="status-dot" />
              {STATUS_LABELS[displayStatus]}
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
              style={{
                width: `${state.progress}%`,
                background: agent.color
              }}
            />
          </div>

          {state.lastAction && (
            <div className="agent-last-action">{state.lastAction}</div>
          )}
        </>
      )}

      {!agent.enabled && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          Agent disabled — toggle to enable
        </div>
      )}
    </div>
  )
}

export function AgentsPanel(): React.ReactElement {
  const { agents, agentStates } = useAppStore()

  const runningCount = agents.filter(
    (a) => a.enabled && ['thinking', 'working'].includes(agentStates[a.id]?.status)
  ).length

  return (
    <div className="agents-panel">
      <div className="agents-panel-header">
        <span>Agents</span>
        {runningCount > 0 && (
          <span
            style={{
              background: 'rgba(124,111,247,0.15)',
              color: 'var(--agent-chief)',
              padding: '1px 8px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700
            }}
          >
            {runningCount} active
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
