import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDeals } from '../contexts/DealsContext';
import { useReadState } from '../contexts/ReadStateContext';
import { useDealSearch } from '../hooks/useDealSearch';
import { useGeocode } from '../hooks/useGeocode';
import { I } from './Icons';

/**
 * HeaderSearch — central command bar in the top header.
 *
 * Empty (focused, no query): recently reviewed deals + folders (buy boxes and
 * saved deals) you can expand to jump to any deal.
 * Typing: searches your own deals (client-side) and real-world addresses
 * (Mapbox geocoding). Deal -> detail page; address -> map flyTo.
 *
 * Nav is delegated to the parent so AppShell owns the hybrid view/route logic:
 *   onSearchDeal(dealId)      -> navigate('/deal/:id')
 *   onSearchCoords(lat, lng)  -> map view + flyTo coords
 *
 * The Mapbox token is read from VITE_MAPBOX_TOKEN; when absent or unauthorized,
 * useGeocode returns no suggestions and the bar degrades to deals-only.
 */
const dealAddr = (d) => d.addr || d.address || 'Deal';
const dealCity = (d) => {
  const city = d.property_city || d.city;
  const st = d.property_state || d.state;
  const zip = d.property_zip || d.zip;
  return [city ? `${city},` : '', st || '', zip || ''].filter(Boolean).join(' ').trim();
};

export default function HeaderSearch({ onSearchDeal, onSearchCoords }) {
  const { deals = [], buyBoxes = [] } = useDeals() || {};
  const { recentIds = [] } = useReadState() || {};
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [expandedFolder, setExpandedFolder] = useState(null);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const trimmed = query.trim();
  const isQuery = trimmed.length >= 1;

  const dealMatches = useDealSearch(trimmed, deals, 6);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const { suggestions: addressMatches, loading: geoLoading } = useGeocode(trimmed, {
    token: mapboxToken,
    enabled: open && isQuery && trimmed.length >= 3,
  });

  // Empty-state data: recently reviewed deals + folders (buy boxes + saved).
  const recentDeals = useMemo(() => {
    if (isQuery) return [];
    const byId = new Map(deals.map((d) => [String(d.id), d]));
    // recentIds is an ordered array of { id, ts } (newest first). Be defensive
    // in case a bare id string is ever passed.
    return recentIds
      .map((r) => byId.get(String(r?.id ?? r)))
      .filter(Boolean)
      .slice(0, 6);
  }, [isQuery, deals, recentIds]);

  const folders = useMemo(() => {
    if (isQuery) return [];
    const boxFolders = buyBoxes.map((b) => ({
      id: `box-${b.id}`,
      label: b.label || b.name || 'Buy box',
      deals: deals.filter((d) => String(d.buy_box_id) === String(b.id)),
    }));
    const saved = deals.filter((d) => d.saved);
    return [
      ...boxFolders,
      { id: 'saved', label: 'Saved deals', deals: saved },
    ].filter((f) => f.deals.length > 0);
  }, [isQuery, buyBoxes, deals]);

  // Flattened keyboard-navigable items. In query mode: deals then addresses.
  // In empty mode: recently reviewed deals (folders are mouse-expandable).
  const items = useMemo(() => {
    if (isQuery) {
      const dealItems = dealMatches.map((d) => ({ kind: 'deal', id: `deal-${d.id}`, data: d }));
      const addrItems = (addressMatches || []).map((a) => ({ kind: 'address', id: `addr-${a.id}`, data: a }));
      return [...dealItems, ...addrItems];
    }
    return recentDeals.map((d) => ({ kind: 'deal', id: `recent-${d.id}`, data: d }));
  }, [isQuery, dealMatches, addressMatches, recentDeals]);

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
    setExpandedFolder(null);
    inputRef.current?.blur();
  }, []);

  const selectDeal = useCallback((id) => { onSearchDeal?.(id); reset(); }, [onSearchDeal, reset]);

  const select = useCallback((item) => {
    if (!item) return;
    if (item.kind === 'deal') onSearchDeal?.(item.data.id);
    else if (item.kind === 'address') onSearchCoords?.(item.data.lat, item.data.lng, item.data.label);
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

  const dealRow = (d, idForDom, idx) => (
    <button
      key={idForDom}
      id={idForDom}
      role="option"
      aria-selected={idx >= 0 && activeIndex === idx}
      className={`hdr-search-row${idx >= 0 && activeIndex === idx ? ' active' : ''}`}
      onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
      onClick={() => selectDeal(d.id)}
    >
      <span className="hdr-search-row-ico"><I.Building size={15} /></span>
      <span className="hdr-search-row-text">
        <span className="hdr-search-row-title">{dealAddr(d)}</span>
        <span className="hdr-search-row-sub">{[dealCity(d), d.owner || d.owner_name].filter(Boolean).join(' · ')}</span>
      </span>
    </button>
  );

  const showPanel = open;

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
          {isQuery ? (
            <>
              {dealMatches.length > 0 && (
                <div className="hdr-search-section">
                  <div className="hdr-search-section-label">Your deals</div>
                  {dealMatches.map((d) => {
                    const idx = items.findIndex((it) => it.kind === 'deal' && it.data.id === d.id);
                    return dealRow(d, `deal-${d.id}`, idx);
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
              {!dealMatches.length && !(addressMatches?.length) && !geoLoading && (
                <div className="hdr-search-empty">
                  No deals match. {trimmed.length < 3 ? 'Type more to search addresses.' : 'No address matches either.'}
                </div>
              )}
            </>
          ) : (
            <>
              {recentDeals.length > 0 && (
                <div className="hdr-search-section">
                  <div className="hdr-search-section-label">Recently reviewed</div>
                  {recentDeals.map((d) => {
                    const idx = items.findIndex((it) => it.data.id === d.id);
                    return dealRow(d, `recent-${d.id}`, idx);
                  })}
                </div>
              )}

              {folders.length > 0 && (
                <div className="hdr-search-section">
                  <div className="hdr-search-section-label">Folders</div>
                  {folders.map((f) => {
                    const isExpanded = expandedFolder === f.id;
                    return (
                      <div key={f.id} className="hdr-search-folder">
                        <button
                          type="button"
                          className="hdr-search-row hdr-search-folder-head"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedFolder(isExpanded ? null : f.id)}
                        >
                          <span className="hdr-search-row-ico">{f.id === 'saved' ? <I.Layers size={15} /> : <I.Boxes size={15} />}</span>
                          <span className="hdr-search-row-text">
                            <span className="hdr-search-row-title">{f.label}</span>
                          </span>
                          <span className="hdr-search-folder-count">{f.deals.length}</span>
                          <span className={`hdr-search-folder-chevron${isExpanded ? ' open' : ''}`}><I.ChevronDown size={13} /></span>
                        </button>
                        {isExpanded && (
                          <div className="hdr-search-folder-deals">
                            {f.deals.slice(0, 8).map((d) => (
                              <button
                                key={`${f.id}-${d.id}`}
                                type="button"
                                className="hdr-search-row hdr-search-folder-deal"
                                onClick={() => selectDeal(d.id)}
                              >
                                <span className="hdr-search-row-ico"><I.Building size={14} /></span>
                                <span className="hdr-search-row-text">
                                  <span className="hdr-search-row-title">{dealAddr(d)}</span>
                                  <span className="hdr-search-row-sub">{dealCity(d)}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {recentDeals.length === 0 && folders.length === 0 && (
                <div className="hdr-search-empty">Search your deals or any address.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
