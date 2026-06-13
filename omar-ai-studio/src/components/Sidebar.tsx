import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import type { SidebarView } from '@/store/appStore'
import { v4 as uuidv4 } from 'uuid'

interface NavItem {
  view: SidebarView
  icon: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { view: 'workspace', icon: '⚡', label: 'Workspace' },
  { view: 'memory', icon: '🧠', label: 'Memory' },
  { view: 'packs', icon: '📦', label: 'Prompt Packs' },
  { view: 'agents', icon: '🤖', label: 'Agents' },
  { view: 'settings', icon: '⚙️', label: 'Settings' }
]

export function Sidebar(): React.ReactElement {
  const {
    activeView,
    setActiveView,
    projects,
    currentProjectId,
    setCurrentProject,
    addProject
  } = useAppStore()

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

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
    <div className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.view}
            className={`sidebar-nav-item ${activeView === item.view ? 'active' : ''}`}
            onClick={() => setActiveView(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="divider" />

      <div className="sidebar-section-title">Projects</div>

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
                if (e.key === 'Escape') {
                  setShowNewProject(false)
                  setNewProjectName('')
                }
              }}
              placeholder="Project name..."
              autoFocus
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                width: '100%'
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
                onClick={handleNewProject}
              >
                Create
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: '5px 8px' }}
                onClick={() => {
                  setShowNewProject(false)
                  setNewProjectName('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="new-project-btn" onClick={() => setShowNewProject(true)}>
            + New Project
          </button>
        )}
      </div>
    </div>
  )
}
