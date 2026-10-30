const initializeCatalog = async () => {
  const $ = (selector) => document.querySelector(selector);
  const { categories, products: initialProducts, total: initialTotal, pageSize } = await window.DILEK_CATALOG_READY;
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const productGrid = $('#product-grid');
  const categoryFilters = $('#category-filters');
  const searchInput = $('#product-search');
  const resultCount = $('#result-count');
  const emptyState = $('#empty-state');
  const pagination = $('#catalog-pagination');
  const previous = $('#catalog-previous');
  const next = $('#catalog-next');
  const pageLabel = $('#catalog-page');
  const categoryName = (id) => categories.find((category) => category.id === id)?.name ?? 'Ürünler';
  let selectedCategory = new URLSearchParams(location.search).get('kategori') || 'all';
  let page = 1;
  let total = initialTotal;
  let currentProducts = initialProducts;
  let controller;
  let debounce;

  categoryFilters.innerHTML = [{ id: 'all', name: 'Tüm ürünler' }, ...categories].map(({ id, name }) => `
    <button class="category-filter" type="button" data-category="${escapeHTML(id)}" aria-pressed="${id === selectedCategory}">${escapeHTML(name)}</button>
  `).join('');

  const renderProducts = () => {
    productGrid.innerHTML = currentProducts.map((product, index) => `
      <article class="catalog-card">
        <div class="catalog-visual ${product.cover?.url ? 'has-image' : ''}">${product.cover?.url ? `<img src="${escapeHTML(product.cover.url)}" alt="${escapeHTML(product.cover.alt_text || product.name)}" loading="${index < 6 ? 'eager' : 'lazy'}" decoding="async" width="400" height="240" />` : `<span aria-hidden="true">${String((page - 1) * pageSize + index + 1).padStart(2, '0')}</span><i aria-hidden="true"></i><b aria-hidden="true">DİLEK MAKİNA</b>`}</div>
        <div class="catalog-card-copy"><p class="catalog-category">${escapeHTML(categoryName(product.category))}</p><h2>${escapeHTML(product.name)}</h2><a class="catalog-link" href="urun.html?urun=${encodeURIComponent(product.slug)}">Ürünü incele <span aria-hidden="true">↗</span></a></div>
      </article>`).join('');
    const pages = Math.max(1, Math.ceil(total / pageSize));
    resultCount.textContent = `${total} ürün · ${page} / ${pages}. sayfa`;
    emptyState.hidden = total > 0;
    pagination.hidden = pages <= 1;
    pageLabel.textContent = `${page} / ${pages}`;
    previous.disabled = page <= 1;
    next.disabled = page >= pages;
    categoryFilters.querySelectorAll('.category-filter').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.category === selectedCategory)));
  };

  const loadPage = async () => {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    page = Math.max(1, page);
    resultCount.textContent = 'Ürünler yükleniyor…';
    const params = new URLSearchParams({ page: String(page) });
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchInput.value.trim()) params.set('q', searchInput.value.trim().slice(0, 100));
    try {
      const result = await window.DILEK_API.get(`/api/products?${params}`, { signal });
      if (signal.aborted) return;
      total = result.total;
      currentProducts = result.items.map((product) => ({
        id: product.id, slug: product.slug, name: product.title, category: product.category_id,
        cover: product.product_media?.[0] ? { ...product.product_media[0], url: window.DILEK_API.imageUrl(product.product_media[0].storage_path) } : null,
      }));
      renderProducts();
    } catch (error) {
      if (error.name === 'AbortError') return;
      resultCount.textContent = 'Katalog yüklenemedi';
      emptyState.textContent = 'Ürünler şu anda yüklenemiyor. Lütfen tekrar deneyin.';
      emptyState.hidden = false;
    }
  };

  categoryFilters.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    page = 1;
    const url = new URL(location.href);
    selectedCategory === 'all' ? url.searchParams.delete('kategori') : url.searchParams.set('kategori', selectedCategory);
    history.replaceState(null, '', url);
    loadPage();
  });
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { page = 1; loadPage(); }, 250);
  });
  previous.addEventListener('click', () => { page--; loadPage(); });
  next.addEventListener('click', () => { page++; loadPage(); });
  await loadPage();
};

initializeCatalog().catch((error) => {
  console.error(error);
  document.querySelector('#result-count').textContent = 'Katalog yüklenemedi';
  const message = document.querySelector('#empty-state');
  message.textContent = 'Ürünler şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.';
  message.hidden = false;
});
