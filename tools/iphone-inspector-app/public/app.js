'use strict';

// ── State ─────────────────────────────────────────────
let _state = {
  device: null,
  caps: {},
  camCfg: {},
  testResults: {},
  activeSection: 'welcome',
};

// All test IDs (for score calculation and report)
const ALL_TESTS = [
  't-charge-cable','t-charge-fast','t-charge-wireless',
  't-display-deadpixel','t-display-touch','t-display-multitouch','t-display-brightness',
  't-display-truetone','t-display-parts',
  't-bio-unlock','t-bio-appauth','t-bio-warning',
  't-audio-bottom-speaker','t-audio-earpiece','t-audio-mic-bottom','t-audio-mic-front','t-audio-mute',
  't-conn-wifi','t-conn-bt','t-conn-gps','t-conn-nfc',
  't-btn-power','t-btn-vol-up','t-btn-vol-down','t-btn-mute-action',
  't-sensor-taptic','t-sensor-proximity','t-sensor-light',
  't-sensor-accel','t-sensor-gyro','t-sensor-compass','t-sensor-baro',
  't-port-cable','t-port-fast','t-port-wireless','t-port-condition',
  't-sec-findmy','t-sec-icloud','t-sec-erase',
  't-cam-rear-main','t-cam-rear-ultra','t-cam-rear-tele','t-cam-lidar','t-cam-front',
];

const TEST_LABELS = {
  't-charge-cable':'الشحن بالكابل',
  't-charge-fast':'الشحن السريع',
  't-charge-wireless':'الشحن اللاسلكي',
  't-display-deadpixel':'البكسلات الميتة والحروق',
  't-display-touch':'دقة اللمس',
  't-display-multitouch':'اللمس المتعدد',
  't-display-brightness':'السطوع القصوى',
  't-display-truetone':'True Tone وقطع Apple',
  't-display-parts':'قطع وخدمة Apple',
  't-bio-unlock':'فتح القفل البيومتري',
  't-bio-appauth':'المصادقة في التطبيقات',
  't-bio-warning':'تحذيرات TrueDepth',
  't-audio-bottom-speaker':'مكبر القاع',
  't-audio-earpiece':'سماعة الأذن',
  't-audio-mic-bottom':'المايكروفون السفلي',
  't-audio-mic-front':'المايكروفون الأمامي',
  't-audio-mute':'مفتاح الصامت',
  't-conn-wifi':'الواي فاي',
  't-conn-bt':'البلوتوث',
  't-conn-gps':'GPS والموقع',
  't-conn-nfc':'NFC',
  't-btn-power':'زر التشغيل',
  't-btn-vol-up':'زر رفع الصوت',
  't-btn-vol-down':'زر خفض الصوت',
  't-btn-mute-action':'مفتاح الصامت / Action',
  't-sensor-taptic':'Taptic Engine',
  't-sensor-proximity':'حساس القرب',
  't-sensor-light':'حساس الإضاءة',
  't-sensor-accel':'مقياس التسارع',
  't-sensor-gyro':'الجيروسكوب',
  't-sensor-compass':'البوصلة',
  't-sensor-baro':'الباروميتر',
  't-port-cable':'منفذ الشحن',
  't-port-fast':'الشحن السريع عبر الكابل',
  't-port-wireless':'الشحن اللاسلكي',
  't-port-condition':'مؤشر الماء',
  't-sec-findmy':'Find My iPhone',
  't-sec-icloud':'تسجيل الخروج من iCloud',
  't-sec-erase':'إمكانية المسح',
  't-cam-rear-main':'الكاميرا الخلفية الرئيسية',
  't-cam-rear-ultra':'الكاميرا الزاوية الواسعة',
  't-cam-rear-tele':'الكاميرا التيليفوتو',
  't-cam-lidar':'LiDAR',
  't-cam-front':'الكاميرا الأمامية',
};

const NA = 'غير متاح';

// ── Communication ─────────────────────────────────────
const dot   = document.getElementById('connDot');
const label = document.getElementById('connLabel');

if (window.electronAPI) {
  dot.className = 'conn-dot connected';
  label.textContent = 'متصل';
  window.electronAPI.onDeviceUpdate(handleUpdate);
} else {
  const es = new EventSource('/events');
  es.onopen    = () => { dot.className = 'conn-dot connected'; label.textContent = 'متصل'; };
  es.onerror   = () => { dot.className = 'conn-dot error';     label.textContent = 'انقطع الاتصال...'; };
  es.onmessage = e  => handleUpdate(JSON.parse(e.data));
}

// ── Main update handler ───────────────────────────────
function handleUpdate(data) {
  const { udids = [], devices = [], deps = {}, diag = {}, camCfg = {}, caps = {} } = data;

  if (camCfg && Object.keys(camCfg).length) _state.camCfg = camCfg;

  const setupBanner = document.getElementById('setupBanner');
  const diagPanel   = document.getElementById('diagPanel');
  const welcomeCenter = document.getElementById('welcomeCenter');

  // ── No libimobiledevice ──
  if (!deps.ideviceinfo) {
    setupBanner.style.display = 'flex';
    diagPanel.style.display   = 'block';
    welcomeCenter.style.display = 'none';
    document.getElementById('waitingText').innerHTML = 'مطلوب تثبيت<br>libimobiledevice';
    document.getElementById('waitingSub').textContent = 'راجع التعليمات';
    label.textContent = 'libimobiledevice غير مثبت';
    renderDiag(deps, diag);
    updateSidebar(null);
    if (_state.activeSection !== 'welcome') navTo('welcome');
    return;
  }
  setupBanner.style.display = 'none';

  // ── No device ──
  if (!udids.length || !devices.length || !devices[0]) {
    diagPanel.style.display   = 'block';
    welcomeCenter.style.display = 'block';
    document.getElementById('waitingText').innerHTML = 'وصّل الآيفون<br>بكابل USB';
    document.getElementById('waitingSub').textContent = 'ثم اضغط "ثق" عند الطلب';
    label.textContent = 'في انتظار الجهاز...';
    renderDiag(deps, diag);
    updateSidebar(null);
    if (_state.activeSection !== 'welcome') navTo('welcome');
    return;
  }

  diagPanel.style.display    = 'none';
  welcomeCenter.style.display = 'none';

  const d = devices[0];
  _state.device = d;
  _state.caps = (caps && d.ProductType && caps[d.ProductType]) ? caps[d.ProductType] : {};

  // Load persisted test results for this serial
  if (d.SerialNumber) {
    const key = 'serial_' + d.SerialNumber;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { _state.testResults = JSON.parse(saved); } catch (e) { _state.testResults = {}; }
    }
  }

  label.textContent = 'جهاز متصل ✓';

  // Render all sections
  renderIdentity(d);
  renderBattery(d);
  renderCapabilities(d, caps);
  renderBiometricSection(d);
  renderCameraSection(d);
  renderConnectivity(d);
  renderSensors(d);
  renderCharging(d);
  renderSecurity(d);
  renderScore();
  renderReport(d);
  updateSidebar(d);
  restoreTestUI();

  // Navigate away from welcome
  if (_state.activeSection === 'welcome') navTo('identity');
}

