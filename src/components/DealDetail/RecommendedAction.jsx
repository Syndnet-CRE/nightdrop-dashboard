import { Lightbulb } from 'lucide-react';

export function RecommendedAction({ deal }) {
  const bj = deal.briefJson || deal.brief_json || {};
  const text = bj.next_action || bj.recommended_action || bj.action;
  if (!text) return null;

  return (
    <section className="dd-recommended-action" aria-label="Recommended action">
      <div className="dd-recommended-action-icon" aria-hidden="true">
        <Lightbulb size={18} strokeWidth={2.2} />
      </div>
      <div className="dd-recommended-action-body">
        <span className="dd-recommended-action-label">Recommended Action</span>
        <p className="dd-recommended-action-text">{text}</p>
      </div>
    </section>
  );
}
