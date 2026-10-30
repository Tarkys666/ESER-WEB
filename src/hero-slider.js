(async () => {
  const region = document.querySelector('#hero-slider');
  if (!region) return;
  let photo = region.querySelector('img');
  const controls = region.querySelector('.slider-controls');
  const counter = region.querySelector('#slide-counter');
  const pause = region.querySelector('#slide-pause');
  let slides, current = 0, timer, request = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  const schedule = () => {
    clearTimeout(timer);
    pause.textContent = paused ? 'Oynat' : 'Duraklat';
    pause.setAttribute('aria-pressed', String(paused));
    if (!paused && slides.length > 1 && !document.hidden) timer = setTimeout(() => show(current + 1), 3000);
  };
  const show = async (index) => {
    clearTimeout(timer);
    const version = ++request;
    current = (index + slides.length) % slides.length;
    const slide = slides[current];
    const next = new Image();
    next.src = window.DILEK_API.imageUrl(slide.image_path);
    next.alt = slide.alt_text;
    try { await next.decode(); }
    catch {
      if (version !== request) return;
      counter.textContent = 'Görsel yüklenemedi';
      schedule();
      return;
    }
    if (version !== request) return;
    const previous = photo;
    region.insertBefore(next, controls);
    photo = next;
    if (!previous.hidden && !reducedMotion.matches) {
      const animation = next.animate([
        { opacity: 0, transform: 'translateX(2%)' },
        { opacity: 1, transform: 'translateX(0)' },
      ], { duration: 1000, easing: 'ease-in-out' });
      animation.finished.then(() => previous.remove());
    } else previous.remove();
    counter.textContent = `${current + 1} / ${slides.length}`;
    schedule();
  };
  try {
    slides = await window.DILEK_API.get('/api/slides');
    if (!slides.length) { region.hidden = true; return; }
    region.querySelector('#slide-previous').addEventListener('click', () => show(current - 1));
    region.querySelector('#slide-next').addEventListener('click', () => show(current + 1));
    pause.addEventListener('click', () => { paused = !paused; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    controls.hidden = slides.length < 2;
    show(0);
  } catch { region.hidden = true; }
})();
