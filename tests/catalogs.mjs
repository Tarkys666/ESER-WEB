// Run with the local Worker on port 8787 and test-only admin credentials.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:8787';
let token = '';
async function request(path, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json();
}

const home = await request('/api/home');
const defaults = home.categories.filter((category) => category.cover_path?.startsWith('assets/catalogs/'));
assert.equal(defaults.length, 15);
for (const category of defaults) {
  const bytes = await readFile(new URL(`../${category.cover_path}`, import.meta.url));
  assert.ok(bytes.length > 0, category.name);
}
({ token } = await request('/api/admin/login', 'POST', {
  email: 'test@example.com', password: 'local-test-password',
}));
const id = `catalog-test-${crypto.randomUUID()}`;
await request('/api/admin/categories', 'POST', { id, name: 'Catalog test', sort_order: 16 });
let uploaded;
try {
  assert.equal((await request('/api/home')).categories.length, home.categories.length + 1);
  const image = await readFile(new URL('../assets/catalogs/spiralli-kanal-acma-makineleri.jpeg', import.meta.url));
  const response = await fetch(`${base}/api/admin/media?kind=category`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: image,
  });
  assert.ok(response.ok);
  uploaded = await response.json();
  assert.ok(uploaded.storage_path.startsWith('categories/'));
  await request(`/api/admin/categories/${id}`, 'PUT', { cover_path: uploaded.storage_path });
  assert.equal((await request('/api/home')).categories.find((category) => category.id === id).cover_path, uploaded.storage_path);
  assert.equal((await fetch(`${base}${uploaded.url}`)).status, 200);
} finally {
  await request(`/api/admin/categories/${id}`, 'DELETE');
  if (uploaded) await request(`/api/admin/media?key=${encodeURIComponent(uploaded.storage_path)}`, 'DELETE');
}
console.log('Passed 15 default covers, extra category, cover upload and public image checks.');
