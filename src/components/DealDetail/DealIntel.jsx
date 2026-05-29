import { useState, useRef } from 'react';
import { Database, AlertTriangle, AlertCircle, TrendingUp, Layers, MapPin, Zap, BarChart2, Search, X as XIcon } from 'lucide-react';
import { fmt } from '../../lib/format';

const TABS = [
  { id: 'physical', label: 'Physical', Icon: Layers },
  { id: 'tax', label: 'Tax', Icon: Database },
  { id: 'mortgage', label: 'Mortgage', Icon: TrendingUp },
  { id: 'geospatial', label: 'Geospatial', Icon: MapPin },
  { id: 'utilities', label: 'Utilities', Icon: Zap },
  { id: 'market', label: 'Market', Icon: BarChart2 }
];

// Build intel structure from the live deal object.
// Field names match what /api/dealfeed/deals actually returns (audited 2026-05-24):
// - top-level fields on the normalized deal
// - briefJson sub-object (snake_case keys inside the JSON blob)
// eslint-disable-next-line react-refresh/only-export-components
export function buildIntelFromDeal(deal) {
  const intel = {
    physical: [],
    tax: [],
    mortgage: [],
    geospatial: [],
    utilities: [],
    market: []
  };
  if (!deal) return intel;

  const bj = deal.briefJson || deal.brief_json || {};

  // Reads a value with a chain of candidate keys. Tries top-level deal
  // fields first (already normalized), then briefJson.
  const get = (...keys) => {
    for (const k of keys) {
      if (deal[k] != null && deal[k] !== '' && deal[k] !== 'null') return deal[k];
    }
    for (const k of keys) {
      if (bj[k] != null && bj[k] !== '' && bj[k] !== 'null') return bj[k];
    }
    return null;
  };

  const fmtSF = (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? v.toLocaleString() + ' SF' : fmt(n);
  };
  const fmtAcres = (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? v.toFixed(2) + ' ac' : fmt(n);
  };
  const yesNo = (v) => {
    if (v === null || v === undefined || v === '') return null;
    if (v === false || v === 'false' || v === 0 || v === 'N') return 'No';
    if (v === true || v === 'true' || v === 1 || v === 'Y') return 'Yes';
    return null;
  };

  const push = (tab, group, rows) => {
    const filtered = rows.filter(([, val]) => val != null && val !== '' && val !== '—');
    if (filtered.length) intel[tab].push({ group, rows: filtered });
  };

  // ─── PHYSICAL ────────────────────────────────────────────────────
  const yearBuilt = get('yearBuilt', 'year_built');
  const sf = get('sf', 'building_sf', 'area_building');
  const stories = get('stories', 'stories_count');
  const units = get('units', 'units_count');

  push('physical', 'Building', [
    ['Year Built', yearBuilt],
    ['Building SF', sf != null ? fmtSF(sf) : null],
    ['Stories', stories],
    ['Units', units],
    ['Asset Class', fmt(get('asset', 'asset_class'))],
    ['Use Type', fmt(get('use_type', 'property_use_standardized'))],
  ]);

  const acres = get('acres', 'lot_size_acres', 'gisAcres');
  push('physical', 'Parcel', [
    ['County', fmt(get('county', 'county_name'))],
    ['Acres', acres != null ? fmtAcres(acres) : null],
    ['Zoning', fmt(get('zoning'))],
    ['APN / Parcel', fmt(get('apn', 'parcel_id', 'parcel_number_formatted'))],
    ['FIPS', fmt(get('fips', 'fips_code'))],
    ['Census Tract', fmt(get('censusTract', 'census_tract'))],
  ]);

  push('physical', 'Owner', [
    ['Owner Name', fmt(get('owner_name', 'own_name'))],
    ['Entity Type', fmt(get('entityType', 'entity_type', 'owner_type', 'own_entity_type'))],
    ['Absentee', deal.absentee != null || bj.own_absentee != null ? yesNo(get('absentee', 'own_absentee', 'is_absentee_owner')) : null],
    ['Mailing Address', fmt(get('mailing', 'own_mail_address', 'owner_mailing'))],
  ]);

  // ─── TAX ─────────────────────────────────────────────────────────
  const assessed = get('assessed_value', 'tax_assessed_value_total');
  push('physical', 'Scoring & Distress', [
    ['Match Score', get('match_score') != null ? Math.round(Number(get('match_score')) * 100) + '%' : null],
    ['Distress Score', get('distress_score')],
    ['Distress Tier', fmt(get('distress_tier'))],
    ['Assessed Value', assessed != null ? '$' + Number(assessed).toLocaleString() : null],
  ]);

  // ─── GEOSPATIAL ──────────────────────────────────────────────────
  const lat = get('lat', 'latitude');
  const lng = get('lng', 'longitude');
  push('geospatial', 'Location', [
    ['City', fmt(get('city'))],
    ['State', fmt(get('state'))],
    ['Zip', fmt(get('zip'))],
    ['County', fmt(get('county'))],
    ['MSA', fmt(get('msa'))],
    ['Submarket', fmt(get('submarket'))],
    ['Lat / Lng', (lat && lng) ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : null],
  ]);
  push('geospatial', 'Jurisdiction', [
    ['City Jurisdiction', fmt(get('city_jurisdiction'))],
    ['In ETJ', deal.in_etj != null ? yesNo(deal.in_etj) : null],
    ['ETJ City', fmt(get('etj_city'))],
    ['School District', fmt(get('school_district'))],
  ]);

  // ─── MARKET (signals) ────────────────────────────────────────────
  const signals = Array.isArray(deal.signals) ? deal.signals : [];
  if (signals.length) {
    push('market', 'Signals', signals.map((s, i) => [
      String(s?.label || s?.tag || `Signal ${i + 1}`),
      fmt(s?.description || s?.category || '—'),
    ]));
  }
  push('market', 'Pipeline Status', [
    ['Status', fmt(get('status'))],
    ['Deal State', fmt(get('deal_state'))],
    ['Days in Pipeline', get('days')],
    ['Sent', deal.sentAt ? new Date(deal.sentAt).toLocaleDateString() : null],
  ]);

  return intel;
}

