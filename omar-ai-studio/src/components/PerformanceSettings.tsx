import { useAppStore } from '@/store/appStore'

export type PerformanceMode = 'low-memory' | 'balanced' | 'high-quality'

interface ModeCard {
  id: PerformanceMode
  label: string
  icon: string
  description: string
  ramRequirement: string
  defaultSteps: number
  defaultCfg: number
  defaultWidth: number
  defaultHeight: number
  comfyFlag: string
  bestFor: string
}

const MODES: ModeCard[] = [
  {
    id: 'low-memory',
    label: 'Low Memory',
    icon: '🔋',
    description: 'Minimizes RAM usage. Slower generation but works on 8GB unified memory.',
    ramRequirement: '8 GB+',
    defaultSteps: 20,
    defaultCfg: 3.0,
    defaultWidth: 768,
    defaultHeight: 768,
    comfyFlag: '--lowvram --cpu-vae',
    bestFor: 'M1 8GB / M2 8GB'
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: '⚖️',
    description: 'Good quality with reasonable speed. Recommended starting point for most Apple Silicon Macs.',
    ramRequirement: '16 GB+',
    defaultSteps: 28,
    defaultCfg: 3.5,
    defaultWidth: 1024,
    defaultHeight: 1024,
    comfyFlag: '--listen',
    bestFor: 'M1 Pro / M2 / M2 Pro'
  },
  {
    id: 'high-quality',
    label: 'High Quality',
    icon: '💎',
    description: 'Maximum resolution and steps. Full-precision generation for the best possible output.',
    ramRequirement: '32 GB+',
    defaultSteps: 35,
    defaultCfg: 4.0,
    defaultWidth: 1216,
    defaultHeight: 832,
    comfyFlag: '--listen --highvram',
    bestFor: 'M1 Max / M2 Max / M3 Pro+'
  }
]

export function PerformanceSettings() {
  const { selectedPerformanceMode, setPerformanceMode, setImageGenParams } = useAppStore()

  const applyMode = (mode: ModeCard) => {
    setPerformanceMode(mode.id)
    setImageGenParams({
      steps: mode.defaultSteps,
      cfg: mode.defaultCfg,
      width: mode.defaultWidth,
      height: mode.defaultHeight
    })
  }

  return (
    <div className="perf-settings">
      <div className="perf-settings-header">
        <h2 className="perf-settings-title">Performance Mode</h2>
        <p className="perf-settings-subtitle">
          Choose based on your Mac's unified memory. Applies default generation parameters.
        </p>
      </div>

      <div className="perf-mode-cards">
        {MODES.map((mode) => {
          const isActive = selectedPerformanceMode === mode.id
          return (
            <div
              key={mode.id}
              className={`perf-mode-card ${isActive ? 'perf-mode-card--active' : ''}`}
              onClick={() => applyMode(mode)}
            >
              <div className="perf-mode-top">
                <span className="perf-mode-icon">{mode.icon}</span>
                <div>
                  <div className="perf-mode-label">{mode.label}</div>
                  <div className="perf-mode-ram">{mode.ramRequirement}</div>
                </div>
                {isActive && <span className="perf-mode-active-badge">Active</span>}
              </div>

              <p className="perf-mode-desc">{mode.description}</p>

              <div className="perf-mode-specs">
                <div className="perf-spec">
                  <span className="perf-spec-label">Default steps</span>
                  <span className="perf-spec-value">{mode.defaultSteps}</span>
                </div>
                <div className="perf-spec">
                  <span className="perf-spec-label">Resolution</span>
                  <span className="perf-spec-value">{mode.defaultWidth}×{mode.defaultHeight}</span>
                </div>
                <div className="perf-spec">
                  <span className="perf-spec-label">CFG Scale</span>
                  <span className="perf-spec-value">{mode.defaultCfg}</span>
                </div>
              </div>

              <div className="perf-mode-best">
                Best for: <strong>{mode.bestFor}</strong>
              </div>
            </div>
          )
        })}
      </div>

      {/* ComfyUI launch command */}
      <div className="perf-comfy-launch">
        <div className="perf-comfy-launch-header">
          <h3>ComfyUI Launch Command</h3>
          <p>Restart ComfyUI with this flag for the selected mode</p>
        </div>
        {MODES.filter((m) => m.id === (selectedPerformanceMode || 'balanced')).map((mode) => (
          <div key={mode.id} className="perf-comfy-cmd">
            <code>python main.py {mode.comfyFlag}</code>
            <button
              className="perf-copy-btn"
              onClick={() => navigator.clipboard.writeText(`python main.py ${mode.comfyFlag}`)}
            >
              Copy
            </button>
          </div>
        ))}
      </div>

      {/* Apple Silicon Tips */}
      <div className="perf-tips">
        <h3 className="perf-tips-title">Apple Silicon Tips</h3>
        <ul className="perf-tips-list">
          <li>Close other GPU-intensive apps (Final Cut, games, Blender) before generating</li>
          <li>Flux Dev FP8 uses ~30% less memory than full precision with near-identical quality</li>
          <li>Flux Schnell (4 steps) is 6–8× faster — use it for prompt testing</li>
          <li>Batch size of 1 is most memory-efficient on Apple Silicon</li>
          <li>Activity Monitor → Memory Pressure should be green before generating</li>
        </ul>
      </div>
    </div>
  )
}
