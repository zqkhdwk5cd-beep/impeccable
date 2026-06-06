'use strict';
const { app, BrowserWindow, ipcMain, Menu, nativeTheme, shell, dialog } = require('electron');
const path    = require('path');
const fs      = require('fs');
const { execSync } = require('child_process');
const { MODEL_NAMES, MODEL_YEAR, CAMERA_CONFIG, COLOR_NAMES, MODEL_CAPS } = require('./data');

// ── Single-instance lock ──────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

// ── Binary search ─────────────────────────────────────
const SEARCH_DIRS = [
  '/opt/homebrew/bin',
  '/opt/homebrew/Cellar/libimobiledevice/1.4.0/bin',
  '/usr/local/bin',
  '/usr/bin',
];

function findBin(cmd) {
  for (const dir of SEARCH_DIRS) {
    const full = path.join(dir, cmd);
    if (fs.existsSync(full)) return full;
  }
  try {
    const p = execSync(`command -v ${cmd} 2>/dev/null`, { encoding: 'utf8', timeout: 2000 }).trim();
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return null;
}

const BIN = {
  idevice_id:         findBin('idevice_id'),
  ideviceinfo:        findBin('ideviceinfo'),
  idevicediagnostics: findBin('idevicediagnostics'),
  idevicepair:        findBin('idevicepair'),
  system_profiler:    findBin('system_profiler'),
};

const DEPS = {
  idevice_id:         !!BIN.idevice_id,
  ideviceinfo:        !!BIN.ideviceinfo,
  idevicediagnostics: !!BIN.idevicediagnostics,
};

console.log('── Dependency check ──');
for (const [k, v] of Object.entries(BIN)) console.log(`  ${k}: ${v || '✗ not found'}`);

// ── Detection helpers ─────────────────────────────────
function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 6000 }).trim(); }
  catch { return null; }
}

function getKey(udid, key, domain) {
  if (!BIN.ideviceinfo) return null;
  const u = udid ? `-u ${udid}` : '';
  const q = domain ? `-q ${domain}` : '';
  const v = run(`"${BIN.ideviceinfo}" ${u} ${q} -k ${key} 2>/dev/null`);
  return (v && !v.startsWith('ERROR') && v !== '') ? v : null;
}

function getDevices() {
  if (!BIN.idevice_id) return [];
  const out = run(`"${BIN.idevice_id}" -l 2>/dev/null`);
  return out ? out.split('\n').filter(Boolean) : [];
}

function readDevice(udid) {
  if (!BIN.ideviceinfo) return null;
  const u = udid || '';
  const d = {};

  const keys = [
    'DeviceName','ProductType','ProductVersion','BuildVersion',
    'SerialNumber','InternationalMobileEquipmentIdentity',
    'InternationalMobileEquipmentIdentity2','PhoneNumber',
    'ActivationState','BatteryCurrentCapacity','BatteryIsCharging',
    'DeviceColor','DeviceEnclosureColor','DeviceClass',
    'SIMStatus','CPUArchitecture','HardwareModel',
    'TotalDiskCapacity','TotalSystemAvailable',
    'UniqueDeviceID','MLBSerialNumber','WifiAddress','BluetoothAddress',
    'RegionInfo','SIMTrayStatus','InternationalMobileSubscriberIdentity',
    'UniqueChipID','BasebandVersion','ModelNumber','IsSupervised','PasswordProtected',
  ];
  for (const k of keys) {
    const v = getKey(u, k);
    if (v) d[k] = v;
  }

  // Resolve human-readable model name
  if (d.ProductType) {
    d.ModelName    = MODEL_NAMES[d.ProductType] || d.ProductType;
    d.releaseYear  = MODEL_YEAR[d.ProductType]  || null;
  }

  // Resolve color name from hex
  const hex = (d.DeviceColor || d.DeviceEnclosureColor || '').toLowerCase();
  if (hex) {
    d.colorName = COLOR_NAMES[hex] || null;
    d.colorHex  = hex;            // normalised lowercase hex
  }

  return d;
}

