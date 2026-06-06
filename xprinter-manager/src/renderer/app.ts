import type {
  Printer,
  DriverStatus,
  LabelProfile,
  UserAlignmentFeedback,
  AppSettings,
  Backup,
  LogEntry,
  CalibrationState,
} from '../shared/types';

// Typed window.api
declare global {
  interface Window {
    api: {
      detectPrinters(): Promise<Printer[]>;
      getPrinterOptions(name: string): Promise<Record<string, string>>;
      getDriverStatus(name: string): Promise<DriverStatus>;
      runDiagnostic(): Promise<string>;
      addToCUPS(printerName: string, uri: string): Promise<import('../shared/types').CommandResult>;
      selectPPDFile(): Promise<string | null>;
      listLocalDrivers(): Promise<string[]>;
      applyDriver(ppdPath: string, printerName: string, printerUri: string): Promise<import('../shared/types').CommandResult>;
      applyLabelSettings(printerName: string, profile: LabelProfile): Promise<import('../shared/types').CommandResult>;
      getCupsOptions(printerName: string): Promise<Record<string, string>>;
      cancelJobs(printerName: string): Promise<import('../shared/types').CommandResult>;
      printTestLabel(printerName: string, profile: LabelProfile): Promise<import('../shared/types').CommandResult>;
      printPDF(printerName: string, pdfPath: string, profile: LabelProfile): Promise<import('../shared/types').CommandResult>;
      selectPDF(): Promise<string | null>;
      applyCalibrationFeedback(profile: LabelProfile, feedback: UserAlignmentFeedback): Promise<LabelProfile>;
      getProfiles(): Promise<LabelProfile[]>;
      saveProfile(profile: LabelProfile): Promise<LabelProfile>;
      deleteProfile(id: string): Promise<void>;
      getSettings(): Promise<AppSettings>;
      saveSettings(settings: AppSettings): Promise<void>;
      createBackup(printerName: string, profile: LabelProfile): Promise<Backup>;
      restoreBackup(backupId: string): Promise<import('../shared/types').CommandResult>;
      getLogs(): Promise<LogEntry[]>;
      onLog(cb: (entry: LogEntry) => void): void;
      removeLogListener(): void;
    };
  }
}

// ─── State ──────────────────────────────────────────────────

let printers: Printer[] = [];
let selectedPrinter: Printer | null = null;
let profiles: LabelProfile[] = [];
let selectedProfile: LabelProfile | null = null;
let settings: AppSettings | null = null;
let logs: LogEntry[] = [];
let logFilter: string = 'all';

let selectedPPDPath: string | null = null;
let selectedPDFPath: string | null = null;

let calState: CalibrationState = {
  printerName: '',
  profileId: '',
  currentOffsetX: 0,
  currentOffsetY: 0,
  iteration: 0,
  history: [],
};

let calXDir: 'left' | 'right' | 'center' = 'center';
let calYDir: 'up' | 'down' | 'center' = 'center';

// ─── Helpers ─────────────────────────────────────────────────

function $(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

function setHTML(id: string, html: string): void {
  $(id).innerHTML = html;
}

function showToast(msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }[type];
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function setLoading(spinnerId: string, btnId: string, loading: boolean): void {
  const spinner = $(spinnerId) as HTMLElement;
  const btn = $(btnId) as HTMLButtonElement;
  spinner.style.display = loading ? 'inline-block' : 'none';
  btn.disabled = loading;
}

function showResult(id: string, result: { success: boolean; stdout: string; stderr: string }): void {
  const el = $(id);
  el.style.display = 'block';
  el.className = `result-box ${result.success ? 'success' : 'error'}`;
  const text = result.success
    ? result.stdout || 'Done.'
    : result.stderr || result.stdout || 'Unknown error.';
  el.textContent = text.trim().slice(0, 800);
}

function mmToPt(mm: number): number {
  return Math.round(mm * 2.8346 * 100) / 100;
}

function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

// ─── Tabs ────────────────────────────────────────────────────

function setupTabs(): void {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const tab = (item as HTMLElement).dataset.tab!;
      switchTab(tab);
    });
  });
}

