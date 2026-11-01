// ============================================================
//  COMPONENTES DE INTERFAZ (capa 2D sobre el mundo 3D)
// ============================================================
'use strict';

// Estado de la interfaz (solo local, no viaja por la red)
const UI = {
  screen: 'title', mode: 'online', name: '', joinCode: '', error: null, tab: 'acciones', side: null, mapMode: 'geo', viewOverride: null,
  chatOpen: false, chatTo: '', chatSeen: 0, partyDraft: null, law: { scope: 'nacional', pack: 'fiscal', canton: null, changes: {}, decree: false },
  camp: { target: 'nacional', amount: 100 }, ctrlTarget: null, leak: false, pollView: 0, paperOutlet: 0, resultIdx: 0, chart: 'gdp',
  minDraft: null, hostCfg: null, busy: false,
};
let V = null; // vista actual de la partida (lo que el anfitrión nos enseña)
const me = () => V && V.players.find(p => p.id === V.me);
const P = id => V && V.players.find(p => p.id === id);
const seatsV = pid => (V.parliament.composition[pid] || 0);

// ---------- piezas pequeñas ----------
function chip(p, opts = {}) {
  if (!p) return h('span', { class: 'muted' }, opts.none || '—');
  const reg = p.regional != null && typeof V !== 'undefined' && V && V.cantons[p.regional];
  return h('span', { class: 'chip' + (opts.small ? ' sm' : ''), title: reg ? `${p.name || p.player} · regionalista de ${partyRegionName(p)}` : null }, partyLogo(p, opts.small ? 18 : 24),
    h('span', { class: 'nm' }, opts.short ? (p.short || p.name) : (p.name || p.player)), reg ? icon('map-pin', { size: opts.small ? 11 : 13, cls: 'reg-pin' }) : null,
    opts.sub ? h('span', { class: 'sub' }, opts.sub) : null);
}
function partyScope(p) { return p.regional != null ? `Regionalista de ${partyRegionName(p)}` : 'Ámbito nacional';
}
// Tierra de un partido regionalista: su cultura y los cantones donde se presenta
function partyRegionName(p) {
  if (p.regional == null) return '';
  const cu = p.cul != null && V.cultures ? V.cultures[p.cul] : null;
  const names = (p.region && p.region.length ? p.region : [p.regional]).map(i => V.cantons[i] && V.cantons[i].name).filter(Boolean);
  if (!cu || (names.length === 1 && names[0] === cu.name)) return names.join(' y ');
  return `${cu.name} (${names.join(' y ')})`;
}
// Botón de información: el texto aparece al pasar el ratón (o al tocarlo). El globo vive fuera de los
// paneles (posición fija) para que nunca quede recortado.
function infoPopEl() {
  let el = document.getElementById('info-pop');
  if (!el) { el = document.createElement('div'); el.id = 'info-pop'; el.className = 'info-pop'; document.body.appendChild(el); }
  return el;
}
function showInfoPop(anchor, text) {
  const el = infoPopEl(); el.textContent = text; el.classList.add('on'); el._a = anchor;
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, hh = el.offsetHeight, m = 8;
  let x = r.left + r.width / 2 - w / 2; x = Math.max(m, Math.min(window.innerWidth - w - m, x));
  let y = r.bottom + 6; if (y + hh > window.innerHeight - m) y = Math.max(m, r.top - hh - 6);
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
window.addEventListener('scroll', () => hideInfoPop(), true);
function hideInfoPop() { const el = document.getElementById('info-pop'); if (el) el.classList.remove('on'); }
function infoTip(text, opts = {}) {
  if (!text) return null;
  const b = h('span', { class: 'info-tip' + (opts.cls ? ' ' + opts.cls : ''), tabindex: 0, role: 'button', 'aria-label': 'Más información',
    onclick: e => { e.stopPropagation(); const el = infoPopEl(); if (el.classList.contains('on') && el.textContent === text) hideInfoPop(); else showInfoPop(b, text); } },
    icon('info', { size: opts.size || 14 }));
  b.addEventListener('mouseenter', () => showInfoPop(b, text));
  b.addEventListener('focus', () => showInfoPop(b, text));
  b.addEventListener('mouseleave', hideInfoPop);
  b.addEventListener('blur', hideInfoPop);
  return b;
}
function portrait(p, size = 56, cls) {
  const d = h('span', { class: 'portrait ' + (cls || ''), style: { width: size + 'px', height: Math.round(size * 1.1) + 'px', background: p.color || '#556' } });
  d.innerHTML = faceSVG(p.candidate.face, { accent: p.color });
  return d;
}
function btn(label, onclick, opts = {}) {
  const b = h('button', { class: 'btn ' + (opts.kind || '') + (opts.size ? ' ' + opts.size : ''), type: 'button', disabled: !!opts.disabled, title: opts.title || null, id: opts.id || null });
  if (opts.icon) b.appendChild(icon(opts.icon, { size: opts.size === 'sm' ? 15 : 18 }));
  if (label) b.appendChild(document.createTextNode(label));
  b.addEventListener('click', e => { if (!b.disabled) onclick(e); });
  return b;
}
function stat(label, value, opts = {}) {
  let delta = null;
  if (opts.delta !== undefined && opts.delta !== null && isFinite(opts.delta) && Math.abs(opts.delta) > (opts.eps || 1e-9)) {
    const good = opts.goodUp === undefined ? null : (opts.delta > 0) === opts.goodUp;
    delta = h('div', { class: 'delta ' + (good === null ? 'flat' : good ? 'up' : 'down') }, (opts.delta > 0 ? '▲ ' : '▼ ') + opts.deltaText);
  }
  return h('div', { class: 'stat' + (opts.tone ? ' ' + opts.tone : '') }, h('div', { class: 'label' }, opts.icon ? icon(opts.icon, { size: 14 }) : null, label),
    h('div', { class: 'value' }, value), opts.sub ? h('div', { class: 'stat-sub' }, opts.sub) : null, delta, opts.spark ? sparkline(opts.spark, { color: opts.sparkColor }) : null);
}
function hbar(fraction, color, opts = {}) {
  return h('div', { class: 'bar' + (opts.cls ? ' ' + opts.cls : '') }, h('i', { style: { width: clamp(fraction * 100, 0, 100) + '%', background: color } }));
}
function section(title, ...children) { return h('section', { class: 'card' }, title ? h('h3', null, title) : null, children); }
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

// ---------- gráficos ----------
function sparkline(values, opts = {}) {
  const w = opts.w || 120, hg = opts.h || 26;
  const v = values.filter(x => isFinite(x));
  if (v.length < 2) return null;
  const lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1) * (w - 4) + 2).toFixed(1)},${(hg - 3 - (x - lo) / rg * (hg - 6)).toFixed(1)}`).join(' ');
  return s('svg', { viewBox: `0 0 ${w} ${hg}`, width: '100%', height: hg, preserveAspectRatio: 'none', class: 'spark' },
    s('polyline', { points: pts, fill: 'none', stroke: opts.color || '#e0b84e', 'stroke-width': 1.8, 'vector-effect': 'non-scaling-stroke' }));
}
function lineChart(series, labels, opts = {}) {
  if (Math.max(...series.map(sr => sr.values.length)) < 2) return h('p', { class: 'muted small' }, 'La evolución aparecerá a partir del segundo trimestre.');
  const w = opts.w || 560, hg = opts.h || 180, padL = opts.padL || 46, padB = 22, padT = 8, padR = opts.padR || 10;
  const all = series.flatMap(sr => sr.values).filter(isFinite);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (opts.zero) lo = Math.min(0, lo);
  if (hi === lo) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const n = Math.max(...series.map(sr => sr.values.length));
  const X = i => padL + (n <= 1 ? 0 : i / (n - 1) * (w - padL - padR));
  const Y = v => padT + (1 - (v - lo) / (hi - lo)) * (hg - padT - padB);
  const svg = s('svg', { viewBox: `0 0 ${w} ${hg}`, width: '100%', class: 'chart' });
  for (let k = 0; k <= 4; k++) {
    const v = lo + (hi - lo) * k / 4; const y = Y(v);
    svg.appendChild(s('line', { x1: padL, x2: w - padR, y1: y, y2: y, class: 'grid' }));
    svg.appendChild(s('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', class: 'tick' }, opts.fmt ? opts.fmt(v) : fmt.num(v, 1)));
  }
  labels.forEach((l, i) => { if (n < 10 || i % Math.ceil(n / 8) === 0) svg.appendChild(s('text', { x: X(i), y: hg - 5, 'text-anchor': 'middle', class: 'tick' }, l)); });
  series.forEach(sr => {
    svg.appendChild(s('polyline', { points: sr.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' '), fill: 'none', stroke: sr.color, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
    const li = sr.values.length - 1;
    svg.appendChild(s('circle', { cx: X(li), cy: Y(sr.values[li]), r: 3.5, fill: sr.color }));
  });
  return svg;
}
function donut(parts, opts = {}) {
  const size = opts.size || 150, r = size / 2 - 10, cx = size / 2, cy = size / 2, sw = opts.width || 20;
  const tot = sum(parts, p => p.value) || 1;
  const svg = s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'donut' });
  let a0 = -Math.PI / 2;
  parts.forEach(p => {
    const a1 = a0 + p.value / tot * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1 - 0.002)} ${cy + r * Math.sin(a1 - 0.002)}`;
    svg.appendChild(s('path', { d, fill: 'none', stroke: p.color, 'stroke-width': sw }, s('title', null, `${p.label}: ${fmt.pct(p.value / tot, 1)}`)));
    a0 = a1;
  });
  if (opts.center) svg.appendChild(s('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', class: 'donut-c' }, opts.center));
  return svg;
}
// Hemiciclo pequeño en 2D (para paneles)
function miniHemicycle(comp, total, players, votes) {
  const parties = players.filter(p => (comp[p.id] || 0) > 0).sort((a, b) => seatKey(a) - seatKey(b));
  const seatColors = []; parties.forEach(p => { for (let i = 0; i < comp[p.id]; i++) seatColors.push(p); });
  const rows = Math.max(2, Math.round(Math.sqrt(total / 3.2)));
  const radii = range(rows).map(i => 0.4 + 0.6 * i / (rows - 1));
  const rs = sum(radii);
  const counts = radii.map(r => Math.max(1, Math.round(total * r / rs)));
  let diff = total - sum(counts), k = rows - 1;
  while (diff !== 0) { if (counts[k] + Math.sign(diff) >= 1) { counts[k] += Math.sign(diff); diff -= Math.sign(diff); } k = (k - 1 + rows) % rows; }
  const pts = [];
  radii.forEach((r, i) => { const c = counts[i]; for (let j = 0; j < c; j++) { const a = c === 1 ? Math.PI / 2 : Math.PI - Math.PI * j / (c - 1); pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), a }); } });
  pts.sort((p, q) => q.a - p.a || p.y - q.y);
  const dot = Math.min(0.6 / (rows - 1) * 0.42, Math.PI * 0.4 / Math.max(...counts) * 0.6);
  const svg = s('svg', { viewBox: `${-1.1} ${-1.08} 2.2 1.16`, class: 'mini-hemi' });
  const vc = { si: '#3fd07e', no: '#ff5a52', abs: '#ffc23d', oculto: '#8fa0c8' };
  pts.forEach((pt, i) => { const p = seatColors[i]; const v = votes && p ? votes[p.id] : null; svg.appendChild(s('circle', { cx: pt.x, cy: -pt.y, r: dot, fill: votes ? (v ? vc[v] : '#3a4260') : p ? p.color : '#3a4260', stroke: votes && p ? p.color : 'none', 'stroke-width': votes ? dot * 0.35 : 0 })); });
  return svg;
}

