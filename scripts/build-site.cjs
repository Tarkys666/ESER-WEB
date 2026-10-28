const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Invalid publish directory');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const entry of ['index.html', 'urunler.html', 'urun.html', 'admin.html', 'styles.css', 'admin.css', 'src', 'assets']) {
  fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}
console.log('Static site built in dist/');