function switchTab(tab: string): void {
  document.querySelectorAll('.nav-item').forEach((item) => {
    (item as HTMLElement).classList.toggle('active', (item as HTMLElement).dataset.tab === tab);
  });
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    (pane as HTMLElement).classList.toggle('active', pane.id === `tab-${tab}`);
  });
  if (tab === 'logs') renderLogs();
  if (tab === 'restore') renderBackups();
  if (tab === 'driver' && selectedPrinter) loadDriverStatus();
  if (tab === 'calibration') updateCalibrationView();
  if (tab === 'testprint') updateTestPrintView();
}

// ─── Printers tab ────────────────────────────────────────────

async function loadPrinters(): Promise<void> {
  setLoading('detect-spinner', 'btn-detect', true);
  $('detect-status').textContent = 'Scanning…';

  try {
    printers = await window.api.detectPrinters();
    renderPrinters();
    const badge = $('nav-printer-count');
    if (printers.length > 0) {
      badge.textContent = String(printers.length);
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
    $('detect-status').textContent = `${printers.length} printer(s) found`;
    showToast(`Found ${printers.length} printer(s)`, 'success');
  } catch (err) {
    $('detect-status').textContent = 'Detection failed';
    showToast('Printer detection failed', 'error');
  } finally {
    setLoading('detect-spinner', 'btn-detect', false);
  }
}

function statusBadge(status: string): string {
  return `<span class="badge badge-${status}">${status}</span>`;
}

function connBadge(conn: string): string {
  const cls = { USB: 'usb', Network: 'network', Bluetooth: 'bt', Unknown: 'unknown' }[conn] ?? 'unknown';
  return `<span class="badge badge-${cls}">${conn}</span>`;
}

function driverBadge(type: string): string {
  return `<span class="badge badge-${type}">${type}</span>`;
}

function renderPrinters(): void {
  if (printers.length === 0) {
    setHTML('printer-list', `
      <div class="empty-state">
        <div class="icon">&#9112;</div>
        <h3>No printers detected</h3>
        <p>Printer not showing? Click "Run Diagnostic" to see raw USB/CUPS output.</p>
      </div>`);
    return;
  }

  const html = printers
    .map(
      (p) => {
        const notInCUPS = p.driverType === 'unknown' && p.description.includes('not in CUPS');
        return `
        <div class="printer-item${selectedPrinter?.name === p.name ? ' selected' : ''}" data-name="${p.name}" style="${notInCUPS ? 'border-color:rgba(255,183,77,0.35)' : ''}">
          <div class="printer-name">
            ${p.name}
            ${p.isDefault ? '<span class="badge badge-default">default</span>' : ''}
            ${statusBadge(p.status)}
            ${notInCUPS ? '<span class="badge badge-generic">not in CUPS</span>' : ''}
          </div>
          <div class="printer-meta">
            <span><strong>URI:</strong> ${p.uri || '—'}</span>
            <span><strong>Connection:</strong> ${connBadge(p.connectionType)}</span>
            <span><strong>Driver:</strong> ${driverBadge(p.driverType)}</span>
            <span><strong>Desc:</strong> ${p.description}</span>
          </div>
          ${notInCUPS ? `
          <div style="margin-top:8px">
            <button class="btn btn-secondary btn-add-cups" data-name="${p.name}" data-uri="${p.uri}" style="font-size:11.5px;padding:5px 10px">
              + Add to CUPS (Generic Driver)
            </button>
          </div>` : ''}
        </div>`;
      }
    )
    .join('');

  setHTML('printer-list', html);

  document.querySelectorAll('.printer-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-add-cups')) return;
      const name = (el as HTMLElement).dataset.name!;
      selectPrinter(printers.find((p) => p.name === name)!);
    });
  });

  document.querySelectorAll('.btn-add-cups').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const el = btn as HTMLElement;
      const name = el.dataset.name!;
      const uri = el.dataset.uri!;
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLButtonElement).textContent = 'Adding…';
      const result = await window.api.addToCUPS(name, uri);
      if (result.success) {
        showToast(`${name} added to CUPS. Refreshing…`, 'success');
        await loadPrinters();
      } else {
        showToast('Failed to add printer: ' + (result.stderr || 'unknown error'), 'error');
        (btn as HTMLButtonElement).disabled = false;
        (btn as HTMLButtonElement).textContent = '+ Add to CUPS (Generic Driver)';
      }
    });
  });
}

