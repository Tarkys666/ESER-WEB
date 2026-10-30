const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");
const categoryMenu = document.querySelector(".nav-product-categories");
const homeCategories = document.querySelector('#home-categories');

const showCategoryMessage = (message) => {
  if (!homeCategories) return;
  const notice = document.createElement('p');
  notice.className = 'category-carousel-empty';
  notice.textContent = message;
  homeCategories.replaceChildren(notice);
  homeCategories.setAttribute('aria-busy', 'false');
};

const renderCategories = ({ categories }) => {
  if (categoryMenu) categoryMenu.replaceChildren(...categories.map(({ id, name }) => {
    const link = document.createElement('a');
    link.href = `urunler.html?kategori=${encodeURIComponent(id)}`;
    link.textContent = name;
    return link;
  }));
  if (!homeCategories) return;

  const items = categories.map((category) => ({
    ...category,
    product: category.featured_product ? {
      name: category.featured_product.title,
      cover: category.featured_product.url ? {
        url: window.DILEK_API.imageUrl(category.featured_product.url),
        alt_text: category.featured_product.alt_text,
      } : null,
    } : null,
  }));
  if (!items.length) {
    showCategoryMessage('Ürün grupları eklendiğinde burada görünecek.');
    return;
  }

  const stage = document.createElement('div');
  stage.className = 'category-carousel-stage';
  const viewport = document.createElement('div');
  viewport.className = 'category-carousel-viewport';
  const track = document.createElement('div');
  track.className = 'category-carousel-track';
  viewport.append(track);

  const arrowButton = (label, direction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `category-carousel-arrow category-carousel-${direction}`;
    button.setAttribute('aria-label', label);
    button.textContent = direction === 'next' ? '→' : '←';
    return button;
  };
  const previous = arrowButton('Önceki ürün grupları', 'previous');
  const next = arrowButton('Sonraki ürün grupları', 'next');
  stage.append(viewport, previous, next);

  const indicators = document.createElement('div');
  indicators.className = 'category-carousel-dots';
  indicators.setAttribute('role', 'group');
  indicators.setAttribute('aria-label', 'Ürün grubu sayfaları');

  const cards = items.map((category) => {
    const link = document.createElement('a');
    link.className = 'category-card';
    link.href = `urunler.html?kategori=${encodeURIComponent(category.id)}`;

    const visual = document.createElement('div');
    visual.className = 'category-card-visual';
    if (category.product?.cover?.url) {
      const image = document.createElement('img');
      image.src = category.product.cover.url;
      image.alt = category.product.cover.alt_text || category.product.name;
      image.loading = 'lazy';
      image.decoding = 'async';
      visual.append(image);
    } else {
      visual.classList.add('is-empty');
      const placeholder = document.createElement('span');
      placeholder.textContent = category.product?.name || category.name;
      visual.append(placeholder);
    }

    const title = document.createElement('span');
    title.className = 'category-card-title';
    title.textContent = category.name;
    link.append(visual, title);
    return link;
  });

  let page = 0;
  let pageSize = 0;
  const compact = window.matchMedia('(max-width: 700px)');
  const updateControls = () => {
    const pages = Math.ceil(cards.length / pageSize);
    page = Math.min(page, pages - 1);
    [...track.children].forEach((slide, index) => {
      const active = index === page;
      slide.inert = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    track.style.transform = `translateX(-${page * 100}%)`;
    previous.hidden = pages < 2 || page === 0;
    next.hidden = pages < 2 || page === pages - 1;
    [...indicators.children].forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === page));
    });
    indicators.hidden = pages < 2;
  };
  const renderPages = () => {
    pageSize = compact.matches ? 1 : 3;
    const slides = [];
    for (let start = 0; start < cards.length; start += pageSize) {
      const slide = document.createElement('div');
      slide.className = 'category-carousel-page';
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'sayfa');
      slide.append(...cards.slice(start, start + pageSize));
      slides.push(slide);
    }
    track.replaceChildren(...slides);
    indicators.replaceChildren(...slides.map((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `${index + 1}. ürün grubu sayfası`);
      button.addEventListener('click', () => { page = index; updateControls(); });
      return button;
    }));
    updateControls();
  };
  previous.addEventListener('click', () => { page -= 1; updateControls(); });
  next.addEventListener('click', () => { page += 1; updateControls(); });
  compact.addEventListener('change', renderPages);
  renderPages();
  homeCategories.replaceChildren(stage, indicators);
  homeCategories.setAttribute('aria-busy', 'false');
};
window.DILEK_HOME_READY.then(renderCategories).catch((error) => {
  console.error(error);
  showCategoryMessage('Ürün grupları şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.');
});

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
  navigation.classList.toggle("is-open", open);
});

navigation?.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Menüyü aç");
  navigation.classList.remove("is-open");
});

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const canvas = document.querySelector("#hero-shader");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });

  if (gl) {
    const vertexSource = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;
    const fragmentSource = `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution - 0.5;
        uv.x *= resolution.x / resolution.y;
        float t = time * 0.12;
        float grain = noise(uv * 18.0 + t) * 0.035;
        float field = noise(uv * 3.2 + vec2(t * 0.45, -t * 0.2));
        float curve = 0.12 * sin(uv.x * 2.2 + t) + 0.08 * sin(uv.x * 4.1 - t * 0.7);
        float distanceToTrace = abs(uv.y - curve - 0.04);
        float trace = 1.0 - smoothstep(0.004, 0.018, distanceToTrace);
        float glow = exp(-distanceToTrace * distanceToTrace * 32.0);
        float vignette = 1.0 - smoothstep(0.08, 1.1, length(uv * vec2(0.75, 1.15)));
        float grid = step(0.994, max(sin(uv.x * 42.0), sin(uv.y * 42.0))) * 0.035;
        vec3 base = vec3(0.055, 0.063, 0.059) + field * 0.018;
        vec3 red = vec3(0.55, 0.075, 0.065) * (glow * 0.24 + trace * 0.12);
        vec3 color = (base + red + vec3(grid + grain)) * vignette;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();

    if (vertex && fragment) {
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
    }

    if (vertex && fragment && gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const position = gl.getAttribLocation(program, "position");
      const resolution = gl.getUniformLocation(program, "resolution");
      const time = gl.getUniformLocation(program, "time");
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        const ratio = Math.min(devicePixelRatio, 1.25);
        canvas.width = Math.round(bounds.width * ratio);
        canvas.height = Math.round(bounds.height * ratio);
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      new ResizeObserver(resize).observe(canvas);
      resize();

      let visible = true;
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
      const render = (now = 0) => {
        if (visible) {
          gl.uniform2f(resolution, canvas.width, canvas.height);
          gl.uniform1f(time, now * 0.001);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        if (!reducedMotion) requestAnimationFrame(render);
      };
      render();
    }
  }
}
