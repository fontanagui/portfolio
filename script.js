const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fino = matchMedia('(pointer: fine)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

let vw = innerWidth, vh = innerHeight;
let sy = scrollY, dsy = 0, vel = 0;
let mx = -999, my = -999, pressed = false;

$('#ano').textContent = new Date().getFullYear();

/* =========================================================
   Preparação do texto
   ========================================================= */

// Letras individuais (título e contato)
let nLetra = 0;
const letras = [];
$$('[data-letras]').forEach(el => {
  const txt = el.textContent;
  el.textContent = '';
  [...txt].forEach(ch => {
    const l = document.createElement('span');
    l.className = 'l';
    const i = document.createElement('i');
    i.style.setProperty('--n', nLetra++);
    i.textContent = ch;
    l.appendChild(i);
    el.appendChild(l);
    letras.push({ el: l, x: 0, y: 0, s: 1, r: 0 });
  });
});

// Títulos que sobem palavra por palavra
$$('[data-split]').forEach(el => {
  const palavras = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  palavras.forEach((p, i) => {
    const w = document.createElement('span');
    w.className = 'w';
    const s = document.createElement('span');
    s.style.setProperty('--d', i);
    s.textContent = p;
    w.appendChild(s);
    el.appendChild(w);
    el.appendChild(document.createTextNode(' '));
  });
});

// Manifesto: cada palavra acende com a rolagem
const texto = $('#texto');
(function () {
  const frag = document.createDocumentFragment();
  texto.childNodes.forEach(no => {
    const hl = no.nodeType === 1;
    no.textContent.split(/\s+/).filter(Boolean).forEach(p => {
      const s = document.createElement('span');
      s.textContent = p;
      if (hl) s.className = 'hl';
      frag.appendChild(s);
    });
  });
  texto.textContent = '';
  texto.appendChild(frag);
})();
const palavrasManifesto = $$('span', texto);
let acesas = -1;

// Faixa em loop: duplica o conteúdo
const trilhoFaixa = $('#trilho-faixa');
trilhoFaixa.innerHTML += trilhoFaixa.innerHTML;
let faixaPos = 0, faixaMeia = 1;

/* =========================================================
   Aparecer ao rolar
   ========================================================= */
const io = new IntersectionObserver(es => {
  es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visivel');
    io.unobserve(e.target);
  });
}, { threshold: .2 });
$$('.reveal, [data-split]').forEach(el => io.observe(el));

