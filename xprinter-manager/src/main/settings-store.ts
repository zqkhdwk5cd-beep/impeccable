import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { AppSettings, LabelProfile, Backup, PrinterSettings } from '../shared/types';
import { DEFAULT_PROFILES } from '../shared/types';
import { logger } from './logger';

const SETTINGS_FILE = 'settings.json';

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

function defaultSettings(): AppSettings {
  return {
    selectedPrinter: null,
    selectedProfile: null,
    profiles: DEFAULT_PROFILES,
    backups: [],
    calibrations: {},
  };
}

export function loadSettings(): AppSettings {
  const filePath = getSettingsPath();
  try {
    if (!fs.existsSync(filePath)) return defaultSettings();
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...defaultSettings(),
      ...parsed,
      profiles: parsed.profiles?.length ? parsed.profiles : DEFAULT_PROFILES,
    };
  } catch (err) {
    logger.warn('Could not read settings, using defaults', String(err));
    return defaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  const filePath = getSettingsPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save settings', String(err));
    throw err;
  }
}

export function createBackup(printerName: string, profile: LabelProfile, cupsOptions: Record<string, string>): Backup {
  const settings = loadSettings();
  const backup: Backup = {
    id: `backup-${Date.now()}`,
    timestamp: new Date().toISOString(),
    description: `${printerName} / ${profile.name}`,
    settings: {
      printerName,
      profile: { ...profile },
      cupsOptions: { ...cupsOptions },
      timestamp: new Date().toISOString(),
    },
  };
  settings.backups = [backup, ...settings.backups].slice(0, 20);
  saveSettings(settings);
  logger.success(`Backup created: ${backup.id}`);
  return backup;
}

export function getBackupById(id: string): Backup | null {
  const settings = loadSettings();
  return settings.backups.find((b) => b.id === id) ?? null;
}

export function saveProfile(profile: LabelProfile): void {
  const settings = loadSettings();
  const idx = settings.profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    settings.profiles[idx] = profile;
  } else {
    settings.profiles.push(profile);
  }
  saveSettings(settings);
  logger.info(`Profile saved: ${profile.name}`);
}

export function deleteProfile(id: string): void {
  const settings = loadSettings();
  settings.profiles = settings.profiles.filter((p) => p.id !== id);
  saveSettings(settings);
  logger.info(`Profile deleted: ${id}`);
}
