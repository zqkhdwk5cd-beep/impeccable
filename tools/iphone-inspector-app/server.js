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

// ── Dependency check ─────────────────────────────────
function hasDep(cmd) {
  try { execSync(`which ${cmd}`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

const DEPS = {
  idevice_id:       hasDep('idevice_id'),
  ideviceinfo:      hasDep('ideviceinfo'),
  idevicediagnostics: hasDep('idevicediagnostics'),
};

// ── iPhone model name map ────────────────────────────
const MODEL_NAMES = {
  'iPhone14,4':'iPhone 13 mini','iPhone14,5':'iPhone 13','iPhone14,2':'iPhone 13 Pro','iPhone14,3':'iPhone 13 Pro Max',
  'iPhone14,6':'iPhone SE (3rd gen)',
  'iPhone15,2':'iPhone 14 Pro','iPhone15,3':'iPhone 14 Pro Max','iPhone14,7':'iPhone 14','iPhone14,8':'iPhone 14 Plus',
  'iPhone16,1':'iPhone 15','iPhone16,2':'iPhone 15 Plus','iPhone16,3':'iPhone 15 Pro','iPhone16,4':'iPhone 15 Pro Max',
  'iPhone17,1':'iPhone 16 Pro','iPhone17,2':'iPhone 16 Pro Max','iPhone17,3':'iPhone 16','iPhone17,4':'iPhone 16 Plus',
  'iPhone17,5':'iPhone 16e',
  'iPhone13,1':'iPhone 12 mini','iPhone13,2':'iPhone 12','iPhone13,3':'iPhone 12 Pro','iPhone13,4':'iPhone 12 Pro Max',
  'iPhone12,1':'iPhone 11','iPhone12,3':'iPhone 11 Pro','iPhone12,5':'iPhone 11 Pro Max','iPhone12,8':'iPhone SE (2nd gen)',
};

// ── ideviceinfo helpers ──────────────────────────────
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 4000 }).trim();
  } catch { return null; }
}

function getKey(udid, key) {
  const u = udid ? `-u ${udid}` : '';
  const v = run(`ideviceinfo ${u} -k ${key} 2>/dev/null`);
  return (v && !v.startsWith('ERROR') && v !== '') ? v : null;
}

function getDevices() {
  if (!DEPS.idevice_id) return [];
  const out = run('idevice_id -l 2>/dev/null');
  return out ? out.split('\n').filter(Boolean) : [];
}

function readDevice(udid) {
  if (!DEPS.ideviceinfo) return null;

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

  // Friendly model name
  if (d.ProductType) {
    d.ModelName = MODEL_NAMES[d.ProductType] || d.ProductType;
  }

  // Battery diagnostics
  if (DEPS.idevicediagnostics) {
    const args = u ? `-u ${u}` : '';
    const diag = run(`idevicediagnostics ${args} diagnostics IORegistry 2>/dev/null`);
    if (diag) {
      const extract = (key) => {
        const m = diag.match(new RegExp(`<key>${key}<\\/key>\\s*<(?:integer|real)>([^<]+)<`));
        return m ? m[1] : null;
      };
      const cc = extract('CycleCount');
      const dc = extract('DesignCapacity');
      const nc = extract('NominalChargeCapacity');
      const tmp = extract('Temperature');
      if (cc)  d.CycleCount = cc;
      if (dc)  d.DesignCapacity = dc;
      if (nc)  d.NominalChargeCapacity = nc;
      if (tmp) d.BatteryTemperature = (parseFloat(tmp) / 100).toFixed(1) + '°C';
      if (dc && nc) {
        d.BatteryHealthPct = Math.round((parseInt(nc) / parseInt(dc)) * 100) + '%';
      }
    }
  }

  return d;
}

// ── Poll for device changes ──────────────────────────
let lastUDIDs = [];
function poll() {
  const udids = getDevices();
  const same  = udids.length === lastUDIDs.length && udids.every((u, i) => u === lastUDIDs[i]);
  if (!same) {
    lastUDIDs = udids;
    const devices = udids.map(u => readDevice(u));
    bus.emit('update', { udids, devices });
  }
}
setInterval(poll, 2000);

// ── HTTP server ──────────────────────────────────────
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml' };

const server = http.createServer((req, res) => {
  // SSE endpoint
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('\n');

    // Send current state immediately
    const current = lastUDIDs.map(u => readDevice(u));
    res.write(`data: ${JSON.stringify({ udids: lastUDIDs, devices: current, deps: DEPS })}\n\n`);

    const listener = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    bus.on('update', listener);
    req.on('close', () => bus.off('update', listener));
    return;
  }

  // API: current device
  if (req.url === '/api/device') {
    const udids   = getDevices();
    const devices = udids.map(u => readDevice(u));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ udids, devices, deps: DEPS }));
    return;
  }

  // Static files
  let filePath = path.join(__dirname, 'public',
    req.url === '/' ? 'index.html' : req.url);
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
    console.log('  ⚠️  libimobiledevice مش مثبت. لتثبيته:');
    console.log('  brew install libimobiledevice\n');
  }
  // Open browser
  exec(`open "${url}"`);
});
