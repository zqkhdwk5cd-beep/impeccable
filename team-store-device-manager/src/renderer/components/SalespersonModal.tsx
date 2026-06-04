import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { User } from 'lucide-react'

interface Props {
  onSelect: (salesperson: { id: number; name: string } | null) => void
}

export default function SalespersonModal({ onSelect }: Props) {
  const [salespeople, setSalespeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.salespeople.getActive().then((list) => {
      setSalespeople(list)
      setLoading(false)
      if (list.length === 0) onSelect(null)
    }).catch(() => {
      setLoading(false)
      onSelect(null)
    })
  }, [])

  if (loading) return null
  if (salespeople.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">من يقوم بهذه العملية؟</h2>
              <p className="text-sm text-slate-500">اختر اسمك من القائمة</p>
            </div>
          </div>
        </div>
        <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
          {salespeople.map((sp) => (
            <button
              key={sp.id}
              onClick={() => onSelect({ id: sp.id, name: sp.name })}
              className="w-full text-right px-4 py-3 rounded-xl hover:bg-brand-50 hover:text-brand-700 font-medium text-slate-800 transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                {sp.name.charAt(0)}
              </div>
              {sp.name}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => onSelect(null)}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600"
          >
            تخطي
          </button>
        </div>
      </div>
    </div>
  )
}
