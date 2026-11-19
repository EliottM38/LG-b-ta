/* Lutèce Group — site public de l'alliance
   - Aucune clé ni URL externe ici : les données viennent de /api/public-parc
     (liens, photos et catalogue configurés depuis l'espace staff).
   - Animations : apparitions, parallaxe, compteurs, mots révélés au scroll,
     inclinaison des cartes. Tout est désactivé si l'utilisateur demande
     « réduire les animations ». */
(() => {
'use strict';
const BASE = '/alliance/';
const API = '/api/public-parc';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const root = document.documentElement;
root.classList.add('js');
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = n => Number(n).toLocaleString('fr-FR');
const page = (document.body.dataset.page || '');
const CATS = ['Minibus', 'Midibus', 'Standards', 'Articulés', 'BHNS', 'LE & Cars'];

/* ------------------------------------------------------------ données */
let dataP;
function loadData() {
  if (dataP) return dataP;
  dataP = (async () => {
    try {
      const c = JSON.parse(sessionStorage.getItem('lg_pub') || 'null');
      if (c && Date.now() - c.t < 300000) return c.d;
    } catch (e) {}
    try {
      const r = await fetch(API, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      try { sessionStorage.setItem('lg_pub', JSON.stringify({ t: Date.now(), d })); } catch (e) {}
      return d;
    } catch (e) { return null; }
  })();
  return dataP;
}

/* ------------------------------------------------------------ menu */
const MENU = [
  { t: 'Qui sommes-nous ?', cols: [{ h: 'L’alliance', l: [
    ['presentation.html', 'Présentation de Lutèce Group', 'Nos services, nos forfaits, nos conditions d’entrée'],
    ['reglement.html', 'Le règlement de l’Alliance', 'Les règles communes, de A à J'],
    ['forfaits.html', 'Nos forfaits', 'Standard et Ultimate, côte à côte']] }] },
  { t: 'Service Location', cols: [
    { h: 'Louer', l: [
      ['pole-location.html', 'Pôle Location', 'Tarifs, règles et Service Après Location'],
      ['pole-location.html#tarifs', 'Tarifs de location', 'À la journée, à la semaine, au mois'],
      ['pole-location.html#sal', 'Service Après Location', 'Pannes, immobilisations, contrôles techniques']] },
    { h: 'Notre parc', l: [['parc.html', 'Notre Parc', 'Le catalogue complet']]
      .concat(CATS.map(c => ['parc.html?cat=' + encodeURIComponent(c), c, '', 1])) }] },
  { t: 'Service Exploitation et Financement', cols: [
    { h: 'Exploitation', l: [
      ['pole-exploitation.html', 'Pôle Exploitation', 'Intérimaires et ateliers de l’Alliance'],
      ['pole-exploitation.html#interimaires', 'Demande d’intérimaires', 'Mécaniciens et conducteurs'],
      ['pole-exploitation.html#ateliers', 'Ateliers de l’Alliance', 'Pannes, options, véhicule de remplacement']] },
    { h: 'Financement', l: [
      ['pole-financement.html', 'Pôle Financement', 'CT, révisions, FCO, rénovations'],
      ['pole-financement.html#gold', 'Programme GOLD', 'Daimler Buses et VDI Star'],
      ['pole-financement.html#renovations', 'Rénovations', 'Intérieures et techniques']] }] }
];
const here = location.pathname.split('/').pop() || 'index.html';

function headerHTML() {
  const items = MENU.map(g => {
    const cur = g.cols.some(c => c.l.some(l => l[0].split(/[#?]/)[0] === here));
    return `<div class="nav-i${cur ? ' cur' : ''}"><button class="nav-b" type="button" aria-haspopup="true">${esc(g.t)} <i class="fa-solid fa-chevron-down"></i></button>
      <div class="mega">${g.cols.map(c => `<div class="mega-col"><h4>${esc(c.h)}</h4>${c.l.map(l =>
        `<a href="${BASE}${l[0]}"${l[3] ? ' class="sub"' : ''}><b>${esc(l[1])}</b>${l[2] ? `<span>${esc(l[2])}</span>` : ''}</a>`).join('')}</div>`).join('')}</div></div>`;
  }).join('');
  return `<header class="hdr" id="hdr"><div class="wrap hdr-in">
    <a class="brand" href="${BASE}index.html" aria-label="Lutèce Group — accueil"><span class="brand-mark">LG</span><span>Lutèce Group<small>Opérateur de transport</small></span></a>
    <nav class="nav" aria-label="Navigation principale">${items}<a class="btn btn-gold btn-sm hdr-cta" href="${BASE}rejoindre.html">Nous rejoindre</a></nav>
    <button class="burger" id="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false"><i></i><i></i></button>
  </div></header><div class="progress" id="progress"></div>`;
}

function footerHTML() {
  const L = (p, t) => `<li><a href="${BASE}${p}">${t}</a></li>`;
  const K = (k, t) => `<li data-link="${k}"><a rel="noopener" target="_blank">${t}</a></li>`;
  return `<footer class="ftr"><div class="wrap">
    <div class="ftr-top">
      <div><a class="brand" href="${BASE}index.html"><span class="brand-mark">LG</span><span>Lutèce Group</span></a>
        <p>Opérateur de transport et prestataire de service privé, spécialisé dans les services auxiliaires des transports terrestres.</p></div>
      <div><h4>Qui sommes-nous ?</h4><ul>${L('presentation.html', 'Présentation')}${L('reglement.html', 'Règlement de l’Alliance')}${L('forfaits.html', 'Nos forfaits')}${L('rejoindre.html', 'Nous rejoindre')}</ul></div>
      <div><h4>Service Location</h4><ul>${L('pole-location.html', 'Pôle Location')}${L('parc.html', 'Notre Parc')}${L('pole-location.html#tarifs', 'Tarifs de location')}${L('pole-location.html#sal', 'Service Après Location')}</ul></div>
      <div><h4>Exploitation &amp; Financement</h4><ul>${L('pole-exploitation.html', 'Pôle Exploitation')}${L('pole-exploitation.html#ateliers', 'Ateliers de l’Alliance')}${L('pole-financement.html', 'Pôle Financement')}${L('pole-financement.html#gold', 'Programme GOLD')}</ul></div>
      <div><h4>Liens utiles</h4><ul>${K('forum', 'Forum Transport Manager')}${K('tm', 'Transport Manager')}${K('demande_location', 'Demande de location')}${K('sal', 'Formulaire S.A.L')}${K('intervention', 'Intervention atelier')}${K('remboursement', 'Demande de remboursement')}${K('disponibilites', 'Disponibilités du parc')}</ul></div>
    </div>
    <div class="ftr-bot"><span>© 2026 Lutèce Group</span><span>Site conçu dans le cadre du jeu Transport Manager</span></div>
  </div></footer>`;
}

function mountChrome() {
  const h = $('#hdr-slot'), f = $('#ftr-slot');
  if (h) h.outerHTML = headerHTML();
  if (f) f.outerHTML = footerHTML();
  const hdr = $('#hdr'), burger = $('#burger');
  if (burger) burger.addEventListener('click', () => {
    const o = hdr.classList.toggle('open');
    burger.setAttribute('aria-expanded', o);
    document.body.style.overflow = o ? 'hidden' : '';
  });
  $$('.nav-b').forEach(b => b.addEventListener('click', () => { if (innerWidth <= 1060) b.parentElement.classList.toggle('open'); }));
  $$('.nav a').forEach(a => a.addEventListener('click', () => { hdr.classList.remove('open'); document.body.style.overflow = ''; }));
  addEventListener('keydown', e => { if (e.key === 'Escape') { hdr.classList.remove('open'); document.body.style.overflow = ''; } });
}

/* ------------------------------------------------------------ routes (décor des hero sans photo) */
function routesSVG() {
  return `<svg class="routes" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path pathLength="1" d="M-20 610 C 220 610 280 420 520 420 S 800 560 1020 330 S 1300 190 1470 190"/>
    <path pathLength="1" d="M-20 720 C 300 720 420 640 640 640 S 960 700 1160 520 S 1380 420 1470 430"/>
    <path pathLength="1" d="M300 -20 C 340 160 520 200 600 330 S 700 560 880 640 S 1160 790 1200 830"/>
    <circle cx="520" cy="420" r="9" style="animation-delay:1.4s"/><circle cx="1020" cy="330" r="9" style="animation-delay:2.2s"/>
    <circle cx="640" cy="640" r="9" style="animation-delay:2.8s"/><circle cx="1160" cy="520" r="9" style="animation-delay:3.4s"/>
  </svg>`;
}
function decorate() {
  $$('.hero,.phero').forEach(h => { if (!$('.routes', h)) h.insertAdjacentHTML('afterbegin', routesSVG()); });
}

/* ------------------------------------------------------------ silhouettes (quand il n'y a pas encore de photo) */
function busSVG(cat) {
  const wheel = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="19"/><circle cx="${cx}" cy="${cy}" r="6"/>`;
  const body = (x, y, w, h, win) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`;
    const n = Math.max(2, Math.floor((w - 96) / 50));
    for (let i = 0; i < n; i++) s += `<rect x="${x + 20 + i * 50}" y="${y + 16}" width="38" height="${win}" rx="6"/>`;
    return s + `<rect x="${x + w - 70}" y="${y + 16}" width="26" height="${h - 16}" rx="4"/>`;
  };
  let i;
  switch (cat) {
    case 'Minibus': i = body(100, 84, 200, 78, 28) + wheel(150, 166) + wheel(252, 166); break;
    case 'Midibus': i = body(66, 72, 268, 90, 30) + wheel(120, 166) + wheel(270, 166); break;
    case 'Articulés': i = body(14, 68, 176, 94, 32) + body(214, 68, 176, 94, 32) + '<path d="M190 82c12 0 12 6 24 0M190 148c12 0 12-6 24 0"/>' + wheel(60, 166) + wheel(150, 166) + wheel(300, 166); break;
    case 'BHNS': i = '<path d="M150 66l22-20h56l22 20" opacity=".7"/>' + body(28, 66, 344, 96, 32) + wheel(96, 166) + wheel(300, 166); break;
    case 'LE & Cars': i = body(24, 50, 352, 112, 40) + '<rect x="60" y="118" width="64" height="30" rx="5" opacity=".7"/><rect x="134" y="118" width="64" height="30" rx="5" opacity=".7"/>' + wheel(96, 166) + wheel(300, 166); break;
    default: i = body(28, 66, 344, 96, 32) + wheel(96, 166) + wheel(300, 166);
  }
  return `<svg viewBox="0 0 400 220" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${i}<path d="M10 192h380" opacity=".3"/></svg>`;
}

/* ------------------------------------------------------------ données → éléments communs */
function applyData(d) {
  if (!d) return;
  $$('[data-img]').forEach(el => {
    const u = d.site_images && d.site_images[el.dataset.img];
    if (u) { el.style.backgroundImage = `url("${u}")`; el.classList.remove('noimg'); el.classList.add('has'); }
  });
  $$('[data-link]').forEach(el => {
    const u = d.links && d.links[el.dataset.link];
    if (!u) return;
    const a = el.matches('a') ? el : $('a', el);
    if (a) { a.href = u; a.target = '_blank'; a.rel = 'noopener'; }
    el.classList.add('ok');
  });
  if (d.stats) {
    $$('[data-stat]').forEach(el => {
      const v = d.stats[el.dataset.stat];
      if (v > 0) { el.dataset.count = v; el.dataset.suffix = ''; el.textContent = fmt(v); }
    });
  }
}

/* ------------------------------------------------------------ animations */
let ro;
function observeReveal(scope) {
  const els = $$('.rv:not(.in)', scope || document);
  if (REDUCE || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  if (!ro) ro = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(e => ro.observe(e));
}
function stagger() {
  $$('[data-stagger]').forEach(p => $$(':scope > .rv', p).forEach((c, i) => c.style.setProperty('--d', (i * 90) + 'ms')));
}

function countUp(el) {
  const target = Number(el.dataset.count || 0), suf = el.dataset.suffix || '';
  if (REDUCE || !target) { el.textContent = fmt(target) + suf; return; }
  const t0 = performance.now(), dur = 1900;
  const step = t => {
    const p = clamp((t - t0) / dur, 0, 1), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.textContent = fmt(Math.round(target * e)) + suf;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function observeCounters() {
  const els = $$('[data-count]');
  if (!('IntersectionObserver' in window)) { els.forEach(countUp); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } }), { threshold: .6 });
  els.forEach(e => io.observe(e));
}

function splitStatement() {
  $$('.statement').forEach(el => {
    const out = [];
    el.childNodes.forEach(n => {
      const hl = n.nodeType === 1 && n.tagName === 'B';
      const txt = n.textContent.split(/\s+/).filter(Boolean);
      txt.forEach(w => out.push(`<span class="w${hl ? ' hl' : ''}">${esc(w)}</span>`));
    });
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = out.join(' ');
  });
}

function tilt() {
  if (REDUCE || !FINE) return;
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.mcard');
    $$('.mcard.tilted').forEach(x => { if (x !== c) { x.style.transform = ''; x.classList.remove('tilted'); } });
    if (!c) return;
    const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `perspective(1000px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-6px)`;
    c.classList.add('tilted');
  });
  document.addEventListener('pointerleave', () => $$('.mcard.tilted').forEach(x => { x.style.transform = ''; x.classList.remove('tilted'); }));
  document.addEventListener('pointermove', e => {
    const b = e.target.closest && e.target.closest('.btn-gold,.btn-ghost');
    $$('.btn.mag').forEach(x => { if (x !== b) { x.style.translate = ''; x.classList.remove('mag'); } });
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.translate = `${((e.clientX - r.left - r.width / 2) * .16).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .22).toFixed(1)}px`;
    b.classList.add('mag');
  });
}

let ticking = false;
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
function frame() {
  ticking = false;
  const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
  const hdr = $('#hdr'); if (hdr) hdr.classList.toggle('scrolled', y > 40);
  const pr = $('#progress'); if (pr) pr.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
  if (REDUCE) return;
  $$('.hero-bg,.cta .bg').forEach(el => {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    el.style.setProperty('--py', ((vh / 2 - (r.top + r.height / 2)) * -.12).toFixed(1) + 'px');
  });
  $$('.statement').forEach(el => {
    const r = el.getBoundingClientRect(), w = $$('.w', el);
    const p = clamp((vh * .9 - r.top) / (r.height + vh * .2), 0, 1), n = p * (w.length + 2);
    w.forEach((s, i) => { s.style.opacity = (.16 + .84 * clamp(n - i, 0, 1)).toFixed(2); });
  });
}

function rails() {
  $$('[data-rail]').forEach(w => {
    const rail = $('.rail', w);
    const go = d => rail.scrollBy({ left: d * Math.min(420, rail.clientWidth * .8), behavior: 'smooth' });
    const p = $('[data-prev]', w), n = $('[data-next]', w);
    if (p) p.addEventListener('click', () => go(-1));
    if (n) n.addEventListener('click', () => go(1));
  });
}

function scrollspy() {
  const links = $$('.toc a'); if (!links.length || !('IntersectionObserver' in window)) return;
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { links.forEach(l => l.classList.remove('on')); const a = map.get(e.target.id); if (a) a.classList.add('on'); }
  }), { rootMargin: '-30% 0px -60% 0px' });
  $$('.art').forEach(a => io.observe(a));
}

/* ------------------------------------------------------------ catalogue */
const ENG = { 'Diesel': 'fa-gas-pump', 'Hybride': 'fa-leaf', 'Électrique': 'fa-bolt', 'GNV': 'fa-fire-flame-simple', 'Hydrogène': 'fa-droplet' };
const engIcon = m => ENG[m] || 'fa-gas-pump';
const TKEY = { 'Minibus': 'minibus', 'Midibus': 'midibus', 'Standards': 'standard', 'Articulés': 'articule', 'LE & Cars': 'carle' };
function tarifOf(cat, d) { const k = TKEY[cat]; return k && d && d.tarifs ? d.tarifs.find(t => t.cle === k) : null; }
function yearsOf(m) { const y = Object.keys(m.annees || {}).sort(); return !y.length ? '' : (y.length === 1 ? y[0] : y[0] + ' – ' + y[y.length - 1]); }
function fmtDate(s) { return s ? s.split('-').reverse().join('/') : ''; }
const modelHref = m => `${BASE}modele.html?m=${encodeURIComponent(m.cle)}`;

function cardHTML(m, d, i) {
  const t = tarifOf(m.categorie, d), photo = m.photos && m.photos[0];
  const avail = m.suivis > 0 ? (m.disponibles > 0 ? `<span class="avail">${m.disponibles} disponible${m.disponibles > 1 ? 's' : ''}</span>` : '') : '';
  const motors = (m.moteurs || []).length ? `<li><i class="fa-solid ${engIcon(m.moteurs[0])}"></i>${esc(m.moteurs.join(' · '))}</li>` : '';
  const yrs = yearsOf(m) ? `<li><i class="fa-regular fa-calendar"></i>${esc(yearsOf(m))}</li>` : '';
  return `<a class="mcard fadein" style="--d:${Math.min(i, 12) * 55}ms" href="${modelHref(m)}">
    <div class="mcard-media">${photo ? `<img src="${esc(photo)}" alt="${esc(m.marque + ' ' + m.modele)}" loading="lazy" decoding="async">` : `<div class="ph">${busSVG(m.categorie)}</div>`}
      <span class="tag">${esc(m.categorie)}</span>${avail}</div>
    <div class="mcard-body"><div class="mcard-brand">${esc(m.marque || '—')}</div><h3>${esc(m.modele)}</h3>
      <ul class="specs">${motors}${yrs}<li><i class="fa-solid fa-bus"></i>${m.quantite} véhicule${m.quantite > 1 ? 's' : ''}</li></ul>
      <div class="mcard-foot"><span class="price">${t ? `<i>Location dès</i>${fmt(t.s)} € <small>/ semaine</small>` : '<i>Location</i><small>Tarif sur demande</small>'}</span><span class="more"><i class="fa-solid fa-arrow-right"></i></span></div></div></a>`;
}

function pageHome(d) {
  const rail = $('#rail'); if (!rail) return;
  if (!d || !d.models || !d.models.length) {
    rail.innerHTML = `<div class="empty" style="flex:1 1 100%;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.18);color:rgba(255,255,255,.7)"><b style="color:#fff">Le catalogue arrive bientôt</b>Les véhicules de l’alliance sont en cours de mise en ligne.</div>`;
    return;
  }
  const list = d.models.slice().sort((a, b) => ((b.photos || []).length - (a.photos || []).length) || (b.quantite - a.quantite)).slice(0, 10);
  rail.innerHTML = list.map((m, i) => cardHTML(m, d, i)).join('');
}

function pageParc(d) {
  const grid = $('#grid'); if (!grid) return;
  const bar = $('#fbar');
  if (!d || !d.models || !d.models.length) {
    bar.style.display = 'none'; $('#count').textContent = '';
    grid.innerHTML = `<div class="empty"><b>${d ? 'Le catalogue est en cours de mise en ligne' : 'Le catalogue est momentanément indisponible'}</b>${d ? 'Revenez bientôt : les véhicules de l’alliance apparaîtront ici.' : 'Merci de réessayer dans quelques instants.'}</div>`;
    return;
  }
  const S = { cat: new URLSearchParams(location.search).get('cat') || 'Tous', q: '', moteur: '', dispo: false, sort: 'cat' };
  if (S.cat !== 'Tous' && !CATS.includes(S.cat)) S.cat = 'Tous';
  const cnt = c => d.models.filter(m => c === 'Tous' || m.categorie === c).reduce((n, m) => n + m.quantite, 0);
  $('#chips').innerHTML = ['Tous'].concat(CATS).filter(c => c === 'Tous' || cnt(c) > 0).map(c => `<button class="chip" data-c="${esc(c)}">${esc(c)} <em>${cnt(c)}</em></button>`).join('');
  const motors = Array.from(new Set(d.models.flatMap(m => m.moteurs || []))).sort();
  $('#f-moteur').innerHTML = '<option value="">Toutes motorisations</option>' + motors.map(x => `<option>${esc(x)}</option>`).join('');
  if (!d.models.some(m => m.suivis > 0)) $('#f-dispo').style.display = 'none';
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function render() {
    $$('.chip').forEach(c => c.classList.toggle('on', c.dataset.c === S.cat));
    let l = d.models.filter(m => (S.cat === 'Tous' || m.categorie === S.cat) && (!S.moteur || (m.moteurs || []).includes(S.moteur)) && (!S.dispo || m.disponibles > 0) &&
      (!S.q || norm(m.marque + ' ' + m.modele + ' ' + m.categorie).includes(norm(S.q))));
    const by = {
      cat: (a, b) => CATS.indexOf(a.categorie) - CATS.indexOf(b.categorie) || (a.marque + a.modele).localeCompare(b.marque + b.modele, 'fr'),
      nom: (a, b) => (a.marque + a.modele).localeCompare(b.marque + b.modele, 'fr'),
      qte: (a, b) => b.quantite - a.quantite,
      recent: (a, b) => (Object.keys(b.annees || {}).sort().pop() || 0) - (Object.keys(a.annees || {}).sort().pop() || 0)
    };
    l.sort(by[S.sort]);
    $('#count').textContent = `${l.length} modèle${l.length > 1 ? 's' : ''} · ${l.reduce((n, m) => n + m.quantite, 0)} véhicules`;
    grid.innerHTML = l.length ? l.map((m, i) => cardHTML(m, d, i)).join('') : '<div class="empty"><b>Aucun modèle ne correspond</b>Essayez d’élargir vos filtres.</div>';
    const u = new URL(location.href); S.cat === 'Tous' ? u.searchParams.delete('cat') : u.searchParams.set('cat', S.cat); history.replaceState(null, '', u);
  }
  $('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { S.cat = b.dataset.c; render(); } });
  $('#f-q').addEventListener('input', e => { S.q = e.target.value; render(); });
  $('#f-moteur').addEventListener('change', e => { S.moteur = e.target.value; render(); });
  $('#f-sort').addEventListener('change', e => { S.sort = e.target.value; render(); });
  $('#f-dispo').addEventListener('click', e => { S.dispo = !S.dispo; e.currentTarget.classList.toggle('on', S.dispo); render(); });
  render();
}

function pageModele(d) {
  const out = $('#fiche'); if (!out) return;
  const key = new URLSearchParams(location.search).get('m') || '';
  const m = d && d.models ? d.models.find(x => x.cle === key) : null;
  if (!m) {
    out.innerHTML = `<div class="empty"><b>${d ? 'Modèle introuvable' : 'Catalogue momentanément indisponible'}</b><a class="link" href="${BASE}parc.html"><i class="fa-solid fa-arrow-left"></i> Retour au parc</a></div>`;
    return;
  }
  document.title = `${m.marque} ${m.modele} — Lutèce Group`;
  $('#crumb-name').textContent = `${m.marque} ${m.modele}`.trim();
  $('#crumb-cat').textContent = m.categorie; $('#crumb-cat').href = `${BASE}parc.html?cat=${encodeURIComponent(m.categorie)}`;
  const hero = $('#fiche-hero-title'); if (hero) hero.textContent = `${m.marque} ${m.modele}`.trim();
  const t = tarifOf(m.categorie, d);
  const vs = (d.vehicles || []).filter(v => v.cle === m.cle);
  const photos = m.photos || [];
  const gal = photos.length
    ? photos.map((p, i) => `<img class="${i ? '' : 'show'}" data-i="${i}" src="${esc(p)}" alt="${esc(m.marque + ' ' + m.modele)} — photo ${i + 1}" decoding="async">`).join('')
    : `<div class="ph show">${busSVG(m.categorie)}</div>`;
  const thumbs = photos.length > 1 ? `<div class="gal-thumbs">${photos.map((p, i) => `<button type="button" class="${i ? '' : 'on'}" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : '';
  const kv = [['Catégorie', m.categorie], ['Constructeur', m.marque], ['Motorisation', (m.moteurs || []).join(' · ')], ['Mise en service', yearsOf(m)],
    ['Places', m.places], ['Portes', m.portes], ['Climatisation / ventilation', m.clim], ['Accessibilité', m.accessibilite], ['Options', m.options], ['Au parc', m.quantite + ' véhicule' + (m.quantite > 1 ? 's' : '')]]
    .filter(x => x[1]).map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');
  const sCls = { 'Disponible': 's-disp', 'En préparation': 's-prep', 'Aux ateliers': 's-atel', 'En location': 's-loc' };
  const rows = vs.sort((a, b) => String(a.ref).localeCompare(String(b.ref), 'fr', { numeric: true })).map(v => `<tr><td><b>${esc(v.ref || '—')}</b></td><td>${esc(v.annee || '—')}</td><td>${esc(v.moteur || '—')}</td>
    <td>${v.statut ? `<span class="badge ${sCls[v.statut] || ''}">${esc(v.statut)}</span>${v.retour ? ` <small style="color:var(--muted)">retour le ${fmtDate(v.retour)}</small>` : ''}` : '<span style="color:var(--muted)">—</span>'}</td></tr>`).join('');
  const tar = t ? `<div class="tbl-w"><table class="tbl"><thead><tr><th>Durée</th><th>Standard</th><th class="col-u">Ultimate</th></tr></thead><tbody>
      <tr><td>À la journée</td><td><b>${fmt(t.j)} €</b></td><td class="col-u">Gratuit*</td></tr>
      <tr><td>À la semaine</td><td><b>${fmt(t.s)} €</b></td><td class="col-u">Gratuit*</td></tr>
      <tr><td>Au mois</td><td><b>${fmt(t.m)} €</b></td><td class="col-u">Gratuit*</td></tr></tbody></table></div>
      <p class="note">*Forfait Ultimate : gratuité totale dans la limite de 25 véhicules par type.${t.note ? ' ' + esc(t.note) + '.' : ''}</p>`
    : `<div class="callout"><b>Tarif sur demande</b>Ce type de véhicule n’a pas de tarif de location publié. Faites votre demande de location, nous vous répondrons.</div>`;
  const similar = d.models.filter(x => x.categorie === m.categorie && x.cle !== m.cle).slice(0, 8);
  out.innerHTML = `<div class="wrap"><div class="fiche">
    <div class="rv"><div class="gal-main" id="gal">${gal}</div>${thumbs}</div>
    <aside class="fiche-side rv" style="--d:120ms"><span class="eyebrow">${esc(m.categorie)}</span><h1>${esc(m.modele)}</h1><div class="lead" style="font-size:19px">${esc(m.marque)}</div>
      <div class="kv">${kv}</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-dark" data-link="demande_location" href="#"><i class="fa-solid fa-file-signature"></i> Demander la location</a><a class="btn btn-line" href="${BASE}pole-location.html#tarifs">Conditions de location</a></div>
    </aside></div></div>
    <section class="sec sec--soft" style="margin-top:clamp(64px,9vw,120px)"><div class="wrap"><div class="head rv"><span class="eyebrow">Tarifs</span><h2 class="h-md">Louer ce modèle</h2></div><div class="rv">${tar}</div></div></section>
    ${rows ? `<section class="sec"><div class="wrap"><div class="head rv"><span class="eyebrow">Au parc</span><h2 class="h-md">Les ${vs.length} véhicule${vs.length > 1 ? 's' : ''} de ce modèle</h2></div>
      <div class="tbl-w rv"><table class="tbl"><thead><tr><th>N° de parc</th><th>Mise en service</th><th>Motorisation</th><th>Disponibilité</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>` : ''}
    ${similar.length ? `<section class="sec sec--dark"><div class="wrap" data-rail><div class="rail-top"><div><span class="eyebrow">Dans la même catégorie</span><h2 class="h-md" style="margin-top:14px">D’autres ${esc(m.categorie)}</h2></div>
      <div class="rail-ctl"><button data-prev aria-label="Précédent"><i class="fa-solid fa-arrow-left"></i></button><button data-next aria-label="Suivant"><i class="fa-solid fa-arrow-right"></i></button></div></div>
      <div class="rail">${similar.map((x, i) => cardHTML(x, d, i)).join('')}</div></div></section>` : ''}`;
  // galerie
  const g = $('#gal');
  $$('.gal-thumbs button').forEach(b => b.addEventListener('click', () => {
    $$('img', g).forEach(i => i.classList.toggle('show', i.dataset.i === b.dataset.i));
    $$('.gal-thumbs button').forEach(x => x.classList.toggle('on', x === b));
  }));
  applyData(d); observeReveal(out); rails();
}

function pageTarifs(d) {
  const body = $('#tarifs-body'); if (!body || !d || !d.tarifs) return;
  body.innerHTML = d.tarifs.map(t => `<tr><td><b>${esc(t.label)}</b>${t.note ? `<br><small style="color:var(--muted)">${esc(t.note)}</small>` : ''}</td><td>${fmt(t.j)} €</td><td>${fmt(t.s)} €</td><td>${fmt(t.m)} €</td></tr>`).join('');
}

/* ------------------------------------------------------------ démarrage */
function init() {
  mountChrome(); decorate(); splitStatement(); stagger(); observeReveal(); observeCounters(); tilt(); rails(); scrollspy();
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('loaded')));
  loadData().then(d => {
    applyData(d);
    if (page === 'home') pageHome(d);
    if (page === 'parc') pageParc(d);
    if (page === 'modele') pageModele(d);
    if (page === 'location') pageTarifs(d);
    observeReveal(); observeCounters(); onScroll();
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
