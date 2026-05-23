import { Check } from 'lucide-react';

const STAGES = [
  { id: 'new',            label: 'New' },
  { id: 'due_diligence',  label: 'Researching' },
  { id: 'contacted',      label: 'Contacted' },
  { id: 'negotiating',    label: 'Negotiating' },
  { id: 'offer_made',     label: 'Closed' },
];

function stageStateFor(currentStatus) {
  if (currentStatus === 'dead') return { dead: true, currentIndex: -1 };
  const idx = STAGES.findIndex((s) => s.id === currentStatus);
  return { dead: false, currentIndex: idx >= 0 ? idx : 0 };
}

export function StageIndicator({ status, onStageChange, disabled = false }) {
  const { dead, currentIndex } = stageStateFor(status);

  return (
    <div className={`dd-stage-bar${dead ? ' dead' : ''}`} role="group" aria-label="Deal pipeline stage">
      <ol className="dd-stage-list">
        {STAGES.map((s, i) => {
          const isCompleted = !dead && i < currentIndex;
          const isCurrent = !dead && i === currentIndex;
          const stateClass = isCompleted ? 'completed' : isCurrent ? 'current' : 'pending';
          return (
            <li key={s.id} className={`dd-stage-item ${stateClass}`}>
              <button
                type="button"
                className="dd-stage-btn"
                onClick={() => !disabled && onStageChange && onStageChange(s.id)}
                disabled={disabled}
                aria-current={isCurrent ? 'step' : undefined}
                title={`Mark deal as ${s.label}`}
              >
                <span className="dd-stage-pip" aria-hidden="true">
                  {isCompleted ? <Check size={11} strokeWidth={3} /> : <span>{i + 1}</span>}
                </span>
                <span className="dd-stage-label">{s.label}</span>
              </button>
              {i < STAGES.length - 1 && (
                <span className={`dd-stage-connector${isCompleted ? ' filled' : ''}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
      {dead && (
        <div className="dd-stage-dead-flag">
          <span>Marked as dead</span>
          <button
            type="button"
            className="dd-stage-dead-reset"
            onClick={() => !disabled && onStageChange && onStageChange('new')}
            disabled={disabled}
          >
            Reopen
          </button>
        </div>
      )}
    </div>
  );
}
