import { describe, it, expect } from 'vitest';
import { PANEL_COLLAPSE_KEY, readPanelCollapsed, writePanelCollapsed } from './leftPanel.collapse.js';

/**
 * Item (#3): collapsible left panel persistence. Reuses the original deal-sheet
 * zip's storage key (nd:sidebar-collapsed:v1) so the preference carries the same
 * convention. Storage is injectable so the helpers test in node (no localStorage).
 */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

describe('leftPanel.collapse', () => {
  it('uses the legacy sidebar-collapsed key', () => {
    expect(PANEL_COLLAPSE_KEY).toBe('nd:sidebar-collapsed:v1');
  });

  it('reads false when unset', () => {
    expect(readPanelCollapsed(fakeStorage())).toBe(false);
  });

  it('reads true only for the "1" sentinel', () => {
    expect(readPanelCollapsed(fakeStorage({ 'nd:sidebar-collapsed:v1': '1' }))).toBe(true);
    expect(readPanelCollapsed(fakeStorage({ 'nd:sidebar-collapsed:v1': '0' }))).toBe(false);
    expect(readPanelCollapsed(fakeStorage({ 'nd:sidebar-collapsed:v1': 'yes' }))).toBe(false);
  });

  it('writes "1" / "0" sentinels', () => {
    const s = fakeStorage();
    writePanelCollapsed(true, s);
    expect(s.getItem('nd:sidebar-collapsed:v1')).toBe('1');
    writePanelCollapsed(false, s);
    expect(s.getItem('nd:sidebar-collapsed:v1')).toBe('0');
  });

  it('round-trips through read after write', () => {
    const s = fakeStorage();
    writePanelCollapsed(true, s);
    expect(readPanelCollapsed(s)).toBe(true);
  });

  it('never throws when storage is unavailable', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(() => readPanelCollapsed(broken)).not.toThrow();
    expect(readPanelCollapsed(broken)).toBe(false);
    expect(() => writePanelCollapsed(true, broken)).not.toThrow();
  });
});