// ── Sidebar updater ───────────────────────────────────
function updateSidebar(d) {
  const waitingEl  = document.getElementById('waitingState');
  const sideDevice = document.getElementById('sideDevice');

  if (!d) {
    sideDevice.classList.remove('visible');
    return;
  }

  document.getElementById('sideDevName').textContent  = d.DeviceName || d.ModelName || '—';
  const modelLine = [d.ModelName || d.ProductType, d.releaseYear ? `(${d.releaseYear})` : ''].filter(Boolean).join(' ');
  document.getElementById('sideDevModel').textContent = modelLine || '—';
  sideDevice.classList.add('visible');

  // Update score ring
  const { score, condition } = calcScore();
  updateScoreRing(score, condition);
  document.getElementById('sideScore').textContent = score > 0 ? score : '—';
  const condEl = document.getElementById('sideCondition');
  condEl.textContent = conditionLabel(condition);
  condEl.className = 'score-condition-text ' + condition;
}

// ── Navigation ────────────────────────────────────────
function navTo(section) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('sec-' + section);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.section === section);
  });

  _state.activeSection = section;
}

// ── Test card interactions ────────────────────────────
function markTest(evt, id, status) {
  evt.stopPropagation();
  const card = document.getElementById(id);
  if (!card) return;

  const prev = _state.testResults[id] ? _state.testResults[id].status : null;

  if (prev === status) {
    // Toggle off
    delete _state.testResults[id];
    card.classList.remove('pass', 'fail', 'skip');
  } else {
    _state.testResults[id] = { status, ts: new Date().toISOString() };
    card.classList.remove('pass', 'fail', 'skip');
    card.classList.add(status);
  }

  // Update status icon
  const icon = document.getElementById('ts-' + id);
  if (icon) {
    const s = _state.testResults[id] ? _state.testResults[id].status : null;
    icon.textContent = s === 'pass' ? '✓' : s === 'fail' ? '✗' : s === 'skip' ? '—' : '○';
  }

  // Persist
  if (_state.device && _state.device.SerialNumber) {
    localStorage.setItem('serial_' + _state.device.SerialNumber, JSON.stringify(_state.testResults));
  }

  renderScore();
  updateSidebar(_state.device);
  renderReport(_state.device);
}

function toggleTest(id) {
  const card = document.getElementById(id);
  if (card) card.classList.toggle('expanded');
}

function restoreTestUI() {
  for (const [id, result] of Object.entries(_state.testResults)) {
    const card = document.getElementById(id);
    if (!card) continue;
    card.classList.remove('pass','fail','skip');
    card.classList.add(result.status);
    const icon = document.getElementById('ts-' + id);
    if (icon) {
      icon.textContent = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '—';
    }
  }
}

// ── Render: Identity ──────────────────────────────────
function renderIdentity(d) {
  const colorVal = d.colorHex
    ? `<span class="color-dot" style="background:${d.colorHex}"></span>${escHtml(d.colorName || d.colorHex)}`
    : null;

  renderRows('id-basic', [
    { k:'اسم الجهاز',     v:d.DeviceName },
    { k:'الموديل',        v:d.ModelName || d.ProductType },
    { k:'سنة الإصدار',   v:d.releaseYear ? String(d.releaseYear) : null },
    { k:'اللون',          v:colorVal, html:true },
    { k:'ProductType',    v:d.ProductType, cls:'mono' },
    { k:'iOS',            v:d.ProductVersion },
    { k:'Build',          v:d.BuildVersion, cls:'mono' },
    { k:'المنطقة',        v:d.RegionInfo },
  ]);

  renderRows('id-technical', [
    { k:'السيريال',       v:d.SerialNumber, cls:'mono' },
    { k:'UDID',           v:d.UniqueDeviceID ? d.UniqueDeviceID.slice(0,20)+'…' : null, cls:'mono' },
    { k:'ECID',           v:d.UniqueChipID, cls:'mono' },
    { k:'رقم الموديل',   v:d.ModelNumber, cls:'mono' },
    { k:'HardwareModel',  v:d.HardwareModel, cls:'mono' },
    { k:'MLB Serial',     v:d.MLBSerialNumber, cls:'mono' },
    { k:'BasebandVersion',v:d.BasebandVersion, cls:'mono' },
    { k:'CPU',            v:d.CPUArchitecture },
  ]);

  const total = d.TotalDiskCapacity    ? Math.round(parseInt(d.TotalDiskCapacity)    / 1e9) + ' GB' : null;
  const avail = d.TotalSystemAvailable ? Math.round(parseInt(d.TotalSystemAvailable) / 1e9) + ' GB' : null;

  renderRows('id-network', [
    { k:'رقم الهاتف',    v:d.PhoneNumber },
    { k:'IMEI',           v:d.InternationalMobileEquipmentIdentity, cls:'mono' },
    { k:'IMEI 2',         v:d.InternationalMobileEquipmentIdentity2, cls:'mono' },
    { k:'MAC WiFi',       v:d.WifiAddress, cls:'mono' },
    { k:'MAC Bluetooth',  v:d.BluetoothAddress, cls:'mono' },
    { k:'SIM',            v:simLabel(d.SIMStatus) },
    { k:'حالة درج SIM',  v:d.SIMTrayStatus },
  ]);

  renderRows('id-activation', [
    { k:'التفعيل',        v:actLabel(d.ActivationState), cls:d.ActivationState==='Activated'?'ok':d.ActivationState?'bad':'' },
    { k:'مُشرَف عليه',   v:d.IsSupervised === 'true' ? 'نعم ⚠' : d.IsSupervised === 'false' ? 'لا ✓' : null,
      cls:d.IsSupervised === 'true' ? 'bad' : 'ok' },
    { k:'محمي بكلمة مرور', v:d.PasswordProtected === 'true' ? 'نعم' : d.PasswordProtected === 'false' ? 'لا' : null },
    { k:'التخزين الكلي',  v:total },
    { k:'المتاح',          v:avail },
  ]);
}

