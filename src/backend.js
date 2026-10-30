window.DILEK_HOME_READY = window.DILEK_API.get('/api/home');
window.DILEK_CATALOG_READY = Promise.all([
  window.DILEK_HOME_READY.catch(() => ({ categories: [] })),
  window.DILEK_API.get('/api/products'),
]).then(([home, result]) => {
  const { categories } = home;
  const products = result.items;
  const catalog = {
    categories,
    products: products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.title,
      summary: product.summary,
      category: product.category_id,
      source: product.source_url,
      cover: product.product_media?.[0] ? {
        ...product.product_media[0],
        url: window.DILEK_API.imageUrl(product.product_media[0].storage_path),
      } : null,
    })),
  };
  window.DILEK_CATALOG = catalog;
  return { ...catalog, total: result.total, page: result.page, pageSize: result.page_size };
});
