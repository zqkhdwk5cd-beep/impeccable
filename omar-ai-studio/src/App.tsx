import React, { useState, useEffect } from 'react'
import './styles/globals.css'

import { useAppStore } from './store/appStore'
import { useTranslation } from './i18n/useTranslation'
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

const COMMAND_EXAMPLES_AR = [
  'اعمل حلقة جديدة للأرنب Hopper مدتها 15 ثانية',
  'اعمل قصة لشخصية تتعلم الطبخ بأسلوب Pixar',
  'اكتب سيناريو لمغامرة في الفضاء مدتها 30 ثانية',
  'اعمل بروميبتات لمقطع تعليمي للأطفال'
]

const COMMAND_EXAMPLES_EN = [
  'Create 3 scene prompts for a fantasy adventure',
  'Write a story about a robot learning to paint',
  'Make a 15-second episode with character Hopper',
  'Create video prompts for a nature documentary'
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
  const { t, isAr } = useTranslation()

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('workflow')

  const examples = isAr ? COMMAND_EXAMPLES_AR : COMMAND_EXAMPLES_EN

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

  const isInputRTL = (text: string): boolean => /[؀-ۿ]/.test(text.slice(0, 10))

  return (
    <div className="workspace" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="command-section">
        <div className="command-input-wrapper">
          <textarea
            className="command-input"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.enterCommand}
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
            style={{ fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}
          >
            {isRunning ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                {t.running}
              </>
            ) : t.run}
          </button>
        </div>

        <div className="command-examples">
          {examples.map((ex) => (
            <div
              key={ex}
              className="command-example"
              onClick={() => !isRunning && setCommandInput(ex)}
              dir={isInputRTL(ex) ? 'rtl' : 'ltr'}
              style={{ fontFamily: isInputRTL(ex) ? 'var(--font-ar)' : 'var(--font-ui)' }}
            >
              {ex.length > 42 ? ex.substring(0, 42) + '...' : ex}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div
          className={`output-tab ${workspaceTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('workflow')}
          style={{ cursor: 'pointer', padding: '6px 12px', borderBottom: 'none', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}
        >
          ⟳ {t.workflow} {tasks.length > 0 && `(${tasks.filter((t) => t.status === 'completed').length}/${tasks.length})`}
        </div>
        <div
          className={`output-tab ${workspaceTab === 'output' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('output')}
          style={{ cursor: 'pointer', padding: '6px 12px', borderBottom: 'none', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}
        >
          📦 {t.output} {currentOutput ? '●' : ''}
        </div>
      </div>

      <div className="workflow-section">
        {workspaceTab === 'workflow' ? <WorkflowTimeline /> : <OutputPreview />}
      </div>
    </div>
  )
}

function SettingsSection(): React.ReactElement {
  const { mode, setMode, language, setLanguage } = useAppStore()
  const { t, isAr } = useTranslation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
      {/* Language */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
          {t.language}
        </div>
        <div style={{ padding: 16, display: 'flex', gap: 10 }}>
          {(['en', 'ar'] as const).map((lang) => (
            <div
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: language === lang ? 'rgba(124,111,247,0.1)' : 'var(--bg-secondary)',
                border: `1px solid ${language === lang ? 'rgba(124,111,247,0.3)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: 20 }}>{lang === 'en' ? '🇺🇸' : '🇸🇦'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {lang === 'en' ? 'English' : 'العربية'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {lang === 'en' ? 'Left to right' : 'يمين إلى يسار'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Mode */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
          {t.executionMode}
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: mode === m ? 'var(--agent-chief)' : 'var(--border-medium)', flexShrink: 0, boxShadow: mode === m ? '0 0 8px var(--agent-chief)' : 'none' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
                  {m === 'mock' ? t.mockMode : t.liveMode}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
                  {m === 'mock' ? t.mockModeDesc : t.liveModeDesc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
          {t.about}
        </div>
        <div style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <div style={{ marginBottom: 8, fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Omar AI Studio v1.0.0</strong>
          </div>
          <div style={{ fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
            {isAr
              ? 'مركز قيادة AI متعدد العملاء للإنتاج الإبداعي. 7 عملاء متخصصون: رئيسي، قصص، شخصيات، صور، فيديو، بحث، ذاكرة.'
              : 'Visual multi-agent AI command center for creative production. 7 specialized agents: Chief, Story, Character, Image, Video, Research, Memory.'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function App(): React.ReactElement {
  const activeView = useAppStore((s) => s.activeView)
  const { isAr } = useTranslation()

  // Apply RTL direction to document root
  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr'
    document.documentElement.lang = isAr ? 'ar' : 'en'
  }, [isAr])

  const { t } = useTranslation()

  const renderMain = () => {
    switch (activeView) {
      case 'workspace':
        return <Workspace />

      case 'memory':
        return (
          <div style={{ gridArea: 'workspace', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} dir={isAr ? 'rtl' : 'ltr'}>
            <MemoryView />
          </div>
        )

      case 'packs':
        return (
          <div style={{ gridArea: 'workspace', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} dir={isAr ? 'rtl' : 'ltr'}>
            <PromptPacksView />
          </div>
        )

      case 'agents':
        return (
          <div style={{ gridArea: 'workspace', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} dir={isAr ? 'rtl' : 'ltr'}>
            <AgentSettings />
          </div>
        )

      case 'settings':
        return (
          <div style={{ gridArea: 'workspace', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: 24, gap: 20 }} dir={isAr ? 'rtl' : 'ltr'}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
                {t.settingsTitle}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
                {t.settingsDesc}
              </div>
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
      {renderMain()}
      <AgentsPanel />
      <ConsoleLog />
      <PermissionLayer />
    </div>
  )
}
