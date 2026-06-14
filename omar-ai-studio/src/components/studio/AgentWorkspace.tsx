import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import { runSingleAgent } from '@/engine/orchestrator'
import type { AgentId } from '@/types/agent'

interface AgentWorkspaceProps {
  agentId: Exclude<AgentId, 'coding'>
}

interface AgentConfig {
  placeholder: string
  placeholderAr: string
  examples: string[]
  examplesAr: string[]
  color: string
  icon: string
  description: string
  descriptionAr: string
}

const AGENT_CONFIG: Record<string, AgentConfig> = {
  chief: {
    placeholder: 'Describe the full project or creative brief...',
    placeholderAr: 'صف المشروع أو الفكرة الإبداعية...',
    examples: ['Plan a 30-second Pixar animation about X', 'Break down this story into agent tasks'],
    examplesAr: ['خطط لمقطع 30 ثانية بأسلوب Pixar', 'قسّم هذه الفكرة إلى مهام للعملاء'],
    color: '#7C6FF7',
    icon: '🎖️',
    description: 'Orchestrate the full creative workflow',
    descriptionAr: 'تنسيق سير العمل الإبداعي الكامل'
  },
  story: {
    placeholder: 'Describe the story you want written...',
    placeholderAr: 'صف القصة التي تريد كتابتها...',
    examples: ['Write a 3-scene story about Hopper discovering vegetables', 'Create emotional arc for 15-second episode'],
    examplesAr: ['اكتب قصة 3 مشاهد عن الأرنب Hopper', 'أنشئ قوس عاطفي لحلقة 15 ثانية'],
    color: '#00D2C8',
    icon: '📖',
    description: 'Write cinematic stories and scene structures',
    descriptionAr: 'كتابة القصص وهياكل المشاهد السينمائية'
  },
  character: {
    placeholder: 'Describe the character you want to create...',
    placeholderAr: 'صف الشخصية التي تريد إنشاءها...',
    examples: ['Create character bible for a wise old turtle named Sage', 'Design a curious young inventor'],
    examplesAr: ['أنشئ ملف شخصية لسلحفاة حكيمة اسمها Sage', 'صمّم مخترع شاب فضولي'],
    color: '#FFB347',
    icon: '🎭',
    description: 'Build detailed character bibles',
    descriptionAr: 'بناء ملفات الشخصيات بالتفصيل'
  },
  image: {
    placeholder: 'Describe the scene or image you want prompts for...',
    placeholderAr: 'صف المشهد أو الصورة التي تريد بروميبتات لها...',
    examples: ['Generate Flux prompts for morning garden scene', 'Create 3 image prompts for fantasy cave'],
    examplesAr: ['أنشئ بروميبتات Flux لمشهد حديقة الصباح', 'أنشئ 3 بروميبتات لكهف خيالي'],
    color: '#FF6B6B',
    icon: '🎨',
    description: 'Generate Flux and ComfyUI image prompts',
    descriptionAr: 'توليد بروميبتات Flux و ComfyUI'
  },
  video: {
    placeholder: 'Describe the video sequence or camera movement...',
    placeholderAr: 'صف تسلسل الفيديو أو حركة الكاميرا...',
    examples: ['Create Kling prompts for rabbit discovery scene', 'Design slow-motion celebration sequence'],
    examplesAr: ['أنشئ بروميبتات Kling لمشهد اكتشاف الأرنب', 'صمّم تسلسل احتفال بحركة بطيئة'],
    color: '#74B9FF',
    icon: '🎬',
    description: 'Generate Kling, Runway, and Veo video prompts',
    descriptionAr: 'توليد بروميبتات Kling و Runway و Veo'
  },
  research: {
    placeholder: 'What do you want to research?',
    placeholderAr: 'ماذا تريد أن تبحث؟',
    examples: ['Compare Flux vs SDXL for character consistency', "Best AI video tools for children's animation 2026"],
    examplesAr: ['قارن Flux و SDXL لثبات الشخصية', 'أفضل أدوات AI للرسوم المتحركة للأطفال 2026'],
    color: '#55EFC4',
    icon: '🔍',
    description: 'Research tools, trends, and creative references',
    descriptionAr: 'بحث في الأدوات والاتجاهات والمراجع الإبداعية'
  },
  memory: {
    placeholder: 'Search memory or describe what to save...',
    placeholderAr: 'ابحث في الذاكرة أو اكتب ما تريد حفظه...',
    examples: ['Show all Hopper character data', 'Save this style guide for project X'],
    examplesAr: ['اعرض كل بيانات شخصية Hopper', 'احفظ دليل الأسلوب هذا للمشروع X'],
    color: '#BD93F9',
    icon: '🧠',
    description: 'View and manage your project memory',
    descriptionAr: 'عرض وإدارة ذاكرة مشاريعك'
  }
}

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

