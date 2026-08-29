import { useState, useEffect, useRef } from 'react';
import SlotMachineCounter from './SlotMachineCounter';

function pad2(n) { return String(n).padStart(2, '0'); }

function deriveStatTrio(form) {
  const equity = form?.fin?.equity_preset
  const holdMin = form?.owner?.hold_min
  const holdMax = form?.owner?.hold_max
  const occupancy = form?.owner?.occupancy

  const equityVal = equity ? `≥ ${equity}` : '--'
  const equitySub = equity ? 'filter active' : 'not filtered'

  let holdVal = '--'
  let holdSub = 'not filtered'
  if (holdMin && holdMax) { holdVal = `${holdMin}–${holdMax}yr`; holdSub = 'hold range set' }
  else if (holdMin) { holdVal = `≥ ${holdMin}yr`; holdSub = 'min hold set' }
  else if (holdMax) { holdVal = `≤ ${holdMax}yr`; holdSub = 'max hold set' }

  const occupancyVal = occupancy === 'absentee' ? 'Absentee' : '--'
  const occupancySub = occupancy === 'absentee' ? 'filter active' : 'not filtered'

  return { equityVal, equitySub, holdVal, holdSub, occupancyVal, occupancySub }
}

export function BuyBoxRightRail({ matchCount, previewState = 'resolved', errorKind = null, filters = [], geoStates = [], onRemoveFilter, form }) {
  const [clock, setClock] = useState(() => {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  });
  const [pulse, setPulse] = useState(false);
  const [delta, setDelta] = useState(0);
  const timerRef = useRef(null);
  const prevCountRef = useRef(matchCount);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setClock(`${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const prev = prevCountRef.current;
    if (matchCount === prev) return;
    prevCountRef.current = matchCount;
    if (matchCount !== null && matchCount !== undefined && prev !== null && prev !== undefined) {
      setDelta(matchCount - prev);
      setPulse(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPulse(false), 600);
    }
  }, [matchCount]);

  const { equityVal, equitySub, holdVal, holdSub, occupancyVal, occupancySub } = deriveStatTrio(form)

  return (
    <aside className="rail">
      <div className="rail-inner">
        <div className="rail-head">
          <div className="rail-status">
            <div className="rail-status-dot" />
            Live
          </div>
          <div className="rail-tick">{clock}</div>
        </div>

        <div className="quote-block">
          <div className="quote-label">Live match pool</div>
          <div className={`quote-value${pulse ? ' recalc' : ''}`}>
            <SlotMachineCounter value={matchCount} state={previewState} errorKind={errorKind} />
          </div>
          {previewState === 'resolved' && delta !== 0 && (
            <div className="quote-delta">
              <span className={`quote-delta-val ${delta > 0 ? 'pos' : 'neg'}`}>
                {delta > 0 ? '+' : ''}{delta.toLocaleString('en-US')}
              </span>
              <span>vs. prev</span>
            </div>
          )}
          <div className="quote-sub">
            {previewState === 'idle'
              ? 'Select an asset class to start.'
              : previewState === 'error' && errorKind === 'timeout'
              ? 'Preview timed out. Try narrower filters.'
              : previewState === 'error'
              ? 'Backend error. Counter will retry on next edit.'
              : 'properties matched to criteria'}
          </div>
        </div>

        <div className="stat-trio">
          <div className="stat-cell">
            <div className="stat-cell-label">Min equity</div>
            <div className="stat-cell-value">{equityVal}</div>
            <div className="stat-cell-spark">{equitySub}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell-label">Hold period</div>
            <div className="stat-cell-value">{holdVal}</div>
            <div className="stat-cell-spark">{holdSub}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell-label">Occupancy</div>
            <div className="stat-cell-value">{occupancyVal}</div>
            <div className="stat-cell-spark">{occupancySub}</div>
          </div>
        </div>

        {geoStates && geoStates.length > 0 && (
          <div className="rail-geo">
            <div className="quote-label" style={{ marginBottom: 10 }}>
              Geographic concentration
              <span style={{ fontFamily: 'var(--font-secondary)', fontWeight: 400, marginLeft: 8, fontSize: 10, color: 'var(--fg-mute)', textTransform: 'none', letterSpacing: 0 }}>
                · <span className={`count${geoStates.length > 0 ? ' active' : ''}`}>{geoStates.length}</span> {geoStates.length === 1 ? 'state' : 'states'}
              </span>
            </div>
            <div className="rail-geo-grid">
              {geoStates.map(code => (
                <div key={code} className="rail-geo-item">
                  <span className="rail-geo-dot" />
                  <span className="rail-geo-code">{code}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {filters.length > 0 && (
          <div>
            <div className="quote-label" style={{ marginBottom: 10 }}>Active filters</div>
            <div className="filter-chips">
              {filters.map((f, i) => (
                <span
                  key={i}
                  className={`f-chip${f.inactive ? ' inactive' : ''}`}
                  title={f.inactive ? 'This filter is not currently narrowing your pool.' : undefined}
                >
                  {f.label && <span className="label">{f.label}</span>}
                  <span className="val">{f.val}</span>
                  {onRemoveFilter && (
                    <button
                      className="f-chip-x"
                      onClick={() => onRemoveFilter(f.id)}
                      aria-label={`Remove ${f.label || f.val} filter`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
