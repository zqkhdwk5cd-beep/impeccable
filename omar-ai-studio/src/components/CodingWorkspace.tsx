import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import { runWorkflow } from '@/engine/orchestrator'
import { matchSkills } from '@/engine/skillMatcher'
import type { Skill } from '@/types/skill'
import { v4 as uuidv4 } from 'uuid'

const CODING_EXAMPLES_AR = [
  'راجع معمارية المشروع',
  'صلح أخطاء TypeScript',
  'اشرح هيكل المشروع'
]

const CODING_EXAMPLES_EN = [
  'review project structure',
  'Find and fix bugs',
  'Analyze code architecture'
]

function renderMarkdown(text: string): React.ReactElement {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let codeKey = 0

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${codeKey++}`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '10px 12px', overflow: 'auto', fontSize: 11, margin: '8px 0' }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        )
        codeLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }
    if (inCodeBlock) { codeLines.push(line); return }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: '16px 0 8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(
        <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{line.slice(2, -2)}</p>
      )
    } else if (line.startsWith('---')) {
      elements.push(<div key={i} style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />)
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 4 }} />)
    } else {
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code style="background:var(--bg-secondary);padding:1px 5px;border-radius:3px;font-size:11px;">$1</code>')
      elements.push(
        <p key={i} style={{ margin: '2px 0', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: formatted }} />
      )
    }
  })

  return <div>{elements}</div>
}

export function CodingWorkspace(): React.ReactElement {
  const {
    codingProjectPath,
    setCodingProjectPath,
    agents,
    agentStates,
    skills,
    updateSkill,
    isRunning,
    currentProjectId,
    currentOutput,
    lastSkillMatch
  } = useAppStore()
  const { t, isAr } = useTranslation()

  const [codingInput, setCodingInput] = useState('')
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [activatedSkills, setActivatedSkills] = useState<Skill[]>([])
  const [devPanelOpen, setDevPanelOpen] = useState(false)

  const fontUi = isAr ? 'var(--font-ar)' : 'var(--font-ui)'

  // Debounced skill preview as user types
  useEffect(() => {
    if (!codingInput.trim()) {
      setActivatedSkills([])
      return
    }
    const timer = setTimeout(() => {
      const result = matchSkills(codingInput, skills)
      setActivatedSkills(result.matchedSkills)
    }, 300)
    return () => clearTimeout(timer)
  }, [codingInput, skills])

  const codingAgent = agents.find((a) => a.id === 'coding')
  const codingState = agentStates['coding']
  const examples = isAr ? CODING_EXAMPLES_AR : CODING_EXAMPLES_EN

  const handleSelectProject = async () => {
    if (typeof window === 'undefined' || !window.api) return
    const result = await window.api.dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (!result.canceled && result.filePaths && result.filePaths[0]) {
      const chosen = result.filePaths[0]
      setCodingProjectPath(chosen)
      // Count files for display
      try {
        const dirResult = await window.api.fs.readDir(chosen, 2)
        if (dirResult.success && dirResult.data) {
          setFileCount(dirResult.data.filter((f) => !f.isDir).length)
        }
      } catch {
        setFileCount(null)
      }
    }
  }

  const handleRun = async () => {
    if (!codingInput.trim() || isRunning) return
    const projectId = currentProjectId || uuidv4()
    await runWorkflow(codingInput.trim(), projectId)
  }

  const codingOutput = currentOutput?.codingOutput ?? null

  const statusColors: Record<string, string> = {
    idle: 'var(--text-muted)',
    thinking: '#43D9AD',
    working: '#43D9AD',
    analyzing: '#43D9AD',
    planning: '#74B9FF',
    editing: '#FFB347',
    testing: '#FF6B6B',
    reviewing: '#7C6FF7',
    done: '#43D9AD',
    error: '#FF6B6B',
    disabled: 'var(--text-muted)',
    waiting: 'var(--text-muted)'
  }

  const STATUS_LABELS: Record<string, string> = {
    idle: t.idle,
    thinking: t.thinking,
    working: t.working,
    waiting: t.waiting,
    done: t.done,
    error: t.error,
    disabled: t.disabled,
    analyzing: t.analyzing,
    planning: t.planning,
    editing: t.editing,
    testing: t.testing,
    reviewing: t.reviewing
  }

  const cardStatus = codingAgent?.enabled ? (codingState?.status ?? 'idle') : 'disabled'
  const statusColor = statusColors[cardStatus] ?? 'var(--text-muted)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-primary)'
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top bar */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
        flexWrap: 'wrap'
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', fontFamily: fontUi }}>
          💻 {t.codingWorkspace || 'Coding Workspace'}
        </div>

        <div style={{ flex: 1 }} />

        {/* Project path display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          background: codingProjectPath ? 'rgba(67,217,173,0.07)' : 'var(--bg-primary)',
          border: `1px solid ${codingProjectPath ? 'rgba(67,217,173,0.25)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          maxWidth: 360,
          overflow: 'hidden'
        }}>
          <span style={{ fontSize: 12 }}>{codingProjectPath ? '📂' : '📁'}</span>
          <span style={{
            fontSize: 11,
            color: codingProjectPath ? '#43D9AD' : 'var(--text-muted)',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {codingProjectPath
              ? (codingProjectPath.split('/').pop() || codingProjectPath)
              : (t.noProjectSelected || 'No project selected')}
          </span>
          {codingProjectPath && fileCount !== null && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
              · {fileCount} {t.fileCount || 'files'}
            </span>
          )}
        </div>

        <button
          onClick={handleSelectProject}
          style={{
            padding: '7px 12px',
            background: 'rgba(67,217,173,0.1)',
            border: '1px solid rgba(67,217,173,0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#43D9AD',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: fontUi,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          {t.selectProject || '📁 Select Project'}
        </button>
      </div>

      {/* Command input section */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            value={codingInput}
            onChange={(e) => setCodingInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                handleRun()
              }
            }}
            placeholder={t.codingRequest || 'Enter a coding request...'}
            disabled={isRunning}
            rows={2}
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '9px 12px',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              resize: 'none',
              fontFamily: fontUi,
              lineHeight: 1.5
            }}
          />
          <button
            onClick={handleRun}
            disabled={isRunning || !codingInput.trim() || !codingProjectPath}
            title={!codingProjectPath ? (t.selectProjectFirst || 'Select a project folder first') : undefined}
            style={{
              padding: '9px 16px',
              background: isRunning || !codingInput.trim() || !codingProjectPath
                ? 'rgba(67,217,173,0.05)'
                : 'rgba(67,217,173,0.12)',
              border: `1px solid ${isRunning || !codingInput.trim() || !codingProjectPath ? 'rgba(67,217,173,0.1)' : 'rgba(67,217,173,0.35)'}`,
              borderRadius: 'var(--radius-md)',
              color: isRunning || !codingProjectPath ? 'var(--text-muted)' : '#43D9AD',
              fontSize: 12,
              fontWeight: 700,
              cursor: isRunning || !codingInput.trim() || !codingProjectPath ? 'not-allowed' : 'pointer',
              fontFamily: fontUi,
              whiteSpace: 'nowrap',
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            {isRunning ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                {t.running}
              </>
            ) : (
              <>▶ {t.run}</>
            )}
          </button>
        </div>

        {/* Example chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {examples.map((ex) => (
            <div
              key={ex}
              onClick={() => !isRunning && setCodingInput(ex)}
              style={{
                padding: '3px 10px',
                background: 'rgba(67,217,173,0.06)',
                border: '1px solid rgba(67,217,173,0.2)',
                borderRadius: 20,
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontFamily: fontUi,
                transition: 'all 0.12s ease',
                userSelect: 'none'
              }}
            >
              {ex}
            </div>
          ))}
        </div>

        {/* Activated skills banner */}
        {activatedSkills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi, marginRight: 2 }}>
              {t.activatedSkills || 'Skills'}:
            </span>
            {activatedSkills.map(skill => (
              <span
                key={skill.id}
                style={{
                  background: `${skill.color}18`,
                  border: `1px solid ${skill.color}40`,
                  color: skill.color,
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: fontUi
                }}
              >
                {skill.icon} {skill.name}
              </span>
            ))}
          </div>
        )}

        {!codingProjectPath && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,107,107,0.8)', fontFamily: fontUi }}>
            ⚠ {t.selectProjectFirst || 'Select a project folder first'}
          </div>
        )}
      </div>

      {/* Main content: split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left column — agent card + skills */}
        <div style={{
          width: 340,
          flexShrink: 0,
          borderRight: isAr ? 'none' : '1px solid var(--border-subtle)',
          borderLeft: isAr ? '1px solid var(--border-subtle)' : 'none',
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}>
          {/* Coding Agent status card */}
          {codingAgent && codingState && (
            <div style={{
              background: 'var(--bg-card)',
              border: `1px solid ${codingAgent.color}25`,
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* glow */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: codingAgent.color,
                opacity: cardStatus === 'idle' || cardStatus === 'disabled' ? 0.15 : 0.6
              }} />

              <div style={{ padding: 16 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    background: `${codingAgent.color}18`,
                    border: `1px solid ${codingAgent.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0
                  }}>
                    {codingAgent.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', fontFamily: fontUi }}>
                      {isAr ? codingAgent.nameAr : codingAgent.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi, marginTop: 2 }}>
                      {isAr ? codingAgent.descriptionAr : codingAgent.description.slice(0, 48) + '...'}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 9px',
                    borderRadius: 20,
                    background: `${statusColor}14`,
                    border: `1px solid ${statusColor}28`,
                    fontSize: 10,
                    color: statusColor,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    fontFamily: fontUi
                  }}>
                    <div style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: statusColor,
                      animation: ['working', 'analyzing', 'thinking', 'planning', 'editing', 'testing', 'reviewing'].includes(cardStatus)
                        ? 'pulse 1.5s ease-in-out infinite'
                        : 'none'
                    }} />
                    {STATUS_LABELS[cardStatus] || cardStatus}
                  </div>
                  {codingState.progress > 0 && codingState.progress < 100 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {codingState.progress}%
                    </span>
                  )}
                </div>

                {codingState.currentTask && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: fontUi, lineHeight: 1.5 }}>
                    {codingState.currentTask}
                  </div>
                )}

                {/* Progress bar */}
                <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    height: '100%',
                    width: `${codingState.progress}%`,
                    background: codingAgent.color,
                    borderRadius: 2,
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                {codingState.lastAction && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                    {codingState.lastAction}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active skills */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--text-muted)',
              marginBottom: 10,
              fontFamily: fontUi
            }}>
              {t.codingSkills || 'Coding Skills'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    background: 'var(--bg-card)',
                    border: `1px solid ${skill.enabled ? `${skill.color}25` : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, opacity: skill.enabled ? 1 : 0.4 }}>{skill.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: skill.enabled ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontFamily: fontUi,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {isAr ? skill.nameAr : skill.name}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1, fontFamily: fontUi }}>
                      {skill.enabled
                        ? (t.skillEnabled || 'Enabled')
                        : (t.skillDisabled || 'Disabled')}
                    </div>
                  </div>
                  {/* Toggle */}
                  <div
                    onClick={() => updateSkill(skill.id, { enabled: !skill.enabled })}
                    style={{
                      width: 30,
                      height: 16,
                      borderRadius: 8,
                      background: skill.enabled ? skill.color : 'var(--border-medium)',
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 2,
                      left: skill.enabled ? 'calc(100% - 14px)' : 2,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — output */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {codingOutput ? (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                padding: '8px 12px',
                background: 'rgba(67,217,173,0.06)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(67,217,173,0.15)'
              }}>
                <span style={{ fontSize: 16 }}>💻</span>
                <span style={{ fontSize: 11, color: '#43D9AD', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: fontUi }}>
                  {isAr ? 'تقرير عميل البرمجة' : 'Coding Agent Report'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi }}>
                  {isAr ? 'قراءة فقط · لم تُعدَّل أي ملفات' : 'Read-only · No files modified'}
                </span>
              </div>
              {renderMarkdown(codingOutput)}
            </div>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: 40, opacity: 0.4 }}>💻</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: fontUi }}>
                {t.codingEmpty || 'Enter a coding request to activate the Coding Agent'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi, textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
                {codingProjectPath
                  ? (t.codingEmptyHint || 'Try: "راجع معمارية المشروع واقترح تحسينات"')
                  : (t.selectProjectFirst || 'Select a project folder first')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Developer Panel */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <button
          onClick={() => setDevPanelOpen(o => !o)}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: fontUi,
            fontSize: 11,
            color: 'var(--text-muted)',
            transition: 'color 0.12s ease'
          }}
        >
          <span>{devPanelOpen ? '▼' : '▶'}</span>
          <span>{t.developerPanel || '🛠️ Developer Panel'}</span>
          {lastSkillMatch && lastSkillMatch.matchedSkills.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 10,
              background: 'rgba(162,155,254,0.15)',
              border: '1px solid rgba(162,155,254,0.3)',
              color: '#A29BFE',
              borderRadius: 8,
              padding: '1px 6px',
              fontWeight: 600
            }}>
              {lastSkillMatch.matchedSkills.length} {t.activatedSkills || 'skills active'}
            </span>
          )}
        </button>
        {devPanelOpen && (
          <div style={{ padding: '0 16px 12px', maxHeight: 260, overflow: 'auto' }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-muted)',
              marginBottom: 8,
              fontFamily: fontUi
            }}>
              {t.composedPrompt || 'Composed Runtime Prompt'}
            </div>
            {lastSkillMatch && lastSkillMatch.composedPrompt ? (
              <pre style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 10,
                fontSize: 10,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                margin: 0
              }}>
                {lastSkillMatch.composedPrompt}
              </pre>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi, fontStyle: 'italic' }}>
                {t.noSkillsActivated || 'No skills activated for this request'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
