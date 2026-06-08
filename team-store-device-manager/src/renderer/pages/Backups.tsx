import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { HardDrive, Plus, RotateCcw, Folder, AlertTriangle, CheckCircle } from 'lucide-react'

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(d: Date | string) {
  const date = new Date(d)
  return date.toLocaleString('en-US')
}

export default function BackupsPage() {
  const { user, isAdmin } = useAuth()
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState('')
  const [backupDir, setBackupDir] = useState('')
  const [dbPath, setDbPath] = useState('')
  const [lastBackup, setLastBackup] = useState('')

  const load = async () => {
    try {
      const [bks, dir, db, s] = await Promise.all([
        api.backup.list(),
        api.backup.getDir(),
        api.backup.getDatabasePath(),
        api.settings.get('last_backup_date'),
      ])
      setBackups(bks)
      setBackupDir(dir)
      setDbPath(db)
      setLastBackup(s)
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createBackup = async () => {
    setCreating(true)
    try {
      const result = await api.backup.create(user?.id)
      if (result.success) {
        toast.success('تم إنشاء نسخة احتياطية بنجاح')
        load()
      } else {
        toast.error(result.error || 'فشل إنشاء النسخة الاحتياطية')
      }
    } catch (e: any) { toast.error(e.message) }
    setCreating(false)
  }

  const restoreBackup = async (backupPath: string) => {
    if (!isAdmin) return toast.error('فقط المدير يمكنه استرجاع النسخ الاحتياطية')

    const confirm1 = window.confirm('⚠️ تحذير: سيتم استبدال قاعدة البيانات الحالية بالنسخة الاحتياطية.\n\nسيتم إنشاء نسخة طوارئ من البيانات الحالية قبل الاستبدال.\n\nهل أنت متأكد؟')
    if (!confirm1) return

    const confirm2 = window.confirm('تأكيد نهائي: هل تريد استرجاع هذه النسخة الاحتياطية؟\n\nلا يمكن التراجع عن هذه العملية.')
    if (!confirm2) return

    setRestoring(backupPath)
    try {
      const result = await api.backup.restore(backupPath, user?.id)
      if (result.success) {
        toast.success('تم استرجاع النسخة الاحتياطية. أعد تشغيل التطبيق لتطبيق التغييرات.')
      } else {
        toast.error(result.error || 'فشل استرجاع النسخة الاحتياطية')
      }
    } catch (e: any) { toast.error(e.message) }
    setRestoring('')
  }

  const chooseBackupFile = async () => {
    if (!isAdmin) return toast.error('فقط المدير يمكنه استرجاع النسخ الاحتياطية')
    const result = await api.dialog.openFile({
      title: 'اختر ملف النسخة الاحتياطية',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (!result.canceled && result.filePaths[0]) {
      await restoreBackup(result.filePaths[0])
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">النسخ الاحتياطي</h1>
          <p className="text-slate-500 text-sm mt-1">حماية بياناتك من الفقدان</p>
        </div>
        <button onClick={createBackup} disabled={creating} className="btn-primary">
          <Plus className="w-4 h-4" /> {creating ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية الآن'}
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-2">موقع قاعدة البيانات</div>
          <div className="text-xs font-mono text-slate-700 break-all">{dbPath || 'جاري التحميل...'}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-2">مجلد النسخ الاحتياطي</div>
          <div className="text-xs font-mono text-slate-700 break-all">{backupDir || 'جاري التحميل...'}</div>
          {lastBackup && (
            <div className="text-xs text-slate-500 mt-2">
              <CheckCircle className="w-3 h-3 inline text-green-600 ml-1" />
              آخر نسخة: {formatDate(lastBackup)}
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      {!isAdmin && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">استرجاع النسخ الاحتياطية متاح للمدير فقط</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {isAdmin && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">استرجاع نسخة احتياطية</h3>
          <div className="flex gap-3">
            <button onClick={chooseBackupFile} className="btn-secondary">
              <Folder className="w-4 h-4" /> اختيار ملف نسخة احتياطية...
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            ⚠️ الاسترجاع سيستبدل البيانات الحالية. سيتم إنشاء نسخة طوارئ تلقائياً قبل الاستبدال.
          </p>
        </div>
      )}

      {/* Backups list */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2"><HardDrive className="w-4 h-4 text-brand-600" />النسخ الاحتياطية ({backups.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center">
            <HardDrive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-400">لا توجد نسخ احتياطية حتى الآن</div>
            <button onClick={createBackup} className="btn-primary mt-4">إنشاء أول نسخة</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {backups.map((b, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{b.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                    <span>{formatDate(b.date)}</span>
                    <span>·</span>
                    <span>{formatBytes(b.size)}</span>
                    {i === 0 && <span className="badge bg-green-100 text-green-700">الأحدث</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => restoreBackup(b.path)}
                    disabled={restoring === b.path}
                    className="btn-secondary btn-sm flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {restoring === b.path ? 'جاري الاسترجاع...' : 'استرجاع'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
