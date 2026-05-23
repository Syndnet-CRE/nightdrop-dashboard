import { fmt, hasVal } from '../../lib/format.js';

const STAGE_LABELS = {
  new: 'New',
  due_diligence: 'Researching',
  contacted: 'Contacted',
  negotiating: 'Negotiating',
  offer_made: 'Closed',
  dead: 'Dead',
};

function dateLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PipelineStatusCard({ deal }) {
  const status = deal.status || 'new';
  const stageLabel = STAGE_LABELS[status] || fmt(status);
  const dateAdded = deal.sentAt || deal.sent_at || deal.updated_at || deal.created_at;
  const notes = deal.notes && String(deal.notes).trim();
  const notesCount = notes ? 1 : 0;

  return (
    <section className="dd-pipeline-card" aria-label="Pipeline status">
      <header className="dd-pipeline-card-head">
        <h2 className="dd-pipeline-card-title">Pipeline Status</h2>
      </header>

      <div className="dd-pipeline-rows">
        <div className="dd-pipeline-row">
          <span className="dd-pipeline-row-label">Current Stage</span>
          <span className={`dd-pipeline-stage-pill stage-${status}`}>{stageLabel}</span>
        </div>

        {hasVal(dateAdded) && (
          <div className="dd-pipeline-row">
            <span className="dd-pipeline-row-label">Date Added</span>
            <span className="dd-pipeline-row-value">{dateLabel(dateAdded)}</span>
          </div>
        )}

        <div className="dd-pipeline-row">
          <span className="dd-pipeline-row-label">Notes</span>
          <span className="dd-pipeline-row-value dd-pipeline-notes-count">
            {notesCount === 0 ? 'No notes' : `${notesCount} note`}
          </span>
        </div>
      </div>
    </section>
  );
}
