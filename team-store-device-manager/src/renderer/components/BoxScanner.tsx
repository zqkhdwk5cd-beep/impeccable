import React, { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { X, Camera, CheckCircle, Settings, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'

export interface BoxScanResult {
  serial_number?: string
  imei1?: string
  imei2?: string
}

// ---------- parsing ----------

function parseOne(raw: string): Partial<BoxScanResult> {
  const t = raw.trim()
  if (!t) return {}
  // Skip EID (32-digit starting with 89)
  if (/^89\d{30}$/.test(t)) return {}
  // Pure 15-digit → IMEI
  if (/^\d{15}$/.test(t)) return { imei1: t }
  // Exact Apple serial: 12 alphanumeric with mix of letters + digits
  if (/^[A-Z][A-Z0-9]{11}$/i.test(t) && /[A-Z]/i.test(t) && /\d/.test(t))
    return { serial_number: t.toUpperCase() }
  // Multi-value string
  const result: Partial<BoxScanResult> = {}
  const imeis = [...t.matchAll(/\b(\d{15})\b/g)]
  if (imeis[0]) result.imei1 = imeis[0][1]
  if (imeis[1]) result.imei2 = imeis[1][1]
  if (!result.serial_number) {
    for (const [, s] of t.matchAll(/\b([A-Z][A-Z0-9]{9,14})\b/gi)) {
      if (/[A-Z]/i.test(s) && /\d/.test(s)) { result.serial_number = s.toUpperCase(); break }
    }
  }
  return result
}

function merge(acc: BoxScanResult, partial: Partial<BoxScanResult>): BoxScanResult {
  const n = { ...acc }
  if (partial.serial_number && !n.serial_number) n.serial_number = partial.serial_number
  if (partial.imei1) {
    if (!n.imei1) n.imei1 = partial.imei1
    else if (partial.imei1 !== n.imei1 && !n.imei2) n.imei2 = partial.imei1
  }
  if (partial.imei2 && !n.imei2) n.imei2 = partial.imei2
  return n
}

function hasData(r: BoxScanResult) { return !!(r.serial_number || r.imei1 || r.imei2) }

// ---------- bounding box ----------

function drawBox(overlay: HTMLCanvasElement, video: HTMLVideoElement, pts: { x: number; y: number }[]) {
  if (!pts.length) return
  const cW = overlay.clientWidth
  const cH = overlay.clientHeight
  const vW = video.videoWidth
  const vH = video.videoHeight
  if (!cW || !cH || !vW || !vH) return

  // object-cover transform
  const scale = Math.max(cW / vW, cH / vH)
  const ox = (vW * scale - cW) / 2
  const oy = (vH * scale - cH) / 2

  overlay.width = cW
  overlay.height = cH
  const ctx = overlay.getContext('2d')!
  ctx.clearRect(0, 0, cW, cH)

  ctx.strokeStyle = '#6366f1'
  ctx.fillStyle = 'rgba(99,102,241,0.12)'
  ctx.lineWidth = 2.5
  ctx.shadowColor = '#6366f1'
  ctx.shadowBlur = 10
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(pts[0].x * scale - ox, pts[0].y * scale - oy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * scale - ox, pts[i].y * scale - oy)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  setTimeout(() => ctx.clearRect(0, 0, cW, cH), 700)
}

// ---------- ZXing hints ----------

const ZX_HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
])

// ---------- component ----------

type Screen = 'requesting' | 'denied' | 'scanning'

interface Props {
  onResult: (data: BoxScanResult) => void
  onClose: () => void
}

