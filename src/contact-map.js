(() => {
  const container = document.querySelector('#business-map');
  const button = document.querySelector('#load-business-map');
  if (!container || !button) return;

  button.addEventListener('click', () => {
    const map = document.createElement('iframe');
    map.title = 'Dilek Makina — Google Maps konumu';
    map.src = container.dataset.mapSrc;
    map.loading = 'eager';
    map.referrerPolicy = 'strict-origin-when-cross-origin';
    map.allowFullscreen = true;
    container.replaceChildren(map);
  }, { once: true });
})();
