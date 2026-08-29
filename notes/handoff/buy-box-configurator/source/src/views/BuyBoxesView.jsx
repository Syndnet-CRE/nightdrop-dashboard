// src/views/BuyBoxesView.jsx
//
// Buy-Box Management — data-forward Kanban.
//
// Props:
//   onCreate()    — opens wizard for create
//   onEdit(id)    — opens wizard for edit
//   onPause(box)  — opens pause-confirm modal

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Search, Plus, MapPin, Pause, Play, Sliders, MoreHorizontal,
  AlertTriangle, ArrowUpRight, Trash2, Edit3,
} from 'lucide-react';
import { useDeals } from '../contexts/DealsContext';
import { getAssetClass, normalizeAssetClassSlug } from '../lib/buyBoxTaxonomy';
import { useToast } from '../contexts/ToastContext';
import { BuyerSearchComingSoonModal } from '../components/BuyerSearchComingSoonModal';
import '../styles/buyBoxes.css';

// ────────────────────────────────────────────────────────────
// Column definitions
// ────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'pending',    title: 'Pending',      sub: 'Awaiting first run' },
  { id: 'validating', title: 'Validating',   sub: 'Coverage check in progress' },
  { id: 'active',     title: 'Active',       sub: 'Running nightly' },
  { id: 'paused',     title: 'Paused',       sub: 'Manually paused' },
  { id: 'gap',        title: 'Coverage gap', sub: 'No parcel data for this geo' },
];

// Fix C + Fix D: normalize status (handles 'Coverage Failed' and 'coverage_failed')
function deriveColumn(box) {
  const s = (box.status || '').toLowerCase().replace(/\s+/g, '_');
  if (s === 'coverage_failed') return 'gap';
  if (s === 'paused') return 'paused';
  if (s === 'active' && !box.last_run_at && !box.lastRun) return 'validating';
  if (s === 'active') return 'active';
  return 'pending';
}

// ────────────────────────────────────────────────────────────
// Display formatters
// ────────────────────────────────────────────────────────────
function formatGeo(box) {
  if (box.geo_zips?.length) {
    return {
      short: box.geo_zips[0],
      detail: box.geo_zips.length === 1 ? box.geo_zips[0] : `${box.geo_zips.length} ZIPs`,
    };
  }
  if (box.geo_counties?.length) {
    const state = box.geo_states?.[0] ?? '';
    const n = box.geo_counties.length;
    return {
      short: state || box.geo_counties[0],
      detail: state
        ? `${state} · ${n} ${n === 1 ? 'county' : 'counties'}`
        : `${n} ${n === 1 ? 'county' : 'counties'}`,
    };
  }
  if (box.geo_states?.length) {
    const n = box.geo_states.length;
    return {
      short: box.geo_states[0],
      detail: n === 1 ? `${box.geo_states[0]} · state-wide` : `${n} states`,
    };
  }
  return { short: '—', detail: 'No geo set' };
}

function formatAsset(box) {
  // Backend MVP: asset_class is the singular slug (one of 10). Legacy rows may
  // still carry asset_classes[] only — fall back gracefully.
  const slug = box.asset_class || (box.asset_classes ?? [])[0];
  if (!slug) return { primary: '—', extra: null };
  const cls = getAssetClass(normalizeAssetClassSlug(slug));
  const primary = cls?.label || slug;
  const extra = (box.asset_classes?.length ?? 0) > 1 ? `+${box.asset_classes.length - 1} more` : null;
  return { primary, extra };
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function scheduleArray(box) {
  const days = box.run_schedule?.days ?? [];
  return DAY_KEYS.map((d) => days.includes(d));
}

function formatLastRun(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (!isFinite(d.getTime())) return null;
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).replace(',', ' —');
  } catch { return null; }
}

