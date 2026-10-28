const initializeCatalog = async () => {
  document.querySelector('#result-count').textContent = 'Ürünler yükleniyor…';
  const { categories, products } = await window.DILEK_CATALOG_READY;
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const safeSource = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : 'index.html#iletisim';
    } catch { return 'index.html#iletisim'; }
  };
  const productGrid = document.querySelector("#product-grid");
  const categoryFilters = document.querySelector("#category-filters");
  const searchInput = document.querySelector("#product-search");
  const resultCount = document.querySelector("#result-count");
  const emptyState = document.querySelector("#empty-state");

  const categoryName = (id) => categories.find((category) => category.id === id)?.name ?? "Ürünler";
  let selectedCategory = new URLSearchParams(location.search).get("kategori") || "all";

  categoryFilters.innerHTML = [
    { id: "all", name: "Tüm ürünler" },
    ...categories,
  ].map(({ id, name }) => `
    <button class="category-filter" type="button" data-category="${escapeHTML(id)}" aria-pressed="${id === selectedCategory}">${escapeHTML(name)}</button>
  `).join("");

  const renderProducts = () => {
    const query = searchInput.value.trim().toLocaleLowerCase("tr");
    const visibleProducts = products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesQuery = !query || `${product.name} ${categoryName(product.category)}`.toLocaleLowerCase("tr").includes(query);
      return matchesCategory && matchesQuery;
    });

    productGrid.innerHTML = visibleProducts.map((product, index) => `
      <article class="catalog-card">
        <div class="catalog-visual ${product.cover?.url ? 'has-image' : ''}">${product.cover?.url ? `<img src="${escapeHTML(product.cover.url)}" alt="${escapeHTML(product.cover.alt_text || product.name)}" loading="lazy" width="400" height="240" />` : `<span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><i aria-hidden="true"></i><b aria-hidden="true">DİLEK MAKİNA</b>`}</div>
        <div class="catalog-card-copy">
          <p class="catalog-category">${escapeHTML(categoryName(product.category))}</p>
          <h2>${escapeHTML(product.name)}</h2>
        <a class="catalog-link" href="${product.slug ? `urun.html?urun=${encodeURIComponent(product.slug)}` : escapeHTML(safeSource(product.source))}">Ürünü incele <span aria-hidden="true">↗</span></a>
        </div>
      </article>
    `).join("");
    resultCount.textContent = `${visibleProducts.length} ürün gösteriliyor`;
    emptyState.hidden = visibleProducts.length > 0;
    categoryFilters.querySelectorAll(".category-filter").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.category === selectedCategory));
    });
  };

  categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    selectedCategory = button.dataset.category;
    const url = new URL(location.href);
    selectedCategory === "all" ? url.searchParams.delete("kategori") : url.searchParams.set("kategori", selectedCategory);
    history.replaceState(null, "", url);
    renderProducts();
  });

  searchInput.addEventListener("input", renderProducts);
  renderProducts();
};

initializeCatalog().catch((error) => {
  console.error(error);
  document.querySelector('#result-count').textContent = 'Katalog yüklenemedi';
  document.querySelector('#product-search').disabled = true;
  const message = document.querySelector('#empty-state');
  message.textContent = 'Ürünler şu anda yüklenemiyor. ';
  const retry = document.createElement('a');
  retry.href = location.href;
  retry.className = 'text-link';
  retry.textContent = 'Tekrar dene';
  message.append(retry);
  message.hidden = false;
});