function getTier(label, value) {
  const v = String(value);
  if (v.includes('BALLOON') || v.includes('Unpaid') || v.includes('⚠') || v.includes('Delinquent') || v.includes('Pre-Fore')) return 'urgent';
  if (v.includes('Below') || v.includes('Balloon') || v.includes('2026') || label.includes('Tax Lien')) return 'pressure';
  return '';
}

function AlertIcon({ tier }) {
  if (tier === 'urgent') return <AlertTriangle size={12} color="var(--destructive)" strokeWidth={2} style={{ flexShrink: 0 }} />;
  if (tier === 'pressure') return <AlertCircle size={12} color="var(--warning)" strokeWidth={2} style={{ flexShrink: 0 }} />;
  return null;
}

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  const s = String(text);
  return (
    <>
      {s.slice(0, idx)}
      <mark style={{ background: 'var(--accent-tint)', color: 'var(--accent)', fontWeight: 700, padding: '0 2px', borderRadius: 2, fontStyle: 'normal' }}>
        {s.slice(idx, idx + query.length)}
      </mark>
      {s.slice(idx + query.length)}
    </>
  );
}

function SearchRow({ item, query }) {
  const [hov, setHov] = useState(false);
  const tier = getTier(item.label, item.value);
  const vColor = tier === 'urgent' ? 'var(--destructive)' : tier === 'pressure' ? 'var(--warning)' : 'var(--fg)';
  return (
    <div
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 7,
        padding: '6px 8px',
        borderRadius: 5,
        background: hov ? 'var(--secondary)' : 'transparent',
        transition: 'background-color 0.12s',
        cursor: 'default'
      }}>
      {tier && <AlertIcon tier={tier} />}
      <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 10, color: 'var(--fg-dim)', flexShrink: 0, whiteSpace: 'nowrap' }}>{item.group}</span>
      <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 10, color: 'var(--border-strong)', flexShrink: 0 }}>›</span>
      <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, color: 'var(--muted-foreground)', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <Highlight text={item.label} query={query} />
      </span>
      <span style={{ flex: 1, height: 0, borderBottom: '1px dotted var(--border-strong)', marginBottom: 3, minWidth: 14, opacity: 0.3 }} />
      <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 14, fontWeight: 600, color: vColor, flexShrink: 0, textAlign: 'right', fontFeatureSettings: "'tnum','zero'", whiteSpace: 'nowrap' }}>
        <Highlight text={String(item.value)} query={query} />
      </span>
    </div>
  );
}