// ---------- ideología ----------
function ideologyAxes(players, opts = {}) {
  // opts.overall: solo el eje ideológico general (media de todos los ejes)
  const val = (ideo, ax) => ax.id === 'ideo' ? overallIdeo(ideo) : ideo[ax.id];
  return h('div', { class: 'axes' + (opts.overall ? ' overall' : '') }, (opts.overall ? [IDEO_AXIS] : AXES).map(ax => h('div', { class: 'axis-row' },
    opts.overall ? null : h('div', { class: 'axis-name' }, icon(ax.icon, { size: 15 }), ax.name),
    h('div', null,
      h('div', { class: 'axis-track' }, [0.25, 0.5, 0.75].map(t => h('span', { class: 'tick', style: { left: t * 100 + '%' } })),
        players.map(p => {
          const X = v => (ax.flip ? -v : v);
          const now = val(p.ideo, ax), was = p.ideoBase ? val(p.ideoBase, ax) : null;
          const base = opts.trail && was != null ? h('span', { class: 'trail', style: { left: Math.min(X(was), X(now)) * 25 + 50 + '%', width: Math.abs(now - was) * 25 + '%', background: p.color } }) : null;
          const dot = h('span', { class: 'dot', title: `${p.name}: ${axisLabel(ax.id, now)}`, style: { left: ((X(now) + 2) / 4 * 100) + '%' } });
          dot.innerHTML = logoSVG(p.logo, p.color, p.color2, 22);
          return [base, dot];
        })),
      h('div', { class: 'axis-ends' }, h('span', null, ax.labels[ax.flip ? 4 : 0]), h('span', null, ax.labels[2]), h('span', null, ax.labels[ax.flip ? 0 : 4]))))));
}
// ---------- modales y avisos ----------
function modal(title, content, actions, opts = {}) {
  const back = h('div', { class: 'modal-back' });
  const close = () => back.remove();
  back.addEventListener('click', e => { if (e.target === back && !opts.locked) close(); });
  back.appendChild(h('div', { class: 'modal glass' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-label': title },
    h('div', { class: 'row' }, h('h2', null, title), h('span', { class: 'spacer' }), opts.locked ? null : btn('', close, { kind: 'ghost', size: 'sm', icon: 'x', title: 'Cerrar' })),
    content, actions ? h('div', { class: 'btn-row', style: { marginTop: '16px' } }, actions(close)) : null));
  document.body.appendChild(back);
  return close;
}
function askConfirm(text, yesLabel, onYes) {
  modal('Confirmar', h('p', null, text), close => [btn(yesLabel, () => { close(); onYes(); }, { kind: 'primary' }), btn('Cancelar', close, { kind: 'ghost' })]);
}
function toast(msg, kind) {
  if (!msg) return;
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = h('div', { class: 'toast-wrap' }); document.body.appendChild(wrap); }
  const t = h('div', { class: 'toast glass ' + (kind || '') }, msg);
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}
// Envía una acción al anfitrión y muestra el resultado
async function act(a, opts = {}) {
  const r = await Client.act(a);
  if (r && r.msg && (opts.toast !== false || !r.ok)) toast(r.msg, r.ok ? 'good' : 'bad');
  return r;
}
