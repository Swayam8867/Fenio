const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'uploads'), { recursive: true });

for (const f of ['index.html', 'style.css', 'app.js']) {
  fs.copyFileSync(path.join(__dirname, 'public', f), path.join(out, f));
}
const db = path.join(__dirname, 'products.json');
const products = fs.existsSync(db) ? JSON.parse(fs.readFileSync(db, 'utf8')) : [];
fs.writeFileSync(path.join(out, 'products.json'), JSON.stringify(products.reverse(), null, 2));

const up = path.join(__dirname, 'uploads');
if (fs.existsSync(up)) for (const f of fs.readdirSync(up)) fs.copyFileSync(path.join(up, f), path.join(out, 'uploads', f));

console.log('Done. Upload the "dist" folder to Netlify.');