const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('token');

function show(){ $('login').hidden = !!token; $('dash').hidden = !token; if(token) load(); }
const hdr = () => ({ Authorization: 'Bearer ' + token });
const esc = (s) => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

async function login(){
  const r = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('pw').value})});
  const d = await r.json();
  if(!r.ok){ $('loginMsg').textContent = d.error; return; }
  token = d.token; sessionStorage.setItem('token', token); show();
}
$('loginBtn').onclick = login;
$('pw').addEventListener('keydown', e => e.key === 'Enter' && login());

async function load(){
  const list = await (await fetch('/api/products')).json();
  $('list').innerHTML = list.length ? list.map(p => `
    <div class="row"><img src="${esc(p.image)}" alt=""><span>${esc(p.name)}</span>
    <button class="btn ghost" data-id="${p.id}">Delete</button></div>`).join('') : '<p class="empty">Nothing published yet.</p>';
}

$('list').addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if(!id || !confirm('Delete this product?')) return;
  const r = await fetch('/api/products/' + id, { method:'DELETE', headers: hdr() });
  if(r.status === 401){ token = null; sessionStorage.removeItem('token'); show(); return; }
  load();
});

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('msg'); msg.className = 'msg'; msg.textContent = 'Publishing…';
  const r = await fetch('/api/products', { method:'POST', headers: hdr(), body: new FormData(e.target) });
  const d = await r.json();
  if(r.status === 401){ token = null; sessionStorage.removeItem('token'); show(); return; }
  if(!r.ok){ msg.className = 'msg err'; msg.textContent = d.error; return; }
  msg.className = 'msg ok'; msg.textContent = 'Published. It is now live on your store.';
  e.target.reset(); load();
});
show();
