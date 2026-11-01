// ============================================================
//  REGIONES E IDENTIDAD
//  · Cada cantón pertenece a una cultura. La mayoritaria es la del país; las minoritarias son
//    grupos de uno a tres cantones vecinos con lengua y tradiciones propias.
//  · Fervor cantonalista y fervor centralista: una parte de los habitantes de cada cantón siente
//    con fuerza una cosa u otra; el resto es neutral y no se mueve por el eje territorial.
//    Cada habitante es de uno de los tres tipos (según su origen y lo que se siente en su cantón).
//  · El fervor se mueve con las leyes (lengua, símbolos, concierto…) y cuesta más subirlo cuanto
//    más alto está. Los que llegan de fuera lo diluyen: se sienten menos del cantón.
//  · Partidos regionalistas: nacen en el debate inaugural y se presentan en los cantones de su
//    cultura que empezaron la partida con al menos un 40 % de fervor cantonalista.
//  · El presidente de un cantón puede cambiarle el nombre y proponer fusionarlo con un vecino.
// ============================================================
'use strict';

const FERVOR_REGIONAL_MIN = 0.4;
// desplazamiento en el eje territorial de cada tipo de habitante (el cantonalista va a la derecha, +; el centralista a la izquierda, −)
const FERV_SHIFT = { '-1': 1.5, '0': 0, '1': -1.0 };
const liveCanton = c => !!c && !c.merged;
const liveCantons = G => G.cantons.filter(liveCanton);
const r3f = v => Math.round(v * 1000) / 1000;

function cantonAdjacency(G) {
  const adj = G.cantons.map(() => new Set());
  for (const h of G.map.hexes) {
    if (h.c !== 0 || h.k == null || h.k < 0) continue;
    for (const [q, r] of HEX.neighbors(h.q, h.r)) {
      const n = hexAtG(G, q, r);
      if (n && n.c === 0 && n.k >= 0 && n.k !== h.k) adj[h.k].add(n.k);
    }
  }
  return adj;
}

