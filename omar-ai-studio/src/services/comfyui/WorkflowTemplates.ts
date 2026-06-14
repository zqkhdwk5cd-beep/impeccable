// Flux workflow templates for ComfyUI
// Each template returns a ComfyUI API-format workflow JSON

export interface FluxGenerationParams {
  checkpoint: string
  prompt: string
  negativePrompt: string
  width: number
  height: number
  steps: number
  cfg: number
  seed: number
  sampler: string
  scheduler: string
  batchSize: number
  lora?: { name: string; strength: number }
  vae?: string
}

export type WorkflowPreset =
  | 'portrait'
  | 'cinematic'
  | 'product'
  | 'pixar'
  | 'realistic'
  | 'concept'

export const WORKFLOW_PRESETS: Record<WorkflowPreset, Partial<FluxGenerationParams>> = {
  portrait: {
    width: 832,
    height: 1216,
    steps: 28,
    cfg: 3.5,
    sampler: 'euler',
    scheduler: 'simple'
  },
  cinematic: {
    width: 1216,
    height: 832,
    steps: 30,
    cfg: 4.0,
    sampler: 'dpmpp_2m',
    scheduler: 'karras'
  },
  product: {
    width: 1024,
    height: 1024,
    steps: 25,
    cfg: 3.5,
    sampler: 'euler',
    scheduler: 'simple'
  },
  pixar: {
    width: 1024,
    height: 1024,
    steps: 32,
    cfg: 4.5,
    sampler: 'dpmpp_2m',
    scheduler: 'karras'
  },
  realistic: {
    width: 1024,
    height: 1024,
    steps: 35,
    cfg: 3.0,
    sampler: 'euler_ancestral',
    scheduler: 'normal'
  },
  concept: {
    width: 1344,
    height: 768,
    steps: 28,
    cfg: 4.0,
    sampler: 'euler',
    scheduler: 'simple'
  }
}

export const PRESET_LABELS: Record<WorkflowPreset, { en: string; ar: string }> = {
  portrait:  { en: 'Portrait',       ar: 'بورتريه' },
  cinematic: { en: 'Cinematic',      ar: 'سينمائي' },
  product:   { en: 'Product Shot',   ar: 'صورة منتج' },
  pixar:     { en: 'Pixar Style',    ar: 'ستايل بيكسار' },
  realistic: { en: 'Realistic',      ar: 'واقعي' },
  concept:   { en: 'Concept Art',    ar: 'كونسبت ارت' }
}

export const DEFAULT_PARAMS: FluxGenerationParams = {
  checkpoint: 'flux1-dev.safetensors',
  prompt: '',
  negativePrompt: '',
  width: 1024,
  height: 1024,
  steps: 28,
  cfg: 3.5,
  seed: -1,
  sampler: 'euler',
  scheduler: 'simple',
  batchSize: 1
}

export const SAMPLER_OPTIONS = [
  'euler', 'euler_ancestral', 'heun', 'heunpp2', 'dpm_2',
  'dpm_2_ancestral', 'lms', 'dpm_fast', 'dpm_adaptive',
  'dpmpp_2s_ancestral', 'dpmpp_sde', 'dpmpp_sde_gpu',
  'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde',
  'ddpm', 'lcm', 'ipndm', 'uni_pc', 'uni_pc_bh2'
]

export const SCHEDULER_OPTIONS = [
  'normal', 'karras', 'exponential', 'sgm_uniform', 'simple',
  'ddim_uniform', 'beta'
]

function resolveSeed(seed: number): number {
  if (seed === -1 || seed === 0) {
    return Math.floor(Math.random() * 2 ** 32)
  }
  return seed
}

export function buildFluxDevWorkflow(params: FluxGenerationParams): Record<string, unknown> {
  const seed = resolveSeed(params.seed)

  const workflow: Record<string, unknown> = {
    '1': {
      inputs: { ckpt_name: params.checkpoint },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'Load Checkpoint' }
    },
    '2': {
      inputs: { text: params.prompt, clip: ['1', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Positive Prompt' }
    },
    '3': {
      inputs: { text: params.negativePrompt || 'bad quality, blurry, distorted', clip: ['1', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Negative Prompt' }
    },
    '4': {
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: params.batchSize
      },
      class_type: 'EmptyLatentImage',
      _meta: { title: 'Empty Latent' }
    },
    '5': {
      inputs: {
        seed,
        steps: params.steps,
        cfg: params.cfg,
        sampler_name: params.sampler,
        scheduler: params.scheduler,
        denoise: 1.0,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0]
      },
      class_type: 'KSampler',
      _meta: { title: 'KSampler' }
    },
    '6': {
      inputs: { samples: ['5', 0], vae: ['1', 2] },
      class_type: 'VAEDecode',
      _meta: { title: 'VAE Decode' }
    },
    '7': {
      inputs: {
        filename_prefix: 'omar-ai-studio/flux',
        images: ['6', 0]
      },
      class_type: 'SaveImage',
      _meta: { title: 'Save Image' }
    }
  }

  // Inject LoRA if provided
  if (params.lora) {
    workflow['1'] = {
      inputs: { ckpt_name: params.checkpoint },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'Load Checkpoint' }
    }
    workflow['8'] = {
      inputs: {
        lora_name: params.lora.name,
        strength_model: params.lora.strength,
        strength_clip: params.lora.strength,
        model: ['1', 0],
        clip: ['1', 1]
      },
      class_type: 'LoraLoader',
      _meta: { title: 'Load LoRA' }
    }
    // Rewire sampler to use lora model output
    ;(workflow['5'] as Record<string, unknown>).inputs = {
      ...(workflow['5'] as { inputs: Record<string, unknown> }).inputs,
      model: ['8', 0]
    }
    ;(workflow['2'] as Record<string, unknown>).inputs = {
      ...(workflow['2'] as { inputs: Record<string, unknown> }).inputs,
      clip: ['8', 1]
    }
    ;(workflow['3'] as Record<string, unknown>).inputs = {
      ...(workflow['3'] as { inputs: Record<string, unknown> }).inputs,
      clip: ['8', 1]
    }
  }

  return workflow
}

// Flux Schnell (4-step fast generation)
export function buildFluxSchnellWorkflow(params: FluxGenerationParams): Record<string, unknown> {
  return buildFluxDevWorkflow({
    ...params,
    steps: Math.min(params.steps, 4),
    cfg: 1.0,
    sampler: 'euler',
    scheduler: 'simple'
  })
}

// Flux Dev FP8 (same as Dev but uses FP8 checkpoint)
export function buildFluxFP8Workflow(params: FluxGenerationParams): Record<string, unknown> {
  return buildFluxDevWorkflow(params)
}

export function buildWorkflowForModel(
  modelType: 'flux-dev' | 'flux-dev-fp8' | 'flux-schnell',
  params: FluxGenerationParams
): Record<string, unknown> {
  switch (modelType) {
    case 'flux-schnell': return buildFluxSchnellWorkflow(params)
    case 'flux-dev-fp8': return buildFluxFP8Workflow(params)
    default:             return buildFluxDevWorkflow(params)
  }
}
