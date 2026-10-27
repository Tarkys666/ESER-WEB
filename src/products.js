const { categories, products } = window.ESER_CATALOG;
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
  <button class="category-filter" type="button" data-category="${id}" aria-pressed="${id === selectedCategory}">${name}</button>
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
      <div class="catalog-visual" aria-hidden="true"><span>${String(index + 1).padStart(2, "0")}</span><i></i><b>ESER</b></div>
      <div class="catalog-card-copy">
        <p class="catalog-category">${categoryName(product.category)}</p>
        <h2>${product.name}</h2>
        <a class="catalog-link" href="${product.source}" target="_blank" rel="noopener noreferrer">Ürün bilgisi <span aria-hidden="true">↗</span></a>
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
