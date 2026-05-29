import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeals } from '../../contexts/DealsContext';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import {
  FileText, Phone, Zap, Mail,
  Download, Plus, Star,
  Settings, ChevronRight, Check, X, HelpCircle,
  MessageSquare, AlertTriangle
} from 'lucide-react';

const TYPE_META = {
  note: { label: 'Note', color: 'var(--info-color)', Icon: FileText },
  call: { label: 'Call', color: 'var(--warning)', Icon: Phone },
  email: { label: 'Email', color: 'var(--info-color)', Icon: Mail },
  ai: { label: 'V1 AI', color: 'var(--accent)', Icon: Zap },
  ai_question: { label: 'You asked V1', color: 'var(--accent)', Icon: Zap },
};

const DEAL_ACTIONS = [
  { label: 'Generate Deal Packet', Icon: Download, color: 'var(--accent)', primary: true },
  { label: 'Mark as Favorite', Icon: Star, color: 'var(--fg)' },
  { label: 'Add to List', Icon: Plus, color: 'var(--fg)', inert: true }
];

const MATCH_OPTIONS = [
  { id: 'yes', label: 'Matches', Icon: Check, color: 'var(--accent)', bg: 'var(--accent-tint)' },
  { id: 'no', label: "Doesn't Match", Icon: X, color: 'var(--destructive)', bg: 'var(--danger-tint)' },
  { id: 'maybe', label: 'Need More Info', Icon: HelpCircle, color: 'var(--warning)', bg: 'var(--warn-tint)' }
];

function formatTime(isoString) {
  const d = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = months[d.getMonth()] + ' ' + d.getDate();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
  return { date, time };
}

function getAuthorInitials(fullName) {
  if (!fullName) return '—';
  const parts = fullName.split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
}