function SearchResults({ query, intel }) {
  const allResults = [];
  TABS.forEach((t) => {
    (intel[t.id] || []).forEach((g) => {
      g.rows.forEach(([label, value]) => {
        const q = query.toLowerCase();
        if (label.toLowerCase().includes(q) || String(value).toLowerCase().includes(q)) {
          allResults.push({ tabId: t.id, tabLabel: t.label, group: g.group, label, value });
        }
      });
    });
  });

  if (!allResults.length)
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <Search size={24} color="var(--border-strong)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--muted-foreground)' }}>No results for "<strong>{query}</strong>"</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-dim)', marginTop: 6 }}>Try a different term — field name, value, or keyword</div>
      </div>
    );

  const grouped = {};
  allResults.forEach((r) => {
    if (!grouped[r.tabId]) grouped[r.tabId] = { label: r.tabLabel, Icon: TABS.find((t) => t.id === r.tabId)?.Icon, items: [] };
    grouped[r.tabId].items.push(r);
  });

  return (
    <div style={{ padding: '12px 16px 20px' }}>
      <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 14, fontFeatureSettings: "'tnum','zero'", display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFeatureSettings: "'tnum','zero'" }}>{allResults.length}</span>
        result{allResults.length !== 1 ? 's' : ''} across
        <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFeatureSettings: "'tnum','zero'" }}>{Object.keys(grouped).length}</span>
        tab{Object.keys(grouped).length !== 1 ? 's' : ''}
      </div>

      {Object.entries(grouped).map(([tabId, { label: tabLabel, Icon, items }]) => (
        <div key={tabId} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--border-faint)' }}>
            {Icon && <Icon size={12} color="var(--muted-foreground)" strokeWidth={2} />}
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tabLabel}</span>
            <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 10, color: 'var(--muted-foreground)', background: 'var(--secondary)', borderRadius: 4, padding: '1px 6px', fontFeatureSettings: "'tnum','zero'" }}>
              {items.length}
            </span>
          </div>
          {items.map((item, i) => (
            <SearchRow key={i} item={item} query={query} />
          ))}
        </div>
      ))}
    </div>
  );
}

function IntelRow({ label, value }) {
  const [hov, setHov] = useState(false);
  const tier = getTier(label, value);
  const isAlert = tier === 'urgent' || tier === 'pressure';
  const vColor = tier === 'urgent' ? 'var(--destructive)' : tier === 'pressure' ? 'var(--warning)' : 'var(--fg)';

  return (
    <div
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        padding: '6px 8px',
        borderBottom: '1px solid var(--border-faint)',
        alignItems: 'start',
        position: 'relative',
        borderRadius: 4,
        background: hov
          ? isAlert
            ? tier === 'urgent'
              ? 'rgba(239,68,68,0.08)'
              : 'rgba(244,183,62,0.08)'
            : 'var(--secondary)'
          : isAlert
          ? tier === 'urgent'
            ? 'rgba(239,68,68,0.03)'
            : 'rgba(244,183,62,0.03)'
          : 'transparent',
        transition: 'background-color 0.12s cubic-bezier(.22,1,.36,1)',
        cursor: 'default'
      }}
      className={tier ? `tier-${tier}` : ''}>
      <span
        style={{
          fontFamily: 'var(--font-secondary)',
          fontSize: 12,
          fontWeight: 400,
          color: 'var(--fg)',
          opacity: 0.72,
          lineHeight: 1.4,
          fontFeatureSettings: "'tnum','zero'",
          letterSpacing: '0.01em',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 5
        }}>
        {isAlert && <AlertIcon tier={tier} />}
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-secondary)',
          fontSize: 12,
          fontWeight: hov ? 700 : 600,
          color: vColor === 'var(--fg)' ? 'var(--fg)' : vColor,
          opacity: vColor === 'var(--fg)' ? 0.92 : 1,
          wordBreak: 'break-word',
          lineHeight: 1.4,
          fontFeatureSettings: "'tnum','zero'",
          transition: 'font-weight 0.1s, color 0.12s, opacity 0.12s'
        }}>
        {value}
      </span>
    </div>
  );
}

