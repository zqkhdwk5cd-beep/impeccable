import React from 'react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/i18n/useTranslation'

export function ProjectHistoryView(): React.ReactElement {
  const { promptPacks, setCodingView, setCodingProjectPath } = useAppStore()
  const { t, isAr } = useTranslation()

  const fontUi = isAr ? 'var(--font-ar)' : 'var(--font-ui)'

  const codingPacks = promptPacks.filter((p) => p.codingOutput != null)
  const reviewPacks = codingPacks.filter((p) => p.request.toLowerCase().includes('review') || p.request.includes('راجع'))
  const createdPacks = codingPacks.filter((p) => !reviewPacks.includes(p))

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const handleViewPack = (pack: typeof promptPacks[0]) => {
    // Navigate to coding lab with context
    setCodingView('lab')
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', fontFamily: fontUi }}>
          📋 {t.projectHistory || 'History'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: fontUi }}>
          {isAr ? 'سجل مشاريع ومراجعات عميل البرمجة' : 'Coding Agent project history and reviews'}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {codingPacks.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 12,
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: fontUi }}>
              {isAr ? 'لا يوجد سجل بعد' : 'No history yet'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi, textAlign: 'center', maxWidth: 300 }}>
              {isAr
                ? 'ستظهر مشاريعك ومراجعاتك هنا بعد استخدام عميل البرمجة'
                : 'Your projects and code reviews will appear here after using the Coding Agent'}
            </div>
            <button
              onClick={() => setCodingView('new-project')}
              style={{
                marginTop: 8,
                padding: '8px 20px',
                background: 'rgba(124,111,247,0.12)',
                border: '1px solid rgba(124,111,247,0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--agent-chief)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: fontUi
              }}
            >
              ✨ {isAr ? 'إنشاء مشروع جديد' : 'Create New Project'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 800 }}>
            {codingPacks.map((pack) => {
              const isReview = reviewPacks.includes(pack)
              const typeColor = isReview ? '#43D9AD' : '#7C6FF7'
              const typeLabel = isReview
                ? (isAr ? 'مراجعة كود' : 'Code Review')
                : (isAr ? 'مشروع جديد' : 'New Project')
              const typeIcon = isReview ? '🔍' : '✨'

              return (
                <div
                  key={pack.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'border-color 0.15s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${typeColor}30`
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'
                  }}
                  onClick={() => handleViewPack(pack)}
                >
                  {/* Type icon */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: `${typeColor}12`,
                    border: `1px solid ${typeColor}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0
                  }}>
                    {typeIcon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        padding: '2px 8px',
                        background: `${typeColor}12`,
                        border: `1px solid ${typeColor}25`,
                        borderRadius: 10,
                        fontSize: 10,
                        color: typeColor,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        fontFamily: fontUi,
                        flexShrink: 0
                      }}>
                        {typeLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: fontUi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pack.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: fontUi, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pack.request.substring(0, 80)}{pack.request.length > 80 ? '...' : ''}
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: fontUi, flexShrink: 0, textAlign: 'right' }}>
                    {formatDate(pack.createdAt)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
