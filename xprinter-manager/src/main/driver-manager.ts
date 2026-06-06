import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import type { CommandResult } from '../shared/types';
import { logger } from './logger';
import { installPPD } from './cups-manager';

function getDriversDir(): string {
  const dir = path.join(app.getAppPath(), 'drivers');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function listLocalDrivers(): string[] {
  const dir = getDriversDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ppd') || f.endsWith('.gz'))
    .map((f) => path.join(dir, f));
}

export async function selectPPDFile(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select PPD Driver File',
    filters: [
      { name: 'PPD Files', extensions: ['ppd', 'gz'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

export async function copyDriverToLocal(sourcePath: string): Promise<string> {
  const driversDir = getDriversDir();
  const filename = path.basename(sourcePath);
  const destPath = path.join(driversDir, filename);

  if (sourcePath !== destPath) {
    fs.copyFileSync(sourcePath, destPath);
    logger.info(`Driver copied to: ${destPath}`);
  }

  return destPath;
}

export async function applyDriverToPrinter(
  ppdPath: string,
  printerName: string,
  printerUri: string
): Promise<CommandResult> {
  logger.info(`Applying driver ${path.basename(ppdPath)} to printer ${printerName}`);
  logger.warn(
    'Installing a PPD driver modifies CUPS configuration',
    `Printer: ${printerName}\nDriver: ${ppdPath}\nURI: ${printerUri}`
  );

  const localPath = await copyDriverToLocal(ppdPath);
  const { result } = await installPPD(localPath, printerName, printerUri);
  return result;
}
