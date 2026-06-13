import React from 'react'
import { useAppStore } from '@/store/appStore'
import { runWorkflow, pauseWorkflow, resumeWorkflow, stopWorkflow } from '@/engine/orchestrator'
import { v4 as uuidv4 } from 'uuid'

export function TopBar(): React.ReactElement {
  const {
    isRunning,
    isPaused,
    mode,
    setMode,
    projects,
    currentProjectId,
    commandInput
  } = useAppStore()

  const currentProject = projects.find((p) => p.id === currentProjectId)

  const handleRun = async () => {
    if (!commandInput.trim()) return
    const projectId = currentProjectId || uuidv4()
    await runWorkflow(commandInput.trim(), projectId)
  }

  const handlePauseResume = () => {
    if (isPaused) {
      resumeWorkflow()
    } else {
      pauseWorkflow()
    }
  }

  const handleStop = () => {
    stopWorkflow()
  }

  const toggleMode = () => {
    if (!isRunning) {
      setMode(mode === 'mock' ? 'live' : 'mock')
    }
  }

  return (
    <div className="topbar">
      <div className="topbar-logo">
        <div className="logo-icon">⚡</div>
        <span>Omar AI Studio</span>
      </div>

      <div className="topbar-project">
        {currentProject ? currentProject.name : 'No project selected'}
      </div>

      <div
        className={`topbar-mode ${mode}`}
        onClick={toggleMode}
        title={isRunning ? 'Cannot change mode while running' : 'Click to toggle mode'}
      >
        <div className="dot" />
        {mode === 'mock' ? 'Mock Mode' : 'Live Mode'}
      </div>

      <div className="topbar-controls">
        {isRunning && (
          <>
            <button
              className={`btn ${isPaused ? 'btn-primary' : 'btn-warn'}`}
              onClick={handlePauseResume}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button className="btn btn-danger" onClick={handleStop}>
              ⏹ Stop
            </button>
          </>
        )}

        {!isRunning && (
          <button
            className="btn btn-primary"
            onClick={handleRun}
            disabled={!commandInput.trim()}
          >
            ▶ Run
          </button>
        )}
      </div>
    </div>
  )
}