function readComponents(udid) {
  const u = udid ? `-u ${udid}` : '';
  const r = {};

  // Battery via IORegistry
  if (BIN.idevicediagnostics) {
    const io = run(`"${BIN.idevicediagnostics}" ${u} diagnostics IORegistry 2>/dev/null`);
    if (io) {
      const num = k => { const m = io.match(new RegExp(`<key>${k}<\\/key>\\s*<(?:integer|real)>([^<]+)<`)); return m ? m[1] : null; };
      const str = k => { const m = io.match(new RegExp(`<key>${k}<\\/key>\\s*<string>([^<]+)<`));          return m ? m[1] : null; };
      const dc = num('DesignCapacity'), nc = num('NominalChargeCapacity');
      const cc = num('CycleCount'), tmp = num('Temperature'), vol = num('Voltage');

      r.battSerial       = str('Serial');
      r.battMfr          = str('Manufacturer');
      r.battDesignCap    = dc;
      r.battNominalCap   = nc;
      r.CycleCount       = cc;
      r.BatteryTemperature = tmp ? (parseFloat(tmp) / 100).toFixed(1) + '°C' : null;
      r.battVoltage      = vol ? (parseInt(vol) / 1000).toFixed(2) + 'V' : null;

      if (dc && nc) r.BatteryHealthPct = Math.round((parseInt(nc) / parseInt(dc)) * 100) + '%';

      const health  = dc && nc ? Math.round((parseInt(nc) / parseInt(dc)) * 100) : null;
      const cycles  = parseInt(cc) || 0;
      const mfr     = (r.battMfr || '').toLowerCase();
      const serial  = r.battSerial || '';
      const likelyApple = !r.battMfr || mfr.includes('apple') || mfr === 'ds' ||
                          /^(f|c|g)[0-9a-z]{6,14}$/i.test(serial);

      if (!health)                               r.battVerdict = 'unknown';
      else if (!likelyApple)                     r.battVerdict = 'thirdparty';
      else if (health >= 85 && cycles < 500)     r.battVerdict = 'ok';
      else if (health >= 75 || cycles < 900)     r.battVerdict = 'worn';
      else                                       r.battVerdict = 'bad';
    }
  }

  // Screen / True Tone via iqagent domain
  if (BIN.ideviceinfo) {
    const iq = run(`"${BIN.ideviceinfo}" ${u} -q com.apple.iqagent 2>/dev/null`);
    r.trueTone      = (iq && !iq.startsWith('ERROR') && iq.trim().length > 50) ? 'yes' : 'no';
    r.screenVerdict = r.trueTone === 'yes' ? 'ok' : 'warn';
  }

  return r;
}

function readGestalt(udid) {
  if (!BIN.ideviceinfo) return {};
  const u   = udid ? `-u ${udid}` : '';
  const xml = run(`"${BIN.ideviceinfo}" ${u} -q com.apple.MobileGestalt 2>/dev/null`);
  if (!xml || xml.startsWith('ERROR') || xml.length < 100) return {};

  const bool = k => { const m = xml.match(new RegExp(`<key>${k}<\\/key>\\s*<(true|false)\\/>`)); return m ? m[1] === 'true' : null; };
  const num  = k => { const m = xml.match(new RegExp(`<key>${k}<\\/key>\\s*<(?:integer|real)>([^<]+)<`)); return m ? m[1] : null; };

  return {
    gHasNFC:       bool('HasNFC'),
    gHasBarometer: bool('HasBarometer'),
    gHasGPS:       bool('HasGPS'),
    gHasGyro:      bool('HasGyroscope'),
    gHasCompass:   bool('HasMagnetometer'),
    gHasTrueDepth: bool('HasTrueDepthCamera'),
    gHasTelephoto: bool('HasTelephotoCamera'),
    gHasLiDAR:     bool('HasLiDARScanner'),
    gHasTaptic:    bool('SupportsTapticEngine'),
    gCameraCount:  num('CameraCount'),
  };
}

