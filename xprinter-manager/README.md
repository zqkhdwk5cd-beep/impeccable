# Xprinter Label Manager

A macOS desktop tool for managing Xprinter and thermal label printers. Detects printers, configures label sizes, runs calibration, and manages CUPS drivers — all without silent admin commands.

## Why Electron + TypeScript

Electron was chosen over Python/PySide6 because:
- Native macOS title bar and window chrome via `titleBarStyle: 'hiddenInset'`
- Shell command execution (`exec`) works identically to macOS Terminal
- TypeScript provides full type safety across main/renderer/preload boundaries
- `contextBridge` gives a secure, narrow IPC surface — the renderer can't access Node APIs directly
- Single-file build output with `electron-builder` → `.dmg` for distribution

Python/PySide6 is a valid alternative but requires a virtualenv, has heavier packaging overhead, and lacks the strict type checking we get with TypeScript for the IPC layer.

---

## Running the App

### Prerequisites

- macOS 12+
- [Node.js 18+](https://nodejs.org) or [Bun](https://bun.sh)
- CUPS installed (included by default on macOS)

### Install and start

```bash
cd xprinter-manager
npm install
npm start        # builds and launches in one step
```

### Development mode

```bash
npm run dev      # same as start, plus DevTools open
```

---

## Building the App (.dmg)

```bash
npm run dist
# → dist/Xprinter Label Manager-1.0.0.dmg
```

The `pack` command builds a local app bundle without creating a DMG.

---

## Adding a Driver/PPD

Thermal label printers often ship with a CD that contains PPD files. You can also download them from the manufacturer.

**Method 1 — Via the app UI:**
1. Open the Driver tab.
2. Click "Choose PPD File…".
3. Select your `.ppd` file.
4. Click "Install Driver". The app will show you the exact `lpadmin` command it runs and ask for confirmation.

**Method 2 — Manual:**
Copy the `.ppd` file into `xprinter-manager/drivers/`. It will be available to the Driver tab automatically.

**Where to find PPDs for Xprinter:**
- Xprinter official site: look for the Windows driver zip and extract the PPD from inside.
- CUPS generic PPD for basic printing: `/usr/share/cups/model/` on your Mac.
- Zebra ZPL printers: use the Zebra ZPL PPD from [openprinting.org](https://openprinting.org).

---

## Calibration Workflow

1. Go to **Printers** → click your printer to select it.
2. Go to **Label Profile** → select or create a profile matching your physical label size.
3. Go to **Calibration** → click "Print Test Label".
4. Examine the printed label:
   - The crosshair (`+`) should land in the center.
   - Corner markers (TL/TR/BL/BR) should be close to the corners.
   - Edge tick marks should be centered on each edge.
5. Click the direction the print shifted (e.g. if it printed too far left, click **← Left**).
6. Enter the approximate offset in mm.
7. Click "Apply Correction & Reprint" — the app recalculates the offset and automatically reprints.
8. Repeat until centered, then click "Save to Profile".

---

## Common Issues with Label Printers

### Print lands outside the label
- **Cause**: Wrong label size in profile, or wrong gap setting.
- **Fix**: Measure the physical label (width × height) including the gap. Enter exact values in the Label Profile tab.

### Print is cut off at edges
- **Cause**: Margins not zeroed, or scaling not at 100%.
- **Fix**: Click "Apply to Printer" in the Label Profile tab — this sets `fit-to-page=false` and `scaling=100`.

### Colors too light / too dark
- **Cause**: Darkness setting.
- **Fix**: Adjust the Darkness slider (0–15) in the profile. Increase for darker, decrease for lighter.

### Print comes out blurry
- **Cause**: Print speed too high for the head.
- **Fix**: Lower the Print Speed value (try 2–4).

### Generic driver prints wrong size
- **Cause**: macOS assigns a generic PostScript driver that doesn't know your label dimensions.
- **Fix**: Install the manufacturer PPD via the Driver tab.

### Gap sensor not detecting label edges
- **Cause**: The Gap (mm) value doesn't match the physical gap between labels.
- **Fix**: Measure the gap on the label roll and enter the exact value. Then run a printer self-calibration (hold Feed button for 3 seconds on most Xprinter models).

### Offset shifts after a few labels
- **Cause**: Label stock slipping, or gap sensor drift.
- **Fix**: Run the printer's hardware calibration (Feed button hold), then redo the software calibration in the app.

---

## Architecture

```
src/
├── shared/
│   └── types.ts           — All shared TypeScript types (Printer, LabelProfile, etc.)
├── main/                  — Electron main process (Node.js, full OS access)
│   ├── index.ts           — App bootstrap, window creation
│   ├── preload.ts         — contextBridge API surface (typed, sandboxed)
│   ├── logger.ts          — In-memory log store + IPC push to renderer
│   ├── settings-store.ts  — JSON settings file in ~/Library/Application Support
│   ├── printer-detection.ts — lpstat / lpoptions parsing
│   ├── cups-manager.ts    — lpadmin / lpoptions / lp commands
│   ├── driver-manager.ts  — PPD file selection and installation
│   ├── label-config.ts    — mm↔dots conversion, TSPL/ZPL builders
│   ├── print-manager.ts   — PostScript test label, PDF print, raw TSPL/ZPL
│   ├── calibration.ts     — Offset math and calibration state
│   └── ipc-handlers.ts    — All ipcMain.handle registrations
└── renderer/              — Electron renderer process (browser, sandboxed)
    ├── index.html         — Single-page UI shell
    ├── styles.css         — Hand-written CSS (no Tailwind)
    └── app.ts             — All UI logic, bundled by esbuild
```

**Print abstraction layers:**
- `PDFPrinter` → `sendPrintJob()` via CUPS `lp`
- `RawTSPLPrinter` → `sendRawTSPL()` via `lp -o raw`
- `RawZPLPrinter` → `sendRawZPL()` via `lp -o raw`
- `CUPSPrinter` → `applyLabelSettings()` + `sendPrintJob()` via `lpadmin` + `lp`

**Safety rules:**
- No printer is deleted without user confirmation.
- The default printer is never changed without confirmation.
- A backup is created before any settings are applied.
- Any command that requires `sudo` shows the full command text and reason before running.
- Settings are stored in `~/Library/Application Support/xprinter-label-manager/settings.json`.

---

## Security

All shell commands use `child_process.exec` with a 30-second timeout. The renderer process runs in a sandboxed context (`contextIsolation: true`, `nodeIntegration: false`) and can only call the typed `window.api` surface exposed by the preload script. Raw shell access from the renderer is not possible.
