import { ipcMain, dialog } from 'electron';
import type {
  LabelProfile,
  UserAlignmentFeedback,
  AppSettings,
  CommandResult,
} from '../shared/types';
import { logger } from './logger';
import { detectPrinters, getPrinterOptions, getDriverStatus, runDiagnostic } from './printer-detection';
import { applyLabelSettings, cancelAllJobs, getCurrentCupsOptions } from './cups-manager';
import { selectPPDFile, applyDriverToPrinter, listLocalDrivers } from './driver-manager';
import { printTestLabel, printPDF, sendRawTSPL, sendRawZPL } from './print-manager';
import { applyFeedback } from './calibration';
import {
  loadSettings,
  saveSettings,
  saveProfile,
  deleteProfile,
  createBackup,
  getBackupById,
} from './settings-store';
import { generateId } from './label-config';

function handle<T>(channel: string, fn: (...args: any[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      logger.error(`IPC ${channel} failed`, String(err));
      throw err;
    }
  });
}

export function registerHandlers(): void {
  // Printer detection
  handle('printers:detect', () => detectPrinters());
  handle('printers:options', (name: string) => getPrinterOptions(name));
  handle('printers:driver-status', (name: string) => getDriverStatus(name));
  handle('printers:diagnostic', () => runDiagnostic());

  // Add unregistered USB device to CUPS with a generic driver
  handle('printers:add-to-cups', async (printerName: string, uri: string) => {
    logger.info(`Adding printer to CUPS: ${printerName} @ ${uri}`);
    logger.warn(
      'Adding printer to CUPS requires lpadmin',
      `Command: lpadmin -p "${printerName}" -v "${uri}" -m drv:///sample.drv/generic.ppd -E\nThis registers the device with a Generic PPD. You can install a proper PPD afterwards.`
    );
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const cmd = `lpadmin -p "${printerName}" -v "${uri}" -m drv:///sample.drv/generic.ppd -E`;
    logger.command(cmd);
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
      logger.success(`Printer added: ${printerName}`);
      return { success: true, command: cmd, stdout, stderr } as CommandResult;
    } catch (err: any) {
      logger.error('Failed to add printer', err.stderr ?? String(err));
      return { success: false, command: cmd, stdout: err.stdout ?? '', stderr: err.stderr ?? String(err) } as CommandResult;
    }
  });

  // Driver management
  handle('drivers:select-ppd', () => selectPPDFile());
  handle('drivers:list-local', () => listLocalDrivers());
  handle('drivers:apply', (ppdPath: string, printerName: string, printerUri: string) =>
    applyDriverToPrinter(ppdPath, printerName, printerUri)
  );

  // CUPS settings
  handle('cups:apply-label', (printerName: string, profile: LabelProfile) =>
    applyLabelSettings(printerName, profile)
  );
  handle('cups:get-options', (printerName: string) => getCurrentCupsOptions(printerName));
  handle('cups:cancel-jobs', (printerName: string) => cancelAllJobs(printerName));

  // Print
  handle('print:test-label', (printerName: string, profile: LabelProfile) =>
    printTestLabel(printerName, profile)
  );
  handle('print:pdf', (printerName: string, pdfPath: string, profile: LabelProfile) =>
    printPDF(printerName, pdfPath, profile)
  );
  handle('print:tspl', (printerName: string, data: string) =>
    sendRawTSPL(printerName, data)
  );
  handle('print:zpl', (printerName: string, data: string) =>
    sendRawZPL(printerName, data)
  );

  // Select PDF file for printing
  handle('dialog:select-pdf', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select PDF File to Print',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Calibration
  handle(
    'calibration:apply-feedback',
    (profile: LabelProfile, feedback: UserAlignmentFeedback) => {
      const adjusted = applyFeedback(profile, feedback);
      return adjusted;
    }
  );

  // Profiles
  handle('profiles:get', () => loadSettings().profiles);
  handle('profiles:save', (profile: LabelProfile) => {
    if (!profile.id) profile.id = generateId();
    saveProfile(profile);
    return profile;
  });
  handle('profiles:delete', (id: string) => {
    deleteProfile(id);
  });

  // Settings
  handle('settings:get', () => loadSettings());
  handle('settings:save', (settings: AppSettings) => {
    saveSettings(settings);
  });

  // Backup / Restore
  handle('backup:create', async (printerName: string, profile: LabelProfile) => {
    const cupsOptions = await getCurrentCupsOptions(printerName);
    return createBackup(printerName, profile, cupsOptions);
  });

  handle('backup:restore', async (backupId: string) => {
    const backup = getBackupById(backupId);
    if (!backup) {
      return {
        success: false,
        command: 'restore',
        stdout: '',
        stderr: 'Backup not found',
      } as CommandResult;
    }

    logger.info(`Restoring backup: ${backup.description} (${backup.timestamp})`);

    const result = await applyLabelSettings(backup.settings.printerName, backup.settings.profile);

    if (result.success) {
      logger.success(`Backup restored: ${backup.id}`);
    }

    return result;
  });

  // Logs
  handle('logs:get', () => logger.getLogs());

  // Sudo-required command confirmation
  handle('sudo:confirm', async (command: string, reason: string) => {
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'Admin Action Required',
      message: 'This action requires administrator privileges',
      detail: `Reason: ${reason}\n\nCommand:\n${command}`,
      buttons: ['Cancel', 'Proceed'],
      defaultId: 0,
      cancelId: 0,
    });
    return choice.response === 1;
  });
}
