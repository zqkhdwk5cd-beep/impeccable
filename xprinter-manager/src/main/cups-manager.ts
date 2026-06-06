import { exec } from 'child_process';
import { promisify } from 'util';
import type { LabelProfile, CommandResult } from '../shared/types';
import { logger } from './logger';

const execAsync = promisify(exec);

async function runSafe(cmd: string): Promise<CommandResult> {
  logger.command(cmd);
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
    const result: CommandResult = { success: true, command: cmd, stdout, stderr };
    if (stdout) logger.info(stdout.trim());
    return result;
  } catch (err: any) {
    const result: CommandResult = {
      success: false,
      command: cmd,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? String(err),
    };
    logger.error(`Command failed: ${cmd}`, result.stderr);
    return result;
  }
}

function mmToPt(mm: number): number {
  return Math.round(mm * 2.8346 * 100) / 100;
}

export function buildMediaSize(profile: LabelProfile): string {
  const wPt = mmToPt(profile.widthMm);
  const hPt = mmToPt(profile.heightMm);
  return `Custom.${Math.round(wPt)}x${Math.round(hPt)}pt`;
}

export async function applyLabelSettings(
  printerName: string,
  profile: LabelProfile
): Promise<CommandResult> {
  logger.info(`Applying label settings to printer: ${printerName}`);

  const wPt = mmToPt(profile.widthMm);
  const hPt = mmToPt(profile.heightMm);
  const mediaSize = `Custom.${Math.round(wPt)}x${Math.round(hPt)}pt`;

  const options = [
    `-o media=${mediaSize}`,
    `-o fit-to-page=false`,
    `-o scaling=100`,
    `-o page-left=0`,
    `-o page-right=0`,
    `-o page-top=0`,
    `-o page-bottom=0`,
    `-o print-quality=5`,
  ].join(' ');

  const cmd = `lpoptions -p "${printerName}" ${options}`;
  logger.info(`Setting custom media size: ${mediaSize} (${profile.widthMm}×${profile.heightMm} mm)`);
  return runSafe(cmd);
}

export async function sendPrintJob(
  printerName: string,
  filePath: string,
  profile: LabelProfile,
  extraOptions: string[] = []
): Promise<CommandResult> {
  const wPt = mmToPt(profile.widthMm);
  const hPt = mmToPt(profile.heightMm);
  const mediaSize = `Custom.${Math.round(wPt)}x${Math.round(hPt)}pt`;

  const baseOptions = [
    `-d "${printerName}"`,
    `-o media=${mediaSize}`,
    `-o fit-to-page=false`,
    `-o scaling=100`,
    `-o page-left=0`,
    `-o page-right=0`,
    `-o page-top=0`,
    `-o page-bottom=0`,
    ...extraOptions,
  ];

  const cmd = `lp ${baseOptions.join(' ')} "${filePath}"`;
  logger.info(`Sending print job to ${printerName}: ${filePath}`);
  return runSafe(cmd);
}

export async function cancelAllJobs(printerName: string): Promise<CommandResult> {
  const cmd = `cancel -a "${printerName}" 2>/dev/null || true`;
  logger.info(`Cancelling all jobs for: ${printerName}`);
  return runSafe(cmd);
}

export async function installPPD(
  ppdPath: string,
  printerName: string,
  uri: string
): Promise<{ result: CommandResult; sudoRequired: boolean }> {
  const cmd = `lpadmin -p "${printerName}" -P "${ppdPath}" -E -v "${uri}"`;

  logger.warn(
    `Installing driver requires admin privileges`,
    `Command: ${cmd}\nReason: CUPS requires lpadmin to configure printer drivers`
  );

  const result = await runSafe(cmd);
  return { result, sudoRequired: false };
}

export async function getCurrentCupsOptions(printerName: string): Promise<Record<string, string>> {
  const cmd = `lpoptions -p "${printerName}" 2>/dev/null || true`;
  logger.command(cmd);
  try {
    const { stdout } = await execAsync(cmd, { timeout: 10000 });
    const options: Record<string, string> = {};
    const pairs = stdout.trim().split(/\s+/);
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        options[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
      }
    }
    return options;
  } catch {
    return {};
  }
}
