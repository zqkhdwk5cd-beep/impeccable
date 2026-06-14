import { useState, useEffect } from 'react'
import { comfyUIService } from '@/services/comfyui/ComfyUIService'
import { useAppStore } from '@/store/appStore'

type Step = 'welcome' | 'comfyui' | 'models' | 'done'

interface CheckResult {
  label: string
  status: 'checking' | 'ok' | 'missing' | 'optional'
  note?: string
}

interface SetupWizardProps {
  onComplete: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { setComfyUIConnection } = useAppStore()
  const [step, setStep] = useState<Step>('welcome')
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [checking, setChecking] = useState(false)

  const runChecks = async () => {
    setChecking(true)
    setStep('comfyui')

    const results: CheckResult[] = [
      { label: 'ComfyUI Server (http://127.0.0.1:8188)', status: 'checking' },
      { label: 'Flux Dev checkpoint', status: 'checking' },
      { label: 'Flux Schnell checkpoint', status: 'checking' },
      { label: 'LoRA support', status: 'checking' }
    ]
    setChecks([...results])

    // Check ComfyUI connection
    const connected = await comfyUIService.checkConnection()
    results[0] = {
      label: results[0].label,
      status: connected ? 'ok' : 'missing',
      note: connected ? undefined : 'Run: python main.py --listen in ComfyUI directory'
    }
    setChecks([...results])

    if (connected) {
      setComfyUIConnection({ status: 'connected', lastChecked: Date.now(), error: null })

      const [checkpoints, loras] = await Promise.all([
        comfyUIService.getCheckpointList(),
        comfyUIService.getLoraList()
      ])

      setComfyUIConnection({ checkpoints, loras })

      const hasFluxDev = checkpoints.some(
        (c) => c.toLowerCase().includes('flux') && c.toLowerCase().includes('dev') && !c.toLowerCase().includes('fp8')
      )
      const hasFluxSchnell = checkpoints.some(
        (c) => c.toLowerCase().includes('flux') && c.toLowerCase().includes('schnell')
      )

      results[1] = {
        label: results[1].label,
        status: hasFluxDev ? 'ok' : 'missing',
        note: hasFluxDev ? undefined : 'Download flux1-dev.safetensors → ComfyUI/models/checkpoints/'
      }
      results[2] = {
        label: results[2].label,
        status: hasFluxSchnell ? 'ok' : 'optional',
        note: hasFluxSchnell ? undefined : 'Optional: flux1-schnell.safetensors for fast generation'
      }
      results[3] = {
        label: results[3].label,
        status: loras.length > 0 ? 'ok' : 'optional',
        note: loras.length > 0 ? `${loras.length} LoRA(s) found` : 'Optional: drop .safetensors in ComfyUI/models/loras/'
      }
    } else {
      results[1] = { label: results[1].label, status: 'missing', note: 'Requires ComfyUI connection' }
      results[2] = { label: results[2].label, status: 'optional', note: 'Requires ComfyUI connection' }
      results[3] = { label: results[3].label, status: 'optional', note: 'Requires ComfyUI connection' }
    }

    setChecks([...results])
    setChecking(false)
    setStep('models')
  }

  const statusIcon = (s: CheckResult['status']) => {
    if (s === 'checking') return <span className="setup-check-icon setup-check-icon--checking">⟳</span>
    if (s === 'ok') return <span className="setup-check-icon setup-check-icon--ok">✓</span>
    if (s === 'missing') return <span className="setup-check-icon setup-check-icon--missing">✗</span>
    return <span className="setup-check-icon setup-check-icon--optional">○</span>
  }

  return (
    <div className="setup-wizard-overlay">
      <div className="setup-wizard">
        <div className="setup-wizard-header">
          <span className="setup-wizard-logo">✦</span>
          <h1 className="setup-wizard-title">Omar AI Studio</h1>
          <p className="setup-wizard-subtitle">Image Generation Setup</p>
        </div>

        {step === 'welcome' && (
          <div className="setup-step">
            <h2 className="setup-step-title">Welcome to the Image Lab</h2>
            <p className="setup-step-desc">
              Omar AI Studio generates images locally using ComfyUI + Flux models running on your Mac.
              No cloud, no API keys, no data leaves your machine.
            </p>
            <div className="setup-requirements">
              <h3>Requirements</h3>
              <ul>
                <li>ComfyUI installed and running locally</li>
                <li>Flux Dev or Flux Schnell model checkpoint</li>
                <li>Apple Silicon (M1/M2/M3) recommended for best performance</li>
              </ul>
            </div>
            <div className="setup-actions">
              <button className="setup-btn setup-btn--primary" onClick={runChecks}>
                Check My Setup
              </button>
              <button className="setup-btn setup-btn--secondary" onClick={onComplete}>
                Skip — I'll set up later
              </button>
            </div>
          </div>
        )}

        {(step === 'comfyui' || step === 'models') && (
          <div className="setup-step">
            <h2 className="setup-step-title">Checking Your Setup</h2>
            <div className="setup-check-list">
              {checks.map((check, i) => (
                <div key={i} className={`setup-check-item setup-check-item--${check.status}`}>
                  {statusIcon(check.status)}
                  <div className="setup-check-content">
                    <span className="setup-check-label">{check.label}</span>
                    {check.note && <span className="setup-check-note">{check.note}</span>}
                  </div>
                </div>
              ))}
            </div>

            {step === 'models' && !checking && (
              <div className="setup-actions">
                <button className="setup-btn setup-btn--primary" onClick={onComplete}>
                  {checks.some((c) => c.status === 'missing')
                    ? 'Continue Anyway'
                    : 'Start Generating →'}
                </button>
                <button className="setup-btn setup-btn--secondary" onClick={runChecks}>
                  Re-check
                </button>
              </div>
            )}

            {step === 'models' && checks.some((c) => c.status === 'missing') && (
              <div className="setup-help">
                <h3>Quick Setup Guide</h3>
                <ol>
                  <li>
                    Install ComfyUI: <code>git clone https://github.com/comfyanonymous/ComfyUI</code>
                  </li>
                  <li>Install dependencies: <code>pip install -r requirements.txt</code></li>
                  <li>Download Flux Dev from HuggingFace → place in <code>ComfyUI/models/checkpoints/</code></li>
                  <li>Start ComfyUI: <code>python main.py --listen</code></li>
                  <li>Come back and click Re-check</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