// Link ativo no menu
const links = $$('.topo nav a');
const io2 = new IntersectionObserver(es => {
  es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('ativo', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-50% 0px -49% 0px' });
links.forEach(a => { const s = $(a.getAttribute('href')); if (s) io2.observe(s); });

/* =========================================================
   Bolas e bolhas (canvas)
   ========================================================= */
const cv = $('#orbes');
const cx = cv.getContext('2d');
let dpr = Math.min(devicePixelRatio || 1, 1.5);

const tiposOrbe = ['vidro', 'bolha', 'listra', 'ponto', 'disco', 'lima', 'bolha', 'vidro'];
const sprites = {};

function criaSprite(tipo) {
  const S = 256, R = S / 2 - 3;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.save();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();

  if (tipo === 'bolha') {
    let gr = g.createRadialGradient(-R * .3, -R * .35, R * .05, 0, 0, R);
    gr.addColorStop(0, 'rgba(255,255,255,.55)');
    gr.addColorStop(.55, 'rgba(45,212,191,.07)');
    gr.addColorStop(1, 'rgba(34,197,94,.45)');
    g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R);
    if (g.createConicGradient) {
      const cg = g.createConicGradient(0.6, 0, 0);
      ['#4ade80', '#2dd4bf', '#bef264', '#a7f3d0', '#4ade80'].forEach((c2, i, a) => cg.addColorStop(i / (a.length - 1), c2));
      g.globalAlpha = .55; g.strokeStyle = cg; g.lineWidth = 14;
      g.beginPath(); g.arc(0, 0, R - 3, 0, TAU); g.stroke(); g.globalAlpha = 1;
    }
  } else if (tipo === 'vidro') {
    const gr = g.createRadialGradient(-R * .3, -R * .35, R * .05, 0, 0, R);
    gr.addColorStop(0, '#eafff1'); gr.addColorStop(.3, '#5ee28f'); gr.addColorStop(.65, '#16a34a'); gr.addColorStop(1, '#0a4a24');
    g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R);
  } else if (tipo === 'lima') {
    const gr = g.createRadialGradient(-R * .3, -R * .35, R * .05, 0, 0, R);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.25, '#d9f99d'); gr.addColorStop(.65, '#a3e635'); gr.addColorStop(1, '#4d7c0f');
    g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R);
  } else if (tipo === 'listra') {
    g.rotate(Math.PI / 4);
    const cores = ['#14532d', '#22c55e', '#bef264'];
    for (let i = -14, k = 0; i < 14; i++, k++) { g.fillStyle = cores[k % 3]; g.fillRect(i * 24, -S, 24, 2 * S); }
    g.rotate(-Math.PI / 4);
  } else if (tipo === 'ponto') {
    g.fillStyle = '#0f9488'; g.fillRect(-R, -R, 2 * R, 2 * R);
    g.fillStyle = '#bef264';
    for (let y = -R; y < R; y += 18) for (let x = -R + ((y / 18) & 1) * 9; x < R; x += 18) {
      g.beginPath(); g.arc(x, y, 4.2, 0, TAU); g.fill();
    }
  } else if (tipo === 'disco') {
    const d = 12 * Math.PI / 180;
    for (let la = -84 * Math.PI / 180; la < 84 * Math.PI / 180; la += d) {
      for (let lo = -90 * Math.PI / 180; lo < 90 * Math.PI / 180; lo += d) {
        const x0 = R * Math.cos(la) * Math.sin(lo), x1 = R * Math.cos(la) * Math.sin(lo + d);
        const y0 = R * Math.sin(la), y1 = R * Math.sin(la + d);
        const v = Math.random();
        g.fillStyle = v < .2 ? '#ffffff' : v < .55 ? '#d3e6da' : v < .85 ? '#8cae9a' : '#5f8572';
        g.fillRect(x0, y0, x1 - x0 - 1, y1 - y0 - 1);
      }
    }
  }
  g.restore();

  if (tipo !== 'bolha') {
    // sombra da esfera
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    let sh = g.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R * 1.05);
    sh.addColorStop(0, 'rgba(255,255,255,.4)'); sh.addColorStop(.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,30,12,.5)');
    g.fillStyle = sh; g.fillRect(-R, -R, 2 * R, 2 * R);
    g.restore();
  }
  // brilho
  g.save(); g.rotate(-.55);
  const hl = g.createRadialGradient(0, -R * .62, 0, 0, -R * .62, R * .36);
  hl.addColorStop(0, 'rgba(255,255,255,.9)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.scale(1.1, .62); g.beginPath(); g.arc(0, -R * .62, R * .36, 0, TAU); g.fill();
  g.restore();
  return c;
}
[...new Set(tiposOrbe)].forEach(t => sprites[t] = criaSprite(t));

const orbes = [];
const bolhinhas = [];

function novaOrbe(abaixo) {
  const esc = clamp(Math.min(vw, vh) / 800 + .45, .6, 1.25);
  const r = (24 + Math.pow(Math.random(), 1.7) * 105) * esc;
  return {
    x: Math.random() * vw,
    y: abaixo ? vh + r * 2 + Math.random() * vh * .5 : Math.random() * vh,
    r,
    vx: (Math.random() - .5) * .6, vy: -Math.random() * .4,
    flut: .0018 + Math.random() * .0035,
    ph: Math.random() * TAU,
    tipo: tiposOrbe[Math.floor(Math.random() * tiposOrbe.length)],
    ang: Math.random() * TAU,
    spin: (Math.random() - .5) * .018,
    par: .12 + (r / 130) * .75,
    a: .62 + Math.random() * .33,
  };
}

