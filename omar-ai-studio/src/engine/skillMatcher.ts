import type { Skill } from '@/types/skill'

export interface SkillMatchResult {
  matchedSkills: Skill[]
  composedPrompt: string
  matchReasoning: Record<string, string[]>  // skillId -> matched triggers
}

export function matchSkills(request: string, skills: Skill[]): SkillMatchResult {
  const lower = request.toLowerCase()
  const matched: { skill: Skill; matchedTriggers: string[] }[] = []

  for (const skill of skills) {
    if (!skill.enabled) continue
    const matchedTriggers = skill.triggers.filter(t =>
      lower.includes(t.toLowerCase())
    )
    if (matchedTriggers.length > 0) {
      matched.push({ skill, matchedTriggers })
    }
  }

  // Sort by priority descending
  matched.sort((a, b) => b.skill.priority - a.skill.priority)

  const matchedSkills = matched.map(m => m.skill)
  const matchReasoning: Record<string, string[]> = {}
  matched.forEach(m => { matchReasoning[m.skill.id] = m.matchedTriggers })

  const composedPrompt = composeSkillPrompt(matchedSkills)

  return { matchedSkills, composedPrompt, matchReasoning }
}

function composeSkillPrompt(skills: Skill[]): string {
  if (skills.length === 0) return ''

  const lines: string[] = [
    '## Active Skill Pack — Runtime Instructions',
    `${skills.length} skill(s) activated for this request:`,
    skills.map(s => `• ${s.name} (priority: ${s.priority})`).join('\n'),
    '',
    '---',
    ''
  ]

  for (const skill of skills) {
    lines.push(`### ${skill.icon} ${skill.name}`)
    lines.push(`*${skill.description}*`)
    lines.push('')
    lines.push('**Rules:**')
    skill.rules.forEach(r => lines.push(`- ${r}`))
    lines.push('')
    lines.push(`**Required output sections:** ${skill.outputSections.join(' | ')}`)
    lines.push('')
    if (skill.safetyNotes.length > 0) {
      lines.push('**Safety:** ' + skill.safetyNotes.join('. '))
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

export function formatActivatedSkillsBanner(result: SkillMatchResult): string {
  if (result.matchedSkills.length === 0) return ''
  const names = result.matchedSkills.map(s => `${s.icon} ${s.name}`).join(' · ')
  return `**Activated Skills:** ${names}`
}
