const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/catalog.js'), 'utf8'), sandbox);
const { categories, products } = sandbox.window.DILEK_CATALOG;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const slug = (value) => value.toLocaleLowerCase('tr').replaceAll('ı', 'i')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sql = [
  '-- Existing sample catalog. Does not overwrite previously edited records.',
  'begin;',
  'insert into public.categories(id, name, sort_order) values',
  categories.map((item, index) => `(${quote(item.id)}, ${quote(item.name)}, ${index})`).join(',\n'),
  'on conflict (id) do nothing;',
  'insert into public.products(slug, title, category_id, source_url, sort_order, status) values',
  products.map((item, index) => `(${quote(slug(item.name))}, ${quote(item.name)}, ${quote(item.category)}, ${quote(item.source)}, ${index}, \'published\')`).join(',\n'),
  'on conflict (slug) do nothing;',
  'commit;',
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'supabase/seed.sql'), sql);
console.log(`Exported ${categories.length} categories and ${products.length} products.`);
