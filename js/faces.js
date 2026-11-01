// ============================================================
//  RETRATOS DE CANDIDATOS
//  Genera caras ilustradas en SVG a partir de unos pocos rasgos.
//  Los mismos retratos se usan en la interfaz y como texturas 3D.
// ============================================================
'use strict';

const FACE_OPTIONS = {
  skin: { name: 'Piel', values: ['#f6d7c3', '#eec1a0', '#e0ac85', '#c98d62', '#9c6644', '#6e452c', '#4a2c1c'] },
  shape: { name: 'Cara', labels: ['Ovalada', 'Redonda', 'Cuadrada', 'Alargada'] },
  hair: { name: 'Peinado', labels: ['Calvo', 'Corto', 'Raya al lado', 'Rapado', 'Melena', 'Media melena', 'Moño', 'Rizado', 'Coleta', 'Tupé', 'Afro', 'Entradas'] },
  hairColor: { name: 'Color de pelo', values: ['#1d1a19', '#3b2a20', '#6b4a2f', '#a7744a', '#d9b26b', '#b5432b', '#8e8e8e', '#d8d8d8'] },
  eyes: { name: 'Ojos', labels: ['Normales', 'Rasgados', 'Grandes', 'Cansados'] },
  eyeColor: { name: 'Color de ojos', values: ['#4a2f1d', '#2a1c14', '#3d6e9e', '#4f7d4b', '#7a6a3a'] },
  brows: { name: 'Cejas', labels: ['Finas', 'Pobladas', 'Arqueadas', 'Rectas'] },
  nose: { name: 'Nariz', labels: ['Pequeña', 'Recta', 'Ancha', 'Aguileña'] },
  mouth: { name: 'Boca', labels: ['Sonrisa', 'Neutra', 'Seria', 'Sonrisa amplia'] },
  beard: { name: 'Barba', labels: ['Sin barba', 'Barba de tres días', 'Barba poblada', 'Perilla', 'Bigote'] },
  glasses: { name: 'Gafas', labels: ['Sin gafas', 'Redondas', 'Rectangulares', 'De pasta', 'De sol'] },
  age: { name: 'Edad', labels: ['Joven', 'Mediana edad', 'Veterano'] },
  outfit: { name: 'Vestuario', labels: ['Traje y corbata', 'Traje sin corbata', 'Blusa', 'Jersey', 'Camisa remangada'] },
  suit: { name: 'Color del traje', values: ['#1d2740', '#2e2e33', '#111111', '#5a4a3a', '#7d8590', '#e8e4da', '#3d2a4a'] },
  earrings: { name: 'Pendientes', labels: ['No', 'Sí'] },
};
const FACE_KEYS = Object.keys(FACE_OPTIONS);
function faceOptionCount(k) { const o = FACE_OPTIONS[k]; return (o.values || o.labels).length; }

function randomFace() {
  const f = {};
  FACE_KEYS.forEach(k => f[k] = Math.floor(Math.random() * faceOptionCount(k)));
  if (f.age === 2 && Math.random() < 0.7) f.hairColor = Math.random() < 0.5 ? 6 : 7;
  if (Math.random() < 0.55) f.beard = 0;
  if (Math.random() < 0.5) f.glasses = 0;
  if (f.glasses === 4 && Math.random() < 0.7) f.glasses = 0;
  if (Math.random() < 0.6) f.earrings = 0;
  return f;
}
function sanitizeFace(f) {
  const out = {};
  FACE_KEYS.forEach(k => {
    const v = f && Number.isInteger(f[k]) ? f[k] : 0;
    out[k] = Math.max(0, Math.min(faceOptionCount(k) - 1, v));
  });
  return out;
}

