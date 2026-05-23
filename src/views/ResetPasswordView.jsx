import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export function ResetPasswordView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/dealfeed/auth/reset-password', { email, token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <p style={{ color: "#FF7378", marginBottom: 16 }}>Invalid reset link.</p>
          <Link to="/forgot-password" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#FFF", marginBottom: 6 }}>
            <span style={{ color: "var(--primary)" }}>D</span> Dispatch
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Set a new password</div>
        </div>

        {success ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>&#10003;</div>
            <p style={{ color: "#c0c0c0", lineHeight: 1.6 }}>Password updated. Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label>New password</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 12 chars, 1 uppercase, 1 number"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div style={{ fontSize: 12.5, color: "#FF7378", padding: "8px 12px", background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.3)", borderRadius: 6 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn primary" disabled={loading} style={{ marginTop: 4, padding: "11px 0", fontSize: 14, fontWeight: 700 }}>
              {loading ? "Saving…" : "Set New Password"}
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
              <Link to="/forgot-password" style={{ color: "var(--primary)", fontWeight: 600 }}>Request a new link</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
