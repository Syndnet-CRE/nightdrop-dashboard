import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDeals } from '../contexts/DealsContext';
import { useDealSearch } from '../hooks/useDealSearch';
import { useGeocode } from '../hooks/useGeocode';
import { I } from './Icons';

/**
 * HeaderSearch — central command bar in the top header.
 *
 * Phase 1: type to search your own deals (client-side) and real-world
 * addresses (Mapbox geocoding). Selecting a deal opens its detail page;
 * selecting an address opens the map and flies there.
 *
 * Nav is delegated to the parent so AppShell owns the hybrid view/route logic:
 *   onSearchDeal(dealId)         -> navigate('/deal/:id')
 *   onSearchCoords(lat, lng)     -> show map view + flyTo coords
 *
 * The Mapbox token is read from VITE_MAPBOX_TOKEN. When it is absent or lacks
 * the geocoding scope, useGeocode returns no suggestions and the bar degrades
 * to deals-only search with no error shown.
 */
export default function HeaderSearch({ onSearchDeal, onSearchCoords }) {
  const { deals = [] } = useDeals() || {};
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const trimmed = query.trim();
  const dealMatches = useDealSearch(trimmed, deals, 6);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const { suggestions: addressMatches, loading: geoLoading } = useGeocode(trimmed, {
    token: mapboxToken,
    enabled: open && trimmed.length >= 3,
  });

  // Flattened, ordered item list for keyboard navigation: deals first, then
  // addresses. Each item carries the action to run on select.
  const items = useMemo(() => {
    const dealItems = dealMatches.map((d) => ({ kind: 'deal', id: `deal-${d.id}`, data: d }));
    const addrItems = (addressMatches || []).map((a) => ({ kind: 'address', id: `addr-${a.id}`, data: a }));
    return [...dealItems, ...addrItems];
  }, [dealMatches, addressMatches]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Cmd/Ctrl+K focuses the search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }, []);

  const select = useCallback((item) => {
    if (!item) return;
    if (item.kind === 'deal') {
      onSearchDeal?.(item.data.id);
    } else if (item.kind === 'address') {
      onSearchCoords?.(item.data.lat, item.data.lng, item.data.label);
    }
    reset();
  }, [onSearchDeal, onSearchCoords, reset]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { reset(); return; }
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(items[activeIndex] ?? items[0]);
    }
  };

  const showPanel = open && trimmed.length >= 1;
  const hasResults = items.length > 0;
  const nothingYet = showPanel && !hasResults && !geoLoading;

  return (
    <div className="hdr-search" ref={wrapRef}>
      <span className="hdr-search-icon" aria-hidden="true"><I.Search size={15} /></span>
      <input
        ref={inputRef}
        className="hdr-search-input"
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="hdr-search-listbox"
        aria-activedescendant={activeIndex >= 0 ? items[activeIndex]?.id : undefined}
        aria-autocomplete="list"
        placeholder="Search deals or an address…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      {query && (
        <button type="button" className="hdr-search-clear" onClick={reset} aria-label="Clear search" title="Clear">
          <I.Close size={13} />
        </button>
      )}

      {showPanel && (
        <div className="hdr-search-panel" id="hdr-search-listbox" role="listbox">
          {dealMatches.length > 0 && (
            <div className="hdr-search-section">
              <div className="hdr-search-section-label">Your deals</div>
              {dealMatches.map((d) => {
                const idx = items.findIndex((it) => it.kind === 'deal' && it.data.id === d.id);
                return (
                  <button
                    key={`deal-${d.id}`}
                    id={`deal-${d.id}`}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`hdr-search-row${activeIndex === idx ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => select(items[idx])}
                  >
                    <span className="hdr-search-row-ico"><I.Building size={15} /></span>
                    <span className="hdr-search-row-text">
                      <span className="hdr-search-row-title">{d.addr || 'Deal'}</span>
                      <span className="hdr-search-row-sub">{[d.city, d.owner].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {(addressMatches?.length > 0 || geoLoading) && (
            <div className="hdr-search-section">
              <div className="hdr-search-section-label">Addresses{geoLoading ? ' · searching…' : ''}</div>
              {(addressMatches || []).map((a) => {
                const idx = items.findIndex((it) => it.kind === 'address' && it.data.id === a.id);
                return (
                  <button
                    key={`addr-${a.id}`}
                    id={`addr-${a.id}`}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`hdr-search-row${activeIndex === idx ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => select(items[idx])}
                  >
                    <span className="hdr-search-row-ico"><I.Pin size={15} /></span>
                    <span className="hdr-search-row-text">
                      <span className="hdr-search-row-title">{a.address || a.label}</span>
                      <span className="hdr-search-row-sub">Open on map</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {nothingYet && (
            <div className="hdr-search-empty">
              No deals match. {trimmed.length < 3 ? 'Type more to search addresses.' : 'No address matches either.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
