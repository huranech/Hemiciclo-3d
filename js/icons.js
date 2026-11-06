// ============================================================
//  ICONOS Y LOGOTIPOS
// ============================================================
'use strict';
// Iconos de Lucide que no venían en el subconjunto (licencia ISC)
Object.assign(ICON_PATHS, {
  hexagon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
  'fast-forward': '<polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/>',
  shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  beef: '<circle cx="12.5" cy="8.5" r="2.5"/><path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"/><path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/>',
  armchair: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'user-round': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  anvil: '<path d="M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4"/><path d="M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z"/><path d="M9 12v5"/><path d="M15 12v5"/><path d="M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1"/>',
  crosshair: '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
  'shopping-basket': '<path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="M4.5 15.5h15"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/>',
  'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  'key-round': '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
});

// Icono de línea (Lucide) como cadena SVG
function iconSVG(name, opts = {}) {
  const inner = ICON_PATHS[name] || ICON_PATHS['circle-dot'] || '';
  const size = opts.size || 20, sw = opts.stroke || 2, color = opts.color || 'currentColor';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
// Icono como nodo DOM
function icon(name, opts = {}) {
  const span = document.createElement('span');
  span.className = 'ico' + (opts.cls ? ' ' + opts.cls : '');
  span.innerHTML = iconSVG(name, opts);
  return span;
}

// ============================================================
//  LOGOTIPOS DE PARTIDO
//  logo = { shape, icon, style, text }
//   shape: silueta de fondo · icon: símbolo (propio o de Lucide) o 'siglas'
//   style: 'lleno' (forma de color y símbolo claro), 'invertido' (fondo claro, borde y
//          símbolo de color) o 'dividido' (forma partida en dos colores)
// ============================================================
const r1 = v => Math.round(v * 10) / 10;
function polyStar(cx, cy, n, ro, ri, rot = -90) {
  let d = '';
  for (let k = 0; k < n * 2; k++) {
    const r = k % 2 ? ri : ro, a = (rot + k * 180 / n) * Math.PI / 180;
    d += (k ? 'L' : 'M') + r1(cx + r * Math.cos(a)) + ' ' + r1(cy + r * Math.sin(a));
  }
  return d + 'Z';
}
const ellipseAt = (x, y, rx, ry, deg) => `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${rx}" ry="${ry}" transform="rotate(${r1(deg)} ${r1(x)} ${r1(y)})"/>`;
// hojas a lo largo de una curva cuadrática (para laureles, olivos, espigas)
function leavesAlong(p0, p1, p2, n, len, wid, side = 1, t0 = 0.12) {
  let out = '';
  for (let k = 0; k < n; k++) {
    const t = t0 + (1 - t0) * k / (n - 1 || 1);
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    for (const sd of side === 0 ? [1, -1] : [side]) {
      const off = len * 0.55, a2 = (ang + sd * 50) * Math.PI / 180;
      out += ellipseAt(x + Math.cos(a2) * off, y + Math.sin(a2) * off, len / 2, wid / 2, ang + sd * 50);
    }
  }
  return out;
}
// Símbolos propios, dibujados en una caja de 100×100: {fill, stroke, cut}
//   fill: piezas rellenas con el color del símbolo · stroke: trazos del color del símbolo
//   cut: trazos del color de fondo para recortar detalles
const LOGO_SYMBOLS = {
  rosa: { name: 'Rosa', fill: `<path d="M50 20C38 20 30 29 32 40C33 49 41 55 50 55C59 55 67 49 68 40C70 29 62 20 50 20Z"/><rect x="47.5" y="54" width="5" height="28" rx="2"/><path d="M48 70C40 62 30 62 27 68C35 74 43 73 48 70Z"/><path d="M52 64C60 56 70 56 73 62C65 68 57 67 52 64Z"/>`,
    cut: `<path d="M41 33Q50 25 59 33M38 42Q50 51 62 42M50 21Q44 32 50 40Q56 32 50 21"/>` },
  paloma: { name: 'Paloma', fill: `<path d="M18 50L27 46C29 41 35 40 38 43C46 45 52 49 57 49L66 31C69 27 75 26 77 28C75 39 73 46 69 52C75 52 81 56 85 62C77 63 71 62 65 61C59 69 48 72 39 67C34 63 31 57 29 53Z"/>`, cut: `<circle cx="31" cy="46" r="1.6"/>` },
  vuelo: { name: 'Aves en vuelo', stroke: `<path d="M18 48Q30 34 42 48Q54 34 66 48" stroke-width="6"/><path d="M48 64Q57 54 66 64Q75 54 84 64" stroke-width="5"/>` },
  antorcha: { name: 'Antorcha', fill: `<path d="M50 14C58 24 64 31 61 39C59 44 55 46 50 46C44 46 40 42 40 37C40 31 46 28 46 22C49 25 50 28 50 31C52 26 52 20 50 14Z"/><path d="M38 47H62L59 55H41Z"/><path d="M44 56H56L52 84H48Z"/>` },
  puno: { name: 'Puño en alto', fill: `<rect x="33" y="27" width="35" height="36" rx="7"/><path d="M41 61H60L58 86H43Z"/>`, cut: `<path d="M42 27V41M50 27V41M59 27V41M33 44H60M33 52Q45 52 52 46"/>` },
  laurel: { name: 'Laurel', stroke: `<path d="M50 82Q20 74 24 30M50 82Q80 74 76 30" stroke-width="3"/>`, fill: () => leavesAlong([50, 82], [20, 74], [24, 30], 6, 16, 7.5, 0, 0.18) + leavesAlong([50, 82], [80, 74], [76, 30], 6, 16, 7.5, 0, 0.18) },
  olivo: { name: 'Rama de olivo', stroke: `<path d="M24 80Q44 54 78 24" stroke-width="3.2"/>`, fill: () => leavesAlong([24, 80], [44, 54], [78, 24], 6, 14, 6, 0, 0.2) + `<circle cx="34" cy="58" r="3.4"/><circle cx="62" cy="46" r="3.4"/>` },
  espigas: { name: 'Espigas', stroke: `<path d="M38 84Q40 54 32 22M62 84Q60 54 68 22" stroke-width="3"/>`, fill: () => leavesAlong([38, 84], [40, 54], [32, 18], 6, 15, 7, 0, 0.38) + leavesAlong([62, 84], [60, 54], [68, 18], 6, 15, 7, 0, 0.38) },
  sol: { name: 'Sol naciente', fill: () => { let r = `<path d="M28 66A22 22 0 0 1 72 66Z"/><rect x="14" y="68" width="72" height="5" rx="2.5"/>`; for (let k = 0; k < 9; k++) { const a = (180 + k * 22.5) * Math.PI / 180; r += `<path d="M${r1(50 + Math.cos(a - 0.06) * 27)} ${r1(66 + Math.sin(a - 0.06) * 27)}L${r1(50 + Math.cos(a) * 40)} ${r1(66 + Math.sin(a) * 40)}L${r1(50 + Math.cos(a + 0.06) * 27)} ${r1(66 + Math.sin(a + 0.06) * 27)}Z"/>`; } return r; } },
  girasol: { name: 'Girasol', fill: () => { let r = ''; for (let k = 0; k < 14; k++) { const a = k * 360 / 14; r += ellipseAt(50 + Math.cos(a * Math.PI / 180) * 22, 50 + Math.sin(a * Math.PI / 180) * 22, 11, 5, a); } return r + '<circle cx="50" cy="50" r="14"/>'; }, cut: `<circle cx="50" cy="50" r="8" stroke-dasharray="2 3"/>` },
  flor: { name: 'Flor', fill: () => { let r = ''; for (let k = 0; k < 5; k++) { const a = -90 + k * 72; r += ellipseAt(50 + Math.cos(a * Math.PI / 180) * 17, 50 + Math.sin(a * Math.PI / 180) * 17, 16, 10, a); } return r; }, cut: '<circle cx="50" cy="50" r="7"/>' },
  estrella: { name: 'Estrella', fill: () => `<path d="${polyStar(50, 53, 5, 34, 14)}"/>` },
  estrella8: { name: 'Estrella de ocho puntas', fill: () => `<path d="${polyStar(50, 50, 8, 34, 16, -90)}"/>`, cut: '<circle cx="50" cy="50" r="6"/>' },
  tresEstrellas: { name: 'Tres estrellas', fill: () => `<path d="${polyStar(50, 34, 5, 16, 6.5)}"/><path d="${polyStar(28, 62, 5, 14, 5.6)}"/><path d="${polyStar(72, 62, 5, 14, 5.6)}"/>` },
  corona: { name: 'Corona de estrellas', fill: () => { let r = ''; for (let k = 0; k < 12; k++) { const a = (k * 30 - 90) * Math.PI / 180; r += `<path d="${polyStar(50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30, 5, 6.5, 2.6)}"/>`; } return r; } },
  arbol: { name: 'Árbol', fill: `<circle cx="37" cy="44" r="14"/><circle cx="50" cy="32" r="16"/><circle cx="63" cy="44" r="14"/><circle cx="50" cy="48" r="15"/><path d="M45 58H55L57 84H43Z"/>` },
  montanas: { name: 'Montañas', fill: `<path d="M12 76L38 34L50 52L62 30L88 76Z"/>`, cut: `<path d="M32 44L38 34L44 44M56 40L62 30L68 40"/>` },
  llama: { name: 'Llama', fill: `<path d="M50 14C63 30 74 40 72 58C70 72 61 82 50 82C39 82 29 73 29 60C29 48 39 42 41 30C45 36 47 40 47 47C54 39 54 26 50 14Z"/>`, cut: `<path d="M50 78C43 78 39 72 40 66C41 60 46 57 47 52C51 57 56 61 56 67C56 74 54 78 50 78Z"/>` },
  flecha: { name: 'Flecha ascendente', fill: `<path d="M16 72L42 48L52 58L70 39L63 34L84 26L78 47L73 42L52 66L42 56L24 80Z"/>` },
  columna: { name: 'Columna', fill: `<rect x="28" y="22" width="44" height="7" rx="1.5"/><rect x="34" y="29" width="32" height="4"/><rect x="37" y="33" width="26" height="40"/><rect x="31" y="73" width="38" height="5"/><rect x="27" y="78" width="46" height="6" rx="1.5"/>`, cut: `<path d="M44 36V70M50 36V70M56 36V70"/>` },
  cruz: { name: 'Cruz', fill: `<path d="M45 16H55V34H72V44H55V84H45V44H28V34H45Z"/>` },
  puente: { name: 'Puente', fill: `<path d="M12 42H88V50H84V78H74Q74 60 62 60Q50 60 50 78Q50 60 38 60Q26 60 26 78H16V50H12Z"/>` },
  hemiciclo: { name: 'Hemiciclo', fill: () => { let r = ''; [[34, 8], [25, 6], [16, 4]].forEach(([rad, n]) => { for (let k = 0; k < n; k++) { const a = Math.PI + Math.PI * k / (n - 1); r += `<circle cx="${r1(50 + Math.cos(a) * rad)}" cy="${r1(66 + Math.sin(a) * rad)}" r="4.2"/>`; } }); return r + '<rect x="40" y="70" width="20" height="6" rx="2"/>'; } },
  corazon: { name: 'Corazón', fill: `<path d="M50 82C20 62 15 42 27 31C37 22 47 27 50 36C53 27 63 22 73 31C85 42 80 62 50 82Z"/>` },
  triskel: { name: 'Trisquel', stroke: () => { let r = ''; for (let k = 0; k < 3; k++) { const a = k * 120; r += `<path transform="rotate(${a} 50 50)" d="M50 50C50 38 62 30 70 36C78 42 74 54 64 54C58 54 56 48 60 45" stroke-width="5.5"/>`; } return r; } },
  anillos: { name: 'Anillos unidos', stroke: `<circle cx="38" cy="44" r="16" stroke-width="5"/><circle cx="62" cy="44" r="16" stroke-width="5"/><circle cx="50" cy="62" r="16" stroke-width="5"/>` },
  faro: { name: 'Faro', fill: `<path d="M42 34H58L62 82H38Z"/><rect x="40" y="24" width="20" height="10" rx="2"/><path d="M44 24L50 16L56 24Z"/><path d="M60 26L84 18V36Z" opacity="0.8"/><path d="M40 26L16 18V36Z" opacity="0.8"/>`, cut: `<path d="M40 50H60M39 66H61"/>` },
  barras: { name: 'Franjas', fill: `<rect x="22" y="20" width="10" height="60" rx="2"/><rect x="38" y="20" width="10" height="60" rx="2"/><rect x="54" y="20" width="10" height="60" rx="2"/><rect x="70" y="20" width="8" height="60" rx="2"/>` },
  siglas: { name: 'Siglas del partido', text: true },
};
// Símbolos de Lucide escogidos por su sentido político (sin objetos sueltos ni paisajes de acampada)
const LUCIDE_LOGO = ['handshake', 'heart-handshake', 'hand', 'hand-heart', 'scale', 'landmark', 'crown', 'anchor', 'cog', 'hammer', 'wheat', 'leaf', 'sprout', 'clover',
  'flower-2', 'megaphone', 'castle', 'feather', 'globe', 'compass', 'sailboat', 'ship-wheel', 'vote', 'house', 'users', 'book-open', 'graduation-cap', 'zap',
  'droplet', 'sunrise', 'mountain-snow', 'waves', 'shield', 'tractor', 'factory', 'flag', 'key', 'gem', 'lightbulb', 'award', 'infinity', 'rainbow', 'bird',
  'tree-pine', 'sun', 'train-front', 'bike'];
const LOGO_ICON_NAMES = { handshake: 'Apretón de manos', 'heart-handshake': 'Manos y corazón', hand: 'Mano abierta', 'hand-heart': 'Mano solidaria', scale: 'Balanza', landmark: 'Institución',
  crown: 'Corona', anchor: 'Ancla', cog: 'Engranaje', hammer: 'Martillo', wheat: 'Espiga', leaf: 'Hoja', sprout: 'Brote', clover: 'Trébol', 'flower-2': 'Margarita', megaphone: 'Megáfono',
  castle: 'Castillo', feather: 'Pluma', globe: 'Globo', compass: 'Brújula', sailboat: 'Velero', 'ship-wheel': 'Timón', vote: 'Urna', house: 'Hogar', users: 'Personas',
  'book-open': 'Libro', 'graduation-cap': 'Birrete', zap: 'Rayo', droplet: 'Gota', sunrise: 'Amanecer', 'mountain-snow': 'Cumbre', waves: 'Olas', shield: 'Escudo', tractor: 'Tractor',
  factory: 'Fábrica', flag: 'Bandera', key: 'Llave', gem: 'Gema', lightbulb: 'Bombilla', award: 'Medalla', infinity: 'Infinito', rainbow: 'Arcoíris', bird: 'Pájaro',
  'tree-pine': 'Pino', sun: 'Sol', 'train-front': 'Tren', bike: 'Bicicleta' };
const LOGO_ICON_GROUPS = [
  { name: 'Símbolos políticos', ids: ['rosa', 'puno', 'paloma', 'antorcha', 'laurel', 'olivo', 'espigas', 'sol', 'estrella', 'tresEstrellas', 'corona', 'estrella8', 'hemiciclo', 'columna', 'cruz', 'flecha', 'llama', 'corazon', 'anillos', 'siglas'] },
  { name: 'Tierra y territorio', ids: ['arbol', 'montanas', 'girasol', 'flor', 'triskel', 'faro', 'puente', 'barras', 'vuelo'] },
  { name: 'Iconos', ids: LUCIDE_LOGO },
];
const PARTY_ICONS_ALL = LOGO_ICON_GROUPS.flatMap(g => g.ids);
const logoIconName = id => (LOGO_SYMBOLS[id] && LOGO_SYMBOLS[id].name) || LOGO_ICON_NAMES[id] || String(id).replace(/-/g, ' ');
// Válido como símbolo de partido: los curados de arriba o cualquier icono del catálogo completo de Lucide
const isPartyIcon = id => typeof id === 'string' && (LUCIDE_ALL_SET.has(id) || PARTY_ICONS_ALL.includes(id));

const LOGO_PATHS = {
  circle: '<circle cx="50" cy="50" r="46"/>',
  rounded: '<rect x="6" y="6" width="88" height="88" rx="22"/>',
  square: '<rect x="7" y="7" width="86" height="86" rx="4"/>',
  shield: '<path d="M50 4 L90 16 L90 50 Q90 80 50 96 Q10 80 10 50 L10 16 Z"/>',
  hexagon: '<path d="M50 3 L91 26.5 L91 73.5 L50 97 L9 73.5 L9 26.5 Z"/>',
  octagon: '<path d="M31 4H69L96 31V69L69 96H31L4 69V31Z"/>',
  diamond: '<path d="M50 2 L98 50 L50 98 L2 50 Z"/>',
  flag: '<path d="M8 8 L92 8 L92 70 L50 94 L8 70 Z"/>',
  arch: '<path d="M6 94V50A44 44 0 0 1 94 50V94Z"/>',
  ring: '<circle cx="50" cy="50" r="46"/>',
  rays: '', // sol: se genera
  wreath: '<circle cx="50" cy="50" r="46"/>',
};
const LOGO_STYLES = [{ id: 'lleno', name: 'Lleno' }, { id: 'invertido', name: 'Invertido' }, { id: 'dividido', name: 'Partido en dos' }];
function shapeMarkup(shape) {
  if (shape === 'rays') return `<path d="${polyStar(50, 50, 16, 49, 38, -90)}"/>`;
  return LOGO_PATHS[shape] ?? LOGO_PATHS.circle;
}
// Dibuja el símbolo dentro de una caja (x, y, tamaño) con color fg y color de recorte bg
function symbolMarkup(id, fg, bg, box, text) {
  const [bx, by, bs] = box, k = bs / 100;
  const sym = LOGO_SYMBOLS[id];
  if (sym && sym.text) {
    const t = String(text || '·').slice(0, 5), fs = t.length <= 2 ? 46 : t.length === 3 ? 36 : t.length === 4 ? 28 : 23;
    return `<text x="${r1(bx + bs / 2)}" y="${r1(by + bs / 2)}" text-anchor="middle" dominant-baseline="central" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif" font-weight="700" font-size="${r1(fs * k * 1.15)}" fill="${fg}" letter-spacing="${r1(-0.5 * k)}">${t.replace(/[<&>]/g, '')}</text>`;
  }
  if (sym) {
    const v = x => typeof x === 'function' ? x() : (x || '');
    return `<g transform="translate(${r1(bx)} ${r1(by)}) scale(${r1(k * 100) / 100})">` +
      (sym.fill ? `<g fill="${fg}">${v(sym.fill)}</g>` : '') +
      (sym.stroke ? `<g fill="none" stroke="${fg}" stroke-linecap="round" stroke-linejoin="round">${v(sym.stroke)}</g>` : '') +
      (sym.cut ? `<g fill="none" stroke="${bg}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${v(sym.cut)}</g>` : '') + '</g>';
  }
  const ic = ICON_PATHS[id] || ICON_PATHS.star || '';
  const sc = bs / 24;
  return `<g transform="translate(${r1(bx)} ${r1(by)}) scale(${r1(sc * 100) / 100})" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic}</g>`;
}
// Logotipo del partido: forma + símbolo + colores
function logoSVG(logo, color, color2, size = 64) {
  logo = logo || {};
  const shape = logo.shape || 'circle', style = logo.style || 'lleno';
  const c1 = color || '#888', c2 = color2 || '#ffffff';
  const uid = 'l' + Math.random().toString(36).slice(2, 8);
  let bgFill = c1, fg = c2, cutCol = c1, stroke = '', extra = '', defs = '';
  if (style === 'invertido') { bgFill = c2; fg = c1; cutCol = c2; stroke = ` stroke="${c1}" stroke-width="6"`; }
  if (style === 'dividido') {
    // dos tonos del color del partido, en diagonal, con el símbolo del segundo color
    const dark = typeof shade === 'function' ? shade(c1, -0.38) : c1;
    defs = `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.5" stop-color="${c1}"/><stop offset="0.5" stop-color="${dark}"/></linearGradient></defs>`;
    bgFill = `url(#${uid})`; cutCol = dark;
  }
  let shapeEl = shapeMarkup(shape);
  if (shape === 'ring') extra += `<circle cx="50" cy="50" r="38" fill="none" stroke="${fg}" stroke-width="4" opacity="0.9"/>`;
  if (shape === 'wreath') extra += `<g fill="${fg}" opacity="0.85">${leavesAlong([50, 92], [14, 84], [16, 30], 7, 9, 4, 1)}${leavesAlong([50, 92], [86, 84], [84, 30], 7, 9, 4, -1)}</g>`;
  const custom = !!LOGO_SYMBOLS[logo.icon || 'estrella'];
  const inner = ({ diamond: 60, arch: 66, rays: 64, wreath: 58, ring: 62, hexagon: 72, octagon: 76, shield: 66, flag: 66 }[shape] || 78) * (custom ? 1 : 0.8);
  const oy = shape === 'flag' ? -5 : shape === 'arch' ? 6 : shape === 'shield' ? -2 : 0;
  const box = [50 - inner / 2, 50 - inner / 2 + oy, inner];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${defs}<g fill="${bgFill}"${stroke}>${shapeEl.replace('r="46"', style === 'invertido' ? 'r="43"' : 'r="46"')}</g>${extra}` +
    `${symbolMarkup(logo.icon || 'estrella', fg, cutCol, box, logo.text)}</svg>`;
}
function partyLogo(p, size = 28) {
  const span = document.createElement('span');
  span.className = 'logo';
  span.style.width = span.style.height = size + 'px';
  span.innerHTML = logoSVG(p.logo, p.color || '#666', p.color2, size);
  return span;
}
