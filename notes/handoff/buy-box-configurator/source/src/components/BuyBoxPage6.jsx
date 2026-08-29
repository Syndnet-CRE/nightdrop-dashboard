const THRESHOLDS = [
  { id: 'volume', pct: 70, title: 'Volume', sub: 'More deals, wider funnel',
    desc: "You'll get more deals. Some won't check every box but they're still worth a look. Good for investors who want a wide funnel and are comfortable filtering themselves.",
    deals: [15, 25] },
  { id: 'balanced', pct: 80, title: 'Balanced', sub: 'The default',
    desc: 'Properties need to hit most of your criteria to land in your feed. This is where most active buyers want to be.',
    deals: [8, 15] },
  { id: 'precision', pct: 90, title: 'Precision', sub: 'Fewer deals, tighter signal',
    desc: 'Every property that comes through hits almost everything you set. Good for investors who want to move fast when something lands, not sort through volume.',
    deals: [2, 6] },
]

export function BuyBoxPage6({ form, setForm }) {
  const threshold = form.threshold || 'balanced'
  const matchCount = form.matchCount || 0

  const active = THRESHOLDS.find(t => t.id === threshold) || THRESHOLDS[1]

  const passedPool = Math.max(8, Math.round(matchCount * (active.pct === 70 ? 0.045 : active.pct === 80 ? 0.022 : 0.008)))

  return (
    <div className="page-fade">
      <header className="page-head">
        <div className="page-eyebrow">
          <span className="mono-step mono">06/07</span>
          <span className="sep" />
          <span>Match threshold</span>
        </div>
        <h1 className="page-title">How good does a match need to be?</h1>
        <p className="page-sub">The threshold sets overall quality. Tighter means fewer, better matches. Looser means more deals to sort through. You can change this anytime from the dashboard.</p>
      </header>

      <section className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="section-title-num">A</span> Match threshold
          </div>
          <span className="section-meta">Pick one</span>
        </div>

        <div className="threshold-grid">
          {THRESHOLDS.map(t => {
            const on = threshold === t.id
            return (
              <button
                key={t.id}
                className={`threshold${on ? ' on' : ''}`}
                onClick={() => setForm({ ...form, threshold: t.id })}
              >
                <div className="threshold-pct mono">{t.pct}<span className="threshold-pct-sym">%{t.id === 'precision' ? '+' : ''}</span></div>
                <div className="threshold-title">{t.title}</div>
                <div className="threshold-sub">{t.sub}</div>
                <div className="threshold-desc">{t.desc}</div>
                <div className="threshold-radio" />
              </button>
            )
          })}
        </div>

        <div className="threshold-estimate">
          <span className="threshold-estimate-dot" />
          <span>
            At <strong className="mono">{active.pct}%{active.id === 'precision' ? '+' : ''}</strong> threshold,
            your current criteria match approximately <strong className="mono">{passedPool.toLocaleString('en-US')}</strong> properties.
            You'll receive <strong className="mono">up to 5</strong> deals per delivery.
          </span>
        </div>
      </section>
    </div>
  )
}
