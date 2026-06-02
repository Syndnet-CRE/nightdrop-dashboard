import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, MoreHorizontal, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { inviteErrorMessage, isSendOk, inviteTimeline } from '../lib/inviteHelpers';
import '../styles/accounts.css';

function fmtDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function inviteState(sub) {
  if (sub.status === 'active' && !sub.invited_at) return 'direct';
  if (sub.status === 'active') return 'accepted';
  if (!sub.invited_at) return 'not_sent';
  if (sub.token_status === 'pending') return 'sent';
  return 'expired';
}

const INVITE_BADGE = {
  accepted: { label: 'Accepted', cls: 'green' },
  sent:     { label: 'Sent',     cls: 'blue'  },
  expired:  { label: 'Expired',  cls: 'amber' },
  not_sent: { label: 'Not sent', cls: 'gray'  },
  direct:   { label: 'Direct',   cls: 'green' },
};

const STATUS_BADGE = {
  active:         { label: 'Active',   cls: 'green' },
  trial:          { label: 'Trial',    cls: 'amber' },
  pending_invite: { label: 'Pending',  cls: 'blue'  },
  paused:         { label: 'Paused',   cls: 'gray'  },
  cancelled:      { label: 'Cancelled',cls: 'red'   },
};

function Badge({ map, value }) {
  const { label, cls } = map[value] || { label: value || '—', cls: 'gray' };
  return <span className={`acc-badge ${cls}`}>{label}</span>;
}

