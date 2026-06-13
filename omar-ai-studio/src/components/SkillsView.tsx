import React, { useState, useMemo, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'
import type { Skill } from '@/types/skill'
import { DEFAULT_SKILLS, ADVANCED_CODING_SKILLS, ADVANCED_CODING_PACK } from '@/types/skill'
import { v4 as uuidv4 } from 'uuid'

type Category = 'All' | 'Memory' | 'Analysis' | 'Planning' | 'Execution' | 'Coding' | 'Verification' | 'Architecture' | 'Multi-Agent'

const CATEGORY_COLORS: Record<string, string> = {
  Memory: '#74B9FF',
  Analysis: '#00CEC9',
  Planning: '#6C5CE7',
  Execution: '#00B894',
  Coding: '#FF7675',
  Verification: '#43D9AD',
  Architecture: '#A29BFE',
  'Multi-Agent': '#FD79A8'
}

export function SkillsView(): React.ReactElement {
  const { skills, updateSkill, addSkill, deleteSkill } = useAppStore()
  const { t, isAr } = useTranslation()

  const [selectedId, setSelectedId] = useState<string | null>(skills[0]?.id ?? null)
  const [triggerInput, setTriggerInput] = useState('')
  const [saveFlash, setSaveFlash] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fontUi = isAr ? 'var(--font-ar)' : 'var(--font-ui)'

  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      const matchesCategory = activeCategory === 'All' || skill.category === activeCategory
      if (!matchesCategory) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        skill.name.toLowerCase().includes(q) ||
        skill.nameAr.includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.triggers.some(t => t.toLowerCase().includes(q))
      )
    })
  }, [skills, searchQuery, activeCategory])

  const selected = skills.find((s) => s.id === selectedId) ?? null

  const advancedSkillCount = skills.filter(s => s.packId === 'advanced-coding-pack').length
  const defaultSkillCount = skills.filter(s => s.packId === 'default').length

  const handleSave = () => {
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1400)
  }

  const handleResetToDefault = () => {
    if (!selected) return
    const allDefaults = [...DEFAULT_SKILLS, ...ADVANCED_CODING_SKILLS]
    const original = allDefaults.find((s) => s.id === selected.id)
    if (original) {
      updateSkill(selected.id, { ...original })
    }
  }

  const handleAddSkill = () => {
    const newSkill: Skill = {
      id: uuidv4(),
      name: 'New Skill',
      nameAr: 'مهارة جديدة',
      category: 'Coding',
      priority: 50,
      version: '1.0.0',
      description: 'Describe what this skill does.',
      triggers: [],
      rules: [],
      outputSections: [],
      safetyNotes: [],
      exampleRequests: [],
      isDefault: false,
      enabled: true,
      icon: '⚡',
      color: '#7C6FF7'
    }
    addSkill(newSkill)
    setSelectedId(newSkill.id)
  }

  const handleAddTrigger = () => {
    if (!selected || !triggerInput.trim()) return
    updateSkill(selected.id, { triggers: [...selected.triggers, triggerInput.trim()] })
    setTriggerInput('')
  }

  const handleRemoveTrigger = (trigger: string) => {
    if (!selected) return
    updateSkill(selected.id, { triggers: selected.triggers.filter((t) => t !== trigger) })
  }

  const handleUpdateRule = (index: number, value: string) => {
    if (!selected) return
    const updated = [...selected.rules]
    updated[index] = value
    updateSkill(selected.id, { rules: updated })
  }

  const handleAddRule = () => {
    if (!selected) return
    updateSkill(selected.id, { rules: [...selected.rules, ''] })
  }

  const handleRemoveRule = (index: number) => {
    if (!selected) return
    updateSkill(selected.id, { rules: selected.rules.filter((_, i) => i !== index) })
  }

  const handleUpdateOutputSection = (index: number, value: string) => {
    if (!selected) return
    const updated = [...selected.outputSections]
    updated[index] = value
    updateSkill(selected.id, { outputSections: updated })
  }

  const handleAddOutputSection = () => {
    if (!selected) return
    updateSkill(selected.id, { outputSections: [...selected.outputSections, ''] })
  }

  const handleRemoveOutputSection = (index: number) => {
    if (!selected) return
    updateSkill(selected.id, { outputSections: selected.outputSections.filter((_, i) => i !== index) })
  }

  const handleUpdateSafetyNote = (index: number, value: string) => {
    if (!selected) return
    const updated = [...selected.safetyNotes]
    updated[index] = value
    updateSkill(selected.id, { safetyNotes: updated })
  }

  const handleAddSafetyNote = () => {
    if (!selected) return
    updateSkill(selected.id, { safetyNotes: [...selected.safetyNotes, ''] })
  }

  const handleRemoveSafetyNote = (index: number) => {
    if (!selected) return
    updateSkill(selected.id, { safetyNotes: selected.safetyNotes.filter((_, i) => i !== index) })
  }

  const handleAdjustPriority = (skill: Skill, delta: number) => {
    const newPriority = Math.max(0, Math.min(100, skill.priority + delta))
    updateSkill(skill.id, { priority: newPriority })
  }

  const handleExport = () => {
    const json = JSON.stringify(skills, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'skills-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as Skill[]
        if (Array.isArray(imported)) {
          imported.forEach(skill => {
            if (skill.id && skill.name) {
              const existing = skills.find(s => s.id === skill.id)
              if (!existing) {
                addSkill({ ...skill, isDefault: false })
              }
            }
          })
        }
      } catch {
        // Invalid JSON — silently ignore
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--text-muted)',
    marginBottom: 8,
    fontFamily: fontUi
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input, var(--bg-secondary))',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-sm)',
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    width: '100%',
    fontFamily: fontUi,
    boxSizing: 'border-box'
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: 64,
    lineHeight: 1.6
  }

  const categories: Category[] = ['All', 'Memory', 'Analysis', 'Planning', 'Execution', 'Coding', 'Verification', 'Architecture', 'Multi-Agent']

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-primary)'
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: fontUi, flex: 1 }}>
            🎯 {t.skillsTitle || 'Skills'}
          </div>
          {/* Import / Export buttons */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: fontUi
            }}
          >
            {t.importSkills || 'Import'}
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: fontUi
            }}
          >
            {t.exportSkills || 'Export'}
          </button>
        </div>

        {/* Search bar */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t.skillSearch || 'Search skills...'}
          style={{
            ...inputStyle,
            marginBottom: 10,
            fontSize: 12
          }}
        />

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '3px 8px',
                background: activeCategory === cat
                  ? (cat === 'All' ? 'rgba(124,111,247,0.18)' : `${CATEGORY_COLORS[cat] ?? '#7C6FF7'}18`)
                  : 'transparent',
                border: `1px solid ${activeCategory === cat
                  ? (cat === 'All' ? 'rgba(124,111,247,0.4)' : `${CATEGORY_COLORS[cat] ?? '#7C6FF7'}40`)
                  : 'var(--border-subtle)'}`,
                borderRadius: 12,
                color: activeCategory === cat
                  ? (cat === 'All' ? '#7C6FF7' : (CATEGORY_COLORS[cat] ?? '#7C6FF7'))
                  : 'var(--text-muted)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: fontUi,
                transition: 'all 0.12s ease'
              }}
            >
              {cat === 'All' ? (t.allCategories || 'All') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Built-in Packs section (collapsible area above main split) */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8, fontFamily: fontUi }}>
          {t.builtInPacks || 'Built-in Packs'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Default Pack card */}
          <div style={{
            flex: 1,
            padding: '8px 12px',
            background: 'rgba(124,111,247,0.06)',
            border: '1px solid rgba(124,111,247,0.2)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 14 }}>🎯</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7C6FF7', fontFamily: fontUi }}>Default Pack</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi }}>{defaultSkillCount} skills</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi, lineHeight: 1.4 }}>
              Core coding skills: architecture, debugging, refactor, integration.
            </div>
          </div>
          {/* Advanced Coding Pack card */}
          <div style={{
            flex: 2,
            padding: '8px 12px',
            background: 'rgba(162,155,254,0.06)',
            border: '1px solid rgba(162,155,254,0.25)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 14 }}>🚀</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#A29BFE', fontFamily: fontUi }}>{ADVANCED_CODING_PACK.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi }}>{advancedSkillCount} skills</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi, lineHeight: 1.4 }}>
              {ADVANCED_CODING_PACK.description.slice(0, 80)}...
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel — skill list */}
        <div style={{
          width: 270,
          flexShrink: 0,
          borderRight: isAr ? 'none' : '1px solid var(--border-subtle)',
          borderLeft: isAr ? '1px solid var(--border-subtle)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {filteredSkills.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: fontUi }}>
                No skills match this filter.
              </div>
            )}
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => setSelectedId(skill.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: selectedId === skill.id ? 'rgba(124,111,247,0.10)' : 'transparent',
                  border: `1px solid ${selectedId === skill.id ? 'rgba(124,111,247,0.28)' : 'transparent'}`,
                  transition: 'all 0.12s ease'
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, opacity: skill.enabled ? 1 : 0.4 }}>{skill.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: fontUi,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {isAr ? skill.nameAr : skill.name}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1, fontFamily: fontUi }}>
                    {skill.nameAr}
                  </div>
                  {/* Category badge */}
                  <div style={{
                    display: 'inline-block',
                    marginTop: 3,
                    padding: '1px 5px',
                    background: `${CATEGORY_COLORS[skill.category] ?? '#7C6FF7'}14`,
                    border: `1px solid ${CATEGORY_COLORS[skill.category] ?? '#7C6FF7'}30`,
                    borderRadius: 6,
                    fontSize: 8,
                    color: CATEGORY_COLORS[skill.category] ?? '#7C6FF7',
                    fontWeight: 700,
                    letterSpacing: '0.3px'
                  }}>
                    {skill.category}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {/* Priority arrows */}
                  <button
                    onClick={e => { e.stopPropagation(); handleAdjustPriority(skill, 5) }}
                    title="Increase priority"
                    style={{
                      width: 16,
                      height: 12,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 8,
                      padding: 0,
                      lineHeight: 1
                    }}
                  >▲</button>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{skill.priority}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleAdjustPriority(skill, -5) }}
                    title="Decrease priority"
                    style={{
                      width: 16,
                      height: 12,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 8,
                      padding: 0,
                      lineHeight: 1
                    }}
                  >▼</button>
                </div>
                {/* Enable toggle */}
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    updateSkill(skill.id, { enabled: !skill.enabled })
                  }}
                  style={{
                    width: 28,
                    height: 15,
                    borderRadius: 8,
                    background: skill.enabled ? skill.color : 'var(--border-medium)',
                    position: 'relative',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: skill.enabled ? 'calc(100% - 13px)' : 2,
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Add new skill button */}
          <div style={{ padding: 10, borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <button
              onClick={handleAddSkill}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(124,111,247,0.08)',
                border: '1px dashed rgba(124,111,247,0.35)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--agent-chief, #7C6FF7)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: fontUi,
                transition: 'all 0.15s ease'
              }}
            >
              {t.addSkill || '+ Add Skill'}
            </button>
          </div>
        </div>

        {/* Right panel — editor */}
        {selected ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {/* Icon + color + category row */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: `${selected.color}18`,
                border: `1px solid ${selected.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0
              }}>
                {selected.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, ...sectionLabel, marginBottom: 4 }}>
                  {isAr ? 'الأيقونة واللون' : 'Icon & Color'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={selected.icon}
                    onChange={(e) => updateSkill(selected.id, { icon: e.target.value })}
                    style={{ ...inputStyle, width: 54 }}
                    maxLength={4}
                    placeholder="🔧"
                  />
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) => updateSkill(selected.id, { color: e.target.value })}
                    style={{ width: 38, height: 32, borderRadius: 6, border: '1px solid var(--border-medium)', background: 'none', cursor: 'pointer' }}
                  />
                  <input
                    value={selected.color}
                    onChange={(e) => updateSkill(selected.id, { color: e.target.value })}
                    style={{ ...inputStyle, width: 100, fontFamily: 'monospace' }}
                    placeholder="#7C6FF7"
                  />
                </div>
              </div>
            </div>

            {/* Category + Priority row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={sectionLabel}>{isAr ? 'التصنيف' : 'Category'}</div>
                <select
                  value={selected.category}
                  onChange={(e) => updateSkill(selected.id, { category: e.target.value as Skill['category'] })}
                  style={{ ...inputStyle }}
                >
                  {(['Memory', 'Analysis', 'Planning', 'Execution', 'Coding', 'Verification', 'Architecture', 'Multi-Agent'] as const).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ width: 100 }}>
                <div style={sectionLabel}>{t.priority || 'Priority'} (0-100)</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={selected.priority}
                  onChange={(e) => updateSkill(selected.id, { priority: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Name row */}
            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</div>
              <input
                value={selected.name}
                onChange={(e) => updateSkill(selected.id, { name: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</div>
              <input
                value={selected.nameAr}
                onChange={(e) => updateSkill(selected.id, { nameAr: e.target.value })}
                style={{ ...inputStyle, direction: 'rtl', textAlign: 'right' }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>{isAr ? 'الوصف' : 'Description'}</div>
              <textarea
                value={selected.description}
                onChange={(e) => updateSkill(selected.id, { description: e.target.value })}
                style={textareaStyle}
              />
            </div>

            {/* Triggers */}
            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>{t.skillTriggers || 'Triggers'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {selected.triggers.map((trigger) => (
                  <div
                    key={trigger}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 8px',
                      background: `${selected.color}14`,
                      border: `1px solid ${selected.color}35`,
                      borderRadius: 20,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      fontFamily: fontUi
                    }}
                  >
                    <span>{trigger}</span>
                    <span
                      onClick={() => handleRemoveTrigger(trigger)}
                      style={{ cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1 }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTrigger() } }}
                  placeholder={isAr ? 'أضف محفزاً...' : 'Add trigger...'}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleAddTrigger}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: fontUi,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isAr ? 'إضافة' : 'Add'}
                </button>
              </div>
            </div>

            {/* Rules */}
            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>{t.skillRules || 'Rules'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                      marginTop: 7,
                      fontFamily: 'monospace'
                    }}>
                      {i + 1}
                    </div>
                    <textarea
                      value={rule}
                      onChange={(e) => handleUpdateRule(i, e.target.value)}
                      style={{ ...textareaStyle, minHeight: 40, flex: 1 }}
                      rows={1}
                    />
                    <button
                      onClick={() => handleRemoveRule(i)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 5
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddRule}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: fontUi,
                    textAlign: 'left'
                  }}
                >
                  {isAr ? '+ إضافة قاعدة' : '+ Add rule'}
                </button>
              </div>
            </div>

            {/* Output Sections */}
            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>{t.skillOutputSections || 'Output Sections'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.outputSections.map((section, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={section}
                      onChange={(e) => handleUpdateOutputSection(i, e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => handleRemoveOutputSection(i)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddOutputSection}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: fontUi,
                    textAlign: 'left'
                  }}
                >
                  {isAr ? '+ إضافة قسم' : '+ Add section'}
                </button>
              </div>
            </div>

            {/* Safety Notes */}
            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>{t.skillSafetyNotes || 'Safety Notes'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.safetyNotes.map((note, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, flexShrink: 0, color: '#FF6B6B' }}>⚠</span>
                    <input
                      value={note}
                      onChange={(e) => handleUpdateSafetyNote(i, e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => handleRemoveSafetyNote(i)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddSafetyNote}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: fontUi,
                    textAlign: 'left'
                  }}
                >
                  {isAr ? '+ إضافة ملاحظة' : '+ Add safety note'}
                </button>
              </div>
            </div>

            {/* Example Requests */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionLabel}>{t.exampleRequests || 'Example Requests'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selected.exampleRequests.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '5px 10px',
                      background: `${selected.color}08`,
                      border: `1px solid ${selected.color}20`,
                      borderRadius: 8,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      fontFamily: fontUi,
                      fontStyle: 'italic'
                    }}
                  >
                    "{ex}"
                  </div>
                ))}
                {selected.exampleRequests.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi }}>
                    No example requests defined.
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, paddingBottom: 24 }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  background: saveFlash ? 'rgba(67,217,173,0.15)' : 'rgba(124,111,247,0.12)',
                  border: `1px solid ${saveFlash ? 'rgba(67,217,173,0.4)' : 'rgba(124,111,247,0.35)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: saveFlash ? '#43D9AD' : 'var(--agent-chief, #7C6FF7)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: fontUi,
                  transition: 'all 0.2s ease'
                }}
              >
                {saveFlash ? (t.saved || '✓ Saved') : (t.save || 'Save')}
              </button>

              {selected.isDefault && (
                <button
                  onClick={handleResetToDefault}
                  style={{
                    padding: '9px 16px',
                    background: 'transparent',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: fontUi,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.resetToDefault || 'Reset'}
                </button>
              )}

              {!selected.isDefault && (
                <button
                  onClick={() => {
                    deleteSkill(selected.id)
                    setSelectedId(skills.find((s) => s.id !== selected.id)?.id ?? null)
                  }}
                  style={{
                    padding: '9px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(255,107,107,0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#FF6B6B',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: fontUi,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isAr ? 'حذف' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: fontUi }}>
            {isAr ? 'اختر مهارة من القائمة' : 'Select a skill from the list'}
          </div>
        )}
      </div>
    </div>
  )
}
