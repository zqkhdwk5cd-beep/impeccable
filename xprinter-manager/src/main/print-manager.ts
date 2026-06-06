import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { LabelProfile, CommandResult } from '../shared/types';
import { logger } from './logger';
import { sendPrintJob } from './cups-manager';
import { mmToDots } from './label-config';

const execAsync = promisify(exec);

function tmpFile(ext: string): string {
  return path.join(os.tmpdir(), `xprinter-${Date.now()}${ext}`);
}

function mmToPt(mm: number): number {
  return mm * 2.8346;
}

export function generateTestPostScript(profile: LabelProfile): string {
  const wPt = mmToPt(profile.widthMm);
  const hPt = mmToPt(profile.heightMm);
  const cx = wPt / 2;
  const cy = hPt / 2;
  const offX = mmToPt(profile.leftOffsetMm);
  const offY = mmToPt(profile.topOffsetMm);

  const crossLen = Math.min(wPt, hPt) * 0.12;
  const qrSize = Math.min(wPt, hPt) * 0.18;
  const qrX = cx - qrSize / 2;
  const qrY = cy + crossLen + 2;

  function qrGrid(x: number, y: number, size: number): string {
    const cell = size / 7;
    const lines: string[] = [];
    const pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,0,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        if (pattern[row][col]) {
          const rx = x + col * cell;
          const ry = y + (6 - row) * cell;
          lines.push(`${rx.toFixed(2)} ${ry.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} rectfill`);
        }
      }
    }
    return lines.join('\n');
  }

  return `%!PS-Adobe-3.0
%%BoundingBox: 0 0 ${wPt.toFixed(2)} ${hPt.toFixed(2)}
%%DocumentMedia: Label ${wPt.toFixed(2)} ${hPt.toFixed(2)} 0 () ()
%%Pages: 1
%%EndComments

%%Page: 1 1
%%BeginPageSetup
<< /PageSize [${wPt.toFixed(2)} ${hPt.toFixed(2)}] >> setpagedevice
%%EndPageSetup

% Apply offset translation
${offX.toFixed(2)} ${offY.toFixed(2)} translate

% --- Outer border ---
0.5 setlinewidth
0 setgray
1 1 ${(wPt - 2).toFixed(2)} ${(hPt - 2).toFixed(2)} rectstroke

% --- Tick marks at midpoints of each edge ---
0.3 setlinewidth
[2 2] 0 setdash
${(cx - 6).toFixed(2)} ${(hPt - 1).toFixed(2)} moveto 12 0 rlineto stroke
${(cx - 6).toFixed(2)} 1 moveto 12 0 rlineto stroke
1 ${(cy - 6).toFixed(2)} moveto 0 12 rlineto stroke
${(wPt - 1).toFixed(2)} ${(cy - 6).toFixed(2)} moveto 0 12 rlineto stroke
[] 0 setdash

% --- Center crosshair ---
0.5 setlinewidth
${(cx - crossLen).toFixed(2)} ${cy.toFixed(2)} moveto ${(crossLen * 2).toFixed(2)} 0 rlineto stroke
${cx.toFixed(2)} ${(cy - crossLen).toFixed(2)} moveto 0 ${(crossLen * 2).toFixed(2)} rlineto stroke

% --- Center dot ---
${cx.toFixed(2)} ${cy.toFixed(2)} 1.2 0 360 arc fill

% --- QR code placeholder (finder pattern) ---
0 setgray
${qrGrid(qrX, qrY, qrSize)}

% --- Labels ---
/Helvetica-Bold findfont 7 scalefont setfont
0 setgray
(TEST LABEL) dup stringwidth pop 2 div ${cx.toFixed(2)} exch sub ${(cy - 8).toFixed(2)} moveto show

/Helvetica findfont 5 scalefont setfont
(${profile.widthMm}x${profile.heightMm}mm  DPI:${profile.dpi}) dup stringwidth pop 2 div ${cx.toFixed(2)} exch sub ${(cy - 15).toFixed(2)} moveto show

(Spd:${profile.printSpeed}  Dark:${profile.darkness}  Gap:${profile.gapMm}mm) dup stringwidth pop 2 div ${cx.toFixed(2)} exch sub ${(cy - 21).toFixed(2)} moveto show

/Helvetica findfont 4.5 scalefont setfont
(TL) 4 ${(hPt - 9).toFixed(2)} moveto show
(TR) ${(wPt - 12).toFixed(2)} ${(hPt - 9).toFixed(2)} moveto show
(BL) 4 4 moveto show
(BR) ${(wPt - 12).toFixed(2)} 4 moveto show
(T) ${(cx - 2).toFixed(2)} ${(hPt - 9).toFixed(2)} moveto show
(B) ${(cx - 2).toFixed(2)} 4 moveto show
(L) 4 ${(cy - 2).toFixed(2)} moveto show
(R) ${(wPt - 7).toFixed(2)} ${(cy - 2).toFixed(2)} moveto show

showpage
%%EOF
`;
}

// ─── TSPL test label (primary for thermal/label printers) ────
// Xprinter XP-235B and most thermal label printers do NOT support
// PostScript. They use TSPL (Thermal Standard Printer Language) raw commands.