function InvitePanel({ onSent, onClose }) {
  const [email, setEmail]         = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [busy, setBusy]           = useState(false);
  const [msg, setMsg]             = useState(null);

  async function send() {
    const clean = email.toLowerCase().trim();
    if (!clean || !clean.includes('@')) { setMsg({ ok: false, text: 'Valid email required' }); return; }
    setBusy(true);
    setMsg(null);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null;
    try {
      const res = await api.post('/api/dealfeed/admin/subscribers/invite', {
        email:      clean,
        first_name: firstName.trim() || null,
        last_name:  lastName.trim()  || null,
        full_name:  fullName,
      });
      // A 2xx no longer guarantees delivery — the body must say ok:true.
      if (!isSendOk(res)) {
        setMsg({ ok: false, text: inviteErrorMessage({ body: res }) });
        return;
      }
      setMsg({ ok: true, text: `Invite sent to ${clean}` });
      setEmail('');
      setFirstName('');
      setLastName('');
      onSent();
    } catch (err) {
      setMsg({ ok: false, text: inviteErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="acc-invite-panel">
      <div className="acc-field">
        <label>Email</label>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          autoFocus
        />
      </div>
      <div className="acc-field">
        <label>First Name</label>
        <input
          type="text"
          placeholder="First"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
      </div>
      <div className="acc-field">
        <label>Last Name</label>
        <input
          type="text"
          placeholder="Last"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
      </div>
      <button className="acc-panel-send" onClick={send} disabled={busy || !email.trim()}>
        {busy ? 'Sending…' : 'Send Invite'}
      </button>
      <button className="acc-panel-cancel" onClick={onClose}><X size={14} /></button>
      {msg && <span className={`acc-panel-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
    </div>
  );
}

function RowMenu({ sub, state, onAction, busy }) {
  const [open, setOpen]       = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [dropPos, setDropPos] = useState(null);
  const triggerRef            = useRef(null);
  const dropRef               = useRef(null);

  function toggle() {
    if (open) { setOpen(false); setConfirm(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(true);
    setConfirm(null);
  }

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (triggerRef.current?.contains(e.target) || dropRef.current?.contains(e.target)) return;
      setOpen(false);
      setConfirm(null);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  function act(action) {
    if ((action === 'revoke' || action === 'delete') && confirm !== action) {
      setConfirm(action);
      return;
    }
    setOpen(false);
    setConfirm(null);
    onAction(action, sub);
  }

  return (
    <>
      <button ref={triggerRef} className="acc-row-menu-trigger" disabled={busy} onClick={toggle} title="More actions">
        <MoreHorizontal size={15} />
      </button>
      {open && dropPos && (
        <div ref={dropRef} className="acc-row-menu-dropdown" style={{ position: 'fixed', top: dropPos.top, right: dropPos.right }}>
          {state === 'not_sent' && (
            <button className="acc-menu-item" onClick={() => act('send')}>
              <Mail size={12} /> Send Invite
            </button>
          )}
          {(state === 'sent' || state === 'expired') && (
            <button className="acc-menu-item" onClick={() => act('resend')}>
              <RotateCcw size={12} /> Resend Invite
            </button>
          )}
          {(state === 'accepted' || state === 'direct') && (
            <button className="acc-menu-item warn" onClick={() => act('revoke')}>
              {confirm === 'revoke' ? 'Confirm revoke?' : 'Revoke Access'}
            </button>
          )}
          <div className="acc-menu-divider" />
          <button className="acc-menu-item danger" onClick={() => act('delete')}>
            <Trash2 size={12} />
            {confirm === 'delete' ? 'Confirm delete?' : 'Delete'}
          </button>
        </div>
      )}
    </>
  );
}

const FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'active',  label: 'Active' },
  { id: 'trial',   label: 'Trial' },
  { id: 'pending', label: 'Pending' },
  { id: 'expired', label: 'Expired' },
];

export function AccountsView() {
  const addToast = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [query, setQuery]             = useState('');
  const [showInvite, setShowInvite]   = useState(false);
  const [busyIds, setBusyIds]         = useState(new Set());
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get('/api/dealfeed/admin/subscribers');
      setSubscribers(d.subscribers || []);
    } catch {
      addToast('Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function handleAction(action, sub) {
    setBusyIds(s => new Set([...s, sub.id]));
    try {
      if (action === 'revoke') {
        await api.delete(`/api/dealfeed/admin/subscribers/${sub.id}`);
        addToast(`Access revoked for ${sub.email}`, 'success');
      } else if (action === 'delete') {
        await api.delete(`/api/dealfeed/admin/subscribers/${sub.id}/purge`);
        addToast(`${sub.email} deleted`, 'success');
      } else {
        // Resend: a 2xx no longer guarantees delivery — verify ok, surface error.
        const res = await api.post(`/api/dealfeed/admin/subscribers/${sub.id}/resend-invite`, {});
        if (!isSendOk(res)) {
          addToast(inviteErrorMessage({ body: res }, `Failed to send invite to ${sub.email}`), 'error');
          return;
        }
        addToast(`Invite sent to ${sub.email}`, 'success');
      }
      await load();
    } catch (err) {
      const fallback = action === 'resend' ? `Failed to send invite to ${sub.email}` : 'Action failed';
      addToast(inviteErrorMessage(err, fallback), 'error');
    } finally {
      if (mountedRef.current) {
        setBusyIds(s => { const n = new Set(s); n.delete(sub.id); return n; });
      }
    }
  }

  const withState = subscribers.map(s => ({ ...s, _state: inviteState(s) }));

  const counts = {
    all:     withState.length,
    active:  withState.filter(s => (s._state === 'accepted' || s._state === 'direct') && s.status !== 'trial').length,
    trial:   withState.filter(s => s.status === 'trial').length,
    pending: withState.filter(s => s._state === 'not_sent' || s._state === 'sent').length,
    expired: withState.filter(s => s._state === 'expired').length,
  };

  const filtered = withState.filter(s => {
    if (filter === 'active'  && !((s._state === 'accepted' || s._state === 'direct') && s.status !== 'trial')) return false;
    if (filter === 'trial'   && s.status !== 'trial')                                                          return false;
    if (filter === 'pending' && s._state !== 'not_sent' && s._state !== 'sent')                               return false;
    if (filter === 'expired' && s._state !== 'expired')                                                        return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (s.full_name || '').toLowerCase().includes(q) ||
             s.email.toLowerCase().includes(q) ||
             (s.company || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="acc-root">
      <div className="acc-header">
        <span className="acc-title">Accounts</span>
        <input
          className="acc-search"
          type="text"
          placeholder="Search name, email, company…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="acc-invite-btn" onClick={() => setShowInvite(v => !v)}>
          <Plus size={13} /> Invite
        </button>
        <div className="acc-header-divider" />
        <div className="acc-header-filters">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`acc-filter-tab${filter === f.id ? ' active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              <span className="acc-filter-count">{counts[f.id]}</span>
              <span className="acc-filter-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showInvite && <InvitePanel onSent={load} onClose={() => setShowInvite(false)} />}

      <div className="acc-table-wrap">
        {loading ? (
          <div className="acc-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="acc-empty">No accounts match this filter.</div>
        ) : (
          <table className="acc-table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Company</th>
                <th>Status</th>
                <th>Invite State</th>
                <th>Invited</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Boxes</th>
                <th>Deals</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => (
                <tr key={sub.id}>
                  <td>
                    <div className="acc-name">{sub.full_name || sub.email}</div>
                    {sub.full_name && <div className="acc-email">{sub.email}</div>}
                  </td>
                  <td><span className="acc-muted">{sub.company || '—'}</span></td>
                  <td><Badge map={STATUS_BADGE} value={sub.status} /></td>
                  <td><Badge map={INVITE_BADGE} value={sub._state} /></td>
                  <td className="acc-muted acc-num">
                    {(() => {
                      const tl = inviteTimeline(sub);
                      return tl.label ? `${tl.label} ${fmtDate(tl.date) || ''}`.trim() : '—';
                    })()}
                  </td>
                  <td className="acc-muted acc-num">{fmtDate(sub.created_at) || '—'}</td>
                  <td className="acc-muted acc-num">{fmtDateTime(sub.last_login_at) || '—'}</td>
                  <td className="acc-muted acc-num">{sub.buy_box_count ?? 0}</td>
                  <td className="acc-muted acc-num">{sub.deal_count ?? 0}</td>
                  <td>
                    <RowMenu sub={sub} state={sub._state} onAction={handleAction} busy={busyIds.has(sub.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