function selectPrinter(printer: Printer): void {
  selectedPrinter = printer;
  renderPrinters();
  updateTitleBar();
  updateTestPrintView();
  updateCalibrationView();
  enableIfPrinter();
}

function updateTitleBar(): void {
  const badge = $('title-printer-status');
  if (selectedPrinter) {
    badge.textContent = `${selectedPrinter.name} · ${selectedPrinter.status}`;
    badge.className = 'printer-badge connected';
  } else {
    badge.textContent = 'No printer selected';
    badge.className = 'printer-badge';
  }
}

function enableIfPrinter(): void {
  const hasPrinter = !!selectedPrinter;
  const hasProfile = !!selectedProfile;
  ($('btn-create-backup') as HTMLButtonElement).disabled = !hasPrinter || !hasProfile;
  ($('btn-apply-profile') as HTMLButtonElement).disabled = !hasPrinter;
  ($('btn-delete-profile') as HTMLButtonElement).disabled = !selectedProfile;
}

// ─── Driver tab ──────────────────────────────────────────────

async function loadDriverStatus(): Promise<void> {
  if (!selectedPrinter) {
    $('driver-no-printer').style.display = 'block';
    $('driver-content').style.display = 'none';
    return;
  }

  $('driver-no-printer').style.display = 'none';
  $('driver-content').style.display = 'block';

  const ds: DriverStatus = await window.api.getDriverStatus(selectedPrinter.name);

  $('driver-type-badge').innerHTML = driverBadge(ds.isGeneric ? 'generic' : 'custom');

  setHTML('driver-info-rows', `
    <div class="info-row">
      <span class="info-label">Driver Name</span>
      <span class="info-value">${ds.driverName || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">PPD Path</span>
      <span class="info-value">${ds.ppdPath || 'Not installed'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Type</span>
      <span class="info-value">${ds.isGeneric ? 'Generic (may cause issues)' : 'Custom / Manufacturer'}</span>
    </div>
  `);

  ($('ppd-preview') as HTMLPreElement).textContent = ds.ppdPreview || 'PPD file not found or empty.';
}

// ─── Profile tab ─────────────────────────────────────────────

async function loadProfiles(): Promise<void> {
  profiles = await window.api.getProfiles();
  renderProfileList();
  if (!selectedProfile && profiles.length > 0) {
    loadProfileIntoForm(profiles[0]);
  }
}

function renderProfileList(): void {
  const html = profiles
    .map(
      (p) => `
    <div class="profile-item${selectedProfile?.id === p.id ? ' active' : ''}" data-id="${p.id}">
      <div>
        <div class="profile-name">${p.name}</div>
        <div class="profile-dims">${p.widthMm}×${p.heightMm} mm · ${p.dpi} dpi</div>
      </div>
    </div>`
    )
    .join('');
  setHTML('profile-list', html || '<div style="font-size:11.5px;color:var(--text-dim)">No profiles.</div>');

  document.querySelectorAll('.profile-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.id!;
      const p = profiles.find((x) => x.id === id);
      if (p) loadProfileIntoForm(p);
    });
  });
}

