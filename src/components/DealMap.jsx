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

// The <Map> is controlled via {...viewState}. An imperative fitBounds/flyTo is
// snapped back by the next render of the controlled viewState, so we compute
// the target camera and push it into viewState via `apply` (setViewState).
function fitDeals(mapRef, deals, padding = 80, apply) {
  const result = boundsFromDeals(deals);
  if (!mapRef.current || !result) return;
  const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
  if (!map.loaded()) return;
  if (result.pts.length === 1) {
    const { lng, lat } = { lng: result.pts[0].lng, lat: result.pts[0].lat };
    if (apply) apply(vs => ({ ...vs, longitude: lng, latitude: lat, zoom: 13 }));
    else mapRef.current.flyTo({ center: [lng, lat], zoom: 13, duration: 0 });
    return;
  }
  const cam = map.cameraForBounds(result.bounds, { padding });
  if (cam && apply) {
    apply(vs => ({ ...vs, longitude: cam.center.lng, latitude: cam.center.lat, zoom: cam.zoom }));
  } else {
    mapRef.current.fitBounds(result.bounds, { padding, duration: 0 });
  }
}

// Test: are any of the deal coordinates inside the rectangle described by
// the persisted viewport? Used to decide whether to honor a saved viewport
// or auto-fit on first load when the saved viewport would leave every deal
// off-screen (e.g., user previously zoomed Austin, deals are in Denver).
// Min zoom at which a viewport counts as "deliberately framed on a deal".
// Below this the view is a zoomed-out overview (e.g. the default z4 covering
// the whole region) where a deal can be technically on-screen yet a tiny
// off-center speck. In that case we always want to auto-fit so the deals are
// actually framed, not just barely visible.
const FRAMED_MIN_ZOOM = 7;

function viewportContainsAnyDeal(viewport, deals) {
  if (!viewport || !Array.isArray(deals) || deals.length === 0) return true;
  const { latitude, longitude, zoom } = viewport;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return true;
  // Zoomed-out overview: never treat as framed — let auto-fit frame the deals.
  // This is the case that left Denver deals as a speck at the top of a default
  // Austin/z4 view (the map auto-persists that default before deals load).
  const z = Math.max(1, zoom || 4);
  if (z < FRAMED_MIN_ZOOM) return false;
  // Otherwise approximate the visible bounds with a degrees-per-zoom heuristic
  // and honor the viewport only if a deal actually sits inside it.
  const halfLng = (360 / Math.pow(2, z));
  const halfLat = halfLng * 0.6;
  const inView = (d) =>
    Math.abs(d.lat - latitude) <= halfLat &&
    Math.abs(d.lng - longitude) <= halfLng;
  return deals.some(d => d.lat != null && d.lng != null && inView(d));
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

  // Auto-fit on first load when (a) no viewport was persisted OR (b) the
  // persisted viewport is far enough away that none of the current deals
  // would be visible. The second case rescues users who saved an Austin
  // viewport in a previous session and now have deals delivered in Denver.
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    if (!fitTarget) return;
    if (initialViewState && viewportContainsAnyDeal(initialViewState, fitTarget)) {
      return;
    }
    fitDeals(mapRef, fitTarget, padding, setViewState);
  }, [fitTarget, padding, initialViewState]);

  useEffect(() => {
    if (!mapLoaded || !fitTarget) return;
    if (initialViewState && viewportContainsAnyDeal(initialViewState, fitTarget)) {
      return;
    }
    fitDeals(mapRef, fitTarget, padding, setViewState);
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
        if (!d.lat || !d.lng) {
          // Silent-drop: a deal made it into the host context but has no
          // coordinates. Log once per render so the next "no pins" report
          // surfaces in DevTools instead of guessing.
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(
              '[DealMap] dropped deal without coordinates:',
              { id: d.id, addr: d.addr || d.address, lat: d.lat, lng: d.lng }
            );
          }
          return null;
        }
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
