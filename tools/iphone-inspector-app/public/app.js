'use strict';

// ── SSE ───────────────────────────────────────────────
const es    = new EventSource('/events');
const dot   = document.getElementById('connDot');
const label = document.getElementById('connLabel');
es.onopen    = () => { dot.className = 'conn-dot connected'; label.textContent = 'متصل'; };
es.onerror   = () => { dot.className = 'conn-dot error';     label.textContent = 'انقطع الاتصال...'; };
es.onmessage = e  => render(JSON.parse(e.data));

// ── Retry ─────────────────────────────────────────────
async function retryDetection() {
  const btns = [document.getElementById('retryBtn'), document.getElementById('retrySideBtn')];
  btns.forEach(b => { if (b) { b.disabled = true; b.textContent = '...'; } });
  try { const r = await fetch('/api/retry'); render(await r.json()); }
  catch {}
  btns.forEach(b => { if (b) { b.disabled = false; b.textContent = '↻ إعادة المحاولة'; } });
}

// ── Main render ───────────────────────────────────────
function render({ udids = [], devices = [], deps = {}, diag = {} }) {
  const setupBanner = document.getElementById('setupBanner');
  const waiting     = document.getElementById('waitingState');
  const devInfo     = document.getElementById('deviceInfo');
  const diagPanel   = document.getElementById('diagPanel');
  const autoGrid    = document.getElementById('autoGrid');
  const partsGrid   = document.getElementById('partsGrid');
  const partsSub    = document.getElementById('partsSub');

  if (!deps.ideviceinfo) {
    setupBanner.style.display = 'flex';
    waiting.style.display     = 'block'; devInfo.style.display   = 'none';
    diagPanel.style.display   = 'block'; autoGrid.style.display  = 'none';
    partsGrid.style.display   = 'none';  partsSub.style.display  = 'block';
    label.textContent = 'libimobiledevice غير مثبت';
    document.getElementById('waitingText').innerHTML = 'مطلوب تثبيت<br>libimobiledevice';
    document.getElementById('waitingSub').textContent = 'راجعي التعليمات بالأعلى';
    renderDiag(deps, diag); return;
  }

  setupBanner.style.display = 'none';

  if (!udids.length || !devices.length || !devices[0]) {
    waiting.style.display   = 'block'; devInfo.style.display   = 'none';
    diagPanel.style.display = 'block'; autoGrid.style.display  = 'none';
    partsGrid.style.display = 'none';  partsSub.style.display  = 'block';
    label.textContent = 'في انتظار الجهاز...';
    document.getElementById('waitingText').innerHTML = 'وصّلي الآيفون<br>بكابل USB';
    document.getElementById('waitingSub').textContent = 'ثم اضغطي إعادة المحاولة';
    renderDiag(deps, diag); return;
  }

  // Device connected
  waiting.style.display   = 'none';  devInfo.style.display   = 'block';
  diagPanel.style.display = 'none';  autoGrid.style.display  = 'grid';
  partsGrid.style.display = 'grid';  partsSub.style.display  = 'none';

  const d = devices[0];
  document.getElementById('devName').textContent  = d.DeviceName  || '—';
  document.getElementById('devModel').textContent = d.ModelName   || d.ProductType || '—';
  label.textContent = 'جهاز متصل ✓';

  const pill = document.getElementById('activationPill');
  const act  = d.ActivationState || '';
  if (act === 'Activated') {
    pill.textContent = '✓ مفعّل — iCloud نظيف'; pill.className = 'status-pill status-pill--ok';
  } else if (act === 'WaitingForActivation') {
    pill.textContent = '⚠ في انتظار التفعيل';   pill.className = 'status-pill status-pill--warn';
  } else if (act.includes('Mismatch') || act.includes('Locked')) {
    pill.textContent = '✗ Activation Lock';      pill.className = 'status-pill status-pill--bad';
  } else {
    pill.textContent = act || '—';               pill.className = 'status-pill status-pill--neutral';
  }

  // ── Data cards ──────────────────────────────────────
  renderRows('rowsIdentity', [
    { k: 'الاسم',    v: d.DeviceName },
    { k: 'الموديل',  v: d.ModelName || d.ProductType },
    { k: 'السيريال', v: d.SerialNumber,  cls: 'mono' },
    { k: 'IMEI',     v: d.InternationalMobileEquipmentIdentity,  cls: 'mono' },
    { k: 'IMEI 2',   v: d.InternationalMobileEquipmentIdentity2, cls: 'mono' },
    { k: 'iOS',      v: d.ProductVersion },
    { k: 'Build',    v: d.BuildVersion,  cls: 'mono' },
    { k: 'اللون',    v: d.DeviceColor },
  ]);

  const hNum = d.BatteryHealthPct ? parseInt(d.BatteryHealthPct) : null;
  const hCls = hNum === null ? '' : hNum >= 85 ? 'ok' : hNum >= 80 ? 'warn' : 'bad';
  renderRows('rowsBattery', [
    { k: 'الشحن الحالي',  v: d.BatteryCurrentCapacity ? d.BatteryCurrentCapacity + '%' : null, cls: battCls(d.BatteryCurrentCapacity) },
    { k: 'صحة البطارية', v: d.BatteryHealthPct, cls: hCls },
    { k: 'السعة الحالية', v: d.battNominalCap  ? d.battNominalCap  + ' mAh' : null },
    { k: 'السعة الأصلية', v: d.battDesignCap   ? d.battDesignCap   + ' mAh' : null },
    { k: 'دورات الشحن',  v: d.CycleCount, cls: cycleCls(d.CycleCount) },
    { k: 'الجهد الكهربي', v: d.battVoltage },
    { k: 'الحرارة',       v: d.BatteryTemperature },
    { k: 'يشحن الآن',    v: d.BatteryIsCharging === 'true' ? 'نعم' : d.BatteryIsCharging === 'false' ? 'لا' : null },
  ]);

  renderRows('rowsNetwork', [
    { k: 'رقم الهاتف',  v: d.PhoneNumber },
    { k: 'حالة SIM',    v: simLabel(d.SIMStatus) },
    { k: 'MAC واي فاي', v: d.WifiAddress,      cls: 'mono' },
    { k: 'MAC بلوتوث',  v: d.BluetoothAddress, cls: 'mono' },
  ]);

  const total = d.TotalDiskCapacity    ? Math.round(parseInt(d.TotalDiskCapacity)    / 1e9) + ' GB' : null;
  const avail = d.TotalSystemAvailable ? Math.round(parseInt(d.TotalSystemAvailable) / 1e9) + ' GB' : null;
  renderRows('rowsSystem', [
    { k: 'التخزين الكلي',  v: total },
    { k: 'المتاح',         v: avail },
    { k: 'المعالج',        v: d.CPUArchitecture },
    { k: 'Hardware Model', v: d.HardwareModel, cls: 'mono' },
    { k: 'حالة التفعيل',  v: actLabel(d.ActivationState), cls: act === 'Activated' ? 'ok' : act ? 'bad' : '' },
  ]);

  // ── Parts analysis ──────────────────────────────────
  renderParts(d);
}

