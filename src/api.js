(() => {
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const defaultBase = localHost ? 'http://127.0.0.1:8787' : 'https://eser-sunucu.yaramazeser1.workers.dev';
  const base = (window.DILEK_API_BASE || defaultBase).replace(/\/$/, '');
  const sessionKey = 'dilek-admin-session';
  let token = localStorage.getItem(sessionKey) || '';

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob)) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${base}${path}`, { ...options, headers, signal: options.signal || AbortSignal.timeout(20000) });
    if (response.status === 204) return null;
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error?.message || `İstek başarısız (${response.status})`);
      error.status = response.status;
      error.code = result.error?.code;
      throw error;
    }
    return result;
  }

  window.DILEK_API = {
    request,
    get: (path) => request(path),
    send: (path, method, body) => request(path, { method, body: JSON.stringify(body) }),
    async login(email, password) {
      const session = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      token = session.token;
      localStorage.setItem(sessionKey, token);
      return session;
    },
    async me() { return request('/api/admin/me'); },
    logout() { token = ''; localStorage.removeItem(sessionKey); },
    async upload(kind, file) {
      const result = await request(`/api/admin/media?kind=${encodeURIComponent(kind)}`, {
        method: 'POST', headers: { 'Content-Type': file.type }, body: file,
      });
      return result;
    },
    async removeMedia(key) {
      return request(`/api/admin/media?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    },
    async previewImage(key) {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${base}/api/media/${key.split('/').map(encodeURIComponent).join('/')}`, { headers, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Görsel görüntülenemedi');
      return URL.createObjectURL(await response.blob());
    },
    imageUrl: (key) => key.startsWith('assets/') ? key : `${base}/api/media/${key.split('/').map(encodeURIComponent).join('/')}`,
  };
})();
