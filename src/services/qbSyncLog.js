// Persistent QuickBooks sync log: bounded ring buffer in localStorage so
// auto-sync errors survive a page reload and are reviewable in the UI.

const STORAGE_KEY = 'qb_sync_log';
const MAX_ENTRIES = 50;

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Quota or disabled storage — drop silently; the log is best-effort.
  }
}

const listeners = new Set();
const notify = () => listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });

export function subscribeSyncLog(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSyncLog() {
  return read();
}

export function clearSyncLog() {
  write([]);
  notify();
}

/**
 * @param {{ kind: 'client'|'invoice'|'expense'|'connection', status: 'success'|'error'|'info', message: string, entity?: string, code?: string, detail?: string }} entry
 */
export function logSyncEvent(entry) {
  const next = [{
    timestamp: Date.now(),
    ...entry,
  }, ...read()];
  write(next);
  notify();
}
