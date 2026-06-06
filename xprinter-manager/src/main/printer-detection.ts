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

export async function detectPrinters(): Promise<Printer[]> {
  logger.info('Starting printer detection...');

  const [pResult, vResult, dResult] = await Promise.all([
    run('lpstat -p 2>/dev/null || true'),
    run('lpstat -v 2>/dev/null || true'),
    run('lpstat -d 2>/dev/null || true'),
  ]);

  const statusMap = parseLpstatP(pResult.stdout);
  const uriMap = parseLpstatV(vResult.stdout);
  const defaultName = parseDefaultPrinter(dResult.stdout);

  const printers: Printer[] = [];

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
  }

  logger.info(`Detected ${printers.length} printer(s)`);
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
