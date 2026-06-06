import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { X, Camera, CheckCircle, Settings } from 'lucide-react'
import { api } from '../lib/api'

export interface BoxScanResult {
  serial_number?: string
  imei1?: string
  imei2?: string
}

function parseBoxCode(raw: string): BoxScanResult | null {
  const result: BoxScanResult = {}
  const text = raw.trim()

  // Skip EID barcodes (32 digits starting with 89)
  if (/^89\d{30}$/.test(text)) return null

  // JSON
  try {
    const json = JSON.parse(text)
    if (json.serialNumber || json.SerialNumber)
      result.serial_number = (json.serialNumber || json.SerialNumber).toUpperCase()
    if (json.imei || json.IMEI || json.IMEINumber1)
      result.imei1 = String(json.imei || json.IMEI || json.IMEINumber1)
    if (json.imei2 || json.IMEI2 || json.IMEINumber2)
      result.imei2 = String(json.imei2 || json.IMEI2 || json.IMEINumber2)
    if (result.serial_number || result.imei1) return result
  } catch {}

  // 15-digit IMEI
  const imeiMatches = [...text.matchAll(/\b(\d{15})\b/g)]
  if (imeiMatches[0]) result.imei1 = imeiMatches[0][1]
  if (imeiMatches[1]) result.imei2 = imeiMatches[1][1]
  if (result.imei1) return result

  // Apple serial: exactly 12 alphanumeric (letters + digits)
  if (/^[A-Z][A-Z0-9]{11}$/i.test(text) && /[A-Z]/i.test(text) && /[0-9]/.test(text)) {
    result.serial_number = text.toUpperCase()
    return result
  }

  // Serial inside longer string
  const candidates = [...text.matchAll(/\b([A-Z][A-Z0-9]{9,14})\b/gi)]
  for (const [, s] of candidates) {
    if (/[A-Z]/i.test(s) && /[0-9]/.test(s)) {
      result.serial_number = s.toUpperCase()
      return result
    }
  }

  return null
}

const ZX_HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
])

type Screen = 'requesting' | 'denied' | 'scanning' | 'scanned'

interface Props {
  onResult: (data: BoxScanResult) => void
  onClose: () => void
}

export default function BoxScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const zxControlsRef = useRef<{ stop: () => void } | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef = useRef(false)
  const [screen, setScreen] = useState<Screen>('requesting')
  const [hint, setHint] = useState('')

  const handleRaw = (raw: string) => {
    if (doneRef.current) return
    const parsed = parseBoxCode(raw)
    if (!parsed) {
      setHint('باركود EID — اسكان الباركود التاني')
      setTimeout(() => setHint(''), 1800)
      return
    }
    doneRef.current = true
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    zxControlsRef.current?.stop()
    setScreen('scanned')
    setTimeout(() => onResult(parsed), 500)
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // 1. Request macOS camera permission
      let granted = true
      try { granted = await api.camera.requestAccess() } catch {}
      if (cancelled) return
      if (!granted) { setScreen('denied'); return }

      // 2. Open camera stream
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        })
      } catch {
        if (!cancelled) setScreen('denied')
        return
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

      streamRef.current = stream
      videoRef.current!.srcObject = stream
      await videoRef.current!.play()
      if (!cancelled) setScreen('scanning')

      // 3. Use native BarcodeDetector (Apple Vision) if available, else ZXing
      const hasBD = 'BarcodeDetector' in window
      if (hasBD) {
        let detector: any
        try {
          detector = new (window as any).BarcodeDetector({ formats: ['code_128', 'qr_code'] })
        } catch {
          detector = new (window as any).BarcodeDetector()
        }

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        const loop = async () => {
          if (doneRef.current || !videoRef.current) return
          const v = videoRef.current
          if (v.readyState >= 2 && v.videoWidth > 0) {
            canvas.width = v.videoWidth
            canvas.height = v.videoHeight
            ctx.drawImage(v, 0, 0)
            try {
              const codes: any[] = await detector.detect(canvas)
              if (codes.length > 0) handleRaw(codes[0].rawValue)
            } catch {}
          }
          if (!doneRef.current) scanTimerRef.current = setTimeout(loop, 250)
        }
        loop()
      } else {
        // ZXing fallback
        const reader = new BrowserMultiFormatReader(ZX_HINTS)
        const controls = await reader.decodeFromStream(stream, videoRef.current!, (result) => {
          if (result) handleRaw(result.getText())
        })
        zxControlsRef.current = controls
      }
    }

    init()

    return () => {
      cancelled = true
      doneRef.current = true
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
      zxControlsRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
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

        {/* Denied */}
        {screen === 'denied' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <Camera className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">التطبيق محتاج إذن الكاميرا</p>
              <p className="text-sm text-slate-500">اضغط وأذن للتطبيق، ثم ارجع وافتح السكان من جديد</p>
            </div>
            <button onClick={() => api.camera.openSettings()} className="btn-primary w-full justify-center gap-2">
              <Settings className="w-4 h-4" />
              افتح إعدادات الخصوصية
            </button>
          </div>
        )}

        {/* Camera */}
        {(screen === 'requesting' || screen === 'scanning' || screen === 'scanned') && (
          <>
            <div className="relative bg-slate-900" style={{ height: 320 }}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

              {screen === 'requesting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-slate-400 text-sm animate-pulse">جاري تشغيل الكاميرا...</p>
                </div>
              )}

              {screen === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
                  <div className="relative w-56 h-40">
                    <div className="absolute inset-0 rounded-lg" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }} />
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-brand-400 rounded-tl-md" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-brand-400 rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-brand-400 rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-brand-400 rounded-br-md" />
                    <div className="absolute inset-x-3 h-px bg-brand-400"
                      style={{ top: '50%', boxShadow: '0 0 8px 2px rgba(99,102,241,0.8)' }} />
                  </div>
                </div>
              )}

              {screen === 'scanned' && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <div className="bg-white rounded-full p-3 shadow-2xl">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 text-center min-h-[68px] flex flex-col items-center justify-center gap-1">
              {screen === 'scanned' ? (
                <p className="text-sm font-semibold text-green-600">تم السكان! جاري تعبئة البيانات...</p>
              ) : hint ? (
                <p className="text-sm font-medium text-amber-600">{hint}</p>
              ) : (
                <>
                  <p className="text-sm text-slate-700 font-medium">اسكان الباركود جنب Serial No. أو IMEI</p>
                  <p className="text-xs text-slate-400">مش الباركود الكبير اللي فوق</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