function ajustaCanvas() {
  vw = innerWidth; vh = innerHeight;
  cv.width = vw * dpr; cv.height = vh * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = clamp(Math.round(vw / 85), 8, 20);
  while (orbes.length < n) orbes.push(novaOrbe(false));
  orbes.length = n;
}

// estouro de bolhinhas num ponto
function estoura(x, y, n = 10) {
  for (let i = 0; i < n && bolhinhas.length < 140; i++) {
    const a = Math.random() * TAU, v = 1.5 + Math.random() * 4;
    bolhinhas.push({
      x, y, r: 4 + Math.random() * 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1,
      vida: 1, tipo: Math.random() < .3 ? 'vidro' : 'bolha',
    });
  }
}

function fisica(t, k) {
  const arr = orbes;
  for (const o of arr) {
    o.vy -= o.flut * k;
    const atrito = Math.pow(.992, k);
    o.vx *= atrito; o.vy *= atrito;
    o.vx += Math.sin(t / 1900 + o.ph) * .004 * k;
    o.y -= dsy * o.par;                       // parallax da rolagem
    o.ang += o.spin * k + vel * .0018 * Math.sign(o.spin || 1);

    const dx = o.x - mx, dy = o.y - my, d = Math.hypot(dx, dy);
    const alc = o.r + 170;
    if (d < alc && d > .1) {
      const f = 1 - d / alc;
      const forca = pressed ? -.5 : .42;      // segurar o clique atrai; passar o mouse empurra
      o.vx += dx / d * f * forca * k;
      o.vy += dy / d * f * forca * k;
    }
    const v = Math.hypot(o.vx, o.vy);
    if (v > 7) { o.vx *= 7 / v; o.vy *= 7 / v; }
    o.x += o.vx * k; o.y += o.vy * k;

    if (o.x < o.r) { o.x = o.r; o.vx = Math.abs(o.vx) * .8; }
    if (o.x > vw - o.r) { o.x = vw - o.r; o.vx = -Math.abs(o.vx) * .8; }
    if (o.y < -o.r * 2.5) { Object.assign(o, novaOrbe(true)); }
    else if (o.y > vh + o.r * 4 + 300) { o.y = -o.r * 2; }
  }
  // colisões entre bolas
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const a = arr[i], b = arr[j];
    const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= min * min || d2 === 0) continue;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    const ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
    const sobra = min - d;
    a.x -= nx * sobra * mb / tot; a.y -= ny * sobra * mb / tot;
    b.x += nx * sobra * ma / tot; b.y += ny * sobra * ma / tot;
    const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vrel < 0) {
      const j2 = -1.85 * vrel / (1 / ma + 1 / mb);
      a.vx -= j2 / ma * nx; a.vy -= j2 / ma * ny;
      b.vx += j2 / mb * nx; b.vy += j2 / mb * ny;
      a.spin += nx * .004; b.spin -= nx * .004;
    }
  }
  for (let i = bolhinhas.length - 1; i >= 0; i--) {
    const b = bolhinhas[i];
    b.vy -= .012 * k; b.vx *= .985; b.vy *= .985;
    b.x += b.vx * k; b.y += b.vy * k - dsy * .4;
    b.vida -= .011 * k;
    if (b.vida <= 0) bolhinhas.splice(i, 1);
  }
}

function desenhaOrbes() {
  cx.clearRect(0, 0, vw, vh);
  for (const o of orbes) {
    if (o.y < -o.r * 2 || o.y > vh + o.r * 2) continue;
    cx.save();
    cx.globalAlpha = o.a;
    cx.translate(o.x, o.y);
    cx.rotate(o.ang);
    cx.drawImage(sprites[o.tipo], -o.r, -o.r, o.r * 2, o.r * 2);
    cx.restore();
  }
  for (const b of bolhinhas) {
    const estourando = b.vida < .15;
    const esc = estourando ? 1 + (.15 - b.vida) * 7 : 1;
    cx.globalAlpha = estourando ? b.vida / .15 : Math.min(1, b.vida * 1.6);
    const r = b.r * esc;
    cx.drawImage(sprites[b.tipo], b.x - r, b.y - r, r * 2, r * 2);
  }
  cx.globalAlpha = 1;
}

