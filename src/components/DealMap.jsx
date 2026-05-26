import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPinSVG, ScoreBubble } from './DealComponents';
import { fmtMoney, fmt, hasVal } from '../lib/format';
import { I } from './Icons';
import { CATEGORY_PAINT_EXPRESSION, categorize, colorFor } from '../lib/assetColors';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  standard: 'mapbox://styles/mapbox/streets-v12',
};

const DEFAULT_VIEW = { latitude: 30.25, longitude: -97.75, zoom: 4 };

function boundsFromDeals(deals) {
  const pts = deals.filter(d => d.lat && d.lng);
  if (pts.length === 0) return null;
  const lngs = pts.map(d => d.lng);
  const lats = pts.map(d => d.lat);
  return { pts, bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] };
}

function fitDeals(mapRef, deals, padding = 80) {
  const result = boundsFromDeals(deals);
  if (!mapRef.current || !result) return;
  const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
  if (!map.loaded()) return;
  if (result.pts.length === 1) {
    mapRef.current.flyTo({ center: [result.pts[0].lng, result.pts[0].lat], zoom: 13, duration: 0 });
    return;
  }
  mapRef.current.fitBounds(result.bounds, { padding, duration: 0 });
}

// Mapbox-native cluster source + 3 layers. Used when `enableClustering=true`
// on real `deals` data. Tiers recalibrated for production scale:
//   <10 green · 10-49 amber · 50+ red
// Cluster radius=50px (Mapbox default), maxZoom=14 (clusters dissolve past
// city zoom).
const CLUSTER_SOURCE_ID = 'auto-clusters';
const AUTO_CLUSTER_RADIUS = 50;
const AUTO_CLUSTER_MAX_ZOOM = 14;
const CLUSTER_LAYER     = { id: 'auto-clusters-layer',  type: 'circle', source: CLUSTER_SOURCE_ID, filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#5BCC48', 10, '#F4B73E', 50, '#E5484D'],
    'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#0D0D0D',
    'circle-opacity': 0.95,
  },
};
const CLUSTER_COUNT_LAYER = { id: 'auto-cluster-count', type: 'symbol', source: CLUSTER_SOURCE_ID, filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 13,
  },
  paint: { 'text-color': '#FFFFFF' },
};
const UNCLUSTERED_LAYER = { id: 'auto-unclustered',     type: 'circle', source: CLUSTER_SOURCE_ID, filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': CATEGORY_PAINT_EXPRESSION,
    'circle-radius': 6,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#0D0D0D',
  },
};

function toGeoJson(properties) {
  return {
    type: 'FeatureCollection',
    features: (properties || [])
      .filter(p => p.lat != null && p.lng != null)
      .map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, category: categorize(p) },
      })),
  };
}

