// Private admin API. Runs on Netlify. Saves products into your GitHub repo; Netlify then rebuilds the store.
const crypto = require('crypto');

const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, DS24_AFFILIATE_ID = '', DS24_CAMPAIGN_KEY = '' } = process.env;
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const passwordOk = (p) => ADMIN_PASSWORD && crypto.timingSafeEqual(sha(p || ''), sha(ADMIN_PASSWORD));

async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com' + path, {
    ...opts,
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'fenio-admin', 'Content-Type': 'application/json' }
  });
  return r;
}
async function getFile(p) {
  const r = await gh(`/repos/${GITHUB_REPO}/contents/${p}?ref=${BRANCH}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GitHub read failed (' + r.status + ')');
  return r.json();
}
async function putFile(p, b64, message, fileSha) {
  const r = await gh(`/repos/${GITHUB_REPO}/contents/${p}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: b64, branch: BRANCH, ...(fileSha ? { sha: fileSha } : {}) })
  });
  if (!r.ok) { const e = new Error('GitHub write failed (' + r.status + ')'); e.status = r.status; throw e; }
}
async function readProducts() {
  const f = await getFile('products.json');
  if (!f) return { list: [], sha: null };
  return { list: JSON.parse(Buffer.from(f.content, 'base64').toString('utf8') || '[]'), sha: f.sha };
}
async function saveProducts(mutate, message) {
  for (let i = 0; i < 3; i++) {
    const { list, sha } = await readProducts();
    const next = mutate(list);
    try { await putFile('products.json', Buffer.from(JSON.stringify(next, null, 2)).toString('base64'), message, sha); return next; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  throw new Error('Could not save, please try again.');
}

const DS_HOST = /(^|\.)(digistore24|digistore24-app|ds24|checkout-ds24)\.com$/i;
function buildLink(input) {
  input = (input || '').trim();
  if (/^\d+$/.test(input)) {
    if (!DS24_AFFILIATE_ID) return { error: 'Add DS24_AFFILIATE_ID in Netlify settings to use product IDs, or paste your full promolink.' };
    return { link: `https://www.digistore24.com/redir/${input}/${DS24_AFFILIATE_ID}/${encodeURIComponent(DS24_CAMPAIGN_KEY)}`.replace(/\/$/, '') };
  }
  try {
    const u = new URL(input);
     if (u.protocol !== 'https:') throw 0;
    return { link: u.toString() };
  } catch { return { error: 'Enter a Digistore24 product ID or a promolink starting with https://www.digistore24.com/redir/...' }; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Not allowed' });
  if (!ADMIN_PASSWORD || !GITHUB_TOKEN || !GITHUB_REPO) return json(500, { error: 'Setup incomplete: add ADMIN_PASSWORD, GITHUB_TOKEN and GITHUB_REPO in Netlify environment variables.' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad request' }); }

  if (!passwordOk(b.password)) { await new Promise((r) => setTimeout(r, 1500)); return json(401, { error: 'Wrong password' }); }

  try {
    if (b.action === 'login') return json(200, { ok: true });

    if (b.action === 'list') return json(200, { products: (await readProducts()).list.slice().reverse() });

    if (b.action === 'add') {
      const p = b.product || {};
      const name = String(p.name || '').trim();
      const built = buildLink(p.link);
      if (!name) return json(400, { error: 'Product name is required.' });
      if (built.error) return json(400, { error: built.error });
      const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      const ext = types[p.imageType];
      if (!ext || !p.imageBase64) return json(400, { error: 'Please choose a JPG, PNG, WEBP or GIF image.' });
      if (p.imageBase64.length > 4.5 * 1024 * 1024) return json(400, { error: 'Image is too large. Use a smaller image.' });

      const file = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      await putFile(`uploads/${file}`, p.imageBase64, `Add image for ${name}`);
      const product = {
        id: crypto.randomUUID(), name: name.slice(0, 120), description: String(p.description || '').trim().slice(0, 600),
        price: String(p.price || '').trim().slice(0, 30), link: built.link, category: String(p.category || '').trim().slice(0, 30),
        image: '/uploads/' + file
      };
      await saveProducts((l) => [...l, product], `Add product: ${name}`);
      return json(200, { ok: true, product });
    }

    if (b.action === 'delete') {
      let removed = null;
      await saveProducts((l) => { removed = l.find((x) => x.id === b.id) || null; return l.filter((x) => x.id !== b.id); }, 'Remove product');
      if (removed && removed.image && removed.image.startsWith('/uploads/')) {
        const f = await getFile(removed.image.slice(1));
        if (f) await gh(`/repos/${GITHUB_REPO}/contents/${removed.image.slice(1)}`, { method: 'DELETE', body: JSON.stringify({ message: 'Remove image', sha: f.sha, branch: BRANCH }) });
      }
      return json(200, { ok: true });
    }
    return json(400, { error: 'Unknown action' });
  } catch (e) {
    return json(502, { error: e.message || 'Something went wrong' });
  }
};
