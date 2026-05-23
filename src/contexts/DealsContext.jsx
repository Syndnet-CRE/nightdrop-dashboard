import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const DealsCtx = createContext(null);

const STATUS_DISPLAY = {
  active: 'Active',
  paused: 'Paused',
  pending: 'Pending',
  cancelled: 'Cancelled',
  coverage_failed: 'Coverage Failed',
};

function normalizeBuyBox(b) {
  const geo = [
    ...(b.geo_cities || []),
    ...(b.geo_states || []),
    ...(b.geo_counties || []),
  ].filter(Boolean).join(', ');

  let lastRun = '—';
  if (b.last_run_at) {
    const d = new Date(b.last_run_at);
    lastRun = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' — '
      + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  }

  return {
    ...b,
    id: b.id,
    name: b.label,
    status: STATUS_DISPLAY[b.status] || b.status || 'Active',
    geo: geo || '—',
    classes: b.asset_classes || [],
    hold: b.min_hold_yrs ? `${b.min_hold_yrs} yr` : '—',
    created: b.created_at
      ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
    deals: b.deals_sent_total || 0,
    lastRun,
  };
}

export function DealsProvider({ children }) {
  const [deals, setDeals] = useState([]);
  const [buyBoxes, setBuyBoxes] = useState([]);
  const [contacts, setContacts] = useState({});
  const [dealNotes, setDealNotes] = useState({});
  const [portfolios, setPortfolios] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsRes, boxesRes] = await Promise.all([
        api.get('/api/dealfeed/deals'),
        api.get('/api/dealfeed/buy-boxes'),
      ]);
      setDeals(dealsRes?.deals || []);
      setBuyBoxes((boxesRes?.buy_boxes || []).map(normalizeBuyBox));
    } catch (err) {
      console.error('[DealsContext] fetchAll failed:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const postFeedback = useCallback(async (dealId, fb) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, feedback: fb } : d));
    try {
      await api.post(`/api/dealfeed/deals/${dealId}/feedback`, { feedback: fb });
    } catch {
      // optimistic update stays; feedback sync will retry on next load
    }
  }, []);

  const saveNote = useCallback(async (dealId, text) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, notes: text } : d));
    await api.patch(`/api/dealfeed/deals/${dealId}/notes`, { notes: text });
  }, []);

  const updateStatus = useCallback(async (dealId, status) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status } : d));
    try {
      await api.patch(`/api/dealfeed/deals/${dealId}/status`, { status });
    } catch {
      // optimistic update stays; status will resync on next refetch
    }
  }, []);

  const fetchContacts = useCallback(async (dealId) => {
    try {
      const res = await api.get(`/api/dealfeed/deals/${dealId}/contacts`);
      setContacts(prev => ({ ...prev, [dealId]: res.contacts || [] }));
    } catch {
      // leave existing contacts state unchanged on error
    }
  }, []);

  const logContact = useCallback(async (dealId, payload) => {
    const res = await api.post(`/api/dealfeed/deals/${dealId}/contacts`, payload);
    setContacts(prev => ({
      ...prev,
      [dealId]: [res.contact, ...(prev[dealId] || [])],
    }));
    return res.contact;
  }, []);

  const patchBuyBox = useCallback(async (id, payload) => {
    const res = await api.patch(`/api/dealfeed/buy-boxes/${id}`, payload);
    setBuyBoxes(prev => prev.map(b => b.id === id ? normalizeBuyBox(res.buy_box) : b));
    return res.buy_box;
  }, []);

  const deleteBuyBox = useCallback(async (id) => {
    await api.delete(`/api/dealfeed/buy-boxes/${id}`);
    setBuyBoxes(prev => prev.filter(b => b.id !== id));
  }, []);

  const fetchDealNotes = useCallback(async (dealId) => {
    try {
      const res = await api.get(`/api/dealfeed/deals/${dealId}/notes`);
      setDealNotes(prev => ({ ...prev, [dealId]: res.notes || [] }));
    } catch {
      // leave existing state unchanged on error
    }
  }, []);

  const createDealNote = useCallback(async (dealId, noteText) => {
    const res = await api.post(`/api/dealfeed/deals/${dealId}/notes`, { note_text: noteText });
    setDealNotes(prev => ({
      ...prev,
      [dealId]: [res.note, ...(prev[dealId] || [])],
    }));
    return res.note;
  }, []);

  const fetchOwnerPortfolio = useCallback(async (attomId) => {
    if (!attomId) return;
    try {
      const res = await api.get(`/api/dealfeed/owner-portfolio/${attomId}`);
      setPortfolios(prev => ({ ...prev, [String(attomId)]: res.portfolio || null }));
    } catch {
      setPortfolios(prev => ({ ...prev, [String(attomId)]: null }));
    }
  }, []);

  return (
    <DealsCtx.Provider value={{ deals, buyBoxes, contacts, dealNotes, portfolios, loading, error, refetch: fetchAll, postFeedback, saveNote, updateStatus, fetchContacts, logContact, patchBuyBox, deleteBuyBox, fetchDealNotes, createDealNote, fetchOwnerPortfolio }}>
      {children}
    </DealsCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDeals() {
  const ctx = useContext(DealsCtx);
  if (!ctx) throw new Error('useDeals must be used within DealsProvider');
  return ctx;
}
