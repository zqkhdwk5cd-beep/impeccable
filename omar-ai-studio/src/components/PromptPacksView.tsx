import React from 'react'
import { useAppStore } from '@/store/appStore'
import type { PromptPack } from '@/types/promptPack'

function PackCard({ pack }: { pack: PromptPack }): React.ReactElement {
  const { setCurrentOutput, setActiveView } = useAppStore()

  const handleView = () => {
    setCurrentOutput(pack)
    setActiveView('workspace')
  }

  const handleExport = () => {
    const md = buildMarkdown(pack)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-pack-${pack.id.slice(0, 8)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="pack-card">
      <div className="pack-card-title">{pack.title}</div>

      <div className="pack-card-request">{pack.request}</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {pack.storyOutput && <span className="tag">📖 Story</span>}
        {pack.characterOutput && <span className="tag">🎭 Character</span>}
        {pack.imagePrompts?.length > 0 && <span className="tag">🎨 Images</span>}
        {pack.videoPrompts?.length > 0 && <span className="tag">🎬 Video</span>}
      </div>

      <div className="pack-card-meta">
        <span>{new Date(pack.createdAt).toLocaleString()}</span>
        <span>·</span>
        <span>{pack.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontSize: 11, padding: '5px 10px' }} onClick={handleView}>
          View Output
        </button>
        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={handleExport}>
          Export MD
        </button>
      </div>
    </div>
  )
}

function buildMarkdown(pack: PromptPack): string {
  const lines = [
    `# ${pack.title}`,
    `> ${new Date(pack.createdAt).toLocaleString()}`,
    `> Request: ${pack.request}`,
    ''
  ]
  if (pack.notes) lines.push('## Plan', pack.notes, '')
  if (pack.storyOutput) lines.push('## Story', pack.storyOutput, '')
  if (pack.characterOutput) lines.push('## Character Bible', pack.characterOutput, '')
  if (pack.researchNotes) lines.push('## Research', pack.researchNotes, '')
  return lines.join('\n')
}

export function PromptPacksView(): React.ReactElement {
  const promptPacks = useAppStore((s) => s.promptPacks)

  if (promptPacks.length === 0) {
    return (
      <div className="packs-view">
        <div className="no-content" style={{ marginTop: 40 }}>
          <div className="no-content-icon">📦</div>
          <p>No prompt packs yet. Run a workflow to generate your first pack.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="packs-view">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Prompt Packs ({promptPacks.length})
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Generated prompt packs ready for Flux, Kling, Runway, and other tools
        </div>
      </div>

      {[...promptPacks].reverse().map((pack) => (
        <PackCard key={pack.id} pack={pack} />
      ))}
    </div>
  )
}
