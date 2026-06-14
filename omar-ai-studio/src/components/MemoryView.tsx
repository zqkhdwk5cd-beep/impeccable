import React from 'react'
import { useAppStore } from '@/store/appStore'
import type { MemoryItem } from '@/types/project'

const TYPE_COLORS: Record<string, string> = {
  'character-bible': '#FFB347',
  'style-guide':     '#7C6FF7',
  'prompt-pack':     '#00D2C8',
  'note':            '#55EFC4',
  'reference':       '#74B9FF'
}

const TYPE_ICONS: Record<string, string> = {
  'character-bible': '🎭',
  'style-guide':     '🎨',
  'prompt-pack':     '📦',
  'note':            '📝',
  'reference':       '📚'
}

function MemoryCard({ item }: { item: MemoryItem }): React.ReactElement {
  const { deleteMemoryItem } = useAppStore()
  const color = TYPE_COLORS[item.type] || '#7C6FF7'
  const icon = TYPE_ICONS[item.type] || '📝'

  return (
    <div className="memory-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="memory-card-type" style={{ color }}>
            {item.type.replace(/-/g, ' ')}
          </div>
        </div>
        <button
          onClick={() => deleteMemoryItem(item.id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
            lineHeight: 1,
            opacity: 0.5
          }}
          title="Delete memory item"
        >
          ×
        </button>
      </div>

      <div className="memory-card-title">{item.title}</div>
      <div className="memory-card-content">
        {item.content.substring(0, 120)}
        {item.content.length > 120 && '...'}
      </div>

      {item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {item.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
        {new Date(item.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}

export function MemoryView(): React.ReactElement {
  const memoryItems = useAppStore((s) => s.memoryItems)
  const currentProjectId = useAppStore((s) => s.currentProjectId)

  const projectItems = currentProjectId
    ? memoryItems.filter((m) => m.projectId === currentProjectId || m.projectId === null)
    : memoryItems

  const grouped = projectItems.reduce<Record<string, MemoryItem[]>>((acc, item) => {
    const key = item.type
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (projectItems.length === 0) {
    return (
      <div className="memory-view">
        <div className="no-content">
          <div className="no-content-icon">🧠</div>
          <p>No memory items yet. Run a workflow and the Memory Agent will store your project data here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="memory-view">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Memory ({projectItems.length} items)
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Character bibles, style guides, and project memory
        </div>
      </div>

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--text-muted)',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {TYPE_ICONS[type]} {type.replace(/-/g, ' ')} ({items.length})
          </div>
          <div className="memory-grid">
            {items.map((item) => (
              <MemoryCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
