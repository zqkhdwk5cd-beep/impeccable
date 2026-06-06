'use strict';

// ── SSE connection ────────────────────────────────────
const es    = new EventSource('/events');
const dot   = document.getElementById('connDot');
const label = document.getElementById('connLabel');

es.onopen  = () => { dot.className = 'conn-dot connected'; label.textContent = 'متصل'; };
es.onerror = () => { dot.className = 'conn-dot error'; label.textContent = 'انقطع الاتصال...'; };
es.onmessage = (e) => render(JSON.parse(e.data));

// ── Retry detection ───────────────────────────────────
async function retryDetection() {
  const btns = [document.getElementById('retryBtn'), document.getElementById('retrySideBtn')];
  btns.forEach(b => { if (b) { b.disabled = true; b.textContent = '...'; } });
  try {
    const res  = await fetch('/api/retry');
    const data = await res.json();
    render(data);
  } catch (e) { console.error(e); }
  finally {
    btns.forEach(b => { if (b) { b.disabled = false; b.textContent = '↻ إعادة المحاولة'; } });
  }
}

// ── Render ────────────────────────────────────────────
function render({ udids = [], devices = [], deps = {}, diag = {} }) {
  const setupBanner = document.getElementById('setupBanner');
  const waiting     = document.getElementById('waitingState');
  const devInfo     = document.getElementById('deviceInfo');
  const diagPanel   = document.getElementById('diagPanel');
  const autoGrid    = document.getElementById('autoGrid');

  // No libimobiledevice
  if (!deps.ideviceinfo) {
    setupBanner.style.display = 'flex';
    waiting.style.display     = 'block';
    devInfo.style.display     = 'none';
    diagPanel.style.display   = 'block';
    autoGrid.style.display    = 'none';
    label.textContent = 'libimobiledevice غير مثبت';
    document.getElementById('waitingText').innerHTML = 'مطلوب تثبيت<br>libimobiledevice';
    document.getElementById('waitingSub').textContent = 'راجعي التعليمات بالأعلى';
    renderDiag(deps, diag);
    return;
  }

  setupBanner.style.display = 'none';

  // No device connected
  if (!udids.length || !devices.length || !devices[0]) {
    waiting.style.display   = 'block';
    devInfo.style.display   = 'none';
    diagPanel.style.display = 'block';
    autoGrid.style.display  = 'none';
    label.textContent = 'في انتظار الجهاز...';
    document.getElementById('waitingText').innerHTML = 'وصّلي الآيفون<br>بكابل USB';
    document.getElementById('waitingSub').textContent = 'ثم اضغطي "إعادة المحاولة"';
    renderDiag(deps, diag);
    return;
  }

  // Device connected
  waiting.style.display   = 'none';
  devInfo.style.display   = 'block';
  diagPanel.style.display = 'none';
  autoGrid.style.display  = 'grid';

  const d = devices[0];
  document.getElementById('devName').textContent  = d.DeviceName  || '—';
  document.getElementById('devModel').textContent = d.ModelName   || d.ProductType || '—';
  label.textContent = 'جهاز متصل ✓';

  const pill = document.getElementById('activationPill');
  const act  = d.ActivationState || '';
  if (act === 'Activated') {
    pill.textContent = '✓ مفعّل — iCloud نظيف';
    pill.className   = 'status-pill status-pill--ok';
  } else if (act === 'WaitingForActivation') {
    pill.textContent = '⚠ في انتظار التفعيل';
    pill.className   = 'status-pill status-pill--warn';
  } else if (act.includes('Mismatch') || act.includes('Locked')) {
    pill.textContent = '✗ مقفل / Activation Lock';
    pill.className   = 'status-pill status-pill--bad';
  } else {
    pill.textContent = act || '—';
    pill.className   = 'status-pill status-pill--neutral';
  }

  renderRows('rowsIdentity', [
    { k: 'الاسم',    v: d.DeviceName },
    { k: 'الموديل',  v: d.ModelName || d.ProductType },
    { k: 'السيريال', v: d.SerialNumber, cls: 'mono' },
    { k: 'IMEI',     v: d.InternationalMobileEquipmentIdentity, cls: 'mono' },
    { k: 'IMEI 2',   v: d.InternationalMobileEquipmentIdentity2, cls: 'mono' },
    { k: 'iOS',      v: d.ProductVersion },
    { k: 'Build',    v: d.BuildVersion, cls: 'mono' },
    { k: 'اللون',    v: d.DeviceColor },
  ]);

  const healthNum = d.BatteryHealthPct ? parseInt(d.BatteryHealthPct) : null;
  const healthCls = healthNum === null ? '' : healthNum >= 85 ? 'ok' : healthNum >= 80 ? 'warn' : 'bad';

  renderRows('rowsBattery', [
    { k: 'الشحن الحالي',  v: d.BatteryCurrentCapacity ? d.BatteryCurrentCapacity + '%' : null,
      cls: battCls(d.BatteryCurrentCapacity) },
    { k: 'صحة البطارية', v: d.BatteryHealthPct, cls: healthCls },
    { k: 'السعة الحالية', v: d.NominalChargeCapacity ? d.NominalChargeCapacity + ' mAh' : null },
    { k: 'السعة الأصلية', v: d.DesignCapacity       ? d.DesignCapacity       + ' mAh' : null },
    { k: 'دورات الشحن',  v: d.CycleCount, cls: cycleCls(d.CycleCount) },
    { k: 'الحرارة',       v: d.BatteryTemperature },
    { k: 'يشحن الآن',    v: d.BatteryIsCharging === 'true' ? 'نعم' : d.BatteryIsCharging === 'false' ? 'لا' : null },
  ]);

  renderRows('rowsNetwork', [
    { k: 'رقم الهاتف',  v: d.PhoneNumber },
    { k: 'حالة SIM',    v: simLabel(d.SIMStatus) },
    { k: 'MAC واي فاي', v: d.WifiAddress,     cls: 'mono' },
    { k: 'MAC بلوتوث',  v: d.BluetoothAddress, cls: 'mono' },
  ]);

  const total = d.TotalDiskCapacity    ? Math.round(parseInt(d.TotalDiskCapacity)    / 1e9) + ' GB' : null;
  const avail = d.TotalSystemAvailable ? Math.round(parseInt(d.TotalSystemAvailable) / 1e9) + ' GB' : null;
  renderRows('rowsSystem', [
    { k: 'التخزين الكلي',  v: total },
    { k: 'المتاح',         v: avail },
    { k: 'المعالج',        v: d.CPUArchitecture },
    { k: 'Hardware Model', v: d.HardwareModel, cls: 'mono' },
    { k: 'حالة التفعيل',  v: actLabel(d.ActivationState),
      cls: act === 'Activated' ? 'ok' : act ? 'bad' : '' },
  ]);
}