// ── Parts analysis ────────────────────────────────────
function renderParts(d) {

  // 🔋 Battery
  const bHealth = d.BatteryHealthPct ? parseInt(d.BatteryHealthPct) : null;
  const bCycles = d.CycleCount ? parseInt(d.CycleCount) : null;
  const bVerdict = d.battVerdict;

  const battVerdictMap = {
    ok:         { label: 'بطارية أصلية سليمة', cls: 'pv-ok' },
    worn:       { label: 'بطارية متهالكة',      cls: 'pv-warn' },
    bad:        { label: 'بطارية ضعيفة جداً',   cls: 'pv-bad' },
    thirdparty: { label: 'بطارية غير أصلية',    cls: 'pv-bad' },
    unknown:    { label: 'لا بيانات',           cls: 'pv-neutral' },
  };
  const bv = battVerdictMap[bVerdict] || battVerdictMap.unknown;
  setPartVerdict('battery', bv.label, bv.cls);
  document.getElementById('ps-battery').textContent =
    bHealth ? `صحة ${bHealth}% — ${bCycles != null ? bCycles + ' دورة' : ''}` : 'لا بيانات — ثبّتي idevicediagnostics';
  renderPartRows('pr-battery', [
    { k: 'صحة البطارية',  v: bHealth ? bHealth + '%' : null,  cls: bHealth >= 85 ? 'ok' : bHealth >= 75 ? 'warn' : 'bad' },
    { k: 'دورات الشحن',   v: bCycles != null ? bCycles + '' : null, cls: cycleCls(bCycles) },
    { k: 'السعة الأصلية', v: d.battDesignCap  ? d.battDesignCap  + ' mAh' : null },
    { k: 'السعة الحالية', v: d.battNominalCap ? d.battNominalCap + ' mAh' : null },
    { k: 'سيريال البطارية', v: d.battSerial || null, cls: 'mono' },
    { k: 'المصنّع',        v: d.battMfr    || null },
    { k: 'الجهد',          v: d.battVoltage || null },
    { k: 'الحرارة',        v: d.BatteryTemperature || null },
  ]);

  // 📱 Screen / True Tone
  const tt = d.trueTone;
  const sv = d.screenVerdict;
  if (tt === 'yes') {
    setPartVerdict('screen', 'شاشة أصلية — True Tone ✓', 'pv-ok');
    document.getElementById('ps-screen').textContent = 'بيانات True Tone موجودة';
    renderPartRows('pr-screen', [
      { k: 'True Tone',    v: 'بيانات المعايرة موجودة ✓', cls: 'ok' },
      { k: 'الدلالة',     v: 'شاشة Apple أصلية محتملة' },
    ]);
  } else if (tt === 'no') {
    setPartVerdict('screen', 'True Tone غير موجود ⚠', 'pv-warn');
    document.getElementById('ps-screen').textContent = 'تحقّقي يدوياً من قطع وخدمة';
    renderPartRows('pr-screen', [
      { k: 'True Tone',    v: 'بيانات المعايرة ناقصة', cls: 'warn' },
      { k: 'الدلالة',     v: 'قد تكون الشاشة مستبدلة' },
      { k: 'تحقّقي من',   v: 'الإعدادات ← معلومات ← قطع وخدمة' },
    ]);
  } else {
    setPartVerdict('screen', 'لا بيانات', 'pv-neutral');
    document.getElementById('ps-screen').textContent = 'فحص يدوي مطلوب';
    renderPartRows('pr-screen', [
      { k: 'التحقّق',     v: 'الإعدادات ← معلومات ← قطع وخدمة' },
    ]);
  }

  // ☁️ iCloud / Activation
  const act = d.ActivationState || '';
  if (act === 'Activated') {
    setPartVerdict('icloud', 'نظيف — iCloud مفعّل ✓', 'pv-ok');
    document.getElementById('ps-icloud').textContent = 'لا يوجد قفل iCloud';
  } else if (act === 'WaitingForActivation') {
    setPartVerdict('icloud', 'في انتظار التفعيل ⚠', 'pv-warn');
    document.getElementById('ps-icloud').textContent = 'قد يكون مقيّداً';
  } else if (act) {
    setPartVerdict('icloud', 'مقفول / Activation Lock ✗', 'pv-bad');
    document.getElementById('ps-icloud').textContent = 'خطر — لا تشتريه!';
  } else {
    setPartVerdict('icloud', 'لا بيانات', 'pv-neutral');
    document.getElementById('ps-icloud').textContent = 'لم يُقرأ';
  }
  renderPartRows('pr-icloud', [
    { k: 'حالة التفعيل', v: actLabel(act) || act || '—', cls: act === 'Activated' ? 'ok' : act ? 'bad' : '' },
    { k: 'IMEI',         v: d.InternationalMobileEquipmentIdentity, cls: 'mono' },
    { k: 'رقم الهاتف',  v: d.PhoneNumber },
  ]);

  // 🔩 Logic Board
  const hasBoard = d.MLBSerialNumber || d.HardwareModel;
  if (hasBoard) {
    setPartVerdict('board', 'بيانات اللوجيك بورد ✓', 'pv-ok');
    document.getElementById('ps-board').textContent = d.MLBSerialNumber || '—';
  } else {
    setPartVerdict('board', 'لا بيانات', 'pv-neutral');
    document.getElementById('ps-board').textContent = 'لم يُقرأ';
  }
  renderPartRows('pr-board', [
    { k: 'سيريال البورد', v: d.MLBSerialNumber, cls: 'mono' },
    { k: 'Hardware Model',v: d.HardwareModel,   cls: 'mono' },
    { k: 'سيريال الجهاز', v: d.SerialNumber,    cls: 'mono' },
    { k: 'المعالج',       v: d.CPUArchitecture },
  ]);
}

