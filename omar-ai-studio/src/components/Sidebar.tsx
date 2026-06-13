import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import type { SidebarView } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import { v4 as uuidv4 } from 'uuid'

export function Sidebar(): React.ReactElement {
  const {
    activeView,
    setActiveView,
    projects,
    currentProjectId,
    setCurrentProject,
    addProject
  } = useAppStore()
  const { t, isAr } = useTranslation()

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const NAV_ITEMS: { view: SidebarView; icon: string; label: string }[] = [
    { view: 'workspace', icon: '⚡', label: t.workspace },
    { view: 'memory',    icon: '🧠', label: t.memory },
    { view: 'packs',     icon: '📦', label: t.promptPacks },
    { view: 'agents',    icon: '🤖', label: t.agents },
    { view: 'settings',  icon: '⚙️', label: t.settings }
  ]

  const handleNewProject = () => {
    if (!newProjectName.trim()) return
    const project = {
      id: uuidv4(),
      name: newProjectName.trim(),
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active' as const,
      tags: [],
      promptPackIds: []
    }
    addProject(project)
    setCurrentProject(project.id)
    setNewProjectName('')
    setShowNewProject(false)
  }

  return (
    <div className="sidebar" dir={isAr ? 'rtl' : 'ltr'}>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.view}
            className={`sidebar-nav-item ${activeView === item.view ? 'active' : ''}`}
            onClick={() => setActiveView(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span style={{ fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </nav>

      <div className="divider" />

      <div
        className="sidebar-section-title"
        style={{ fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}
      >
        {t.projects}
      </div>

      <div className="sidebar-projects">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`project-item ${currentProjectId === project.id ? 'active' : ''}`}
            onClick={() => setCurrentProject(project.id)}
          >
            <div className="project-item-name">{project.name}</div>
            {project.description && (
              <div className="project-item-desc">{project.description.substring(0, 50)}</div>
            )}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        {showNewProject ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewProject()
                if (e.key === 'Escape') { setShowNewProject(false); setNewProjectName('') }
              }}
              placeholder={t.projectName}
              autoFocus
              dir={isAr ? 'rtl' : 'ltr'}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                width: '100%',
                fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)'
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
                onClick={handleNewProject}
              >
                {t.create}
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: '5px 8px' }}
                onClick={() => { setShowNewProject(false); setNewProjectName('') }}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button className="new-project-btn" onClick={() => setShowNewProject(true)}>
            {t.newProject}
          </button>
        )}
      </div>
    </div>
  )
}
