(async () => {
  const $ = (selector) => document.querySelector(selector);
  const slug = new URLSearchParams(location.search).get('urun');
  if (!slug) { $('#detail-status').textContent = 'Ürün bulunamadı.'; return; }
  const product = await window.DILEK_API.get(`/api/products/${encodeURIComponent(slug)}`);
  if (!product) { $('#detail-status').textContent = 'Ürün bulunamadı veya artık yayında değil.'; return; }
  document.title = `${product.title} — Dilek Makina`;
  $('#detail-title').textContent = product.title;
  $('#detail-category').textContent = product.category_name;
  $('#detail-summary').textContent = product.summary;
  $('#detail-summary').hidden = !product.summary;
  $('#detail-description').textContent = product.content;
  $('#detail-description-section').hidden = !product.content;
  const specs = product.product_specs || [];
  $('#detail-specs-section').hidden = !specs.length;
  for (const spec of specs) {
    const term = document.createElement('dt'); term.textContent = spec.label;
    const value = document.createElement('dd'); value.textContent = `${spec.value} ${spec.unit}`.trim();
    $('#detail-specs').append(term, value);
  }
  $('#detail-whatsapp').href = `https://wa.me/905417932571?text=${encodeURIComponent(`Merhaba, ${product.title} hakkında bilgi almak istiyorum.`)}`;
  const marketplaces = [
    ['trendyol_url', 'trendyol', 'Trendyol'],
    ['idefix_url', 'idefix', 'idefix'],
    ['hepsiburada_url', 'hepsiburada', 'Hepsiburada'],
    ['pazarama_url', 'pazarama', 'Pazarama'],
    ['n11_url', 'n11', 'n11'],
  ];
  const marketplaceList = $('#product-marketplaces');
  const marketplaceItems = marketplaces
    .filter(([key]) => typeof product[key] === 'string' && product[key].startsWith('https://'))
    .map(([key, mark, name]) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = product[key];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${name} mağazasında ürünü görüntüle`);
      const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      logo.setAttribute('aria-hidden', 'true');
      if (mark === 'hepsiburada') logo.classList.add('platform-wordmark-wide');
      if (mark === 'n11') logo.classList.add('platform-wordmark-small');
      logo.classList.add('platform-wordmark');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `assets/platform-marks.svg#${mark}`);
      logo.append(use);
      link.append(logo);
      item.append(link);
      return item;
    });
  marketplaceList.replaceChildren(...marketplaceItems);
  marketplaceList.hidden = marketplaceItems.length === 0;
  const images = product.product_media.sort((a, b) => a.sort_order - b.sort_order);
  const signed = images.map((image) => ({ ...image, url: window.DILEK_API.imageUrl(image.storage_path) }));
  const showImage = (image) => {
    const photo = document.createElement('img'); photo.src = image.url; photo.alt = image.alt_text || product.title; photo.width = 800; photo.height = 800; photo.fetchPriority = 'high';
    $('#detail-photo').replaceChildren(photo);
    $('#detail-thumbnails').querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.id === image.id)));
  };
  signed.forEach((image, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.id = image.id;
    button.setAttribute('aria-label', `${index + 1}. görseli göster`);
    const thumb = document.createElement('img'); thumb.src = image.url; thumb.alt = ''; thumb.width = 64; thumb.height = 64; thumb.loading = 'lazy'; thumb.decoding = 'async'; button.append(thumb);
    button.addEventListener('click', () => showImage(image)); $('#detail-thumbnails').append(button);
  });
  if (signed.length) showImage(signed[0]);
  else $('#detail-photo').textContent = 'Bu ürün için görsel bulunmuyor.';
  if (!$('#detail-status').textContent.includes('şu anda')) $('#detail-status').hidden = true;
  $('#detail-content').hidden = false;
})().catch((error) => {
  const status = document.querySelector('#detail-status');
  status.textContent = error.status === 404
    ? 'Bu ürün bulunamadı veya artık yayında değil. Ürün kataloğuna dönüp güncel bağlantıyı açın.'
    : 'Ürün yüklenemedi. Lütfen bağlantınızı kontrol edip yeniden deneyin.';
});
