import React, { useEffect } from 'react'
import './styles/globals.css'

import { useAppStore } from './store/appStore'
import { useTranslation } from './i18n/useTranslation'

import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { AgentsPanel } from './components/AgentCard'
import { ConsoleLog } from './components/ConsoleLog'
import { AgentSettings } from './components/AgentSettings'
import { MemoryView } from './components/MemoryView'
import { PromptPacksView } from './components/PromptPacksView'
import { PermissionLayer } from './components/PermissionModal'
import { SkillsView } from './components/SkillsView'

// Studio
import { OverviewWorkspace } from './components/studio/OverviewWorkspace'
import { AgentWorkspace } from './components/studio/AgentWorkspace'

// Coding
import { CodingWorkspace } from './components/CodingWorkspace'
import { CreateProjectWizard } from './components/coding/CreateProjectWizard'
import { ProjectHistoryView } from './components/coding/ProjectHistoryView'

import type { StudioView } from './store/appStore'
import type { AgentId } from './types/agent'

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
  const { activeSection, studioView, codingView, activeView } = useAppStore()
  const { isAr } = useTranslation()

  // Apply RTL direction to document root
  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr'
    document.documentElement.lang = isAr ? 'ar' : 'en'
  }, [isAr])

  const { t } = useTranslation()

  const renderStudio = () => {
    if (studioView === 'overview') {
      return <OverviewWorkspace />
    }
    // Agent workspaces for the 7 creative agents
    const studioAgentViews: StudioView[] = ['chief', 'story', 'character', 'image', 'video', 'research', 'memory']
    if (studioAgentViews.includes(studioView)) {
      return <AgentWorkspace agentId={studioView as Exclude<AgentId, 'coding'>} />
    }
    // Legacy views accessible via old activeView system (memory, packs, agents, settings)
    return <OverviewWorkspace />
  }

  const renderCoding = () => {
    switch (codingView) {
      case 'lab':
        return <CodingWorkspace />
      case 'new-project':
        return <CreateProjectWizard />
      case 'skills':
        return <SkillsView />
      case 'history':
        return <ProjectHistoryView />
      default:
        return <CodingWorkspace />
    }
  }

  // Studio section also handles legacy activeView-based views for backward compatibility
  const renderStudioWithLegacy = () => {
    switch (activeView) {
      case 'memory':
        return <MemoryView />
      case 'packs':
        return <PromptPacksView />
      case 'agents':
        return <AgentSettings />
      case 'settings':
        return (
          <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', padding: 24, gap: 20, height: '100%' }}>
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
        return renderStudio()
    }
  }

  return (
    <div className="app-layout">
      <TopBar />
      <Sidebar />
      <div
        style={{ gridArea: 'workspace', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {activeSection === 'studio' ? renderStudioWithLegacy() : renderCoding()}
      </div>
      {/* AgentsPanel only in Studio section */}
      {activeSection === 'studio' ? <AgentsPanel /> : <div style={{ gridArea: 'agents' }} />}
      <ConsoleLog />
      <PermissionLayer />
    </div>
  )
}
