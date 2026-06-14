import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import type { StudioView, CodingView, ImageGenView } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import { v4 as uuidv4 } from 'uuid'

export function Sidebar(): React.ReactElement {
  const {
    activeSection,
    studioView,
    setStudioView,
    codingView,
    setCodingView,
    imageGenView,
    setImageGenView,
    projects,
    currentProjectId,
    setCurrentProject,
    addProject
  } = useAppStore()
  const { t, isAr } = useTranslation()

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const STUDIO_NAV: { view: StudioView; icon: string; label: string }[] = [
    { view: 'overview',   icon: '⚡', label: t.overview || 'Overview' },
    { view: 'chief',      icon: '🎖️', label: isAr ? 'العميل الرئيسي' : 'Chief' },
    { view: 'story',      icon: '📖', label: isAr ? 'عميل القصص' : 'Story' },
    { view: 'character',  icon: '🎭', label: isAr ? 'عميل الشخصيات' : 'Character' },
    { view: 'image',      icon: '🎨', label: isAr ? 'عميل الصور' : 'Image' },
    { view: 'video',      icon: '🎬', label: isAr ? 'عميل الفيديو' : 'Video' },
    { view: 'research',   icon: '🔍', label: isAr ? 'عميل البحث' : 'Research' },
    { view: 'memory',     icon: '🧠', label: isAr ? 'عميل الذاكرة' : 'Memory' }
  ]

  const CODING_NAV: { view: CodingView; icon: string; label: string }[] = [
    { view: 'lab',         icon: '💻', label: isAr ? 'المختبر' : 'Lab' },
    { view: 'new-project', icon: '✨', label: t.newProject || 'New Project' },
    { view: 'skills',      icon: '🎯', label: t.skillsTitle || 'Skills' },
    { view: 'history',     icon: '📋', label: t.projectHistory || 'History' }
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

  const IMAGE_GEN_NAV: { view: ImageGenView; icon: string; label: string }[] = [
    { view: 'generate',   icon: '✦',  label: isAr ? 'توليد' : 'Generate' },
    { view: 'workflows',  icon: '📚', label: isAr ? 'المكتبة' : 'Workflows' },
    { view: 'projects',   icon: '🗂️', label: isAr ? 'المشاريع' : 'Projects' },
    { view: 'hardware',   icon: '🖥️', label: isAr ? 'الجهاز' : 'Hardware' },
    { view: 'settings',   icon: '⚙️', label: isAr ? 'الأداء' : 'Performance' }
  ]

  const isStudio = activeSection === 'studio'
  const isImageGen = activeSection === 'image-gen'
  const navItems = isStudio ? STUDIO_NAV : isImageGen ? IMAGE_GEN_NAV : CODING_NAV
  const activeView = isStudio ? studioView : isImageGen ? imageGenView : codingView
  const setView = isStudio
    ? (v: string) => setStudioView(v as StudioView)
    : isImageGen
      ? (v: string) => setImageGenView(v as ImageGenView)
      : (v: string) => setCodingView(v as CodingView)

  return (
    <div className="sidebar" dir={isAr ? 'rtl' : 'ltr'}>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.view}
            className={`sidebar-nav-item ${activeView === item.view ? 'active' : ''}`}
            onClick={() => setView(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span style={{ fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-ui)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </nav>

      <div className="divider" />

      {/* Projects section — only in Studio mode */}
      {!isStudio && !isImageGen && <div />}
      {isStudio && (
        <>
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
        </>
      )}
    </div>
  )
}
