// ============================================================
//  Utilidades generales: aleatoriedad reproducible, formato, DOM
// ============================================================
'use strict';

// Generador pseudoaleatorio con semilla (mulberry32). Su estado se guarda
// en la partida para que guardar/cargar sea reproducible.
const RNG = {
  state: 123456789,
  seed(s) { this.state = (s >>> 0) || 1; },
  next() {
    let t = (this.state += 0x6D2B79F5) >>> 0;
    this.state = t;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  range(a, b) { return a + (b - a) * this.next(); },
  int(a, b) { return Math.floor(this.range(a, b + 1)); },
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
  chance(p) { return this.next() < p; },
  normal(mu = 0, sd = 1) {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  weighted(items, weightFn) {
    const ws = items.map(weightFn);
    const tot = ws.reduce((s, w) => s + Math.max(0, w), 0);
    if (tot <= 0) return this.pick(items);
    let r = this.next() * tot;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, ws[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sum = (arr, f = x => x) => arr.reduce((s, x) => s + f(x), 0);
const avg = (arr, f = x => x) => arr.length ? sum(arr, f) / arr.length : 0;
const byId = (arr, id) => arr.find(x => x.id === id);
const range = n => Array.from({ length: n }, (_, i) => i);
const deepCopy = o => JSON.parse(JSON.stringify(o));

// ---------- Formato ----------
// Dinero (en miles de millones de euros) con la unidad más legible
function moneyFmt(n, signed) {
  const a = Math.abs(n), sg = n < 0 ? '−' : signed && n > 0 ? '+' : '';
  const f = (x, d) => x.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  if (a >= 1) return sg + f(a, a < 100 ? 1 : 0) + ' mil M€';
  if (a >= 0.001) return sg + f(a * 1000, a * 1000 < 10 ? 2 : a * 1000 < 100 ? 1 : 0) + ' M€';
  return sg + f(a * 1e6, a * 1e6 < 10 ? 1 : 0) + ' k€';
}
const fmt = {
  int: n => Math.round(n).toLocaleString('es-ES'),
  num: (n, d = 1) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }),
  pct: (n, d = 1) => (n * 100).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' %',
  pctRaw: (n, d = 1) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' %',
  // dinero en miles de millones (el PIB se modela en miles de millones)
  // (el país es pequeño: se escoge la unidad que se lee mejor: mil M€, M€ o k€)
  bn: n => moneyFmt(n, false),
  sbn: n => moneyFmt(n, true),
  // fondos de los partidos en miles de euros
  k: n => (Math.abs(n) >= 1000
    ? (n / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' M€'
    : Math.round(n).toLocaleString('es-ES') + ' k€'),
  people: n => (n >= 1e6 ? (n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' M'
    : n >= 1e5 ? Math.round(n / 1e3).toLocaleString('es-ES') + ' mil' : Math.round(n).toLocaleString('es-ES')),
  signed: (n, d = 1) => (n > 0 ? '+' : '') + Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }),
};

// ---------- DOM ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Colores: mezclar y calcular contraste
function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
}
function textOn(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1b2232' : '#ffffff';
}

// Reparto de escaños por D'Hondt
function dhondt(votes, seats, threshold = 0) {
  // votes: {id: n}
  const total = sum(Object.values(votes));
  const eligible = Object.entries(votes).filter(([, v]) => total > 0 && v / total >= threshold && v > 0);
  const result = {};
  Object.keys(votes).forEach(k => result[k] = 0);
  if (!eligible.length) return result;
  for (let i = 0; i < seats; i++) {
    let best = null, bestQ = -1;
    for (const [id, v] of eligible) {
      const q = v / (result[id] + 1);
      if (q > bestQ) { bestQ = q; best = id; }
    }
    result[best]++;
  }
  return result;
}

// Coeficiente de Gini sobre una lista de rentas (con pesos opcionales)
function gini(values) {
  const v = values.filter(x => x >= 0).sort((a, b) => a - b);
  const n = v.length;
  if (n < 2) return 0;
  let cum = 0, tot = 0;
  for (let i = 0; i < n; i++) { cum += (i + 1) * v[i]; tot += v[i]; }
  if (tot === 0) return 0;
  return (2 * cum) / (n * tot) - (n + 1) / n;
}

// ---------- compresión de texto (LZW) para guardar partidas grandes ----------
// El resultado usa solo caracteres «seguros» (14 bits de datos por carácter, sin sustitutos UTF-16).
function lzPack(s) {
  const dict = new Map(); let next = 257;
  const out = [];
  const put = n => {
    if (n < 0x4000) { out.push(String.fromCharCode(32 + n)); return; }
    const parts = []; do { parts.push(n & 0x3fff); n = Math.floor(n / 0x4000); } while (n > 0);
    for (let i = parts.length - 1; i >= 0; i--) out.push(String.fromCharCode(32 + parts[i] + (i > 0 ? 0x4000 : 0)));
  };
  const emit = w => { if (w >= 0) put(w); else { put(256); put(-w - 1); } };
  let w = null;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (w === null) { w = c < 256 ? c : -(c + 1); continue; }
    const key = w * 65536 + c, k = dict.get(key);
    if (k !== undefined) { w = k; continue; }
    emit(w); dict.set(key, next++); w = c < 256 ? c : -(c + 1);
  }
  if (w !== null) emit(w);
  return out.join('');
}
function lzUnpack(z) {
  let i = 0;
  const get = () => { let n = 0, u; do { u = z.charCodeAt(i++) - 32; n = n * 0x4000 + (u & 0x3fff); } while (u & 0x4000); return n; };
  const dict = []; let next = 257;
  const out = []; let prev = null;
  while (i < z.length) {
    const code = get();
    let entry;
    if (code < 256) entry = String.fromCharCode(code);
    else if (code === 256) entry = String.fromCharCode(get());
    else if (code < next && dict[code] !== undefined) entry = dict[code];
    else if (code === next && prev !== null) entry = prev + prev[0];
    else throw new Error('lz: código no válido');
    out.push(entry);
    if (prev !== null) dict[next++] = prev + entry[0];
    prev = entry;
  }
  return out.join('');
}
