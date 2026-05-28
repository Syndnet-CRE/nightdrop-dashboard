import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { useDeals } from '../../contexts/DealsContext';
import { fmt, fmtMoney } from '../../lib/format';

const SEV_COLOR = { danger: 'var(--destructive)', warn: 'var(--warning)', info: 'var(--info-color)' };
const SEV_BG = { danger: 'var(--danger-tint)', warn: 'var(--warn-tint)', info: 'var(--info-tint)' };
const SEV_BD = { danger: 'rgba(239,68,68,0.35)', warn: 'rgba(244,183,62,0.40)', info: 'rgba(62,123,250,0.30)' };

function SevIcon({ sev }) {
  const sz = 14;
  if (sev === 'danger') return <AlertTriangle size={sz} color={SEV_COLOR.danger} strokeWidth={2} />;
  if (sev === 'warn') return <AlertCircle size={sz} color={SEV_COLOR.warn} strokeWidth={2} />;
  return <Info size={sz} color={SEV_COLOR.info} strokeWidth={2} />;
}

function SatelliteMapBox({ latitude, longitude }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || !latitude || !longitude) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [longitude, latitude],
      zoom: 17,
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      attributionControl: false,
      // Interactive map: scroll-zoom, drag-pan, and double-click-zoom enabled
      // when cursor is over the canvas. Cooperative gestures off so a single
      // wheel scroll zooms (no Ctrl needed) — matches the V1 Leaflet behavior.
      interactive: true,
      scrollZoom: true,
      dragPan: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
      doubleClickZoom: true,
      keyboard: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), 'bottom-right');

    const marker = document.createElement('div');
    marker.style.width = '26px';
    marker.style.height = '26px';
    marker.style.borderRadius = '50%';
    marker.style.backgroundColor = 'var(--accent)';
    marker.style.opacity = '0.55';
    marker.style.border = '2.5px solid #2da200';
    marker.style.boxSizing = 'border-box';

    new mapboxgl.Marker({ element: marker }).setLngLat([longitude, latitude]).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude]);

  return <div ref={mapContainer} style={{ width: '100%', height: 480 }} />;
}

