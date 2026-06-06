import { exec } from 'child_process';
import { promisify } from 'util';
import type { Printer, ConnectionType, PrinterStatus, DriverType, DriverStatus } from '../shared/types';
import { logger } from './logger';

const execAsync = promisify(exec);

async function run(cmd: string): Promise<{ stdout: string; stderr: string }> {
  logger.command(cmd);
  try {
    const result = await execAsync(cmd, { timeout: 15000 });
    return result;
  } catch (err: any) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? String(err) };
  }
}

// ─── CUPS registered printers ────────────────────────────────

function parseLpstatP(output: string): Map<string, PrinterStatus> {
  const map = new Map<string, PrinterStatus>();
  for (const line of output.split('\n')) {
    const m = line.match(/^printer\s+(\S+)\s+is\s+(\w+)/);
    if (!m) continue;
    const word = m[2].toLowerCase();
    let status: PrinterStatus = 'unknown';
    if (word === 'idle') status = 'idle';
    else if (word === 'busy' || word === 'printing') status = 'busy';
    else if (word === 'disabled' || word === 'stopped') status = 'stopped';
    map.set(m[1], status);
  }
  return map;
}

function parseLpstatV(output: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of output.split('\n')) {
    const m = line.match(/^device for\s+(\S+):\s+(.+)$/);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
}

function parseDefaultPrinter(output: string): string | null {
  const m = output.match(/system default destination:\s+(\S+)/);
  return m ? m[1] : null;
}

// ─── lpinfo -v: discovers raw USB/network URIs not yet in CUPS ─

interface RawDevice {
  uri: string;
  label: string;
  connectionType: ConnectionType;
}

function parseLpinfo(output: string): RawDevice[] {
  const devices: RawDevice[] = [];
  for (const line of output.split('\n')) {
    const m = line.match(/^(\S+)\s+(.+)$/);
    if (!m) continue;
    const [, uri, label] = m;
    if (uri.startsWith('usb://')) {
      devices.push({ uri, label: label.trim(), connectionType: 'USB' });
    } else if (
      uri.startsWith('socket://') ||
      uri.startsWith('lpd://') ||
      uri.startsWith('ipp://') ||
      uri.startsWith('http://')
    ) {
      devices.push({ uri, label: label.trim(), connectionType: 'Network' });
    }
  }
  return devices;
}

// ─── system_profiler: finds USB devices even without CUPS ────

interface USBDevice {
  name: string;
  vendorId: string;
  productId: string;
  manufacturer: string;
  serialNumber: string;
}

const PRINTER_KEYWORDS = [
  'printer', 'xprinter', 'zebra', 'bixolon', 'datamax', 'tsc',
  'citizen', 'star micronics', 'epson', 'postek', 'godex',
  'argox', 'eltron', 'intermec', 'honeywell', 'brother',
];

function looksPrinterLike(name: string, manufacturer: string): boolean {
  const combined = `${name} ${manufacturer}`.toLowerCase();
  return PRINTER_KEYWORDS.some((kw) => combined.includes(kw));
}

function parseSystemProfilerUSB(output: string): USBDevice[] {
  const devices: USBDevice[] = [];
  // system_profiler SPUSBDataType output uses indented key: value blocks
  // Each device block starts with an indented name line followed by key/value pairs
  const blocks = output.split(/\n(?=\s{6,8}\S)/);

  for (const block of blocks) {
    const lines = block.split('\n');
    const nameLine = lines[0]?.trim();
    if (!nameLine || nameLine.endsWith(':') === false) continue;
    const name = nameLine.replace(/:$/, '').trim();

    const get = (key: string): string => {
      const re = new RegExp(`${key}:\\s*(.+)`, 'i');
      for (const l of lines) {
        const m = l.match(re);
        if (m) return m[1].trim();
      }
      return '';
    };

    const vendorId = get('Vendor ID');
    const productId = get('Product ID');
    const manufacturer = get('Manufacturer');
    const serialNumber = get('Serial Number');

    if (looksPrinterLike(name, manufacturer)) {
      devices.push({ name, vendorId, productId, manufacturer, serialNumber });
    }
  }
  return devices;
}

