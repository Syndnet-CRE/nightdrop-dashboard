import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginView() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const returnTo = sessionStorage.getItem('nd_return_url');
      sessionStorage.removeItem('nd_return_url');
      navigate(returnTo && returnTo !== '/login' ? returnTo : '/map');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#FFF", marginBottom: 6 }}>
            <span style={{ color: "var(--primary)" }}>N</span> Nightdrop
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Sign in to your subscriber account</div>
        </div>

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
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
          <Link to="/forgot-password" style={{ color: "var(--muted-foreground)", fontWeight: 500 }}>Forgot password?</Link>
        </div>
        <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "var(--muted-foreground)" }}>
          Need access? <a href="mailto:hello@nightdrop.io" style={{ color: "var(--primary)", fontWeight: 600 }}>Contact Nightdrop</a>
        </div>
      </div>
    </div>
  );
}