// ── Render: Battery ───────────────────────────────────
function renderBattery(d) {
  const hNum = d.BatteryHealthPct ? parseInt(d.BatteryHealthPct) : null;
  const hCls = hNum === null ? '' : hNum >= 85 ? 'ok' : hNum >= 75 ? 'warn' : 'bad';

  renderRows('batt-rows', [
    { k:'الشحن الحالي',   v:d.BatteryCurrentCapacity ? d.BatteryCurrentCapacity + '%' : null, cls:battCls(d.BatteryCurrentCapacity) },
    { k:'صحة البطارية',  v:d.BatteryHealthPct, cls:hCls },
    { k:'السعة الحالية',  v:d.battNominalCap ? d.battNominalCap + ' mAh' : null },
    { k:'السعة الأصلية',  v:d.battDesignCap  ? d.battDesignCap  + ' mAh' : null },
    { k:'دورات الشحن',   v:d.CycleCount, cls:cycleCls(d.CycleCount) },
    { k:'الجهد',           v:d.battVoltage },
    { k:'الحرارة',         v:d.BatteryTemperature },
    { k:'يشحن الآن',     v:d.BatteryIsCharging === 'true' ? 'نعم' : d.BatteryIsCharging === 'false' ? 'لا' : null },
    { k:'سيريال البطارية',v:d.battSerial, cls:'mono' },
    { k:'المصنّع',         v:d.battMfr },
  ]);

  const vc = document.getElementById('batt-verdict-container');
  if (!vc) return;

  const verdictMap = {
    ok:         { cls:'ok',         title:'بطارية سليمة ✓',          sub:'الصحة جيدة ودورات الشحن ضمن الحد الطبيعي' },
    worn:       { cls:'worn',       title:'بطارية متهالكة ⚠',        sub:'الصحة منخفضة أو الدورات عالية — ربما تحتاج استبدالاً' },
    bad:        { cls:'bad',        title:'بطارية ضعيفة ✗',           sub:'أداء منخفض جداً — يُنصح بالاستبدال فوراً' },
    thirdparty: { cls:'thirdparty', title:'بطارية غير أصلية ✗',      sub:'المصنّع أو السيريال لا يطابق Apple' },
    unknown:    { cls:'unknown',    title:'بيانات غير كافية',         sub:'ثبّت idevicediagnostics للحصول على بيانات كاملة' },
  };

  const v = verdictMap[d.battVerdict] || verdictMap.unknown;
  vc.innerHTML = `<div class="batt-verdict-card ${v.cls}">
    <div class="batt-verdict-title">${v.title}</div>
    <div class="batt-verdict-sub">${v.sub}</div>
  </div>`;

  // Show/hide wireless charging test
  const wireCard = document.getElementById('t-charge-wireless');
  if (wireCard) wireCard.style.display = _state.caps.magsafe ? '' : 'none';
}

// ── Render: Capabilities ──────────────────────────────
function renderCapabilities(d, allCaps) {
  const con = document.getElementById('capabilities-container');
  if (!con) return;

  const pt   = d.ProductType || '';
  const caps = _state.caps;

  if (!pt || !Object.keys(caps).length) {
    con.innerHTML = '<div class="data-card"><div class="card-title">موديل غير معروف في قاعدة البيانات</div></div>';
    return;
  }

  const items = [
    { label:'الكاميرات الخلفية',    expected: caps.rearCams,    detected: d.gCameraCount ? parseInt(d.gCameraCount) : null,    fmt: v => v + ' كاميرا', type:'num' },
    { label:'Face ID',               expected: caps.faceID,      detected: d.gHasTrueDepth,  type:'bool' },
    { label:'LiDAR',                 expected: caps.lidar,       detected: d.gHasLiDAR,      type:'bool' },
    { label:'MagSafe',               expected: caps.magsafe,     detected: null,              type:'bool' },
    { label:'USB-C',                 expected: caps.usbc,        detected: null,              type:'bool' },
    { label:'5G',                    expected: caps.c5g,         detected: null,              type:'bool' },
    { label:'eSIM',                  expected: caps.esim,        detected: null,              type:'bool' },
    { label:'Action Button',         expected: caps.actionBtn,   detected: null,              type:'bool' },
    { label:'Barometer',             expected: caps.barometer,   detected: d.gHasBarometer,  type:'bool' },
    { label:'NFC',                   expected: null,             detected: d.gHasNFC,        type:'bool' },
    { label:'GPS',                   expected: null,             detected: d.gHasGPS,        type:'bool' },
    { label:'Taptic Engine',         expected: null,             detected: d.gHasTaptic,     type:'bool' },
    { label:'Telephoto',             expected: caps.rearCams >= 3 ? true : (caps.rearCams === 2 && pt.startsWith('iPhone9') ? true : false),
                                     detected: d.gHasTelephoto, type:'bool' },
  ];

  const boolStr = v => v === true ? 'نعم' : v === false ? 'لا' : null;

  let html = `<div class="data-card data-card--full">
    <div class="card-title">مواصفات الموديل: ${escHtml(d.ModelName || pt)}</div>
    <div class="cap-row">`;

  for (const item of items) {
    const expStr  = item.type === 'bool' ? boolStr(item.expected) : (item.fmt ? item.fmt(item.expected) : String(item.expected));
    const detStr  = item.type === 'bool' ? boolStr(item.detected) : (item.detected !== null && item.fmt ? item.fmt(item.detected) : (item.detected !== null ? String(item.detected) : null));

    let cls = 'cap-neutral';
    if (item.expected !== null && item.detected !== null) {
      const match = item.type === 'num'
        ? item.expected === item.detected
        : item.expected === item.detected;
      cls = match ? 'cap-match' : 'cap-mismatch';
    }

    const detDisplay = detStr !== null ? detStr : '—';
    const expDisplay = expStr !== null ? expStr : '—';

    html += `<div class="cap-item ${cls}">
      <div class="cap-item-label">${escHtml(item.label)}</div>
      <div class="cap-item-val">${escHtml(expDisplay)}</div>
      ${detStr !== null ? `<div style="font-size:10px;color:var(--faint);margin-top:2px;">قُرئ: ${escHtml(detDisplay)}</div>` : ''}
    </div>`;
  }

  html += '</div></div>';
  con.innerHTML = html;
}

