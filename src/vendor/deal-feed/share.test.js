import { describe, it, expect, vi } from 'vitest';
import { buildDealSharePayload, shareDeal } from './share.js';

/**
 * Item (E): the deal-feed row "Share brief" button (.aico.sh). Behavior per
 * Brady: native share sheet (navigator.share) with a desktop clipboard
 * fallback. The payload builder is pure; shareDeal takes injected
 * navigator/origin/toast so the imperative path is testable too.
 */

describe('buildDealSharePayload', () => {
  it('builds title/text/url from a deal (camelCase addr)', () => {
    const p = buildDealSharePayload({ id: 'abc', addr: '101 Main St' }, 'https://propcloud.ai');
    expect(p).toEqual({
      title: '101 Main St',
      text: 'Deal brief: 101 Main St',
      url: 'https://propcloud.ai/deal/abc',
    });
  });

  it('falls back to snake_case address, then a generic label', () => {
    expect(buildDealSharePayload({ id: '1', address: '5 Oak Ave' }, 'https://x.io').title).toBe('5 Oak Ave');
    expect(buildDealSharePayload({ id: '2' }, 'https://x.io').title).toBe('Deal');
  });

  it('strips trailing slashes from origin so the url is not doubled', () => {
    expect(buildDealSharePayload({ id: 'z', addr: 'A' }, 'https://x.io/').url).toBe('https://x.io/deal/z');
  });
});

describe('shareDeal', () => {
  const deal = { id: 'd1', addr: '101 Main St' };

  it('calls navigator.share with the payload when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const toast = vi.fn();
    await shareDeal(deal, { origin: 'https://propcloud.ai', navigator: { share }, toast });
    expect(share).toHaveBeenCalledWith({
      title: '101 Main St',
      text: 'Deal brief: 101 Main St',
      url: 'https://propcloud.ai/deal/d1',
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it('falls back to clipboard + toast when navigator.share is absent', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const toast = vi.fn();
    await shareDeal(deal, { origin: 'https://propcloud.ai', navigator: { clipboard: { writeText } }, toast });
    expect(writeText).toHaveBeenCalledWith('https://propcloud.ai/deal/d1');
    expect(toast).toHaveBeenCalledWith('Link copied');
  });

  it('does not surface an error when the user dismisses the share sheet (AbortError)', async () => {
    const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' });
    const share = vi.fn().mockRejectedValue(abort);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const toast = vi.fn();
    await shareDeal(deal, { origin: 'https://x.io', navigator: { share, clipboard: { writeText } }, toast });
    // No clipboard fallback, no toast — the user simply cancelled.
    expect(writeText).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when navigator.share rejects for a real reason', async () => {
    const share = vi.fn().mockRejectedValue(new Error('share failed'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const toast = vi.fn();
    await shareDeal(deal, { origin: 'https://x.io', navigator: { share, clipboard: { writeText } }, toast });
    expect(writeText).toHaveBeenCalledWith('https://x.io/deal/d1');
    expect(toast).toHaveBeenCalledWith('Link copied');
  });
});