// ────────────────────────────────────────────────────────────
// Sparkline (inline SVG, no deps)
// ────────────────────────────────────────────────────────────
function Sparkline({ data, width = 72, height = 36 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [
    i * stepX,
    height - ((v - min) / range) * (height - 2) - 1,
  ]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg className="bb-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path className="bb-spark__area" d={area} />
      <path className="bb-spark__line" d={d} />
      <circle cx={last[0]} cy={last[1]} r="1.8" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Weekday strip
// ────────────────────────────────────────────────────────────
function WeekStrip({ schedule, dim = false }) {
  return (
    <div className="bb-week" aria-label="Run schedule">
      {DAY_LABEL.map((d, i) => (
        <span
          key={i}
          className={`bb-week__d ${schedule[i] && !dim ? 'is-on' : ''}`}
          aria-label={DAY_KEYS[i]}
        >
          {d}
        </span>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Card
// ────────────────────────────────────────────────────────────
function CardMenu({
  box,
  column,
  onEdit,
  onEditGeo,
  onPause,
  onResume,
  placement = 'down',
  triggerClassName = 'bb-card__menu',
  triggerAriaLabel = 'More',
  triggerIcon = null,
}) {
  const { deleteBuyBox } = useDeals();
  const addToast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) { setOpen(false); setConfirmDel(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => { setOpen(false); setConfirmDel(false); };

  const handleDelete = async () => {
    try {
      await deleteBuyBox(box.id);
      addToast('Buy box deleted.', 'success');
      close();
    } catch (err) {
      addToast(err.message || 'Delete failed.', 'error');
      close();
    }
  };

  const ddClass = `bb-card__dd${placement === 'up' ? ' bb-card__dd--up' : ''}`;
  const icon = triggerIcon ?? <MoreHorizontal size={14} strokeWidth={1.5} />;

  return (
    <div className="bb-card__menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setOpen(v => !v); setConfirmDel(false); }}
      >
        {icon}
      </button>
      {open && (
        <div className={ddClass} role="menu">
          <button className="bb-card__dd-item" onClick={() => { close(); onEdit?.(box); }}>
            <Edit3 size={12} strokeWidth={1.6} /> Edit buy box
          </button>
          {column === 'active' && (
            <button className="bb-card__dd-item" onClick={() => { close(); onPause?.(box); }}>
              <Pause size={12} strokeWidth={1.6} /> Pause
            </button>
          )}
          {column === 'paused' && (
            <button className="bb-card__dd-item" onClick={() => { close(); onResume?.(box.id); }}>
              <Play size={12} strokeWidth={1.6} /> Resume
            </button>
          )}
          {column === 'gap' && (
            <button className="bb-card__dd-item" onClick={() => { close(); onEditGeo?.(box); }}>
              <MapPin size={12} strokeWidth={1.6} /> Fix geography
            </button>
          )}
          <div className="bb-card__dd-sep" />
          {!confirmDel ? (
            <button className="bb-card__dd-item bb-card__dd-item--danger" onClick={() => setConfirmDel(true)}>
              <Trash2 size={12} strokeWidth={1.6} /> Delete
            </button>
          ) : (
            <div className="bb-card__dd-confirm">
              <span>Delete this box?</span>
              <button className="bb-card__dd-no" onClick={() => setConfirmDel(false)}>No</button>
              <button className="bb-card__dd-yes" onClick={handleDelete}>Yes</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BuyBoxCard({ box, column, onEdit, onEditGeo, onPause, onResume, onDragStart }) {
  const geo = formatGeo(box);
  const asset = formatAsset(box);
  const schedule = scheduleArray(box);
  const lastRun = formatLastRun(box.last_run_at);
  const delivered = box.deals ?? 0;
  const thisWeek = box.deliveredThisWeek ?? 0;
  const spark = box.deliveredSpark ?? null;
  const isGap = column === 'gap';

  return (
    <article
      className="bb-card"
      data-status={column}
      data-box-id={box.id}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart ? (e) => onDragStart(e, box) : undefined}
    >
      <header className="bb-card__head">
        <span className="bb-card__dot" />
        <h3 className="bb-card__title" title={box.label}>{box.label}</h3>
      </header>

      {isGap ? (
        <div className="bb-alert">
          <AlertTriangle size={13} strokeWidth={1.6} />
          <div>
            <strong>No parcel data for this geo.</strong>
            <div className="bb-alert__hint">Drop to a tighter geo to get coverage.</div>
          </div>
        </div>
      ) : (
        <div className="bb-card__hero">
          <div>
            <div className="bb-card__big">{delivered.toLocaleString()}</div>
            <div className="bb-card__lbl">Delivered</div>
            {thisWeek > 0 && (
              <div className="bb-card__delta">
                <ArrowUpRight size={11} strokeWidth={2} />
                +{thisWeek} this week
              </div>
            )}
          </div>
          {spark && <Sparkline data={spark} />}
        </div>
      )}

      <div className="bb-card__chiprow">
        <span className="bb-chip">
          {asset.primary}
          {asset.extra && <em className="bb-chip__sub"> · {asset.extra}</em>}
        </span>
        <span className="bb-chip bb-chip--geo">
          <MapPin size={10} strokeWidth={1.6} />
          {geo.detail}
        </span>
      </div>

      <div className="bb-card__nextrun">
        <span className="bb-card__k">Last run</span>
        <span className="bb-card__v">{isGap ? 'Paused until fixed' : (lastRun ?? '—')}</span>
      </div>

      <WeekStrip schedule={schedule} dim={isGap || column === 'paused'} />

      <div className="bb-card__actions">
        {column === 'active' && (
          <button type="button" className="bb-btn" onClick={() => onPause?.(box)}>
            <Pause size={13} strokeWidth={1.6} /> Pause
          </button>
        )}
        {column === 'paused' && (
          <button type="button" className="bb-btn bb-btn--primary" onClick={() => onResume?.(box.id)}>
            <Play size={13} strokeWidth={1.6} /> Resume
          </button>
        )}
        {column === 'gap' && (
          <button type="button" className="bb-btn bb-btn--danger" onClick={() => onEditGeo?.(box)}>
            <MapPin size={13} strokeWidth={1.6} /> Edit geo
          </button>
        )}
        {(column === 'pending' || column === 'validating') && (
          <button type="button" className="bb-btn" onClick={() => onEdit?.(box)}>
            Configure
          </button>
        )}
        <CardMenu
          box={box}
          column={column}
          onEdit={onEdit}
          onEditGeo={onEditGeo}
          onPause={onPause}
          onResume={onResume}
          placement="up"
          triggerClassName="bb-iconbtn"
          triggerAriaLabel="Buy box options"
          triggerIcon={<Sliders size={14} strokeWidth={1.6} />}
        />
      </div>
    </article>
  );
}

// ────────────────────────────────────────────────────────────
// Column
// ────────────────────────────────────────────────────────────
function Column({ col, items, onEdit, onEditGeo, onPause, onResume, onDragStart, onDrop }) {
  const empty = items.length === 0;
  return (
    <div
      className="bb-col"
      data-status={col.id}
      data-empty={empty}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={onDrop ? (e) => onDrop(e, col.id) : undefined}
    >
      <div className="bb-col__head">
        <span className="bb-col__dot" />
        <span className="bb-col__title">{col.title}</span>
        <span className="bb-col__count">{items.length}</span>
      </div>
      <div className="bb-col__sub">{col.sub}</div>
      <div className="bb-col__body">
        {empty ? (
          <div className="bb-col__empty">No boxes</div>
        ) : items.map((b) => (
          <BuyBoxCard
            key={b.id}
            box={b}
            column={col.id}
            onEdit={onEdit}
            onEditGeo={onEditGeo}
            onPause={onPause}
            onResume={onResume}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// View — Fix A (named export) + Fix B (correct props) + Fix G (internal DnD)
// ────────────────────────────────────────────────────────────
export function BuyBoxesView({ onCreate, onEdit, onEditGeo, onPause }) {
  const { buyBoxes, patchBuyBox } = useDeals();
  const addToast = useToast();  // Fix H
  const [showBuyerSearch, setShowBuyerSearch] = useState(false);

  const grouped = useMemo(() => {
    const out = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    (buyBoxes ?? []).forEach((b) => {
      const col = deriveColumn(b);
      if (out[col]) out[col].push(b);
    });
    return out;
  }, [buyBoxes]);

  const activeCount = grouped.active.length;
  const attentionCount = grouped.gap.length + grouped.paused.length;

  // Fix F: routes through onPause prop so App.jsx pause-confirm modal fires
  const handlePause = (box) => onPause?.(box);

  // Fix H: resume with toast feedback
  const handleResume = async (id) => {
    try {
      await patchBuyBox(id, { status: 'active' });
      addToast('Search resumed — runs tonight.', 'success');
    } catch {
      addToast('Failed to resume. Try again.', 'error');
    }
  };

  // Fix G: internal DnD — no longer threaded through App.jsx props
  const handleDragStart = (e, box) => e.dataTransfer.setData('boxId', box.id);
  const handleDrop = (e, colId) => {
    const id = e.dataTransfer.getData('boxId');
    if (!id || colId === 'gap') return;
    const statusMap = { active: 'active', paused: 'paused', pending: 'pending', validating: 'pending' };
    const newStatus = statusMap[colId];
    if (newStatus) patchBuyBox(id, { status: newStatus });
  };

  return (
    <>
    <div className="page kanban-page">
      <div className="bb-shell">
        {/* Page head */}
        <header className="bb-pagehead">
          <div>
            <h1 className="bb-pagehead__title">Buy-Box Management</h1>
            <div className="bb-pagehead__sub">
              <span className="bb-pagehead__num">{activeCount}</span> active
              {attentionCount > 0 && (
                <> · <span className="bb-pagehead__num bb-pagehead__num--warn">{attentionCount}</span> need attention</>
              )}
            </div>
          </div>
          <div className="bb-pagehead__actions">
            <button type="button" className="bb-btn" onClick={() => setShowBuyerSearch(true)}>
              <Search size={13} strokeWidth={1.6} /> New buyer search
            </button>
            <button type="button" className="bb-btn bb-btn--primary" onClick={onCreate}>
              <Plus size={13} strokeWidth={2.2} /> New buy box
            </button>
          </div>
        </header>

        {/* Board */}
        <div className="bb-frame">
          <div className="bb-board">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                col={col}
                items={grouped[col.id]}
                onEdit={onEdit}
                onEditGeo={onEditGeo}
                onPause={handlePause}
                onResume={handleResume}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      </div>
    </div>

    {showBuyerSearch && (
      <BuyerSearchComingSoonModal onClose={() => setShowBuyerSearch(false)} />
    )}
    </>
  );
}
