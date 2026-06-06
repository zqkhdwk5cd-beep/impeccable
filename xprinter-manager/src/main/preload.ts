import { contextBridge, ipcRenderer } from 'electron';
import type {
  Printer,
  DriverStatus,
  LabelProfile,
  UserAlignmentFeedback,
  AppSettings,
  CommandResult,
  Backup,
  LogEntry,
} from '../shared/types';

const api = {
  // Printers
  detectPrinters: (): Promise<Printer[]> => ipcRenderer.invoke('printers:detect'),
  getPrinterOptions: (name: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke('printers:options', name),
  getDriverStatus: (name: string): Promise<DriverStatus> =>
    ipcRenderer.invoke('printers:driver-status', name),

  // Drivers
  selectPPDFile: (): Promise<string | null> => ipcRenderer.invoke('drivers:select-ppd'),
  listLocalDrivers: (): Promise<string[]> => ipcRenderer.invoke('drivers:list-local'),
  applyDriver: (
    ppdPath: string,
    printerName: string,
    printerUri: string
  ): Promise<CommandResult> =>
    ipcRenderer.invoke('drivers:apply', ppdPath, printerName, printerUri),

  // CUPS
  applyLabelSettings: (printerName: string, profile: LabelProfile): Promise<CommandResult> =>
    ipcRenderer.invoke('cups:apply-label', printerName, profile),
  getCupsOptions: (printerName: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke('cups:get-options', printerName),
  cancelJobs: (printerName: string): Promise<CommandResult> =>
    ipcRenderer.invoke('cups:cancel-jobs', printerName),

  // Print
  printTestLabel: (printerName: string, profile: LabelProfile): Promise<CommandResult> =>
    ipcRenderer.invoke('print:test-label', printerName, profile),
  printPDF: (printerName: string, pdfPath: string, profile: LabelProfile): Promise<CommandResult> =>
    ipcRenderer.invoke('print:pdf', printerName, pdfPath, profile),
  selectPDF: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-pdf'),

  // Calibration
  applyCalibrationFeedback: (
    profile: LabelProfile,
    feedback: UserAlignmentFeedback
  ): Promise<LabelProfile> =>
    ipcRenderer.invoke('calibration:apply-feedback', profile, feedback),

  // Profiles
  getProfiles: (): Promise<LabelProfile[]> => ipcRenderer.invoke('profiles:get'),
  saveProfile: (profile: LabelProfile): Promise<LabelProfile> =>
    ipcRenderer.invoke('profiles:save', profile),
  deleteProfile: (id: string): Promise<void> => ipcRenderer.invoke('profiles:delete', id),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings): Promise<void> =>
    ipcRenderer.invoke('settings:save', settings),

  // Backup / Restore
  createBackup: (printerName: string, profile: LabelProfile): Promise<Backup> =>
    ipcRenderer.invoke('backup:create', printerName, profile),
  restoreBackup: (backupId: string): Promise<CommandResult> =>
    ipcRenderer.invoke('backup:restore', backupId),

  // Logs
  getLogs: (): Promise<LogEntry[]> => ipcRenderer.invoke('logs:get'),
  onLog: (cb: (entry: LogEntry) => void): void => {
    ipcRenderer.on('log', (_event, entry: LogEntry) => cb(entry));
  },
  removeLogListener: (): void => {
    ipcRenderer.removeAllListeners('log');
  },
};

contextBridge.exposeInMainWorld('api', api);

export type API = typeof api;