// --- Culturas y fervor de partida (antes de poblar el país) ---
function initRegions(G) {
  const n = G.cantons.length, adj = cantonAdjacency(G);
  const capital = G.cantons.findIndex(c => c.capital);
  const free = new Set(range(n).filter(i => i !== capital));
  const nMin = clamp(RNG.int(1, Math.max(1, Math.round(n / 3))), 1, 3);
  G.cultures = [{ id: 0, name: G.country.name, major: true, members: [] }];
  G.cantons.forEach(c => { c.cul = 0; });
  for (let j = 1; j <= nMin && free.size; j++) {
    // semilla lejos de las otras culturas minoritarias
    const pool = [...free].filter(i => ![...adj[i]].some(x => G.cantons[x].cul > 0));
    const seed = RNG.pick(pool.length ? pool : [...free]);
    const members = [seed]; free.delete(seed); G.cantons[seed].cul = j;
    let p = 0.6;
    while (members.length < 3) {
      const front = [...new Set(members.flatMap(m => [...adj[m]]))].filter(x => free.has(x));
      if (!front.length || !RNG.chance(p)) break;
      const x = RNG.pick(front); members.push(x); free.delete(x); G.cantons[x].cul = j; p *= 0.5;
    }
    let name = G.cantons[seed].name;
    if (members.length > 1) { let k = 0; do { name = cantonNameFrom('inventado'); k++; } while (k < 20 && (G.cantons.some(c => c.name === name) || G.cultures.some(c => c.name === name))); }
    G.cultures.push({ id: j, name, members });
  }
  G.cultures[0].members = range(n).filter(i => G.cantons[i].cul === 0);
  // fervor entre los nativos de cada cantón
  G.cantons.forEach((c, i) => {
    let can, cen;
    if (c.cul > 0) {
      const seed = G.cultures[c.cul].members[0] === i;
      can = seed ? RNG.range(0.56, 0.88) : RNG.range(0.3, 0.75); cen = RNG.range(0.03, 0.15);
    } else { can = c.capital ? RNG.range(0, 0.06) : RNG.range(0.02, 0.22); cen = c.capital ? RNG.range(0.4, 0.6) : RNG.range(0.15, 0.45); }
    cen = Math.min(cen, 0.95 - can);
    c.fv = { can: r3f(can), cen: r3f(cen) }; c.fv0 = Object.assign({}, c.fv);
  });
}
// Tras poblar el país: tipo de cada habitante, fervor visible y cantones que pueden tener regionalistas
function finishRegions(G) {
  G.citizens.forEach(cz => assignFervor(G, cz));
  fervorDisplay(G);
  // que haya al menos un cantón con regionalistas posibles
  if (!G.cantons.some(c => c.cul > 0 && c.ferv.can >= FERVOR_REGIONAL_MIN)) {
    const c = G.cantons[G.cultures[1] ? G.cultures[1].members[0] : 0];
    c.fv.can = r3f(Math.min(0.92, c.fv.can * (FERVOR_REGIONAL_MIN + 0.05) / Math.max(0.05, c.ferv.can)));
    c.fv.cen = Math.min(c.fv.cen, r3f(0.97 - c.fv.can)); c.fv0 = Object.assign({}, c.fv);
    G.citizens.forEach(cz => { if (cz.c === c.idx) assignFervor(G, cz); });
    fervorDisplay(G);
  }
  G.cantons.forEach(c => { c.ferv0 = Object.assign({}, c.ferv); c.pr0 = (({ can, cen }) => ({ can, cen }))(fervorPressures(G, c)); });
  G.cultures.forEach(cu => { cu.region = cu.members.filter(i => cu.id > 0 && G.cantons[i].ferv0.can >= FERVOR_REGIONAL_MIN); });
}
// probabilidad de que un habitante sea cantonalista o centralista según su origen
function fervorProbs(c, cz) {
  const lg = c.pol && c.pol.lengua;
  if (cz.origin === 'nativo') return [c.fv.can, c.fv.cen];
  if (cz.origin === 'interno') { const pc = c.fv.can * (lg ? 0.4 : 0.22); return [pc, Math.min(1 - pc, c.fv.cen * 1.2 + 0.08)]; }
  const pc = c.fv.can * (0.06 + 0.14 * Math.min(1, (cz.yrs || 0) / 12)) * (lg ? 1.5 : 1);
  return [pc, Math.min(1 - pc, c.fv.cen * 0.45)];
}
function assignFervor(G, cz) {
  const c = G.cantons[cz.c]; if (!c || !c.fv) return;
  if (cz.fu == null) cz.fu = Math.round(RNG.next() * 1000) / 1000;
  const [pc, pz] = fervorProbs(c, cz);
  const t = cz.fu < pc ? -1 : cz.fu >= 1 - pz ? 1 : 0;
  const s = FERV_SHIFT[t];
  if (cz.fs == null) cz.fs = 0;
  if (s !== cz.fs) { cz.x[2] = clamp(cz.x[2] + s - cz.fs, -2.3, 2.3); cz.fs = s; }
  cz.fv = t;
}
function fervorDisplay(G) {
  const cnt = G.cantons.map(() => [0, 0, 0]);
  for (const cz of G.citizens) { const k = cnt[cz.c]; if (k) { k[0]++; if (cz.fv === -1) k[1]++; else if (cz.fv === 1) k[2]++; } }
  G.cantons.forEach((c, i) => {
    const [n, a, b] = cnt[i];
    c.ferv = n ? { can: r3f(a / n), cen: r3f(b / n) } : { can: 0, cen: 0 };
  });
  const tot = sum(cnt, k => k[0]) || 1;
  if (G.eco) G.eco.ferv = { can: r3f(sum(cnt, k => k[1]) / tot), cen: r3f(sum(cnt, k => k[2]) / tot) };
}