// ── Render: Biometric section ─────────────────────────
function renderBiometricSection(d) {
  const hasFaceID = _state.caps.faceID !== undefined
    ? _state.caps.faceID
    : (d.gHasTrueDepth !== null ? d.gHasTrueDepth : null);

  const titleEl    = document.getElementById('bio-section-title');
  const descEl     = document.getElementById('bio-section-desc');
  const navLabel   = document.getElementById('nav-bio-label');
  const unlockTitle= document.getElementById('bio-unlock-title');
  const unlockSteps= document.getElementById('bio-unlock-steps');
  const appTitle   = document.getElementById('bio-app-title');

  if (hasFaceID === true) {
    if (titleEl)    titleEl.textContent   = 'Face ID';
    if (descEl)     descEl.textContent    = 'اختبار المعرّف بالوجه';
    if (navLabel)   navLabel.textContent  = 'Face ID';
    if (unlockTitle)unlockTitle.textContent= 'فتح القفل بـ Face ID';
    if (appTitle)   appTitle.textContent  = 'المصادقة في التطبيقات بـ Face ID';
    if (unlockSteps) unlockSteps.innerHTML = `
      <li>اضغط زر الجانب لقفل الشاشة</li>
      <li>اقترب بوجهك — يجب أن ينفتح فوراً</li>
      <li>إذا ظهرت رسالة "تعذّر تفعيل Face ID" = مشكلة في كاميرا TrueDepth</li>`;
  } else if (hasFaceID === false) {
    if (titleEl)    titleEl.textContent   = 'Touch ID';
    if (descEl)     descEl.textContent    = 'اختبار بصمة الإصبع';
    if (navLabel)   navLabel.textContent  = 'Touch ID';
    if (unlockTitle)unlockTitle.textContent= 'فتح القفل بـ Touch ID';
    if (appTitle)   appTitle.textContent  = 'المصادقة في التطبيقات بـ Touch ID';
    if (unlockSteps) unlockSteps.innerHTML = `
      <li>اضغط زر الجانب أو الرئيسي لتفعيل الشاشة</li>
      <li>ضع إصبعك على زر الـ Home أو الجانب</li>
      <li>يجب أن ينفتح الجهاز فوراً بالبصمة</li>`;
  } else {
    if (navLabel) navLabel.textContent = 'Face ID / Touch ID';
  }
}

// ── Render: Camera section ────────────────────────────
function renderCameraSection(d) {
  const con = document.getElementById('cameras-container');
  if (!con) return;

  const caps = _state.caps;
  const rearCams  = caps.rearCams  !== undefined ? caps.rearCams  : (d.gCameraCount ? parseInt(d.gCameraCount) : 1);
  const hasTele   = caps.lidar !== undefined ? (rearCams >= 3) : (d.gHasTelephoto === true);
  const hasLiDAR  = caps.lidar;
  const hasFaceID = caps.faceID !== undefined ? caps.faceID : d.gHasTrueDepth;

  let html = '';

  // Main rear camera (always)
  html += testCardHTML('t-cam-rear-main', '📷', 'الكاميرا الخلفية الرئيسية', 'عدسة Wide الرئيسية', 'interactive', `
    <li>افتح الكاميرا واضغط 1× — هذه العدسة الرئيسية</li>
    <li>التقط صوراً في إضاءة جيدة وضعيفة — يجب أن تكون واضحة</li>
    <li>فحّص العدسة بصرياً تحت الضوء — لا خدوش أو بقع</li>
  `);

  // Ultra-wide (if rearCams >= 2)
  if (rearCams >= 2) {
    html += testCardHTML('t-cam-rear-ultra', '🔭', 'الكاميرا الزاوية الواسعة', 'عدسة Ultra Wide 0.5×', 'interactive', `
      <li>افتح الكاميرا واضغط 0.5× للتبديل للعدسة الواسعة</li>
      <li>يجب أن تظهر الصورة بزاوية أوسع بكثير</li>
      <li>تحقق من عدم وجود تشويه مفرط في الزوايا</li>
    `);
  }

  // Telephoto (if rearCams >= 3 or explicitly has telephoto)
  if (hasTele || rearCams >= 3) {
    html += testCardHTML('t-cam-rear-tele', '🔬', 'الكاميرا التيليفوتو', 'عدسة Telephoto 2× أو 5×', 'interactive', `
      <li>افتح الكاميرا واضغط 2× أو 5× للتيليفوتو</li>
      <li>صوّر شيئاً بعيداً — يجب أن يكون واضحاً</li>
      <li>الاستقرار البصري OIS يجعل الصورة ثابتة</li>
    `);
  }

  // LiDAR
  if (hasLiDAR) {
    html += testCardHTML('t-cam-lidar', '💡', 'ماسح LiDAR', 'حساس العمق بالليزر', 'interactive', `
      <li>افتح الكاميرا في وضع Portrait — يجب أن يعمل فوراً في الإضاءة المنخفضة</li>
      <li>أو جرّب تطبيق AR يعتمد على LiDAR</li>
      <li>إذا فشل وضع Portrait في الإضاءة المنخفضة = مشكلة محتملة في LiDAR</li>
    `);
  }

  // Front camera (always)
  const frontDesc = hasFaceID ? 'كاميرا TrueDepth الأمامية' : 'الكاميرا الأمامية';
  html += testCardHTML('t-cam-front', '🤳', 'الكاميرا الأمامية', frontDesc, 'interactive', `
    <li>انتقل للكاميرا الأمامية</li>
    <li>تأكد أن الصورة واضحة وبدون ضبابية</li>
    <li>فحّص العدسة بصرياً — لا خدوش أو بقع</li>
    <li>جرّب وضع Portrait على الكاميرا الأمامية إذا كان مدعوماً</li>
  `);

  con.innerHTML = html;
  restoreTestUI();
}

