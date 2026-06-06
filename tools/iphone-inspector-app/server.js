#!/usr/bin/env node
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const { EventEmitter } = require('events');

const PORT = 3737;
const bus  = new EventEmitter();
bus.setMaxListeners(50);

// ── Find binaries ─────────────────────────────────────
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
};

const DEPS = {
  idevice_id:         !!BIN.idevice_id,
  ideviceinfo:        !!BIN.ideviceinfo,
  idevicediagnostics: !!BIN.idevicediagnostics,
};

console.log('── Dependency check ──');
for (const [k, v] of Object.entries(BIN)) console.log(`  ${k}: ${v || '✗ not found'}`);
console.log('');

// ── Camera / biometric config by model ───────────────
// [rearCams, hasTelephoto, hasLiDAR, hasTrueDepth (Face ID)]
const CAMERA_CONFIG = {
  'iPhone18,2':[3,true, true, true], 'iPhone18,3':[3,true, true, true],
  'iPhone18,1':[2,false,false,true], 'iPhone18,4':[2,false,false,true],
  'iPhone17,1':[3,true, true, true], 'iPhone17,2':[3,true, true, true],
  'iPhone17,3':[2,false,false,true], 'iPhone17,4':[2,false,false,true],
  'iPhone17,5':[2,false,false,false],
  'iPhone16,3':[3,true, true, true], 'iPhone16,4':[3,true, true, true],
  'iPhone16,1':[2,false,false,true], 'iPhone16,2':[2,false,false,true],
  'iPhone15,2':[3,true, true, true], 'iPhone15,3':[3,true, true, true],
  'iPhone14,7':[2,false,false,true], 'iPhone14,8':[2,false,false,true],
  'iPhone14,2':[3,true, true, true], 'iPhone14,3':[3,true, true, true],
  'iPhone14,4':[2,false,false,true], 'iPhone14,5':[2,false,false,true],
  'iPhone14,6':[2,false,false,false],
  'iPhone13,3':[3,true, true, true], 'iPhone13,4':[3,true, true, true],
  'iPhone13,1':[2,false,false,true], 'iPhone13,2':[2,false,false,true],
  'iPhone12,3':[3,true, false,true], 'iPhone12,5':[3,true, false,true],
  'iPhone12,1':[2,false,false,true], 'iPhone12,8':[1,false,false,false],
  'iPhone11,2':[2,true, false,true], 'iPhone11,4':[2,true, false,true],
  'iPhone11,6':[2,true, false,true], 'iPhone11,8':[1,false,false,true],
  'iPhone10,3':[2,true, false,true], 'iPhone10,6':[2,true, false,true],
  'iPhone10,1':[1,false,false,false],'iPhone10,2':[2,true, false,false],
};

// ── iPhone model map ──────────────────────────────────
const MODEL_NAMES = {
  'iPhone14,4':'iPhone 13 mini','iPhone14,5':'iPhone 13','iPhone14,2':'iPhone 13 Pro','iPhone14,3':'iPhone 13 Pro Max',
  'iPhone14,6':'iPhone SE (3rd gen)',
  'iPhone15,2':'iPhone 14 Pro','iPhone15,3':'iPhone 14 Pro Max','iPhone14,7':'iPhone 14','iPhone14,8':'iPhone 14 Plus',
  'iPhone16,1':'iPhone 15','iPhone16,2':'iPhone 15 Plus','iPhone16,3':'iPhone 15 Pro','iPhone16,4':'iPhone 15 Pro Max',
  'iPhone17,1':'iPhone 16 Pro','iPhone17,2':'iPhone 16 Pro Max','iPhone17,3':'iPhone 16','iPhone17,4':'iPhone 16 Plus',
  'iPhone17,5':'iPhone 16e',
  'iPhone18,1':'iPhone 17','iPhone18,2':'iPhone 17 Pro','iPhone18,3':'iPhone 17 Pro Max','iPhone18,4':'iPhone 17 Plus',
  'iPhone13,1':'iPhone 12 mini','iPhone13,2':'iPhone 12','iPhone13,3':'iPhone 12 Pro','iPhone13,4':'iPhone 12 Pro Max',
  'iPhone12,1':'iPhone 11','iPhone12,3':'iPhone 11 Pro','iPhone12,5':'iPhone 11 Pro Max','iPhone12,8':'iPhone SE (2nd gen)',
  'iPhone10,1':'iPhone 8','iPhone10,2':'iPhone 8 Plus','iPhone10,3':'iPhone X','iPhone10,6':'iPhone X',
  'iPhone11,2':'iPhone XS','iPhone11,4':'iPhone XS Max','iPhone11,6':'iPhone XS Max','iPhone11,8':'iPhone XR',
};