// Lo que empuja el fervor de un cantón cada trimestre (antes de la dificultad de subirlo)
function fervorPressures(G, c) {
  const p = G.pol, cp = c.pol || {}, m = c.cul > 0 ? 1 : 0.4, parts = [];
  const add = (label, can, cen) => { if (can || cen) parts.push({ label, can, cen }); };
  const hi = (c.ferv ? c.ferv.can : c.fv.can) >= 0.35;
  if (cp.lengua) add('Inmersión lingüística', 0.012 * m, 0);
  if (cp.rotulacion) add(cp.rotulacion === 2 ? 'Solo la lengua propia en la Administración' : 'Administración bilingüe', [0, 0.003, 0.008][cp.rotulacion] * m, cp.rotulacion === 2 ? 0.002 : 0);
  if (cp.tv) add('Televisión pública cantonal', 0.006 * m, 0);
  if (cp.fiestas) add('Promoción de la cultura propia', [0, 0.003, 0.007][cp.fiestas] * m, 0);
  if (cp.exterior) add('Delegaciones en el exterior', 0.004 * m, 0);
  if (c.cul > 0) add(p.lenguas ? 'Lenguas cantonales cooficiales' : 'Una sola lengua oficial (agravio)', p.lenguas ? 0.004 : 0.002, 0);
  else if (!p.lenguas) add('Una sola lengua oficial', 0, 0.002);
  const conc = (p.concierto || []).filter(i => liveCanton(G.cantons[i]));
  if (conc.includes(c.idx)) add('Concierto económico propio', 0.010, 0);
  else if (conc.length) {
    // agravio: en los cantones de la misma cultura, ganas de tenerlo también; en el resto, centralismo
    if (c.cul > 0 && conc.some(i => G.cantons[i].cul === c.cul)) add('Concierto económico de sus vecinos', 0.003, 0);
    else { const sh = sum(conc, i => G.cantons[i].pop || 0) / Math.max(1, sum(liveCantons(G), x => x.pop || 0)); add('Concierto económico de otros cantones', 0, 0.003 + 0.005 * Math.min(1, sh / 0.25)); }
  }
  if (p.curriculo === 'comun') add('Currículo escolar común', -0.005, 0.003);
  else if (p.curriculo === 'cantonal') add('Currículo escolar cantonal', 0.006 * m, 0);
  if (p.simbolos === 'nacional') add('Símbolos nacionales obligatorios', hi ? 0.004 : 0, 0.005);
  else if (p.simbolos === 'libre') add('Cada cantón elige sus símbolos', 0.004 * m, 0);
  if (p.derechoDecidir === 'pactada') add('Consultas de autodeterminación', hi ? 0.007 : 0, hi ? 0 : 0.004);
  if (p.selecciones) add('Selecciones deportivas propias', 0.004 * m, 0);
  if (p.servicioMilitar) add('Servicio militar obligatorio', 0, 0.002);
  const devol = sum(AREA_IDS, a => 1 - NAT_SHARE[p.comp[a]]) / AREA_IDS.length;
  if (devol > 0) add('Competencias transferidas', 0.003 * devol * m, 0);
  const cpres = G.players.find(x => x.id === (c.gov && c.gov.president));
  if (cpres && cpres.regional != null && (cpres.region || [cpres.regional]).includes(c.idx)) add('Gobierno cantonal regionalista', 0.005, 0);
  else if (cpres && cpres.ideo.ter <= -1) add('Gobierno cantonal centralista', 0, 0.003);
  const np = G.players.find(x => x.id === G.gov.president);
  if (np && np.ideo.ter <= -1.2) add('Gobierno nacional centralista', hi ? 0.002 : 0, 0.002);
  else if (np && np.ideo.ter >= 1) add('Gobierno nacional descentralizador', 0.002 * m, hi ? 0 : 0.001);
  return { can: sum(parts, x => x.can), cen: sum(parts, x => x.cen), parts };
}
const fervorUp = x => Math.min(1.6, ((1 - x) / 0.6) ** 2);
const fervorDown = x => Math.min(1, x / 0.3);
function fervorQuarter(G) {
  if (!G.cultures) return;
  const before = G.cantons.map(c => c.ferv ? c.ferv.can : 0);
  liveCantons(G).forEach(c => {
    const pr = fervorPressures(G, c), p0 = c.pr0 || { can: 0, cen: 0 };
    let { can, cen } = c.fv;
    const dpc = pr.can - p0.can, dpz = pr.cen - p0.cen;
    const dCan = (dpc >= 0 ? dpc * fervorUp(can) : dpc * fervorDown(can)) + (c.fv0.can - can) * 0.012;
    const dCen = (dpz >= 0 ? dpz * fervorUp(cen) : dpz * fervorDown(cen)) + (c.fv0.cen - cen) * 0.012;
    // lo que gana un lado sale de los neutrales y del otro lado, a partes proporcionales
    const can0 = can; can = clamp(can + dCan, 0, 0.98);
    if (can > can0 && 1 - can0 > 0) cen -= (can - can0) * cen / (1 - can0);
    const cen0 = cen; cen = clamp(cen + dCen, 0, 0.98);
    if (cen > cen0 && 1 - cen0 > 0) can -= (cen - cen0) * can / (1 - cen0);
    can = clamp(can, 0, 0.98); cen = clamp(cen, 0, 1 - can);
    c.fv = { can: r3f(can), cen: r3f(cen) };
    c.fervP = { can: r3f(pr.can - p0.can), cen: r3f(pr.cen - p0.cen) };
  });
  G.citizens.forEach(cz => assignFervor(G, cz));
  fervorDisplay(G);
  // titulares cuando el fervor cruza la mitad o el umbral de los regionalistas
  liveCantons(G).forEach((c, k) => {
    const a = before[c.idx], b = c.ferv.can;
    for (const th of [FERVOR_REGIONAL_MIN, 0.5]) {
      if (a < th && b >= th) logEvent(G, { kind: 'fervor', importance: 5, canton: c.idx, up: true, th });
      else if (a >= th && b < th) logEvent(G, { kind: 'fervor', importance: 4, canton: c.idx, up: false, th });
    }
  });
}

