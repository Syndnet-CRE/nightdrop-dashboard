import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDeals } from '../contexts/DealsContext';
import { DEALS as MOCK_DEALS, BUY_BOXES as MOCK_BUY_BOXES } from '../data/mockData';
import { DEMO_PROPERTIES, CLUSTER_CITIES } from '../data/demoProperties';
import { DealMap } from '../components/DealMap';
import { DealPanel } from '../components/DealPanel';
import MapLegend from '../components/MapLegend';
import { I } from '../components/Icons';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const THUMB_REF    = '-97.742,30.266,10';

function styleThumbUrl(style) {
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${THUMB_REF}/160x90@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
}

const STYLE_THUMBS = {
  dark:      { label: 'Dark',      styleId: 'dark-v11' },
  satellite: { label: 'Satellite', styleId: 'satellite-streets-v12' },
  standard:  { label: 'Standard',  styleId: 'streets-v12' },
};

const STYLE_KEY    = 'nightdrop-map-style';
const VIEWPORT_KEY = 'nightdrop-map-viewport';
const PANEL_KEY    = 'nightdrop.mapPanel.collapsed';
const FILTERS_KEY  = 'nightdrop-deals-filters';

const DEFAULT_FILTERS = {
  box: 'all', range: 'all', klass: 'all', sort: 'recent',
  ownerTypes: [], hasContactInfo: false, distressTypes: [],
};

