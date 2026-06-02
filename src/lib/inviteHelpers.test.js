import { describe, it, expect } from 'vitest';
import {
  parseInvitesFromText,
  validateInvite,
  dedupeByEmail,
  inviteErrorMessage,
  isSendOk,
  summarizeBulkSend,
  inviteTimeline,
} from './inviteHelpers';

describe('parseInvitesFromText', () => {
  it('parses bare emails', () => {
    expect(parseInvitesFromText('a@x.com')).toEqual([{ email: 'a@x.com', full_name: '' }]);
  });

  it('parses "Name <email>" format', () => {
    expect(parseInvitesFromText('Jane Doe <jane@x.com>')).toEqual([
      { full_name: 'Jane Doe', email: 'jane@x.com' },
    ]);
  });
});

describe('validateInvite', () => {
  it('rejects invalid email', () => {
    expect(validateInvite({ email: 'nope', full_name: '' })).toBe('Invalid email');
  });

  it('accepts a valid invite', () => {
    expect(validateInvite({ email: 'a@x.com', full_name: 'A' })).toBeNull();
  });
});

describe('dedupeByEmail', () => {
  it('drops duplicate emails, keeping first', () => {
    const out = dedupeByEmail([{ email: 'a@x.com' }, { email: 'a@x.com' }, { email: 'b@x.com' }]);
    expect(out).toEqual([{ email: 'a@x.com' }, { email: 'b@x.com' }]);
  });
});

describe('inviteErrorMessage', () => {
  it('prefers body.error from a thrown 502', () => {
    const err = new Error('API error 502');
    err.status = 502;
    err.body = { ok: false, statusCode: 403, error: 'Resend responded 403: domain not verified', email: 'a@x.com' };
    expect(inviteErrorMessage(err)).toBe('Resend responded 403: domain not verified');
  });

  it('falls back to err.message when body.error is absent', () => {
    const err = new Error('Network down');
    expect(inviteErrorMessage(err)).toBe('Network down');
  });

  it('uses the provided fallback when nothing else is available', () => {
    expect(inviteErrorMessage(null, 'Failed to send invite')).toBe('Failed to send invite');
  });

  it('defaults to a generic message with no fallback supplied', () => {
    expect(inviteErrorMessage(undefined)).toBe('Failed to send invite');
  });
});

describe('isSendOk', () => {
  it('is true for an explicit ok:true body', () => {
    expect(isSendOk({ ok: true })).toBe(true);
  });

  it('is false for an explicit ok:false body (2xx that still failed)', () => {
    expect(isSendOk({ ok: false, error: 'nope' })).toBe(false);
  });

  it('is true when the body omits ok entirely (legacy success shape)', () => {
    expect(isSendOk({})).toBe(true);
    expect(isSendOk(undefined)).toBe(true);
  });
});

describe('summarizeBulkSend', () => {
  it('counts sent/failed and lists failure rows with their error', () => {
    const data = {
      sent: 2,
      failed: 1,
      results: [
        { email: 'a@x.com', ok: true, statusCode: 200, error: null, token: 't1' },
        { email: 'b@x.com', ok: false, statusCode: 403, error: 'Resend responded 403: domain not verified', token: 't2' },
      ],
    };
    expect(summarizeBulkSend(data)).toEqual({
      sent: 2,
      failed: 1,
      failures: [{ email: 'b@x.com', error: 'Resend responded 403: domain not verified' }],
    });
  });

  it('derives counts from results when sent/failed are missing', () => {
    const data = {
      results: [
        { email: 'a@x.com', ok: true },
        { email: 'b@x.com', ok: false, error: 'x' },
        { email: 'c@x.com', ok: false, error: null },
      ],
    };
    const out = summarizeBulkSend(data);
    expect(out.sent).toBe(1);
    expect(out.failed).toBe(2);
    expect(out.failures).toEqual([
      { email: 'b@x.com', error: 'x' },
      { email: 'c@x.com', error: 'Delivery failed' },
    ]);
  });

  it('handles an empty/absent payload safely', () => {
    expect(summarizeBulkSend(null)).toEqual({ sent: 0, failed: 0, failures: [] });
    expect(summarizeBulkSend({})).toEqual({ sent: 0, failed: 0, failures: [] });
  });
});

describe('inviteTimeline', () => {
  it('shows Activated with token_claimed_at when claimed', () => {
    expect(inviteTimeline({ token_status: 'claimed', token_claimed_at: '2026-05-30T10:00:00Z', token_issued_at: '2026-05-28T10:00:00Z' }))
      .toEqual({ label: 'Activated', date: '2026-05-30T10:00:00Z' });
  });

  it('treats a present token_claimed_at as activated even if status lags', () => {
    expect(inviteTimeline({ token_status: 'pending', token_claimed_at: '2026-05-30T10:00:00Z' }))
      .toEqual({ label: 'Activated', date: '2026-05-30T10:00:00Z' });
  });

  it('shows Invited with token_issued_at when pending', () => {
    expect(inviteTimeline({ token_status: 'pending', token_issued_at: '2026-05-28T10:00:00Z' }))
      .toEqual({ label: 'Invited', date: '2026-05-28T10:00:00Z' });
  });

  it('falls back to invited_at when token_issued_at is absent on a pending invite', () => {
    expect(inviteTimeline({ token_status: 'pending', invited_at: '2026-05-28T09:00:00Z' }))
      .toEqual({ label: 'Invited', date: '2026-05-28T09:00:00Z' });
  });

  it('returns a null timeline when nothing has been sent', () => {
    expect(inviteTimeline({ token_status: null, invited_at: null }))
      .toEqual({ label: null, date: null });
  });

  it('handles an undefined subscriber safely', () => {
    expect(inviteTimeline(undefined)).toEqual({ label: null, date: null });
  });
});
