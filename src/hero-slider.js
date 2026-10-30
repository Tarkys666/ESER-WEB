(async () => {
  const region = document.querySelector('#hero-slider');
  if (!region) return;
  // These immutable R2 keys match the checked-in files byte for byte.
  // Admin ordering and visibility still come from the live slide records.
  const bundledSlides = {
    "slides/1a18dae5ddf-9e8e943.jpg": "assets/WhatsApp Image 2026-10-28 at 7.21.31 PM.jpeg",
    "slides/1a18dae9cd0-10169e4d.jpg": "assets/WhatsApp Image 2026-10-28 at 7.21.46 PM.jpeg",
    "slides/1a18daec70c-1f69de0a.jpg": "assets/WhatsApp Image 2026-10-28 at 7.22.05 PM.jpeg",
    "slides/1a18daeda75-35bec94d.jpg": "assets/WhatsApp Image 2026-10-28 at 7.22.20 PM.jpeg",
    "slides/1a18daee4e4-bffbb12.jpg": "assets/WhatsApp Image 2026-10-28 at 7.22.58 PM.jpeg",
    "slides/1a18daeee35-3aa0a153.jpg": "assets/WhatsApp Image 2026-10-28 at 7.23.12 PM.jpeg",
    "slides/1a18daf0b67-385fa61f.jpg": "assets/WhatsApp Image 2026-10-28 at 7.23.28 PM.jpeg",
    "slides/1a18daf1563-80a58ee.jpg": "assets/WhatsApp Image 2026-10-28 at 7.23.40 PM.jpeg",
    "slides/1a18daf2862-39e2746.jpg": "assets/WhatsApp Image 2026-10-28 at 7.19.40 PM.jpeg",
    "slides/1a18daf3ede-15d60558.jpg": "assets/WhatsApp Image 2026-10-28 at 7.20.20 PM.jpeg"
  };
  const imageUrl = (slide) => bundledSlides[slide.image_path] || window.DILEK_API.imageUrl(slide.image_path);
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
    next.src = imageUrl(slide);
    next.alt = slide.alt_text;
    next.decoding = 'async';
    next.fetchPriority = current === 0 ? 'high' : 'auto';
    try {
      try { await next.decode(); }
      catch (error) {
        if (!bundledSlides[slide.image_path]) throw error;
        next.src = window.DILEK_API.imageUrl(slide.image_path);
        await next.decode();
      }
    }
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
    if (slides.length > 1) {
      const upcoming = new Image();
      upcoming.src = imageUrl(slides[(current + 1) % slides.length]);
    }
    schedule();
  };
  try {
    ({ slides } = await window.DILEK_HOME_READY);
    if (!slides.length) { region.hidden = true; return; }
    region.querySelector('#slide-previous').addEventListener('click', () => show(current - 1));
    region.querySelector('#slide-next').addEventListener('click', () => show(current + 1));
    pause.addEventListener('click', () => { paused = !paused; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    controls.hidden = slides.length < 2;
    show(0);
  } catch { region.hidden = true; }
})();
