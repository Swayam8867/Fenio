const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
let products = [];

function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

function render(list){
  empty.hidden = list.length > 0;
  grid.innerHTML = list.map(p => `
    <article class="card">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
      <div class="body">
        <h2>${esc(p.name)}</h2>
        ${p.price ? `<div class="price">${esc(p.price)}</div>` : ''}
        <p>${esc(p.description)}</p>
        <a class="btn" href="${esc(p.link)}" target="_blank" rel="sponsored noopener noreferrer">Buy now</a>
      </div>
    </article>`).join('');
}

fetch('/api/products').then(r => r.ok ? r.json() : Promise.reject()).catch(() => fetch('products.json').then(r => r.json())).then(d => { products = d; render(products); })
  .catch(() => { empty.hidden = false; empty.textContent = 'Could not load products.'; });

document.getElementById('q').addEventListener('input', e => {
  const t = e.target.value.toLowerCase();
  render(products.filter(p => (p.name + ' ' + p.description).toLowerCase().includes(t)));
});
