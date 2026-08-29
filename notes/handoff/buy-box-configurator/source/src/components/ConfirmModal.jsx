import { I } from './Icons';

const CONFIGS = {
  pause: {
    title: "Pause your account?",
    body: "Nightly runs will stop. Your buy boxes, data, and history are preserved. You can resume any time and billing pauses immediately.",
    btn: "Pause Account",
    danger: false
  },
  cancel: {
    title: "Cancel your subscription?",
    body: "Service will end at the close of your current billing period (Mar 12, 2027). Your buy boxes will be deleted after 30 days. This cannot be undone after the deletion grace period.",
    btn: "Cancel Subscription",
    danger: true
  },
  'pause-box': {
    title: "Pause this buy box?",
    body: "Nightly runs will stop for this buy box. Your data and history are preserved. Resume any time.",
    btn: "Pause Buy Box",
    cancelBtn: "Keep Running",
    danger: false
  },
};

export function ConfirmModal({ kind, onClose, onConfirm }) {
  const cfg = CONFIGS[kind] || CONFIGS.pause;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{cfg.title}</h3>
          <button className="drawer-close" onClick={onClose}><I.Close size={14}/></button>
        </div>
        <div className="modal-body">{cfg.body}</div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>{cfg.cancelBtn || 'Keep Subscription'}</button>
          <button className={cfg.danger ? "btn danger" : "btn"} onClick={() => { onConfirm?.(); onClose(); }} style={cfg.danger ? { background: "#E5484D", borderColor: "#E5484D", color: "#FFF" } : null}>{cfg.btn}</button>
        </div>
      </div>
    </div>
  );
}