// ─── Helpers ─────────────────────────────────────────────────

function inferConnectionType(uri: string): ConnectionType {
  if (uri.startsWith('usb://')) return 'USB';
  if (
    uri.startsWith('socket://') ||
    uri.startsWith('lpd://') ||
    uri.startsWith('ipp://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  )
    return 'Network';
  if (uri.startsWith('bluetooth://') || uri.startsWith('btspp://')) return 'Bluetooth';
  return 'Unknown';
}

async function getDriverType(printerName: string): Promise<{ driverType: DriverType; ppdPath: string }> {
  const { stdout: ppdRaw } = await run(
    `ls /etc/cups/ppd/${printerName}.ppd 2>/dev/null || echo ""`
  );
  const ppdPath = ppdRaw.trim();
  if (!ppdPath) return { driverType: 'unknown', ppdPath: '' };

  const { stdout: head } = await run(`head -30 "${ppdPath}" 2>/dev/null || echo ""`);
  const lower = head.toLowerCase();
  if (lower.includes('*nickname') && (lower.includes('generic') || lower.includes('raw'))) {
    return { driverType: 'generic', ppdPath };
  }
  return { driverType: 'custom', ppdPath };
}

// Build a sanitized printer name from a URI like usb://Xprinter/XP-N160II?serial=xxx
function nameFromUri(uri: string): string {
  try {
    const url = new URL(uri);
    const model = url.pathname.replace(/^\//, '') || url.hostname;
    return model.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  } catch {
    return 'USB_Printer';
  }
}

// ─── Main detection ──────────────────────────────────────────

export async function detectPrinters(): Promise<Printer[]> {
  logger.info('Starting printer detection (CUPS + lpinfo + system_profiler)...');

  const [pResult, vResult, dResult, lpinfoResult, spResult] = await Promise.all([
    run('lpstat -p 2>/dev/null || true'),
    run('lpstat -v 2>/dev/null || true'),
    run('lpstat -d 2>/dev/null || true'),
    // lpinfo -v discovers available (possibly unregistered) USB/network URIs
    run('lpinfo -v 2>/dev/null || true'),
    // system_profiler sees physical USB connections even with no driver
    run('system_profiler SPUSBDataType 2>/dev/null || true'),
  ]);

  const statusMap = parseLpstatP(pResult.stdout);
  const uriMap = parseLpstatV(vResult.stdout);
  const defaultName = parseDefaultPrinter(dResult.stdout);
  const rawDevices = parseLpinfo(lpinfoResult.stdout);
  const usbDevices = parseSystemProfilerUSB(spResult.stdout);

  const printers: Printer[] = [];
  const seenUris = new Set<string>();

  // 1. CUPS-registered printers (full details available)
  for (const [name, status] of statusMap) {
    const uri = uriMap.get(name) ?? '';
    const { driverType, ppdPath } = await getDriverType(name);

    const { stdout: optOut } = await run(`lpoptions -p "${name}" 2>/dev/null || true`);
    const infoM = optOut.match(/printer-info=([^\s]+)/);
    const desc = infoM ? decodeURIComponent(infoM[1].replace(/\+/g, ' ')) : name;

    printers.push({
      name,
      description: desc,
      uri,
      connectionType: inferConnectionType(uri),
      status,
      isDefault: name === defaultName,
      driverType,
      ppdPath: ppdPath || undefined,
    });
    if (uri) seenUris.add(uri);
  }

  // 2. Raw USB/network devices found by lpinfo but NOT yet registered in CUPS
  for (const dev of rawDevices) {
    if (seenUris.has(dev.uri)) continue;
    seenUris.add(dev.uri);

    const name = nameFromUri(dev.uri);
    logger.info(`Found unregistered device via lpinfo: ${dev.uri}`);

    printers.push({
      name,
      description: `${dev.label} (not added to CUPS yet)`,
      uri: dev.uri,
      connectionType: dev.connectionType,
      status: 'unknown',
      isDefault: false,
      driverType: 'unknown',
    });
  }

  // 3. Physical USB devices seen by system_profiler (deepest fallback)
  //    These appear when the printer is connected but not even visible to CUPS backends
  for (const usb of usbDevices) {
    const syntheticUri = `usb://${encodeURIComponent(usb.manufacturer || 'USB')}/${encodeURIComponent(usb.name)}`;
    // Deduplicate by name overlap with already-found devices
    const alreadyFound = printers.some(
      (p) =>
        p.uri.toLowerCase().includes(usb.name.toLowerCase().replace(/\s+/g, '')) ||
        p.name.toLowerCase().includes(usb.name.toLowerCase().replace(/\s+/g, ''))
    );
    if (alreadyFound) continue;

    logger.info(`Found USB printer via system_profiler: ${usb.name} (${usb.manufacturer})`);

    printers.push({
      name: usb.name.replace(/[^a-zA-Z0-9_-]/g, '_'),
      description: `${usb.name}${usb.manufacturer ? ` — ${usb.manufacturer}` : ''} (USB detected, not in CUPS)`,
      uri: syntheticUri,
      connectionType: 'USB',
      status: 'unknown',
      isDefault: false,
      driverType: 'unknown',
    });
  }

  if (printers.length === 0) {
    logger.warn(
      'No printers found. Verify:',
      '1. Printer is powered on and USB cable is connected\n' +
      '2. Run: lpstat -p && lpinfo -v\n' +
      '3. If lpinfo shows a usb:// URI, use "Add to CUPS" in the Driver tab'
    );
  } else {
    logger.info(`Total detected: ${printers.length} printer(s)`);
  }

  return printers;
}

export async function getPrinterOptions(printerName: string): Promise<Record<string, string>> {
  const { stdout } = await run(`lpoptions -p "${printerName}" -l 2>/dev/null || true`);
  const options: Record<string, string> = {};
  for (const line of stdout.split('\n')) {
    const m = line.match(/^(\S+?)(?:\/[^:]+)?:\s+(.+)$/);
    if (!m) continue;
    const selected = m[2].match(/\*(\S+)/);
    options[m[1]] = selected ? selected[1] : m[2].trim().split(/\s+/)[0];
  }
  return options;
}

export async function getDriverStatus(printerName: string): Promise<DriverStatus> {
  const { stdout: ppdRaw } = await run(
    `ls /etc/cups/ppd/${printerName}.ppd 2>/dev/null || echo ""`
  );
  const ppdPath = ppdRaw.trim();

  let ppdPreview = '';
  let driverName = 'Unknown';
  let isGeneric = true;

  if (ppdPath) {
    const { stdout: content } = await run(`head -40 "${ppdPath}" 2>/dev/null || echo ""`);
    ppdPreview = content.slice(0, 1200);

    const nickM = content.match(/\*NickName:\s*"([^"]+)"/i);
    if (nickM) driverName = nickM[1];

    const lower = content.toLowerCase();
    isGeneric = lower.includes('generic') || lower.includes('raw') || !content.trim();
  }

  return { printerName, isGeneric, ppdPath, ppdPreview, driverName };
}

// ─── Quick diagnostic for troubleshooting ───────────────────

export async function runDiagnostic(): Promise<string> {
  const cmds = [
    'lpstat -p 2>&1 || echo "(no CUPS printers)"',
    'lpstat -v 2>&1 || echo "(no CUPS URIs)"',
    'lpinfo -v 2>&1 | grep -i usb || echo "(no USB via lpinfo)"',
    'system_profiler SPUSBDataType 2>&1 | grep -A5 -i "xprinter\\|zebra\\|printer\\|pos\\|thermal" | head -40 || echo "(no USB printer in system_profiler)"',
  ];

  const parts: string[] = [];
  for (const cmd of cmds) {
    parts.push(`$ ${cmd}`);
    const { stdout, stderr } = await run(cmd);
    parts.push(stdout || stderr || '(no output)');
    parts.push('');
  }
  return parts.join('\n');
}
