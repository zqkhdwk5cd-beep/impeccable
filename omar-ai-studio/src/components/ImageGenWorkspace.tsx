import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { comfyUIService } from '@/services/comfyui/ComfyUIService'
import { outputService } from '@/services/OutputService'
import { enhancePrompt } from '@/services/PromptEnhancer'
import { buildWorkflowForModel, WORKFLOW_PRESETS, PRESET_LABELS, SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from '@/services/comfyui/WorkflowTemplates'
import type { WorkflowPreset } from '@/services/comfyui/WorkflowTemplates'
import { FLUX_CHECKPOINTS } from '@/types/generation'
import type { GenerationJob } from '@/types/generation'
import { v4 as uuidv4 } from 'uuid'

export function ImageGenWorkspace() {
  const {
    comfyUIConnection,
    setComfyUIConnection,
    imageGenParams,
    setImageGenParams,
    selectedModelType,
    setSelectedModelType,
    selectedPreset,
    setSelectedPreset,
    generationJobs,
    addGenerationJob,
    updateGenerationJob,
    activeGenerationId,
    setActiveGenerationId,
    activeImageProjectId,
    updateImageProject,
    imageProjects
  } = useAppStore()

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [enhancing, setEnhancing] = useState(false)
  const [agentLog, setAgentLog] = useState<{ agent: string; msg: string }[]>([])

  const checkConnection = useCallback(async () => {
    setCheckingConnection(true)
    const connected = await comfyUIService.checkConnection()
    if (connected) {
      const [checkpoints, loras] = await Promise.all([
        comfyUIService.getCheckpointList(),
        comfyUIService.getLoraList()
      ])
      setComfyUIConnection({
        status: 'connected',
        checkpoints,
        loras,
        lastChecked: Date.now(),
        error: null
      })
    } else {
      setComfyUIConnection({
        status: 'disconnected',
        lastChecked: Date.now(),
        error: 'Cannot reach ComfyUI at http://127.0.0.1:8188'
      })
    }
    setCheckingConnection(false)
  }, [setComfyUIConnection])

  useEffect(() => {
    outputService.initialize()
    if (comfyUIConnection.status === 'unknown') {
      checkConnection()
    }
  }, [])

  const runEnhancement = async () => {
    if (!imageGenParams.prompt.trim()) return
    setEnhancing(true)
    setAgentLog([])

    // Chief Agent
    await new Promise<void>((r) => setTimeout(r, 300))
    const result = enhancePrompt(imageGenParams.prompt, imageGenParams.negativePrompt)
    setAgentLog([{ agent: 'Chief', msg: result.chiefNotes }])

    // Prompt Agent
    await new Promise<void>((r) => setTimeout(r, 400))
    setAgentLog((prev) => [...prev, { agent: 'Prompt', msg: `Enhanced: ${result.changes.join(' · ')}` }])

    setImageGenParams({ prompt: result.enhanced, negativePrompt: result.negativePrompt })

    // Apply suggested preset
    if (result.suggestedPreset) {
      const preset = result.suggestedPreset as WorkflowPreset
      setSelectedPreset(preset)
      setImageGenParams({ ...WORKFLOW_PRESETS[preset] })
    }

    setAgentLog((prev) => [...prev, { agent: 'Router', msg: `Preset set to "${result.suggestedPreset}". Ready for Image Agent.` }])
    setEnhancing(false)
  }

  const applyPreset = (preset: WorkflowPreset) => {
    const presetParams = WORKFLOW_PRESETS[preset]
    setSelectedPreset(preset)
    setImageGenParams(presetParams)
  }

  const startGeneration = async () => {
    if (comfyUIConnection.status !== 'connected') {
      alert('ComfyUI is not connected. Please start ComfyUI first.')
      return
    }
    if (!imageGenParams.prompt.trim()) {
      alert('Please enter a prompt first.')
      return
    }

    const jobId = uuidv4()
    const job: GenerationJob = {
      id: jobId,
      promptId: null,
      params: { ...imageGenParams },
      modelType: selectedModelType,
      preset: selectedPreset,
      status: 'pending',
      progress: 0,
      maxProgress: imageGenParams.steps,
      images: [],
      error: null,
      startedAt: Date.now(),
      completedAt: null
    }

    addGenerationJob(job)
    setActiveGenerationId(jobId)

    try {
      const workflow = buildWorkflowForModel(selectedModelType, imageGenParams)

      updateGenerationJob(jobId, { status: 'queued' })

      const images = await comfyUIService.generateWithProgress(workflow, (status) => {
        if (status.type === 'queued') {
          updateGenerationJob(jobId, { status: 'queued', promptId: status.promptId })
        } else if (status.type === 'progress') {
          updateGenerationJob(jobId, {
            status: 'generating',
            progress: status.value,
            maxProgress: status.max,
            promptId: status.promptId
          })
        } else if (status.type === 'completed') {
          updateGenerationJob(jobId, {
            status: 'completed',
            progress: imageGenParams.steps,
            images: status.images.map((img) => ({
              id: uuidv4(),
              url: img.url,
              filename: img.filename,
              metadata: null
            })),
            completedAt: Date.now()
          })
        } else if (status.type === 'error') {
          updateGenerationJob(jobId, {
            status: 'error',
            error: status.message,
            completedAt: Date.now()
          })
        }
      })

      if (images.length > 0) {
        setSelectedImage(images[0].url)
        outputService.saveGeneratedImage(images[0].url, imageGenParams)
        // Auto-add to active project
        if (activeImageProjectId) {
          const job = generationJobs.find((j) => j.id === jobId)
          const proj = imageProjects.find((p) => p.id === activeImageProjectId)
          if (proj && job) {
            const newIds = job.images.map((i) => i.id)
            updateImageProject(activeImageProjectId, {
              imageEntryIds: [...proj.imageEntryIds, ...newIds],
              coverImageUrl: proj.coverImageUrl || images[0].url,
              updatedAt: Date.now()
            })
          }
        }
      }
    } catch (err) {
      updateGenerationJob(jobId, {
        status: 'error',
        error: (err as Error).message,
        completedAt: Date.now()
      })
    }
  }

  const stopGeneration = async () => {
    await comfyUIService.interruptGeneration()
    if (activeGenerationId) {
      updateGenerationJob(activeGenerationId, { status: 'cancelled', completedAt: Date.now() })
      setActiveGenerationId(null)
    }
  }

  const activeJob = generationJobs.find((j) => j.id === activeGenerationId)
  const isGenerating = activeJob?.status === 'queued' || activeJob?.status === 'generating'
  const allImages = generationJobs.flatMap((j) => j.images)

  return (
    <div className="image-gen-workspace">
      {/* Connection Status Bar */}
      <div className={`connection-bar connection-bar--${comfyUIConnection.status}`}>
        <span className="connection-dot" />
        <span className="connection-label">
          {comfyUIConnection.status === 'connected' && `ComfyUI Connected · ${comfyUIConnection.checkpoints.length} models`}
          {comfyUIConnection.status === 'disconnected' && 'ComfyUI Disconnected'}
          {comfyUIConnection.status === 'unknown' && 'Checking ComfyUI...'}
          {comfyUIConnection.status === 'error' && 'ComfyUI Error'}
        </span>
        <button
          className="connection-refresh-btn"
          onClick={checkConnection}
          disabled={checkingConnection}
        >
          {checkingConnection ? '⟳' : 'Refresh'}
        </button>
        {comfyUIConnection.status === 'disconnected' && (
          <span className="connection-hint">Start ComfyUI: <code>python main.py</code></span>
        )}
      </div>

      <div className="image-gen-layout">
        {/* Left Panel — Controls */}
        <div className="image-gen-controls">

          {/* Model Selection */}
          <section className="gen-section">
            <h3 className="gen-section-title">Model</h3>
            <div className="model-cards">
              {(Object.keys(FLUX_CHECKPOINTS) as (keyof typeof FLUX_CHECKPOINTS)[]).map((key) => (
                <button
                  key={key}
                  className={`model-card ${selectedModelType === key ? 'model-card--active' : ''}`}
                  onClick={() => {
                    setSelectedModelType(key)
                    setImageGenParams({ checkpoint: FLUX_CHECKPOINTS[key].filename })
                  }}
                >
                  <span className="model-card-name">{FLUX_CHECKPOINTS[key].label}</span>
                  <span className="model-card-desc">{FLUX_CHECKPOINTS[key].description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Workflow Presets */}
          <section className="gen-section">
            <h3 className="gen-section-title">Preset</h3>
            <div className="preset-chips">
              {(Object.keys(PRESET_LABELS) as WorkflowPreset[]).map((preset) => (
                <button
                  key={preset}
                  className={`preset-chip ${selectedPreset === preset ? 'preset-chip--active' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  {PRESET_LABELS[preset].en}
                </button>
              ))}
            </div>
          </section>

          {/* Prompt + Enhance */}
          <section className="gen-section">
            <div className="gen-prompt-header">
              <h3 className="gen-section-title">Prompt</h3>
              <button
                className="gen-enhance-btn"
                onClick={runEnhancement}
                disabled={enhancing || !imageGenParams.prompt.trim()}
                title="Chief Agent analyzes and enhances your prompt for Flux"
              >
                {enhancing ? '⟳ Enhancing...' : '✦ Enhance'}
              </button>
            </div>
            <textarea
              className="gen-textarea"
              placeholder="Describe what you want to generate..."
              value={imageGenParams.prompt}
              onChange={(e) => setImageGenParams({ prompt: e.target.value })}
              rows={4}
            />
            {/* Agent pipeline log */}
            {agentLog.length > 0 && (
              <div className="gen-agent-log">
                {agentLog.map((entry, i) => (
                  <div key={i} className="gen-agent-log-entry">
                    <span className="gen-agent-log-badge">{entry.agent}</span>
                    <span className="gen-agent-log-msg">{entry.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Negative Prompt */}
          <section className="gen-section">
            <h3 className="gen-section-title">Negative Prompt</h3>
            <textarea
              className="gen-textarea gen-textarea--negative"
              placeholder="What to avoid (bad quality, blurry, distorted...)"
              value={imageGenParams.negativePrompt}
              onChange={(e) => setImageGenParams({ negativePrompt: e.target.value })}
              rows={2}
            />
          </section>

          {/* Dimensions */}
          <section className="gen-section">
            <h3 className="gen-section-title">Dimensions</h3>
            <div className="gen-row">
              <label className="gen-label">
                Width
                <select
                  className="gen-select"
                  value={imageGenParams.width}
                  onChange={(e) => setImageGenParams({ width: Number(e.target.value) })}
                >
                  {[512, 768, 832, 1024, 1152, 1216, 1280, 1344].map((v) => (
                    <option key={v} value={v}>{v}px</option>
                  ))}
                </select>
              </label>
              <label className="gen-label">
                Height
                <select
                  className="gen-select"
                  value={imageGenParams.height}
                  onChange={(e) => setImageGenParams({ height: Number(e.target.value) })}
                >
                  {[512, 768, 832, 1024, 1152, 1216, 1280, 1344].map((v) => (
                    <option key={v} value={v}>{v}px</option>
                  ))}
                </select>
              </label>
              <label className="gen-label">
                Batch
                <select
                  className="gen-select"
                  value={imageGenParams.batchSize}
                  onChange={(e) => setImageGenParams({ batchSize: Number(e.target.value) })}
                >
                  {[1, 2, 4].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Advanced Settings (collapsible) */}
          <section className="gen-section">
            <button
              className="gen-advanced-toggle"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <span>{advancedOpen ? '▾' : '▸'} Advanced Settings</span>
            </button>
            {advancedOpen && (
              <div className="gen-advanced">
                <div className="gen-row">
                  <label className="gen-label">
                    Steps
                    <div className="gen-slider-row">
                      <input
                        type="range" min="1" max="50"
                        value={imageGenParams.steps}
                        onChange={(e) => setImageGenParams({ steps: Number(e.target.value) })}
                      />
                      <span className="gen-value">{imageGenParams.steps}</span>
                    </div>
                  </label>
                  <label className="gen-label">
                    CFG Scale
                    <div className="gen-slider-row">
                      <input
                        type="range" min="1" max="20" step="0.5"
                        value={imageGenParams.cfg}
                        onChange={(e) => setImageGenParams({ cfg: Number(e.target.value) })}
                      />
                      <span className="gen-value">{imageGenParams.cfg}</span>
                    </div>
                  </label>
                </div>
                <div className="gen-row">
                  <label className="gen-label">
                    Seed
                    <div className="gen-seed-row">
                      <input
                        type="number" min="-1"
                        className="gen-input"
                        value={imageGenParams.seed}
                        onChange={(e) => setImageGenParams({ seed: Number(e.target.value) })}
                      />
                      <button
                        className="gen-btn-icon"
                        onClick={() => setImageGenParams({ seed: Math.floor(Math.random() * 2 ** 32) })}
                        title="Random seed"
                      >🎲</button>
                    </div>
                    <span className="gen-hint">-1 = random</span>
                  </label>
                </div>
                <div className="gen-row">
                  <label className="gen-label">
                    Sampler
                    <select
                      className="gen-select"
                      value={imageGenParams.sampler}
                      onChange={(e) => setImageGenParams({ sampler: e.target.value })}
                    >
                      {SAMPLER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="gen-label">
                    Scheduler
                    <select
                      className="gen-select"
                      value={imageGenParams.scheduler}
                      onChange={(e) => setImageGenParams({ scheduler: e.target.value })}
                    >
                      {SCHEDULER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>

                {/* LoRA */}
                {comfyUIConnection.loras.length > 0 && (
                  <div className="gen-row">
                    <label className="gen-label">
                      LoRA
                      <select
                        className="gen-select"
                        value={imageGenParams.lora?.name || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setImageGenParams({ lora: { name: e.target.value, strength: 0.8 } })
                          } else {
                            setImageGenParams({ lora: undefined })
                          }
                        }}
                      >
                        <option value="">None</option>
                        {comfyUIConnection.loras.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </label>
                    {imageGenParams.lora && (
                      <label className="gen-label">
                        Strength
                        <div className="gen-slider-row">
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={imageGenParams.lora.strength}
                            onChange={(e) => setImageGenParams({
                              lora: { ...imageGenParams.lora!, strength: Number(e.target.value) }
                            })}
                          />
                          <span className="gen-value">{imageGenParams.lora.strength}</span>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Generate / Stop Buttons */}
          <div className="gen-actions">
            {!isGenerating ? (
              <button
                className="gen-btn gen-btn--primary"
                onClick={startGeneration}
                disabled={comfyUIConnection.status !== 'connected' || !imageGenParams.prompt.trim()}
              >
                ✦ Generate
              </button>
            ) : (
              <button className="gen-btn gen-btn--stop" onClick={stopGeneration}>
                ⬛ Stop
              </button>
            )}
            <button
              className="gen-btn gen-btn--secondary"
              onClick={() => setImageGenParams({ seed: -1, prompt: '', negativePrompt: '' })}
              disabled={isGenerating}
            >
              Clear
            </button>
          </div>

          {/* Active Job Progress */}
          {activeJob && (activeJob.status === 'queued' || activeJob.status === 'generating') && (
            <div className="gen-progress-card">
              <div className="gen-progress-header">
                <span>{activeJob.status === 'queued' ? 'In Queue...' : `Generating · step ${activeJob.progress}/${activeJob.maxProgress}`}</span>
                <span className="gen-progress-pct">
                  {activeJob.maxProgress > 0
                    ? `${Math.round((activeJob.progress / activeJob.maxProgress) * 100)}%`
                    : '...'}
                </span>
              </div>
              <div className="gen-progress-bar">
                <div
                  className="gen-progress-fill"
                  style={{
                    width: activeJob.maxProgress > 0
                      ? `${(activeJob.progress / activeJob.maxProgress) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Image Output */}
        <div className="image-gen-output">
          {/* Main Image Display */}
          <div className="image-gen-canvas">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Generated"
                className="gen-output-img"
                onError={() => setSelectedImage(null)}
              />
            ) : (
              <div className="gen-canvas-empty">
                {isGenerating ? (
                  <div className="gen-canvas-loading">
                    <div className="gen-spinner" />
                    <span>Generating image...</span>
                  </div>
                ) : (
                  <div className="gen-canvas-placeholder">
                    <span className="gen-canvas-icon">✦</span>
                    <span>Your generated images will appear here</span>
                    {comfyUIConnection.status === 'disconnected' && (
                      <span className="gen-canvas-warning">Start ComfyUI to generate images</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image History Grid */}
          {allImages.length > 0 && (
            <div className="gen-history-grid">
              {allImages.slice(0, 12).map((img) => (
                <button
                  key={img.id}
                  className={`gen-history-thumb ${selectedImage === img.url ? 'gen-history-thumb--active' : ''}`}
                  onClick={() => setSelectedImage(img.url)}
                >
                  <img src={img.url} alt="" className="gen-thumb-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </button>
              ))}
            </div>
          )}

          {/* Active project badge */}
          {activeImageProjectId && (() => {
            const proj = imageProjects.find((p) => p.id === activeImageProjectId)
            return proj ? (
              <div className="gen-active-project">
                <span className="gen-active-project-dot" />
                <span>Saving to: <strong>{proj.name}</strong></span>
              </div>
            ) : null
          })()}

          {/* Job History */}
          {generationJobs.length > 0 && (
            <div className="gen-job-list">
              {generationJobs.slice(0, 5).map((job) => (
                <div key={job.id} className={`gen-job-item gen-job-item--${job.status}`}>
                  <span className="gen-job-status-dot" />
                  <span className="gen-job-info">
                    {job.params.prompt.slice(0, 40)}{job.params.prompt.length > 40 ? '...' : ''}
                  </span>
                  <span className="gen-job-meta">
                    {job.status === 'completed' && `${job.images.length} image${job.images.length !== 1 ? 's' : ''}`}
                    {job.status === 'error' && 'Failed'}
                    {job.status === 'generating' && `${job.progress}/${job.maxProgress}`}
                    {job.status === 'queued' && 'Queued'}
                    {job.status === 'cancelled' && 'Cancelled'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