export function DealMap({
  deals = [],
  selectedId = null,
  hoverId = null,
  onClickDeal,
  mapStyle = 'dark',
  withPopup = false,
  padding = 80,
  initialViewState = null,
  onViewStateChange = null,
  focusDealId = null,
  clusterData = null,
  // eslint-disable-next-line no-unused-vars
  demoMode = false,
  enableClustering = false,
}) {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState(initialViewState || DEFAULT_VIEW);
  const [popup, setPopup] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoverDealId, setHoverDealId] = useState(null);

  // Demo cluster bubbles (hardcoded CLUSTER_CITIES) take priority. When demo
  // is not active and enableClustering is on, the real `deals` get auto-clustered
  // via native Mapbox source. Otherwise, render per-deal Markers.
  const inDemoClusterMode = Array.isArray(clusterData) && clusterData.length > 0;
  const inAutoClusterMode = !inDemoClusterMode && enableClustering && Array.isArray(deals) && deals.length > 0;
  const autoClusterGeojson = useMemo(
    () => (inAutoClusterMode ? toGeoJson(deals) : null),
    [inAutoClusterMode, deals]
  );

  // Fit to whichever dataset covers the larger area. Scatter `deals` wins
  // when both are present (clusterData is tight metro points; deals can span
  // the whole region).
  const fitTarget = (deals && deals.length > 0) ? deals : clusterData;

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    if (initialViewState) return;
    if (fitTarget) fitDeals(mapRef, fitTarget, padding);
  }, [fitTarget, padding, initialViewState]);

  useEffect(() => {
    if (!mapLoaded || initialViewState) return;
    if (fitTarget) fitDeals(mapRef, fitTarget, padding);
  }, [fitTarget, padding, mapLoaded, initialViewState]);

  useEffect(() => {
    if (!mapLoaded || !focusDealId) return;
    const deal = deals.find(d => d.id === focusDealId);
    if (!deal?.lat || !deal?.lng) return;
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (!map) return;
    const currentZoom = map.getZoom();
    mapRef.current.flyTo({
      center: [deal.lng, deal.lat],
      zoom: currentZoom < 14 ? 14 : currentZoom,
      duration: 500,
    });
  }, [focusDealId, deals, mapLoaded]);

  const handleMove = useCallback((evt) => {
    setViewState(evt.viewState);
    onViewStateChange?.(evt.viewState);
  }, [onViewStateChange]);

  const handleMarkerClick = useCallback((e, deal) => {
    e.originalEvent?.stopPropagation();
    if (withPopup) {
      setPopup(deal);
    } else {
      onClickDeal?.(deal);
    }
  }, [withPopup, onClickDeal]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={handleMove}
      onLoad={handleMapLoad}
      mapStyle={STYLES[mapStyle] || STYLES.dark}
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: '100%', height: '100%' }}
      onClick={() => setPopup(null)}
    >
      <div className="map-zoom-ctrl">
        <button className="mt-btn" onClick={() => mapRef.current?.getMap().zoomIn()} title="Zoom in">
          <I.Plus size={16} />
        </button>
        <button className="mt-btn" onClick={() => mapRef.current?.getMap().zoomOut()} title="Zoom out">
          <I.Minus size={16} />
        </button>
      </div>

      {/* Demo cluster bubbles — DOM Markers so they layer ABOVE scatter pins
          via z-index. clusterData is a list of {city, lat, lng, count}. */}
      {inDemoClusterMode && clusterData.map((c) => {
        const tone = c.count >= 100 ? 'red' : c.count >= 25 ? 'amber' : 'green';
        const size = c.count >= 100 ? 50 : c.count >= 25 ? 40 : 32;
        return (
          <Marker key={`cluster-${c.city}`} latitude={c.lat} longitude={c.lng} anchor="center">
            <div className={`map-cluster-bubble tone-${tone}`} style={{ width: size, height: size }}>
              {c.count}
            </div>
          </Marker>
        );
      })}

      {/* Auto-cluster real deals via native Mapbox cluster source.
          Suppresses per-deal Markers when active (deals render via
          the unclustered layer below cluster-max-zoom). */}
      {inAutoClusterMode && (
        <Source
          id={CLUSTER_SOURCE_ID}
          type="geojson"
          data={autoClusterGeojson}
          cluster
          clusterMaxZoom={AUTO_CLUSTER_MAX_ZOOM}
          clusterRadius={AUTO_CLUSTER_RADIUS}
        >
          <Layer {...CLUSTER_LAYER} />
          <Layer {...CLUSTER_COUNT_LAYER} />
          <Layer {...UNCLUSTERED_LAYER} />
        </Source>
      )}

      {!inAutoClusterMode && deals.map((d) => {
        if (!d.lat || !d.lng) return null;
        const active = selectedId === d.id || hoverId === d.id || hoverDealId === d.id;
        return (
          <Marker
            key={d.id}
            latitude={d.lat}
            longitude={d.lng}
            anchor="bottom"
            onClick={(e) => handleMarkerClick(e, d)}
          >
            <div
              style={{
                cursor: 'pointer',
                transform: active ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 0.15s',
                zIndex: active ? 10 : 1,
                position: 'relative',
              }}
              onMouseEnter={() => setHoverDealId(d.id)}
              onMouseLeave={() => setHoverDealId(null)}
            >
              <MapPinSVG
                score={d.score}
                num={null}
                selected={active}
                tint={colorFor(d)}
              />
            </div>
          </Marker>
        );
      })}

      {withPopup && popup && (
        <Popup
          latitude={popup.lat}
          longitude={popup.lng}
          anchor="bottom"
          offset={36}
          closeButton={false}
          onClose={() => setPopup(null)}
          style={{ padding: 0 }}
        >
          <div style={{ background: '#1A1B22', border: '1px solid #2A2B34', borderRadius: 8, padding: '12px 14px', minWidth: 220, maxWidth: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{popup.addr}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{popup.city}</div>
              </div>
              <ScoreBubble score={popup.score} size="sm"/>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {hasVal(popup.asset) && <span className="tag">{fmt(popup.asset)}</span>}
              {popup.acres != null && <span className="tag">{popup.acres.toFixed(2)} ac</span>}
              {hasVal(popup.value) && <span className="tag">{fmtMoney(popup.value)}</span>}
            </div>
            <button className="btn primary sm" style={{ marginTop: 10, width: '100%' }}
              onClick={() => { onClickDeal?.(popup); setPopup(null); }}>
              View Deal <I.Chevron size={12}/>
            </button>
          </div>
        </Popup>
      )}
    </Map>
  );
}