/* =========================================================
   Mouse e toque
   ========================================================= */
let ultimoX = 0, ultimoY = 0;
addEventListener('pointermove', e => {
  mx = e.clientX; my = e.clientY;
  const v = Math.hypot(mx - ultimoX, my - ultimoY);
  ultimoX = mx; ultimoY = my;
  if (!reduz && v > 16 && Math.random() < .4 && bolhinhas.length < 100) {
    bolhinhas.push({ x: mx, y: my, r: 3 + Math.random() * 7, vx: (Math.random() - .5) * 1.4, vy: -Math.random() * 1.4, vida: .9, tipo: 'bolha' });
  }
  cursor.classList.add('on');
});
addEventListener('pointerdown', e => {
  pressed = true; mx = e.clientX; my = e.clientY;
  if (e.target.closest('a, button')) return;
  estoura(mx, my, 9);
  for (const o of orbes) {            // onda de choque
    const dx = o.x - mx, dy = o.y - my, d = Math.hypot(dx, dy) || 1;
    if (d < 320) { const f = 1 - d / 320; o.vx += dx / d * f * 5; o.vy += dy / d * f * 5; o.spin += (Math.random() - .5) * .05; }
  }
});
addEventListener('pointerup', () => { pressed = false; });
addEventListener('pointercancel', () => { pressed = false; });
document.addEventListener('pointerleave', () => { mx = my = -999; cursor.classList.remove('on'); });
addEventListener('touchend', () => { mx = my = -999; });

// cursor
const cursor = $('.cursor');
let curX = 0, curY = 0;
if (fino) {
  document.addEventListener('pointerover', e => {
    const alvo = e.target.closest('a, .chip, .linha-int, .card');
    cursor.classList.toggle('grande', !!alvo);
  });
  addEventListener('pointerdown', () => cursor.classList.add('preso'));
  addEventListener('pointerup', () => cursor.classList.remove('preso'));
}

/* =========================================================
   Chips do stack: fogem do mouse e estouram no clique
   ========================================================= */
const chips = $$('.chip').map(el => ({ el, x: 0, y: 0 }));
chips.forEach(c => {
  c.el.addEventListener('click', () => {
    c.el.classList.remove('pop'); void c.el.offsetWidth; c.el.classList.add('pop');
    const r = c.el.getBoundingClientRect();
    estoura(r.left + r.width / 2, r.top + r.height / 2, 12);
  });
});

/* =========================================================
   Projetos: rolagem vertical vira horizontal
   ========================================================= */
const projetos = $('#projetos'), trilha = $('#trilha'), barraProj = $('#prog-proj');
const cards = $$('.card');
let distProj = 0, pProj = 0;
function medeProjetos() {
  distProj = Math.max(0, trilha.offsetWidth - vw);
  projetos.style.height = (vh + distProj) + 'px';
}

// cartões inclinam com o mouse
if (fino && !reduz) cards.forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
  });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});

/* =========================================================
   Interesses
   ========================================================= */
const linhasInt = $$('.linha-int').map(el => ({ el, t: 0 }));

/* =========================================================
   Loop principal
   ========================================================= */
const manifesto = $('.manifesto');
const knob = $('#knob');
let ultimoT = performance.now(), hueAtual = -1;