export function DealActivityRail({ deal }) {
  const { dealNotes, contacts, fetchDealNotes, fetchContacts, createDealNote, logContact, postFeedback, toggleSave } = useDeals();
  const { subscriber } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [filter, setFilter] = useState('all');
  const [maybeSelected, setMaybeSelected] = useState(false);
  const [aiThread, setAiThread] = useState([]);
  const textRef = useRef(null);

  useEffect(() => {
    fetchDealNotes(deal.id);
    fetchContacts(deal.id);
  }, [deal.id, fetchDealNotes, fetchContacts]);

  const dealNotesList = dealNotes[deal.id] || [];
  const contactsList = contacts[deal.id] || [];

  const items = [
    ...dealNotesList.map(n => ({
      id: n.id,
      type: 'note',
      created_at: n.created_at,
      text: n.note_text,
      author: getAuthorInitials(subscriber?.full_name),
    })),
    ...contactsList.map(c => ({
      id: c.id,
      type: c.channel === 'phone' ? 'call' : c.channel === 'email' ? 'email' : null,
      created_at: c.created_at,
      text: c.notes || '',
      author: getAuthorInitials(subscriber?.full_name),
    })).filter(i => i.type),
    ...aiThread,
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filtered = filter === 'all' ? items : filter === 'ai' ? items.filter(i => i.type === 'ai' || i.type === 'ai_question') : items.filter(i => i.type === filter);

  const handleSave = async () => {
    if (!draft.trim()) return;
    if (noteType === 'note') {
      await createDealNote(deal.id, draft.trim());
    } else if (noteType === 'call') {
      await logContact(deal.id, { channel: 'phone', outcome: 'follow_up', notes: draft.trim() });
    } else if (noteType === 'ai') {
      try {
        const res = await api.post('/api/dealfeed/agent/message', { content: draft.trim(), deal_id: deal.id });
        const now = new Date().toISOString();
        setAiThread(prev => [
          { id: `ai-q-${Date.now()}`, type: 'ai_question', created_at: now, text: draft.trim(), author: getAuthorInitials(subscriber?.full_name) },
          { id: `ai-${Date.now()}`, type: 'ai', created_at: now, text: res.reply, author: 'V1' },
          ...prev,
        ]);
      } catch {
        // Fail silently per PRD — keep optimistic value
      }
    }
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const matchVerdict = deal.feedback === 'hot' ? 'yes' : deal.feedback === 'not_relevant' ? 'no' : maybeSelected ? 'maybe' : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--card)' }}>

      {/* Deal Match */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>Buy Box Match</span>
          <button onClick={() => {
            if (deal.buyBoxId) {
              navigate(`/buy-boxes/${deal.buyBoxId}/edit`);
            } else {
              navigate('/buy-boxes');
            }
          }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--muted-foreground)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', padding: '3px 8px', fontWeight: 500, transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast)' }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Settings size={11} /> Configure
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
          {MATCH_OPTIONS.map(opt => {
            const { Icon } = opt;
            const active = matchVerdict === opt.id;
            return (
              <button key={opt.id}
              onClick={() => {
                if (opt.id === 'yes') postFeedback(deal.id, deal.feedback === 'hot' ? null : 'hot');
                else if (opt.id === 'no') postFeedback(deal.id, deal.feedback === 'not_relevant' ? null : 'not_relevant');
                else setMaybeSelected(!maybeSelected);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 7, border: `1px solid ${active ? opt.color : 'var(--btn-border)'}`, background: active ? opt.bg : 'var(--btn-rest)', cursor: 'pointer', transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast)' }}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.borderColor = opt.color; }}
              onMouseOut={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--btn-border)'; }}>
                <Icon size={14} color={opt.color} strokeWidth={2} />
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: active ? 700 : 600, color: opt.color, textAlign: 'center', lineHeight: 1.2 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
        {matchVerdict === 'no' &&
        <div style={{ marginTop: 8, padding: '7px 10px', background: 'var(--danger-tint)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
            <AlertTriangle size={11} color="var(--destructive)" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--destructive)' }}>Refine your buy box to filter this out.</span>
          </div>
        }
      </div>

      {/* Activity Feed Header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Activity</span>
          <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 10, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{items.length} entries</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['all', 'note', 'call', 'ai'].map(f => {
            const meta = TYPE_META[f];
            const label = f === 'all' ? 'All' : meta?.label;
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: active ? 600 : 400, padding: '3px 9px', borderRadius: 5, border: `1px solid ${active ? 'var(--accent)' : 'var(--btn-border)'}`, background: active ? 'var(--btn-rest-hover)' : 'var(--btn-rest)', color: active ? 'var(--fg)' : 'var(--muted-foreground)', cursor: 'pointer', textTransform: 'capitalize', transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast)' }}
              onMouseOver={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--fg)'; } }}
              onMouseOut={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--btn-border)'; e.currentTarget.style.color = 'var(--muted-foreground)'; } }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--muted-foreground)', fontFamily: 'var(--font-ui)', fontSize: 12 }}>
            No activity yet. Add a note or log a call below.
          </div>
        ) : (
          filtered.map(item => {
            const meta = TYPE_META[item.type] || TYPE_META.note;
            const { Icon } = meta;
            const { date, time } = formatTime(item.created_at);
            return (
              <div key={item.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-faint)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--secondary)', border: `1px solid ${meta.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icon size={11} color={meta.color} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{meta.label}</span>
                      <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 9, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{date} · {time}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-secondary)', fontSize: 9, color: 'var(--muted-foreground)', background: 'var(--secondary)', borderRadius: 3, padding: '1px 5px', fontFeatureSettings: "'tnum','zero'" }}>{item.author}</span>
                    </div>
                    <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: 1.55, color: 'var(--fg)' }}>{item.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 7 }}>
          {['note', 'call', 'ai'].map(t => {
            const meta = TYPE_META[t];
            const { Icon } = meta;
            const active = noteType === t;
            return (
              <button key={t} onClick={() => setNoteType(t)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: active ? 600 : 400, padding: '4px 9px', borderRadius: 5, border: `1px solid ${active ? meta.color + '70' : 'var(--btn-border)'}`, background: active ? meta.color + '18' : 'var(--btn-rest)', color: active ? meta.color : 'var(--muted-foreground)', cursor: 'pointer', textTransform: 'capitalize', transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast)' }}
              onMouseOver={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--fg)'; } }}
              onMouseOut={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--btn-border)'; e.currentTarget.style.color = 'var(--muted-foreground)'; } }}>
                <Icon size={11} strokeWidth={2} />{meta.label}
              </button>
            );
          })}
        </div>
        <textarea ref={textRef} value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={noteType === 'call' ? 'Log a call…' : noteType === 'ai' ? 'Ask V1 anything about this deal…' : 'Jot a note…'}
        style={{ width: '100%', resize: 'none', height: 58, background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--fg)', fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: 1.5, outline: 'none', boxSizing: 'border-box', display: 'block', transition: 'box-shadow var(--t-fast) var(--ease-fast)' }}
        onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--ring)'; }}
        onBlur={(e) => { e.target.style.boxShadow = 'none'; }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--muted-foreground)' }}>⌘↵ to save</span>
          <button onClick={handleSave} style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 5, border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'opacity var(--t-fast) var(--ease-fast)' }}>
            <MessageSquare size={11} /> Save
          </button>
        </div>
      </div>

      {/* Deal Actions */}
      <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Deal Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DEAL_ACTIONS.map(a => {
            const { Icon } = a;
            const isFavorite = a.label === 'Mark as Favorite' && deal.saved;
            const finalLabel = isFavorite ? 'Saved' : a.label;
            return (
              <button key={a.label}
              onClick={() => {
                if (a.label === 'Generate Deal Packet') {
                  // no-op, stub
                } else if (a.label === 'Mark as Favorite') {
                  toggleSave(deal.id);
                }
              }}
              disabled={a.inert}
              title={a.label === 'Generate Deal Packet' ? 'PDF generation coming soon' : a.inert ? 'Coming soon' : ''}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: a.primary ? 600 : 400, padding: '7px 10px', borderRadius: 6, border: `1px solid ${a.primary ? 'var(--accent)' : 'var(--btn-border)'}`, background: a.primary ? 'var(--accent-tint)' : 'var(--btn-rest)', color: isFavorite ? 'var(--accent)' : a.color, cursor: a.inert ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast)', opacity: a.inert ? 0.6 : 1 }}
              onMouseOver={(e) => { if (!a.inert) { e.currentTarget.style.background = a.primary ? 'var(--accent-tint)' : 'var(--btn-rest-hover)'; e.currentTarget.style.borderColor = 'var(--accent)'; } }}
              onMouseOut={(e) => { if (!a.inert) { e.currentTarget.style.background = a.primary ? 'var(--accent-tint)' : 'var(--btn-rest)'; e.currentTarget.style.borderColor = a.primary ? 'var(--accent)' : 'var(--btn-border)'; } }}>
                <Icon size={13} strokeWidth={isFavorite ? 1.5 : 2} style={{ flexShrink: 0, fill: isFavorite ? 'var(--accent)' : 'none' }} />
                {finalLabel}
                {a.primary && <ChevronRight size={12} style={{ marginLeft: 'auto' }} color="var(--accent)" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
