import { fmt } from '../../lib/format';

export function DealNarrative({ deal }) {
  const narrative = deal?.narrative ?? deal?.briefJson?.narrative ?? deal?.brief_json?.narrative ?? deal?.brief;
  const tags = deal?.briefJson?.tags ?? deal?.brief_json?.tags ?? [];
  const recommendation = deal?.briefJson?.recommendation ?? deal?.brief_json?.recommendation;
  const offerRange = deal?.briefJson?.offer_range ?? deal?.brief_json?.offer_range;

  if (!deal) return null;

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <section style={{ margin: '0 24px', marginTop: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 8 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'block', boxShadow: '0 0 0 3px var(--accent-tint)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>AI Narrative</span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {tags.map((t) => {
              const label = typeof t === 'string' ? t : t.label;
              const color = typeof t === 'object' ? t.color : 'var(--accent)';
              return (
                <span
                  key={label}
                  style={{
                    color: color,
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${color}30`,
                    borderRadius: 4,
                    padding: '3px 7px',
                    fontFamily: '"DM Sans"',
                    fontSize: '12px',
                    fontWeight: '500',
                    textAlign: 'center',
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 0 }}>
            <div style={{ paddingTop: 3 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--accent-tint)',
                  border: '1px solid var(--accent)30',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)' }}>V1</span>
              </div>
              <div style={{ width: 1, height: 'calc(100% - 24px)', background: 'var(--border-faint)', margin: '4px auto 0', marginLeft: 9 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 10, letterSpacing: '0.04em' }}>
                V1 INTELLIGENCE · DEAL {fmt(deal.id)} · {today}
              </div>
              {narrative ? (
                narrative.split('\n\n').map((p, i) => (
                  <p
                    key={i}
                    style={{
                      margin: 0,
                      marginBottom: 14,
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: i === 0 ? 'var(--fg)' : 'var(--fg-muted)',
                    }}
                  >
                    {fmt(p)}
                  </p>
                ))
              ) : (
                <p style={{ margin: 0, marginBottom: 14, fontSize: 14, lineHeight: 1.65, color: 'var(--muted-foreground)' }}>
                  AI narrative not yet generated for this deal.
                </p>
              )}
            </div>
          </div>

          {/* Recommended action strip */}
          {(recommendation || offerRange) && (
            <div
              style={{
                marginTop: 4,
                padding: '12px 14px',
                background: 'var(--bg-sunken)',
                borderRadius: 6,
                border: '1px solid var(--border-faint)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  Recommended Strategy
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{fmt(recommendation)}</div>
              </div>
              {offerRange && (
                <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                    Suggested Offer
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{fmt(offerRange)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
