import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '@/store/appStore'
import type { ImageProject } from '@/types/imageProject'

export function ImageProjectsView() {
  const {
    imageProjects,
    addImageProject,
    updateImageProject,
    deleteImageProject,
    generationJobs,
    setImageGenView,
    setActiveImageProjectId,
    activeImageProjectId
  } = useAppStore()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const allImages = generationJobs.flatMap((j) => j.images)

  const handleCreate = () => {
    if (!newName.trim()) return
    const project: ImageProject = {
      id: uuidv4(),
      name: newName.trim(),
      description: newDesc.trim(),
      coverImageUrl: null,
      imageEntryIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: []
    }
    addImageProject(project)
    setNewName('')
    setNewDesc('')
    setCreating(false)
  }

  const startEdit = (p: ImageProject) => {
    setEditingId(p.id)
    setEditName(p.name)
    setEditDesc(p.description)
  }

  const saveEdit = () => {
    if (!editingId) return
    updateImageProject(editingId, {
      name: editName.trim(),
      description: editDesc.trim(),
      updatedAt: Date.now()
    })
    setEditingId(null)
  }

  const getProjectImages = (project: ImageProject) => {
    return allImages.filter((img) => project.imageEntryIds.includes(img.id))
  }

  return (
    <div className="img-projects">
      <div className="img-projects-header">
        <div>
          <h2 className="img-projects-title">Image Projects</h2>
          <p className="img-projects-subtitle">Organize your generated images into projects</p>
        </div>
        <button
          className="img-projects-new-btn"
          onClick={() => setCreating(true)}
        >
          + New Project
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="img-project-form">
          <h3 className="img-project-form-title">New Project</h3>
          <input
            className="img-project-input"
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            autoFocus
          />
          <textarea
            className="img-project-textarea"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
          />
          <div className="img-project-form-actions">
            <button className="img-project-btn img-project-btn--primary" onClick={handleCreate}>Create</button>
            <button className="img-project-btn img-project-btn--secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Project list */}
      {imageProjects.length === 0 && !creating ? (
        <div className="img-projects-empty">
          <span className="img-projects-empty-icon">🗂️</span>
          <p>No projects yet. Create one to start organizing your generated images.</p>
          <button className="img-project-btn img-project-btn--primary" onClick={() => setCreating(true)}>
            Create First Project
          </button>
        </div>
      ) : (
        <div className="img-projects-grid">
          {imageProjects.map((project) => {
            const imgs = getProjectImages(project)
            const isActive = activeImageProjectId === project.id
            const isEditing = editingId === project.id

            return (
              <div
                key={project.id}
                className={`img-project-card ${isActive ? 'img-project-card--active' : ''}`}
              >
                {/* Cover / image strip */}
                <div className="img-project-cover">
                  {imgs.length > 0 ? (
                    <div className="img-project-thumb-row">
                      {imgs.slice(0, 3).map((img) => (
                        <img key={img.id} src={img.url} alt="" className="img-project-thumb"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ))}
                    </div>
                  ) : (
                    <div className="img-project-cover-empty">
                      <span>🖼️</span>
                      <span>No images yet</span>
                    </div>
                  )}
                  <div className="img-project-count">{imgs.length} image{imgs.length !== 1 ? 's' : ''}</div>
                </div>

                {/* Info */}
                {isEditing ? (
                  <div className="img-project-edit">
                    <input
                      className="img-project-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                    />
                    <textarea
                      className="img-project-textarea"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                    />
                    <div className="img-project-form-actions">
                      <button className="img-project-btn img-project-btn--primary" onClick={saveEdit}>Save</button>
                      <button className="img-project-btn img-project-btn--secondary" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="img-project-info">
                    <div className="img-project-name">{project.name}</div>
                    {project.description && (
                      <div className="img-project-desc">{project.description}</div>
                    )}
                    <div className="img-project-date">
                      {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="img-project-actions">
                      <button
                        className={`img-project-action-btn ${isActive ? 'img-project-action-btn--active' : ''}`}
                        onClick={() => {
                          setActiveImageProjectId(isActive ? null : project.id)
                          setImageGenView('generate')
                        }}
                        title={isActive ? 'Stop saving to this project' : 'Save new images to this project'}
                      >
                        {isActive ? '✓ Active' : 'Set Active'}
                      </button>
                      <button className="img-project-icon-btn" onClick={() => startEdit(project)} title="Edit">✎</button>
                      <button
                        className="img-project-icon-btn img-project-icon-btn--danger"
                        onClick={() => { if (confirm(`Delete "${project.name}"?`)) deleteImageProject(project.id) }}
                        title="Delete"
                      >✕</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Generation history */}
      {allImages.length > 0 && (
        <div className="img-history-section">
          <h3 className="img-history-title">All Generated Images</h3>
          <div className="img-history-grid">
            {allImages.map((img) => (
              <div key={img.id} className="img-history-item">
                <img
                  src={img.url}
                  alt=""
                  className="img-history-img"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="img-history-overlay">
                  <span className="img-history-filename">{img.filename}</span>
                  {activeImageProjectId && (
                    <button
                      className="img-history-add-btn"
                      onClick={() => {
                        const proj = imageProjects.find((p) => p.id === activeImageProjectId)
                        if (proj && !proj.imageEntryIds.includes(img.id)) {
                          updateImageProject(activeImageProjectId, {
                            imageEntryIds: [...proj.imageEntryIds, img.id],
                            coverImageUrl: proj.coverImageUrl || img.url,
                            updatedAt: Date.now()
                          })
                        }
                      }}
                    >
                      + Add to Project
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
