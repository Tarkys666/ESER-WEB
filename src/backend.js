window.DILEK_CATALOG_READY = Promise.all([
  window.DILEK_API.get('/api/categories'),
  window.DILEK_API.get('/api/products'),
]).then(([categories, products]) => {
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
  return catalog;
});
