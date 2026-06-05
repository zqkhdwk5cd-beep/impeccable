import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { X, Camera, AlertCircle, CheckCircle, Settings } from 'lucide-react'
import { api } from '../lib/api'

export interface BoxScanResult {
  serial_number?: string
  imei1?: string
  imei2?: string
}

function parseBoxCode(raw: string): BoxScanResult {
  const result: BoxScanResult = {}
  const text = raw.trim()

  // JSON format
  try {
    const json = JSON.parse(text)
    if (json.serialNumber || json.SerialNumber)
      result.serial_number = (json.serialNumber || json.SerialNumber).toUpperCase()
    if (json.imei || json.IMEI || json.IMEINumber1)
      result.imei1 = String(json.imei || json.IMEI || json.IMEINumber1)
    if (json.imei2 || json.IMEI2 || json.IMEINumber2)
      result.imei2 = String(json.imei2 || json.IMEI2 || json.IMEINumber2)
    return result
  } catch {}

  // GS1-128: (21)SERIAL and (240)IMEI1IMEI2
  const gs1Serial = text.match(/\(21\)([A-Z0-9]{8,15})/i)
  if (gs1Serial) result.serial_number = gs1Serial[1].toUpperCase()
  const gs1Imei = text.match(/\(240\)(\d{15,30})/i)
  if (gs1Imei) {
    result.imei1 = gs1Imei[1].slice(0, 15)
    if (gs1Imei[1].length > 15) result.imei2 = gs1Imei[1].slice(15, 30)
  }
  if (result.serial_number || result.imei1) return result

  // Key-value: S:SERIAL or Serial: XXXXX
  const kvSerial = text.match(/(?:^|[\s,;])(?:S|SN|Serial(?:Number)?)\s*[:=]\s*([A-Z0-9]{8,15})/i)
  if (kvSerial) result.serial_number = kvSerial[1].toUpperCase()
  const kvImeis = [...text.matchAll(/IMEI\s*\d?\s*[:=]\s*(\d{15})/gi)]
  if (kvImeis[0]) result.imei1 = kvImeis[0][1]
  if (kvImeis[1]) result.imei2 = kvImeis[1][1]
  if (result.serial_number || result.imei1) return result

  // Standalone 15-digit → IMEI
  const imeiMatches = [...text.matchAll(/\b(\d{15})\b/g)]
  if (imeiMatches[0]) result.imei1 = imeiMatches[0][1]
  if (imeiMatches[1]) result.imei2 = imeiMatches[1][1]

  // Apple serial: alphanumeric mix, 10–15 chars
  if (!result.serial_number) {
    const candidates = [...text.matchAll(/\b([A-Z][A-Z0-9]{9,14})\b/gi)]
    for (const [, s] of candidates) {
      if (/[A-Z]/i.test(s) && /[0-9]/.test(s)) {
        result.serial_number = s.toUpperCase()
        break
      }
    }
  }

  // Fallback: whole string is serial or IMEI
  if (!result.serial_number && !result.imei1) {
    if (/^\d{15}$/.test(text)) {
      result.imei1 = text
    } else if (/^[A-Z0-9]{10,15}$/i.test(text) && /[A-Z]/i.test(text) && /[0-9]/.test(text)) {
      result.serial_number = text.toUpperCase()
    }
  }

  return result
}

type ScreenState = 'requesting' | 'denied' | 'scanning' | 'scanned' | 'error'

interface Props {
  onResult: (data: BoxScanResult) => void
  onClose: () => void
}

export default function BoxScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const doneRef = useRef(false)
  const [screen, setScreen] = useState<ScreenState>('requesting')

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Step 1: ask macOS for camera permission via main process
      let granted = true
      try {
        granted = await api.camera.requestAccess()
      } catch {
        // non-macOS or IPC error — proceed and let getUserMedia decide
      }

      if (cancelled) return

      if (!granted) {
        setScreen('denied')
        return
      }

      // Step 2: start ZXing scanner
      try {
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || doneRef.current) return
            doneRef.current = true
            controls.stop()
            setScreen('scanned')
            setTimeout(() => onResult(parseBoxCode(result.getText())), 500)
          }
        )
        controlsRef.current = controls
        if (!cancelled) setScreen('scanning')
      } catch {
        if (!cancelled) setScreen('denied')
      }
    }

    init()

    return () => {
      cancelled = true
      doneRef.current = true
      controlsRef.current?.stop()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-600" />
            سكان علبة الأيفون
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Denied screen */}
        {screen === 'denied' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <Camera className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">التطبيق محتاج إذن الكاميرا</p>
              <p className="text-sm text-slate-500">اضغط الزرار واذن للتطبيق، ثم ارجع وافتح السكان من جديد</p>
            </div>
            <button
              onClick={() => api.camera.openSettings()}
              className="btn-primary w-full justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              افتح إعدادات الخصوصية
            </button>
          </div>
        )}

        {/* Camera viewport — shown during requesting/scanning/scanned */}
        {(screen === 'requesting' || screen === 'scanning' || screen === 'scanned') && (
          <>
            <div className="relative bg-slate-900" style={{ height: 300 }}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

              {/* Scan overlay */}
              {screen === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
                  <div className="relative w-52 h-44">
                    <div className="absolute inset-0 rounded-lg" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-brand-400 rounded-tl-md" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-brand-400 rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-brand-400 rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-brand-400 rounded-br-md" />
                    <div className="absolute inset-x-3 h-px bg-brand-400 opacity-80"
                      style={{ top: '50%', boxShadow: '0 0 6px 2px rgba(99,102,241,0.7)' }} />
                  </div>
                </div>
              )}

              {/* Loading */}
              {screen === 'requesting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="text-slate-400 text-sm animate-pulse">جاري تشغيل الكاميرا...</div>
                </div>
              )}

              {/* Success */}
              {screen === 'scanned' && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <div className="bg-white rounded-full p-3 shadow-2xl">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 text-center min-h-[56px] flex items-center justify-center">
              {screen === 'scanned' ? (
                <p className="text-sm font-semibold text-green-600">تم السكان! جاري تعبئة البيانات...</p>
              ) : (
                <p className="text-sm text-slate-500">وجّه الكاميرا نحو الباركود أو QR على علبة الأيفون</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
