import { I } from './Icons';

export function BuyerSearchComingSoonModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3>Buyer Search</h3>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(29,175,41,0.12)',
              color: 'var(--green)',
              border: '1px solid rgba(29,175,41,0.25)',
              borderRadius: 4,
              padding: '2px 7px',
            }}>
              Coming Soon
            </span>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <I.Close size={14} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }}>
            Find qualified buyers the same way you find deals.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            You configure a buyer profile — asset class, geography, deal size, financing profile — and Night Drop
            runs nightly to match active buyers against those criteria. Matching buyers get delivered to your feed
            every morning, ranked by intent signals and recency.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            No cold lists. No manual research. The same distress scoring and owner intelligence you rely on for
            deals, applied to the buy side.
          </p>
          <p style={{ margin: 0, color: 'var(--ink-3)' }}>
            This feature is in development and launching within the quarter. You'll be notified as soon as
            it's live.
          </p>
        </div>

        <div className="modal-foot">
          <button className="btn primary" onClick={onClose}>Got it</button>
        </div>

      </div>
    </div>
  );
}