function testCardHTML(id, icon, title, desc, method, stepsHTML) {
  const badgeClass = method === 'interactive' ? 'badge-interactive' : 'badge-manual';
  const badgeText  = method === 'interactive' ? 'تفاعلي' : 'يدوي';
  return `<div class="test-card" id="${id}">
  <div class="test-head" onclick="toggleTest('${id}')">
    <span class="test-icon">${icon}</span>
    <div class="test-info">
      <div class="test-title">${escHtml(title)}</div>
      <div class="test-desc">${escHtml(desc)}</div>
    </div>
    <span class="${badgeClass}">${badgeText}</span>
    <span class="test-status-icon" id="ts-${id}">○</span>
    <div class="test-acts">
      <button class="t-pass" onclick="markTest(event,'${id}','pass')">✓</button>
      <button class="t-fail" onclick="markTest(event,'${id}','fail')">✗</button>
      <button class="t-skip" onclick="markTest(event,'${id}','skip')">—</button>
    </div>
  </div>
  <div class="test-body">
    <ol class="test-steps">${stepsHTML}</ol>
  </div>
</div>`;
}

// ── Render: Connectivity ──────────────────────────────
function renderConnectivity(d) {
  renderRows('conn-rows', [
    { k:'رقم الهاتف',    v:d.PhoneNumber },
    { k:'IMEI',           v:d.InternationalMobileEquipmentIdentity, cls:'mono' },
    { k:'IMEI 2',         v:d.InternationalMobileEquipmentIdentity2, cls:'mono' },
    { k:'MAC WiFi',       v:d.WifiAddress, cls:'mono' },
    { k:'MAC Bluetooth',  v:d.BluetoothAddress, cls:'mono' },
    { k:'SIM',            v:simLabel(d.SIMStatus) },
    { k:'IMSI',           v:d.InternationalMobileSubscriberIdentity, cls:'mono' },
  ]);

  // Show NFC test — iPhone 6 and newer have NFC; check gestalt or assume true for modern devices
  const hasNFC = d.gHasNFC !== null ? d.gHasNFC : (d.ProductType ? !d.ProductType.startsWith('iPhone5') && !d.ProductType.startsWith('iPhone4') && !d.ProductType.startsWith('iPhone3') : true);
  const nfcCard = document.getElementById('t-conn-nfc');
  if (nfcCard) nfcCard.style.display = hasNFC ? '' : 'none';
}

// ── Render: Sensors ───────────────────────────────────
function renderSensors(d) {
  const hasBaro = _state.caps.barometer !== undefined
    ? _state.caps.barometer
    : (d.gHasBarometer !== null ? d.gHasBarometer : true);

  const baroCard = document.getElementById('t-sensor-baro');
  if (baroCard) baroCard.style.display = hasBaro ? '' : 'none';
}

// ── Render: Charging ──────────────────────────────────
function renderCharging(d) {
  renderRows('charge-rows', [
    { k:'يشحن عبر USB',  v:d.BatteryIsCharging === 'true' ? 'نعم ✓' : d.BatteryIsCharging === 'false' ? 'لا' : null,
      cls:d.BatteryIsCharging === 'true' ? 'ok' : '' },
    { k:'منفذ الشحن',    v:_state.caps.usbc ? 'USB-C' : (d.ProductType ? 'Lightning' : null) },
    { k:'الشحن اللاسلكي',v:_state.caps.magsafe ? 'MagSafe + Qi' : null },
    { k:'الشحن السريع',  v:'مدعوم في كل iPhone 8 وما بعد' },
  ]);

  // Show wireless test based on magsafe cap
  const wireCard = document.getElementById('t-port-wireless');
  if (wireCard) wireCard.style.display = _state.caps.magsafe ? '' : 'none';
}