// --- Partidos regionalistas ---
function regionalCap(G) { return Math.max(0, G.players.length - 2); }
function regionalCount(G) { return G.players.filter(p => p.regional != null).length; }
// culturas que pueden tener regionalistas (con algún cantón que empezó con fervor suficiente)
function regionalCultures(G) { return (G.cultures || []).filter(cu => cu.id > 0 && cu.region && cu.region.some(i => liveCanton(G.cantons[i]))); }
function cultureLabel(G, cu) {
  const names = cu.region.filter(i => liveCanton(G.cantons[i])).map(i => G.cantons[i].name);
  return names.length === 1 && names[0] === cu.name ? cu.name : `${cu.name} (${names.join(', ')})`;
}
function makeRegional(G, party, cu) {
  party.cul = cu.id;
  party.region = cu.region.filter(i => liveCanton(G.cantons[i])).slice();
  party.regional = party.region.slice().sort((a, b) => G.cantons[b].pop - G.cantons[a].pop)[0];
}

// --- Cambiar el nombre de un cantón ---
function validCantonName(G, name, except) {
  const nm = String(name || '').replace(/\s+/g, ' ').trim();
  if (nm.length < 2 || nm.length > 28) return { ok: false, msg: 'El nombre debe tener entre 2 y 28 caracteres.' };
  const ex = [].concat(except ?? []);
  if (G.cantons.some(c => !ex.includes(c.idx) && liveCanton(c) && c.name.toLowerCase() === nm.toLowerCase())) return { ok: false, msg: 'Ya hay un cantón con ese nombre.' };
  return { ok: true, name: nm };
}
function renameCanton(G, idx, name) {
  const c = G.cantons[idx], old = c.name;
  c.name = name;
  (G.cultures || []).forEach(cu => { if (cu.id > 0 && cu.members.length === 1 && cu.members[0] === idx && cu.name === old) cu.name = name; });
  G._mk = null;
  logEvent(G, { kind: 'renombre', importance: 5, canton: idx, old, name, party: c.gov.president });
}

