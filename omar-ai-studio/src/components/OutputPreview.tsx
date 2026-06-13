import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import type { PromptPack } from '@/types/promptPack'

type Tab = 'story' | 'character' | 'images' | 'video' | 'notes' | 'export' | 'code'

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
          <pre key={`code-${codeKey++}`}>
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

    if (inCodeBlock) {
      codeLines.push(line)
      return
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: '16px 0 8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(
        <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
          {line.slice(2, -2)}
        </p>
      )
    } else if (line.startsWith('---')) {
      elements.push(<div key={i} className="divider" style={{ margin: '12px 0' }} />)
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 4 }} />)
    } else {
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/✅|✓/g, '<span style="color:var(--status-done)">✓</span>')
        .replace(/✗/g, '<span style="color:var(--status-error)">✗</span>')

      elements.push(
        <p
          key={i}
          style={{ margin: '2px 0', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      )
    }
  })

  return <div className="output-markdown">{elements}</div>
}

interface OutputPreviewProps {
  pack: PromptPack
}

function PackView({ pack }: OutputPreviewProps): React.ReactElement {
  const isCodingPack = !!pack.codingOutput && !pack.storyOutput
  const [activeTab, setActiveTab] = useState<Tab>(isCodingPack ? 'code' : 'story')

  const tabs: { id: Tab; label: string; available: boolean }[] = isCodingPack
    ? [
        { id: 'code', label: '💻 Code', available: !!pack.codingOutput },
        { id: 'notes', label: '📋 Notes', available: true },
        { id: 'export', label: '💾 Export', available: true }
      ]
    : [
        { id: 'story', label: '📖 Story', available: !!pack.storyOutput },
        { id: 'character', label: '🎭 Character', available: !!pack.characterOutput },
        { id: 'images', label: '🎨 Images', available: pack.imagePrompts?.length > 0 || !!pack.storyOutput },
        { id: 'video', label: '🎬 Video', available: pack.videoPrompts?.length > 0 || !!pack.storyOutput },
        { id: 'notes', label: '📋 Notes', available: true },
        { id: 'export', label: '💾 Export', available: true }
      ]

  const handleExportMD = () => {
    const md = buildMarkdownExport(pack)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-pack-${pack.id.slice(0, 8)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(pack, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-pack-${pack.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getContent = () => {
    switch (activeTab) {
      case 'code':
        return pack.codingOutput
          ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(67,217,173,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(67,217,173,0.15)' }}>
                <span style={{ fontSize: 16 }}>💻</span>
                <span style={{ fontSize: 11, color: '#43D9AD', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Coding Agent Report</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>Read-only · No files modified</span>
              </div>
              {renderMarkdown(pack.codingOutput)}
            </div>
          )
          : <div className="no-content"><p>No coding output available</p></div>

      case 'story':
        return pack.storyOutput
          ? renderMarkdown(pack.storyOutput)
          : <div className="no-content"><p>Story output not available</p></div>

      case 'character':
        return pack.characterOutput
          ? renderMarkdown(pack.characterOutput)
          : <div className="no-content"><p>Character output not available</p></div>

      case 'images':
        return pack.storyOutput
          ? renderMarkdown(pack.storyOutput.includes('Image Prompts') ? pack.storyOutput : MOCK_IMAGE_NOTE)
          : <div className="no-content"><p>No image prompts yet</p></div>

      case 'video':
        return pack.storyOutput
          ? renderMarkdown(MOCK_VIDEO_NOTE)
          : <div className="no-content"><p>No video prompts yet</p></div>

      case 'notes':
        return (
          <div>
            {pack.notes && renderMarkdown(pack.notes)}
            {pack.researchNotes && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Research Notes</div>
                {renderMarkdown(pack.researchNotes)}
              </div>
            )}
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Original Request</div>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ar)',
                  direction: 'rtl',
                  textAlign: 'right',
                  lineHeight: 1.8
                }}
              >
                {pack.request}
              </div>
            </div>
          </div>
        )

      case 'export':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Export your prompt pack to use with external tools.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ justifyContent: 'flex-start', gap: 10, padding: '12px 16px' }}
                onClick={handleExportMD}
              >
                <span style={{ fontSize: 18 }}>📝</span>
                <div style={{ textAlign: 'left' }}>
                  <div>Export as Markdown</div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Best for sharing and reading</div>
                </div>
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: 10, padding: '12px 16px' }}
                onClick={handleExportJSON}
              >
                <span style={{ fontSize: 18 }}>📦</span>
                <div style={{ textAlign: 'left' }}>
                  <div>Export as JSON</div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Best for developers and APIs</div>
                </div>
              </button>
            </div>
            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Pack Info</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Created: {new Date(pack.createdAt).toLocaleString()}</div>
                <div>ID: {pack.id.slice(0, 8)}</div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="output-preview" style={{ height: '100%' }}>
      <div className="output-tabs">
        {tabs.filter((t) => t.available).map((tab) => (
          <div
            key={tab.id}
            className={`output-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className="output-content">
        {getContent()}
      </div>
    </div>
  )
}

const MOCK_IMAGE_NOTE = `## Image Prompts

*Image prompts were generated as part of the story output above.*

See the story output for the complete image prompts for each scene.`

const MOCK_VIDEO_NOTE = `## Video Prompts

*Video prompts were generated as part of the story output above.*

See the story output for complete video prompts including camera movement, lighting, and timing specifications.`

function buildMarkdownExport(pack: PromptPack): string {
  const sections: string[] = [
    `# Prompt Pack — ${pack.title}`,
    `> Generated: ${new Date(pack.createdAt).toLocaleString()}`,
    `> Request: ${pack.request}`,
    '',
    '---',
    ''
  ]

  if (pack.notes) {
    sections.push('## Chief Agent — Task Plan', pack.notes, '')
  }
  if (pack.storyOutput) {
    sections.push('## Story Agent — Output', pack.storyOutput, '')
  }
  if (pack.characterOutput) {
    sections.push('## Character Agent — Output', pack.characterOutput, '')
  }
  if (pack.researchNotes) {
    sections.push('## Research Agent — Notes', pack.researchNotes, '')
  }

  return sections.join('\n')
}

export function OutputPreview(): React.ReactElement {
  const currentOutput = useAppStore((s) => s.currentOutput)

  if (!currentOutput) {
    return (
      <div className="output-preview" style={{ flex: 1 }}>
        <div className="output-empty">
          <div className="empty-icon">🎬</div>
          <p>Run a workflow to generate your first prompt pack</p>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            Try: "اعمل حلقة جديدة للأرنب Hopper"
          </div>
        </div>
      </div>
    )
  }

  return <PackView pack={currentOutput} />
}
