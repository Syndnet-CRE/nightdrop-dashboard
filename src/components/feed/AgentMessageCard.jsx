function typeLabel(type) {
  switch (type) {
    case 'run':    return { text: 'RUN',    color: 'var(--primary)' };
    case 'signal': return { text: 'SIGNAL', color: '#D97706' };
    case 'market': return { text: 'MARKET', color: '#3E7BFA' };
    default:       return { text: 'AGENT',  color: 'var(--muted-foreground)' };
  }
}

function fmtTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function AgentMessageCard({ message }) {
  const { text: tagText, color: tagColor } = typeLabel(message.message_type);

  return (
    <div className="agent-message-card">
      <div className="agent-message-header">
        <span className="agent-message-avatar">N</span>
        <span className="agent-message-name">Nightdrop Agent</span>
        <span
          className="agent-message-type-tag"
          style={{ color: tagColor, borderColor: tagColor }}
        >
          {tagText}
        </span>
        {message.created_at && (
          <span className="agent-message-ts">{fmtTs(message.created_at)}</span>
        )}
      </div>
      <div className="agent-message-content">{message.content}</div>
    </div>
  );
}
