import { useEffect, useRef, useState } from 'react';
import { Expand, Maximize2 } from 'lucide-react';
import { AerialThumb } from '../AerialThumb.jsx';
import { fmt, fmtMoney, hasVal } from '../../lib/format.js';
import { loadGoogleMapsSdk } from '../../lib/googleMapsLoader.js';
import { SignalSeverityTable } from './SignalSeverityTable.jsx';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boldNarrative(text, geoTokens) {
  if (!text || typeof text !== 'string') return null;
  const patterns = [
    /\$[\d,]+(?:\.\d+)?\s*[KMB]?/g,
    /\b[\d,]+(?:\.\d+)?\s*(?:sf|sq\s*ft|acres?|ac)\b/gi,
    /\b(?:19|20)\d{2}\b/g,
  ];
  const geoSet = (geoTokens || [])
    .filter((t) => typeof t === 'string' && t.trim().length > 1)
    .map((t) => new RegExp(`\\b${escapeRegex(t.trim())}\\b`, 'gi'));
  const matches = [];
  [...patterns, ...geoSet].forEach((re) => {
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  });
  matches.sort((a, b) => a.start - b.start);
  const deduped = [];
  for (const m of matches) {
    const last = deduped[deduped.length - 1];
    if (!last || m.start >= last.end) deduped.push(m);
  }
  if (!deduped.length) return text;
  const out = [];
  let cursor = 0;
  deduped.forEach((m, i) => {
    if (cursor < m.start) out.push(text.slice(cursor, m.start));
    out.push(<strong key={`b-${i}`}>{m.text}</strong>);
    cursor = m.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

function holdYears(lastSaleDate, fallback) {
  if (fallback != null && fallback !== '') return Number(fallback);
  if (!lastSaleDate) return null;
  const d = new Date(lastSaleDate);
  if (isNaN(d.getTime())) return null;
  const years = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(years);
}

function FactRow({ label, value, primary }) {
  if (!hasVal(value) || value === '—') return null;
  return (
    <div className={`dd-brief-fact${primary ? ' primary' : ''}`}>
      <span className="dd-brief-fact-label">{label}</span>
      <span className="dd-brief-fact-value">{value}</span>
    </div>
  );
}

function BriefFactCard({ deal, bj }) {
  const assessed = deal.assessed_value ?? bj.assessed_value;
  const buildingSf = deal.building_sf;
  const lotAcres = bj.lot_ac ?? deal.acres ?? (deal.lot_sf ? (Number(deal.lot_sf) / 43560).toFixed(2) : null);
  const units = deal.units;
  const yearBuilt = deal.year_built;
  const hold = holdYears(deal.last_sale_date, bj.hold_years);
  const ownerType = bj.entity_type ?? deal.owner_type;
  const ownerName = deal.owner_name ?? bj.owner_name;
  const assetClass = (deal.asset_class || deal.use_type || '').toString();
  const assetClassLabel = assetClass.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <aside className="dd-brief-fact-card" aria-label="Property facts">
      {assetClass && (
        <span className="dd-brief-asset-chip" title={assetClass}>{assetClassLabel}</span>
      )}
      <div className="dd-brief-fact-stack">
        <FactRow primary label="Assessed Value" value={hasVal(assessed) ? fmtMoney(assessed) : null} />
        {hasVal(buildingSf) && (
          <FactRow label="Building" value={`${Number(buildingSf).toLocaleString()} sf`} />
        )}
        {hasVal(lotAcres) && (
          <FactRow label="Lot" value={`${Number(lotAcres).toLocaleString(undefined, { maximumFractionDigits: 2 })} ac`} />
        )}
        {hasVal(units) && Number(units) > 0 && (
          <FactRow label="Units" value={Number(units).toLocaleString()} />
        )}
        <FactRow label="Year Built" value={hasVal(yearBuilt) ? fmt(yearBuilt) : null} />
        <FactRow label="Hold Period" value={hold ? `${hold} yrs` : null} />
      </div>
      {(ownerType || ownerName) && (
        <div className="dd-brief-owner-row">
          <span className="dd-brief-fact-label">Owner</span>
          <div className="dd-brief-owner-stack">
            {ownerName && <span className="dd-brief-owner-name">{ownerName}</span>}
            {ownerType && (
              <span className={`dd-brief-owner-type ${/(llc|trust|corp|inc|lp|partner)/i.test(ownerType) ? 'institutional' : 'individual'}`}>
                {ownerType.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function BriefNarrative({ bj, deal }) {
  const narrative = bj.narrative || bj.summary || '';
  const headline = bj.headline;
  const nextAction = bj.next_action;
  const geoTokens = [deal.city, deal.county, deal.state, deal.msa, deal.submarket].filter(Boolean);
  const bolded = boldNarrative(narrative, geoTokens);

  return (
    <div className="dd-brief-narrative">
      <span className="dd-brief-eyebrow">AI Property Brief</span>
      {headline && <h3 className="dd-brief-headline">{headline}</h3>}
      {bolded ? (
        <p className="dd-brief-prose">{bolded}</p>
      ) : (
        <p className="dd-brief-prose dd-brief-prose--empty">No summary narrative available for this property.</p>
      )}
      {nextAction && (
        <div className="dd-brief-next-action">
          <span className="dd-brief-next-action-label">Recommended Action</span>
          <span className="dd-brief-next-action-text">{nextAction}</span>
        </div>
      )}
    </div>
  );
}

function initialStreetViewStatus(lat, lng) {
  if (!lat || !lng) return 'no_coords';
  if (!GOOGLE_MAPS_KEY) return 'no_key';
  return 'checking';
}

// Interactive panorama embedded in a fixed-size tile.
// Drag = pan, scroll = zoom, double-click = lift the current view into a
// full-screen overlay panorama. Lazy-loads the Maps JS SDK on first mount.
function InteractiveStreetView({ lat, lng, onExpand }) {
  const containerRef = useRef(null);
  const panoramaRef = useRef(null);
  const [status, setStatus] = useState(() => initialStreetViewStatus(lat, lng));

  useEffect(() => {
    if (!lat || !lng || !GOOGLE_MAPS_KEY) return undefined;
    let cancelled = false;
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setStatus(data.status === 'OK' ? 'available' : 'unavailable');
      })
      .catch(() => { if (!cancelled) setStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  useEffect(() => {
    if (status !== 'available' || !containerRef.current) return undefined;
    let cancelled = false;
    setStatus('loading_sdk');
    loadGoogleMapsSdk(GOOGLE_MAPS_KEY)
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        panoramaRef.current = new google.maps.StreetViewPanorama(containerRef.current, {
          position: { lat: Number(lat), lng: Number(lng) },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: false,
          motionTrackingControl: false,
          showRoadLabels: false,
          linksControl: true,
          panControl: false,
          zoomControl: true,
          enableCloseButton: false,
        });
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('sdk_error'); });
    return () => {
      cancelled = true;
      panoramaRef.current = null;
    };
  }, [status, lat, lng]);

  function handleDoubleClick(e) {
    e.preventDefault();
    if (status !== 'ready' || !panoramaRef.current || !onExpand) return;
    const pov = panoramaRef.current.getPov?.() || { heading: 0, pitch: 0, zoom: 1 };
    const pos = panoramaRef.current.getPosition?.();
    onExpand({
      lat: pos?.lat() ?? Number(lat),
      lng: pos?.lng() ?? Number(lng),
      heading: pov.heading ?? 0,
      pitch: pov.pitch ?? 0,
      zoom: panoramaRef.current.getZoom?.() ?? 1,
    });
  }

  if (status === 'no_key' || status === 'no_coords' || status === 'unavailable' || status === 'sdk_error') {
    const msg =
      status === 'no_key' ? 'Street view requires API key' :
      status === 'no_coords' ? 'No coordinates available' :
      status === 'sdk_error' ? 'Street view failed to load' :
      'Street view not available for this address';
    return <div className="dd-brief-streetview-empty"><span>{msg}</span></div>;
  }

  return (
    <div className="dd-brief-streetview-live" onDoubleClick={handleDoubleClick}>
      <div ref={containerRef} className="dd-brief-streetview-container" />
      {(status === 'checking' || status === 'loading_sdk' || status === 'available') && (
        <div className="dd-brief-streetview-overlay-loading">
          <span>{status === 'checking' ? 'Checking coverage…' : 'Loading street view…'}</span>
        </div>
      )}
      {status === 'ready' && (
        <span className="dd-brief-streetview-hint" aria-hidden="true">Double-click to expand</span>
      )}
    </div>
  );
}

// Image expand modal — used for the satellite tile only.
function ImageExpandModal({ url, onClose, alt }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="dd-brief-img-modal" onClick={onClose} role="dialog" aria-modal="true">
      <button className="dd-brief-img-modal-close" onClick={onClose} aria-label="Close">&times;</button>
      <img src={url} alt={alt} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// Floating fullscreen panorama overlay opened by double-click on the embedded view.
function StreetViewExpandModal({ pov, onClose }) {
  const containerRef = useRef(null);
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (!containerRef.current || !GOOGLE_MAPS_KEY) return undefined;
    let cancelled = false;
    loadGoogleMapsSdk(GOOGLE_MAPS_KEY).then((google) => {
      if (cancelled || !containerRef.current) return;
      new google.maps.StreetViewPanorama(containerRef.current, {
        position: { lat: pov.lat, lng: pov.lng },
        pov: { heading: pov.heading, pitch: pov.pitch },
        zoom: pov.zoom ?? 1,
        addressControl: true,
        fullscreenControl: false,
        motionTrackingControl: true,
        showRoadLabels: true,
        zoomControl: true,
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pov]);

  return (
    <div className="dd-streetview-modal" onClick={onClose} role="dialog" aria-modal="true">
      <button className="dd-streetview-modal-close" onClick={onClose} aria-label="Close street view">&times;</button>
      <div
        className="dd-streetview-modal-stage"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div ref={containerRef} className="dd-streetview-modal-container" />
      </div>
    </div>
  );
}

function BriefImagesStack({ deal }) {
  const [satExpanded, setSatExpanded] = useState(null);
  const [streetExpanded, setStreetExpanded] = useState(null);
  const { lat, lng, id } = deal;
  const satelliteUrl = lat && lng
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},17/1200x960@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&logo=false&attribution=false`
    : null;

  return (
    <div className="dd-brief-images">
      <button
        className="dd-brief-image-tile"
        onClick={() => satelliteUrl && setSatExpanded({ url: satelliteUrl, alt: 'Satellite aerial' })}
        disabled={!satelliteUrl}
        aria-label="Expand satellite view"
        type="button"
      >
        <AerialThumb id={id} lat={lat} lng={lng} large={true} showParcel={false} />
        <span className="dd-brief-image-label">Satellite</span>
        {satelliteUrl && <span className="dd-brief-image-expand"><Expand size={14} /></span>}
      </button>
      <div className="dd-brief-image-tile dd-brief-image-tile--live" aria-label="Interactive street view">
        <InteractiveStreetView lat={lat} lng={lng} onExpand={(pov) => setStreetExpanded(pov)} />
        <span className="dd-brief-image-label">Street View</span>
        {GOOGLE_MAPS_KEY && lat && lng && (
          <button
            type="button"
            className="dd-brief-image-expand dd-brief-image-expand--btn"
            onClick={() => {
              const initial = { lat: Number(lat), lng: Number(lng), heading: 0, pitch: 0, zoom: 1 };
              setStreetExpanded(initial);
            }}
            aria-label="Expand street view"
          >
            <Maximize2 size={14} />
          </button>
        )}
      </div>
      {satExpanded && <ImageExpandModal url={satExpanded.url} alt={satExpanded.alt} onClose={() => setSatExpanded(null)} />}
      {streetExpanded && <StreetViewExpandModal pov={streetExpanded} onClose={() => setStreetExpanded(null)} />}
    </div>
  );
}

export function BriefBlock({ deal, signals }) {
  const bj = deal.briefJson || deal.brief_json || {};
  return (
    <section id="dd-brief" className="dd-brief-block">
      {signals && signals.length > 0 && (
        <SignalSeverityTable signals={signals} absenteeOwner={deal.absentee_owner} />
      )}
      <div className="dd-brief-grid">
        <BriefFactCard deal={deal} bj={bj} />
        <BriefNarrative bj={bj} deal={deal} />
        <BriefImagesStack deal={deal} />
      </div>
    </section>
  );
}