// True Tone supported starting iPhone 8 (ProductType >= iPhone10,x)
const TRUE_TONE_MODELS = new Set(Object.keys(MODEL_NAMES).filter(k => {
  const [, major] = k.match(/iPhone(\d+)/) || [];
  return parseInt(major) >= 10;
}));

// ── Helpers ───────────────────────────────────────────
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

// ── Read basic device info ────────────────────────────
function readDevice(udid) {
  if (!BIN.ideviceinfo) return null;
  const u = udid || '';
  const d = {};

  const keys = [
    'DeviceName','ProductType','ProductVersion','BuildVersion',
    'SerialNumber','InternationalMobileEquipmentIdentity',
    'InternationalMobileEquipmentIdentity2','PhoneNumber',
    'ActivationState','BatteryCurrentCapacity','BatteryIsCharging',
    'DeviceColor','DeviceClass','SIMStatus','CPUArchitecture',
    'HardwareModel','TotalDiskCapacity','TotalSystemAvailable',
    'UniqueDeviceID','MLBSerialNumber','WifiAddress','BluetoothAddress',
  ];
  for (const k of keys) {
    const v = getKey(u, k);
    if (v) d[k] = v;
  }
  if (d.ProductType) d.ModelName = MODEL_NAMES[d.ProductType] || d.ProductType;
  return d;
}

// ── Component deep analysis ───────────────────────────
function readComponents(udid) {
  const u  = udid ? `-u ${udid}` : '';
  const r  = {};

  // ── Battery (via IORegistry) ──────────────────────
  if (BIN.idevicediagnostics) {
    const io = run(`"${BIN.idevicediagnostics}" ${u} diagnostics IORegistry 2>/dev/null`);
    if (io) {
      const num = k => { const m = io.match(new RegExp(`<key>${k}<\\/key>\\s*<(?:integer|real)>([^<]+)<`)); return m ? m[1] : null; };
      const str = k => { const m = io.match(new RegExp(`<key>${k}<\\/key>\\s*<string>([^<]+)<`));          return m ? m[1] : null; };

      const dc  = num('DesignCapacity');
      const nc  = num('NominalChargeCapacity');
      const cc  = num('CycleCount');
      const tmp = num('Temperature');
      const vol = num('Voltage');

      r.battSerial      = str('Serial');
      r.battMfr         = str('Manufacturer');
      r.battDesignCap   = dc;
      r.battNominalCap  = nc;
      r.CycleCount      = cc;
      r.BatteryTemperature = tmp ? (parseFloat(tmp) / 100).toFixed(1) + '°C' : null;
      r.battVoltage     = vol ? (parseInt(vol) / 1000).toFixed(2) + 'V' : null;

      if (dc && nc) {
        r.BatteryHealthPct = Math.round((parseInt(nc) / parseInt(dc)) * 100) + '%';
      }

      // Verdict
      const health  = dc && nc ? Math.round((parseInt(nc) / parseInt(dc)) * 100) : null;
      const cycles  = parseInt(cc) || 0;
      const mfr     = (r.battMfr || '').toLowerCase();
      const serial  = r.battSerial || '';
      const likelyApple = !r.battMfr || mfr.includes('apple') || mfr === 'ds' ||
                          /^(f|c|g)[0-9a-z]{6,14}$/i.test(serial);

      if (!health) {
        r.battVerdict = 'unknown';
      } else if (!likelyApple) {
        r.battVerdict = 'thirdparty';   // non-Apple battery
      } else if (health >= 85 && cycles < 500) {
        r.battVerdict = 'ok';
      } else if (health >= 75 || cycles < 900) {
        r.battVerdict = 'worn';
      } else {
        r.battVerdict = 'bad';
      }
    }
  }

  // ── Screen / True Tone (iqagent domain) ──────────
  if (BIN.ideviceinfo) {
    const iq = run(`"${BIN.ideviceinfo}" ${u} -q com.apple.iqagent 2>/dev/null`);
    if (iq && !iq.startsWith('ERROR') && iq.trim().length > 50) {
      r.trueTone        = 'yes';     // calibration data present → genuine screen
      r.screenVerdict   = 'ok';
    } else {
      r.trueTone        = 'no';
      r.screenVerdict   = 'warn';    // might be replaced
    }
  }

  return r;
}