// --- Fusión de cantones ---
function mergeCheck(G, a, b) {
  const A = G.cantons[a], B = G.cantons[b];
  if (!liveCanton(A) || !liveCanton(B) || a === b) return { ok: false, msg: 'Elige otro cantón.' };
  if (!cantonAdjacency(G)[a].has(b)) return { ok: false, msg: `${A.name} y ${B.name} no son vecinos.` };
  if (liveCantons(G).length <= 3) return { ok: false, msg: 'El país no puede quedarse con menos de 3 cantones.' };
  return { ok: true };
}
function mergeCantons(G, a, b, name) {
  const A = G.cantons[a], B = G.cantons[b];
  const wa = Math.max(1, A.pop || 0), wb = Math.max(1, B.pop || 0), wt = wa + wb;
  const mix = (x, y) => r3f((x * wa + y * wb) / wt);
  // el territorio, la gente, las empresas y las obras pasan al cantón que se queda
  G.map.hexes.forEach(h => { if (h.c === 0 && h.k === b) h.k = a; });
  G.map = Object.assign({}, G.map);   // objeto nuevo: así las pantallas saben que el mapa ha cambiado
  G.citizens.forEach(cz => { if (cz.c === b) cz.c = a; });
  (G.homes || []).forEach(x => { if (x.c === b) x.c = a; });
  (G.firms || []).forEach(x => { if (x.c === b) x.c = a; });
  (G.works || []).forEach(x => { if (x.c === b) x.c = a; });
  Object.values(G.forSale || {}).forEach(x => { if (x.c === b) x.c = a; });
  G._slots = null; G._mk = null; G._flows = {};
  // datos del cantón que se queda
  const old = A.name;
  A.name = name || A.name;
  A.hexCount += B.hexCount;
  for (const k in A.res) A.res[k] = (A.res[k] || 0) + ((B.res || {})[k] || 0);
  A.sizeShare = (A.sizeShare || 0) + (B.sizeShare || 0);
  A.urban = mix(A.urban, B.urban); A.industrial = mix(A.industrial || 0, B.industrial || 0);
  A.capital = A.capital || B.capital; A.island = false;
  A.unemp0 = mix(A.unemp0 || 0.08, B.unemp0 || 0.08);
  A.pop = (A.pop || 0) + (B.pop || 0);
  A.budget.debt = (A.budget.debt || 0) + ((B.budget && B.budget.debt) || 0);
  A.fv = { can: mix(A.fv.can, B.fv.can), cen: mix(A.fv.cen, B.fv.cen) };
  A.fv0 = { can: mix(A.fv0.can, B.fv0.can), cen: mix(A.fv0.cen, B.fv0.cen) };
  A.pr0 = { can: mix(A.pr0.can, B.pr0.can), cen: mix(A.pr0.cen, B.pr0.cen) };
  if (A.cul !== B.cul && wb > wa) A.cul = B.cul;
  // Parlamento cantonal: los escaños de los dos, reescalados al tamaño del nuevo cantón
  const maxPop = Math.max(...liveCantons(G).filter(c => c !== B).map(c => c.pop));
  const seats = clamp(15 + Math.round(26 * A.pop / maxPop), 15, 51) | 1;
  const comp = {};
  for (const src of [A.parliament.composition, B.parliament.composition]) for (const k in src) comp[k] = (comp[k] || 0) + src[k];
  const tot = sum(Object.values(comp)) || 1, quotas = Object.entries(comp).map(([k, v]) => [k, v * seats / tot]);
  const out = {}; quotas.forEach(([k, q]) => out[k] = Math.floor(q));
  let left = seats - sum(Object.values(out));
  quotas.sort((x, y) => (y[1] - Math.floor(y[1])) - (x[1] - Math.floor(x[1]))).forEach(([k]) => { if (left > 0) { out[k]++; left--; } });
  for (const k in out) if (!out[k]) delete out[k];
  A.parliament = Object.assign({}, A.parliament, { seats, composition: out });
  A.gov.coalition = [...new Set(A.gov.coalition.concat(B.gov.coalition || []))].filter(x => x !== A.gov.president);
  // el cantón absorbido queda como un recuerdo (para el historial)
  Object.assign(B, { merged: a, pop: 0, hexCount: 0, sizeShare: 0, nationalSeats: 0, parliament: { seats: 0, composition: {} }, gov: { president: null, coalition: [] } });
  // culturas, partidos, leyes y propuestas que hablaban del cantón absorbido
  (G.cultures || []).forEach(cu => {
    cu.members = [...new Set(cu.members.map(i => i === b ? a : i))].filter(i => G.cantons[i].cul === cu.id);
    if (cu.region) cu.region = [...new Set(cu.region.map(i => i === b ? a : i))].filter(i => G.cantons[i].cul === cu.id);
  });
  if (!G.cultures[A.cul].members.includes(a)) G.cultures[A.cul].members.push(a);
  G.players.forEach(p => {
    if (p.region) p.region = [...new Set(p.region.map(i => i === b ? a : i))];
    if (p.regional === b) p.regional = a;
  });
  if (Array.isArray(G.pol.concierto)) G.pol.concierto = [...new Set(G.pol.concierto.map(i => i === b ? a : i))].sort((x, y) => x - y);
  G.proposals = (G.proposals || []).filter(pr => !(pr.scope === 'cantonal' && pr.canton === b && pr.result == null));
  (G.mergeOffers || []).splice(0);
  allocateCantonSeats(G);
  G.mapVer = (G.mapVer || 0) + 1;
  fervorDisplay(G);
  logEvent(G, { kind: 'fusion', importance: 8, canton: a, absorbed: b, oldA: old, oldB: B.name, name: A.name, party: A.gov.president });
}
