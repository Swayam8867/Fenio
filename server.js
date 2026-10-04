const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme'; // CHANGE THIS
const DB = path.join(__dirname, 'products.json');
const UPLOADS = path.join(__dirname, 'uploads');

fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');
const read = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const write = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_, f, cb) => cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + path.extname(f.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(f.mimetype))
});

const tokens = new Set();
const auth = (req, res, next) =>
  tokens.has((req.headers.authorization || '').replace('Bearer ', '')) ? next() : res.status(401).json({ error: 'Not logged in' });

const app = express();
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(path.join(__dirname, 'public')));

// Public: list products
app.get('/api/products', (_, res) => res.json(read().reverse()));

// Admin login
app.post('/api/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const t = crypto.randomBytes(24).toString('hex');
  tokens.add(t);
  res.json({ token: t });
});

// Admin: add product
app.post('/api/products', auth, upload.single('image'), (req, res) => {
  const { name, description, link, price } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Please choose a PNG, JPG, WEBP or GIF image (max 5 MB).' });
  if (!name || !link || !/^https?:\/\//i.test(link)) return res.status(400).json({ error: 'Name and a full affiliate link (starting with http) are required.' });
  const list = read();
  const p = { id: crypto.randomUUID(), name: name.trim(), description: (description || '').trim(), price: (price || '').trim(), link: link.trim(), image: '/uploads/' + req.file.filename };
  list.push(p);
  write(list);
  res.json(p);
});

// Admin: delete product
app.delete('/api/products/:id', auth, (req, res) => {
  const list = read();
  const p = list.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  fs.unlink(path.join(__dirname, p.image), () => {});
  write(list.filter((x) => x.id !== p.id));
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Store running: http://localhost:${PORT}   Admin: http://localhost:${PORT}/admin.html`));
