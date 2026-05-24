import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setToken, clearToken } from '../lib/api';

const AuthContext = createContext(null);
const DEV = import.meta.env.DEV;

export function AuthProvider({ children }) {
  const [subscriber, setSubscriber] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Try existing token first.
      const existing = localStorage.getItem('nd_token');
      if (existing) {
        try {
          const data = await api.get('/api/dealfeed/auth/me');
          if (!cancelled && data?.subscriber) {
            setSubscriber(data.subscriber);
            return;
          }
        } catch { /* token invalid — fall through */ }
        clearToken();
      }

      // No valid token. In DEV, auto-login via the vite plugin (/__dev_login).
      // The plugin reads .dev-auth.json (gitignored) and POSTs to the prod
      // backend. Frontend never sees the creds. Production builds skip this.
      if (DEV) {
        try {
          const r = await fetch('/__dev_login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (r.ok) {
            const data = await r.json();
            if (!cancelled && data?.token && data?.subscriber) {
              setToken(data.token);
              setSubscriber(data.subscriber);
              if (location.pathname === '/' || location.pathname === '/login') {
                let returnTo;
                try {
                  returnTo = sessionStorage.getItem('nd_return_url');
                  sessionStorage.removeItem('nd_return_url');
                } catch { /* ignore */ }
                navigate(returnTo && returnTo !== '/login' ? returnTo : '/map', { replace: true });
              }
              return;
            }
          }
        } catch { /* fall through to manual /login */ }
      }
      // Production or DEV without creds → AppShell will redirect to /login.
    }

    init().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const data = await api.post('/api/dealfeed/auth/login', { email, password });
    setToken(data.token);
    setSubscriber(data.subscriber);
    return data;
  }

  function loginWithToken(token, subscriber) {
    setToken(token);
    setSubscriber(subscriber);
  }

  function logout() {
    clearToken();
    setSubscriber(null);
  }

  return (
    <AuthContext.Provider value={{ subscriber, loading, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
