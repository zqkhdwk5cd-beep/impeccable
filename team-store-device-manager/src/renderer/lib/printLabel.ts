const BOX_LABELS: Record<string, string> = {
  with_box: 'مع الكرتون',
  without_box: 'بدون كرتون',
  damaged_box: 'كرتون تالف',
}

export interface LabelConfig {
  warranty: string
  widthMm: number
  heightMm: number
}

export function openLabelPrint(device: any, cfg: LabelConfig) {
  const w = cfg.widthMm || 50
  const h = cfg.heightMm || 30

  const model   = (device.model   || '').replace(/^iPhone\s*/i, '')
  const storage = (device.storage || '').replace(/GB$/i, '')
  const battery = device.battery_health ? `${device.battery_health}%` : ''
  const deviceLine = [model, storage, battery].filter(Boolean).join(' - ')

  const boxText = device.box_status ? (BOX_LABELS[device.box_status] || '') : ''
  const subParts = [boxText, cfg.warranty].filter(Boolean)
  const subLine  = subParts.join('  •  ')

  // Scale font sizes to label height
  const teamPt  = +(h * 0.30).toFixed(1)
  const storePt = +(h * 0.14).toFixed(1)
  const devPt   = +(h * 0.27).toFixed(1)
  const subPt   = +(h * 0.20).toFixed(1)

  // SVG phone icon scaled to label height (in mm → viewport units)
  const iconH = +(h * 0.40).toFixed(1)
  const iconW = +(iconH * 0.72).toFixed(1)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${w}mm ${h}mm;
    margin: 0;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html {
    width: ${w}mm;
    height: ${h}mm;
    overflow: hidden;
  }
  body {
    width: ${w}mm;
    height: ${h}mm;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    background: white;
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .label {
    width: ${w}mm;
    height: ${h}mm;
    padding: 1.2mm 2mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5mm;
    text-align: center;
    overflow: hidden;
  }
  .logo-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5mm;
  }
  .brand-text {
    display: flex;
    flex-direction: column;
    line-height: 1.05;
    text-align: left;
  }
  .team  { font-size: ${teamPt}pt;  font-weight: 900; color: #000; letter-spacing: 0.4px; }
  .store { font-size: ${storePt}pt; font-weight: 800; color: #000; letter-spacing: 2.5px;  }
  .device-line {
    font-size: ${devPt}pt;
    font-weight: 900;
    color: #000;
    direction: ltr;
    letter-spacing: 0.3px;
    line-height: 1.1;
  }
  .sub-line {
    font-size: ${subPt}pt;
    font-weight: 700;
    color: #000;
    direction: rtl;
    line-height: 1.1;
  }

  /* Screen preview only — never affects print */
  @media screen {
    html { background: #b0b0b0; width: 100%; height: 100%; }
    body {
      width: 100vw;
      height: 100vh;
      background: transparent;
    }
    .label {
      background: white;
      border-radius: 2mm;
      box-shadow: 0 3px 20px rgba(0,0,0,0.35);
      /* Magnify for readability on screen */
      transform: scale(2.8);
      transform-origin: center center;
    }
  }
</style>
</head>
<body>
<div class="label">
  <div class="logo-row">
    <svg width="${iconW}mm" height="${iconH}mm" viewBox="0 0 20 29" fill="none" xmlns="http://www.w3.org/2000/svg">
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
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 350);
  };
</script>
</body>
</html>`

  const win = window.open(
    '',
    '_blank',
    `width=420,height=280,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no`
  )
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
