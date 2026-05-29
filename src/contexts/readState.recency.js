const RECENT_REVIEWED_KEY_PREFIX = 'dealfeed.recent-reviewed:';

/**
 * Get the storage key for a given subscriber.
 * Matches the pattern used in ReadStateContext: `dealfeed.{feature}.{subId}`
 */
export function getRecentKey(subId) {
  return `${RECENT_REVIEWED_KEY_PREFIX}${subId}`;
}

/**
 * Read the recently reviewed deals from storage.
 * Returns an ordered array of { id, ts } newest-first.
 * Returns [] if absent, malformed, or storage is unavailable.
 * Never throws.
 */
export function readRecent(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out malformed entries; keep valid { id, ts } pairs
    return parsed.filter(
      entry => entry && typeof entry.id !== 'undefined' && typeof entry.ts === 'number'
    );
  } catch {
    // Malformed JSON, storage unavailable, or other error: return empty
    return [];
  }
}

/**
 * Record (or update) a recently reviewed deal.
 * - Moves/inserts id at the front with timestamp `now`.
 * - Deduplicates by id (newer ts wins).
 * - Caps list at 20 entries.
 * - Persists to storage and returns the new array.
 * - Never throws; if storage is blocked, returns best-effort result.
 */
export function recordRecent(storage, key, id, now) {
  try {
    const current = readRecent(storage, key);

    // Remove if already present (we'll re-insert at front)
    const filtered = current.filter(entry => String(entry.id) !== String(id));

    // Insert at front with new timestamp
    const updated = [{ id: String(id), ts: now }, ...filtered].slice(0, 20);

    // Persist
    storage.setItem(key, JSON.stringify(updated));

    return updated;
  } catch {
    // Storage blocked or error during update: return best-effort current state
    return readRecent(storage, key);
  }
}
