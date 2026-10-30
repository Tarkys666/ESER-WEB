(() => {
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const defaultBase = localHost ? 'http://127.0.0.1:8787' : 'https://api.dilekmakina.net';
  const base = (window.DILEK_API_BASE || defaultBase).replace(/\/$/, '');
  const sessionKey = 'dilek-admin-session';
  let token = localStorage.getItem(sessionKey) || '';

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token && path.startsWith('/api/admin/')) headers.set('Authorization', `Bearer ${token}`);
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
    get: (path, options) => request(path, options),
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
      let image = file;
      if ('createImageBitmap' in window && file.type.startsWith('image/')) {
        try {
          const bitmap = await createImageBitmap(file);
          const maxEdge = kind === 'slide' ? 1600 : 1200;
          const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          bitmap.close();
          image = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
          if (!image) throw new Error('Görsel WebP biçimine dönüştürülemedi.');
          if (image.size > 5 * 1024 * 1024) image = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.68));
          if (!image || image.size > 5 * 1024 * 1024) throw new Error('Sıkıştırılmış görsel 5 MB sınırını aşıyor.');
        } catch (error) {
          if (/Sıkıştırılmış görsel|WebP biçimine/.test(error.message)) throw error;
          image = file;
        }
      }
      const result = await request(`/api/admin/media?kind=${encodeURIComponent(kind)}`, {
        method: 'POST', headers: { 'Content-Type': image.type || file.type }, body: image,
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
    imageUrl(key) {
      if (key.startsWith('assets/')) return key;
      const path = key.startsWith('/api/media/')
        ? key.split('/').map(encodeURIComponent).join('/')
        : `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
      return `${base}${path}`;
    },
  };
})();