export function generateTestTSPL(profile: LabelProfile): string {
  const wDots = mmToDots(profile.widthMm, profile.dpi);
  const hDots = mmToDots(profile.heightMm, profile.dpi);
  const cx = Math.round(wDots / 2);
  const cy = Math.round(hDots / 2);
  const m = 4; // margin dots
  const crossLen = Math.round(Math.min(wDots, hDots) * 0.12);

  // TSPL TEXT coords: X,Y,"font",rotation,x-mult,y-mult,"text"
  // Font "1" = 8pt, "2" = 12pt, "3" = 16pt
  const lines = [
    `SIZE ${profile.widthMm} mm, ${profile.heightMm} mm`,
    `GAP ${profile.gapMm} mm, 0 mm`,
    `DIRECTION 0,0`,
    `OFFSET 0 mm`,
    `SPEED ${profile.printSpeed}`,
    `DENSITY ${profile.darkness}`,
    `SET PEEL OFF`,
    `SET CUTTER OFF`,
    `CLS`,
    // Full border
    `BOX ${m},${m},${wDots - m},${hDots - m},2`,
    // Edge tick marks (midpoint of each edge)
    `BAR ${cx - 8},${m},16,5`,
    `BAR ${cx - 8},${hDots - m - 5},16,5`,
    `BAR ${m},${cy - 8},5,16`,
    `BAR ${wDots - m - 5},${cy - 8},5,16`,
    // Center crosshair
    `LINE ${cx - crossLen},${cy},${cx + crossLen},${cy},1`,
    `LINE ${cx},${cy - crossLen},${cx},${cy + crossLen},1`,
    // Center solid dot
    `BAR ${cx - 4},${cy - 4},8,8`,
    // Corner labels
    `TEXT ${m + 4},${m + 4},"1",0,1,1,"TL"`,
    `TEXT ${wDots - 28},${m + 4},"1",0,1,1,"TR"`,
    `TEXT ${m + 4},${hDots - 26},"1",0,1,1,"BL"`,
    `TEXT ${wDots - 28},${hDots - 26},"1",0,1,1,"BR"`,
    // Edge direction labels
    `TEXT ${cx - 4},${m + 6},"1",0,1,1,"T"`,
    `TEXT ${cx - 4},${hDots - m - 20},"1",0,1,1,"B"`,
    `TEXT ${m + 6},${cy - 10},"1",0,1,1,"L"`,
    `TEXT ${wDots - m - 14},${cy - 10},"1",0,1,1,"R"`,
    // Center info text
    `TEXT ${cx - 50},${cy + 8},"2",0,1,1,"TEST LABEL"`,
    `TEXT ${cx - 55},${cy + 32},"1",0,1,1,"${profile.widthMm}x${profile.heightMm}mm DPI:${profile.dpi}"`,
    `TEXT ${cx - 55},${cy + 46},"1",0,1,1,"Spd:${profile.printSpeed} Dark:${profile.darkness} Gap:${profile.gapMm}mm"`,
    `PRINT 1,1`,
  ];

  return lines.join('\n') + '\n';
}

export async function printTestLabel(
  printerName: string,
  profile: LabelProfile
): Promise<CommandResult> {
  // Try TSPL first (works for Xprinter/most thermal label printers)
  logger.info(`Generating TSPL test label for ${printerName}`);
  const tspl = generateTestTSPL(profile);
  const tsplResult = await sendRawTSPL(printerName, tspl);

  if (tsplResult.success) return tsplResult;

  // Fallback: PostScript via CUPS (for printers with PS driver)
  logger.warn('TSPL raw failed, falling back to PostScript via CUPS', tsplResult.stderr);
  const ps = generateTestPostScript(profile);
  const psFile = tmpFile('.ps');
  fs.writeFileSync(psFile, ps, 'utf-8');
  logger.info(`Fallback: PostScript written to ${psFile}`);
  try {
    return await sendPrintJob(printerName, psFile, profile);
  } finally {
    try { fs.unlinkSync(psFile); } catch {}
  }
}

export async function printPDF(printerName: string, pdfPath: string, profile: LabelProfile): Promise<CommandResult> {
  logger.info(`Printing PDF: ${pdfPath} to ${printerName}`);
  return sendPrintJob(printerName, pdfPath, profile);
}

export async function sendRawTSPL(
  printerName: string,
  data: string
): Promise<CommandResult> {
  logger.info(`Sending raw TSPL to ${printerName}`);
  const tmpPath = tmpFile('.tspl');
  fs.writeFileSync(tmpPath, data, 'binary');
  const cmd = `lp -d "${printerName}" -o raw "${tmpPath}"`;
  logger.command(cmd);
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
    return { success: true, command: cmd, stdout, stderr };
  } catch (err: any) {
    return { success: false, command: cmd, stdout: err.stdout ?? '', stderr: err.stderr ?? String(err) };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

export async function sendRawZPL(
  printerName: string,
  data: string
): Promise<CommandResult> {
  logger.info(`Sending raw ZPL to ${printerName}`);
  const tmpPath = tmpFile('.zpl');
  fs.writeFileSync(tmpPath, data, 'binary');
  const cmd = `lp -d "${printerName}" -o raw "${tmpPath}"`;
  logger.command(cmd);
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
    return { success: true, command: cmd, stdout, stderr };
  } catch (err: any) {
    return { success: false, command: cmd, stdout: err.stdout ?? '', stderr: err.stderr ?? String(err) };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}