function loadProfileIntoForm(profile: LabelProfile): void {
  selectedProfile = profile;
  (document.getElementById('profile-name') as HTMLInputElement).value = profile.name;
  (document.getElementById('profile-width') as HTMLInputElement).value = String(profile.widthMm);
  (document.getElementById('profile-height') as HTMLInputElement).value = String(profile.heightMm);
  (document.getElementById('profile-gap') as HTMLInputElement).value = String(profile.gapMm);
  (document.getElementById('profile-dpi') as HTMLSelectElement).value = String(profile.dpi);
  (document.getElementById('profile-left-offset') as HTMLInputElement).value = String(profile.leftOffsetMm);
  (document.getElementById('profile-top-offset') as HTMLInputElement).value = String(profile.topOffsetMm);
  (document.getElementById('profile-speed') as HTMLInputElement).value = String(profile.printSpeed);
  (document.getElementById('profile-darkness') as HTMLInputElement).value = String(profile.darkness);
  (document.getElementById('profile-direction') as HTMLSelectElement).value = String(profile.tsplDirection ?? 1);
  (document.getElementById('profile-mirror') as HTMLSelectElement).value = String(profile.tsplMirror ?? 0);
  renderProfileList();
  updateDotsPreview();
  enableIfPrinter();
  updateCalibrationView();
  updateTestPrintView();
}

function readProfileFromForm(): LabelProfile {
  const dpi = parseInt((document.getElementById('profile-dpi') as HTMLSelectElement).value) as 203 | 300;
  const dir = parseInt((document.getElementById('profile-direction') as HTMLSelectElement).value) as 0 | 1;
  const mir = parseInt((document.getElementById('profile-mirror') as HTMLSelectElement).value) as 0 | 1;
  return {
    id: selectedProfile?.id || '',
    name: (document.getElementById('profile-name') as HTMLInputElement).value.trim() || 'Custom',
    widthMm: parseFloat((document.getElementById('profile-width') as HTMLInputElement).value) || 40,
    heightMm: parseFloat((document.getElementById('profile-height') as HTMLInputElement).value) || 30,
    gapMm: parseFloat((document.getElementById('profile-gap') as HTMLInputElement).value) || 3,
    dpi,
    leftOffsetMm: parseFloat((document.getElementById('profile-left-offset') as HTMLInputElement).value) || 0,
    topOffsetMm: parseFloat((document.getElementById('profile-top-offset') as HTMLInputElement).value) || 0,
    printSpeed: parseInt((document.getElementById('profile-speed') as HTMLInputElement).value) || 4,
    darkness: parseInt((document.getElementById('profile-darkness') as HTMLInputElement).value) || 8,
    tsplDirection: dir,
    tsplMirror: mir,
  };
}

function updateDotsPreview(): void {
  const profile = readProfileFromForm();
  const wDots = mmToDots(profile.widthMm, profile.dpi);
  const hDots = mmToDots(profile.heightMm, profile.dpi);
  const wPt = mmToPt(profile.widthMm);
  const hPt = mmToPt(profile.heightMm);
  $('profile-dots-preview').textContent =
    `${wDots}×${hDots} dots · ${wPt}×${hPt} pt`;
}

async function saveCurrentProfile(): Promise<void> {
  const profile = readProfileFromForm();
  if (!profile.name) { showToast('Enter a profile name', 'warning'); return; }
  if (!profile.id) profile.id = `profile-${Date.now()}`;

  try {
    const saved = await window.api.saveProfile(profile);
    selectedProfile = saved;
    await loadProfiles();
    showToast(`Profile "${saved.name}" saved`, 'success');
    enableIfPrinter();
  } catch {
    showToast('Failed to save profile', 'error');
  }
}

async function deleteCurrentProfile(): Promise<void> {
  if (!selectedProfile) return;
  if (!confirm(`Delete profile "${selectedProfile.name}"?`)) return;
  await window.api.deleteProfile(selectedProfile.id);
  selectedProfile = null;
  await loadProfiles();
  showToast('Profile deleted', 'info');
}

async function applyProfileToPrinter(): Promise<void> {
  if (!selectedPrinter || !selectedProfile) {
    showToast('Select a printer and profile first', 'warning');
    return;
  }
  const profile = readProfileFromForm();
  // Backup before applying
  try {
    await window.api.createBackup(selectedPrinter.name, profile);
  } catch {}

  const result = await window.api.applyLabelSettings(selectedPrinter.name, profile);
  showResult('profile-result', result);
  showToast(result.success ? 'Settings applied' : 'Apply failed', result.success ? 'success' : 'error');
}

