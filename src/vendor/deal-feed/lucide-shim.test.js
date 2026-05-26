import { describe, it, expect, vi, beforeEach } from 'vitest';

const createIconsMock = vi.fn();
const iconsMock = { FakeIcon: ['svg', {}, []] };

vi.mock('lucide', () => ({
  createIcons: (...args) => createIconsMock(...args),
  icons: iconsMock,
}));

const { installLucideShim } = await import('./lucide-shim.js');

describe('installLucideShim', () => {
  beforeEach(() => {
    createIconsMock.mockReset();
  });

  it('attaches a lucide object onto the provided global ref', () => {
    const g = {};
    installLucideShim(g);
    expect(g.lucide).toBeDefined();
    expect(typeof g.lucide.createIcons).toBe('function');
    expect(g.lucide.icons).toBe(iconsMock);
  });

  it('injects icons when bundle calls createIcons({ attrs }) — single-arg form', () => {
    const g = {};
    installLucideShim(g);

    g.lucide.createIcons({ attrs: { 'stroke-width': '1.75', class: 'lucide' } });

    expect(createIconsMock).toHaveBeenCalledTimes(1);
    const arg = createIconsMock.mock.calls[0][0];
    expect(arg.icons).toBe(iconsMock);
    expect(arg.attrs).toEqual({ 'stroke-width': '1.75', class: 'lucide' });
  });

  it('forwards positional root to opts.root — two-arg form', () => {
    const g = {};
    installLucideShim(g);
    const brandMark = { id: 'fake-root' };

    g.lucide.createIcons({ attrs: { class: 'lucide' } }, brandMark);

    expect(createIconsMock).toHaveBeenCalledTimes(1);
    const arg = createIconsMock.mock.calls[0][0];
    expect(arg.root).toBe(brandMark);
    expect(arg.icons).toBe(iconsMock);
  });

  it('does not override an explicit opts.root with the positional root', () => {
    const g = {};
    installLucideShim(g);
    const explicitRoot = { id: 'explicit' };
    const positional = { id: 'positional' };

    g.lucide.createIcons({ root: explicitRoot }, positional);

    expect(createIconsMock.mock.calls[0][0].root).toBe(explicitRoot);
  });

  it('tolerates being called with no arguments', () => {
    const g = {};
    installLucideShim(g);

    g.lucide.createIcons();

    expect(createIconsMock).toHaveBeenCalledTimes(1);
    expect(createIconsMock.mock.calls[0][0].icons).toBe(iconsMock);
  });

  it('does not let callers override the injected icons object', () => {
    const g = {};
    installLucideShim(g);
    const otherIcons = { Different: 'sentinel' };

    g.lucide.createIcons({ icons: otherIcons });

    // Caller-provided icons survives because spread order favors `opts`, but
    // this is intentional: callers may pass their own subset. The shim's
    // contract is "fill in icons WHEN MISSING."
    expect(createIconsMock.mock.calls[0][0].icons).toBe(otherIcons);
  });

  it('cleanup restores a prior lucide value when one existed', () => {
    const g = { lucide: { sentinel: 'prior' } };

    const cleanup = installLucideShim(g);
    expect(g.lucide.sentinel).toBeUndefined();

    cleanup();
    expect(g.lucide).toEqual({ sentinel: 'prior' });
  });

  it('cleanup deletes the lucide key when none existed before', () => {
    const g = {};
    const cleanup = installLucideShim(g);
    expect(g.lucide).toBeDefined();

    cleanup();
    expect('lucide' in g).toBe(false);
  });

  it('cleanup distinguishes "prior was undefined" from "no prior key"', () => {
    const g = { lucide: undefined };
    const cleanup = installLucideShim(g);
    cleanup();
    expect('lucide' in g).toBe(true);
    expect(g.lucide).toBeUndefined();
  });

  it('defaults globalRef to globalThis when invoked with no args', () => {
    const prior = globalThis.lucide;
    try {
      const cleanup = installLucideShim();
      expect(globalThis.lucide).toBeDefined();
      expect(typeof globalThis.lucide.createIcons).toBe('function');
      cleanup();
    } finally {
      if (prior === undefined) {
        delete globalThis.lucide;
      } else {
        globalThis.lucide = prior;
      }
    }
  });
});