function quadro(agora) {
  const dt = Math.min(48, agora - ultimoT); ultimoT = agora;
  const k = dt / 16.67;

  const novoSy = scrollY;
  dsy = novoSy - sy; sy = novoSy;
  vel = lerp(vel, dsy, .14);

  // fundo muda de cor com a rolagem
  const max = document.documentElement.scrollHeight - vh;
  const p = max > 0 ? sy / max : 0;
  const hue = 150 + Math.sin(p * 7) * 24;
  if (Math.abs(hue - hueAtual) > .4) {
    hueAtual = hue;
    document.body.style.setProperty('--bg1', `hsl(${hue} 78% 96%)`);
    document.body.style.setProperty('--bg2', `hsl(${hue + 22} 70% 88%)`);
  }
  knob.style.top = (p * 100) + '%';

  // bolas
  if (!reduz) fisica(agora, k);
  desenhaOrbes();

  // faixa
  faixaMeia = trilhoFaixa.scrollWidth / 2;
  faixaPos += reduz ? 0 : (1.1 + vel * .55) * k;
  faixaPos = ((faixaPos % faixaMeia) + faixaMeia) % faixaMeia;
  trilhoFaixa.style.transform = `translate3d(${-faixaPos}px,0,0)`;

  // manifesto
  const rm = manifesto.getBoundingClientRect();
  const pm = clamp(-rm.top / (rm.height - vh));
  const n = Math.floor(clamp(pm * 1.12) * palavrasManifesto.length) + (pm > 0 ? 1 : 0);
  if (n !== acesas) {
    palavrasManifesto.forEach((w, i) => w.classList.toggle('on', i < n));
    acesas = n;
  }

  // projetos
  const rp = projetos.getBoundingClientRect();
  const alvoP = distProj > 0 ? clamp(-rp.top / distProj) : 0;
  pProj = reduz ? alvoP : lerp(pProj, alvoP, .12);
  const tx = -pProj * distProj;
  trilha.style.transform = `translate3d(${tx}px,0,0)`;
  trilha.style.setProperty('--tx', (-tx) + 'px');
  barraProj.style.width = (pProj * 100) + '%';

  // interesses: o que está no centro da tela ganha vida
  for (const l of linhasInt) {
    const r = l.el.getBoundingClientRect();
    const alvo = 1 - clamp(Math.abs(r.top + r.height / 2 - vh * .52) / (vh * .42));
    l.t = reduz ? alvo : lerp(l.t, alvo, .14);
    l.el.style.setProperty('--t', l.t.toFixed(3));
    l.el.classList.toggle('on', l.t > .62);
  }

  // letras e chips reagem ao mouse (lê tudo, depois escreve)
  if (!reduz && fino) {
    const lr = letras.map(l => {
      const r = l.el.getBoundingClientRect();
      return r.bottom < -50 || r.top > vh + 50 ? null : [r.left + r.width / 2 - l.x, r.top + r.height / 2 - l.y];
    });
    const cr = chips.map(c => {
      const r = c.el.getBoundingClientRect();
      return r.bottom < -50 || r.top > vh + 50 ? null : [r.left + r.width / 2 - c.x, r.top + r.height / 2 - c.y];
    });
    letras.forEach((l, i) => {
      if (!lr[i]) return;
      const dx = mx - lr[i][0], dy = my - lr[i][1], d = Math.hypot(dx, dy) || 1;
      const f = d < 240 ? 1 - d / 240 : 0;
      l.x = lerp(l.x, dx * f * .32, .16); l.y = lerp(l.y, dy * f * .32, .16);
      l.s = lerp(l.s, 1 + f * .28, .16); l.r = lerp(l.r, (dx / d) * f * 9, .16);
      l.el.style.transform = `translate(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px) scale(${l.s.toFixed(3)}) rotate(${l.r.toFixed(1)}deg)`;
    });
    chips.forEach((c, i) => {
      if (!cr[i]) return;
      const dx = cr[i][0] - mx, dy = cr[i][1] - my, d = Math.hypot(dx, dy) || 1;
      const f = d < 260 ? 1 - d / 260 : 0;
      c.x = lerp(c.x, dx / d * f * 55, .14); c.y = lerp(c.y, dy / d * f * 55, .14);
      c.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px)`;
    });
    // contato: bolas grandes se aproximam
    curX = lerp(curX, mx, .22); curY = lerp(curY, my, .22);
    cursor.style.transform = `translate(${curX}px,${curY}px)`;
  }

  requestAnimationFrame(quadro);
}

/* =========================================================
   Inicialização
   ========================================================= */
function medeTudo() {
  ajustaCanvas();
  medeProjetos();
}
addEventListener('resize', medeTudo);
addEventListener('load', medeTudo);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(medeTudo);
medeTudo();
requestAnimationFrame(quadro);
