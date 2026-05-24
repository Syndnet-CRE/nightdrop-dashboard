import { CATEGORIES } from '../lib/assetColors';

export default function MapLegend() {
  return (
    <div className="map-legend">
      <div className="map-legend-title">Asset class</div>
      <div className="map-legend-list">
        {CATEGORIES.map(({ id, label, color }) => (
          <div key={id} className="map-legend-row">
            <span className="map-legend-swatch" style={{ background: color }} />
            <span className="map-legend-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