// ── Render: Security ──────────────────────────────────
function renderSecurity(d) {
  const flagsCon = document.getElementById('security-flags-container');
  if (flagsCon) {
    let flags = '';
    const act = d.ActivationState || '';

    if (act.includes('Locked') || act.includes('Mismatch') || act === 'WaitingForActivation') {
      flags += `<div class="security-flag">
        <div class="security-flag-icon">🔴</div>
        <div class="security-flag-body">
          <div class="security-flag-title">تحذير: ${actLabel(act) || act}</div>
          <div class="security-flag-sub">هذا الجهاز قد يكون مقيّداً أو مرتبطاً بحساب iCloud. لا تشتره بدون التأكد من إزالة القفل.</div>
        </div>
      </div>`;
    } else if (act === 'Activated') {
      flags += `<div class="security-ok">✓ الجهاز مفعّل بشكل طبيعي — لا يوجد قفل iCloud</div>`;
    }

    if (d.IsSupervised === 'true') {
      flags += `<div class="security-flag">
        <div class="security-flag-icon">⚠️</div>
        <div class="security-flag-body">
          <div class="security-flag-title">الجهاز تحت الإشراف (MDM)</div>
          <div class="security-flag-sub">هذا الجهاز تحت إشراف مؤسسي ومحظور التحكم به بالكامل. يُنصح بالابتعاد عنه.</div>
        </div>
      </div>`;
    }

    flagsCon.innerHTML = flags;
  }

  renderRows('sec-rows', [
    { k:'حالة التفعيل',   v:actLabel(d.ActivationState), cls:d.ActivationState === 'Activated' ? 'ok' : d.ActivationState ? 'bad' : '' },
    { k:'مُشرَف عليه',   v:d.IsSupervised === 'true' ? 'نعم ⚠' : d.IsSupervised === 'false' ? 'لا ✓' : null,
      cls:d.IsSupervised === 'true' ? 'bad' : 'ok' },
    { k:'محمي بكلمة مرور',v:d.PasswordProtected === 'true' ? 'نعم' : d.PasswordProtected === 'false' ? 'لا' : null },
    { k:'IMEI',            v:d.InternationalMobileEquipmentIdentity, cls:'mono' },
    { k:'رقم الهاتف',     v:d.PhoneNumber },
  ]);
}

// ── Score calculation ─────────────────────────────────
function calcScore() {
  const d = _state.device;
  if (!d) return { score: 0, condition: 'critical', critReason: null };

  const act = d.ActivationState || '';
  if (act.includes('Lock') || act.includes('Mismatch')) {
    return { score: 0, condition: 'critical', critReason: 'activation-lock' };
  }

  let s = 0;

  // Auto data (20 pts)
  const autoFields = [
    d.SerialNumber, d.UniqueDeviceID, d.UniqueChipID,
    d.InternationalMobileEquipmentIdentity, d.MLBSerialNumber,
    d.ProductVersion, d.BasebandVersion,
  ];
  const autoFilled = autoFields.filter(Boolean).length;
  s += Math.round((autoFilled / autoFields.length) * 20);

  // Battery (20 pts)
  const health = d.BatteryHealthPct ? parseInt(d.BatteryHealthPct) : null;
  if      (health === null)     s += 10;
  else if (health >= 85)        s += 20;
  else if (health >= 75)        s += 14;
  else if (health >= 60)        s += 8;
  else                          s += 2;

  // Tests (50 pts)
  const visibleTests = ALL_TESTS.filter(id => {
    const el = document.getElementById(id);
    return el && el.style.display !== 'none';
  });
  const passed = visibleTests.filter(id => _state.testResults[id] && _state.testResults[id].status === 'pass').length;
  const failed = visibleTests.filter(id => _state.testResults[id] && _state.testResults[id].status === 'fail').length;
  const scored = passed + failed;
  if (scored > 0) {
    s += Math.round((passed / scored) * 50);
  } else {
    s += 25; // Neutral if no tests done
  }

  // Security (10 pts)
  if (act === 'Activated') s += 5;
  if (d.IsSupervised !== 'true') s += 5;

  // Supervised penalty
  if (d.IsSupervised === 'true') s = Math.max(0, s - 15);

  s = Math.max(0, Math.min(100, s));

  let condition;
  if      (s >= 90) condition = 'excellent';
  else if (s >= 75) condition = 'good';
  else if (s >= 55) condition = 'fair';
  else if (s >= 35) condition = 'poor';
  else              condition = 'critical';

  return { score: s, condition, critReason: null };
}

// ── Render: Score ─────────────────────────────────────
function renderScore() {
  const { score, condition, critReason } = calcScore();

  // Big ring
  const CIRC = 351.9;
  const offset = CIRC * (1 - score / 100);
  const progress = document.querySelector('.score-ring-large-progress');
  if (progress) {
    progress.style.strokeDashoffset = offset;
    progress.style.stroke = conditionColor(condition);
  }

  const scoreBig = document.getElementById('scoreBig');
  if (scoreBig) scoreBig.textContent = score > 0 ? score : (critReason ? '0' : '—');

  // Condition banner
  const bannerCon = document.getElementById('condition-banner-container');
  if (bannerCon) {
    bannerCon.innerHTML = `<div class="condition-banner condition-${condition}">
      ${conditionLabel(condition)}
      ${critReason === 'activation-lock' ? '<div class="condition-sub">تحذير: قفل Activation Lock — لا تشتر هذا الجهاز</div>' : ''}
    </div>`;
  }

  // Breakdown grid
  const grid = document.getElementById('score-breakdown-grid');
  if (!grid) return;

  const d = _state.device;
  const health = d && d.BatteryHealthPct ? parseInt(d.BatteryHealthPct) : null;
  const visibleTests = ALL_TESTS.filter(id => {
    const el = document.getElementById(id);
    return el && el.style.display !== 'none';
  });
  const passed = visibleTests.filter(id => _state.testResults[id] && _state.testResults[id].status === 'pass').length;
  const failed = visibleTests.filter(id => _state.testResults[id] && _state.testResults[id].status === 'fail').length;
  const skipped= visibleTests.filter(id => _state.testResults[id] && _state.testResults[id].status === 'skip').length;
  const total  = visibleTests.length;

  grid.innerHTML = `
    <div class="score-breakdown">
      <h3>البطارية</h3>
      <div class="score-breakdown-val" style="color:${health >= 85 ? 'var(--green)' : health >= 75 ? 'var(--yellow)' : 'var(--red)'}">${health ? health + '%' : NA}</div>
      <div class="score-breakdown-sub">${health ? (health >= 85 ? 'ممتازة' : health >= 75 ? 'جيدة' : 'ضعيفة') : 'لا بيانات'}</div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${health || 0}%;background:${health >= 85 ? 'var(--green)' : health >= 75 ? 'var(--yellow)' : 'var(--red)'}"></div></div>
    </div>
    <div class="score-breakdown">
      <h3>الاختبارات</h3>
      <div class="score-breakdown-val">${passed} / ${total}</div>
      <div class="score-breakdown-sub">${passed} نجح — ${failed} فشل — ${skipped} تخطّى — ${total - passed - failed - skipped} لم يُختبر</div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${total > 0 ? Math.round(passed/total*100) : 0}%"></div></div>
    </div>
    <div class="score-breakdown">
      <h3>التفعيل والأمان</h3>
      <div class="score-breakdown-val" style="color:${(d && d.ActivationState === 'Activated') ? 'var(--green)' : 'var(--red)'}">${d ? actLabel(d.ActivationState) || NA : NA}</div>
      <div class="score-breakdown-sub">${d && d.IsSupervised === 'true' ? '⚠ تحت الإشراف' : d ? 'غير مُشرَف عليه ✓' : ''}</div>
    </div>
    <div class="score-breakdown">
      <h3>النتيجة الإجمالية</h3>
      <div class="score-breakdown-val" style="color:${conditionColor(condition)}">${score} نقطة</div>
      <div class="score-breakdown-sub">${conditionLabel(condition)}</div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${score}%;background:${conditionColor(condition)}"></div></div>
    </div>
  `;
}

