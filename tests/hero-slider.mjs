import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const code = await readFile(new URL('../src/hero-slider.js', import.meta.url), 'utf8');
const bundled = { image_path: 'slides/1a18dae5ddf-9e8e943.jpg', alt_text: 'First slide' };
const custom = { image_path: 'slides/admin-upload.webp', alt_text: 'Admin slide' };

async function run(slides, failBundled = false) {
  const nodes = new Map();
  const timers = new Map();
  const images = [];
  const rendered = [];
  const placeholder = { hidden: true, remove() {} };
  for (const id of ['.slider-controls', '#slide-counter', '#slide-pause', '#slide-previous', '#slide-next']) {
    nodes.set(id, { hidden: true, addEventListener(event, callback) { this[event] = callback; }, setAttribute() {} });
  }
  const region = {
    querySelector: (selector) => selector === 'img' ? placeholder : nodes.get(selector),
    insertBefore(image) { rendered.push(image); image.attached = true; },
  };
  class TestImage {
    constructor() { images.push(this); }
    async decode() {
      assert.ok(this.attached || rendered.length, 'First slide must enter the DOM before decoding');
      if (failBundled && this.src.includes('/optimized/')) throw new Error('Missing bundled image');
    }
    remove() { this.attached = false; }
    animate() { return { finished: Promise.resolve() }; }
  }
  const calls = [];
  const context = {
    document: { querySelector: () => region, hidden: false, addEventListener() {} },
    window: { DILEK_API: {
      get: async (path) => { calls.push(path); return slides; },
      imageUrl: (key) => `https://api.example/api/media/${key}`,
    } },
    Image: TestImage,
    matchMedia: () => ({ matches: true }),
    setTimeout: (callback, delay) => { timers.set(delay, callback); return delay; },
    clearTimeout: (id) => timers.delete(id),
  };
  await vm.runInNewContext(code, context);
  await new Promise(setImmediate);
  return { region, nodes, timers, images, calls, rendered };
}

const normal = await run([bundled, custom]);
assert.deepEqual(normal.calls, ['/api/slides']);
assert.equal(normal.images.length, 1, 'Next slide must not download immediately');
assert.match(normal.images[0].srcset, /800w.*1200w/);
assert.equal(normal.nodes.get('#slide-counter').textContent, '1 / 2');
normal.timers.get(1500)();
assert.equal(normal.images[1].src, 'https://api.example/api/media/slides/admin-upload.webp');
assert.equal(normal.images[1].fetchPriority, 'low');
normal.nodes.get('#slide-pause').click();
assert.equal(normal.timers.size, 0, 'Pausing must cancel autoplay and prefetch');

const fallback = await run([bundled], true);
assert.equal(fallback.images[0].srcset, '');
assert.equal(fallback.images[0].src, `https://api.example/api/media/${bundled.image_path}`);
assert.equal((await run([])).region.hidden, true);
assert.equal((await run([custom])).images[0].src, 'https://api.example/api/media/slides/admin-upload.webp');

const backend = await readFile(new URL('../src/backend.js', import.meta.url), 'utf8');
for (const isCatalog of [false, true]) {
  const requests = [];
  const window = { DILEK_API: { get: async (path) => {
    requests.push(path);
    return path === '/api/home' ? { categories: [] } : { items: [] };
  } } };
  vm.runInNewContext(backend, { window, document: { querySelector: () => isCatalog } });
  await window.DILEK_CATALOG_READY;
  assert.equal(requests.includes('/api/products'), isCatalog);
}
console.log('Passed slide loading, delayed prefetch, pause, R2 fallback, admin slides and catalog request checks.');
