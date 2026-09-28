const TOKEN_KEY = 'novaserve_token';
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string | null) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }
async function request(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
export const api = {
  get: (p: string) => request(p),
  post: (p: string, body?: any) => request(p, { method: 'POST', body: JSON.stringify(body || {}) }),
  put: (p: string, body?: any) => request(p, { method: 'PUT', body: JSON.stringify(body || {}) }),
  del: (p: string) => request(p, { method: 'DELETE' }),
};
