import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export function InviteClaimView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ full_name: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/api/dealfeed/auth/invite/${token}`)
      .then(res => {
        setEmail(res.email);
        setStatus('ready');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  function update(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await api.post(`/api/dealfeed/auth/invite/${token}/claim`, {
        full_name: form.full_name,
        password: form.password,
      });
      loginWithToken(res.token, res.subscriber);
      navigate('/onboarding');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--app-bg)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '36px 32px',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}>
            <span style={{
              background: 'var(--green)',
              color: '#000',
              fontWeight: 700,
              fontSize: 13,
              padding: '3px 8px',
              borderRadius: 4,
              letterSpacing: '0.05em',
            }}>D</span>
            <span style={{ color: 'var(--ink-1)', fontSize: 16, fontWeight: 600 }}>Dispatch</span>
          </div>

          {status === 'loading' && (
            <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Verifying your invite...</p>
          )}

          {status === 'invalid' && (
            <>
              <h2 style={{ color: 'var(--ink-1)', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
                Invite invalid or expired
              </h2>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                This invite link is no longer valid. Contact Brady to request a new one.
              </p>
            </>
          )}

          {status === 'ready' && (
            <>
              <h2 style={{ color: 'var(--ink-1)', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
                Set up your account
              </h2>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: 0 }}>
                You were invited as <strong style={{ color: 'var(--ink-2)' }}>{email}</strong>
              </p>
            </>
          )}
        </div>

        {status === 'ready' && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Full name
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => update('full_name', e.target.value)}
                required
                autoFocus
                placeholder="Jane Smith"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                placeholder="8+ chars, 1 uppercase, 1 number, 1 special"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Confirm password
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
                required
                placeholder="Repeat password"
                style={inputStyle}
              />
            </div>

            {errorMsg && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, margin: '0 0 16px' }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !form.full_name || !form.password || !form.confirm}
              style={{
                width: '100%',
                padding: '12px 0',
                background: submitting ? 'var(--border)' : 'var(--green)',
                color: '#000',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                borderRadius: 8,
                cursor: submitting ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  background: 'var(--bg-input, var(--app-bg))',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--ink-1)',
  fontSize: 14,
  outline: 'none',
};
