const publicConfig = window.DILEK_SUPABASE;
window.DILEK_API = {
  async readAll(table, select, filters = {}) {
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const url = new URL(`/rest/v1/${table}`, publicConfig.url);
      url.search = new URLSearchParams({ select, order: 'sort_order.asc,id.asc', limit: 100, offset, ...filters });
      const response = await fetch(url, { headers: { apikey: publicConfig.publishableKey }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('Invalid catalog response');
      rows.push(...page);
      if (page.length < 100) return rows;
    }
  },
  async signImages(images) {
    if (!images.length) return [];
    const signed = [];
    for (let start = 0; start < images.length; start += 100) {
      const batch = images.slice(start, start + 100);
      const response = await fetch(new URL('/storage/v1/object/sign/product-images', publicConfig.url), {
        method: 'POST', headers: { apikey: publicConfig.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: batch.map((image) => image.storage_path), expiresIn: 3600 }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Product images unavailable');
      const urls = await response.json();
      signed.push(...batch.map((image) => {
        const value = urls.find((entry) => entry.path === image.storage_path && !entry.error)?.signedURL;
        return { ...image, url: value ? new URL('/storage/v1' + value, publicConfig.url).href : null };
      }));
    }
    return signed;
  },
};
window.DILEK_CATALOG_READY = (async () => {
  if (!publicConfig?.url || !publicConfig.publishableKey) return window.DILEK_CATALOG;
  const [categories, products] = await Promise.all([
    window.DILEK_API.readAll('categories', 'id,name'),
    window.DILEK_API.readAll('products', 'id,slug,title,category_id,source_url,summary,product_media(storage_path,alt_text,sort_order)', { status: 'eq.published' }),
  ]);
  const covers = products.map((product) => [...product.product_media].sort((a, b) => a.sort_order - b.sort_order)[0]).filter(Boolean);
  let signedCovers = [];
  try { signedCovers = await window.DILEK_API.signImages(covers); }
  catch (error) { console.error(error); }
  const catalog = {
    categories,
    products: products.map((product) => ({
      id: product.id, slug: product.slug, name: product.title, summary: product.summary,
      category: product.category_id, source: product.source_url,
      cover: signedCovers.find((image) => image.storage_path === [...product.product_media].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path),
    })),
  };
  window.DILEK_CATALOG = catalog;
  return catalog;
})();