export function AgentWorkspace({ agentId }: AgentWorkspaceProps): React.ReactElement {
  const { agentStates, agents, currentProjectId, isRunning } = useAppStore()
  const { t, isAr } = useTranslation()

  const [input, setInput] = useState('')

  const config = AGENT_CONFIG[agentId]
  const agentConfig = agents.find((a) => a.id === agentId)
  const agentState = agentStates[agentId]

  const fontUi = isAr ? 'var(--font-ar)' : 'var(--font-ui)'
  const agentColor = config?.color ?? '#7C6FF7'
  const agentIcon = config?.icon ?? '⚡'

  const isInputRTL = (text: string): boolean => /[؀-ۿ]/.test(text.slice(0, 10))

  const examples = isAr ? (config?.examplesAr ?? []) : (config?.examples ?? [])
  const placeholder = isAr ? (config?.placeholderAr ?? '') : (config?.placeholder ?? '')
  const descText = isAr ? (config?.descriptionAr ?? '') : (config?.description ?? '')
  const agentName = isAr ? (agentConfig?.nameAr ?? agentId) : (agentConfig?.name ?? agentId)

  const status = agentState?.status ?? 'idle'
  const statusColors: Record<string, string> = {
    idle: 'var(--text-muted)',
    thinking: agentColor,
    working: agentColor,
    waiting: '#74B9FF',
    done: '#55EFC4',
    error: '#FF6B6B',
    disabled: 'var(--text-muted)'
  }
  const statusColor = statusColors[status] ?? 'var(--text-muted)'

  const STATUS_LABELS: Record<string, string> = {
    idle: t.idle,
    thinking: t.thinking,
    working: t.working,
    waiting: t.waiting,
    done: t.done,
    error: t.error,
    disabled: t.disabled
  }

  const handleRunAgent = async () => {
    if (!input.trim() || isRunning) return
    const projectId = currentProjectId || 'default'
    await runSingleAgent(agentId, input.trim(), projectId)
  }

  const output = agentState?.output ?? null

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
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: `${agentColor}18`,
          border: `1px solid ${agentColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0
        }}>
          {agentIcon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', fontFamily: fontUi }}>
            {agentName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi, marginTop: 2 }}>
            {descText}
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 20,
          background: `${statusColor}14`,
          border: `1px solid ${statusColor}28`,
          fontSize: 10,
          color: statusColor,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontFamily: fontUi
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor,
            animation: ['thinking', 'working'].includes(status) ? 'pulse 1.5s ease-in-out infinite' : 'none'
          }} />
          {STATUS_LABELS[status] ?? status}
        </div>
      </div>

      {/* Command input area */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                handleRunAgent()
              }
            }}
            placeholder={placeholder}
            disabled={isRunning}
            rows={2}
            dir={isInputRTL(input) ? 'rtl' : 'ltr'}
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
              fontFamily: isInputRTL(input) ? 'var(--font-ar)' : fontUi,
              lineHeight: 1.5
            }}
          />
          <button
            onClick={handleRunAgent}
            disabled={isRunning || !input.trim()}
            style={{
              padding: '9px 16px',
              background: isRunning || !input.trim()
                ? `${agentColor}08`
                : `${agentColor}18`,
              border: `1px solid ${isRunning || !input.trim() ? `${agentColor}15` : `${agentColor}40`}`,
              borderRadius: 'var(--radius-md)',
              color: isRunning || !input.trim() ? 'var(--text-muted)' : agentColor,
              fontSize: 12,
              fontWeight: 700,
              cursor: isRunning || !input.trim() ? 'not-allowed' : 'pointer',
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
              <>▶ {t.runThisAgent || 'Run Agent'}</>
            )}
          </button>
        </div>

        {/* Example chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {examples.map((ex) => (
            <div
              key={ex}
              onClick={() => !isRunning && setInput(ex)}
              style={{
                padding: '3px 10px',
                background: `${agentColor}08`,
                border: `1px solid ${agentColor}22`,
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
      </div>

      {/* Main split layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: 0,
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left: Agent status card */}
        <div style={{
          borderRight: '1px solid var(--border-subtle)',
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}>
          {agentConfig && agentState && (
            <div style={{
              background: 'var(--bg-card)',
              border: `1px solid ${agentColor}25`,
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Color accent top bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: agentColor,
                opacity: status === 'idle' ? 0.2 : 0.7
              }} />

              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 12, fontFamily: fontUi }}>
                  {isAr ? 'حالة العميل' : 'Agent Status'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: `${statusColor}14`,
                    border: `1px solid ${statusColor}28`,
                    fontSize: 10,
                    color: statusColor,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    fontFamily: fontUi
                  }}>
                    <div style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: statusColor,
                      animation: ['thinking', 'working'].includes(status) ? 'pulse 1.5s ease-in-out infinite' : 'none'
                    }} />
                    {STATUS_LABELS[status] ?? status}
                  </div>
                  {agentState.progress > 0 && agentState.progress < 100 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {agentState.progress}%
                    </span>
                  )}
                </div>

                {agentState.currentTask && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, fontFamily: fontUi, lineHeight: 1.5 }}>
                    {agentState.currentTask}
                  </div>
                )}

                {/* Progress bar */}
                <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{
                    height: '100%',
                    width: `${agentState.progress}%`,
                    background: agentColor,
                    borderRadius: 2,
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                {agentState.lastAction && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                    {agentState.lastAction}
                  </div>
                )}

                {agentState.completedAt && (
                  <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi }}>
                    {isAr ? 'اكتمل في' : 'Completed'}: {new Date(agentState.completedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {agentConfig?.capabilities && agentConfig.capabilities.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 8, fontFamily: fontUi }}>
                {t.capabilities || 'Capabilities'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {agentConfig.capabilities.map((cap) => (
                  <span key={cap} style={{
                    padding: '2px 8px',
                    background: `${agentColor}0C`,
                    border: `1px solid ${agentColor}20`,
                    borderRadius: 20,
                    fontSize: 10,
                    color: 'var(--text-secondary)',
                    fontFamily: fontUi
                  }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Agent output */}
        <div style={{ overflowY: 'auto', padding: 20 }}>
          {output ? (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                padding: '8px 12px',
                background: `${agentColor}08`,
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${agentColor}18`
              }}>
                <span style={{ fontSize: 16 }}>{agentIcon}</span>
                <span style={{ fontSize: 11, color: agentColor, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: fontUi }}>
                  {isAr ? `تقرير ${agentName}` : `${agentName} Output`}
                </span>
              </div>
              {renderMarkdown(output)}
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
              <div style={{ fontSize: 40, opacity: 0.3 }}>{agentIcon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: fontUi }}>
                {isAr ? `أدخل طلباً لتشغيل ${agentName}` : `Enter a request to run ${agentName}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi, textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
                {isAr ? 'يعمل هذا العميل بشكل مستقل أو كجزء من سير العمل الكامل' : 'This agent runs independently or as part of the full workflow'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