export function DealHero({ deal }) {
  const { portfolios, fetchOwnerPortfolio } = useDeals();
  const [imgTab, setImgTab] = useState('map');
  const [hovKpi, setHovKpi] = useState(null);

  useEffect(() => {
    if (deal?.attomId && !portfolios[String(deal.attomId)]) {
      fetchOwnerPortfolio(deal.attomId);
    }
  }, [deal?.attomId, portfolios, fetchOwnerPortfolio]);

  if (!deal) return null;

  const gmaps = `https://maps.google.com/?q=${encodeURIComponent(
    `${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}`
  )}`;

  const confidence = Math.round((deal.score || 0) * 10) || Math.round((deal.match_score || 0) * 100) || 0;

  const signals = (deal.signals || []).map((sig) => {
    const tag = sig.tag || '';
    let sev = 'info';
    if (tag.startsWith('distress:')) sev = 'danger';
    else if (tag.startsWith('risk:')) sev = 'warn';

    return {
      sev,
      label: sig.label || tag,
      detail: sig.description || '',
    };
  });

  const portfolio = portfolios[String(deal.attomId)];
  const portfolioStats = portfolio
    ? {
        props: portfolio.totals?.property_count || 0,
        hold: deal.owner_since ? Math.floor((new Date() - new Date(deal.owner_since)) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
        equity: portfolio.totals?.total_estimated_equity || 0,
      }
    : null;

  const kpis = [
    { label: 'Est. Value', value: fmtMoney(deal.value) },
    {
      label: '$/SF',
      value: deal.value && (deal.sf ?? deal.building_sf) ? `$${Math.round(deal.value / (deal.sf ?? deal.building_sf))}` : '—',
    },
  ];

  return (
    <section style={{ margin: '0 24px', marginTop: 12 }}>
      {/* ── Row 1 ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'stretch' }}>
        {/* Image / Map container */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
            overflow: 'hidden',
            position: 'relative',
            minHeight: 280,
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {/* Tab toggle */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(8px)',
              borderRadius: 6,
              padding: '2px 6px 2px 2px',
            }}
          >
            {[
              ['map', 'Satellite'],
              ['photo', 'Photo'],
            ].map(([k, l], i) => {
              const on = imgTab === k;
              return (
                <div key={k} style={{ display: 'contents' }}>
                  <button
                    onClick={() => setImgTab(k)}
                    aria-label={`Switch to ${l} view`}
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 11,
                      fontWeight: on ? 600 : 500,
                      padding: '4px 11px',
                      borderRadius: 4,
                      border: `1px solid ${on ? 'var(--accent)' : 'transparent'}`,
                      cursor: 'pointer',
                      background: on ? '#ffffff' : 'rgba(255,255,255,0.18)',
                      color: on ? '#0a0a0a' : 'rgba(255,255,255,0.85)',
                      transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseOver={(e) => {
                      if (!on) {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!on) {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                      }
                    }}
                  >
                    {l}
                  </button>
                  {i === 0 && (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 2,
                        height: 18,
                        background: 'rgba(255,255,255,0.5)',
                        margin: '0 6px',
                        flexShrink: 0,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Google Maps link */}
          <a
            href={gmaps}
            target="_blank"
            rel="noreferrer"
            aria-label="Open property in Google Maps"
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.88)',
              background: 'rgba(0,0,0,0.62)',
              backdropFilter: 'blur(6px)',
              borderRadius: 5,
              padding: '4px 11px',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              whiteSpace: 'nowrap',
            }}
          >
            <MapPin size={11} /> Google Maps
          </a>

          {/* Photo placeholder */}
          <div style={{ display: imgTab === 'photo' ? 'flex' : 'none', width: '100%', height: 480, alignItems: 'center', justifyContent: 'center', background: 'var(--secondary)' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--muted-foreground)' }}>Drag aerial photo here</div>
          </div>

          {/* Satellite map */}
          <div style={{ display: imgTab === 'map' ? 'block' : 'none', width: '100%', height: 480 }}>
            <SatelliteMapBox latitude={deal.lat} longitude={deal.lng} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Address + chips */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--card-shadow)' }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--fg)',
                letterSpacing: '-0.02em',
                marginBottom: 3,
                lineHeight: 1.15,
                fontFamily: '"DM Sans"',
              }}
            >
              {fmt(deal.address)}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-secondary)',
                fontSize: 11,
                color: 'var(--muted-foreground)',
                marginBottom: 10,
                fontFeatureSettings: "'tnum','zero'",
              }}
            >
              {fmt(deal.city)}, {fmt(deal.state)} {fmt(deal.zip)} · {fmt(deal.county)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {[
                fmt(deal.asset),
                `Built ${fmt(deal.yearBuilt ?? deal.year_built)}`,
                `${(deal.sf ?? deal.building_sf) ? (deal.sf ?? deal.building_sf).toLocaleString() : '—'} SF`,
                `${fmt(deal.acres)} ac`,
              ]
                .filter((s) => s !== '—')
                .map((s) => (
                  <span
                    key={s}
                    style={{
                      fontFamily: 'var(--font-secondary)',
                      fontSize: 9,
                      fontFeatureSettings: "'tnum','zero'",
                      color: 'var(--muted-foreground)',
                      background: 'var(--secondary)',
                      border: '1px solid var(--border-faint)',
                      borderRadius: 4,
                      padding: '2px 7px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {s}
                  </span>
                ))}
            </div>
          </div>

          {/* Deal confidence */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Deal Confidence</span>
              <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 24, fontWeight: 800, color: 'var(--accent)', fontFeatureSettings: "'tnum','zero'", letterSpacing: '-0.02em' }}>
                {confidence}
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)' }}>/100</span>
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--secondary)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${confidence}%`,
                  background: 'var(--accent)',
                  borderRadius: 2,
                  transition: 'width 0.7s cubic-bezier(.22,1,.36,1)',
                }}
              />
            </div>
          </div>

          {/* Distress signals */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '12px 16px', flex: 1, boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Distress Signals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {signals.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 9,
                    padding: '8px 10px',
                    borderRadius: 7,
                    background: SEV_BG[s.sev],
                    border: `1px solid ${SEV_BD[s.sev]}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: SEV_COLOR[s.sev], borderRadius: '7px 0 0 7px' }} />
                  <div style={{ paddingTop: 1, flexShrink: 0 }}>
                    <SevIcon sev={s.sev} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: SEV_COLOR[s.sev], lineHeight: 1.25, marginBottom: 2 }}>{fmt(s.label)}</div>
                    <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 10, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{fmt(s.detail)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Owner card */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Owner</span>
              <button
                aria-label="View owner profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: 'var(--muted-foreground)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                  transition: 'color var(--t-fast) var(--ease-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
              >
                Profile <ChevronRight size={12} />
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 2, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{fmt(deal.owner_name)}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 400, color: 'var(--muted-foreground)', marginBottom: 10 }}>
              {fmt(deal.entityType || deal.entity || deal.owner_type)} · {fmt(deal.state)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
              {[
                ['Props', portfolioStats ? String(portfolioStats.props) : '—'],
                ['Hold', portfolioStats ? `${portfolioStats.hold}yr` : '—'],
                ['Equity', portfolioStats ? `$${Math.round(portfolioStats.equity / 1e6)}M` : '—'],
              ].map(([l, v], i) => (
                <div key={l} style={{ borderRight: i < 2 ? '1px solid var(--border-faint)' : 'none', paddingRight: i < 2 ? 10 : 0, paddingLeft: i > 0 ? 10 : 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 16, fontWeight: 700, color: 'var(--fg)', fontFeatureSettings: "'tnum','zero'", letterSpacing: '-0.01em' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${kpis.length},1fr)`,
          marginTop: 10,
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {kpis.map((k, i) => (
          <div
            key={i}
            onMouseOver={() => setHovKpi(i)}
            onMouseOut={() => setHovKpi(null)}
            style={{
              padding: '12px 0 12px 16px',
              borderLeft: i > 0 ? '1px solid var(--border-faint)' : 'none',
              background: hovKpi === i ? 'var(--secondary)' : 'transparent',
              transition: 'background-color 0.12s cubic-bezier(.22,1,.36,1)',
              cursor: 'default',
            }}
          >
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 17, fontWeight: 700, color: 'var(--fg)', fontFeatureSettings: "'tnum','zero'", letterSpacing: '-0.01em' }}>{k.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
