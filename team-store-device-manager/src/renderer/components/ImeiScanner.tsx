import React, { useEffect, useRef, useState } from 'react'
import { X, RefreshCw, CheckCircle, AlertTriangle, Scan, Loader2 } from 'lucide-react'
import { validateImei, lookupImei, DeviceLookupResult } from '../lib/deviceLookup'

type ScanState = 'waiting' | 'looking' | 'done' | 'error'

interface Props {
  onFill: (result: DeviceLookupResult, imei: string) => void
  onClose: () => void
}

export default function ImeiScanner({ onFill, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [value, setValue]           = useState('')
  const [state, setState]           = useState<ScanState>('waiting')
  const [errMsg, setErrMsg]         = useState('')
  const [result, setResult]         = useState<DeviceLookupResult | null>(null)

  // Auto-focus on open
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => {
      clearTimeout(t)
      abortRef.current?.abort()
    }
  }, [])

  const reset = () => {
    abortRef.current?.abort()
    setValue('')
    setState('waiting')
    setErrMsg('')
    setResult(null)
    setTimeout(() => inputRef.current?.focus(), 60)
  }

  const processImei = async (raw: string) => {
    const imei = raw.trim()
    const check = validateImei(imei)

    if (!check.valid) {
      setState('error')
      setErrMsg(check.error!)
      return
    }

    setState('looking')
    abortRef.current = new AbortController()

    try {
      const r = await lookupImei(imei, abortRef.current.signal)
      setResult(r)
      setState('done')
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setState('error')
      setErrMsg('فشل الاتصال بخدمة البحث — تحقق من الشبكة')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // USB HID scanner types fast — keep only digits, cap at 15
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15)
    setValue(digits)
    // Auto-trigger when exactly 15 digits received (scanner without Enter suffix)
    if (digits.length === 15) processImei(digits)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Most scanners append Enter — trigger on Enter if we have input
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.length > 0 && state === 'waiting') processImei(value)
    }
    // Block non-digit key input except control keys
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault()
  }

  const handleConfirm = () => {
    if (result && state === 'done') onFill(result, value)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
            <Scan className="w-5 h-5 text-brand-600" />
            Scan IMEI
          </h2>
          <button
            onClick={() => { abortRef.current?.abort(); onClose() }}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Scanner icon banner */}
          {state === 'waiting' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <Scan className="w-8 h-8 text-brand-500 animate-pulse" />
              </div>
              <p className="text-sm text-slate-500 text-center leading-relaxed">
                وجّه سكانر الـ USB على باركود الـ IMEI<br />
                الموجود على علبة الآيفون
              </p>
            </div>
          )}

          {/* Input — always visible; focused while waiting */}
          <div>
            <div className={`relative rounded-xl border-2 transition-colors ${
              state === 'error'   ? 'border-red-400   bg-red-50' :
              state === 'done'    ? 'border-green-400 bg-green-50' :
              state === 'looking' ? 'border-slate-200  bg-slate-50' :
                                    'border-brand-400  bg-brand-50'
            }`}>
              <input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent px-4 py-3 font-mono text-xl text-center tracking-widest outline-none"
                placeholder="— — — — — — — — — — — — — — —"
                dir="ltr"
                maxLength={15}
                readOnly={state === 'looking' || state === 'done'}
                autoComplete="off"
              />
              {/* Character counter */}
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono select-none">
                {value.length}/15
              </span>
            </div>
          </div>

          {/* Status area */}
          {state === 'looking' && (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-600 py-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري البحث عن بيانات الجهاز...
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errMsg}</span>
            </div>
          )}

          {state === 'done' && result && (
            <div className={`rounded-xl p-4 space-y-1.5 ${result.found ? 'bg-green-50' : 'bg-amber-50'}`}>
              {result.found ? (
                <>
                  <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> تم العثور على بيانات الجهاز
                  </p>
                  {result.model && (
                    <p className="text-sm font-medium text-slate-800">
                      {result.brand} {result.model}
                    </p>
                  )}
                  {(result.storage || result.color) && (
                    <p className="text-xs text-slate-500">
                      {[result.storage, result.color].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {result.region && (
                    <p className="text-xs text-slate-400">Region: {result.region}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> تم قراءة IMEI بنجاح
                  </p>
                  <p className="text-xs text-amber-700">
                    بعض البيانات تحتاج إدخال يدوي
                  </p>
                </>
              )}
              <p className="text-xs font-mono text-slate-500 pt-1 border-t border-black/5">{value}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {state === 'error' && (
              <>
                <button onClick={reset} className="btn-secondary flex-1 justify-center gap-1.5 text-sm py-2.5">
                  <RefreshCw className="w-3.5 h-3.5" /> مسح مرة أخرى
                </button>
                <button
                  onClick={() => { abortRef.current?.abort(); onFill({ found: false, source: 'stub', brand: 'Apple' }, value) }}
                  className="btn-secondary flex-1 justify-center gap-1.5 text-sm py-2.5 text-slate-600"
                  title="قبول IMEI فقط بدون بيانات"
                >
                  قبول IMEI فقط
                </button>
              </>
            )}
            {state === 'done' && (
              <>
                <button onClick={reset} className="btn-secondary justify-center gap-1.5 text-sm py-2.5 px-4">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleConfirm} className="btn-primary flex-1 justify-center gap-1.5 text-sm py-2.5">
                  <CheckCircle className="w-3.5 h-3.5" /> تأكيد وتعبئة البيانات
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
