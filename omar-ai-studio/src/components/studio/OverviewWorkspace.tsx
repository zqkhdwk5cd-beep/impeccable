import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import { runWorkflow } from '@/engine/orchestrator'
import { WorkflowTimeline } from '@/components/WorkflowTimeline'
import { OutputPreview } from '@/components/OutputPreview'
import { v4 as uuidv4 } from 'uuid'

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

export function OverviewWorkspace(): React.ReactElement {
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
  const fontUi = isAr ? 'var(--font-ar)' : 'var(--font-ui)'

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
            style={{ fontFamily: fontUi }}
          >
            {isRunning ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                {t.running}
              </>
            ) : (
              <>{t.runFullWorkflow || 'Run Full Workflow'}</>
            )}
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
          style={{ cursor: 'pointer', padding: '6px 12px', borderBottom: 'none', fontFamily: fontUi }}
        >
          ⟳ {t.workflow} {tasks.length > 0 && `(${tasks.filter((tk) => tk.status === 'completed').length}/${tasks.length})`}
        </div>
        <div
          className={`output-tab ${workspaceTab === 'output' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('output')}
          style={{ cursor: 'pointer', padding: '6px 12px', borderBottom: 'none', fontFamily: fontUi }}
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
