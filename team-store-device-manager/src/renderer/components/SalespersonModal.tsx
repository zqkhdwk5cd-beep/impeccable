import React, { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { User, Lock, ArrowRight, X } from 'lucide-react'

interface Props {
  onSelect: (salesperson: { id: number; name: string } | null) => void
}

export default function SalespersonModal({ onSelect }: Props) {
  const [salespeople, setSalespeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.salespeople.getActive().then((list) => {
      setSalespeople(list)
      setLoading(false)
      if (list.length === 0) onSelect(null)
    }).catch(() => { setLoading(false); onSelect(null) })
  }, [])

  useEffect(() => {
    if (selected) setTimeout(() => inputRef.current?.focus(), 50)
  }, [selected])

  const handlePinChange = (val: string) => {
    if (!/^\d*$/.test(val) || val.length > 4) return
    setPin(val)
    setError('')
  }

  const confirmPin = async () => {
    if (!selected) return
    if (!selected.pin_hash && pin === '') {
      onSelect({ id: selected.id, name: selected.name })
      return
    }
    if (pin.length !== 4) { setError('أدخل 4 أرقام'); return }
    setChecking(true)
    try {
      const ok = await api.salespeople.verifyPin(selected.id, pin)
      if (ok) {
        onSelect({ id: selected.id, name: selected.name })
      } else {
        setError('باسورد خاطئ')
        setPin('')
        inputRef.current?.focus()
      }
    } catch { setError('حدث خطأ') }
    setChecking(false)
  }

  if (loading) return null
  if (salespeople.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">

        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              {selected ? <Lock className="w-5 h-5 text-brand-600" /> : <User className="w-5 h-5 text-brand-600" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {selected ? `مرحباً ${selected.name}` : 'من يقوم بهذه العملية؟'}
              </h2>
              <p className="text-sm text-slate-500">
                {selected ? 'أدخل باسوردك المكون من 4 أرقام' : 'اختر اسمك من القائمة'}
              </p>
            </div>
          </div>
        </div>

        {/* Salesperson list */}
        {!selected && (
          <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
            {salespeople.map((sp) => (
              <button
                key={sp.id}
                onClick={() => {
                  if (!sp.pin_hash) { onSelect({ id: sp.id, name: sp.name }); return }
                  setSelected(sp)
                  setPin('')
                  setError('')
                }}
                className="w-full text-right px-4 py-3 rounded-xl hover:bg-brand-50 hover:text-brand-700 font-medium text-slate-800 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                    {sp.name.charAt(0)}
                  </div>
                  {sp.name}
                </div>
                {sp.pin_hash && <Lock className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            ))}
          </div>
        )}

        {/* PIN input */}
        {selected && (
          <div className="p-6 space-y-4">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    pin.length > i
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-300'
                  }`}
                >
                  {pin.length > i ? '●' : '○'}
                </div>
              ))}
            </div>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmPin()}
              maxLength={4}
              className="sr-only"
            />
            {error && <p className="text-center text-sm text-red-500 font-medium">{error}</p>}
            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === '⌫') handlePinChange(pin.slice(0, -1))
                    else if (k !== '') handlePinChange(pin + k)
                  }}
                  className={`h-12 rounded-xl text-lg font-semibold transition-all ${
                    k === '' ? '' :
                    k === '⌫' ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' :
                    'bg-slate-50 text-slate-800 hover:bg-brand-50 hover:text-brand-700 active:scale-95'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={confirmPin}
              disabled={pin.length !== 4 || checking}
              className="btn-primary w-full justify-center"
            >
              {checking ? 'جاري التحقق...' : 'تأكيد'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 flex justify-between">
          {selected ? (
            <button onClick={() => { setSelected(null); setPin(''); setError('') }} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" /> رجوع
            </button>
          ) : (
            <div />
          )}
          <button onClick={() => onSelect(null)} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> تخطي
          </button>
        </div>
      </div>
    </div>
  )
}
