import {
  LayoutDashboard, Map, Layers, Settings,
  UserCircle, Plus, Users, Bookmark, Sparkles, Database,
  TrendingUp, Flame, Target, Clock,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDeals } from '../contexts/DealsContext';

function MetricTile({ Icon, label, value, accent, active, disabled, onClick, title }) {
  const className = [
    'metric-tile',
    accent ? `accent-${accent}` : '',
    active ? 'active' : '',
    disabled ? 'disabled' : '',
    onClick ? 'clickable' : '',
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={onClick ? !!active : undefined}
      title={title}
    >
      <div className="metric-tile-icon"><Icon size={14} /></div>
      <div className="metric-tile-value">{value}</div>
      <div className="metric-tile-label">{label}</div>
    </button>
  );
}

function StatusDot({ status }) {
  const colorMap = {
    active: 'var(--nightdrop-green-700)',
    Active: 'var(--nightdrop-green-700)',
    paused: 'var(--warning)',
    Paused: 'var(--warning)',
    pending: 'var(--info)',
    Pending: 'var(--info)',
    'coverage failed': 'var(--danger)',
    'Coverage Failed': 'var(--danger)',
  };
  return (
    <span
      className="left-panel-bb-dot"
      style={{ background: colorMap[status] || 'var(--space)' }}
      title={status}
    />
  );
}

function MiniBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="left-panel-run-chart">
      {data.map((d, i) => (
        <div key={i} className="left-panel-run-bar-wrap" title={`${d.date}: ${d.count} deals`}>
          <div
            className="left-panel-run-bar"
            style={{ height: `${Math.max(4, Math.round((d.count / max) * 32))}px` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function LeftPanel({ view, setView, kpis, onCreateBuyBox, unreadCount, feedFilter, setFeedFilter }) {
  const { buyBoxes } = useDeals();

  const navItems = [
    { id: 'dealsheet', label: 'Deal Feed',      Icon: LayoutDashboard },
    { id: 'map',       label: 'Map',            Icon: Map },
    { id: 'boxes',     label: 'Buy Boxes',      Icon: Layers },
    { id: 'contacts',  label: 'My Contacts',    Icon: Users },
    { id: 'saved',     label: 'My Saved Deals', Icon: Bookmark },
    { id: 'trending',  label: "What's Trending", Icon: Sparkles },
    { id: 'data',      label: 'Data',           Icon: Database },
  ];

  // Demo-only override: surface a populated "New This Week" value on ?demo=true.
  const [searchParams] = useSearchParams();
  const demoMode = searchParams.get('demo') === 'true';
  const newThisWeekValue = demoMode ? 86 : (kpis?.new_this_week ?? '—');

  const responseRateValue = kpis?.response_rate != null && kpis.response_rate > 0
    ? `${kpis.response_rate}%`
    : '—';

  return (
    <aside className="left-panel">
      <div className="left-panel-inner">

        <nav className="left-panel-nav">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`left-panel-nav-item ${view === id ? 'active' : ''}`}
              onClick={() => setView(id)}
            >
              <span className="left-panel-nav-icon">
                <Icon size={18} />
              </span>
              <span className="left-panel-nav-label">{label}</span>
              {id === 'dealsheet' && unreadCount > 0 && (
                <span className="left-panel-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="left-panel-divider" />

        <div className="left-panel-metric-grid">
          <MetricTile
            Icon={TrendingUp}
            label="New This Week"
            value={newThisWeekValue}
            accent="green"
            active={feedFilter === 'new_this_week'}
            onClick={setFeedFilter ? () => setFeedFilter(feedFilter === 'new_this_week' ? 'all' : 'new_this_week') : undefined}
            title="Filter to deals from the last 7 days"
          />
          <MetricTile
            Icon={Flame}
            label="Hot Deals"
            value={kpis?.hot_deals ?? '—'}
            accent="orange"
            active={feedFilter === 'hot'}
            onClick={setFeedFilter ? () => setFeedFilter(feedFilter === 'hot' ? 'all' : 'hot') : undefined}
            title="Filter to hot deals (score 8+ or marked hot)"
          />
          <MetricTile
            Icon={Target}
            label="Response Rate"
            value={responseRateValue}
            accent="blue"
            disabled
            title="Coming soon"
          />
          <MetricTile
            Icon={Clock}
            label="Awaiting"
            value={kpis?.awaiting_response ?? '—'}
            accent="violet"
            disabled
            title="Coming soon"
          />
        </div>

        <div className="left-panel-divider" />

        <div className="left-panel-buy-boxes">
          <div className="left-panel-section-header">
            <span className="left-panel-section-label">Buy Boxes</span>
            <button className="left-panel-icon-btn" onClick={onCreateBuyBox} title="New buy box">
              <Plus size={13} />
            </button>
          </div>
          {buyBoxes.length === 0 ? (
            <div className="left-panel-empty">No active boxes</div>
          ) : (
            buyBoxes.map(bb => (
              <div key={bb.id} className="left-panel-bb-row">
                <StatusDot status={bb.status} />
                <span className="left-panel-bb-name">{bb.label}</span>
                <span className="left-panel-bb-count muted">{bb.deal_count ?? ''}</span>
              </div>
            ))
          )}
        </div>

        {kpis?.run_history?.length > 0 && (
          <>
            <div className="left-panel-divider" />
            <div className="left-panel-run-history">
              <div className="left-panel-section-label">Last 7 Nights</div>
              <MiniBarChart data={kpis.run_history} />
            </div>
          </>
        )}

        <div className="left-panel-bottom">
          <button
            className={`left-panel-nav-item ${view === 'accounts' ? 'active' : ''}`}
            onClick={() => setView('accounts')}
          >
            <UserCircle size={18} />
            <span className="left-panel-nav-label">Account</span>
          </button>
          <button
            className={`left-panel-nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            <Settings size={18} />
            <span className="left-panel-nav-label">Settings</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
