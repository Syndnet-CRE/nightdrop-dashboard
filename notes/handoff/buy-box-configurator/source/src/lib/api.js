const BASE = import.meta.env.VITE_API_BASE_URL || '';

function getToken() {
  return localStorage.getItem('nd_token');
}

export function setToken(token) {
  localStorage.setItem('nd_token', token);
}

export function clearToken() {
  localStorage.removeItem('nd_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    const returnTo = window.location.pathname + window.location.search;
    if (returnTo && returnTo !== '/login') sessionStorage.setItem('nd_return_url', returnTo);
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const error = new Error(body.message || body.error || `API error ${res.status}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

// opts may carry { signal } for AbortController-based request cancellation.
export const api = {
  get: (path, opts = {}) => request(path, { ...opts }),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  patch: (path, body, opts = {}) => request(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: (path, opts = {}) => request(path, { method: 'DELETE', ...opts }),
};
