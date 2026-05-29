import { describe, it, expect, beforeEach } from 'vitest';
import { getRecentKey, readRecent, recordRecent } from './readState.recency';

describe('readState.recency', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      data: {},
      getItem(key) {
        return this.data[key] ?? null;
      },
      setItem(key, value) {
        this.data[key] = value;
      }
    };
  });

  describe('getRecentKey', () => {
    it('returns a scoped key for a subscriber', () => {
      const key = getRecentKey('sub-123');
      expect(key).toBe('dealfeed.recent-reviewed:sub-123');
    });

    it('handles different subscriber IDs', () => {
      expect(getRecentKey('alice')).toBe('dealfeed.recent-reviewed:alice');
      expect(getRecentKey('bob')).toBe('dealfeed.recent-reviewed:bob');
    });
  });

  describe('readRecent', () => {
    it('returns empty array when key does not exist', () => {
      const result = readRecent(mockStorage, 'missing-key');
      expect(result).toEqual([]);
    });

    it('returns empty array when stored value is malformed JSON', () => {
      mockStorage.data['test-key'] = 'not json';
      const result = readRecent(mockStorage, 'test-key');
      expect(result).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      mockStorage.data['test-key'] = JSON.stringify({ foo: 'bar' });
      const result = readRecent(mockStorage, 'test-key');
      expect(result).toEqual([]);
    });

    it('filters out entries without id or ts', () => {
      mockStorage.data['test-key'] = JSON.stringify([
        { id: 'deal-1', ts: 1000 },
        { id: 'deal-2' }, // missing ts
        { ts: 1002 }, // missing id
        { id: 'deal-3', ts: 1003 }
      ]);
      const result = readRecent(mockStorage, 'test-key');
      expect(result).toEqual([
        { id: 'deal-1', ts: 1000 },
        { id: 'deal-3', ts: 1003 }
      ]);
    });

    it('does not throw if storage is blocked', () => {
      mockStorage.getItem = () => {
        throw new Error('Storage blocked');
      };
      const result = readRecent(mockStorage, 'test-key');
      expect(result).toEqual([]);
    });
  });

  describe('recordRecent', () => {
    it('inserts a new id at the front with the given timestamp', () => {
      const result = recordRecent(mockStorage, 'test-key', 'deal-1', 1000);
      expect(result).toEqual([{ id: 'deal-1', ts: 1000 }]);
      expect(mockStorage.getItem('test-key')).toBe(JSON.stringify([{ id: 'deal-1', ts: 1000 }]));
    });

    it('moves an existing id to the front with a new timestamp (deduplication)', () => {
      recordRecent(mockStorage, 'test-key', 'deal-1', 1000);
      recordRecent(mockStorage, 'test-key', 'deal-2', 2000);
      const result = recordRecent(mockStorage, 'test-key', 'deal-1', 3000);

      expect(result).toEqual([
        { id: 'deal-1', ts: 3000 }, // moved to front with new ts
        { id: 'deal-2', ts: 2000 }
      ]);
    });

    it('caps the list at 20 entries', () => {
      // Insert 25 deals
      for (let i = 1; i <= 25; i++) {
        recordRecent(mockStorage, 'test-key', `deal-${i}`, 1000 + i);
      }
      const result = readRecent(mockStorage, 'test-key');
      expect(result.length).toBe(20);
      // Newest should be deal-25
      expect(result[0].id).toBe('deal-25');
      // Oldest (20th) should be deal-6 (25 - 20 + 1)
      expect(result[19].id).toBe('deal-6');
    });

    it('deduplicates and maintains insertion order (newest first)', () => {
      recordRecent(mockStorage, 'test-key', 'deal-1', 1000);
      recordRecent(mockStorage, 'test-key', 'deal-2', 2000);
      recordRecent(mockStorage, 'test-key', 'deal-3', 3000);
      recordRecent(mockStorage, 'test-key', 'deal-2', 4000); // update deal-2

      const result = readRecent(mockStorage, 'test-key');
      expect(result).toEqual([
        { id: 'deal-2', ts: 4000 }, // moved to front
        { id: 'deal-3', ts: 3000 },
        { id: 'deal-1', ts: 1000 }
      ]);
    });

    it('coerces id to string', () => {
      recordRecent(mockStorage, 'test-key', 123, 1000);
      const result = readRecent(mockStorage, 'test-key');
      expect(result[0].id).toBe('123');
      expect(typeof result[0].id).toBe('string');
    });

    it('persists to storage', () => {
      recordRecent(mockStorage, 'test-key', 'deal-1', 1000);
      const stored = mockStorage.getItem('test-key');
      expect(stored).toBe(JSON.stringify([{ id: 'deal-1', ts: 1000 }]));
    });

    it('returns best-effort result if storage is blocked during setItem', () => {
      recordRecent(mockStorage, 'test-key', 'deal-1', 1000);

      // Block setItem but allow getItem
      mockStorage.setItem = () => {
        throw new Error('Storage blocked');
      };

      const result = recordRecent(mockStorage, 'test-key', 'deal-2', 2000);
      // Should return the current state without throwing
      expect(result).toEqual([{ id: 'deal-1', ts: 1000 }]);
    });
  });
});