// ── MobileGestalt hardware capabilities ──────────────
function readGestalt(udid) {
  if (!BIN.ideviceinfo) return {};
  const u   = udid ? `-u ${udid}` : '';
  const xml = run(`"${BIN.ideviceinfo}" ${u} -q com.apple.MobileGestalt 2>/dev/null`);
  if (!xml || xml.startsWith('ERROR') || xml.length < 100) return {};

  const bool = k => {
    const m = xml.match(new RegExp(`<key>${k}<\\/key>\\s*<(true|false)\\/>`));
    return m ? m[1] === 'true' : null;  // null = key absent ≠ false
  };
  const num = k => {
    const m = xml.match(new RegExp(`<key>${k}<\\/key>\\s*<(?:integer|real)>([^<]+)<`));
    return m ? m[1] : null;
  };

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

// ── Diagnostics (connection status) ──────────────────
function runDiagnostics() {
  const d = {};

  try { execSync('pgrep usbmuxd', { stdio: 'ignore', timeout: 2000 }); d.usbmuxd = 'running'; }
  catch { d.usbmuxd = 'stopped'; }

  d.deviceList = [];
  d.deviceListRaw = '';
  if (BIN.idevice_id) {
    const raw = run(`"${BIN.idevice_id}" -l 2>&1`) || '';
    d.deviceListRaw = raw;
    d.deviceList = raw.split('\n').filter(l =>
      /^[0-9a-f]{40}$/i.test(l.trim()) || /^[0-9a-f]{8}-[0-9a-f]{16}$/i.test(l.trim())
    );
  }

  d.pairStatus = 'no_device';
  d.pairRaw    = '';
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

// ── Polling ───────────────────────────────────────────
let lastUDIDs = [];
function poll() {
  const udids = getDevices();
  const same  = udids.length === lastUDIDs.length && udids.every((u, i) => u === lastUDIDs[i]);
  if (!same) {
    lastUDIDs = udids;
    const devices = udids.map(u => ({ ...readDevice(u), ...readComponents(u), ...readGestalt(u) }));
    const diag    = runDiagnostics();
    bus.emit('update', { udids, devices, diag });
  }
}
setInterval(poll, 2000);

// ── HTTP server ───────────────────────────────────────
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml' };

const server = http.createServer((req, res) => {

  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type':'text/event-stream','Cache-Control':'no-cache',
      'Connection':'keep-alive','Access-Control-Allow-Origin':'*',
    });
    res.write('\n');
    const devices = lastUDIDs.map(u => ({ ...readDevice(u), ...readComponents(u), ...readGestalt(u) }));
    const diag    = runDiagnostics();
    res.write(`data: ${JSON.stringify({ udids: lastUDIDs, devices, deps: DEPS, diag, camCfg: CAMERA_CONFIG })}\n\n`);
    const listener = data => res.write(`data: ${JSON.stringify(data)}\n\n`);
    bus.on('update', listener);
    req.on('close', () => bus.off('update', listener));
    return;
  }

  if (req.url === '/api/retry') {
    poll();
    const udids   = getDevices();
    const devices = udids.map(u => ({ ...readDevice(u), ...readComponents(u), ...readGestalt(u) }));
    const diag    = runDiagnostics();
    res.writeHead(200, { 'Content-Type':'application/json' });
    res.end(JSON.stringify({ udids, devices, deps: DEPS, diag, camCfg: CAMERA_CONFIG }));
    return;
  }

  if (req.url === '/api/device') {
    const udids   = getDevices();
    const devices = udids.map(u => ({ ...readDevice(u), ...readComponents(u), ...readGestalt(u) }));
    const diag    = runDiagnostics();
    res.writeHead(200, { 'Content-Type':'application/json' });
    res.end(JSON.stringify({ udids, devices, deps: DEPS, diag, camCfg: CAMERA_CONFIG }));
    return;
  }

  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  فاحص الآيفون يعمل على ${url}\n`);
  if (!DEPS.ideviceinfo) {
    console.log('  ⚠️  libimobiledevice مش مثبت — brew install libimobiledevice\n');
  }
  exec(`open "${url}"`);
});
