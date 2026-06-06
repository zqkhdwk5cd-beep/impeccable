import { api } from './api'

const BOX_LABELS: Record<string, string> = {
  with_box: 'مع الكرتون',
  without_box: 'بدون كرتون',
  damaged_box: 'كرتون تالف',
}

export interface LabelConfig {
  warranty: string
  widthMm: number
  heightMm: number
  printerName?: string
  silent?: boolean
}

export function buildLabelHtml(device: any, cfg: LabelConfig): string {
  const w = cfg.widthMm  || 50
  const h = cfg.heightMm || 30

  const model   = (device.model   || '').replace(/^iPhone\s*/i, '')
  const storage = (device.storage || '').replace(/GB$/i, '')
  const battery = device.battery_health ? `${device.battery_health}%` : ''
  const deviceLine = [model, storage, battery].filter(Boolean).join(' - ')

  const boxText  = device.box_status ? (BOX_LABELS[device.box_status] || '') : ''
  const subLine  = [boxText, cfg.warranty].filter(Boolean).join('  •  ')

  const teamPt  = +(h * 0.30).toFixed(1)
  const storePt = +(h * 0.13).toFixed(1)
  const devPt   = +(h * 0.26).toFixed(1)
  const subPt   = +(h * 0.19).toFixed(1)
  const iconH   = +(h * 0.38).toFixed(1)
  const iconW   = +(iconH * 0.72).toFixed(1)

  return `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${w}mm ${h}mm;
    margin: 0 !important;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${w}mm;
    height: ${h}mm;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    background: white;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { display: flex; align-items: center; justify-content: center; }
  .label {
    width: ${w}mm;
    height: ${h}mm;
    padding: 1mm 2mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4mm;
    text-align: center;
    overflow: hidden;
    background: white;
  }
  .logo-row { display: flex; align-items: center; justify-content: center; gap: 1.2mm; }
  .brand-text { display: flex; flex-direction: column; line-height: 1.05; text-align: left; }
  .team  { font-size: ${teamPt}pt;  font-weight: 900; color: #000; letter-spacing: 0.5px; }
  .store { font-size: ${storePt}pt; font-weight: 800; color: #000; letter-spacing: 2px; }
  .device-line { font-size: ${devPt}pt; font-weight: 900; color: #000; direction: ltr; letter-spacing: 0.2px; line-height: 1.1; }
  .sub-line    { font-size: ${subPt}pt; font-weight: 700; color: #000; direction: rtl; line-height: 1.1; }
</style>
</head>
<body>
<div class="label">
  <div class="logo-row">
    <svg width="${iconW}mm" height="${iconH}mm" viewBox="0 0 20 29" fill="none">
      <rect x="1.5" y="1.5" width="17" height="26" rx="3.5" stroke="#000" stroke-width="2.5"/>
      <circle cx="10" cy="5.5" r="1.6" fill="#000"/>
      <rect x="5" y="23" width="10" height="2" rx="1" fill="#000"/>
    </svg>
    <div class="brand-text">
      <span class="team">TEAM</span>
      <span class="store">STORE</span>
    </div>
  </div>
  <div class="device-line">${deviceLine}</div>
  ${subLine ? `<div class="sub-line">${subLine}</div>` : ''}
</div>
</body>
</html>`
}

export async function openLabelPrint(device: any, cfg: LabelConfig): Promise<void> {
  const html = buildLabelHtml(device, cfg)
  try {
    const result = await api.printers.printLabel(html, {
      widthMm:     cfg.widthMm  || 50,
      heightMm:    cfg.heightMm || 30,
      printerName: cfg.printerName || '',
      silent:      cfg.silent ?? false,
    })
    if (!result.success && result.reason) {
      console.error('Label print failed:', result.reason)
    }
  } catch (err) {
    console.error('Label print error:', err)
  }
}
