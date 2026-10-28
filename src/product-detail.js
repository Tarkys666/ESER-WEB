(async () => {
  const $ = (selector) => document.querySelector(selector);
  const slug = new URLSearchParams(location.search).get('urun');
  if (!slug) { $('#detail-status').textContent = 'Ürün bulunamadı.'; return; }
  const [product] = await window.DILEK_API.readAll('products', '*,categories(name),product_specs(*),product_media(*)', { slug: `eq.${slug}`, status: 'eq.published' });
  if (!product) { $('#detail-status').textContent = 'Ürün bulunamadı veya artık yayında değil.'; return; }
  document.title = `${product.title} — Dilek Makina`;
  $('#detail-title').textContent = product.title;
  $('#detail-category').textContent = product.categories.name;
  $('#detail-summary').textContent = product.summary;
  $('#detail-summary').hidden = !product.summary;
  $('#detail-description').textContent = product.content;
  $('#detail-description-section').hidden = !product.content;
  const specs = product.product_specs.sort((a, b) => a.sort_order - b.sort_order);
  $('#detail-specs-section').hidden = !specs.length;
  for (const spec of specs) {
    const term = document.createElement('dt'); term.textContent = spec.label;
    const value = document.createElement('dd'); value.textContent = `${spec.value} ${spec.unit}`.trim();
    $('#detail-specs').append(term, value);
  }
  $('#detail-email').href = `mailto:dilek_makina@outlook.com?subject=${encodeURIComponent(product.title + ' hakkında bilgi')}`;
  const images = product.product_media.sort((a, b) => a.sort_order - b.sort_order);
  let signed = [];
  try { signed = (await window.DILEK_API.signImages(images)).filter((image) => image.url); }
  catch { $('#detail-status').textContent = 'Ürün görselleri şu anda yüklenemiyor.'; }
  const showImage = (image) => {
    const photo = document.createElement('img'); photo.src = image.url; photo.alt = image.alt_text || product.title;
    $('#detail-photo').replaceChildren(photo);
    $('#detail-thumbnails').querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.id === image.id)));
  };
  signed.forEach((image, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.id = image.id;
    button.setAttribute('aria-label', `${index + 1}. görseli göster`);
    const thumb = document.createElement('img'); thumb.src = image.url; thumb.alt = ''; button.append(thumb);
    button.addEventListener('click', () => showImage(image)); $('#detail-thumbnails').append(button);
  });
  if (signed.length) showImage(signed[0]);
  else $('#detail-photo').textContent = 'Bu ürün için görsel bulunmuyor.';
  if (!$('#detail-status').textContent.includes('şu anda')) $('#detail-status').hidden = true;
  $('#detail-content').hidden = false;
})().catch(() => { document.querySelector('#detail-status').textContent = 'Ürün yüklenemedi. Sayfayı yeniden deneyin.'; });
