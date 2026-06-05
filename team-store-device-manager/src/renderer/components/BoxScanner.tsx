import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { X, Camera, AlertCircle, CheckCircle } from 'lucide-react'

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

  // GS1-128/GS1-DataMatrix: (21)SERIAL and (240)IMEI1IMEI2
  const gs1Serial = text.match(/\(21\)([A-Z0-9]{8,15})/i)
  if (gs1Serial) result.serial_number = gs1Serial[1].toUpperCase()
  const gs1Imei = text.match(/\(240\)(\d{15,30})/i)
  if (gs1Imei) {
    result.imei1 = gs1Imei[1].slice(0, 15)
    if (gs1Imei[1].length > 15) result.imei2 = gs1Imei[1].slice(15, 30)
  }
  if (result.serial_number || result.imei1) return result

  // Key-value: S:SERIAL  or  Serial: XXXXX
  const kvSerial = text.match(/(?:^|[\s,;])(?:S|SN|Serial(?:Number)?)\s*[:=]\s*([A-Z0-9]{8,15})/i)
  if (kvSerial) result.serial_number = kvSerial[1].toUpperCase()
  const kvImeis = [...text.matchAll(/IMEI\s*\d?\s*[:=]\s*(\d{15})/gi)]
  if (kvImeis[0]) result.imei1 = kvImeis[0][1]
  if (kvImeis[1]) result.imei2 = kvImeis[1][1]
  if (result.serial_number || result.imei1) return result

  // Standalone 15-digit numbers → IMEI
  const imeiMatches = [...text.matchAll(/\b(\d{15})\b/g)]
  if (imeiMatches[0]) result.imei1 = imeiMatches[0][1]
  if (imeiMatches[1]) result.imei2 = imeiMatches[1][1]

  // Apple serial pattern: 12 alphanumeric (mix of letters + digits, not pure)
  if (!result.serial_number) {
    const candidates = [...text.matchAll(/\b([A-Z][A-Z0-9]{9,14})\b/gi)]
    for (const [, s] of candidates) {
      if (/[A-Z]/i.test(s) && /[0-9]/.test(s)) {
        result.serial_number = s.toUpperCase()
        break
      }
    }
  }

  // Fallback: entire string is serial or IMEI
  if (!result.serial_number && !result.imei1) {
    if (/^\d{15}$/.test(text)) {
      result.imei1 = text
    } else if (/^[A-Z0-9]{10,15}$/i.test(text) && /[A-Z]/i.test(text) && /[0-9]/.test(text)) {
      result.serial_number = text.toUpperCase()
    }
  }

  return result
}

interface Props {
  onResult: (data: BoxScanResult) => void
  onClose: () => void
}

export default function BoxScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const doneRef = useRef(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()

    const start = async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || doneRef.current) return
            doneRef.current = true
            controls.stop()
            setScanned(true)
            const parsed = parseBoxCode(result.getText())
            setTimeout(() => onResult(parsed), 500)
          }
        )
        controlsRef.current = controls
      } catch (err: any) {
        const name = err?.name || ''
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('لم يتم العثور على كاميرا في هذا الجهاز')
        } else {
          setError('افتح: System Settings → Privacy & Security → Camera وشغّل التطبيق')
        }
      }
    }

    start()

    return () => {
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-slate-900" style={{ height: 300 }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Scan overlay – shown while actively scanning */}
          {!scanned && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Dimmed surround */}
              <div
                className="absolute inset-0"
                style={{ background: 'rgba(0,0,0,0.35)' }}
              />
              {/* Scan window */}
              <div className="relative w-52 h-44">
                {/* Clear cutout via box-shadow trick */}
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}
                />
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-brand-400 rounded-tl-md" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-brand-400 rounded-tr-md" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-brand-400 rounded-bl-md" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-brand-400 rounded-br-md" />
                {/* Scan line */}
                <div
                  className="absolute inset-x-3 h-px bg-brand-400 opacity-80"
                  style={{ top: '50%', boxShadow: '0 0 6px 1px rgba(99,102,241,0.8)' }}
                />
              </div>
            </div>
          )}

          {/* Success flash */}
          {scanned && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <div className="bg-white rounded-full p-3 shadow-2xl">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 text-center min-h-[56px] flex items-center justify-center">
          {error ? (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : scanned ? (
            <p className="text-sm font-semibold text-green-600">تم السكان! جاري تعبئة البيانات...</p>
          ) : (
            <p className="text-sm text-slate-500">
              وجّه الكاميرا نحو الباركود أو QR على علبة الأيفون
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
