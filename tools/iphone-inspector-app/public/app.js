'use strict';

// ── SSE connection ────────────────────────────────────
const es = new EventSource('/events');
const dot   = document.getElementById('connDot');
const label = document.getElementById('connLabel');

es.onopen = () => { dot.className = 'conn-dot connected'; label.textContent = 'متصل'; };
es.onerror = () => { dot.className = 'conn-dot error'; label.textContent = 'انقطع الاتصال...'; };

es.onmessage = (e) => {
  const data = JSON.parse(e.data);
  render(data);
};

// ── Render ────────────────────────────────────────────
function render({ udids = [], devices = [], deps = {} }) {
  // Setup banner
  const setupBanner = document.getElementById('setupBanner');
  if (!deps.ideviceinfo) {
    setupBanner.style.display = 'flex';
  } else {
    setupBanner.style.display = 'none';
  }

  const waiting  = document.getElementById('waitingState');
  const devInfo  = document.getElementById('deviceInfo');
  const noDevice = document.getElementById('noDevice');
  const autoGrid = document.getElementById('autoGrid');

  if (!deps.ideviceinfo) {
    label.textContent = 'libimobiledevice غير مثبت';
    waiting.style.display = 'block';
    devInfo.style.display = 'none';
    noDevice.style.display = 'block';
    autoGrid.style.display = 'none';
    document.getElementById('waitingSub').textContent = 'ثبّتي libimobiledevice أولاً (راجعي التعليمات بالأعلى)';
    return;
  }

  if (!udids.length || !devices.length || !devices[0]) {
    waiting.style.display = 'block';
    devInfo.style.display = 'none';
    noDevice.style.display = 'block';
    autoGrid.style.display = 'none';
    label.textContent = 'في انتظار الجهاز...';
    document.getElementById('waitingSub').textContent = 'وصّلي الآيفون واضغطي "ثق بهذا الجهاز"';
    return;
  }

  const d = devices[0];

  // Sidebar device info
  waiting.style.display = 'none';
  devInfo.style.display = 'block';
  noDevice.style.display = 'none';
  autoGrid.style.display = 'grid';

  document.getElementById('devName').textContent  = d.DeviceName  || '—';
  document.getElementById('devModel').textContent = d.ModelName   || d.ProductType || '—';
  label.textContent = 'جهاز متصل ✓';

  // Activation pill
  const pill = document.getElementById('activationPill');
  const act  = d.ActivationState || '';
  if (act === 'Activated') {
    pill.textContent = '✓ مفعّل — iCloud نظيف';
    pill.className = 'status-pill status-pill--ok';
  } else if (act === 'WaitingForActivation') {
    pill.textContent = '⚠ في انتظار التفعيل';
    pill.className = 'status-pill status-pill--warn';
  } else if (act.includes('Mismatch') || act.includes('Locked')) {
    pill.textContent = '✗ مقفل / Activation Lock';
    pill.className = 'status-pill status-pill--bad';
  } else {
    pill.textContent = act || '—';
    pill.className = 'status-pill status-pill--neutral';
  }

  // ── Data cards ──────────────────────────────────────
  renderRows('rowsIdentity', [
    { k: 'الاسم',          v: d.DeviceName },
    { k: 'الموديل',        v: d.ModelName || d.ProductType },
    { k: 'السيريال',       v: d.SerialNumber, cls: 'mono' },
    { k: 'IMEI',           v: d.InternationalMobileEquipmentIdentity, cls: 'mono' },
    { k: 'IMEI 2',         v: d.InternationalMobileEquipmentIdentity2, cls: 'mono' },
    { k: 'iOS',            v: d.ProductVersion },
    { k: 'Build',          v: d.BuildVersion, cls: 'mono' },
    { k: 'اللون',          v: d.DeviceColor },
  ]);

  // Battery
  const healthNum = d.BatteryHealthPct ? parseInt(d.BatteryHealthPct) : null;
  const healthCls = healthNum === null ? '' : healthNum >= 85 ? 'ok' : healthNum >= 80 ? 'warn' : 'bad';

  renderRows('rowsBattery', [
    { k: 'الشحن الحالي',   v: (d.BatteryCurrentCapacity ? d.BatteryCurrentCapacity + '%' : null),
      cls: battCls(d.BatteryCurrentCapacity) },
    { k: 'صحة البطارية',  v: d.BatteryHealthPct, cls: healthCls },
    { k: 'السعة الحالية',  v: d.NominalChargeCapacity ? d.NominalChargeCapacity + ' mAh' : null },
    { k: 'السعة الأصلية',  v: d.DesignCapacity       ? d.DesignCapacity       + ' mAh' : null },
    { k: 'دورات الشحن',   v: d.CycleCount, cls: cycleCls(d.CycleCount) },
    { k: 'الحرارة',        v: d.BatteryTemperature },
    { k: 'يشحن الآن',     v: d.BatteryIsCharging === 'true' ? 'نعم' : d.BatteryIsCharging === 'false' ? 'لا' : null },
  ]);

  renderRows('rowsNetwork', [
    { k: 'رقم الهاتف',    v: d.PhoneNumber },
    { k: 'حالة SIM',      v: simLabel(d.SIMStatus) },
    { k: 'MAC واي فاي',   v: d.WifiAddress,    cls: 'mono' },
    { k: 'MAC بلوتوث',    v: d.BluetoothAddress, cls: 'mono' },
  ]);

  const total = d.TotalDiskCapacity ? Math.round(parseInt(d.TotalDiskCapacity) / 1e9) + ' GB' : null;
  const avail = d.TotalSystemAvailable ? Math.round(parseInt(d.TotalSystemAvailable) / 1e9) + ' GB' : null;
  renderRows('rowsSystem', [
    { k: 'التخزين الكلي',   v: total },
    { k: 'المتاح',          v: avail },
    { k: 'المعالج',         v: d.CPUArchitecture },
    { k: 'Hardware Model',  v: d.HardwareModel, cls: 'mono' },
    { k: 'حالة التفعيل',   v: actLabel(d.ActivationState),
      cls: act === 'Activated' ? 'ok' : act ? 'bad' : '' },
  ]);
}

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

function battCls(v) {
  const n = parseInt(v);
  if (!n) return '';
  return n >= 50 ? 'ok' : n >= 20 ? 'warn' : 'bad';
}
function cycleCls(v) {
  const n = parseInt(v);
  if (!n) return '';
  return n < 300 ? 'ok' : n < 700 ? 'warn' : 'bad';
}
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
function toggleM(id) {
  document.getElementById(id).classList.toggle('expanded');
}

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