// Devuelve el SVG del retrato. opts: {accent: color de la corbata/pañuelo, bg: fondo o null}
function faceSVG(face, opts = {}) {
  const f = sanitizeFace(face);
  const skin = FACE_OPTIONS.skin.values[f.skin];
  const skinD = shade(skin, -0.16), skinL = shade(skin, 0.08);
  const hair = FACE_OPTIONS.hairColor.values[f.hairColor];
  const hairD = shade(hair, -0.25);
  const suit = FACE_OPTIONS.suit.values[f.suit];
  const accent = opts.accent || '#c9a24a';
  const eyeC = FACE_OPTIONS.eyeColor.values[f.eyeColor];
  const ink = '#2a1e1a';
  const P = [];
  P.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">`);
  if (opts.bg) P.push(`<rect width="200" height="220" fill="${opts.bg}"/>`, `<circle cx="100" cy="90" r="88" fill="${shade(opts.bg, 0.12)}"/>`);
  // --- pelo largo por detrás ---
  if ([4, 5, 8].includes(f.hair)) {
    const len = f.hair === 4 ? 190 : f.hair === 5 ? 145 : 120;
    P.push(`<path d="M50 90 Q46 40 100 34 Q154 40 150 90 L${f.hair === 8 ? 150 : 158} ${len} Q100 ${len + 14} ${f.hair === 8 ? 50 : 42} ${len} Z" fill="${hairD}"/>`);
  }
  if (f.hair === 10) P.push(`<circle cx="100" cy="72" r="64" fill="${hairD}"/>`);
  // --- cuerpo ---
  const outfit = f.outfit;
  P.push(`<path d="M10 220 Q16 176 60 164 L140 164 Q184 176 190 220 Z" fill="${outfit === 3 ? accent : suit}"/>`);
  P.push(`<rect x="84" y="128" width="32" height="40" rx="10" fill="${skinD}"/>`);
  if (outfit === 0 || outfit === 1) {
    P.push(`<path d="M80 164 L100 206 L120 164 Z" fill="#f4f4f2"/>`);
    P.push(`<path d="M60 164 L82 164 L100 210 L76 220 Z" fill="${shade(suit, -0.18)}"/><path d="M140 164 L118 164 L100 210 L124 220 Z" fill="${shade(suit, -0.18)}"/>`);
    if (outfit === 0) P.push(`<path d="M95 168 L105 168 L108 204 L100 214 L92 204 Z" fill="${accent}"/><path d="M94 166 L106 166 L104 174 L96 174 Z" fill="${shade(accent, -0.2)}"/>`);
    else P.push(`<path d="M86 164 L100 184 L114 164 Z" fill="${skinD}"/>`);
  } else if (outfit === 2) {
    P.push(`<path d="M70 164 Q100 196 130 164 Z" fill="#f2efe8"/><path d="M78 164 Q100 186 122 164" fill="none" stroke="${accent}" stroke-width="5"/>`);
  } else if (outfit === 3) {
    P.push(`<path d="M80 164 Q100 184 120 164" fill="${skinD}"/><path d="M80 164 Q100 184 120 164" fill="none" stroke="${shade(accent, -0.25)}" stroke-width="6"/>`);
  } else {
    P.push(`<path d="M60 164 L140 164 L150 220 L50 220 Z" fill="#eef1f5"/><path d="M86 164 L100 190 L114 164 Z" fill="${skinD}"/><path d="M100 190 L100 220" stroke="#c8ccd3" stroke-width="2"/>`);
  }
  // --- orejas y cabeza ---
  P.push(`<ellipse cx="54" cy="98" rx="8" ry="12" fill="${skinD}"/><ellipse cx="146" cy="98" rx="8" ry="12" fill="${skinD}"/>`);
  if (f.earrings) P.push(`<circle cx="54" cy="113" r="3.2" fill="#e6c55a"/><circle cx="146" cy="113" r="3.2" fill="#e6c55a"/>`);
  const head = [
    `<ellipse cx="100" cy="92" rx="46" ry="54" fill="${skin}"/>`,
    `<ellipse cx="100" cy="94" rx="49" ry="50" fill="${skin}"/>`,
    `<path d="M54 80 Q54 38 100 38 Q146 38 146 80 L146 108 Q144 140 100 146 Q56 140 54 108 Z" fill="${skin}"/>`,
    `<ellipse cx="100" cy="92" rx="43" ry="57" fill="${skin}"/>`,
  ][f.shape];
  P.push(head);
  P.push(`<ellipse cx="100" cy="132" rx="22" ry="6" fill="${skinL}" opacity="0.5"/>`);
  // --- edad ---
  if (f.age >= 1) P.push(`<path d="M76 108 Q80 112 86 111 M124 108 Q120 112 114 111" stroke="${skinD}" stroke-width="1.6" fill="none" opacity="0.7"/>`);
  if (f.age === 2) P.push(`<path d="M80 64 Q100 60 120 64 M84 70 Q100 67 116 70 M64 98 L70 100 M136 98 L130 100 M84 122 Q80 128 82 134 M116 122 Q120 128 118 134" stroke="${skinD}" stroke-width="1.5" fill="none" opacity="0.8"/>`);
  // --- ojos ---
  const eyeRy = [4.6, 3, 6, 4.2][f.eyes];
  [82, 118].forEach(x => {
    P.push(`<ellipse cx="${x}" cy="94" rx="7.5" ry="${eyeRy}" fill="#fbfbf8"/>`);
    P.push(`<circle cx="${x}" cy="94.5" r="${Math.min(3.6, eyeRy - 0.4)}" fill="${eyeC}"/><circle cx="${x}" cy="94.5" r="1.5" fill="#111"/><circle cx="${x + 1.2}" cy="93.4" r="0.8" fill="#fff"/>`);
    if (f.eyes === 3) P.push(`<path d="M${x - 8} 92 Q${x} 88 ${x + 8} 92" stroke="${skinD}" stroke-width="2.4" fill="none"/>`);
    P.push(`<path d="M${x - 8} 94 Q${x} ${94 - eyeRy - 2} ${x + 8} 94" stroke="${ink}" stroke-width="1.4" fill="none"/>`);
  });
  // --- cejas ---
  const bw = [1.8, 3.6, 2.4, 3][f.brows];
  const browY = 82;
  const brow = (x, dir) => f.brows === 2 ? `M${x - 9} ${browY + 2} Q${x} ${browY - 6} ${x + 9} ${browY + 1}`
    : f.brows === 3 ? `M${x - 9} ${browY} L${x + 9} ${browY}` : `M${x - 9} ${browY + 2} Q${x} ${browY - 3} ${x + 9} ${browY + (dir ? 1 : 2)}`;
  P.push(`<path d="${brow(82, 0)} ${brow(118, 1)}" stroke="${hairD}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`);
  // --- nariz ---
  const nose = [
    `M100 98 Q97 110 99 114 Q101 115 103 113`,
    `M100 96 L97 114 Q100 117 104 114`,
    `M99 98 Q95 112 93 114 Q100 120 107 114 Q105 112 101 98`,
    `M101 94 Q106 106 103 114 Q100 117 96 114`,
  ][f.nose];
  P.push(`<path d="${nose}" stroke="${skinD}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  // --- barba ---
  if (f.beard === 1) P.push(`<path d="M60 108 Q62 146 100 150 Q138 146 140 108 Q130 128 100 130 Q70 128 60 108 Z" fill="${hair}" opacity="0.28"/>`);
  if (f.beard === 2) P.push(`<path d="M58 100 Q58 152 100 156 Q142 152 142 100 Q136 124 118 126 Q100 132 82 126 Q64 124 58 100 Z" fill="${hair}"/>`);
  if (f.beard === 3) P.push(`<path d="M88 130 Q100 152 112 130 Q100 136 88 130 Z" fill="${hair}"/>`);
  if (f.beard === 2 || f.beard === 4) P.push(`<path d="M84 121 Q100 114 116 121 Q108 125 100 123 Q92 125 84 121 Z" fill="${hair}"/>`);
  // --- boca ---
  const mouth = [
    `<path d="M88 126 Q100 135 112 126" stroke="#8a3b34" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    `<path d="M89 128 Q100 130 111 128" stroke="#8a3b34" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    `<path d="M90 129 Q100 126 110 129" stroke="#7a332d" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    `<path d="M86 125 Q100 140 114 125 Z" fill="#7a2f2a"/><path d="M89 126 Q100 131 111 126 L110 128 Q100 132 90 128 Z" fill="#fff"/>`,
  ][f.mouth];
  P.push(mouth);
  // --- pelo delantero ---
  const H = hair;
  const hairFront = {
    0: f.age === 2 ? `<path d="M54 96 Q52 70 62 66 L64 92 Z M146 96 Q148 70 138 66 L136 92 Z" fill="${H}"/>` : '',
    1: `<path d="M53 92 Q50 36 100 32 Q150 36 147 92 Q142 66 128 56 Q110 64 86 58 Q64 62 53 92 Z" fill="${H}"/>`,
    2: `<path d="M53 94 Q48 36 100 32 Q152 36 147 90 Q140 60 120 54 Q90 50 74 70 Q62 78 53 94 Z" fill="${H}"/><path d="M80 40 Q76 54 74 66" stroke="${hairD}" stroke-width="2" fill="none"/>`,
    3: `<path d="M54 86 Q54 40 100 38 Q146 40 146 86 Q140 60 100 56 Q60 60 54 86 Z" fill="${H}" opacity="0.75"/>`,
    4: `<path d="M52 104 Q46 34 100 30 Q154 34 148 104 Q144 62 112 52 Q100 64 100 50 Q96 62 88 52 Q56 62 52 104 Z" fill="${H}"/>`,
    5: `<path d="M52 100 Q46 34 100 30 Q154 34 148 100 Q146 70 136 60 Q120 70 100 64 Q78 70 64 60 Q54 70 52 100 Z" fill="${H}"/>`,
    6: `<circle cx="100" cy="30" r="17" fill="${H}"/><path d="M54 90 Q52 40 100 38 Q148 40 146 90 Q140 60 100 56 Q60 60 54 90 Z" fill="${H}"/>`,
    7: range(14).map(i => { const a = Math.PI * (0.95 + i / 13 * 1.1); return `<circle cx="${(100 + Math.cos(a) * 46).toFixed(1)}" cy="${(80 + Math.sin(a) * 44).toFixed(1)}" r="13" fill="${H}"/>`; }).join('') + `<ellipse cx="100" cy="46" rx="40" ry="14" fill="${H}"/>`,
    8: `<path d="M54 90 Q52 38 100 36 Q148 38 146 90 Q140 58 100 54 Q60 58 54 90 Z" fill="${H}"/><path d="M140 70 Q166 90 156 140 Q150 110 140 96 Z" fill="${H}"/>`,
    9: `<path d="M54 88 Q52 42 80 34 Q100 18 130 30 Q150 40 146 88 Q140 58 118 50 Q96 46 80 56 Q62 64 54 88 Z" fill="${H}"/>`,
    10: `<path d="M50 96 Q44 40 100 34 Q156 40 150 96 Q146 66 100 58 Q54 66 50 96 Z" fill="${H}"/>`,
    11: `<path d="M54 96 Q54 50 70 42 Q74 60 70 76 Z M146 96 Q146 50 130 42 Q126 60 130 76 Z M86 38 Q100 34 114 38 Q100 44 86 38 Z" fill="${H}"/>`,
  }[f.hair];
  P.push(hairFront);
  // --- gafas ---
  if (f.glasses) {
    const gc = f.glasses === 3 ? '#1e1e1e' : f.glasses === 4 ? '#111' : '#3a3a3a';
    const sw = f.glasses === 3 ? 3.6 : 2;
    const fill = f.glasses === 4 ? '#151515' : 'rgba(255,255,255,0.12)';
    const lens = x => f.glasses === 1 ? `<circle cx="${x}" cy="94" r="11" fill="${fill}" stroke="${gc}" stroke-width="${sw}"/>`
      : `<rect x="${x - 13}" y="85" width="26" height="18" rx="${f.glasses === 2 ? 3 : 6}" fill="${fill}" stroke="${gc}" stroke-width="${sw}"/>`;
    P.push(lens(82), lens(118), `<path d="M93 93 Q100 89 107 93" stroke="${gc}" stroke-width="${sw}" fill="none"/>`,
      `<path d="M${f.glasses === 1 ? 71 : 69} 92 L56 90 M${f.glasses === 1 ? 129 : 131} 92 L144 90" stroke="${gc}" stroke-width="${sw}"/>`);
  }
  P.push('</svg>');
  return P.join('');
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return rgbToHex([f(r), f(g), f(b)]);
}
function faceDataURL(face, opts) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(faceSVG(face, opts)); }
// Convierte un SVG en <canvas> (para texturas 3D). Devuelve una promesa.
function svgToCanvas(svg, w, h) {
  return new Promise(resolve => {
    const img = new Image();
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, w, h); resolve(c); };
    img.onerror = () => resolve(c);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