function IntelGroup({ group }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--muted-foreground)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 4,
          paddingBottom: 5,
          paddingLeft: 8,
          borderBottom: '1px solid var(--border)'
        }}>
        {group.group}
      </div>
      {group.rows.map(([l, v]) => (
        <IntelRow key={l} label={l} value={v} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
      <div style={{ marginBottom: 8, opacity: 0.6 }}>
        <Database size={28} />
      </div>
      <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>Awaiting enrichment data</div>
      <div>This tab will populate once the property's records flow through the nightly pipeline.</div>
    </div>
  );
}

export function DealIntel({ deal }) {
  const [tab, setTab] = useState('physical');
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const intel = buildIntelFromDeal(deal);
  const groups = intel[tab] || [];
  const isSearching = query.trim().length > 0;

  const totalPoints = Object.values(intel).reduce((acc, gs) => acc + gs.reduce((a, g) => a + g.rows.length, 0), 0);
  const tabHasData = groups.length > 0 && groups.some((g) => g.rows.length > 0);

  return (
    <section style={{ margin: '0 24px', marginTop: 14 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, boxShadow: 'var(--card-shadow)' }}>
        {/* Header row: title + data point count + search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap'
          }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em', flexShrink: 0 }}>Property Intelligence</span>
          <span
            style={{
              fontFamily: 'var(--font-secondary)',
              fontSize: 10,
              color: 'var(--accent)',
              background: 'var(--accent-tint)',
              border: '1px solid var(--accent-tint)',
              borderRadius: 5,
              padding: '2px 7px',
              fontFeatureSettings: "'tnum','zero'",
              flexShrink: 0
            }}>
            {totalPoints} data points
          </span>

          {/* Search input — right side of header */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--secondary)',
                border: `1px solid ${isSearching ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 7,
                padding: '5px 10px',
                width: 220,
                transition: 'border-color 0.15s',
                boxShadow: isSearching ? `0 0 0 2px var(--accent-tint)` : 'none'
              }}>
              <Search size={13} color={isSearching ? 'var(--accent)' : 'var(--muted-foreground)'} strokeWidth={2} style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all fields…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg)', padding: 0 }}
              />

              {isSearching && (
                <button
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 0 }}>
                  <XIcon size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search mode: results from all tabs */}
        {isSearching ? (
          <SearchResults query={query.trim()} intel={intel} />
        ) : (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
              {TABS.map((t) => {
                const Icon = t.Icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'var(--font-ui)',
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      padding: '10px 14px',
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? 'var(--btn-rest-hover)' : 'transparent',
                      color: active ? 'var(--fg)' : 'var(--muted-foreground)',
                      borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                      marginBottom: -1,
                      transition: 'background-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast)',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--btn-rest)';
                        e.currentTarget.style.color = 'var(--fg)';
                        e.currentTarget.style.borderBottomColor = 'var(--accent)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--muted-foreground)';
                        e.currentTarget.style.borderBottomColor = 'transparent';
                      }
                    }}>
                    <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab highlight summary — only if tab has data */}
            {tabHasData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--secondary)' }}>
                {/* Placeholder KPI cells — could be enhanced with real data */}
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ padding: '10px 16px', borderLeft: i > 0 ? '1px solid var(--border-faint)' : 'none' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>&nbsp;</div>
                    <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 16, fontWeight: 700, color: 'var(--fg)', fontFeatureSettings: "'tnum','zero'", letterSpacing: '-0.01em' }}>&nbsp;</div>
                  </div>
                ))}
              </div>
            )}

            {/* Data grid or empty state */}
            {tabHasData ? (
              <div style={{ padding: '14px 12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
                {groups.map((g, i) => (
                  <IntelGroup key={i} group={g} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </>
        )}
      </div>
    </section>
  );
}
