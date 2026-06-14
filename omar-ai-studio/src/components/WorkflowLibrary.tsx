import { useAppStore } from '@/store/appStore'
import type { WorkflowPreset } from '@/services/comfyui/WorkflowTemplates'
import { WORKFLOW_PRESETS, PRESET_LABELS } from '@/services/comfyui/WorkflowTemplates'

interface PresetCard {
  id: WorkflowPreset
  icon: string
  description: string
  useCase: string
  examplePrompt: string
  difficulty: 'fast' | 'balanced' | 'quality'
}

const PRESET_CARDS: PresetCard[] = [
  {
    id: 'portrait',
    icon: '👤',
    description: 'Optimized for faces and characters. Tall 2:3 ratio, shallow depth of field.',
    useCase: 'Characters, headshots, anime, avatars',
    examplePrompt: 'A young woman with amber eyes, soft natural lighting, professional portrait, bokeh background',
    difficulty: 'balanced'
  },
  {
    id: 'cinematic',
    icon: '🎬',
    description: 'Wide 3:2 cinematic ratio with dramatic Karras scheduling for depth and atmosphere.',
    useCase: 'Scenes, landscapes, movie stills, environments',
    examplePrompt: 'A lone figure standing at the edge of a misty cliff at golden hour, epic cinematography',
    difficulty: 'quality'
  },
  {
    id: 'product',
    icon: '📦',
    description: 'Square format, clean lighting, sharp detail. Studio-grade product photography.',
    useCase: 'Products, objects, commercial shots, packaging',
    examplePrompt: 'Minimalist perfume bottle on white marble surface, studio lighting, commercial photography',
    difficulty: 'fast'
  },
  {
    id: 'pixar',
    icon: '✨',
    description: 'Subsurface scattering, warm palette, high-detail 3D render. Pixar-studio aesthetic.',
    useCase: 'Animated characters, cute animals, 3D art',
    examplePrompt: 'A fluffy rabbit with big amber eyes and an orange scarf, Pixar 3D style, soft lighting',
    difficulty: 'quality'
  },
  {
    id: 'realistic',
    icon: '📷',
    description: 'Full-precision ancestral sampler for maximum realism and natural detail.',
    useCase: 'Photorealistic scenes, DSLR-style photos, nature',
    examplePrompt: 'Dense rainforest at dawn, sunbeams through the canopy, mist, photorealistic DSLR photo',
    difficulty: 'quality'
  },
  {
    id: 'concept',
    icon: '🌌',
    description: 'Wide ultra-panoramic ratio for dramatic concept art, sci-fi, and fantasy environments.',
    useCase: 'Concept art, sci-fi, fantasy, game assets, environments',
    examplePrompt: 'A futuristic city on Mars, neon lights reflecting on red dust, epic sci-fi concept art',
    difficulty: 'balanced'
  }
]

const DIFFICULTY_LABEL: Record<PresetCard['difficulty'], { label: string; color: string }> = {
  fast:     { label: 'Fast',     color: '#55EFC4' },
  balanced: { label: 'Balanced', color: '#7C6FF7' },
  quality:  { label: 'Quality',  color: '#FFB347' }
}

export function WorkflowLibrary() {
  const { setImageGenParams, setSelectedPreset, setImageGenView, imageGenParams } = useAppStore()

  const loadPreset = (card: PresetCard) => {
    const presetParams = WORKFLOW_PRESETS[card.id]
    setSelectedPreset(card.id)
    setImageGenParams(presetParams)
    setImageGenView('generate')
  }

  const loadWithPrompt = (card: PresetCard) => {
    const presetParams = WORKFLOW_PRESETS[card.id]
    setSelectedPreset(card.id)
    setImageGenParams({ ...presetParams, prompt: card.examplePrompt })
    setImageGenView('generate')
  }

  return (
    <div className="workflow-library">
      <div className="workflow-library-header">
        <h2 className="workflow-library-title">Workflow Library</h2>
        <p className="workflow-library-subtitle">
          6 production-ready presets — each tuned for a specific visual style
        </p>
      </div>

      <div className="workflow-cards">
        {PRESET_CARDS.map((card) => {
          const { label: diffLabel, color: diffColor } = DIFFICULTY_LABEL[card.difficulty]
          const params = WORKFLOW_PRESETS[card.id]
          return (
            <div key={card.id} className="workflow-card">
              <div className="workflow-card-top">
                <span className="workflow-card-icon">{card.icon}</span>
                <div className="workflow-card-meta">
                  <span className="workflow-card-name">{PRESET_LABELS[card.id].en}</span>
                  <span className="workflow-card-diff" style={{ color: diffColor }}>
                    {diffLabel}
                  </span>
                </div>
              </div>

              <p className="workflow-card-desc">{card.description}</p>

              <div className="workflow-card-specs">
                <span>{params.width}×{params.height}</span>
                <span>·</span>
                <span>{params.steps} steps</span>
                <span>·</span>
                <span>CFG {params.cfg}</span>
                <span>·</span>
                <span className="workflow-card-sampler">{params.sampler}</span>
              </div>

              <div className="workflow-card-usecase">
                <span className="workflow-card-usecase-label">Best for:</span>
                <span>{card.useCase}</span>
              </div>

              <div className="workflow-card-example">
                <div className="workflow-card-example-label">Example prompt</div>
                <p className="workflow-card-example-text">"{card.examplePrompt}"</p>
              </div>

              <div className="workflow-card-actions">
                <button
                  className="workflow-card-btn workflow-card-btn--primary"
                  onClick={() => loadWithPrompt(card)}
                >
                  Load with Example
                </button>
                <button
                  className="workflow-card-btn workflow-card-btn--secondary"
                  onClick={() => loadPreset(card)}
                >
                  Load Settings Only
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
