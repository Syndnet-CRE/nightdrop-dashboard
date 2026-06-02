const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInvitesFromText(text) {
  if (!text || !text.trim()) return [];

  return text
    .split(/[\n,;]+/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // "First Last <email@example.com>"
      const angleMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
      if (angleMatch) {
        return { full_name: angleMatch[1].trim(), email: angleMatch[2].trim().toLowerCase() };
      }

      // "email@example.com  First Last"
      const emailFirstMatch = trimmed.match(/^([^\s@]+@[^\s@]+\.[^\s@]+)\s+(.+)$/);
      if (emailFirstMatch) {
        return { email: emailFirstMatch[1].toLowerCase(), full_name: emailFirstMatch[2].trim() };
      }

      // bare email
      if (EMAIL_RE.test(trimmed)) {
        return { email: trimmed.toLowerCase(), full_name: '' };
      }

      return null;
    })
    .filter(Boolean);
}

export function validateInvite({ email, full_name }) {
  if (!email || !EMAIL_RE.test(email)) return 'Invalid email';
  if (full_name && full_name.length > 120) return 'Name too long';
  return null;
}

export function dedupeByEmail(invites) {
  const seen = new Set();
  return invites.filter(inv => {
    if (seen.has(inv.email)) return false;
    seen.add(inv.email);
    return true;
  });
}

/**
 * Best human-readable error from a thrown api error. The api layer attaches the
 * parsed response body (which carries the backend `error` string on a 502) to
 * `err.body`, falling back to `err.message`.
 * @param {unknown} err
 * @param {string} [fallback]
 * @returns {string}
 */
export function inviteErrorMessage(err, fallback = 'Failed to send invite') {
  return err?.body?.error || err?.message || fallback;
}

/**
 * A single-send response is only a success when `ok === true`. A body that omits
 * `ok` entirely is treated as success (legacy shape); an explicit `ok:false`
 * (a 2xx that still failed) is a failure.
 * @param {{ ok?: boolean } | null | undefined} body
 * @returns {boolean}
 */
export function isSendOk(body) {
  return body?.ok !== false;
}

/**
 * Normalize the bulk-send payload. A 200 here does NOT mean every invite sent —
 * derive counts and surface each failed row's error.
 * @param {{ sent?: number, failed?: number, results?: Array<{ email: string, ok: boolean, error: string|null }> }} data
 * @returns {{ sent: number, failed: number, failures: Array<{ email: string, error: string }> }}
 */
export function summarizeBulkSend(data) {
  const results = Array.isArray(data?.results) ? data.results : [];
  const failures = results
    .filter(r => r.ok === false)
    .map(r => ({ email: r.email, error: r.error || 'Delivery failed' }));
  const sent = typeof data?.sent === 'number'
    ? data.sent
    : results.filter(r => r.ok === true).length;
  const failed = typeof data?.failed === 'number'
    ? data.failed
    : failures.length;
  return { sent, failed, failures };
}

/**
 * Describe where an invite is in its lifecycle for display. Claimed wins over
 * pending; pending shows the issued time; otherwise the timeline is empty.
 * @param {{ token_status?: string|null, token_issued_at?: string|null, token_claimed_at?: string|null, invited_at?: string|null }} sub
 * @returns {{ label: 'Activated' | 'Invited' | null, date: string|null }}
 */
export function inviteTimeline(sub) {
  if (!sub) return { label: null, date: null };
  if (sub.token_claimed_at || sub.token_status === 'claimed') {
    return { label: 'Activated', date: sub.token_claimed_at || null };
  }
  if (sub.token_status === 'pending') {
    return { label: 'Invited', date: sub.token_issued_at || sub.invited_at || null };
  }
  return { label: null, date: null };
}
