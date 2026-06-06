import { BrowserWindow } from 'electron';
import type { LogEntry, LogLevel } from '../shared/types';

const logs: LogEntry[] = [];
let mainWindow: BrowserWindow | null = null;

export function setWindow(win: BrowserWindow): void {
  mainWindow = win;
}

function push(level: LogLevel, message: string, details?: string): void {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
  logs.push(entry);
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  mainWindow?.webContents.send('log', entry);
}

export const logger = {
  info: (msg: string, details?: string) => push('info', msg, details),
  warn: (msg: string, details?: string) => push('warning', msg, details),
  error: (msg: string, details?: string) => push('error', msg, details),
  success: (msg: string, details?: string) => push('success', msg, details),
  command: (cmd: string, output?: string) => push('command', cmd, output),
  getLogs: () => [...logs],
};
