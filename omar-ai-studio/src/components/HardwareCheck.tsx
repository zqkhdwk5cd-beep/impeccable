import { useState, useEffect } from 'react'
import type { HardwareInfo } from '@/types/electron'

// ─── Apple Silicon performance database ──────────────────────────────────────
// Estimates based on community benchmarks for Flux Dev 1024×1024, 28 steps
// ComfyUI with MPS backend (Apple Silicon GPU acceleration)

interface ChipProfile {
  label: string
  gpuCores: number
  unifiedMemoryMax: number   // GB
  fluxDevSeconds: number     // 28-step 1024×1024 median
  fluxSchnellSeconds: number // 4-step 1024×1024 median
  minRamForDev: number       // GB
  minRamForSchnell: number   // GB
  tier: 'entry' | 'mid' | 'pro' | 'max' | 'ultra'
}

const CHIP_DATABASE: Record<string, ChipProfile> = {
  'Apple M1': {
    label: 'M1', gpuCores: 8, unifiedMemoryMax: 16,
    fluxDevSeconds: 75, fluxSchnellSeconds: 11,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'entry'
  },
  'Apple M1 Pro': {
    label: 'M1 Pro', gpuCores: 16, unifiedMemoryMax: 32,
    fluxDevSeconds: 45, fluxSchnellSeconds: 7,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'pro'
  },
  'Apple M1 Max': {
    label: 'M1 Max', gpuCores: 32, unifiedMemoryMax: 64,
    fluxDevSeconds: 28, fluxSchnellSeconds: 5,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'max'
  },
  'Apple M1 Ultra': {
    label: 'M1 Ultra', gpuCores: 64, unifiedMemoryMax: 128,
    fluxDevSeconds: 18, fluxSchnellSeconds: 3,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'ultra'
  },
  'Apple M2': {
    label: 'M2', gpuCores: 10, unifiedMemoryMax: 24,
    fluxDevSeconds: 60, fluxSchnellSeconds: 9,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'entry'
  },
  'Apple M2 Pro': {
    label: 'M2 Pro', gpuCores: 19, unifiedMemoryMax: 32,
    fluxDevSeconds: 38, fluxSchnellSeconds: 6,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'pro'
  },
  'Apple M2 Max': {
    label: 'M2 Max', gpuCores: 38, unifiedMemoryMax: 96,
    fluxDevSeconds: 22, fluxSchnellSeconds: 4,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'max'
  },
  'Apple M2 Ultra': {
    label: 'M2 Ultra', gpuCores: 76, unifiedMemoryMax: 192,
    fluxDevSeconds: 14, fluxSchnellSeconds: 2,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'ultra'
  },
  'Apple M3': {
    label: 'M3', gpuCores: 10, unifiedMemoryMax: 24,
    fluxDevSeconds: 50, fluxSchnellSeconds: 8,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'entry'
  },
  'Apple M3 Pro': {
    label: 'M3 Pro', gpuCores: 18, unifiedMemoryMax: 36,
    fluxDevSeconds: 30, fluxSchnellSeconds: 5,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'pro'
  },
  'Apple M3 Max': {
    label: 'M3 Max', gpuCores: 40, unifiedMemoryMax: 128,
    fluxDevSeconds: 18, fluxSchnellSeconds: 3,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'max'
  },
  'Apple M4': {
    label: 'M4', gpuCores: 10, unifiedMemoryMax: 32,
    fluxDevSeconds: 40, fluxSchnellSeconds: 6,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'entry'
  },
  'Apple M4 Pro': {
    label: 'M4 Pro', gpuCores: 20, unifiedMemoryMax: 64,
    fluxDevSeconds: 22, fluxSchnellSeconds: 4,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'pro'
  },
  'Apple M4 Max': {
    label: 'M4 Max', gpuCores: 40, unifiedMemoryMax: 128,
    fluxDevSeconds: 13, fluxSchnellSeconds: 2,
    minRamForDev: 16, minRamForSchnell: 8, tier: 'max'
  }
}

