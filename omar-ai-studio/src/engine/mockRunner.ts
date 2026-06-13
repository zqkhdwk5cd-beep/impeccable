import type { AgentId } from '@/types/agent'
import type { Task } from '@/types/task'
import { eventBus } from './eventBus'

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function runMockTask(
  task: Task,
  onProgress: (progress: number) => void
): Promise<string> {
  const agentId = task.agentId

  eventBus.emit('agent:status', {
    agentId,
    status: 'thinking',
    task: task.title,
    progress: 0,
    lastAction: 'Analyzing request...'
  })
  onProgress(10)
  await delay(randomBetween(800, 1500))

  eventBus.emit('agent:status', {
    agentId,
    status: 'working',
    task: task.title,
    progress: 30,
    lastAction: 'Processing task...'
  })
  onProgress(30)

  const steps = getMockSteps(task)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const progress = 30 + Math.floor(((i + 1) / steps.length) * 60)
    eventBus.emit('agent:status', {
      agentId,
      status: 'working',
      task: task.title,
      progress,
      lastAction: step
    })
    onProgress(progress)
    await delay(randomBetween(600, 1200))
  }

  const output = getMockOutput(task)
  onProgress(100)
  return output
}

function getMockSteps(task: Task): string[] {
  const steps: Record<AgentId, string[]> = {
    chief: [
      'Parsing user request...',
      'Identifying required agents...',
      'Creating task plan...',
      'Assigning priorities...',
      'Initializing workflow...'
    ],
    story: [
      'Analyzing narrative requirements...',
      'Building scene structure...',
      'Writing Act 1...',
      'Writing Act 2...',
      'Adding emotional beats...',
      'Crafting hook and ending...'
    ],
    character: [
      'Searching memory for character data...',
      'Loading character bible...',
      'Verifying visual consistency...',
      'Updating character notes...'
    ],
    image: [
      'Analyzing scene descriptions...',
      'Selecting visual style...',
      'Writing Scene 1 prompt...',
      'Writing Scene 2 prompt...',
      'Writing Scene 3 prompt...',
      'Adding technical parameters...'
    ],
    video: [
      'Planning camera movements...',
      'Writing Scene 1 video prompt...',
      'Writing Scene 2 video prompt...',
      'Writing Scene 3 video prompt...',
      'Specifying lens and lighting...',
      'Adding motion and timing...'
    ],
    research: [
      'Formulating search queries...',
      'Searching knowledge base...',
      'Comparing tools and approaches...',
      'Summarizing findings...'
    ],
    memory: [
      'Preparing data for storage...',
      'Saving project context...',
      'Indexing character bibles...',
      'Saving prompt pack...',
      'Confirming storage complete...'
    ]
  }
  return steps[task.agentId] || ['Processing...']
}

function getMockOutput(task: Task): string {
  const outputs: Record<AgentId, string> = {
    chief: CHIEF_OUTPUT,
    story: STORY_OUTPUT,
    character: CHARACTER_OUTPUT,
    image: IMAGE_OUTPUT,
    video: VIDEO_OUTPUT,
    research: RESEARCH_OUTPUT,
    memory: MEMORY_OUTPUT
  }
  return outputs[task.agentId] || 'Task completed successfully.'
}

const CHIEF_OUTPUT = `## Task Plan Created

**Request analyzed:** New 15-second episode for character Hopper

**Workflow:**
1. ✅ Story Agent → Write cinematic story (3 scenes)
2. ✅ Character Agent → Load Hopper character bible
3. ✅ Image Agent → Create image prompts (3 key scenes)
4. ✅ Video Agent → Create video prompts (15s total)
5. ✅ Memory Agent → Save project to memory

**Estimated output:** Complete prompt pack ready for Kling/Runway + Flux/ComfyUI`

const STORY_OUTPUT = `## Episode: Hopper Discovers Vegetables
*Duration: 15 seconds | Format: Pixar-inspired 3D Animation*

---

**HOOK:** "The greatest adventures grow underground."

---

**SCENE 1 — THE MYSTERY (0–5s)**
A soft morning mist rolls over a colorful garden. HOPPER, a fluffy rabbit with wide curious eyes and a signature orange scarf, pokes his head out from his burrow. He sniffs the air. Something extraordinary is nearby.

*Emotional beat: Curiosity*
*Camera: Low angle push-in, gentle morning light*

---

**SCENE 2 — THE DISCOVERY (5–10s)**
Hopper finds a row of bright orange carrots peeking from the earth. His eyes go wide. He gently pulls one out — it's enormous! He holds it up, inspecting every detail with pure wonder.

*Emotional beat: Delight → Wonder*
*Camera: Close-up on carrot, then pull back to reveal full row*

---

**SCENE 3 — THE CELEBRATION (10–15s)**
Hopper dances in the morning sun, carrot held high. His friends — a hedgehog and a bluebird — rush in to celebrate. They share the feast as golden light bathes the garden.

*Emotional beat: Joy → Sharing → Community*
*Camera: Wide shot pulling up and back, sun flare*

---

**Tone:** Warm, joyful, family-friendly
**Music cue:** Upbeat orchestral with pizzicato strings`

