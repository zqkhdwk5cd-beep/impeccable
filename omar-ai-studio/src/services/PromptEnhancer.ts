// Rule-based prompt enhancement optimized for Flux Dev / Schnell
// Flux responds differently from SD — lower CFG, no negative prompts needed for basic use,
// benefits from descriptive natural language over tag spam

export interface EnhancementResult {
  enhanced: string
  negativePrompt: string
  detectedStyle: StyleCategory
  suggestedPreset: string
  changes: string[]
  chiefNotes: string
}

export type StyleCategory =
  | 'portrait'
  | 'landscape'
  | 'product'
  | 'animation'
  | 'architecture'
  | 'abstract'
  | 'concept-art'
  | 'photography'
  | 'general'

// ─── Keyword → style detection ────────────────────────────────────────────────

const STYLE_KEYWORDS: Record<StyleCategory, string[]> = {
  portrait: ['portrait', 'face', 'person', 'woman', 'man', 'girl', 'boy', 'character', 'بورتريه', 'وجه', 'شخص'],
  landscape: ['landscape', 'mountain', 'forest', 'sea', 'ocean', 'sky', 'nature', 'outdoor', 'طبيعة', 'جبل', 'بحر'],
  product: ['product', 'bottle', 'package', 'item', 'object', 'commercial', 'منتج', 'علبة'],
  animation: ['anime', 'cartoon', 'pixar', '3d', 'animated', 'disney', 'كرتون', 'انيمي', 'بيكسار'],
  architecture: ['building', 'interior', 'room', 'house', 'architecture', 'city', 'مبنى', 'غرفة', 'معمار'],
  abstract: ['abstract', 'pattern', 'texture', 'geometric', 'fluid', 'تجريدي'],
  'concept-art': ['concept art', 'sci-fi', 'fantasy', 'game art', 'digital art', 'scifi', 'فانتازيا'],
  photography: ['photo', 'realistic', 'photograph', 'camera', 'lens', 'واقعي', 'صورة فوتوغرافية'],
  general: []
}

function detectStyle(prompt: string): StyleCategory {
  const lower = prompt.toLowerCase()
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (style === 'general') continue
    if (keywords.some((kw) => lower.includes(kw))) {
      return style as StyleCategory
    }
  }
  return 'general'
}

// ─── Quality boosters per style ───────────────────────────────────────────────

const QUALITY_SUFFIXES: Record<StyleCategory, string> = {
  portrait: 'sharp focus, detailed skin texture, professional lighting, shallow depth of field, 85mm lens',
  landscape: 'golden hour light, volumetric atmosphere, ultra-wide shot, epic scale, photorealistic',
  product: 'studio lighting, clean white background, sharp product detail, commercial photography, macro',
  animation: 'smooth 3D render, subsurface scattering, rim lighting, high detail, octane render',
  architecture: 'architectural visualization, accurate perspective, interior design, ambient occlusion',
  abstract: 'vibrant colors, high contrast, intricate detail, fluid simulation, 8k texture',
  'concept-art': 'concept art, dramatic lighting, detailed environment, matte painting, cinematic',
  photography: 'RAW photo, DSLR, professional photography, sharp focus, natural lighting',
  general: 'high quality, detailed, sharp focus, professional'
}

const NEGATIVE_BY_STYLE: Record<StyleCategory, string> = {
  portrait: 'blurry, bad anatomy, extra limbs, deformed face, ugly, low quality',
  landscape: 'blurry, washed out, flat lighting, oversaturated, low quality',
  product: 'shadow, dirty, scratched, blurry, distorted, bad lighting',
  animation: 'realistic, photorealistic, bad anatomy, stiff, flat shading',
  architecture: 'distorted perspective, bad geometry, blurry, unrealistic proportions',
  abstract: 'realistic, photographic, blurry, low contrast',
  'concept-art': 'amateur, low quality, poorly drawn, inconsistent lighting',
  photography: 'painted, illustration, cartoon, blurry, overexposed',
  general: 'low quality, blurry, distorted, bad anatomy'
}

const PRESET_BY_STYLE: Record<StyleCategory, string> = {
  portrait: 'portrait',
  landscape: 'cinematic',
  product: 'product',
  animation: 'pixar',
  architecture: 'cinematic',
  abstract: 'concept',
  'concept-art': 'concept',
  photography: 'realistic',
  general: 'realistic'
}

// ─── Chief Agent analysis ─────────────────────────────────────────────────────

function buildChiefNotes(style: StyleCategory, originalLen: number, enhancedLen: number): string {
  const styleLabels: Record<StyleCategory, string> = {
    portrait: 'Portrait / Character',
    landscape: 'Landscape / Nature',
    product: 'Product Photography',
    animation: '3D / Animation',
    architecture: 'Architecture / Interior',
    abstract: 'Abstract / Texture',
    'concept-art': 'Concept Art / Sci-Fi',
    photography: 'Realistic Photography',
    general: 'General'
  }
  return `Detected style: ${styleLabels[style]}. Prompt expanded from ${originalLen} to ${enhancedLen} tokens. Routed to ${PRESET_BY_STYLE[style]} preset.`
}

// ─── Main enhancer ────────────────────────────────────────────────────────────

export function enhancePrompt(rawPrompt: string, existingNegative = ''): EnhancementResult {
  const style = detectStyle(rawPrompt)
  const changes: string[] = []

  let enhanced = rawPrompt.trim()

  // Remove trailing commas/extra spaces
  enhanced = enhanced.replace(/,\s*$/, '').replace(/\s+/g, ' ')

  // Add style-specific quality suffix if not already present
  const qualitySuffix = QUALITY_SUFFIXES[style]
  const firstQualityToken = qualitySuffix.split(',')[0].trim().toLowerCase()
  if (!enhanced.toLowerCase().includes(firstQualityToken)) {
    enhanced = `${enhanced}, ${qualitySuffix}`
    changes.push(`Added quality boosters for ${style} style`)
  }

  // Add Flux-specific global quality tokens if absent
  if (!enhanced.toLowerCase().includes('masterpiece') && !enhanced.toLowerCase().includes('high quality')) {
    enhanced = `masterpiece, ${enhanced}`
    changes.push('Added masterpiece quality tag')
  }

  // Build negative prompt
  const negative = existingNegative.trim() || NEGATIVE_BY_STYLE[style]
  if (!existingNegative.trim()) {
    changes.push('Generated negative prompt for this style')
  }

  if (changes.length === 0) {
    changes.push('Prompt is already well-structured — minor cleanup applied')
  }

  return {
    enhanced,
    negativePrompt: negative,
    detectedStyle: style,
    suggestedPreset: PRESET_BY_STYLE[style],
    changes,
    chiefNotes: buildChiefNotes(style, rawPrompt.length, enhanced.length)
  }
}
