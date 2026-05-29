import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getRecentKey, readRecent, recordRecent } from './readState.recency';

const ReadStateCtx = createContext(null);

export function ReadStateProvider({ children }) {
  const { subscriber } = useAuth();
  const subId = subscriber?.id ?? '';

  const [readIds, setReadIds] = useState(() => {
    if (!subId) return new Set();
    const prefix = `dealfeed.read.${subId}:`;
    return new Set(
      Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .map(k => k.slice(prefix.length))
    );
  });

  const [recentIds, setRecentIds] = useState(() => {
    if (!subId) return [];
    const key = getRecentKey(subId);
    return readRecent(localStorage, key);
  });

  const isRead = useCallback((dealId) => readIds.has(String(dealId)), [readIds]);

  const markRead = useCallback((dealId) => {
    if (!subId) return;
    const key = `dealfeed.read.${subId}:${dealId}`;
    if (localStorage.getItem(key) === 'true') return;
    localStorage.setItem(key, 'true');
    setReadIds(prev => new Set([...prev, String(dealId)]));

    // Also record in recently reviewed
    const recentKey = getRecentKey(subId);
    const updated = recordRecent(localStorage, recentKey, dealId, Date.now());
    setRecentIds(updated);
  }, [subId]);

  return (
    <ReadStateCtx.Provider value={{ isRead, markRead, recentIds }}>
      {children}
    </ReadStateCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReadState() {
  const ctx = useContext(ReadStateCtx);
  if (!ctx) throw new Error('useReadState must be used within ReadStateProvider');
  return ctx;
}
