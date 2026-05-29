/* Left-panel collapse persistence. Pure helpers, storage injectable for tests.
   Key reuses the original deal-sheet bundle convention (sidebar.js). */

export const PANEL_COLLAPSE_KEY = 'nd:sidebar-collapsed:v1';

function resolveStorage(storage) {
  if (storage) return storage;
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

/** @returns {boolean} true only when the stored sentinel is exactly "1". */
export function readPanelCollapsed(storage) {
  const s = resolveStorage(storage);
  try {
    return s?.getItem(PANEL_COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist the collapsed flag as the "1"/"0" sentinel. Never throws. */
export function writePanelCollapsed(collapsed, storage) {
  const s = resolveStorage(storage);
  try {
    s?.setItem(PANEL_COLLAPSE_KEY, collapsed ? '1' : '0');
  } catch {
    /* storage blocked (private mode, etc.) — ignore */
  }
}