// ─── Calibration tab ─────────────────────────────────────────

function updateCalibrationView(): void {
  const ready = !!(selectedPrinter && selectedProfile);
  $('cal-no-printer').style.display = ready ? 'none' : 'block';
  $('cal-content').style.display = ready ? 'block' : 'none';

  if (ready && selectedProfile) {
    calState = {
      printerName: selectedPrinter!.name,
      profileId: selectedProfile.id,
      currentOffsetX: selectedProfile.leftOffsetMm,
      currentOffsetY: selectedProfile.topOffsetMm,
      iteration: 0,
      history: [],
    };
    updateCalOffsetDisplay();
  }
}

function updateCalOffsetDisplay(): void {
  $('cal-left-display').textContent = `${calState.currentOffsetX.toFixed(2)} mm`;
  $('cal-top-display').textContent = `${calState.currentOffsetY.toFixed(2)} mm`;
  $('cal-iteration-display').textContent = String(calState.iteration);
}

function setCalXDir(dir: 'left' | 'right' | 'center'): void {
  calXDir = dir;
  ['left', 'center', 'right'].forEach((d) => {
    const el = $(`cal-x-${d}`);
    el.style.borderColor = d === dir ? 'var(--accent)' : '';
    el.style.background = d === dir ? 'rgba(232,160,48,0.1)' : '';
  });
}

function setCalYDir(dir: 'up' | 'down' | 'center'): void {
  calYDir = dir;
  ['up', 'center', 'down'].forEach((d) => {
    const el = $(`cal-y-${d}`);
    el.style.borderColor = d === dir ? 'var(--accent)' : '';
    el.style.background = d === dir ? 'rgba(232,160,48,0.1)' : '';
  });
}

async function printCalibrationLabel(): Promise<void> {
  if (!selectedPrinter || !selectedProfile) return;
  setLoading('cal-print-spinner', 'btn-cal-print', true);
  const profile = { ...selectedProfile, leftOffsetMm: calState.currentOffsetX, topOffsetMm: calState.currentOffsetY };
  const result = await window.api.printTestLabel(selectedPrinter.name, profile);
  setLoading('cal-print-spinner', 'btn-cal-print', false);
  showResult('cal-result', result);
  showToast(result.success ? 'Test label sent' : 'Print failed', result.success ? 'success' : 'error');
}

async function applyCalibrationFeedback(): Promise<void> {
  if (!selectedPrinter || !selectedProfile) return;

  const xAmount = parseFloat((document.getElementById('cal-x-amount') as HTMLInputElement).value) || 0;
  const yAmount = parseFloat((document.getElementById('cal-y-amount') as HTMLInputElement).value) || 0;

  const feedback: UserAlignmentFeedback = {
    xDirection: calXDir,
    yDirection: calYDir,
    xAmountMm: xAmount,
    yAmountMm: yAmount,
  };

  const currentProfile: LabelProfile = {
    ...selectedProfile,
    leftOffsetMm: calState.currentOffsetX,
    topOffsetMm: calState.currentOffsetY,
  };

  const adjusted = await window.api.applyCalibrationFeedback(currentProfile, feedback);

  calState.history.push({
    iteration: calState.iteration,
    offsetX: calState.currentOffsetX,
    offsetY: calState.currentOffsetY,
    feedback,
  });
  calState.iteration++;
  calState.currentOffsetX = adjusted.leftOffsetMm;
  calState.currentOffsetY = adjusted.topOffsetMm;

  updateCalOffsetDisplay();
  renderCalHistory();

  if (feedback.xDirection === 'center' && feedback.yDirection === 'center') {
    showToast('Calibration complete!', 'success');
    $('cal-result').style.display = 'block';
    $('cal-result').className = 'result-box success';
    $('cal-result').textContent = `Centered! Offset: X=${calState.currentOffsetX.toFixed(2)}mm Y=${calState.currentOffsetY.toFixed(2)}mm`;
  } else {
    // Auto-reprint
    const newProfile: LabelProfile = { ...selectedProfile, leftOffsetMm: calState.currentOffsetX, topOffsetMm: calState.currentOffsetY };
    setLoading('cal-print-spinner', 'btn-cal-print', true);
    const result = await window.api.printTestLabel(selectedPrinter.name, newProfile);
    setLoading('cal-print-spinner', 'btn-cal-print', false);
    showResult('cal-result', result);
  }
}

