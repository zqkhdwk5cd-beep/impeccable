export type ConnectionType = 'USB' | 'Network' | 'Bluetooth' | 'Unknown';
export type PrinterStatus = 'idle' | 'busy' | 'printing' | 'error' | 'stopped' | 'unknown';
export type DriverType = 'generic' | 'custom' | 'raw' | 'unknown';
export type DPI = 203 | 300;
export type PrintMethod = 'cups' | 'tspl' | 'zpl' | 'pdf';
export type LogLevel = 'info' | 'warning' | 'error' | 'success' | 'command';

export interface Printer {
  name: string;
  description: string;
  uri: string;
  connectionType: ConnectionType;
  status: PrinterStatus;
  isDefault: boolean;
  driverType: DriverType;
  ppdPath?: string;
}

export interface DriverStatus {
  printerName: string;
  isGeneric: boolean;
  ppdPath: string;
  ppdPreview: string;
  driverName: string;
}

export interface LabelProfile {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  gapMm: number;
  leftOffsetMm: number;
  topOffsetMm: number;
  printSpeed: number;
  darkness: number;
  dpi: DPI;
}

export interface UserAlignmentFeedback {
  xDirection: 'left' | 'right' | 'center';
  yDirection: 'up' | 'down' | 'center';
  xAmountMm: number;
  yAmountMm: number;
}

export interface CalibrationEntry {
  iteration: number;
  offsetX: number;
  offsetY: number;
  feedback?: UserAlignmentFeedback;
}

export interface CalibrationState {
  printerName: string;
  profileId: string;
  currentOffsetX: number;
  currentOffsetY: number;
  iteration: number;
  history: CalibrationEntry[];
}

export interface PrinterSettings {
  printerName: string;
  profile: LabelProfile;
  cupsOptions: Record<string, string>;
  timestamp: string;
}

export interface Backup {
  id: string;
  timestamp: string;
  settings: PrinterSettings;
  description: string;
}

export interface AppSettings {
  selectedPrinter: string | null;
  selectedProfile: string | null;
  profiles: LabelProfile[];
  backups: Backup[];
  calibrations: Record<string, CalibrationState>;
}

export interface CommandResult {
  success: boolean;
  command: string;
  stdout: string;
  stderr: string;
  requiresSudo?: boolean;
  sudoReason?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

export interface SudoRequest {
  command: string;
  reason: string;
  impact: string;
}

export const DEFAULT_PROFILES: LabelProfile[] = [
  {
    id: '40x30',
    name: '40×30 mm',
    widthMm: 40,
    heightMm: 30,
    gapMm: 3,
    leftOffsetMm: 0,
    topOffsetMm: 0,
    printSpeed: 4,
    darkness: 8,
    dpi: 203,
  },
  {
    id: '50x25',
    name: '50×25 mm',
    widthMm: 50,
    heightMm: 25,
    gapMm: 3,
    leftOffsetMm: 0,
    topOffsetMm: 0,
    printSpeed: 4,
    darkness: 8,
    dpi: 203,
  },
  {
    id: '58x40',
    name: '58×40 mm',
    widthMm: 58,
    heightMm: 40,
    gapMm: 3,
    leftOffsetMm: 0,
    topOffsetMm: 0,
    printSpeed: 4,
    darkness: 8,
    dpi: 203,
  },
  {
    id: '100x150',
    name: '100×150 mm',
    widthMm: 100,
    heightMm: 150,
    gapMm: 3,
    leftOffsetMm: 0,
    topOffsetMm: 0,
    printSpeed: 3,
    darkness: 8,
    dpi: 203,
  },
];