function setPartVerdict(id, label, cls) {
  const el = document.getElementById('pv-' + id);
  if (!el) return;
  el.textContent = label;
  el.className   = 'part-verdict ' + cls;
}

function renderPartRows(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = rows.filter(r => r.v).map(r =>
    `<div class="part-row">
      <span class="pr-key">${r.k}</span>
      <span class="pr-val ${r.cls || ''}">${r.v}</span>
    </div>`
  ).join('') || '';
}

// ── Diagnostics panel ─────────────────────────────────
function renderDiag(deps, diag = {}) {
  const hasDevice = diag.deviceList && diag.deviceList.length > 0;
  const steps = [
    { title: 'libimobiledevice', ok: !!deps.ideviceinfo,
      sub: deps.ideviceinfo ? 'مثبت ✓' : 'brew install libimobiledevice' },
    { title: 'usbmuxd', ok: diag.usbmuxd === 'running',
      sub: diag.usbmuxd === 'running' ? 'يعمل ✓' : 'متوقف' },
    { title: 'الآيفون متوصل', ok: hasDevice,
      sub: hasDevice ? diag.deviceList.length + ' جهاز ✓' : 'لم يُكتشف جهاز' },
    { title: 'الإقران / الثقة',
      ok:   diag.pairStatus === 'paired',
      warn: diag.pairStatus === 'locked' || diag.pairStatus === 'not_paired',
      sub: { paired:'مقترن ✓', locked:'⚠ الآيفون مقفول', not_paired:'⚠ اضغطي ثق',
             no_device:'في انتظار الجهاز', tool_missing:'idevicepair ناقص',
             unknown: diag.pairRaw ? diag.pairRaw.split('\n')[0] : '—' }[diag.pairStatus] || '—' },
  ];
  const grid = document.getElementById('diagGrid');
  if (grid) grid.innerHTML = steps.map(s => {
    const cls = s.ok ? 'ok' : s.warn ? 'warn' : 'fail';
    return `<div class="diag-step ${cls}">
      <div class="dstep-icon">${s.ok ? '✓' : s.warn ? '!' : '✗'}</div>
      <div class="dstep-body"><div class="dstep-title">${s.title}</div><div class="dstep-sub">${s.sub}</div></div>
    </div>`;
  }).join('');

  const guide = document.getElementById('diagGuide');
  if (!guide) return;
  const inst = getInstructions(deps, diag);
  if (inst) { guide.style.display = 'block'; guide.innerHTML = `<div class="diag-guide-title">⚡ ${inst.title}</div><ol>${inst.steps.map(s=>`<li>${s}</li>`).join('')}</ol>`; }
  else guide.style.display = 'none';
}

