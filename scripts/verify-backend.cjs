const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const load = (fetchImplementation) => {
  const context = vm.createContext({ window: {}, fetch: fetchImplementation, URL, URLSearchParams, AbortSignal });
  for (const file of ['catalog.js', 'supabase-config.js', 'backend.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), context);
  }
  return context.window.DILEK_CATALOG_READY;
};

(async () => {
  const catalog = await load(fetch);
  assert(catalog.categories.length >= 16, 'Seed categories must be readable');
  assert(catalog.products.length >= 18, 'Published seed products must be readable');
  assert(catalog.products.every((product) => product.id && product.slug && product.name));
  await assert.rejects(load(async () => ({ ok: false, status: 503 })), /503/);
  console.log(`PASS: live API returned ${catalog.categories.length} categories and ${catalog.products.length} products; outage is reported.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
