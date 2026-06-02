import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { parseInvitesFromText, validateInvite, dedupeByEmail, summarizeBulkSend, isSendOk, inviteErrorMessage } from '../lib/inviteHelpers';
import { useToast } from '../contexts/ToastContext';
import { I } from '../components/Icons';

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function InviteView() {
  const addToast = useToast();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [error, setError] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const data = await api.get('/api/dealfeed/invites');
      setQueue(data.invites || []);
    } catch {
      setError('Failed to load invite queue.');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadQueue(); }, [loadQueue]);

  useEffect(() => {
    const parsed = parseInvitesFromText(text);
    setPreview(dedupeByEmail(parsed)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [text]);

  const previewErrors = preview.map(inv => validateInvite(inv)).filter(Boolean);
  const canAdd = preview.length > 0 && previewErrors.length === 0;

  async function handleAdd() {
    if (!canAdd) return;
    setAdding(true);
    setError(null);
    try {
      const data = await api.post('/api/dealfeed/invites', { invites: preview });
      if (data.skipped?.length > 0) {
        setError(`Added ${data.added.length}. Skipped ${data.skipped.length} (already in system or invalid).`);
      }
      setText('');
      setPreview([]);
      await loadQueue();
    } catch {
      setError('Failed to add invites.');
    } finally {
      setAdding(false);
    }
  }

  async function handleSendAll() {
    setSending(true);
    setSendResult(null);
    setError(null);
    try {
      const data = await api.post('/api/dealfeed/invites/send', {});
      // A 200 here does NOT mean every invite sent — read per-result ok/error.
      setSendResult(summarizeBulkSend(data));
      await loadQueue();
    } catch {
      setError('Failed to send invites.');
    } finally {
      setSending(false);
    }
  }

  async function handleResend(row) {
    setResendingId(row.id);
    try {
      // A 2xx no longer guarantees delivery — verify ok, surface the real error.
      const res = await api.post(`/api/dealfeed/invites/resend/${row.id}`, {});
      if (!isSendOk(res)) {
        addToast(inviteErrorMessage({ body: res }, `Failed to resend to ${row.email}`), 'error');
        return;
      }
      addToast(`Invite resent to ${row.email}`, 'success');
      await loadQueue();
    } catch (err) {
      addToast(inviteErrorMessage(err, `Failed to resend to ${row.email}`), 'error');
    } finally {
      setResendingId(null);
    }
  }

  async function handleRemove(id) {
    try {
      await api.delete(`/api/dealfeed/invites/${id}`);
      setQueue(q => q.filter(r => r.id !== id));
    } catch {
      setError('Failed to remove invite.');
    }
  }

  const unsent = queue.filter(r => !r.invited_at);

  return (
    <div className="invite-view">
      <div className="iv-header">
        <div>
          <h1 className="iv-title">Invite Queue</h1>
          <p className="iv-sub">Add people by email, review the list, then send in one batch.</p>
        </div>
        {!loadingQueue && (
          <div className="iv-header-stats">
            <div className="iv-stat-chip">
              <span className="num">{queue.length}</span>
              <span className="lbl">In queue</span>
            </div>
            <div className="iv-stat-divider" />
            <div className="iv-stat-chip">
              <span className="num">{unsent.length}</span>
              <span className="lbl">Unsent</span>
            </div>
          </div>
        )}
      </div>

      <div className="iv-card">
        <div className="iv-card-title">Add contacts</div>
        <p className="iv-hint">
          One per line. Formats: <code>email@example.com</code> or <code>First Last &lt;email@example.com&gt;</code>
        </p>
        <textarea
          className="iv-textarea"
          rows={6}
          placeholder={'jon@example.com\nJane Doe <jane@example.com>'}
          value={text}
          onChange={e => setText(e.target.value)}
          spellCheck={false}
        />

        {preview.length > 0 && (
          <div className="iv-preview">
            <div className="iv-preview-label">{preview.length} contact{preview.length !== 1 ? 's' : ''} parsed</div>
            <table className="iv-table">
              <thead>
                <tr><th>Email</th><th>Name</th><th>Valid</th></tr>
              </thead>
              <tbody>
                {preview.map((inv, i) => {
                  const err = validateInvite(inv);
                  return (
                    <tr key={i} className={err ? 'iv-row-err' : ''}>
                      <td>{inv.email}</td>
                      <td>{inv.full_name || <span className="iv-muted">none</span>}</td>
                      <td>
                        {err
                          ? <span className="iv-badge iv-badge-err">{err}</span>
                          : <span className="iv-badge iv-badge-ok"><I.Check size={11}/> OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <button
          className="iv-btn iv-btn-primary"
          onClick={handleAdd}
          disabled={!canAdd || adding}
        >
          {adding ? 'Adding...' : preview.length > 0 ? `Add ${preview.length} to queue` : 'Add to queue'}
        </button>
      </div>

      {error && <div className="iv-error">{error}</div>}
      {sendResult && (
        <div className={`iv-send-result${sendResult.failed > 0 ? ' iv-send-result-warn' : ''}`}>
          <div>
            Sent {sendResult.sent} invite{sendResult.sent !== 1 ? 's' : ''}.
            {sendResult.failed > 0 && ` ${sendResult.failed} failed:`}
          </div>
          {sendResult.failures.length > 0 && (
            <ul className="iv-send-failures">
              {sendResult.failures.map((f, i) => (
                <li key={i}><strong>{f.email}</strong> — {f.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="iv-card">
        <div className="iv-queue-header">
          <div className="iv-queue-meta">
            <span className="iv-card-title">Queue</span>
            {!loadingQueue && (
              <span className="iv-count">{queue.length} total &middot; {unsent.length} unsent</span>
            )}
          </div>
          <button className="iv-btn iv-btn-send" onClick={handleSendAll} disabled={unsent.length === 0 || sending}>
            <I.Mail size={13}/>
            {sending ? 'Sending...' : unsent.length > 0 ? `Send to ${unsent.length}` : 'Send all'}
          </button>
        </div>

        {loadingQueue ? (
          <p className="iv-muted">Loading...</p>
        ) : queue.length === 0 ? (
          <p className="iv-muted">Queue is empty. Add contacts above.</p>
        ) : (
          <table className="iv-table iv-table-full">
            <thead>
              <tr><th>Email</th><th>Name</th><th>Added</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {queue.map(row => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.full_name || <span className="iv-muted">&mdash;</span>}</td>
                  <td className="iv-muted">{fmtDate(row.created_at)}</td>
                  <td>
                    {row.invited_at
                      ? <span className="iv-badge iv-badge-sent">Sent {fmtDate(row.invited_at)}</span>
                      : <span className="iv-muted">Not sent</span>}
                  </td>
                  <td className="iv-row-actions">
                    {row.invited_at && (
                      <button
                        className="iv-resend-btn"
                        onClick={() => handleResend(row)}
                        disabled={resendingId === row.id}
                        title="Resend invite"
                      >
                        <I.Mail size={13}/>
                        {resendingId === row.id ? 'Resending…' : 'Resend'}
                      </button>
                    )}
                    <button className="iv-remove-btn" onClick={() => handleRemove(row.id)} title="Remove">
                      <I.Close size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
