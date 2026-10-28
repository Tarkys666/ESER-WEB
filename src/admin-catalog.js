window.createCatalogManager = (client, onSaved = () => {}) => {
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#product-editor');
  const form = $('#product-form');
  const list = $('#admin-product-list');
  const message = $('#management-message');
  const saveStatus = $('#save-status');
  const fields = form.elements;
  const categoryForm = $('#category-form');
  const categoryMessage = $('#category-message');
  let categorySaving = false;
  const storage = client.storage.from('product-images');
  const pageSize = 20;
  let categories = [], products = [], media = [], active = null;
  let page = 1, dirty = false, saving = false, loadVersion = 0;
  const cleanupPaths = new Set();

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const button = (label, action, className = 'secondary-button') => {
    const node = element('button', label, className);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const slugify = (value) => value.toLocaleLowerCase('tr').replaceAll('ı', 'i').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const readAll = async (table, select) => {
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client.from(table).select(select).order('sort_order').order('id').range(offset, offset + 99);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 100) return rows;
    }
  };
  const categoryName = (id) => categories.find((item) => item.id === id)?.name ?? '';
  const renderList = () => {
    const query = $('#admin-search').value.trim().toLocaleLowerCase('tr');
    const category = $('#admin-category').value;
    const status = $('#admin-status').value;
    const results = products.filter((item) => (!category || item.category_id === category) && (!status || item.status === status)
      && `${item.title} ${item.slug}`.toLocaleLowerCase('tr').includes(query));
    const pages = Math.max(1, Math.ceil(results.length / pageSize));
    page = Math.min(page, pages);
    list.replaceChildren(...results.slice((page - 1) * pageSize, page * pageSize).map((product) => {
      const row = element('li');
      const copy = element('div');
      copy.append(element('h3', product.title), element('p', categoryName(product.category_id)));
      const actions = element('div', undefined, 'product-row-actions');
      actions.append(element('small', product.status === 'published' ? 'Yayında' : 'Taslak', `status-badge ${product.status}`),
        button('Düzenle', () => openEditor(product.id).catch(showListError)));
      row.append(copy, actions);
      return row;
    }));
    if (!results.length) list.append(element('li', 'Bu filtrelerle eşleşen ürün bulunamadı.'));
    $('#admin-product-count').textContent = `${products.length} ürün · ${results.length} sonuç`;
    $('#management-stats').replaceChildren(...[
      [products.length, 'Toplam ürün'], [products.filter((item) => item.status === 'published').length, 'Yayında'],
      [products.filter((item) => item.status === 'draft').length, 'Taslak'],
    ].map(([count, label]) => { const node = element('div'); node.append(element('strong', count), element('span', label)); return node; }));
    $('#page-label').textContent = `${page} / ${pages}`;
    $('#previous-page').disabled = page === 1;
    $('#next-page').disabled = page === pages;
    $('#category-count').textContent = `${categories.length} kategori · Yeni kategoriler ürün formunda ve site menüsünde görünür.`;
    $('#category-list').replaceChildren(...categories.map((category) => {
      const row = element('li');
      const remove = button('Sil', () => deleteCategory(category), 'secondary-button danger-button');
      remove.setAttribute('aria-label', `${category.name} kategorisini sil`);
      remove.disabled = categorySaving;
      row.append(element('span', category.name), remove);
      return row;
    }));
  };
  const showListError = () => { message.textContent = 'Ürünler yüklenemedi. '; message.append(button('Tekrar dene', () => load().catch(showListError))); };
  const load = async () => {
    const version = ++loadVersion;
    const [newCategories, newProducts] = await Promise.all([
      readAll('categories', 'id,name,sort_order'), readAll('products', 'id,title,slug,category_id,status,updated_at'),
    ]);
    if (version !== loadVersion) return;
    categories = newCategories;
    products = newProducts;
    for (const select of [$('#admin-category'), fields.category_id]) {
      const selected = select.value;
      select.replaceChildren(new Option(select === fields.category_id ? 'Kategori seçin' : 'Tüm kategoriler', ''),
        ...categories.map((item) => new Option(item.name, item.id)));
      select.value = selected;
    }
    renderList();
  };
  const releasePreviews = () => { for (const image of media) if (image.file) URL.revokeObjectURL(image.url); };
  const closeEditor = (force = false) => {
    if (!force && (saving || (dirty && !confirm('Kaydedilmeyen değişikliklerden vazgeçilsin mi?')))) return;
    dialog.close();
    releasePreviews();
    media = [];
    dirty = false;
  };
  const addSpec = (value = {}) => {
    if ($('#spec-rows').children.length >= 50) { saveStatus.textContent = 'En fazla 50 teknik özellik eklenebilir.'; return; }
    const row = element('div', undefined, 'spec-row');
    for (const [key, placeholder, maxLength] of [['label', 'Özellik', 150], ['value', 'Değer', 500], ['unit', 'Birim', 40]]) {
      const input = document.createElement('input');
      input.dataset.spec = key;
      input.value = value[key] ?? '';
      input.placeholder = placeholder;
      input.setAttribute('aria-label', placeholder);
      input.maxLength = maxLength;
      row.append(input);
    }
    row.append(button('Kaldır', () => { row.remove(); dirty = true; }));
    $('#spec-rows').append(row);
  };
  const renderMedia = () => {
    $('#image-list').replaceChildren(...media.map((image, index) => {
      const row = element('div', undefined, 'editor-image');
      const preview = document.createElement('img');
      preview.src = image.url || '';
      preview.alt = image.alt_text || 'Ürün görseli';
      preview.addEventListener('error', () => { preview.hidden = true; }, { once: true });
      const copy = element('div');
      copy.append(element('strong', index === 0 ? 'Kapak görseli' : `Görsel ${index + 1}`));
      const label = element('label', 'Görsel açıklaması');
      const alt = document.createElement('input');
      alt.value = image.alt_text ?? '';
      alt.maxLength = 500;
      alt.addEventListener('input', () => { image.alt_text = alt.value; dirty = true; });
      label.append(alt);
      copy.append(label, element('small', image.file ? `${image.file.name} · Yüklenecek` : 'Kayıtlı görsel'));
      const actions = element('div', undefined, 'image-actions');
      for (const [text, offset] of [['↑', -1], ['↓', 1]]) {
        const move = button(text, () => { [media[index], media[index + offset]] = [media[index + offset], media[index]]; dirty = true; renderMedia(); });
        move.setAttribute('aria-label', offset === -1 ? 'Görseli öne taşı' : 'Görseli arkaya taşı');
        move.disabled = index + offset < 0 || index + offset >= media.length;
        actions.append(move);
      }
      actions.append(button('Kaldır', () => {
        if (image.file) URL.revokeObjectURL(image.url);
        media.splice(index, 1); dirty = true; renderMedia();
      }));
      row.append(preview, copy, actions);
      return row;
    }));
  };
  const openEditor = async (id) => {
    if (saving) return;
    message.textContent = id ? 'Ürün açılıyor…' : '';
    let record = { id: crypto.randomUUID(), title: '', category_id: '', slug: '', summary: '', content: '', status: 'draft', source_url: '', sort_order: 0 };
    let specs = [], images = [];
    if (id) {
      const { data, error } = await client.from('products').select('*,product_specs(*),product_media(*)').eq('id', id).single();
      if (error) throw error;
      record = data;
      specs = data.product_specs.sort((a, b) => a.sort_order - b.sort_order);
      images = data.product_media.sort((a, b) => a.sort_order - b.sort_order);
      if (images.length) {
        const { data: urls, error: signedError } = await storage.createSignedUrls(images.map((image) => image.storage_path), 3600);
        if (!signedError) images.forEach((image) => { image.url = urls.find((url) => url.path === image.storage_path)?.signedUrl; });
      }
    }
    active = record;
    releasePreviews();
    media = images.map((image) => ({ ...image }));
    form.reset();
    for (const key of ['title', 'category_id', 'slug', 'summary', 'content', 'status', 'source_url', 'sort_order']) fields[key].value = record[key] ?? '';
    $('#spec-rows').replaceChildren();
    specs.forEach(addSpec);
    renderMedia();
    dirty = false;
    saveStatus.textContent = '';
    message.textContent = '';
    $('#editor-title').textContent = id ? 'Ürünü düzenle' : 'Yeni ürün';
    $('#delete-product').hidden = !record.updated_at;
    dialog.showModal();
    fields.title.focus();
  };
  const cleanup = async (paths) => {
    if (!paths.length) return;
    paths.forEach((path) => cleanupPaths.add(path));
    const { error } = await storage.remove(paths);
    if (error) throw error;
    paths.forEach((path) => cleanupPaths.delete(path));
  };
  const showCleanupWarning = () => {
    message.textContent = 'İşlem tamamlandı; kullanılmayan bazı görseller depodan temizlenemedi. ';
    message.append(button('Temizliği tekrar dene', async () => {
      try { await cleanup([...cleanupPaths]); message.textContent = 'Görsel temizliği tamamlandı.'; }
      catch { showCleanupWarning(); }
    }));
  };
  $('#delete-product').addEventListener('click', async () => {
    if (saving || !active?.updated_at) return;
    if (!confirm(`“${active.title}” silinsin mi?\n\nÜrün, teknik özellikleri ve kayıtlı görselleri kaldırılacak. Bu işlem geri alınamaz.`)) return;
    saving = true;
    form.querySelectorAll('fieldset, .editor-header button, .editor-footer button').forEach((node) => { node.disabled = true; });
    saveStatus.textContent = 'Ürün siliniyor…';
    try {
      const { data, error } = await client.rpc('delete_product_bundle', {
        p_product_id: active.id, p_expected_updated_at: active.updated_at,
      });
      if (error) {
        if (error.message.includes('EDIT_CONFLICT')) throw new Error('Ürün başka bir oturumda değiştirildi. Kapatıp yeniden açtıktan sonra silin.');
        if (error.message.includes('PRODUCT_NOT_FOUND')) throw new Error('Bu ürün zaten silinmiş. Kapatıp listeyi yenileyin.');
        throw new Error('Ürün silinemedi. Oturumunuzu ve bağlantınızı kontrol edip tekrar deneyin.');
      }
      closeEditor(true);
      message.textContent = 'Ürün silindi.';
      try { await cleanup(data.removed_paths); } catch { showCleanupWarning(); }
      try { await load(); } catch { showListError(); }
      onSaved();
    } catch (error) { saveStatus.textContent = error.message; }
    finally {
      saving = false;
      form.querySelectorAll('fieldset, .editor-header button, .editor-footer button').forEach((node) => { node.disabled = false; });
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving || !active) return;
    const uploaded = [];
    const record = { id: active.id };
    let specs;
    try {
      for (const key of ['title', 'category_id', 'slug', 'summary', 'content', 'status', 'source_url', 'sort_order']) record[key] = fields[key].value.trim();
      if (record.source_url && new URL(record.source_url).protocol !== 'https:') throw new Error('Kaynak bağlantısı https:// ile başlamalı.');
      specs = [...$('#spec-rows').children].map((row) => Object.fromEntries([...row.querySelectorAll('input')].map((input) => [input.dataset.spec, input.value.trim()])))
        .filter((spec) => spec.label || spec.value || spec.unit);
      if (specs.some((spec) => !spec.label || !spec.value)) throw new Error('Teknik özelliklerde ad ve değer birlikte doldurulmalı.');
    } catch (error) { saveStatus.textContent = error.message; return; }
    saving = true;
    form.querySelectorAll('fieldset, .editor-header button, .editor-footer button').forEach((node) => { node.disabled = true; });
    try {
      const nextMedia = [];
      for (const [index, image] of media.entries()) {
        let path = image.storage_path;
        if (image.file) {
          saveStatus.textContent = `Görseller yükleniyor… ${index + 1} / ${media.length}`;
          const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[image.file.type];
          path = `${record.id}/${crypto.randomUUID()}.${extension}`;
          const { error } = await storage.upload(path, image.file, { contentType: image.file.type, upsert: false });
          if (error) throw new Error('Görsel yüklenemedi. Bağlantınızı ve dosya biçimini kontrol edin.');
          uploaded.push(path);
        }
        nextMedia.push({ id: image.id, storage_path: path, alt_text: image.alt_text || record.title });
      }
      saveStatus.textContent = 'Ürün kaydediliyor…';
      const { data, error } = await client.rpc('save_product_bundle', {
        p_product: record, p_specs: specs, p_media: nextMedia, p_expected_updated_at: active.updated_at ?? null,
      });
      if (error) {
        if (error.message.includes('EDIT_CONFLICT')) throw new Error('Bu ürün başka bir oturumda değiştirildi. Değişikliklerinizi kopyalayıp ürünü yeniden açın.');
        if (error.code === '23505') throw new Error('Bu bağlantı adı başka bir üründe kullanılıyor. Farklı bir bağlantı adı girin.');
        throw new Error('Ürün kaydedilemedi. Alanları ve oturumunuzu kontrol edip tekrar deneyin.');
      }
      dirty = false;
      closeEditor(true);
      message.textContent = data.product.status === 'published' ? 'Ürün kaydedildi ve yayında.' : 'Ürün taslak olarak kaydedildi.';
      try { await cleanup(data.removed_paths); } catch { showCleanupWarning(); }
      try { await load(); } catch { showListError(); }
      onSaved();
    } catch (error) {
      try { await cleanup(uploaded); }
      catch { message.textContent = 'Başarısız yüklemeden kalan görseller temizlenemedi. '; message.append(button('Temizle', () => cleanup([...cleanupPaths]).then(() => { message.textContent = 'Temizlendi.'; }).catch(showCleanupWarning))); }
      saveStatus.textContent = error.message;
    } finally {
      saving = false;
      form.querySelectorAll('fieldset, .editor-header button, .editor-footer button').forEach((node) => { node.disabled = false; });
    }
  });
  categoryForm.elements.name.addEventListener('input', () => {
    categoryForm.elements.id.value = slugify(categoryForm.elements.name.value);
  });
  const deleteCategory = async (category) => {
    if (categorySaving) return;
    if (products.some((product) => product.category_id === category.id)) {
      categoryMessage.textContent = 'Bu kategoride ürün var. Önce ürünleri başka kategoriye taşıyın veya silin.';
      return;
    }
    if (!confirm(`“${category.name}” kategorisi kalıcı olarak silinsin mi?`)) return;
    categorySaving = true;
    categoryForm.querySelector('fieldset').disabled = true;
    renderList();
    categoryMessage.textContent = 'Kategori siliniyor…';
    try {
      const { data, error } = await client.from('categories').delete().eq('id', category.id).select('id');
      if (error) {
        categoryMessage.textContent = error.code === '23503'
          ? 'Bu kategoride ürün var. Önce ürünleri başka kategoriye taşıyın veya silin.'
          : 'Kategori silinemedi. Oturumunuzu ve bağlantınızı kontrol edip tekrar deneyin.';
        return;
      }
      categoryMessage.textContent = data.length ? `“${category.name}” kategorisi silindi.` : 'Kategori bulunamadı veya silme yetkiniz yok. Listeyi yenileyin.';
      try { await load(); }
      catch { categoryMessage.textContent += ' Liste güncellenemedi; sayfayı yenileyin.'; }
    } catch { categoryMessage.textContent = 'İşlem doğrulanamadı. Tekrar silmeden önce sayfayı yenileyin.'; }
    finally {
      categorySaving = false;
      categoryForm.querySelector('fieldset').disabled = false;
      renderList();
    }
  };
  categoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (categorySaving) return;
    const name = categoryForm.elements.name.value.trim();
    const id = categoryForm.elements.id.value.trim();
    const sort_order = Number(categoryForm.elements.sort_order.value);
    if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || !Number.isInteger(sort_order) || sort_order < 0 || sort_order > 1000000) {
      categoryMessage.textContent = 'Kategori adını, bağlantı adını ve sırasını kontrol edin.'; return;
    }
    if (id === 'all') { categoryMessage.textContent = '“all” tüm ürünler filtresi için ayrılmıştır. Farklı bir bağlantı adı girin.'; return; }
    if (categories.some((category) => category.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'))) {
      categoryMessage.textContent = 'Bu isimde bir kategori zaten var.'; return;
    }
    categorySaving = true;
    categoryForm.querySelector('fieldset').disabled = true;
    categoryMessage.textContent = 'Kategori ekleniyor…';
    try {
      const { error } = await client.from('categories').insert({ id, name, sort_order });
      if (error) {
        categoryMessage.textContent = error.code === '23505' ? 'Bu bağlantı adı zaten kullanılıyor.' : 'Kategori eklenemedi. Oturumunuzu ve bağlantınızı kontrol edip tekrar deneyin.';
        return;
      }
      categoryForm.reset();
      categoryMessage.textContent = `“${name}” kategorisi eklendi.`;
      try { await load(); }
      catch { categoryMessage.textContent = `“${name}” eklendi; liste güncellenemedi. Sayfayı yenileyin.`; }
    } catch { categoryMessage.textContent = 'İşlem doğrulanamadı. Tekrar eklemeden önce sayfayı yenileyin.'; }
    finally { categorySaving = false; categoryForm.querySelector('fieldset').disabled = false; }
  });
  $('#image-files').addEventListener('change', (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    if (media.length + files.length > 12) { saveStatus.textContent = 'En fazla 12 görsel eklenebilir.'; return; }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size)) {
      saveStatus.textContent = 'JPEG, PNG, WebP veya AVIF seçin; her dosya 5 MB veya daha küçük olmalı.'; return;
    }
    media.push(...files.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), alt_text: fields.title.value })));
    dirty = true; saveStatus.textContent = ''; renderMedia();
  });
  form.addEventListener('input', () => { dirty = true; });
  fields.title.addEventListener('input', () => { if (!active.updated_at) fields.slug.value = slugify(fields.title.value); });
  $('#add-spec').addEventListener('click', () => { addSpec(); dirty = true; });
  $('#new-product').addEventListener('click', () => openEditor().catch(showListError));
  $('#close-editor').addEventListener('click', () => closeEditor());
  $('#cancel-editor').addEventListener('click', () => closeEditor());
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeEditor(); });
  for (const id of ['admin-search', 'admin-category', 'admin-status']) $('#' + id).addEventListener('input', () => { page = 1; renderList(); });
  $('#previous-page').addEventListener('click', () => { page--; renderList(); });
  $('#next-page').addEventListener('click', () => { page++; renderList(); });
  window.addEventListener('beforeunload', (event) => { if (dialog.open && dirty) { event.preventDefault(); event.returnValue = ''; } });
  return { load, reset: () => { loadVersion++; closeEditor(true); list.replaceChildren(); products = []; categories = []; $('#category-list').replaceChildren(); categoryForm.reset(); categoryMessage.textContent = ''; } };
};