function matchChip(appleSiliconModel: string | null): ChipProfile | null {
  if (!appleSiliconModel) return null
  // Exact match first
  if (CHIP_DATABASE[appleSiliconModel]) return CHIP_DATABASE[appleSiliconModel]
  // Partial match — find the best fitting key
  const keys = Object.keys(CHIP_DATABASE)
  for (const key of keys) {
    if (appleSiliconModel.includes(key.replace('Apple ', ''))) {
      return CHIP_DATABASE[key]
    }
  }
  return null
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / (1024 ** 2)).toFixed(0)} MB`
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `~${m}m ${s}s` : `~${m}m`
}

type Verdict = 'excellent' | 'good' | 'marginal' | 'unsupported'

interface Recommendation {
  fluxDev: { verdict: Verdict; reason: string }
  fluxSchnell: { verdict: Verdict; reason: string }
  suggestion: string
}

function buildRecommendation(hw: HardwareInfo, chip: ChipProfile | null): Recommendation {
  const totalGb = hw.totalMemBytes / (1024 ** 3)
  const isAppleSilicon = !!hw.appleSiliconModel

  if (!isAppleSilicon) {
    return {
      fluxDev: { verdict: 'unsupported', reason: 'Intel Mac — no MPS GPU acceleration. Expect 5-15 minutes per image on CPU.' },
      fluxSchnell: { verdict: 'marginal', reason: 'May work on CPU but very slow (~60-90s). Consider using a cloud GPU.' },
      suggestion: 'This app is optimized for Apple Silicon. Intel Macs can run Flux Schnell via CPU but the experience will be slow.'
    }
  }

  if (!chip) {
    return {
      fluxDev: { verdict: 'good', reason: 'Apple Silicon detected but exact chip model unknown. Flux Dev should work.' },
      fluxSchnell: { verdict: 'excellent', reason: 'Flux Schnell runs well on all Apple Silicon.' },
      suggestion: 'Update macOS or use sysctl to identify the chip for precise estimates.'
    }
  }

  const devVerdict: Verdict =
    totalGb >= chip.minRamForDev * 2 ? 'excellent'
    : totalGb >= chip.minRamForDev ? 'good'
    : totalGb >= chip.minRamForDev * 0.75 ? 'marginal'
    : 'unsupported'

  const schnellVerdict: Verdict =
    totalGb >= chip.minRamForSchnell * 2 ? 'excellent'
    : totalGb >= chip.minRamForSchnell ? 'good'
    : 'marginal'

  const devReason =
    devVerdict === 'excellent' ? `${totalGb.toFixed(0)}GB unified memory — ample headroom for Flux Dev full-quality generation.`
    : devVerdict === 'good' ? `${totalGb.toFixed(0)}GB is sufficient. ComfyUI will use Metal offloading automatically.`
    : devVerdict === 'marginal' ? `${totalGb.toFixed(0)}GB is tight. Flux Dev FP8 is recommended over full-precision Dev.`
    : `${totalGb.toFixed(0)}GB is below the minimum. Flux Dev will likely fail or be extremely slow.`

  const schnellReason =
    schnellVerdict === 'excellent' ? `${totalGb.toFixed(0)}GB is more than enough. 4-step generation will be fast.`
    : schnellVerdict === 'good' ? `Works well. Schnell is the right choice for quick iteration on this device.`
    : `Limited RAM — Flux Schnell will run but may be slow due to memory pressure.`

  const suggestion =
    chip.tier === 'entry' && totalGb <= 8
      ? 'Use Flux Schnell (4 steps) for speed. For Flux Dev, use the FP8 checkpoint to reduce VRAM usage.'
    : chip.tier === 'entry'
      ? 'Both models work. Start with Flux Schnell for iteration, switch to Dev for final quality.'
    : chip.tier === 'pro' || chip.tier === 'max'
      ? 'Flux Dev at full quality is the recommended default. This chip handles it comfortably.'
    : 'Excellent hardware. Flux Dev full-precision will run at top speed.'

  return {
    fluxDev: { verdict: devVerdict, reason: devReason },
    fluxSchnell: { verdict: schnellVerdict, reason: schnellReason },
    suggestion
  }
}

const VERDICT_LABEL: Record<Verdict, string> = {
  excellent: 'Excellent',
  good: 'Good',
  marginal: 'Marginal',
  unsupported: 'Not Recommended'
}

const VERDICT_COLOR: Record<Verdict, string> = {
  excellent: '#55EFC4',
  good: '#7C6FF7',
  marginal: '#FFB347',
  unsupported: '#FF6B6B'
}

export function HardwareCheck() {
  const [hw, setHw] = useState<HardwareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        if (typeof window !== 'undefined' && window.api?.system) {
          const info = await window.api.system.getHardwareInfo()
          setHw(info)
        } else {
          // Browser/dev fallback — simulate Mac
          setHw({
            cpuBrand: 'Apple M2 Pro',
            cpuCores: 12,
            totalMemBytes: 32 * 1024 ** 3,
            freeMemBytes: 14 * 1024 ** 3,
            appleSiliconModel: 'Apple M2 Pro',
            platform: 'darwin',
            arch: 'arm64'
          })
        }
      } catch (err) {
        setError((err as Error).message)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="hw-check hw-check--loading">
        <div className="gen-spinner" />
        <span>Reading hardware info...</span>
      </div>
    )
  }

  if (error || !hw) {
    return (
      <div className="hw-check hw-check--error">
        <span>⚠ Could not read hardware info: {error}</span>
      </div>
    )
  }

  const chip = matchChip(hw.appleSiliconModel)
  const rec = buildRecommendation(hw, chip)
  const totalGb = hw.totalMemBytes / (1024 ** 3)
  const freeGb = hw.freeMemBytes / (1024 ** 3)
  const usedPct = Math.round(((hw.totalMemBytes - hw.freeMemBytes) / hw.totalMemBytes) * 100)

  return (
    <div className="hw-check">
      <div className="hw-header">
        <h2 className="hw-title">Hardware Check</h2>
        <p className="hw-subtitle">Compatibility analysis for local image generation</p>
      </div>

      <div className="hw-grid">
        {/* CPU Card */}
        <div className="hw-card hw-card--wide">
          <div className="hw-card-label">Processor</div>
          <div className="hw-card-value">{hw.cpuBrand}</div>
          <div className="hw-card-meta">{hw.cpuCores} cores · {hw.arch} · {hw.platform}</div>
        </div>

        {/* Apple Silicon Badge */}
        <div className={`hw-card ${hw.appleSiliconModel ? 'hw-card--apple' : 'hw-card--intel'}`}>
          <div className="hw-card-label">Apple Silicon</div>
          {hw.appleSiliconModel ? (
            <>
              <div className="hw-card-value hw-card-value--green">{hw.appleSiliconModel}</div>
              <div className="hw-card-meta">MPS GPU acceleration ✓</div>
            </>
          ) : (
            <>
              <div className="hw-card-value hw-card-value--muted">Intel / Unknown</div>
              <div className="hw-card-meta">No MPS acceleration</div>
            </>
          )}
        </div>

        {/* Total RAM */}
        <div className="hw-card">
          <div className="hw-card-label">Total RAM</div>
          <div className="hw-card-value">{formatBytes(hw.totalMemBytes)}</div>
          {chip && (
            <div className="hw-card-meta">Max for {chip.label}: {chip.unifiedMemoryMax}GB</div>
          )}
        </div>

        {/* Available RAM */}
        <div className="hw-card">
          <div className="hw-card-label">Available RAM</div>
          <div className={`hw-card-value ${freeGb < 4 ? 'hw-card-value--warn' : 'hw-card-value--green'}`}>
            {formatBytes(hw.freeMemBytes)}
          </div>
          <div className="hw-ram-bar-wrap">
            <div className="hw-ram-bar">
              <div className="hw-ram-bar-used" style={{ width: `${usedPct}%` }} />
            </div>
            <span className="hw-ram-pct">{usedPct}% used</span>
          </div>
        </div>

        {/* GPU Cores */}
        {chip && (
          <div className="hw-card">
            <div className="hw-card-label">GPU Cores</div>
            <div className="hw-card-value hw-card-value--purple">{chip.gpuCores}</div>
            <div className="hw-card-meta">Apple GPU · Metal</div>
          </div>
        )}

        {/* Chip tier badge */}
        {chip && (
          <div className="hw-card">
            <div className="hw-card-label">Chip Tier</div>
            <div className={`hw-tier-badge hw-tier-badge--${chip.tier}`}>
              {chip.tier.charAt(0).toUpperCase() + chip.tier.slice(1)}
            </div>
            <div className="hw-card-meta">{chip.label} class</div>
          </div>
        )}
      </div>

      {/* Model Compatibility */}
      <div className="hw-section">
        <h3 className="hw-section-title">Model Compatibility</h3>
        <div className="hw-compat-grid">

          <div className="hw-compat-card">
            <div className="hw-compat-header">
              <span className="hw-compat-model">Flux Dev</span>
              <span
                className="hw-compat-verdict"
                style={{ color: VERDICT_COLOR[rec.fluxDev.verdict] }}
              >
                {VERDICT_LABEL[rec.fluxDev.verdict]}
              </span>
            </div>
            <p className="hw-compat-reason">{rec.fluxDev.reason}</p>
            {chip && (
              <div className="hw-compat-time">
                <span className="hw-time-label">1024×1024 · 28 steps</span>
                <span className="hw-time-value">{formatSeconds(chip.fluxDevSeconds)}</span>
              </div>
            )}
          </div>

          <div className="hw-compat-card">
            <div className="hw-compat-header">
              <span className="hw-compat-model">Flux Schnell</span>
              <span
                className="hw-compat-verdict"
                style={{ color: VERDICT_COLOR[rec.fluxSchnell.verdict] }}
              >
                {VERDICT_LABEL[rec.fluxSchnell.verdict]}
              </span>
            </div>
            <p className="hw-compat-reason">{rec.fluxSchnell.reason}</p>
            {chip && (
              <div className="hw-compat-time">
                <span className="hw-time-label">1024×1024 · 4 steps</span>
                <span className="hw-time-value">{formatSeconds(chip.fluxSchnellSeconds)}</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Recommendation */}
      <div className="hw-section">
        <div className="hw-recommendation">
          <span className="hw-rec-icon">✦</span>
          <div className="hw-rec-content">
            <div className="hw-rec-label">Recommendation</div>
            <p className="hw-rec-text">{rec.suggestion}</p>
          </div>
        </div>
      </div>

      {/* Expected Times Table */}
      {chip && (
        <div className="hw-section">
          <h3 className="hw-section-title">Expected Generation Times — {chip.label}</h3>
          <table className="hw-times-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Resolution</th>
                <th>Steps</th>
                <th>Estimated Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Flux Schnell</td>
                <td>512 × 512</td>
                <td>4</td>
                <td className="hw-time-cell">{formatSeconds(Math.round(chip.fluxSchnellSeconds * 0.4))}</td>
              </tr>
              <tr>
                <td>Flux Schnell</td>
                <td>1024 × 1024</td>
                <td>4</td>
                <td className="hw-time-cell">{formatSeconds(chip.fluxSchnellSeconds)}</td>
              </tr>
              <tr>
                <td>Flux Schnell</td>
                <td>1216 × 832</td>
                <td>4</td>
                <td className="hw-time-cell">{formatSeconds(Math.round(chip.fluxSchnellSeconds * 1.1))}</td>
              </tr>
              <tr className="hw-times-table--divider">
                <td>Flux Dev</td>
                <td>512 × 512</td>
                <td>28</td>
                <td className="hw-time-cell">{formatSeconds(Math.round(chip.fluxDevSeconds * 0.4))}</td>
              </tr>
              <tr>
                <td>Flux Dev</td>
                <td>1024 × 1024</td>
                <td>28</td>
                <td className="hw-time-cell">{formatSeconds(chip.fluxDevSeconds)}</td>
              </tr>
              <tr>
                <td>Flux Dev</td>
                <td>1216 × 832</td>
                <td>28</td>
                <td className="hw-time-cell">{formatSeconds(Math.round(chip.fluxDevSeconds * 1.15))}</td>
              </tr>
              <tr>
                <td>Flux Dev</td>
                <td>1344 × 768</td>
                <td>28</td>
                <td className="hw-time-cell">{formatSeconds(Math.round(chip.fluxDevSeconds * 1.2))}</td>
              </tr>
              <tr>
                <td>Flux Dev FP8</td>
                <td>1024 × 1024</td>
                <td>28</td>
                <td className="hw-time-cell">{formatSeconds(Math.round(chip.fluxDevSeconds * 0.65))}</td>
              </tr>
            </tbody>
          </table>
          <p className="hw-times-note">
            Times are approximate community benchmarks via ComfyUI MPS backend.
            Actual times vary with system load and model quantization.
          </p>
        </div>
      )}
    </div>
  )
}
