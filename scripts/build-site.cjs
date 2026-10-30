const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Invalid publish directory');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const entry of ['index.html', 'urunler.html', 'urun.html', 'admin.html', 'styles.css', 'admin.css', 'src', 'assets', '_headers']) {
  fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}
const originalAssets = new Set();
for (const page of ['index.html', 'urunler.html', 'urun.html', 'admin.html']) {
  const file = path.join(output, page);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/(src|href)="((?:src\/[^"?]+\.js|(?:styles|admin)\.css))(?:\?[^\"]*)?"/g, (match, attribute, asset) => {
    const source = path.join(output, asset);
    if (!fs.existsSync(source)) return match;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex').slice(0, 12);
    const fingerprinted = path.join(path.dirname(source), `${path.basename(source, path.extname(source))}.${hash}${path.extname(source)}`);
    if (!fs.existsSync(fingerprinted)) fs.copyFileSync(source, fingerprinted);
    originalAssets.add(source);
    return `${attribute}="${path.relative(output, fingerprinted).replaceAll(path.sep, '/')}"`;
  });
  fs.writeFileSync(file, html);
}
for (const source of originalAssets) fs.rmSync(source);
console.log('Static site built in dist/');
