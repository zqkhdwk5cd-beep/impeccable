import React from 'react'
import { useAppStore } from '@/store/appStore'
import { runWorkflow, pauseWorkflow, resumeWorkflow, stopWorkflow } from '@/engine/orchestrator'
import { useTranslation } from '@/i18n/useTranslation'
import { v4 as uuidv4 } from 'uuid'

export function TopBar(): React.ReactElement {
  const {
    isRunning,
    isPaused,
    mode,
    setMode,
    projects,
    currentProjectId,
    commandInput,
    language,
    setLanguage
  } = useAppStore()

  const { t, isAr } = useTranslation()
  const currentProject = projects.find((p) => p.id === currentProjectId)

  const handleRun = async () => {
    if (!commandInput.trim()) return
    const projectId = currentProjectId || uuidv4()
    await runWorkflow(commandInput.trim(), projectId)
  }

  const handlePauseResume = () => {
    if (isPaused) resumeWorkflow()
    else pauseWorkflow()
  }

  const toggleMode = () => {
    if (!isRunning) setMode(mode === 'mock' ? 'live' : 'mock')
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en')
  }

  return (
    <div className="topbar" dir="ltr">
      <div className="topbar-logo">
        <div className="logo-icon">⚡</div>
        <span style={{ fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
          {isAr ? 'أوما AI استوديو' : 'Omar AI Studio'}
        </span>
      </div>

      <div className="topbar-project">
        {currentProject
          ? currentProject.name
          : t.noProject}
      </div>

      <div
        className={`topbar-mode ${mode}`}
        onClick={toggleMode}
        title={isRunning ? '' : 'Click to toggle mode'}
      >
        <div className="dot" />
        {mode === 'mock' ? t.mockMode : t.liveMode}
      </div>

      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          padding: '4px 10px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          transition: 'all 0.15s ease'
        }}
        title="Toggle Arabic / English"
      >
        {language === 'en' ? '🇸🇦 ع' : '🇺🇸 EN'}
      </button>

      <div className="topbar-controls">
        {isRunning && (
          <>
            <button
              className={`btn ${isPaused ? 'btn-primary' : 'btn-warn'}`}
              onClick={handlePauseResume}
            >
              {isPaused ? t.resume : t.pause}
            </button>
            <button className="btn btn-danger" onClick={stopWorkflow}>
              {t.stop}
            </button>
          </>
        )}

        {!isRunning && (
          <button
            className="btn btn-primary"
            onClick={handleRun}
            disabled={!commandInput.trim()}
          >
            {t.run}
          </button>
        )}
      </div>
    </div>
  )
}
