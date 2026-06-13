import React, { useState } from 'react'
import './styles/globals.css'

import { useAppStore } from './store/appStore'
import { runWorkflow } from './engine/orchestrator'
import { v4 as uuidv4 } from 'uuid'

import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { AgentsPanel } from './components/AgentCard'
import { WorkflowTimeline } from './components/WorkflowTimeline'
import { ConsoleLog } from './components/ConsoleLog'
import { OutputPreview } from './components/OutputPreview'
import { AgentSettings } from './components/AgentSettings'
import { MemoryView } from './components/MemoryView'
import { PromptPacksView } from './components/PromptPacksView'
import { PermissionLayer } from './components/PermissionModal'

const COMMAND_EXAMPLES = [
  'اعمل حلقة جديدة للأرنب Hopper مدتها 15 ثانية',
  'Create 3 scene prompts for a fantasy forest',
  'Write a story about a robot learning to paint',
  'اعمل بروميبتات صور لحلقة جديدة بأسلوب Pixar'
]

type WorkspaceTab = 'workflow' | 'output'

function Workspace(): React.ReactElement {
  const {
    commandInput,
    setCommandInput,
    isRunning,
    currentProjectId,
    tasks,
    currentOutput
  } = useAppStore()

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('workflow')

  const handleRun = async () => {
    if (!commandInput.trim() || isRunning) return
    const projectId = currentProjectId || uuidv4()
    setWorkspaceTab('workflow')
    await runWorkflow(commandInput.trim(), projectId)
    setWorkspaceTab('output')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }
  }

  const isInputRTL = (text: string): boolean => {
    const arabicRegex = /[؀-ۿ]/
    return arabicRegex.test(text.slice(0, 10))
  }

  return (
    <div className="workspace">
      <div className="command-section">
        <div className="command-input-wrapper">
          <textarea
            className="command-input"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your creative request... (Arabic or English)"
            disabled={isRunning}
            dir={isInputRTL(commandInput) ? 'rtl' : 'ltr'}
            style={{
              fontFamily: isInputRTL(commandInput) ? 'var(--font-ar)' : 'var(--font-ui)',
              textAlign: isInputRTL(commandInput) ? 'right' : 'left'
            }}
          />
          <button
            className="command-run-btn"
            onClick={handleRun}
            disabled={isRunning || !commandInput.trim()}
          >
            {isRunning ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Running
              </>
            ) : (
              <>▶ Run</>
            )}
          </button>
        </div>

        <div className="command-examples">
          {COMMAND_EXAMPLES.map((example) => (
            <div
              key={example}
              className="command-example"
              onClick={() => !isRunning && setCommandInput(example)}
              dir={/[؀-ۿ]/.test(example) ? 'rtl' : 'ltr'}
            >
              {example.length > 40 ? example.substring(0, 40) + '...' : example}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div
          className={`output-tab ${workspaceTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('workflow')}
          style={{ cursor: 'pointer', padding: '6px 12px', borderBottom: 'none' }}
        >
          ⟳ Workflow {tasks.length > 0 && `(${tasks.filter((t) => t.status === 'completed').length}/${tasks.length})`}
        </div>
        <div
          className={`output-tab ${workspaceTab === 'output' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('output')}
          style={{ cursor: 'pointer', padding: '6px 12px', borderBottom: 'none' }}
        >
          📦 Output {currentOutput ? '●' : ''}
        </div>
      </div>

      <div className="workflow-section">
        {workspaceTab === 'workflow' ? (
          <WorkflowTimeline />
        ) : (
          <OutputPreview />
        )}
      </div>
    </div>
  )
}

export function App(): React.ReactElement {
  const activeView = useAppStore((s) => s.activeView)

  const renderMainContent = () => {
    switch (activeView) {
      case 'workspace':
        return <Workspace />
      case 'memory':
        return (
          <div style={{ gridArea: 'workspace', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <MemoryView />
          </div>
        )
      case 'packs':
        return (
          <div style={{ gridArea: 'workspace', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PromptPacksView />
          </div>
        )
      case 'agents':
        return (
          <div style={{ gridArea: 'workspace', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <AgentSettings />
          </div>
        )
      case 'settings':
        return (
          <div
            style={{
              gridArea: 'workspace',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              gap: 20
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Settings
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>App configuration and preferences</div>
            </div>

            <SettingsSection />
          </div>
        )
      default:
        return <Workspace />
    }
  }

  return (
    <div className="app-layout">
      <TopBar />
      <Sidebar />
      {renderMainContent()}
      <AgentsPanel />
      <ConsoleLog />
      <PermissionLayer />
    </div>
  )
}

function SettingsSection(): React.ReactElement {
  const { mode, setMode } = useAppStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
          Execution Mode
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(['mock', 'live'] as const).map((m) => (
            <div
              key={m}
              onClick={() => setMode(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: mode === m ? 'rgba(124,111,247,0.1)' : 'var(--bg-secondary)',
                border: `1px solid ${mode === m ? 'rgba(124,111,247,0.3)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: mode === m ? 'var(--agent-chief)' : 'var(--border-medium)', border: '2px solid var(--bg-secondary)', boxShadow: mode === m ? '0 0 8px var(--agent-chief)' : 'none' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {m} Mode
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {m === 'mock'
                    ? 'Simulated agents with realistic delays — no API keys needed'
                    : 'Connect to real AI APIs (OpenAI, Anthropic, Ollama)'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
          About
        </div>
        <div style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <div style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-primary)' }}>Omar AI Studio v1.0.0</strong></div>
          <div>Visual multi-agent AI command center for creative content production.</div>
          <div style={{ marginTop: 8 }}>
            7 specialized agents: Chief, Story, Character, Image, Video, Research, Memory.
          </div>
          <div style={{ marginTop: 8 }}>
            Designed to connect to Flux, ComfyUI, Kling, Runway, Veo, OpenAI, Anthropic, and Ollama.
          </div>
        </div>
      </div>
    </div>
  )
}