const CHARACTER_OUTPUT = `## Character Bible: HOPPER
*Loaded from memory — Last updated: today*

---

**VISUAL IDENTITY**
- Species: Rabbit (anthropomorphic)
- Fur: Cream-white with soft gray tips on ears
- Eyes: Large, expressive amber/honey colored
- Signature item: Orange knit scarf (always present)
- Build: Small, round, soft — Pixar-style proportions (head 40% of total height)
- Expression range: Wide — from confused to overjoyed

**PERSONALITY**
- Curious by nature, cautious before brave
- Pure-hearted, sees wonder in small things
- Speaks in simple sentences (target: children 4–8)
- Never sarcastic or mean

**ANIMATION NOTES**
- Ears are expressive — droop when sad, perk when excited
- Signature hop: three quick small hops before stopping
- When surprised: full body freeze + ears shoot up

**CONSISTENCY FLAGS**
- Orange scarf: always present, always tied the same way
- No sharp angles — all soft curves
- Eyes always slightly larger than realistic`

const IMAGE_OUTPUT = `## Image Prompts — Hopper Episode

---

**SCENE 1: The Mystery**
\`\`\`
A fluffy cream-white anthropomorphic rabbit with amber eyes and an orange knit scarf emerges from a cozy burrow entrance in a lush garden. Soft morning mist, golden hour lighting, magical realism. Pixar 3D animation style, high detail, subsurface scattering on fur, bokeh background with colorful flowers. Camera: low angle, wide. Mood: curious, magical.

Negative: realistic, dark, sharp edges, human features, text
Style: Pixar, Disney, 3D render, soft lighting
AR: 16:9 | Steps: 30 | CFG: 7
\`\`\`

---

**SCENE 2: The Discovery**
\`\`\`
Close-up of Hopper the rabbit (cream fur, orange scarf, amber eyes) holding a giant bright orange carrot with both paws, eyes wide with wonder and delight. Perfect composition, warm sunlight, shallow depth of field. Pixar animation style, ultra-detailed fur, expressive face.

Negative: realistic, dark, blurry, text
Style: Pixar 3D, warm tones, character focus
AR: 16:9 | Steps: 35 | CFG: 7.5
\`\`\`

---

**SCENE 3: The Celebration**
\`\`\`
Wide shot: Hopper the rabbit dancing joyfully in a sunlit garden, holding carrot overhead. Joined by a small hedgehog and a bluebird. Golden hour sun flare, flowers in bloom. Pixar 3D animation style, celebration mood, warm color palette, volumetric light.

Style: Pixar 3D | AR: 16:9 | Steps: 35 | CFG: 7
\`\`\``

const VIDEO_OUTPUT = `## Video Prompts — Hopper Episode (15 seconds)

---

**SCENE 1: The Mystery (0–5s)**
\`\`\`
Hopper the rabbit slowly emerges from his burrow in a misty garden at golden hour. Camera starts low angle, slowly pushing in. Morning mist drifts. His ears perk up. He sniffs. The camera tilts up slightly to reveal a beautiful garden behind him.

Camera: Low angle push-in + slight tilt up
Lens: 35mm, shallow depth of field
Duration: 5 seconds
Lighting: Golden hour, soft diffused sunlight, rim light
Motion: Slow, peaceful, building anticipation
FPS: 24
Platform: Kling / Runway Gen-3
\`\`\`

---

**SCENE 2: The Discovery (5–10s)**
\`\`\`
Close up on a row of orange carrots. Hopper's paws reach into frame and pull one out. Camera slowly zooms in on Hopper's face as his eyes widen with pure wonder. He holds the carrot up to the light — a perfect composition shot.

Camera: Close-up zoom-in on face
Lens: 50mm macro → 85mm portrait
Duration: 5 seconds
Lighting: Warm sunlight, carrot catches light
Motion: Slow pull, Hopper's ears rise with excitement
FPS: 24
Platform: Kling / Veo 3
\`\`\`

---

**SCENE 3: The Celebration (10–15s)**
\`\`\`
Wide cinematic shot. Hopper dances in the garden, carrot held high. Two friends appear — a hedgehog and bluebird. Camera pulls back and rises slowly (drone-style) revealing the full garden as golden sun flares into frame. Joyful energy.

Camera: Wide shot, slow pull back + rise (simulated drone)
Lens: 24mm wide angle
Duration: 5 seconds
Lighting: Golden hour, dramatic sun flare at end
Motion: Dynamic but warm — celebration energy
FPS: 24
Platform: Kling / Runway / SuperGrok
\`\`\``

const RESEARCH_OUTPUT = `## Research Notes
*(Research Agent was not required for this task — no web search needed)*

**Available tools for this project:**
- **Image:** Flux Schnell (fast), Flux Dev (quality), ComfyUI (control)
- **Video:** Kling 1.6 (best motion), Runway Gen-3 (consistency), Veo 3 (Google, cinematic)
- **Recommendation:** Use Flux Dev for images, Kling 1.6 for video — best quality/cost ratio as of 2026`

const MEMORY_OUTPUT = `## Memory Saved

**Project:** Hopper Episode — Vegetables Discovery
**Saved items:**
- ✅ Project context saved
- ✅ Character bible updated (Hopper v3)
- ✅ Prompt pack saved to library
- ✅ Style guide snapshot saved

**Memory stats:** 3 character bibles | 1 style guide | This prompt pack`