// ── Diagnostics panel ─────────────────────────────────
function renderDiag(deps, diag = {}) {
  const hasDevice = diag.deviceList && diag.deviceList.length > 0;

  const steps = [
    {
      title: 'libimobiledevice',
      ok: !!deps.ideviceinfo,
      sub: deps.ideviceinfo ? 'مثبت ✓' : 'brew install libimobiledevice',
    },
    {
      title: 'usbmuxd',
      ok: diag.usbmuxd === 'running',
      sub: diag.usbmuxd === 'running' ? 'يعمل ✓' : 'متوقف — أعيدي تشغيل الماك',
    },
    {
      title: 'الآيفون متوصل',
      ok: hasDevice,
      sub: hasDevice
        ? (diag.deviceList.length + ' جهاز مكتشف ✓')
        : 'لم يُكتشف جهاز',
    },
    {
      title: 'الإقران / الثقة',
      ok: diag.pairStatus === 'paired',
      warn: diag.pairStatus === 'locked' || diag.pairStatus === 'not_paired',
      sub: {
        paired:       'مقترن ✓',
        locked:       '⚠ الآيفون مقفول — افتحيه',
        not_paired:   '⚠ اضغطي "ثق بهذا الجهاز"',
        no_device:    'في انتظار الجهاز',
        tool_missing: 'idevicepair غير موجود',
        unknown:      diag.pairRaw ? diag.pairRaw.split('\n')[0] : 'غير معروف',
      }[diag.pairStatus] || '—',
    },
  ];

  const grid = document.getElementById('diagGrid');
  if (grid) {
    grid.innerHTML = steps.map(s => {
      const cls  = s.ok ? 'ok' : s.warn ? 'warn' : 'fail';
      const icon = s.ok ? '✓' : s.warn ? '!' : '✗';
      return `<div class="diag-step ${cls}">
        <div class="dstep-icon">${icon}</div>
        <div class="dstep-body">
          <div class="dstep-title">${s.title}</div>
          <div class="dstep-sub">${s.sub}</div>
        </div>
      </div>`;
    }).join('');
  }

  const guide = document.getElementById('diagGuide');
  if (!guide) return;
  const instructions = getInstructions(deps, diag);
  if (instructions) {
    guide.style.display = 'block';
    guide.innerHTML = `
      <div class="diag-guide-title">⚡ ${instructions.title}</div>
      <ol>${instructions.steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
  } else {
    guide.style.display = 'none';
  }
}

function getInstructions(deps, diag = {}) {
  if (!deps.ideviceinfo) {
    return {
      title: 'ثبّتي libimobiledevice أولاً',
      steps: [
        'افتحي <strong>Terminal</strong>',
        'اكتبي: <code>brew install libimobiledevice</code>',
        'انتظري حتى ينتهي التثبيت (~دقيقتين)',
        'أغلقي Terminal وافتحيه من جديد',
        'شغّلي: <code>cd ~/impeccable/tools/iphone-inspector-app && npm start</code>',
      ],
    };
  }

  if (diag.usbmuxd === 'stopped') {
    return {
      title: 'usbmuxd متوقف',
      steps: [
        'أغلقي التطبيق',
        '<strong>أعيدي تشغيل الماك</strong>',
        'شغّلي التطبيق مرة أخرى',
        'وصّلي الآيفون من جديد',
      ],
    };
  }

  if (!diag.deviceList || diag.deviceList.length === 0) {
    return {
      title: 'الآيفون غير مكتشف',
      steps: [
        'تأكدي إن الكابل <strong>كابل بيانات</strong> — مش كابل شحن فقط',
        'وصّلي الكابل <strong>مباشرة بالماك</strong> (بدون USB hub)',
        '<strong>افتحي الآيفون</strong> — لا يكون مقفولاً بالشاشة',
        'لو ظهرت رسالة <strong>"هل تثق بهذا الكمبيوتر؟"</strong> → اضغطي <strong>ثق</strong>',
        'اضغطي <strong>↻ إعادة المحاولة</strong> أدناه',
      ],
    };
  }

  if (diag.pairStatus === 'locked') {
    return {
      title: 'الآيفون مقفول',
      steps: [
        '<strong>افتحي الآيفون</strong> بالباسورد أو Face ID',
        'اضغطي <strong>↻ إعادة المحاولة</strong>',
      ],
    };
  }

  if (diag.pairStatus === 'not_paired') {
    return {
      title: 'يحتاج الإقران',
      steps: [
        'تأكدي إن الآيفون <strong>مفتوح</strong>',
        'ابحثي على شاشة الآيفون عن رسالة <strong>"هل تثق بهذا الكمبيوتر؟"</strong>',
        'اضغطي <strong>"ثق"</strong>',
        'اضغطي <strong>↻ إعادة المحاولة</strong>',
      ],
    };
  }

  if (diag.pairStatus === 'unknown' || diag.pairStatus === 'tool_missing') {
    return {
      title: 'مشكلة في الإقران',
      steps: [
        'افتحي Terminal واكتبي: <code>idevicepair pair</code>',
        'لو ظهر طلب ثقة على الآيفون → اضغطي <strong>ثق</strong>',
        'اضغطي <strong>↻ إعادة المحاولة</strong>',
      ],
    };
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────
function renderRows(containerId, rows) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = rows.filter(r => r.v).map(r =>
    `<div class="data-row">
      <span class="data-key">${r.k}</span>
      <span class="data-val ${r.cls || ''}">${r.v}</span>
    </div>`
  ).join('') || '<div class="data-row"><span class="data-key" style="color:var(--faint)">لا بيانات</span></div>';
}

function battCls(v)  { const n = parseInt(v); if (!n) return ''; return n >= 50 ? 'ok' : n >= 20 ? 'warn' : 'bad'; }
function cycleCls(v) { const n = parseInt(v); if (!n) return ''; return n < 300 ? 'ok' : n < 700 ? 'warn' : 'bad'; }
function actLabel(v) {
  if (!v) return null;
  if (v === 'Activated') return 'مفعّل ✓';
  if (v === 'WaitingForActivation') return 'في انتظار التفعيل';
  return v;
}
function simLabel(v) {
  if (!v) return null;
  if (v === 'kCTSIMSupportSIMStatusReady') return 'شريحة جاهزة ✓';
  if (v === 'kCTSIMSupportSIMStatusNotInserted') return 'لا توجد شريحة';
  return v;
}

// ── Manual checks ─────────────────────────────────────
const mState = {};
function mMark(evt, id, status) {
  evt.stopPropagation();
  const card = document.getElementById(id);
  card.classList.remove('ok','fail','skip');
  const b = document.getElementById('mb-' + id.replace('m-',''));
  if (mState[id] === status) {
    delete mState[id];
    b.textContent = '';
  } else {
    mState[id] = status;
    card.classList.add(status);
    b.textContent = status === 'ok' ? '✓' : status === 'fail' ? '✗' : '–';
  }
}
function toggleM(id) { document.getElementById(id).classList.toggle('expanded'); }

// ── Nav active on scroll ──────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const id = e.target.id;
      document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
      const a = document.querySelector(`.nav-link[href="#${id}"]`);
      if (a) a.classList.add('active');
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('#auto,#manual').forEach(el => obs.observe(el));
