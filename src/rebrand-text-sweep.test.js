import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Item (B): "Nightdrop" -> "PropCloud" user-visible TEXT sweep.
 *
 * This is a source-scan guard, not a render test. The repo has no
 * jsdom/RTL configured (tests run in node), and a render harness would be
 * scope creep for a copy change. Instead we assert against the source of
 * each user-facing string, and — critically — we assert that the technical
 * `nightdrop-*` identifiers are LEFT ALONE, because renaming them silently
 * breaks persisted user state and design tokens.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(__dirname, rel), 'utf8');

describe('rebrand: user-visible text is PropCloud, not Nightdrop', () => {
  it('BuyBoxPage7 cadence copy says PropCloud', () => {
    const src = read('components/BuyBoxPage7.jsx');
    expect(src).toContain('pick how often PropCloud should send matches');
    expect(src).not.toMatch(/how often Nightdrop should send/);
  });

  it('BuyBoxWizard brand logo aria-label is PropCloud', () => {
    const src = read('components/BuyBoxWizard.jsx');
    expect(src).toContain('aria-label="PropCloud"');
    expect(src).not.toContain('aria-label="Nightdrop"');
  });

  it('DealFeedExcelView chat panel title says Ask PropCloud', () => {
    const src = read('views/DealFeedExcelView.jsx');
    expect(src).toContain('Ask PropCloud');
    expect(src).not.toContain('Ask Nightdrop');
  });

  it('LoginView wordmark and contact line say PropCloud', () => {
    const src = read('views/LoginView.jsx');
    // Wordmark: colored initial "P" + "ropCloud"
    expect(src).toContain('>P</span>ropCloud');
    expect(src).toContain('Contact PropCloud');
    // No visible "Nightdrop" wordmark / contact text remains.
    expect(src).not.toMatch(/>\s*Nightdrop/);
    expect(src).not.toContain('Contact Nightdrop');
  });
});

describe('rebrand: technical nightdrop identifiers are PRESERVED', () => {
  it('localStorage theme key stays "nightdrop-theme" across all readers/writers', () => {
    // Renaming this key would silently reset every user's saved theme.
    expect(read('App.jsx')).toContain("localStorage.getItem('nightdrop-theme')");
    expect(read('components/DealDetail/DealTopbar.jsx')).toContain("'nightdrop-theme'");
    expect(read('views/SettingsView.jsx')).toContain("'nightdrop-theme'");
  });

  it('MapView localStorage keys stay nightdrop-prefixed', () => {
    const src = read('views/MapView.jsx');
    expect(src).toContain("'nightdrop-map-style'");
    expect(src).toContain("'nightdrop-deals-filters'");
  });
});
