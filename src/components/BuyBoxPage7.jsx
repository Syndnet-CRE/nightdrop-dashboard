import { Ic } from './buybox-icons'
import SlotMachineCounter from './SlotMachineCounter'

const CADENCES = [
  { id: 'daily', title: 'Daily', sub: 'Top matches every morning', time: '06:00 AM EST' },
  { id: 'weekly', title: 'Weekly', sub: 'Curated digest each Monday', time: 'Mon 07:00 AM' },
  { id: 'realtime', title: 'Real-time', sub: 'Pushed as they hit the criteria', time: 'No SLA' },
]

export function BuyBoxPage7({ form, setForm, matchCount, previewState = 'resolved', summary, onActivate, activating, goToStep }) {
  const name = form.name || ''
  const delivery = form.delivery || { cadence: 'daily', max: 25 }
  const cadence = CADENCES.find(c => c.id === delivery.cadence) ?? CADENCES[0]

  return (
    <div className="page-fade">
      <header className="page-head">
        <div className="page-eyebrow">
          <span className="mono-step mono">07/07</span>
          <span className="sep" />
          <span>Review & activate</span>
        </div>
        <h1 className="page-title">Last look before it goes live.</h1>
        <p className="page-sub">Name the buy box, confirm your filters, and pick how often Nightdrop should send matches. You can pause or revise from the dashboard anytime.</p>
      </header>

      <div className="review-hero">
        <div>
          <div className="quote-label">Buy box name</div>
          <input
            className="review-name-input"
            value={name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Sun Belt SFR distress — Q2 '26"
          />
          <div className="review-meta">UUID bb-{Math.abs(name.length * 31337 + 124).toString(16).padStart(8,'0').slice(0,8)} · last edited just now</div>
        </div>
        <div className="review-count">
          <div className="review-count-label">Live match pool</div>
          <div className="review-count-val">
            <SlotMachineCounter value={matchCount} state={previewState} />
          </div>
          <div className="review-count-sub">↑ ready for delivery</div>
        </div>
      </div>

      <div className="review-section">
        <div className="review-section-title">
          <span>Filters</span>
          <button className="review-section-edit" onClick={() => goToStep?.(1)}>Edit ↗</button>
        </div>
        <div className="review-chips">
          {summary.length === 0 && <span className="caption">No filters configured — your match pool is the entire universe.</span>}
          {summary.map((s, i) => (
            <span key={i} className="f-chip">
              <span className="label">{s.label}</span>
              <span className="val">{s.val}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="review-section">
        <div className="review-section-title">
          <span>Delivery cadence</span>
        </div>
        <div className="delivery-grid">
          {CADENCES.map(c => (
            <button
              key={c.id}
              className={`delivery${delivery.cadence === c.id ? ' on' : ''}`}
              onClick={() => setForm({ ...form, delivery: { ...delivery, cadence: c.id } })}
            >
              <div className="delivery-head">
                <span className="delivery-title">{c.title}</span>
                <span className="delivery-radio" />
              </div>
              <div className="delivery-sub">{c.sub}</div>
              <div className="delivery-time">{c.time}</div>
            </button>
          ))}
        </div>

      </div>

      <div className="activate-ribbon">
        <div className="activate-ribbon-text">
          You're about to activate <strong>{name || 'this buy box'}</strong>.{' '}
          {cadence.id === 'realtime'
            ? <>Matches will be pushed <strong>as they arrive</strong>.</>
            : <>The first batch will land in your inbox at <strong>{cadence.time}</strong>.</>
          }{' '}
          Pause or adjust anytime — no charges either way.
        </div>
        <button className="btn btn-fire" onClick={onActivate} disabled={activating} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activating ? 'Placing trade…' : <>Activate buy box <Ic.zap width="16" height="16" /></>}
        </button>
      </div>
    </div>
  )
}
