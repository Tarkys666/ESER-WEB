(async () => {
  const region = document.querySelector('#hero-slider');
  if (!region) return;
  // Responsive copies of the original slides are served by Pages.
  // Admin ordering and visibility still come from the live slide records.
  const bundledSlides = {
    "slides/1a18dae5ddf-9e8e943.jpg": 1,
    "slides/1a18dae9cd0-10169e4d.jpg": 2,
    "slides/1a18daec70c-1f69de0a.jpg": 3,
    "slides/1a18daeda75-35bec94d.jpg": 4,
    "slides/1a18daee4e4-bffbb12.jpg": 5,
    "slides/1a18daeee35-3aa0a153.jpg": 6,
    "slides/1a18daf0b67-385fa61f.jpg": 7,
    "slides/1a18daf1563-80a58ee.jpg": 8,
    "slides/1a18daf2862-39e2746.jpg": 9,
    "slides/1a18daf3ede-15d60558.jpg": 10
  };
  const slidesReady = window.DILEK_API.get("/api/slides");
  const setSource = (image, slide) => {
    const bundled = bundledSlides[slide.image_path];
    if (bundled) {
      const path = "assets/optimized/v1/slides/" + bundled;
      image.sizes = "(max-width: 700px) 100vw, (max-width: 1100px) 62vw, 58vw";
      image.srcset = path + "-800.webp 800w, " + path + "-1200.webp 1200w";
      image.src = path + "-800.webp";
    } else image.src = window.DILEK_API.imageUrl(slide.image_path);
  };
  let photo = region.querySelector('img');
  const controls = region.querySelector('.slider-controls');
  const counter = region.querySelector('#slide-counter');
  const pause = region.querySelector('#slide-pause');
  let slides, current = 0, timer, preloadTimer, request = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  const schedule = () => {
    clearTimeout(timer);
    clearTimeout(preloadTimer);
    pause.textContent = paused ? 'Oynat' : 'Duraklat';
    pause.setAttribute('aria-pressed', String(paused));
    if (!paused && slides.length > 1 && !document.hidden) {
      preloadTimer = setTimeout(() => {
        const upcoming = new Image();
        upcoming.fetchPriority = 'low';
        setSource(upcoming, slides[(current + 1) % slides.length]);
      }, 1500);
      timer = setTimeout(() => show(current + 1), 3000);
    }
  };
  const show = async (index) => {
    clearTimeout(timer);
    clearTimeout(preloadTimer);
    const version = ++request;
    current = (index + slides.length) % slides.length;
    const slide = slides[current];
    const next = new Image();
    next.alt = slide.alt_text;
    next.decoding = 'async';
    next.fetchPriority = current === 0 ? 'high' : 'auto';
    next.width = 1200;
    next.height = 1200;
    setSource(next, slide);
    if (photo.hidden) region.insertBefore(next, controls);
    try {
      try { await next.decode(); }
      catch (error) {
        if (!bundledSlides[slide.image_path]) throw error;
        next.srcset = '';
        next.src = window.DILEK_API.imageUrl(slide.image_path);
        await next.decode();
      }
    }
    catch {
      next.remove();
      if (version !== request) return;
      counter.textContent = 'Görsel yüklenemedi';
      schedule();
      return;
    }
    if (version !== request) { next.remove(); return; }
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
    slides = await slidesReady;
    if (!slides.length) { region.hidden = true; return; }
    region.querySelector('#slide-previous').addEventListener('click', () => show(current - 1));
    region.querySelector('#slide-next').addEventListener('click', () => show(current + 1));
    pause.addEventListener('click', () => { paused = !paused; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    controls.hidden = slides.length < 2;
    show(0);
  } catch { region.hidden = true; }
})();
