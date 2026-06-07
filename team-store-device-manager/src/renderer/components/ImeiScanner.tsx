import React, { useEffect, useRef, useState } from 'react'
import { X, CheckCircle, AlertTriangle, Scan } from 'lucide-react'
import { validateImei } from '../lib/deviceLookup'

type Step = 'imei1' | 'imei2' | 'serial'

const STEPS: { key: Step; label: string; hint: string; max: number }[] = [
  { key: 'imei1',  label: 'IMEI 1',       hint: '15 رقم',        max: 15 },
  { key: 'imei2',  label: 'IMEI 2',       hint: '15 رقم',        max: 15 },
  { key: 'serial', label: 'Serial Number', hint: 'حروف وأرقام',  max: 20 },
]

function validateSerial(raw: string): { valid: boolean; error?: string } {
  const s = raw.trim().toUpperCase()
  if (s.length < 8)      return { valid: false, error: `Serial ناقص — ${s.length} حرف فقط` }
  if (!/^[A-Z0-9]+$/.test(s)) return { valid: false, error: 'Serial يحتوي على رموز غير مقبولة' }
  return { valid: true }
}

function validate(step: Step, val: string) {
  if (step === 'imei1' || step === 'imei2') return validateImei(val)
  return validateSerial(val)
}

interface Props {
  onFill: (data: { imei1: string; imei2: string; serial_number: string }) => void
  onClose: () => void
}

export default function ImeiScanner({ onFill, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep]   = useState<Step>('imei1')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState<'idle' | 'ok' | 'err'>('idle')
  const [data, setData]   = useState({ imei1: '', imei2: '', serial: '' })

  const stepIdx    = STEPS.findIndex(s => s.key === step)
  const stepConfig = STEPS[stepIdx]

  // Focus input whenever step changes
  useEffect(() => {
    setValue('')
    setError('')
    setFlash('idle')
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [step])

  // Focus on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  const advance = (val: string) => {
    const cleaned = val.trim().toUpperCase()

    if (step === 'imei1') {
      setData(d => ({ ...d, imei1: cleaned }))
      triggerOk(() => setStep('imei2'))
    } else if (step === 'imei2') {
      setData(d => ({ ...d, imei2: cleaned }))
      triggerOk(() => setStep('serial'))
    } else {
      const finalData = { ...data, serial: cleaned }
      setData(finalData)
      triggerOk(() => onFill({
        imei1: finalData.imei1,
        imei2: finalData.imei2,
        serial_number: finalData.serial,
      }))
    }
  }

  const triggerOk = (cb: () => void) => {
    setFlash('ok')
    setTimeout(() => { setFlash('idle'); cb() }, 320)
  }

  const triggerErr = (msg: string) => {
    setError(msg)
    setFlash('err')
    // shake then reset
    setTimeout(() => {
      setFlash('idle')
      setValue('')
      inputRef.current?.focus()
    }, 1800)
  }

  const tryAdvance = (val: string) => {
    const result = validate(step, val)
    if (result.valid) advance(val)
    else triggerErr(result.error!)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (flash !== 'idle') return
    setError('')

    let raw = e.target.value

    // IMEI steps: digits only
    if (step !== 'serial') {
      raw = raw.replace(/\D/g, '').slice(0, 15)
      setValue(raw)
      if (raw.length === 15) tryAdvance(raw) // auto-fire when full
    } else {
      // Serial: alphanumeric only
      raw = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20)
      setValue(raw)
      if (raw.length === 12) tryAdvance(raw) // common Apple serial length
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.length > 0 && flash === 'idle') tryAdvance(value)
    }
    // Block non-digit for IMEI steps
    if (step !== 'serial' && e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault()
  }

  // ── Border / bg color based on flash state ────────────────────────────
  const inputClass =
    flash === 'ok'  ? 'border-green-400 bg-green-50' :
    flash === 'err' ? 'border-red-400   bg-red-50 animate-pulse' :
                      'border-brand-400  bg-brand-50'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
            <Scan className="w-5 h-5 text-brand-600" />
            Scan Device
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Step progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done = i < stepIdx
              const active = i === stepIdx
              return (
                <React.Fragment key={s.key}>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    done   ? 'text-green-600' :
                    active ? 'text-brand-700' :
                             'text-slate-300'
                  }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      done   ? 'bg-green-100 text-green-700' :
                      active ? 'bg-brand-100 text-brand-700' :
                               'bg-slate-100 text-slate-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </span>
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px transition-colors ${i < stepIdx ? 'bg-green-300' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Summary of filled data */}
          {(data.imei1 || data.imei2) && (
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 space-y-1 text-xs font-mono">
              {data.imei1 && (
                <div className="flex justify-between text-slate-500">
                  <span className="text-green-600 font-semibold">IMEI 1</span>
                  <span>{data.imei1}</span>
                </div>
              )}
              {data.imei2 && (
                <div className="flex justify-between text-slate-500">
                  <span className="text-green-600 font-semibold">IMEI 2</span>
                  <span>{data.imei2}</span>
                </div>
              )}
            </div>
          )}

          {/* Active field */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2">
              {stepConfig.label}
              <span className="font-normal text-slate-400 mr-1">— {stepConfig.hint}</span>
            </label>
            <div className={`relative rounded-xl border-2 transition-all duration-200 ${inputClass}`}>
              <input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent px-4 py-3.5 font-mono text-lg text-center tracking-widest outline-none"
                placeholder={step !== 'serial' ? '— — — — —' : 'XXXXXXXXXX'}
                dir="ltr"
                autoComplete="off"
                readOnly={flash !== 'idle'}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono select-none">
                {value.length}/{stepConfig.max}
              </span>
              {flash === 'ok' && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!error && (
            <p className="text-xs text-slate-400 text-center">
              سكان أو اكتب {stepConfig.label} ثم اضغط Enter
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