// ── Render: Report ────────────────────────────────────
function renderReport(d) {
  if (!d) return;

  // Identity table
  const idTable = document.getElementById('rep-identity-table');
  if (idTable) {
    const rows = [
      ['الاسم', d.DeviceName], ['الموديل', d.ModelName || d.ProductType],
      ['iOS', d.ProductVersion], ['سيريال', d.SerialNumber],
      ['IMEI', d.InternationalMobileEquipmentIdentity],
      ['سنة الإصدار', d.releaseYear ? String(d.releaseYear) : null],
      ['اللون', d.colorName || d.colorHex],
    ];
    idTable.innerHTML = rows.filter(r => r[1]).map(r =>
      `<tr><td>${escHtml(r[0])}</td><td>${escHtml(r[1])}</td></tr>`
    ).join('');
  }

  // Battery table
  const battTable = document.getElementById('rep-battery-table');
  if (battTable) {
    const rows = [
      ['صحة البطارية', d.BatteryHealthPct],
      ['دورات الشحن', d.CycleCount],
      ['السعة الحالية', d.battNominalCap ? d.battNominalCap + ' mAh' : null],
      ['الحالة', d.battVerdict ? { ok:'سليمة', worn:'متهالكة', bad:'ضعيفة', thirdparty:'غير أصلية', unknown:'غير محدد' }[d.battVerdict] : null],
    ];
    battTable.innerHTML = rows.filter(r => r[1]).map(r =>
      `<tr><td>${escHtml(r[0])}</td><td>${escHtml(r[1])}</td></tr>`
    ).join('');
  }

  // Tests table
  const testsTable = document.getElementById('rep-tests-table');
  if (testsTable) {
    const rows = ALL_TESTS.map(id => {
      const el = document.getElementById(id);
      if (!el || el.style.display === 'none') return null;
      const res = _state.testResults[id];
      const status = res ? res.status : 'pending';
      const statusAr = { pass:'نجح ✓', fail:'فشل ✗', skip:'تخطّى —', pending:'لم يُختبر' }[status];
      const cls = status === 'pass' ? 'ok' : status === 'fail' ? 'fail' : status === 'skip' ? 'skip' : '';
      return `<tr><td>${escHtml(TEST_LABELS[id] || id)}</td><td class="${cls}">${statusAr}</td></tr>`;
    }).filter(Boolean);
    testsTable.innerHTML = rows.join('') || '<tr><td colspan="2">لا اختبارات</td></tr>';
  }

  // Score table
  const scoreTable = document.getElementById('rep-score-table');
  if (scoreTable) {
    const { score, condition } = calcScore();
    scoreTable.innerHTML = `
      <tr><td>النتيجة</td><td>${score} / 100</td></tr>
      <tr><td>التقييم</td><td>${conditionLabel(condition)}</td></tr>
      <tr><td>تاريخ الفحص</td><td>${new Date().toLocaleDateString('ar-SA')}</td></tr>
    `;
  }
}

// ── Score ring (sidebar) ──────────────────────────────
function updateScoreRing(score, condition) {
  const CIRC = 120.6; // 2 * π * 19.2
  const offset = CIRC * (1 - score / 100);
  const ring = document.querySelector('.score-ring-progress');
  if (ring) {
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = conditionColor(condition);
  }
}

// ── Diagnostics panel ─────────────────────────────────
function renderDiag(deps, diag = {}) {
  const hasDevice = diag.deviceList && diag.deviceList.length > 0;
  const steps = [
    { title:'libimobiledevice', ok:!!deps.ideviceinfo, sub:deps.ideviceinfo?'مثبت ✓':'brew install libimobiledevice' },
    { title:'usbmuxd',          ok:diag.usbmuxd==='running', sub:diag.usbmuxd==='running'?'يعمل ✓':'متوقف' },
    { title:'الآيفون متوصل',   ok:hasDevice, sub:hasDevice?diag.deviceList.length+' جهاز ✓':'لم يُكتشف جهاز' },
    { title:'الإقران / الثقة',
      ok:diag.pairStatus==='paired', warn:diag.pairStatus==='locked'||diag.pairStatus==='not_paired',
      sub:({paired:'مقترن ✓',locked:'⚠ الآيفون مقفول',not_paired:'⚠ اضغط ثق',no_device:'في انتظار الجهاز',tool_missing:'idevicepair ناقص',unknown:diag.pairRaw?diag.pairRaw.split('\n')[0]:'—'})[diag.pairStatus]||'—' },
  ];
  const grid = document.getElementById('diagGrid');
  if (grid) grid.innerHTML = steps.map(s => {
    const cls = s.ok?'ok':s.warn?'warn':'fail';
    return `<div class="diag-step ${cls}"><div class="dstep-icon">${s.ok?'✓':s.warn?'!':'✗'}</div><div class="dstep-body"><div class="dstep-title">${s.title}</div><div class="dstep-sub">${s.sub}</div></div></div>`;
  }).join('');

  const guide = document.getElementById('diagGuide');
  if (!guide) return;
  const inst = getInstructions(deps, diag);
  if (inst) { guide.style.display='block'; guide.innerHTML=`<div class="diag-guide-title">⚡ ${inst.title}</div><ol>${inst.steps.map(s=>`<li>${s}</li>`).join('')}</ol>`; }
  else guide.style.display='none';
}