export default function BoxScanner({ onResult, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const zxRef      = useRef<{ stop: () => void } | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef    = useRef(false)
  const accRef     = useRef<BoxScanResult>({})

  const [screen, setScreen]   = useState<Screen>('requesting')
  const [result, setResult]   = useState<BoxScanResult>({})
  const [flash, setFlash]     = useState(false)
  const [eidHint, setEidHint] = useState(false)

  // ---- process one scanned raw value ----
  const processRaw = useCallback((raw: string, cornerPts?: { x: number; y: number }[]) => {
    const t = raw.trim()

    // EID barcode hint
    if (/^89\d{30}$/.test(t)) {
      setEidHint(true)
      setTimeout(() => setEidHint(false), 1800)
      return
    }

    const partial = parseOne(t)
    if (!partial.serial_number && !partial.imei1 && !partial.imei2) return

    const next = merge(accRef.current, partial)
    accRef.current = next
    setResult({ ...next })

    // Flash feedback
    setFlash(true)
    setTimeout(() => setFlash(false), 280)

    // Draw bounding box
    if (cornerPts && overlayRef.current && videoRef.current) {
      drawBox(overlayRef.current, videoRef.current, cornerPts)
    }
  }, [])

  // ---- camera init ----
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // 1. macOS permission
      let granted = true
      try { granted = await api.camera.requestAccess() } catch {}
      if (cancelled) return
      if (!granted) { setScreen('denied'); return }

      // 2. camera stream
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch { if (!cancelled) setScreen('denied'); return }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      if (!cancelled) setScreen('scanning')

      // 3. BarcodeDetector (Apple Vision) — primary
      if ('BarcodeDetector' in window) {
        let detector: any
        try { detector = new (window as any).BarcodeDetector({ formats: ['code_128', 'qr_code', 'ean_13', 'data_matrix'] }) }
        catch { detector = new (window as any).BarcodeDetector() }

        const cap = document.createElement('canvas')
        const capCtx = cap.getContext('2d')!

        const loop = async () => {
          if (doneRef.current || !videoRef.current) return
          const v = videoRef.current
          if (v.readyState >= 2 && v.videoWidth > 0) {
            cap.width = v.videoWidth
            cap.height = v.videoHeight
            capCtx.drawImage(v, 0, 0)
            try {
              const codes: any[] = await detector.detect(cap)
              for (const c of codes) processRaw(c.rawValue, c.cornerPoints)
            } catch {}
          }
          if (!doneRef.current) timerRef.current = setTimeout(loop, 250)
        }
        loop()

      } else {
        // 4. ZXing — fallback
        const reader = new BrowserMultiFormatReader(ZX_HINTS)
        const controls = await reader.decodeFromStream(stream, video, (res) => {
          if (res) processRaw(res.getText())
        })
        zxRef.current = controls
      }
    }

    init()
    return () => {
      cancelled = true
      doneRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      zxRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [processRaw])

  const stopCamera = () => {
    doneRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    zxRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const handleConfirm = () => { stopCamera(); onResult(result) }

  const handleRescan = () => {
    accRef.current = {}
    setResult({})
    setEidHint(false)
  }

  const got = hasData(result)

  // ---- render ----
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
            <Camera className="w-5 h-5 text-brand-600" />
            سكان علبة الأيفون
          </h2>
          <button onClick={() => { stopCamera(); onClose() }} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* ---- Denied ---- */}
        {screen === 'denied' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <Camera className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">التطبيق محتاج إذن الكاميرا</p>
              <p className="text-sm text-slate-500">اضغط وأذن للتطبيق، ثم افتح السكان من جديد</p>
            </div>
            <button onClick={() => api.camera.openSettings()} className="btn-primary w-full justify-center gap-2">
              <Settings className="w-4 h-4" /> افتح إعدادات الخصوصية
            </button>
          </div>
        )}

        {/* ---- Camera ---- */}
        {(screen === 'requesting' || screen === 'scanning') && (
          <>
            {/* Video viewport */}
            <div className="relative bg-slate-900 overflow-hidden" style={{ height: 290 }}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

              {/* Bounding-box overlay */}
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

              {/* Requesting state */}
              {screen === 'requesting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <p className="text-slate-400 text-sm animate-pulse">جاري تشغيل الكاميرا...</p>
                </div>
              )}

              {/* Scan guide — shown while no data yet */}
              {screen === 'scanning' && !got && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} />
                  <div className="relative w-56 h-32">
                    <div className="absolute inset-0 rounded-lg" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.28)' }} />
                    {/* corners */}
                    {[
                      'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-md',
                      'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-md',
                      'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md',
                      'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md',
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-5 h-5 border-brand-400 ${cls}`} />
                    ))}
                    {/* scan line */}
                    <div className="absolute inset-x-3 h-px bg-brand-400 animate-pulse"
                      style={{ top: '50%', boxShadow: '0 0 8px 2px rgba(99,102,241,0.8)' }} />
                  </div>
                </div>
              )}

              {/* Detection flash */}
              {flash && <div className="absolute inset-0 bg-brand-400/20 pointer-events-none" />}

              {/* "Data found" banner inside video */}
              {got && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                  <p className="text-white text-xs font-medium text-center">
                    ✓ تم اكتشاف البيانات — اسكان المزيد أو اضغط تأكيد
                  </p>
                </div>
              )}
            </div>

            {/* Results panel */}
            <div className="p-4 space-y-3">

              {/* 3 indicator boxes */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'Serial', value: result.serial_number },
                  { label: 'IMEI 1', value: result.imei1 },
                  { label: 'IMEI 2', value: result.imei2 },
                ] as const).map(({ label, value }) => (
                  <div key={label} className={`rounded-xl p-2.5 text-center border-2 transition-all duration-300 ${
                    value ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`text-xs font-semibold mb-1 ${value ? 'text-green-700' : 'text-slate-400'}`}>
                      {label}
                      {value && <span className="ml-1">✓</span>}
                    </div>
                    <div className={`text-xs font-mono leading-tight break-all ${value ? 'text-green-900' : 'text-slate-300'}`}>
                      {value ?? '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hint messages */}
              {eidHint && (
                <p className="text-xs text-amber-600 text-center font-medium bg-amber-50 rounded-lg py-1.5 px-3">
                  باركود EID — اسكان الباركود التاني (جنب Serial أو IMEI)
                </p>
              )}
              {!eidHint && !got && (
                <p className="text-xs text-slate-400 text-center">
                  وجّه الكاميرا للباركود جنب Serial No. أو IMEI
                </p>
              )}

              {/* Action buttons — appear only when data detected */}
              {got && (
                <div className="flex gap-2 pt-1">
                  <button onClick={handleRescan} className="btn-secondary flex-1 justify-center gap-1.5 text-sm py-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    سكان آخر
                  </button>
                  <button onClick={handleConfirm} className="btn-primary flex-1 justify-center gap-1.5 text-sm py-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    تأكيد
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