function getInstructions(deps, diag = {}) {
  if (!deps.ideviceinfo) return { title:'ثبّتي libimobiledevice أولاً', steps:['افتحي <strong>Terminal</strong>','اكتبي: <code>brew install libimobiledevice</code>','انتظري حتى ينتهي','شغّلي السيرفر من جديد: <code>npm start</code>'] };
  if (diag.usbmuxd === 'stopped') return { title:'usbmuxd متوقف', steps:['أعيدي تشغيل الماك','شغّلي التطبيق من جديد'] };
  if (!diag.deviceList || !diag.deviceList.length) return { title:'الآيفون غير مكتشف', steps:['تأكدي إن الكابل <strong>كابل بيانات</strong>','وصّلي <strong>مباشرة بالماك</strong> بدون hub','<strong>افتحي الآيفون</strong>','لو ظهرت رسالة <strong>"ثق"</strong> → اضغطيها','اضغطي <strong>↻ إعادة المحاولة</strong>'] };
  if (diag.pairStatus === 'locked') return { title:'الآيفون مقفول', steps:['<strong>افتحي الآيفون</strong> بالباسورد','اضغطي <strong>↻ إعادة المحاولة</strong>'] };
  if (diag.pairStatus === 'not_paired') return { title:'يحتاج الإقران', steps:['ابحثي على الآيفون عن <strong>"هل تثق بهذا الكمبيوتر؟"</strong>','اضغطي <strong>ثق</strong>','اضغطي <strong>↻ إعادة المحاولة</strong>'] };
  return null;
}

// ── Helpers ───────────────────────────────────────────
function renderRows(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = rows.filter(r => r.v).map(r =>
    `<div class="data-row"><span class="data-key">${r.k}</span><span class="data-val ${r.cls||''}">${r.v}</span></div>`
  ).join('') || '<div class="data-row"><span class="data-key" style="color:var(--faint)">لا بيانات</span></div>';
}
function battCls(v)  { const n=parseInt(v); if(!n)return''; return n>=50?'ok':n>=20?'warn':'bad'; }
function cycleCls(v) { const n=parseInt(v); if(!n)return''; return n<300?'ok':n<700?'warn':'bad'; }
function actLabel(v) { if(!v)return null; if(v==='Activated')return'مفعّل ✓'; if(v==='WaitingForActivation')return'في انتظار التفعيل'; return v; }
function simLabel(v) { if(!v)return null; if(v==='kCTSIMSupportSIMStatusReady')return'شريحة جاهزة ✓'; if(v==='kCTSIMSupportSIMStatusNotInserted')return'لا توجد شريحة'; return v; }

// ── Manual checks ─────────────────────────────────────
const mState = {};
function mMark(evt, id, status) {
  evt.stopPropagation();
  const card = document.getElementById(id);
  card.classList.remove('ok','fail','skip');
  const b = document.getElementById('mb-' + id.replace('m-',''));
  if (mState[id] === status) { delete mState[id]; b.textContent = ''; }
  else { mState[id] = status; card.classList.add(status); b.textContent = status==='ok'?'✓':status==='fail'?'✗':'–'; }
}
function toggleM(id) { document.getElementById(id).classList.toggle('expanded'); }

// ── Nav scroll spy ────────────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
      const a = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
      if (a) a.classList.add('active');
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('#auto,#parts,#manual').forEach(el => obs.observe(el));