function getInstructions(deps, diag={}) {
  if (!deps.ideviceinfo) return { title:'ثبّت libimobiledevice أولاً', steps:['افتح <strong>Terminal</strong>','اكتب: <code>brew install libimobiledevice</code>','أعد تشغيل التطبيق: <code>npm start</code>'] };
  if (diag.usbmuxd==='stopped') return { title:'usbmuxd متوقف', steps:['أعد تشغيل الماك','شغّل التطبيق من جديد'] };
  if (!diag.deviceList||!diag.deviceList.length) return { title:'الآيفون غير مكتشف', steps:['تأكد أن الكابل <strong>كابل بيانات</strong>','وصّل <strong>مباشرة بالماك</strong> بدون hub','<strong>افتح الآيفون</strong>','لو ظهرت رسالة <strong>"ثق"</strong> → اضغطها','اضغط <strong>↻ إعادة المحاولة</strong>'] };
  if (diag.pairStatus==='locked') return { title:'الآيفون مقفول', steps:['<strong>افتح الآيفون</strong> بالباسورد','اضغط <strong>↻ إعادة المحاولة</strong>'] };
  if (diag.pairStatus==='not_paired') return { title:'يحتاج الإقران', steps:['ابحث على الآيفون عن <strong>"هل تثق بهذا الكمبيوتر؟"</strong>','اضغط <strong>ثق</strong>','اضغط <strong>↻ إعادة المحاولة</strong>'] };
  return null;
}

// ── Retry ─────────────────────────────────────────────
async function retryDetection() {
  const btns = document.querySelectorAll('#retrySideBtn, .retry-btn');
  btns.forEach(b => { b.disabled = true; b.textContent = '...'; });
  try {
    const data = window.electronAPI
      ? await window.electronAPI.retry()
      : await fetch('/api/retry').then(r => r.json());
    handleUpdate(data);
  } catch (e) { console.error(e); }
  btns.forEach(b => { b.disabled = false; b.textContent = '↻ إعادة المحاولة'; });
}

// ── Raw diagnostics ───────────────────────────────────
async function loadRawDiagnostics() {
  const btn = document.getElementById('rawLoadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التحميل...'; }

  try {
    const raw = window.electronAPI
      ? await window.electronAPI.rawDiagnostics()
      : await fetch('/api/raw-diagnostics').then(r => r.json());

    const map = {
      'idevice_id':        'raw-idevice_id',
      'ideviceinfo_all':   'raw-ideviceinfo_all',
      'idevicepair':       'raw-idevicepair',
      'idevicediagnostics':'raw-idevicediagnostics',
      'system_profiler':   'raw-system_profiler',
    };

    for (const [key, elId] of Object.entries(map)) {
      const el = document.getElementById(elId);
      if (el) el.textContent = raw[key] || '(لا مخرجات)';
    }
  } catch (e) {
    console.error(e);
  }

  if (btn) { btn.disabled = false; btn.textContent = '↻ إعادة التحميل'; }
}

// ── Generate PDF ──────────────────────────────────────
async function generatePdf() {
  const btn = document.getElementById('pdfBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التصدير...'; }

  try {
    const result = window.electronAPI
      ? await window.electronAPI.generatePdf()
      : null;

    if (!result) {
      window.print();
    } else if (!result.ok && result.error !== 'canceled') {
      alert('فشل تصدير PDF: ' + result.error);
    }
  } catch (e) {
    console.error(e);
    window.print();
  }

  if (btn) { btn.disabled = false; btn.textContent = '🖨️ تصدير PDF'; }
}

// ── Copy raw text ─────────────────────────────────────
function copyRaw(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = el.textContent;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Helpers ───────────────────────────────────────────
function renderRows(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  const items = rows.filter(r => r.v != null && r.v !== '');
  el.innerHTML = items.length
    ? items.map(r => {
        const val = r.html ? r.v : escHtml(String(r.v));
        return `<div class="data-row"><span class="data-key">${escHtml(r.k)}</span><span class="data-val ${r.cls||''}">${val}</span></div>`;
      }).join('')
    : `<div class="data-row"><span class="data-key" style="color:var(--faint)">${NA}</span></div>`;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function battCls(v)  { const n=parseInt(v); if(!n)return''; return n>=50?'ok':n>=20?'warn':'bad'; }
function cycleCls(v) { const n=parseInt(v); if(!n)return''; return n<300?'ok':n<700?'warn':'bad'; }
function actLabel(v) {
  if(!v) return null;
  if(v==='Activated') return 'مفعّل ✓';
  if(v==='WaitingForActivation') return 'في انتظار التفعيل';
  if(v.includes('Lock')) return 'Activation Lock ✗';
  return v;
}
function simLabel(v) {
  if(!v) return null;
  if(v==='kCTSIMSupportSIMStatusReady') return 'شريحة جاهزة ✓';
  if(v==='kCTSIMSupportSIMStatusNotInserted') return 'لا توجد شريحة';
  return v;
}

function conditionColor(condition) {
  return condition === 'excellent' ? 'var(--green)'  :
         condition === 'good'      ? 'var(--blue)'   :
         condition === 'fair'      ? 'var(--yellow)'  :
         condition === 'poor'      ? 'var(--gold)'   : 'var(--red)';
}

function conditionLabel(condition) {
  return { excellent:'ممتاز', good:'جيد', fair:'مقبول', poor:'ضعيف', critical:'حرج' }[condition] || condition;
}
