import type { LabelProfile, DPI } from '../shared/types';

const MM_PER_INCH = 25.4;

export function mmToDots(mm: number, dpi: DPI): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export function mmToPt(mm: number): number {
  return Math.round(mm * 2.8346 * 100) / 100;
}

export function dotsToMm(dots: number, dpi: DPI): number {
  return Math.round(((dots / dpi) * MM_PER_INCH) * 100) / 100;
}

export interface LabelDimensions {
  widthDots: number;
  heightDots: number;
  gapDots: number;
  leftOffsetDots: number;
  topOffsetDots: number;
  widthPt: number;
  heightPt: number;
}

export function calculateDimensions(profile: LabelProfile): LabelDimensions {
  return {
    widthDots: mmToDots(profile.widthMm, profile.dpi),
    heightDots: mmToDots(profile.heightMm, profile.dpi),
    gapDots: mmToDots(profile.gapMm, profile.dpi),
    leftOffsetDots: mmToDots(profile.leftOffsetMm, profile.dpi),
    topOffsetDots: mmToDots(profile.topOffsetMm, profile.dpi),
    widthPt: mmToPt(profile.widthMm),
    heightPt: mmToPt(profile.heightMm),
  };
}

export function buildTSPL(profile: LabelProfile, content: string): string {
  const dims = calculateDimensions(profile);
  return [
    `SIZE ${profile.widthMm} mm, ${profile.heightMm} mm`,
    `GAP ${profile.gapMm} mm, 0 mm`,
    `DIRECTION 0,0`,
    `OFFSET 0 mm`,
    `SPEED ${profile.printSpeed}`,
    `DENSITY ${profile.darkness}`,
    `CLS`,
    content,
    `PRINT 1,1`,
  ].join('\n');
}

export function buildZPL(profile: LabelProfile, content: string): string {
  const widthDots = mmToDots(profile.widthMm, profile.dpi);
  const heightDots = mmToDots(profile.heightMm, profile.dpi);
  return [
    `^XA`,
    `^PW${widthDots}`,
    `^LL${heightDots}`,
    `^LS0`,
    `^LH0,0`,
    `^PR${profile.printSpeed}`,
    `^MD${profile.darkness}`,
    content,
    `^XZ`,
  ].join('\n');
}

export function generateId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
