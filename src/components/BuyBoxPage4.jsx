import { Ic } from './buybox-icons'

// Card order is tier-grouped for visual hierarchy: pressure (amber) → flag (blue) → urgent (red).
// IDs are stable — backend stores signals as a set, not a list. Reorder is purely cosmetic.
const SIGNALS = [
  // ── 🟡 Pressure (financial / timing) ──────────────────────────────────────
  {
    id: 'long-term-hold',
    tier: 'pressure',
    icon: 'clock',
    title: 'Long-term hold, no refi',
    count: 318_900,
    desc: 'Owned 10+ years with no mortgage activity in the last 7 years.',
  },
  {
    id: 'arm-mortgage',
    tier: 'pressure',
    icon: 'arm',
    title: 'ARM or variable-rate mortgage',
    count: 226_400,
    desc: 'Mortgage is adjustable-rate or has a balloon payment within 24 months.',
  },
  {
    id: 'high-ltv',
    tier: 'pressure',
    icon: 'ltv',
    title: 'High LTV (80%+)',
    count: 412_800,
    desc: 'Outstanding loan balance exceeds 80% of current estimated value.',
  },
  {
    id: 'free-and-clear',
    tier: 'pressure',
    icon: 'free',
    title: 'Free and clear (no mortgage)',
    count: 384_600,
    desc: 'No recorded mortgage — owner has full equity and no debt service pressure.',
  },
  // ── 🔵 Flag (ownership profile) ───────────────────────────────────────────
  {
    id: 'absentee-owner',
    tier: 'flag',
    icon: 'absent',
    title: 'Absentee owner',
    count: 1_480_000,
    desc: 'Owner mailing address does not match the property address.',
  },
  {
    id: 'quit-claim-deed',
    tier: 'flag',
    icon: 'deed',
    title: 'Quit-claim deed in history',
    count: 142_600,
    desc: 'Title was transferred via quit-claim, often signaling estate transfer or motivated exit.',
  },
  {
    id: 'non-arms-length',
    tier: 'flag',
    icon: 'deed',
    title: 'Non-arms-length prior sale',
    count: 98_100,
    desc: 'Last sale was between related parties — family transfer, trust, or internal LLC.',
  },
  {
    id: 'investor-buyer',
    tier: 'flag',
    icon: 'investor',
    title: 'Investor buyer at last purchase',
    count: 612_400,
    desc: 'Property was acquired by an LLC, fund, or repeat investor — not an owner-occupant.',
  },
  // ── 🔴 Urgent (acute distress) ────────────────────────────────────────────
  {
    id: 'active-foreclosure',
    tier: 'urgent',
    icon: 'gavel',
    title: 'Active foreclosure record',
    count: 84_200,
    desc: 'Notice of default, lis pendens, or scheduled auction within the next 180 days.',
  },
  {
    id: 'tax-delinquent',
    tier: 'urgent',
    icon: 'tax',
    title: 'Tax delinquent',
    count: 218_400,
    desc: 'Outstanding property tax balance — one or more years past due.',
  },
  {
    id: 'near-mortgage-maturity',
    tier: 'urgent',
    icon: 'maturity',
    title: 'Balloon or ARM reset within 18 months',
    count: 4_709,
    desc: 'Mortgage balloon payment or adjustable-rate reset due within 18 months — payment shock risk.',
  },
  {
    id: 'prior-foreclosure-auction',
    tier: 'urgent',
    icon: 'gavel',
    title: 'Prior foreclosure auction on record',
    count: 6_601,
    desc: 'Property was previously sold at a foreclosure auction — history of distressed ownership.',
  },
]

export function BuyBoxPage4({ form, setForm }) {
  const signals = form.signals || []
  const logic = form.logic || 'OR'
  const distressFloor = form.distress_floor || ''

  const toggle = id => {
    setForm({
      ...form,
      signals: signals.includes(id) ? signals.filter(x => x !== id) : [...signals, id],
    })
  }

  return (
    <div className="page-fade">
      <header className="page-head">
        <div className="page-eyebrow">
          <span className="mono-step mono">04/07</span>
          <span className="sep" />
          <span>Distress signals</span>
        </div>
        <h1 className="page-title">What does motivated look like?</h1>
        <p className="page-sub">Pick the distress signals that should qualify a property.</p>
      </header>

      <section className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="section-title-num">A</span> Distress signals
          </div>
          <span className="section-meta">
            <span className={`count${signals.length > 0 ? ' active' : ''}`}>{signals.length}</span> of {SIGNALS.length} active
          </span>
        </div>

        <div className="signal-grid">
          {SIGNALS.map(s => {
            const on = signals.includes(s.id)
            const Icon = Ic[s.icon]
            return (
              <button
                key={s.id}
                className={`signal tier-${s.tier}${on ? ' on' : ''}`}
                onClick={() => toggle(s.id)}
              >
                <span className="signal-toggle" />
                <div className="signal-body">
                  <div className="signal-head">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon width="14" height="14" />
                      <span className="signal-title">{s.title}</span>
                    </span>
                    <span className="signal-count">{(s.count / 1000).toFixed(1)}K in geo</span>
                  </div>
                  <div className="signal-desc">{s.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="logic-row">
          <div className="logic-row-text">
            Match logic - properties must satisfy <strong>{logic === 'AND' ? 'every active signal' : 'any one active signal'}</strong>.
          </div>
          <div className="seg">
            <button className={`seg-item${logic === 'AND' ? ' active' : ''}`} onClick={() => setForm({ ...form, logic: 'AND' })}>
              AND
            </button>
            <button className={`seg-item${logic === 'OR' ? ' active' : ''}`} onClick={() => setForm({ ...form, logic: 'OR' })}>
              OR
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface-sub)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Distress score minimum</div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>Min score a property must carry to qualify (0–100)</div>
            </div>
          </div>
          <div className="preset-row">
            {[{ label: 'Any', value: '' }, { label: '30+', value: '30' }, { label: '40+', value: '40' }, { label: '60+', value: '60' }, { label: '80+', value: '80' }].map(o => (
              <button
                key={o.value}
                className={`preset-chip${distressFloor === o.value ? ' on' : ''}`}
                onClick={() => setForm({ ...form, distress_floor: o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
