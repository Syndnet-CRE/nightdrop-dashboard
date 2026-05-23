import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/dealfeed/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#FFF", marginBottom: 6 }}>
            <span style={{ color: "var(--primary)" }}>D</span> Dispatch
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Reset your password</div>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>&#10003;</div>
            <p style={{ color: "#c0c0c0", lineHeight: 1.6, marginBottom: 24 }}>
              If that email is in our system, you'll receive a reset link within a minute.
            </p>
            <Link to="/login" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@firm.com"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div style={{ fontSize: 12.5, color: "#FF7378", padding: "8px 12px", background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.3)", borderRadius: 6 }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn primary" disabled={loading} style={{ marginTop: 4, padding: "11px 0", fontSize: 14, fontWeight: 700 }}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
              <Link to="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>Back to sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