function loadStyle()    { return localStorage.getItem(STYLE_KEY) || 'satellite'; }
function loadViewport() {
  try { const v = localStorage.getItem(VIEWPORT_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
function loadCollapsed() {
  try { const v = localStorage.getItem(PANEL_KEY); return v ? JSON.parse(v) : false; } catch { return false; }
}
function loadFilters() {
  try { const v = localStorage.getItem(FILTERS_KEY); return v ? { ...DEFAULT_FILTERS, ...JSON.parse(v) } : DEFAULT_FILTERS; }
  catch { return DEFAULT_FILTERS; }
}

function sortDeals(deals, sort) {
  const out = [...deals];
  if (sort === 'distress') return out.sort((a, b) => (b.score || 0) - (a.score || 0));
  if (sort === 'value')    return out.sort((a, b) => (b.value || 0) - (a.value || 0));
  return out.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
}

export function MapView({ onOpenDeal }) {
  const { deals: apiDeals, buyBoxes: apiBuyBoxes, loading } = useDeals();
  const deals    = (!loading && apiDeals.length    === 0) ? MOCK_DEALS    : apiDeals;
  const buyBoxes = (!loading && apiBuyBoxes.length === 0) ? MOCK_BUY_BOXES : apiBuyBoxes;

  const [filters,        setFilters]        = useState(loadFilters);
  const [mapStyle,       setMapStyle]       = useState(loadStyle);
  const [viewport,       setViewport]       = useState(loadViewport);
  const [collapsed,      setCollapsed]      = useState(loadCollapsed);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [focusDealId,    setFocusDealId]    = useState(null);
  const [panelHoverId,   setPanelHoverId]   = useState(null);
  const [activePanel,    setActivePanel]    = useState(null);

  const handleFiltersChange = useCallback((next) => {
    setFilters(next);
    localStorage.setItem(FILTERS_KEY, JSON.stringify(next));
  }, []);

  const handleStyleChange = useCallback((style) => {
    setMapStyle(style);
    localStorage.setItem(STYLE_KEY, style);
    setActivePanel(null);
  }, []);

  const handleViewportChange = useCallback((vp) => {
    setViewport(vp);
    localStorage.setItem(VIEWPORT_KEY, JSON.stringify(vp));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(PANEL_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Card click in panel: expand card + flyTo on map
  const handleExpandCard = useCallback((id) => {
    setExpandedCardId(id);
    if (id) setFocusDealId(id);
  }, []);

  // Honor ?focus=<dealId> on mount (deep-link from owner portfolio table, etc.)
  // URL-driven side effect — the linter dislikes setState inside effects, but
  // this is the canonical pattern for syncing query params into local state.
  const [searchParams, setSearchParams] = useSearchParams();
  const demoMode = searchParams.get('demo') === 'true';
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const focusParam = searchParams.get('focus');
    if (!focusParam) return;
    setFocusDealId(focusParam);
    setExpandedCardId(focusParam);
    setCollapsed(false);
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Honor ?lat=<number>&lng=<number>&z=<zoom> to fly to arbitrary coords.
  // Clears params after applying, same pattern as ?focus.
  // Does NOT call fitDeals; coords-driven flyTo takes precedence over auto-fit.
  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const zoomParam = searchParams.get('z');

    if (!latParam || !lngParam) return;

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    const zoom = zoomParam ? parseFloat(zoomParam) : 15;

    // Validate parsed numbers
    if (isNaN(lat) || isNaN(lng) || isNaN(zoom)) return;

    // Update viewport state directly, which will trigger the map to fly
    setViewport({ latitude: lat, longitude: lng, zoom });

    // Clear the params
    const next = new URLSearchParams(searchParams);
    next.delete('lat');
    next.delete('lng');
    next.delete('z');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Pin click on map: expand card in panel, auto-open panel; no flyTo (user is already viewing pin)
  const handlePinClick = useCallback((deal) => {
    setCollapsed(prev => {
      if (prev) localStorage.setItem(PANEL_KEY, JSON.stringify(false));
      return false;
    });
    setExpandedCardId(deal.id);
  }, []);

  const toolbarRef = useRef(null);
  useEffect(() => {
    if (!activePanel) return;
    const onDown = (e) => { if (!toolbarRef.current?.contains(e.target)) setActivePanel(null); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [activePanel]);

  const filtered = useMemo(() => {
    let out = deals;
    if (filters.box   !== 'all') out = out.filter(d => d.box   === filters.box);
    if (filters.klass !== 'all') out = out.filter(d => d.asset === filters.klass);
    if (filters.range !== 'all') {
      const days = filters.range === 'week' ? 7 : filters.range === 'month' ? 31 : filters.range === 'quarter' ? 91 : 9999;
      out = out.filter(d => (d.days ?? 9999) <= days);
    }
    if (filters.ownerTypes?.length > 0) {
      out = out.filter(d => filters.ownerTypes.some(t => {
        const et = d.entityType || '';
        if (t === 'Individual') return !et || et === 'Individual';
        if (t === 'LLC')        return et.includes('LLC');
        if (t === 'Trust')      return et.includes('Trust');
        if (t === 'Corporate')  return et.includes('Corp') || et.includes('Inc');
        return false;
      }));
    }
    if (filters.hasContactInfo) out = out.filter(d => d.dm);
    return sortDeals(out, filters.sort);
  }, [deals, filters]);

  return (
    <div className="map-view-wrap">
      <DealMap
        deals={demoMode ? DEMO_PROPERTIES : filtered}
        onClickDeal={handlePinClick}
        withPopup={false}
        mapStyle={mapStyle}
        padding={80}
        initialViewState={demoMode ? null : viewport}
        onViewStateChange={handleViewportChange}
        selectedId={expandedCardId}
        hoverId={panelHoverId}
        focusDealId={focusDealId}
        demoMode={demoMode}
        clusterData={demoMode ? CLUSTER_CITIES : null}
        enableClustering={!demoMode}
      />

      <MapLegend />

      <div className="map-toolbar" ref={toolbarRef}>
        <div className="mt-slot">
          <button
            className={`mt-btn ${activePanel === 'style' ? 'active' : ''}`}
            onClick={() => setActivePanel(p => p === 'style' ? null : 'style')}
            title="Map Style"
          >
            <I.Layers size={16} />
          </button>
          {activePanel === 'style' && (
            <div className="mt-panel">
              <div className="mt-panel-head"><span>Map Style</span></div>
              <div className="mt-style-grid">
                {Object.entries(STYLE_THUMBS).map(([key, thumb]) => (
                  <button
                    key={key}
                    className={`mt-style-opt ${mapStyle === key ? 'active' : ''}`}
                    onClick={() => handleStyleChange(key)}
                  >
                    <div className="mt-thumb">
                      <img
                        src={styleThumbUrl(thumb.styleId)}
                        alt={thumb.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 4 }}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <span>{thumb.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        className={`panel-toggle-btn${collapsed ? ' collapsed' : ''}`}
        onClick={toggleCollapsed}
        title={collapsed ? 'Show deal panel' : 'Hide deal panel'}
      >
        <I.Chevron
          size={14}
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
        />
      </button>

      <div className={`deal-panel${collapsed ? ' collapsed' : ''}`}>
        <DealPanel
          deals={filtered}
          buyBoxes={buyBoxes}
          filters={filters}
          onFilterChange={handleFiltersChange}
          expandedCardId={expandedCardId}
          onExpandCard={handleExpandCard}
          onOpenDeal={onOpenDeal}
          onHoverDeal={setPanelHoverId}
        />
      </div>
    </div>
  );
}
