window.createSlideManager = (client) => {
  const panel = document.querySelector('#admin-slides');
  const list = document.querySelector('#slide-list');
  const status = document.querySelector('#slides-status');
  const storage = client.storage.from('hero-images');
  const dirtyForms = new Set();
  const pendingCleanup = new Set();
  let loaded = false, version = 0;
  const imageUrl = (path) => path.startsWith('assets/') ? path : storage.getPublicUrl(path).data.publicUrl;
  const node = (tag, text, className) => {
    const result = document.createElement(tag);
    if (text) result.textContent = text;
    if (className) result.className = className;
    return result;
  };
  const cleanup = async (paths) => {
    paths.forEach((path) => pendingCleanup.add(path));
    if (!pendingCleanup.size) return;
    const { error } = await storage.remove([...pendingCleanup]);
    if (error) {
      status.textContent = 'Kullanılmayan bazı görseller depodan temizlenemedi. Temizliği tekrar deneyin.';
      document.querySelector('#slides-cleanup').hidden = false;
      return;
    }
    pendingCleanup.clear();
    document.querySelector('#slides-cleanup').hidden = true;
  };
  const card = (initial = {}) => {
    let record = initial, previewUrl;
    const form = node('form', null, 'slide-editor');
    const image = node('img'); image.alt = 'Slayt önizlemesi'; image.loading = 'lazy';
    if (record.image_path) image.src = imageUrl(record.image_path); else image.hidden = true;
    const body = node('div', null, 'slide-fields');
    const fields = {};
    for (const [key, title, type] of [['alt_text', 'Görsel açıklaması', 'text'], ['sort_order', 'Sıra (küçük sayı önce)', 'number'], ['is_active', 'Ana sayfada göster', 'checkbox'], ['file', 'Görsel seç / değiştir', 'file']]) {
      const label = node('label', title); const input = node('input'); input.type = type; input.name = key;
      if (type === 'checkbox') input.checked = record.is_active ?? true;
      else if (type !== 'file') input.value = record[key] ?? (key === 'sort_order' ? list.children.length : '');
      if (type === 'number') { input.min = 0; input.max = 1000000; input.required = true; }
      if (type === 'text') input.maxLength = 500;
      if (type === 'file') input.accept = 'image/jpeg,image/png,image/webp,image/avif';
      label.append(input); body.append(label); fields[key] = input;
    }
    const actions = node('div', null, 'slide-actions');
    const save = node('button', 'Slaytı kaydet', 'secondary-button'); save.type = 'submit';
    const remove = node('button', record.id ? 'Slaytı sil' : 'Vazgeç', 'secondary-button danger-button'); remove.type = 'button';
    const result = node('p'); result.setAttribute('role', 'status');
    actions.append(save, remove); body.append(actions, result); form.append(image, body);
    form.addEventListener('input', () => dirtyForms.add(form));
    fields.file.addEventListener('change', () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const file = fields.file.files[0];
      if (file) { previewUrl = URL.createObjectURL(file); image.src = previewUrl; image.hidden = false; }
    });
    const busy = (value) => { form.querySelectorAll('input,button').forEach((control) => { control.disabled = value; }); };
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      let uploaded;
      const file = fields.file.files[0];
      const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
      if ((!record.id && !file) || (file && (!extensions[file.type] || !file.size || file.size > 5 * 1024 ** 2))) {
        result.textContent = 'JPEG, PNG, WebP veya AVIF seçin; en fazla 5 MB.'; return;
      }
      busy(true); result.textContent = 'Kaydediliyor…';
      try {
        if (file) {
          uploaded = `slides/${crypto.randomUUID()}.${extensions[file.type]}`;
          const { error } = await storage.upload(uploaded, file, { contentType: file.type });
          if (error) throw error;
        }
        const values = { image_path: uploaded || record.image_path, alt_text: fields.alt_text.value.trim(), sort_order: Number(fields.sort_order.value), is_active: fields.is_active.checked };
        const request = record.id ? client.from('hero_slides').update(values).eq('id', record.id).eq('updated_at', record.updated_at) : client.from('hero_slides').insert(values);
        const { data, error } = await request.select().single();
        if (error) throw error;
        const oldPath = record.image_path;
        record = data; dirtyForms.delete(form); fields.file.value = '';
        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        image.src = imageUrl(record.image_path); image.hidden = false; remove.textContent = 'Slaytı sil';
        result.textContent = record.is_active ? 'Kaydedildi; ana sayfada yayında.' : 'Kaydedildi; ana sayfada gizli.';
        if (uploaded && oldPath?.startsWith('slides/')) await cleanup([oldPath]);
      } catch {
        if (uploaded) await cleanup([uploaded]);
        result.textContent = 'Kaydedilemedi. Bağlantıyı kontrol edin; başka oturumda değiştiyse listeyi yenileyin.';
      } finally { busy(false); }
    });
    remove.addEventListener('click', async () => {
      if (!record.id) { dirtyForms.delete(form); if (previewUrl) URL.revokeObjectURL(previewUrl); form.remove(); return; }
      if (!confirm('Bu slayt ve yüklenen görseli kalıcı olarak silinsin mi? Yalnızca yayından kaldırmak için göster seçimini kapatıp kaydedebilirsiniz.')) return;
      busy(true);
      const { data, error } = await client.from('hero_slides').delete().eq('id', record.id).eq('updated_at', record.updated_at).select('id').maybeSingle();
      if (error || !data) { result.textContent = 'Silinemedi. Başka oturumda değişmiş olabilir; listeyi yenileyin.'; busy(false); return; }
      dirtyForms.delete(form); if (previewUrl) URL.revokeObjectURL(previewUrl); form.remove();
      status.textContent = 'Slayt silindi.';
      if (record.image_path.startsWith('slides/')) await cleanup([record.image_path]);
    });
    form.releasePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    return form;
  };
  const load = async () => {
    if (loaded) return;
    const requestVersion = ++version;
    status.textContent = 'Slaytlar yükleniyor…';
    const { data, error } = await client.from('hero_slides').select('*').order('sort_order').order('id');
    if (requestVersion !== version) return;
    if (error) { status.textContent = 'Slaytlar yüklenemedi. Listeyi yenileyin.'; return; }
    [...list.children].forEach((form) => form.releasePreview());
    list.replaceChildren(...data.map(card)); loaded = true; dirtyForms.clear();
    status.textContent = `${data.length} slayt · Her kartı ayrı kaydedin. Göster seçimini kapatarak yayından kaldırabilirsiniz.`;
  };
  document.querySelector('#add-slide').addEventListener('click', () => { panel.querySelector('details').open = true; const form = card(); list.prepend(form); dirtyForms.add(form); form.querySelector('input').focus(); });
  document.querySelector('#reload-slides').addEventListener('click', () => {
    if (dirtyForms.size && !confirm('Kaydedilmeyen slayt değişikliklerinden vazgeçilsin mi?')) return;
    loaded = false; load();
  });
  document.querySelector('#slides-cleanup').addEventListener('click', () => cleanup([]));
  window.addEventListener('beforeunload', (event) => { if (dirtyForms.size) { event.preventDefault(); event.returnValue = ''; } });
  return { load, reset: () => { version++; loaded = false; dirtyForms.clear(); [...list.children].forEach((form) => form.releasePreview()); list.replaceChildren(); panel.hidden = true; } };
};