function renderCalHistory(): void {
  if (calState.history.length === 0) {
    setHTML('cal-history-list', '<div style="font-size:11.5px;color:var(--text-dim)">No adjustments yet.</div>');
    return;
  }
  const html = calState.history
    .map(
      (h) => `
      <div class="cal-history-item">
        <span>#${h.iteration + 1}</span>
        <span>X: ${h.offsetX.toFixed(1)}mm Y: ${h.offsetY.toFixed(1)}mm</span>
        <span>${h.feedback ? `→ ${h.feedback.xDirection}/${h.feedback.yDirection} ${h.feedback.xAmountMm}/${h.feedback.yAmountMm}mm` : ''}</span>
      </div>`
    )
    .join('');
  setHTML('cal-history-list', html);
}

async function saveCalibrationToProfile(): Promise<void> {
  if (!selectedProfile) return;
  const updated: LabelProfile = {
    ...selectedProfile,
    leftOffsetMm: calState.currentOffsetX,
    topOffsetMm: calState.currentOffsetY,
  };
  await window.api.saveProfile(updated);
  selectedProfile = updated;
  await loadProfiles();
  showToast('Calibration saved to profile', 'success');
}

// ─── Test Print tab ──────────────────────────────────────────

function updateTestPrintView(): void {
  const hasPrinter = !!selectedPrinter;
  $('tp-no-printer').style.display = hasPrinter ? 'none' : 'block';
  $('tp-content').style.display = hasPrinter ? 'block' : 'none';
  if (hasPrinter) {
    $('tp-printer-name').textContent = selectedPrinter!.name;
    $('tp-profile-name').textContent = selectedProfile?.name || '—';
    $('tp-size').textContent = selectedProfile
      ? `${selectedProfile.widthMm}×${selectedProfile.heightMm} mm`
      : '—';
  }
}

async function printTestLabelAction(): Promise<void> {
  if (!selectedPrinter) { showToast('Select a printer first', 'warning'); return; }
  if (!selectedProfile) { showToast('Select a label profile first', 'warning'); return; }

  setLoading('tp-spinner', 'btn-tp-test', true);
  $('tp-result').style.display = 'none';

  const result = await window.api.printTestLabel(selectedPrinter.name, selectedProfile);
  setLoading('tp-spinner', 'btn-tp-test', false);
  showResult('tp-result', result);
  showToast(result.success ? 'Test label sent to printer' : 'Print failed', result.success ? 'success' : 'error');
}

async function printPDFAction(): Promise<void> {
  if (!selectedPrinter || !selectedPDFPath || !selectedProfile) return;
  setLoading('tp-pdf-spinner', 'btn-tp-print-pdf', true);
  $('tp-pdf-result').style.display = 'none';

  const result = await window.api.printPDF(selectedPrinter.name, selectedPDFPath, selectedProfile);
  setLoading('tp-pdf-spinner', 'btn-tp-print-pdf', false);
  showResult('tp-pdf-result', result);
  showToast(result.success ? 'PDF sent to printer' : 'PDF print failed', result.success ? 'success' : 'error');
}

async function cancelJobsAction(): Promise<void> {
  if (!selectedPrinter) return;
  const result = await window.api.cancelJobs(selectedPrinter.name);
  showResult('cancel-result', result);
  showToast(result.success ? 'Jobs cancelled' : 'Cancel failed', result.success ? 'success' : 'error');
}

