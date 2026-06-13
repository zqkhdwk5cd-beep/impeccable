import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import type { AgentConfig } from '@/types/agent'

interface AgentSettingsCardProps {
  agent: AgentConfig
}

function AgentSettingsCard({ agent }: AgentSettingsCardProps): React.ReactElement {
  const { updateAgentConfig } = useAppStore()
  const [instructions, setInstructions] = useState(agent.instructions)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateAgentConfig(agent.id, { instructions })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="agent-settings-card">
      <div className="agent-settings-header">
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${agent.color}18`,
            border: `1px solid ${agent.color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: agent.color
          }}
        >
          {agent.icon}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {agent.description}
          </div>
        </div>

        <div
          className="toggle"
          onClick={() => updateAgentConfig(agent.id, { enabled: !agent.enabled })}
        >
          <div className={`toggle-track ${agent.enabled ? 'on' : ''}`}>
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      <div className="agent-settings-body">
        <div className="agent-settings-label">System Instructions</div>
        <textarea
          className="agent-settings-textarea"
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value)
            setSaved(false)
          }}
          rows={4}
          disabled={!agent.enabled}
          placeholder="Enter agent instructions..."
        />

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: '4px 12px' }}
            onClick={() => {
              setInstructions(agent.instructions)
              setSaved(false)
            }}
          >
            Reset
          </button>
          <button
            className={`btn ${saved ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11, padding: '4px 12px' }}
            onClick={handleSave}
            disabled={!agent.enabled}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="agent-settings-label">Capabilities</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {agent.capabilities.map((cap) => (
              <span key={cap} className="tag">{cap}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgentSettings(): React.ReactElement {
  const agents = useAppStore((s) => s.agents)

  return (
    <div className="agent-settings">
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Agent Configuration
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Customize each agent's instructions and behavior. In Live mode, these instructions
          are sent to the AI model as system prompts.
        </div>
      </div>

      {agents.map((agent) => (
        <AgentSettingsCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}
