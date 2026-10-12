const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
let products = [], cat = '';

const st = document.createElement('style');
st.textContent = `
a.card{text-decoration:none;color:inherit;transition:transform .15s}
a.card:hover{transform:translateY(-3px)}
a.card .body{padding:12px 14px 16px}
a.card h2{font-size:1.05rem;line-height:1.3}
.chip{font:inherit;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer}
.chip.on{background:var(--ink);color:var(--bg)}
@media (prefers-reduced-motion:reduce){a.card{transition:none}a.card:hover{transform:none}}`;
document.head.appendChild(st);

function esc(s){const d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML}

function render(list){
  empty.hidden = list.length > 0;
  grid.innerHTML = list.map(p => `
    <a class="card" href="product.html?id=${encodeURIComponent(p.id)}">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
      <div class="body"><h2>${esc(p.name)}</h2></div>
    </a>`).join('');
}

function chips(){
  const box = document.getElementById('cats');
  if (!box) return;
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
  box.innerHTML = cats.length ? ['All', ...cats].map(c => {
    const v = c === 'All' ? '' : c;
    return `<button class="chip${v === cat ? ' on' : ''}" data-c="${esc(v)}">${esc(c)}</button>`;
  }).join('') : '';
}

function apply(){
  const q = document.getElementById('q');
  const t = q ? q.value.toLowerCase() : '';
  render(products.filter(p => (!cat || p.category === cat) && (p.name + ' ' + (p.description || '')).toLowerCase().includes(t)));
  chips();
}

const cats = document.getElementById('cats');
if (cats) cats.addEventListener('click', e => { if (e.target.dataset.c !== undefined) { cat = e.target.dataset.c; apply(); } });
const q = document.getElementById('q');
if (q) q.addEventListener('input', apply);

fetch('/api/products').then(r => r.ok ? r.json() : Promise.reject())
  .catch(() => fetch('products.json').then(r => r.json()))
  .then(d => { products = d; apply(); })
  .catch(() => { empty.hidden = false; empty.textContent = 'Could not load products.'; });