// ─── Logs tab ────────────────────────────────────────────────

function addLog(entry: LogEntry): void {
  logs.push(entry);
  const badge = $('nav-log-count');
  badge.style.display = 'inline-block';
  badge.textContent = String(logs.length > 99 ? '99+' : logs.length);

  // Only re-render if logs tab is active
  const logsTab = document.getElementById('tab-logs');
  if (logsTab?.classList.contains('active')) {
    appendLogEntry(entry);
  }
}

function appendLogEntry(entry: LogEntry): void {
  if (logFilter !== 'all' && entry.level !== logFilter) return;
  const container = $('log-container');
  const el = document.createElement('div');
  el.className = `log-entry log-${entry.level}`;
  const ts = new Date(entry.timestamp).toLocaleTimeString();
  el.innerHTML = `<span class="log-ts">[${ts}]</span> <span class="log-level">[${entry.level.toUpperCase()}]</span> <span class="log-msg">${escapeHtml(entry.message)}</span>`;
  if (entry.details) {
    const det = document.createElement('div');
    det.className = 'log-details';
    det.textContent = entry.details;
    el.appendChild(det);
  }
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function renderLogs(): void {
  const container = $('log-container');
  container.innerHTML = '';
  const filtered = logFilter === 'all' ? logs : logs.filter((l) => l.level === logFilter);
  filtered.forEach(appendLogEntry);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Restore tab ─────────────────────────────────────────────

async function createBackupNow(): Promise<void> {
  if (!selectedPrinter || !selectedProfile) return;
  const backup = await window.api.createBackup(selectedPrinter.name, selectedProfile);
  showToast(`Backup created: ${backup.description}`, 'success');
  renderBackups();
}

async function renderBackups(): Promise<void> {
  const s = await window.api.getSettings();
  const backups = s.backups ?? [];

  if (backups.length === 0) {
    setHTML('backup-list', `
      <div class="empty-state">
        <div class="icon">&#8635;</div>
        <h3>No backups yet</h3>
        <p>Backups are created automatically before settings changes.</p>
      </div>`);
    return;
  }

  const html = backups
    .map(
      (b) => `
      <div class="card" style="margin-bottom:8px">
        <div class="card-header">
          <span style="font-size:12.5px;font-weight:600">${b.description}</span>
          <span style="font-size:11px;color:var(--text-muted)">${new Date(b.timestamp).toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Profile</span>
          <span class="info-value">${b.settings.profile.name} · ${b.settings.profile.widthMm}×${b.settings.profile.heightMm}mm</span>
        </div>
        <div class="info-row">
          <span class="info-label">Offsets</span>
          <span class="info-value">L:${b.settings.profile.leftOffsetMm}mm T:${b.settings.profile.topOffsetMm}mm</span>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" onclick="restoreBackup('${b.id}')">Restore This Backup</button>
        </div>
      </div>`
    )
    .join('');
  setHTML('backup-list', html);
}

async function restoreBackup(id: string): Promise<void> {
  if (!confirm('Restore this backup? Current settings will be changed.')) return;
  const result = await window.api.restoreBackup(id);
  showToast(result.success ? 'Settings restored' : 'Restore failed', result.success ? 'success' : 'error');
  await renderBackups();
}

// Expose for inline onclick handlers
(window as any).restoreBackup = restoreBackup;

// ─── Bootstrap ───────────────────────────────────────────────

async function init(): Promise<void> {
  setupTabs();

  // Log listener
  window.api.onLog((entry) => addLog(entry));
  const existing = await window.api.getLogs();
  logs = existing;

  // Load profiles and settings
  await loadProfiles();
  settings = await window.api.getSettings();

  // Wire up Printers tab
  $('btn-detect').addEventListener('click', loadPrinters);
  $('btn-diagnostic').addEventListener('click', async () => {
    const out = $('diagnostic-output');
    out.style.display = 'block';
    out.innerHTML = '<div class="result-box" style="color:var(--text-muted)">Running diagnostic…</div>';
    const text = await window.api.runDiagnostic();
    out.innerHTML = `<pre class="result-box" style="max-height:300px;overflow-y:auto;white-space:pre-wrap;font-size:10.5px">${escapeHtml(text)}</pre>`;
    switchTab('logs');
    setTimeout(() => switchTab('printers'), 100);
  });

  // Wire up Driver tab
  document.querySelector('[data-tab="driver"]')?.addEventListener('click', () => {
    if (selectedPrinter) loadDriverStatus();
  });
  $('btn-select-ppd').addEventListener('click', async () => {
    const path = await window.api.selectPPDFile();
    if (path) {
      selectedPPDPath = path;
      $('ppd-selected-path').textContent = `Selected: ${path}`;
      ($('btn-install-ppd') as HTMLButtonElement).disabled = false;
    }
  });
  $('btn-install-ppd').addEventListener('click', async () => {
    if (!selectedPrinter || !selectedPPDPath) return;
    const result = await window.api.applyDriver(selectedPPDPath, selectedPrinter.name, selectedPrinter.uri);
    showResult('driver-result', result);
    showToast(result.success ? 'Driver installed' : 'Install failed', result.success ? 'success' : 'error');
    if (result.success) loadDriverStatus();
  });

  // Wire up Profile tab
  $('btn-save-profile').addEventListener('click', saveCurrentProfile);
  $('btn-delete-profile').addEventListener('click', deleteCurrentProfile);
  $('btn-apply-profile').addEventListener('click', applyProfileToPrinter);
  $('btn-new-profile').addEventListener('click', () => {
    selectedProfile = null;
    (document.getElementById('profile-name') as HTMLInputElement).value = '';
    enableIfPrinter();
    renderProfileList();
  });

  ['profile-width', 'profile-height', 'profile-dpi', 'profile-left-offset', 'profile-top-offset'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updateDotsPreview);
  });

  // Wire up Calibration tab
  $('btn-cal-print').addEventListener('click', printCalibrationLabel);
  $('btn-cal-apply').addEventListener('click', applyCalibrationFeedback);
  $('btn-cal-reset').addEventListener('click', () => {
    calState.currentOffsetX = 0;
    calState.currentOffsetY = 0;
    calState.iteration = 0;
    calState.history = [];
    updateCalOffsetDisplay();
    renderCalHistory();
  });
  $('btn-cal-save').addEventListener('click', saveCalibrationToProfile);

  $('cal-x-left').addEventListener('click', () => setCalXDir('left'));
  $('cal-x-center').addEventListener('click', () => setCalXDir('center'));
  $('cal-x-right').addEventListener('click', () => setCalXDir('right'));
  $('cal-y-up').addEventListener('click', () => setCalYDir('up'));
  $('cal-y-center').addEventListener('click', () => setCalYDir('center'));
  $('cal-y-down').addEventListener('click', () => setCalYDir('down'));

  // Wire up Test Print tab
  $('btn-tp-test').addEventListener('click', printTestLabelAction);
  $('btn-tp-select-pdf').addEventListener('click', async () => {
    const path = await window.api.selectPDF();
    if (path) {
      selectedPDFPath = path;
      $('tp-pdf-path').textContent = path.split('/').pop() ?? path;
      ($('btn-tp-print-pdf') as HTMLButtonElement).disabled = false;
    }
  });
  $('btn-tp-print-pdf').addEventListener('click', printPDFAction);
  $('btn-cancel-jobs').addEventListener('click', cancelJobsAction);

  // Wire up Logs tab
  $('log-filter').addEventListener('change', (e) => {
    logFilter = (e.target as HTMLSelectElement).value;
    renderLogs();
  });
  $('btn-clear-logs').addEventListener('click', () => {
    logs = [];
    renderLogs();
    $('nav-log-count').style.display = 'none';
  });

  // Wire up Restore tab
  $('btn-create-backup').addEventListener('click', createBackupNow);

  // Auto-detect on startup
  await loadPrinters();
}

document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