function runDiagnostics() {
  const d = {};

  try { execSync('pgrep usbmuxd', { stdio: 'ignore', timeout: 2000 }); d.usbmuxd = 'running'; }
  catch { d.usbmuxd = 'stopped'; }

  d.deviceList = []; d.deviceListRaw = '';
  if (BIN.idevice_id) {
    const raw = run(`"${BIN.idevice_id}" -l 2>&1`) || '';
    d.deviceListRaw = raw;
    d.deviceList = raw.split('\n').filter(l =>
      /^[0-9a-f]{40}$/i.test(l.trim()) || /^[0-9a-f]{8}-[0-9a-f]{16}$/i.test(l.trim())
    );
  }

  d.pairStatus = 'no_device'; d.pairRaw = '';
  if (BIN.idevicepair && d.deviceList.length > 0) {
    const out = run(`"${BIN.idevicepair}" validate 2>&1`) || '';
    d.pairRaw = out;
    if (out.includes('SUCCESS'))                 d.pairStatus = 'paired';
    else if (out.includes('PASSWORD_PROTECTED')) d.pairStatus = 'locked';
    else if (/not paired/i.test(out))            d.pairStatus = 'not_paired';
    else if (/No device/i.test(out))             d.pairStatus = 'no_device';
    else                                         d.pairStatus = 'unknown';
  } else if (!BIN.idevicepair) {
    d.pairStatus = 'tool_missing';
  }

  return d;
}

function getStatus() {
  const udids   = getDevices();
  const devices = udids.map(u => ({ ...readDevice(u), ...readComponents(u), ...readGestalt(u) }));
  const diag    = runDiagnostics();
  return { udids, devices, deps: DEPS, diag, camCfg: CAMERA_CONFIG, caps: MODEL_CAPS };
}

// ── Electron window ───────────────────────────────────
let win;
let pollTimer;
let lastUDIDs = [];

function createWindow() {
  nativeTheme.themeSource = 'dark';

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'فاحص الآيفون',
    backgroundColor: '#0d0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.loadFile(path.join(__dirname, 'public', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    startPolling();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    if (pollTimer) clearInterval(pollTimer);
    win = null;
  });
}

function startPolling() {
  const data = getStatus();
  lastUDIDs = data.udids;
  if (win) win.webContents.send('device-update', data);

  pollTimer = setInterval(() => {
    const udids = getDevices();
    const same  = udids.length === lastUDIDs.length && udids.every((u, i) => u === lastUDIDs[i]);
    if (!same) {
      lastUDIDs = udids;
      if (win) win.webContents.send('device-update', getStatus());
    }
  }, 2000);
}

ipcMain.handle('retry', async () => {
  lastUDIDs = [];
  return getStatus();
});

ipcMain.handle('raw-diagnostics', async () => {
  const result = {};

  // idevice_id
  result.idevice_id = BIN.idevice_id
    ? (run(`"${BIN.idevice_id}" -l 2>&1`) || '(لا مخرجات)')
    : '(الأداة غير موجودة)';

  // ideviceinfo (no domain)
  result.ideviceinfo_all = BIN.ideviceinfo
    ? (run(`"${BIN.ideviceinfo}" 2>&1`) || '(لا مخرجات)')
    : '(الأداة غير موجودة)';

  // idevicepair
  result.idevicepair = BIN.idevicepair
    ? (run(`"${BIN.idevicepair}" validate 2>&1`) || '(لا مخرجات)')
    : '(الأداة غير موجودة)';

  // idevicediagnostics
  result.idevicediagnostics = BIN.idevicediagnostics
    ? (run(`"${BIN.idevicediagnostics}" diagnostics IORegistry 2>&1`) || '(لا مخرجات)')
    : '(الأداة غير موجودة)';

  // system_profiler SPUSBDataType
  result.system_profiler = BIN.system_profiler
    ? (run(`"${BIN.system_profiler}" SPUSBDataType 2>&1`) || '(لا مخرجات)')
    : (run('system_profiler SPUSBDataType 2>&1') || '(لا مخرجات)');

  return result;
});

ipcMain.handle('generate-pdf', async () => {
  if (!win) return { ok: false, error: 'no window' };

  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'حفظ تقرير PDF',
    defaultPath: 'iphone-report.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return { ok: false, error: 'canceled' };

  try {
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
    });
    fs.writeFileSync(filePath, data);
    await shell.openPath(filePath);
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── App lifecycle ─────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { label: 'تحرير', submenu: [{ role: 'copy', label: 'نسخ' }, { role: 'selectAll', label: 'تحديد الكل' }] },
    { label: 'نافذة', submenu: [{ role: 'minimize', label: 'تصغير' }, { role: 'zoom', label: 'تكبير' }, { role: 'close', label: 'إغلاق' }] },
  ]));
  createWindow();
});

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
