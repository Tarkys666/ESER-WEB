(async () => {
  const region = document.querySelector('#hero-slider');
  if (!region) return;
  const photo = region.querySelector('img');
  const controls = region.querySelector('.slider-controls');
  const counter = region.querySelector('#slide-counter');
  const pause = region.querySelector('#slide-pause');
  let slides, current = 0, timer;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const schedule = () => {
    clearTimeout(timer);
    pause.textContent = paused ? 'Oynat' : 'Duraklat';
    pause.setAttribute('aria-pressed', String(paused));
    if (!paused && slides.length > 1 && !document.hidden) timer = setTimeout(() => show(current + 1), 6500);
  };
  const show = (index) => {
    current = (index + slides.length) % slides.length;
    const slide = slides[current];
    photo.src = slide.image_path.startsWith('assets/') ? slide.image_path
      : new URL(`/storage/v1/object/public/hero-images/${slide.image_path}`, window.DILEK_SUPABASE.url).href;
    photo.alt = slide.alt_text;
    photo.hidden = false;
    counter.textContent = `${current + 1} / ${slides.length}`;
    schedule();
  };
  try {
    slides = await window.DILEK_API.readAll('hero_slides', 'id,image_path,alt_text', { is_active: 'eq.true' });
    if (!slides.length) { region.hidden = true; return; }
    region.querySelector('#slide-previous').addEventListener('click', () => show(current - 1));
    region.querySelector('#slide-next').addEventListener('click', () => show(current + 1));
    pause.addEventListener('click', () => { paused = !paused; schedule(); });
    region.addEventListener('focusin', (event) => { if (event.target !== pause) { paused = true; schedule(); } });
    document.addEventListener('visibilitychange', schedule);
    photo.addEventListener('error', () => { photo.hidden = true; counter.textContent = 'Görsel yüklenemedi'; });
    controls.hidden = slides.length < 2;
    show(0);
  } catch { region.hidden = true; }
})();
