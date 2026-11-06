// ============================================================
//  EMPRESAS, SERVICIOS PÚBLICOS Y MERCADOS
//  Toda la producción sale de empresas situadas en las casillas del mapa.
//  Unidades: dinero de las empresas en miles de € (k€); cantidades en las unidades de cada bien.
// ============================================================
'use strict';

const RETURNS = 1;                 // producción proporcional a la plantilla (cada trabajador produce lo mismo)
const MANUF = ['muebles', 'textil', 'maquinaria', 'armamento', 'automovilistica'];
// Centrales eléctricas: cuánto carbón y cuántas máquinas gastan según el modelo energético
const ENERGY_MIX = { fosil: { carbon: 1.25, maquinas: 0.8, em: 2.5 }, mixto: { carbon: 1, maquinas: 1, em: 1.6 }, renovable: { carbon: 0.35, maquinas: 2, em: 0.3 }, nuclear: { carbon: 0.2, maquinas: 1.6, em: 0.2 } };
// Mezcla con la que se produce de verdad: las centrales cambian poco a poco hacia la que manda la ley
function energyMix(G) {
  const law = ENERGY_MIX[G.pol.energia] || ENERGY_MIX.mixto;
  return (G.eco && G.eco.mixNow) || law;
}
function stepEnergyMix(G) {
  const law = ENERGY_MIX[G.pol.energia] || ENERGY_MIX.mixto, m = G.eco.mixNow || (G.eco.mixNow = Object.assign({}, law));
  for (const k in law) m[k] += (law[k] - m[k]) * 0.12;
}
// Empresas que pueden elegir entre varios insumos (la alimentaria: grano, carne o pescado; el pequeño comercio:
// alimentos, ropa o conexión): usan sobre todo el que les sale más barato por trabajador, y cambian poco a poco
function inMixTarget(G, k) {
  const K = FIRM_KINDS[k], px = (G.eco && G.eco.px) || {}, opts = Object.keys(K.inpAny);
  const c = {}; opts.forEach(g => { c[g] = Math.max(1e-9, px[g] || GOODS[g].price) * K.inpAny[g]; });
  const cmin = Math.min(...opts.map(g => c[g])), w = {}; let t = 0;
  opts.forEach(g => { w[g] = Math.pow(cmin / c[g], 4); t += w[g]; });
  opts.forEach(g => { w[g] /= t; });
  return w;
}
const inMix = (G, k) => (G.eco.inMix && G.eco.inMix[k]) || inMixTarget(G, k);
function stepInMix(G) {
  const e = G.eco; e.inMix = e.inMix || {};
  for (const k in FIRM_KINDS) if (FIRM_KINDS[k].inpAny) {
    const t = inMixTarget(G, k), m = e.inMix[k] || (e.inMix[k] = Object.assign({}, t));
    for (const g in t) m[g] += (t[g] - m[g]) * 0.25;
  }
}
// Insumos que gasta cada trabajador de un tipo de empresa (con el modelo energético o el reparto de insumos de ahora)
function inpOf(G, k) {
  const K = FIRM_KINDS[k], o = {};
  if (K.inpAny) { const m = inMix(G, k); for (const g in m) o[g] = K.inpAny[g] * m[g]; return o; }
  if (k === 'electrica') { const mix = energyMix(G); for (const g in K.inp) o[g] = K.inp[g] * (mix[g] || 1); return o; }
  return K.inp || o;
}
// Maquinaria (escala horizontal): el campo, la pesca, los bosques, las canteras y las minas pueden comprar máquinas.
// Cada máquina (hasta una por trabajador) da un 30 %/N más de producción (N: los trabajadores), así que con una por
// trabajador se produce un 30 % más. Las máquinas duran: se desgastan un 4 % cada trimestre. Solo se compran si
// salen a cuenta (lo que dejan de más frente a lo que cuestan y se desgastan), de una en una.
const MECH_KINDS = ['agricultura', 'ganaderia', 'pesca', 'silvicultura', 'cantera', 'minaMetal', 'minaCarbon'];
const MECH_GAIN = 0.3, MECH_DEP = 0.04;
const eqFactor = (f, n) => MECH_KINDS.includes(f.kind) && n > 0 ? 1 + MECH_GAIN * Math.min(1, (f.eq || 0) / n) : 1;
const PUB_WAGE_SHARE = 0.5;        // parte del gasto público de una materia que son sueldos
const LABOR_SHARE_F = 0.7;         // parte del valor añadido que acaba en sueldos

// ---------- utilidades ----------
function hexIndex(G) {
  if (!G._hexIdx) G._hexIdx = new Map(G.map.hexes.map(h => [h.q + ',' + h.r, h]));
  return G._hexIdx;
}
const hexAtG = (G, q, r) => hexIndex(G).get(q + ',' + r);
const hasF = (h, k) => !!(h && h.f && h.f.includes(k));
const isCity = h => hasF(h, 'ciudad') || hasF(h, 'capital');
const isSettlement = h => isCity(h) || hasF(h, 'pueblo');
function firmMap(G) { return new Map(G.firms.map(f => [f.id, f])); }
function staffOf(G) {
  const m = new Map(); G.firms.forEach(f => m.set(f.id, []));
  for (const cz of G.citizens) if (cz.emp && cz.firm && m.has(cz.firm)) m.get(cz.firm).push(cz);
  return m;
}
// Parte de la plantilla que no es el dueño
const workersOf = (f, list) => { const os = ownersOf(f); return os.length ? list.filter(cz => !os.includes(cz.id)) : list; };
function nomRate(G, c) { return (G.pol.nominas || 0) + ((c && c.pol.nominas) || 0); }

// ---------- dónde puede ir cada empresa ----------
// (ci: país al que pertenece la casilla)
function slotRule(kind, h, ci) {
  if (!h || h.c !== (ci ?? h.c) || h.c < 0 || h.t === 'mar') return 0;
  const city = isCity(h);
  switch (kind) {
    case 'agricultura': return h.t === 'hierba' && h.rel !== 'montana' && !hasF(h, 'bosque') && !city ? (hasF(h, 'cultivo') ? 2 : 1) : 0;
    case 'ganaderia': return h.t === 'hierba' && !hasF(h, 'cultivo') && !hasF(h, 'bosque') && !city ? 1 : 0;
    case 'pesca': return h.coast && (hasF(h, 'puerto') || isSettlement(h)) ? (hasF(h, 'puerto') ? 3 : 2) : 0;
    case 'silvicultura': return hasF(h, 'bosque') ? 1 : 0;
    case 'muebles': case 'textil': return hasF(h, 'fabrica') ? 4 : city ? 4 : hasF(h, 'pueblo') ? 1 : 0;
    case 'sanidad': case 'educacion': return city ? 2 : isSettlement(h) ? 1 : 0;
    case 'banco': return city ? 3 : hasF(h, 'pueblo') ? 1 : 0;
    case 'constructora': return city || hasF(h, 'fabrica') ? 2 : hasF(h, 'pueblo') ? 1 : 0;
    case 'cantera': return h.rel === 'montana' ? 2 : h.rel === 'colinas' || h.t === 'roca' ? 1 : 0;
    case 'minaMetal': return hasF(h, 'mina') ? 2 : 0;
    case 'minaCarbon': return hasF(h, 'carbon') ? 2 : 0;
    case 'maquinaria': case 'armamento': return hasF(h, 'fabrica') ? 4 : city ? 4 : hasF(h, 'pueblo') ? 1 : 0;
    case 'electrica': return hasF(h, 'fabrica') ? 2 : hasF(h, 'puerto') || hasF(h, 'carbon') || city ? 1 : hasF(h, 'rio') && !isSettlement(h) ? 1 : 0;
    case 'telecom': return city ? 2 : hasF(h, 'pueblo') ? 1 : 0;
    case 'medios': return city ? 2 : 0;
    case 'gimnasio': return city ? 2 : hasF(h, 'pueblo') ? 1 : 0;
    case 'alimentacion': return hasF(h, 'fabrica') ? 3 : city ? 2 : hasF(h, 'pueblo') ? 1 : hasF(h, 'puerto') ? 1 : 0;
    case 'comercio': return city ? 5 : hasF(h, 'pueblo') ? 2 : 0;
    case 'automovilistica': return hasF(h, 'fabrica') ? 4 : city ? 3 : 0;
    case 'ferroviaria': return city ? 3 : hasF(h, 'pueblo') ? 1 : 0;
  }
  return 0;
}
// Grupos que comparten sitio en una casilla
const SLOT_GROUP = { muebles: 'manuf', textil: 'manuf', maquinaria: 'manuf', armamento: 'manuf', automovilistica: 'manuf' };
// Casillas del cantón donde cabe una empresa de ese tipo (por su regla y por las parcelas libres)
function freeSlots(G, kind, canton, lots) {
  const used = {};
  G.firms.forEach(f => { if (f.q == null || isCenterF(f)) return; const g = SLOT_GROUP[f.kind] || f.kind; const k = f.q + ',' + f.r + ':' + g; used[k] = (used[k] || 0) + 1; });
  const g = SLOT_GROUP[kind] || kind;
  const lu = lots || lotsUsed(G), need = LOTS[kind] || 1;
  return G.map.hexes.filter(h => h.c === (G.ci || 0) && h.k === canton && slotRule(kind, h, G.ci || 0) > (used[h.q + ',' + h.r + ':' + g] || 0) && lotsFree(G, h, lu) >= need);
}
// Lo que la ley de protección natural le quita a pesca, bosques, canteras y minas
function policyFactor(G, f) {
  const prot = (G.pol.proteccionNatural ?? 1) - 1;
  if (f.kind === 'ferroviaria') return f.c != null ? railFactorOf(G, f.c) : 1;   // los trenes necesitan vías
  return { pesca: 1 - prot * 0.12, silvicultura: 1 - prot * 0.15, cantera: 1 - prot * 0.1, minaMetal: 1 - prot * 0.08, minaCarbon: 1 - prot * 0.08 }[f.kind] || 1;
}
// Calidad del sitio: solo sirve a quien funda una empresa para elegir dónde ponerla
function siteFactor(G, f) {
  const h = f.q != null ? hexAtG(G, f.q, f.r) : null, p = G.pol;
  if (!h) return 1;
  const prot = (p.proteccionNatural ?? 1) - 1;
  switch (f.kind) {
    case 'agricultura': return (hasF(h, 'cultivo') ? 1.25 : 1) * (hasF(h, 'rio') ? 1.12 : 1) * (h.rel === 'colinas' ? 0.8 : 1);
    case 'ganaderia': return h.rel === 'llano' ? 1.05 : 0.95;
    case 'pesca': {
      const near = G.map.hexes.filter(s => s.t === 'mar' && s.w === (G.ci || 0) && hasF(s, 'pesca') && HEX.dist(s, h) <= 3).length;
      return clamp(0.75 + near * 0.22, 0.75, 1.6) * (1 - prot * 0.12);
    }
    case 'silvicultura': return 1 - prot * 0.15;
    case 'cantera': return (h.rel === 'montana' ? 1.1 : h.t === 'roca' ? 1 : 0.85) * (1 - prot * 0.1);
    case 'minaMetal': case 'minaCarbon': return 1 - prot * 0.08;
  }
  return 1;
}


// ---------- contratación ----------
// prof: el puesto (si no se dice, el cualificado si vale para él o, si no, el de base)
function setJob(G, cz, f, owner, prof) {
  const K = f.pub != null ? (PUBLIC_CENTERS[f.ctype] || FIRM_KINDS[f.kind]) : FIRM_KINDS[f.kind];
  const sector = K.sector;
  if (!prof) prof = owner ? 'empresario' : defaultJob(f, cz);
  cz.emp = true; cz.firm = f.id; cz.sector = sector; cz.ue = 0; cz.pb = f.pub != null ? 1 : 0;
  if (cz.prof !== prof) { cz.prof = prof; computeIdeology(G, cz, PROFESSIONS[prof], false); }
}
function dropJob(cz) { cz.lastSector = cz.sector || cz.lastSector; cz.emp = false; cz.sector = null; cz.firm = null; cz.pb = 0; }
// Busca personas en paro del cantón; prefiere la formación adecuada
const SKILLED = ['sanidad', 'educacion', 'telecom', 'medios', 'energia'];
function pickUnemployed(pool, n, sector) {
  const want = SKILLED.includes(sector);
  pool.sort((a, b) => (want ? (b.edu - a.edu) * 10 : 0) + (b.lastSector === sector ? 5 : 0) - (a.lastSector === sector ? 5 : 0) + (a.age - b.age) * 0.01);
  const out = [];
  while (out.length < n && pool.length) {
    const i = pool.findIndex(cz => !want || cz.edu >= 2);
    if (i < 0) break;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
function firmName(K, owner) {
  const sn = owner && owner.nm ? surnameOf(owner.nm) : RNG.pick(APELLIDOS);
  return RNG.pick(K.names) + ' ' + sn;
}
function placeName(G, h) {
  if (!h) return '';
  if (h.cn) return h.cn.replace(/^Polígono de /, '');
  const c = G.cantons[h.k]; return c ? c.name : '';
}
function newFirm(G, kind, h, owner, extra) {
  G.nextFirmId = (G.nextFirmId || 0) + 1;
  const K = FIRM_KINDS[kind];
  const f = Object.assign({ id: G.nextFirmId, kind, q: h ? h.q : null, r: h ? h.r : null, c: h ? h.k : extra.c, owner: owner ? owner.id : null, pub: null,
    name: owner ? firmName(K, owner) : K.name, wage: 26, cash: 0, born: G.turn || 0, loss: 0, debt: 0, bk: null, lvl: 1 }, extra || {});
  if (kind === 'agricultura' && !f.product) f.product = RNG.chance(0.3) ? 'tejido' : 'grano';
  G.firms.push(f);
  return f;
}
function newCenter(G, ctype, h, owner) {
  const C = PUBLIC_CENTERS[ctype];
  G.nextFirmId = (G.nextFirmId || 0) + 1;
  const f = { id: G.nextFirmId, kind: C.sector, ctype, q: h.q, r: h.r, c: h.k, owner: null, pub: owner, name: `${C.name} de ${placeName(G, h)}`, wage: PUBLIC_WAGE, cash: 0, born: G.turn || 0, loss: 0 };
  G.firms.push(f);
  return f;
}
// Plantilla máxima (sin contar al dueño): la de nivel 1 multiplicada por el nivel
function firmCap(f) { return f.pub != null && f.ctype ? (f.capX || PUBLIC_CENTERS[f.ctype].cap) : FIRM_KINDS[f.kind].cap * (f.lvl || 1); }
// Empresa pública (produce y vende como cualquier otra, pero es de un gobierno) y servicio público (centros y policía)
const isPE = f => f.pe === 1;
const isCenterF = f => f.pub != null && f.pe !== 1;

// ---------- arranque: empresas y centros públicos coherentes con las leyes ----------
function initFirms(G) {
  const p = G.pol;
  G.firms = []; G.nextFirmId = (G.ci || 0) * 100000;
  // precios mundiales como índice (1 = precio de referencia de cada bien)
  G.world.prices = Object.fromEntries(GOOD_IDS.map(g => [g, 1]));
  initMarkets(G);
  G.eco.prodIdx = Object.fromEntries(SECTORS.map(s => [s.id, 1]));
  const byC = byCanton(G);
  // PIB aproximado para dimensionar los servicios públicos (k€)
  const lfC = byC.map(list => list.filter(inLaborForce));
  const gdpC = G.cantons.map((c, i) => lfC[i].length * (1 - c.unemp0) * 32);
  const gdpN = sum(gdpC);
  const staffCost = PUBLIC_WAGE * 1.1 * (1 + (p.nominas || 0.2));
  const staffFor = (money) => money * PUB_WAGE_SHARE / staffCost;
  G.cantons.forEach((c, i) => {
    const hx = G.map.hexes.filter(h => h.c === (G.ci || 0) && h.k === i && h.t !== 'mar');
    const capitalHex = hexAtG(G, c.cityHex[0], c.cityHex[1]);
    const settlements = hx.filter(isSettlement);
    const popShareC = c.pop / Math.max(1, sum(G.cantons, x => x.pop));
    // --- centros públicos de sanidad y educación (según el gasto de la ley) ---
    for (const area of ['sanidad', 'educacion']) {
      const stateStaff = natApplies(p, area) ? staffFor((p.gasto[area] || 0) / 100 * gdpN) * popShareC : 0;
      const cantStaff = cantApplies(p, area) ? staffFor((c.pol.gasto[area] || 0) / 100 * gdpC[i]) : 0;
      const big = area === 'sanidad' ? 'hospital' : 'universidad', small = area === 'sanidad' ? 'centroSalud' : 'colegio';
      const comp = p.comp[area];
      // quién es dueño de cada tipo: en las competencias compartidas, el Estado los grandes y el cantón los pequeños
      const ownerBig = comp === 'cantonal' ? i : 'estado', ownerSmall = comp === 'nacional' ? 'estado' : i;
      let need = stateStaff + cantStaff;
      const used = new Set();
      if (need >= PUBLIC_CENTERS[big].cap * 0.6 && capitalHex) { newCenter(G, big, capitalHex, ownerBig); need -= PUBLIC_CENTERS[big].cap; used.add(capitalHex); }
      const spots = RNG.shuffle(settlements.slice()).sort((a, b) => (isCity(b) ? 1 : 0) - (isCity(a) ? 1 : 0));
      let k = 0;
      while (need > PUBLIC_CENTERS[small].cap * 0.3 && spots.length) { newCenter(G, small, spots[k % spots.length], ownerSmall); need -= PUBLIC_CENTERS[small].cap; k++; if (k > 12) break; }
    }
    // --- comisarías: del Estado, del cantón o de los dos (según la competencia de seguridad) ---
    {
      const stateStaff = natApplies(p, 'seguridad') ? staffFor((p.gasto.seguridad || 0) / 100 * gdpN) * popShareC : 0;
      const cantStaff = cantApplies(p, 'seguridad') ? staffFor((c.pol.gasto.seguridad || 0) / 100 * gdpC[i]) : 0;
      const spots = [capitalHex].concat(RNG.shuffle(settlements.filter(h => h !== capitalHex)));
      const make = (staffN, owner) => { let k = 0; for (let need = staffN; need > 0.5 && k < 6; need -= PUBLIC_CENTERS.comisaria.cap, k++) { const h = spots[(k + (owner === 'estado' ? 0 : 1)) % spots.length]; if (h) newCenter(G, 'comisaria', h, owner); } };
      make(stateStaff, 'estado'); make(cantStaff, i);
    }
  });
  // --- cuarteles del Estado (con el gasto en defensa), en las ciudades más grandes ---
  {
    const soldiers = staffFor((p.gasto.defensa || 0) / 100 * gdpN);
    const cities = G.cantons.map(c => hexAtG(G, c.cityHex[0], c.cityHex[1])).filter(Boolean).sort((a, b) => (G.cantons[b.k].pop || 0) - (G.cantons[a.k].pop || 0));
    for (let k = 0, need = soldiers; need > 0.5 && k < cities.length; k++, need -= PUBLIC_CENTERS.cuartel.cap) newCenter(G, 'cuartel', cities[k], 'estado');
  }
  // plantilla pública inicial
  staffPublic(G, { gdpN, gdpC, init: true });
  G.works = []; G.forSale = {}; G.hdem = {};
  // --- bancos (al menos uno por cantón) y constructoras ---
  G.cantons.forEach((c, i) => {
    let pool = RNG.shuffle(byC[i].filter(cz => inLaborForce(cz) && !cz.emp));
    const adults = byC[i].length;
    const capitalHex = hexAtG(G, c.cityHex[0], c.cityHex[1]);
    const nBanks = adults > 900 ? 3 : adults > 450 ? 2 : 1;
    for (let k = 0; k < nBanks && pool.length > 4; k++) {
      const slots = freeSlots(G, 'banco', i);
      const slot = k === 0 && slots.includes(capitalHex) ? capitalHex : RNG.pick(slots.filter(isCity).length ? slots.filter(isCity) : slots);
      if (!slot) break;
      const owner = pool.sort((a, b) => b.lvl - a.lvl).shift();
      const f = newFirm(G, 'banco', slot, owner); setJob(G, owner, f, true);
      pool = RNG.shuffle(pool);
      const nb = Math.max(2, Math.ceil(adults / nBanks / CLIENTS_PER_ADMIN));
      f.lvl = clamp(Math.ceil(nb / FIRM_KINDS.banco.cap), 1, MAX_LVL);
      pool.splice(0, nb).forEach(cz => setJob(G, cz, f, false));
    }
    const nCons = Math.max(1, Math.round(lfC[i].length * 0.03 / 7));
    for (let k = 0; k < nCons && pool.length > 4; k++) {
      const slot = RNG.pick(freeSlots(G, 'constructora', i)); if (!slot) break;
      const owner = pool.sort((a, b) => b.lvl - a.lvl).shift();
      const f = newFirm(G, 'constructora', slot, owner, { lvl: 2 }); setJob(G, owner, f, true);
      pool = RNG.shuffle(pool);
      pool.splice(0, RNG.int(3, 8)).forEach(cz => setJob(G, cz, f, false));
    }
  });
  G.cantons.forEach((c, i) => {
    const pool = RNG.shuffle(byC[i].filter(cz => inLaborForce(cz) && !cz.emp));
    // alguna clínica y algún colegio privado en los cantones grandes
    if (c.pop > 400 && pool.length > 6) for (const kind of ['sanidad', 'educacion']) {
      const slot = freeSlots(G, kind, i).find(isCity); if (!slot || pool.length < 5) continue;
      const owner = pool.sort((a, b) => b.lvl - a.lvl).shift();
      const f = newFirm(G, kind, slot, owner); setJob(G, owner, f, true);
      pickUnemployed(pool, RNG.int(3, FIRM_KINDS[kind].cap), kind).forEach(cz => setJob(G, cz, f, false));
    }
  });
  // (las empresas que producen bienes se reparten después, con todos los países: worldGoodsFirms)
  G._byC = byC; G._lfC = lfC;
}
// Después de las empresas de bienes: quien no encuentra trabajo en su cantón, ideología de la nueva profesión
// y primeras obras de las constructoras
function finishInitFirms(G) {
  const byC = byCanton(G), lfC = byC.map(list => list.filter(inLaborForce));
  // quien no encuentra trabajo en un cantón saturado va a diario a trabajar a otro con plazas libres
  const target = G.cantons.map((c, i) => Math.round(lfC[i].length * c.unemp0));
  const idle = G.cantons.map((c, i) => RNG.shuffle(byC[i].filter(cz => inLaborForce(cz) && !cz.emp)));
  const staffNow = staffOf(G);
  const spare = RNG.shuffle(G.firms.filter(f => f.pub == null && !['policia', 'banco', 'constructora', 'electrica', 'telecom', 'medios'].includes(f.kind)).map(f => ({ f, room: firmCap(f) + 1 - (staffNow.get(f.id) || []).length })).filter(x => x.room > 0));
  idle.forEach((list, i) => {
    let extra = list.length - target[i];
    for (const sp of spare) {
      if (extra <= 0) break;
      while (sp.room > 0 && extra > 0) { setJob(G, list.pop(), sp.f, false); sp.room--; extra--; }
    }
  });
  // al arrancar, la ideología de cada trabajador sale ya de su nueva profesión
  for (const cz of G.citizens) if (cz.emp) computeIdeology(G, cz, PROFESSIONS[cz.prof], true);
  // las constructoras empiezan con alguna promoción de viviendas en marcha
  const lu = lotsUsed(G);
  G.firms.filter(f => f.kind === 'constructora').forEach(f => {
    f.staffN = G.citizens.filter(cz => cz.firm === f.id).length;
    const w = startHousing(G, f, lu, true); if (w) w.done = Math.round(w.need * RNG.range(0.1, 0.6));
    else { const m = (f.staffN || 3) * 25; newWork(G, { by: f.id, t: 'civil', c: f.c, need: m / CIVIL_VALUE, val: m, paid: true }); }
  });
}
// Empresas de bienes de todos los países: cada país planifica lo que necesita; lo que un país no puede
// producir (no tiene dónde: minas, costa, bosques…) lo producen de más los países que sí pueden, para venderlo
function worldGoodsFirms(W) {
  const plans = W.map(S => goodsPlan(S, S._byC, S._lfC));
  const KINDS = Object.keys(FIRM_KINDS).filter(k => FIRM_KINDS[k].out);
  const extra = W.map(() => ({}));
  for (const k of KINDS) {
    if (FIRM_KINDS[k].out && Object.keys(FIRM_KINDS[k].out).every(g => GOODS[g].local)) continue;
    const room = plans.map(pl => sum(pl.seed, r => r[k]));
    const lack = plans.reduce((acc, pl, i) => acc + (room[i] > 1e-3 ? 0 : (pl.wk[k] || 0)), 0);
    const R = sum(room.filter(r => r > 1e-3));
    if (lack <= 0 || R <= 0) continue;
    plans.forEach((pl, i) => { if (room[i] > 1e-3) extra[i][k] = lack * room[i] / R; });
  }
  W.forEach((S, i) => { goodsPlace(S, plans[i], extra[i]); finishInitFirms(S); delete S._byC; delete S._lfC; });
}
// Al arrancar, con el primer mercado mundial ya hecho: cada empresa de bienes ajusta su plantilla a lo
// que de verdad se pide de lo suyo en el mundo (sobra comida y faltan máquinas, por ejemplo); las que
// tienen que crecer suben de nivel y, si hace falta, se abren empresas nuevas donde haya sitio.
function rebalanceInit(W, pw) {
  pw = pw || 0.8;
  // países a los que puede llegar cada producto desde cada país (la electricidad, solo por tierra)
  const mk = marketTopo(W[0]);
  const nodesOf = S => S.cantons.map((c, i) => marketNode(S, i)).filter(x => x != null);
  const reach = (A, B, land) => { const D = land ? mk.distLand : mk.dist; for (const a of nodesOf(A)) for (const b of nodesOf(B)) if (isFinite(D[a][b])) return true; return false; };
  const RS = W.map(A => ({ sea: W.filter(B => reach(A, B, false)), land: W.filter(B => reach(A, B, true)) }));
  const ratio = (S, g) => {
    const L = GOODS[g].local ? [S] : RS[W.indexOf(S)][GOODS[g].overseas === false ? 'land' : 'sea'];
    const q = sum(L, T => (T.eco.potQ || {})[g] || 0), d = sum(L, T => (T.eco.potD || {})[g] || 0);
    if (q <= 0) return d > 0 ? 2 : 1;
    return clamp(Math.pow(d / q, pw), 0.55, 2);
  };
  const goodOf = f => f.product || Object.keys(FIRM_KINDS[f.kind].out)[0];
  const isGoods = f => f.pub == null && FIRM_KINDS[f.kind].out && f.kind !== 'constructora';
  const plans = W.map(S => {
    const staff = staffOf(S);
    return S.firms.filter(isGoods).map(f => {
      const ws = workersOf(f, staff.get(f.id) || []);
      return { f, ws, want: Math.max(1, Math.round(ws.length * ratio(S, goodOf(f)))) };
    });
  });
  // primero se despide donde sobra
  plans.forEach(list => list.forEach(x => { if (x.want < x.ws.length) RNG.shuffle(x.ws).slice(0, x.ws.length - x.want).forEach(dropJob); }));
  // luego se contrata donde falta (en el cantón o, si no hay nadie, en el que más paro tenga)
  W.forEach((S, si) => {
    // (se deja en paro a la parte normal de cada cantón)
    const pools = byCanton(S).map((list, i) => { const lf = list.filter(inLaborForce), idle = RNG.shuffle(lf.filter(cz => !cz.emp)); return idle.slice(0, Math.max(0, idle.length - Math.round(lf.length * (S.cantons[i].unemp0 || 0.05)))); });
    const big = () => pools.reduce((a, b) => b.length > a.length ? b : a, pools[0]);
    const lu = lotsUsed(S);
    const need = {};
    plans[si].sort((a, b) => (b.want - b.ws.length) - (a.want - a.ws.length)).forEach(x => {
      let n = x.want - x.ws.length; if (n <= 0) return;
      const K = FIRM_KINDS[x.f.kind];
      const room = K.cap * (K.maxLvl || MAX_LVL) - x.ws.length;
      const m = Math.min(n, Math.max(0, room));
      const pool = pools[x.f.c].length > 2 ? pools[x.f.c] : big();
      const got = pickUnemployed(pool, m, K.sector);
      got.forEach(cz => setJob(S, cz, x.f, false));
      x.f.lvl = Math.max(x.f.lvl || 1, Math.ceil((x.ws.length + got.length) / K.cap));
      n -= got.length;
      if (n > 0) need[x.f.kind] = (need[x.f.kind] || 0) + n;
    });
    // lo que se pide y nadie a su alcance produce (un gimnasio en un país sin ninguno, armas…)
    for (const k in FIRM_KINDS) {
      const K = FIRM_KINDS[k]; if (!K.out || k === 'constructora') continue;
      const g = Object.keys(K.out)[0];
      const L = GOODS[g].local ? [S] : RS[si][GOODS[g].overseas === false ? 'land' : 'sea'];
      if (L.some(T => T.firms.some(f => f.kind === k))) continue;
      const d = (S.eco.potD || {})[g] || 0;
      if (d > 0) need[k] = Math.max(need[k] || 0, Math.ceil(d / K.out[g]) + 1);
    }
    // empresas nuevas para lo que no cabe en las que hay
    for (const k in need) {
      let n = need[k], guard = 0;
      const K = FIRM_KINDS[k];
      while ((n >= 2 || (n >= 1 && !S.firms.some(f => f.kind === k))) && guard++ < 20) {
        const ci = pools.map((p, i) => i).sort((a, b) => pools[b].length - pools[a].length).find(i => pools[i].length > 3 && freeSlots(S, k, i, lu).length);
        if (ci == null) break;
        const slot = freeSlots(S, k, ci, lu).sort((a, b) => slotRule(k, b, S.ci || 0) - slotRule(k, a, S.ci || 0))[0];
        const owner = pools[ci].sort((a, b) => b.lvl - a.lvl).shift();
        const lvl = Math.min(K.maxLvl || MAX_LVL, Math.max(1, Math.ceil((n - 1) / K.cap)));
        const f = newFirm(S, k, slot, owner, { lvl }); setJob(S, owner, f, true);
        const key = slot.q + ',' + slot.r; lu.set(key, (lu.get(key) || 0) + (LOTS[k] || 1));
        const got = pickUnemployed(pools[ci], Math.min(n - 1, K.cap * lvl), K.sector);
        got.forEach(cz => setJob(S, cz, f, false));
        f.lvl = Math.max(1, Math.ceil(got.length / K.cap));
        n -= got.length + 1;
      }
    }
  });
}
// Sueldos de partida: la parte habitual del valor que crea cada trabajador (vendiendo todo a precios de referencia)
// (cada persona cobra el sueldo base de su empresa por lo que pesa su puesto: los cualificados, más)
function initWages(G, keepCash) {
  const staff = staffOf(G);
  G.firms.forEach(f => {
    const ws = workersOf(f, staff.get(f.id) || []);
    if (f.pub != null) { initPersonalWages(G, f, ws, 0); return; }
    const n = Math.max(1, ws.length), m = ws.length ? sum(ws, wageMult) : 1;
    f.wage = clamp(LABOR_SHARE_F * (f.vaY || 0) / m, 10, 120);
    initPersonalWages(G, f, ws, f.wage);
    f.wage = ws.length ? avg(ws, cz => cz.wg) : f.wage;
    // caja de partida (los bancos, una vez hechas sus cuentas, conservan la suya)
    if (!(keepCash && f.kind === 'banco')) f.cash = 0.3 * f.wage * n * QF * 4;
  });
}
// Empresas de bienes al empezar: cuántos trabajadores hacen falta de cada tipo para la cesta de la
// población (a un nivel de vida que cuadre con los puestos que hay), las compras públicas y las materias
// primas de las fábricas; se reparten entre cantones según dónde hay sitio para cada tipo de empresa.
function goodsPlan(G, byC, lfC) {
  const p = G.pol, nC = G.cantons.length;
  const mix = ENERGY_MIX[p.energia] || ENERGY_MIX.mixto;
  const KINDS = Object.keys(FIRM_KINDS).filter(k => FIRM_KINDS[k].out);
  const jobs = G.cantons.map((c, i) => Math.max(0, Math.round(lfC[i].length * (1 - c.unemp0)) - lfC[i].filter(cz => cz.emp).length - 1));
  const J = sum(jobs);
  const pop = sum(G.cantons, c => c.pop || 0);
  const agents = G.firms.filter(f => f.ctype === 'comisaria' || f.ctype === 'cuartel').length * 10;
  // compras públicas (con un PIB aproximado)
  const gdpY = J * 32 * 1.4;
  const pub = {}; GOOD_IDS.forEach(g => pub[g] = 0);
  for (const area in PUBLIC_BASKET) {
    const pct = area === 'defensa' ? p.gasto.defensa || 0 : (p.gasto[area] || 0) + (cantApplies(p, area) ? avg(G.cantons, c => c.pol.gasto[area] || 0) : 0);
    const money = pct / 100 * gdpY * (1 - PUB_WAGE_SHARE) * QF;
    for (const g in PUBLIC_BASKET[area]) if (g !== 'armas') pub[g] += money * PUBLIC_BASKET[area][g] / GOODS[g].price;
  }
  pub.armas += agents * ARMS_PER_AGENT;
  // parte de la gente que puede coger el tren (su ciudad unida con otras)
  const railCov = sum(G.cantons.map((c, i) => (c.pop || 0) * railAccess(G, i))) / Math.max(1, pop);
  // trabajadores de cada tipo para un nivel de vida (fraccionario) de toda la población
  const plan = wl => {
    // (los hogares no están todos en el nivel medio: se reparten alrededor, y los de arriba piden otras cosas)
    const wts = range(10).map(l => Math.exp(-Math.pow(l + 1 - wl, 2) / (2 * 1.4 * 1.4))), wt = sum(wts);
    const per = range(10).map(l => wts[l] > 0.01 ? needsPerCapita(l + 1, p.armasCiviles) : null);
    const want = {}; GOOD_IDS.forEach(g => want[g] = sum(range(10), l => per[l] ? per[l][g] * wts[l] / wt : 0) * pop + pub[g]);
    // donde no hay tren, la gente se mueve en coche: los viajes que no se pueden dar pasan a ser coches
    if (want.viajes > 0) { const sh = want.viajes * (1 - railCov); want.viajes -= sh; want.coches += sh * TRANSPORT_NEED.goods.viajes / TRANSPORT_NEED.goods.coches; }
    // obras: madera y piedra de las constructoras
    const cw = sum(G.firms.filter(f => f.kind === 'constructora'), f => Math.max(0, (f.staffN || G.citizens.filter(z => z.firm === f.id).length) - 1));
    want.madera += cw * HOUSING.maderaPerWork; want.piedra += cw * HOUSING.piedraPerWork;
    let wk = {};
    for (let pass = 0; pass < 4; pass++) {
      const tot = Object.assign({}, want);
      wk = {};
      // las materias primas que piden las fábricas
      const add = (k, w) => { wk[k] = (wk[k] || 0) + w; const K = FIRM_KINDS[k]; const ki = k === 'electrica' ? null : inpOf(G, k); for (const g in (K.inp || K.inpAny || {})) tot[g] += (ki ? ki[g] : K.inp[g] * (mix[g] || 1)) * w; for (const g in (K.boost || {})) if (K.out) tot[g] += K.boost[g] * w; };
      const order = ['comercio', 'medios', 'gimnasio', 'ferroviaria', 'telecom', 'alimentacion', 'textil', 'muebles', 'automovilistica', 'maquinaria', 'armamento', 'electrica', 'ganaderia', 'pesca', 'agricultura', 'silvicultura', 'cantera', 'minaMetal', 'minaCarbon'];
      for (const k of order) {
        const K = FIRM_KINDS[k];
        if (k === 'agricultura') {
          const tej = Math.max(0, tot.tejido - (wk.ganaderia || 0) * FIRM_KINDS.ganaderia.out.tejido);
          add('agricultura', tot.grano / K.out.grano + tej / K.alt.tejido);
          wk._tej = tej / K.alt.tejido;
          continue;
        }
        const g = Object.keys(K.out)[0];
        add(k, tot[g] / K.out[g]);
      }
    }
    return wk;
  };
  const need = w => sum(KINDS, k => w[k] || 0);
  // nivel de vida medio que podrán pagar los hogares: lo que compran es algo más de la mitad del valor
  // que crean todos los que trabajan (el resto: impuestos que van a sueldos públicos, ahorro, IVA…)
  const eqN = sum(G.cantons, c => c.pop || 0) * 0.88;
  const employed = J + G.citizens.filter(cz => cz.emp).length;
  const perEq = 0.6 * employed * 8 / Math.max(1, eqN);
  let lo = 1;
  for (let l = 1; l < 10; l++) if (BASKET_REF[l] <= perEq) lo = l + 1; else { lo = l + (perEq - BASKET_REF[l - 1]) / (BASKET_REF[l] - BASKET_REF[l - 1]); break; }
  lo = clamp(lo, 1, 10);
  const wk = plan(lo);
  G.eco.initLevel = lo;
  // sitio para cada tipo de empresa en cada cantón (lo no comerciable por mar, cerca de quien lo usa)
  const seed = G.cantons.map((c, i) => Object.fromEntries(KINDS.map(k => {
    const room = sum(G.map.hexes.filter(h => h.c === (G.ci || 0) && h.k === i), h => slotRule(k, h, G.ci || 0));
    const local = ['electrica', 'telecom', 'medios', 'gimnasio', 'comercio', 'ferroviaria'].includes(k) ? (c.pop || 1) / pop * nC : 1;
    // (las compañías ferroviarias, donde hay tren)
    const rail = k === 'ferroviaria' ? (railFactorOf(G, i) >= 0.5 ? railFactorOf(G, i) : 0.02) : 1;
    return [k, room * local * rail + 1e-6];
  })));
  return { wk, seed, jobs, J, KINDS, byC, lfC };
}
function goodsPlace(G, pl, extra) {
  const { seed, jobs, J, KINDS, byC, lfC } = pl;
  const wk = Object.assign({}, pl.wk);
  for (const k in extra || {}) wk[k] = (wk[k] || 0) + extra[k];
  const lu = lotsUsed(G);
  // los tipos de empresa que no caben en ningún sitio se quedan fuera (lo suyo se importará)
  const feasible = KINDS.filter(k => sum(seed, r => r[k]) > 1e-3);
  const totF = sum(feasible, k => wk[k] || 0);
  const colT = Object.fromEntries(feasible.map(k => [k, (wk[k] || 0) * J / Math.max(1, totF)]));
  // reparto con filas (puestos de cada cantón) y columnas (trabajadores de cada tipo) cuadradas
  const x = seed.map(r => Object.fromEntries(feasible.map(k => [k, r[k]])));
  for (let it = 0; it < 60; it++) {
    feasible.forEach(k => { const col = sum(x, r => r[k]); if (col > 0) x.forEach(r => { r[k] *= colT[k] / col; }); });
    x.forEach((r, i) => { const row = sum(feasible, k => r[k]); if (row > 0) feasible.forEach(k => { r[k] *= jobs[i] / row; }); });
  }
  const tejShare = (wk._tej || 0) / Math.max(1e-9, wk.agricultura || 1);
  const pools = byC.map(list => RNG.shuffle(list.filter(cz => inLaborForce(cz) && !cz.emp)));
  const left = {};
  // añade gente a una empresa (subiéndola de nivel si hace falta)
  const grow = (f, m, pool) => {
    const K = FIRM_KINDS[f.kind];
    m = Math.min(m, K.cap * (K.maxLvl || MAX_LVL) - (f.nW || 0));
    if (m <= 0) return 0;
    const ws = pickUnemployed(pool, m, K.sector); ws.forEach(cz => setJob(G, cz, f, false));
    f.nW = (f.nW || 0) + ws.length; f.lvl = Math.max(f.lvl || 1, Math.ceil(f.nW / K.cap));
    return ws.length;
  };
  G.cantons.forEach((c, i) => {
    const pool = pools[i];
    // primero lo que más gente necesita
    for (const k of feasible.slice().sort((a, b) => x[i][b] - x[i][a])) {
      let n = Math.round(x[i][k]);
      const K = FIRM_KINDS[k];
      let guard = 0;
      while (n >= 2 && pool.length > 2 && guard++ < 60) {
        const slots = freeSlots(G, k, i, lu);
        if (slots.length) {
          const slot = slots.sort((a, b) => slotRule(k, b, G.ci || 0) - slotRule(k, a, G.ci || 0))[0];
          const lvl = Math.min(Math.ceil(n / K.cap), K.maxLvl || MAX_LVL, RNG.weighted([1, 2, 3, 4, 5], v => [3, 4, 3, 1.5, 0.7][v - 1]));
          const m = Math.min(n - 1, K.cap * lvl, pool.length - 1);
          const owner = pool.sort((a, b) => b.lvl - a.lvl).shift();
          const f = newFirm(G, k, slot, owner, { lvl: Math.max(1, Math.ceil(m / K.cap)), product: k === 'agricultura' ? (RNG.chance(tejShare) ? 'tejido' : 'grano') : undefined });
          setJob(G, owner, f, true);
          const key = slot.q + ',' + slot.r; lu.set(key, (lu.get(key) || 0) + (LOTS[k] || 1));
          n -= grow(f, m, pool) + 1;
        } else {
          // sin sitio para otra: crecen las que ya hay en el cantón
          const fs = G.firms.filter(f => f.kind === k && f.c === i);
          if (!fs.length) break;
          const f = fs.sort((a, b) => (a.nW || 0) - (b.nW || 0))[0];
          const got = grow(f, Math.min(n, K.cap), pool); if (!got) break;
          n -= got;
        }
      }
      if (n > 1) left[k] = (left[k] || 0) + n;
    }
  });
  // lo que no ha cabido en su cantón: las empresas de ese tipo de otros cantones crecen y contratan
  // (con gente de donde más paro queda, que va a trabajar a diario)
  for (const k in left) {
    let n = left[k];
    const fs = G.firms.filter(f => f.kind === k);
    let guard = 0;
    while (n >= 1 && fs.length && guard++ < 80) {
      const pool = pools.reduce((a, b) => b.length > a.length ? b : a, pools[0]);
      if (pool.length < 3) break;
      const f = fs.sort((a, b) => (a.nW || 0) - (b.nW || 0))[0];
      const got = grow(f, Math.min(n, FIRM_KINDS[k].cap), pool); if (!got) break;
      n -= got;
    }
  }
  // quien aún sobra (por falta de sitio para algún tipo de empresa) entra en las empresas de bienes de su
  // cantón, a partes según lo que pesa cada tipo allí
  G.cantons.forEach((c, i) => {
    let extra = pools[i].length - Math.round(lfC[i].length * c.unemp0);
    const fs = G.firms.filter(f => f.c === i && f.nW != null);
    let guard = 0;
    while (extra > 0 && fs.length && guard++ < 200) {
      const f = RNG.weighted(fs, f => (x[i][f.kind] || 0.01) / Math.max(1, f.nW));
      const got = grow(f, Math.min(extra, 2), pools[i]); if (!got) break;
      extra -= got;
    }
  });
  G.firms.forEach(f => { delete f.nW; });
}

// ---------- plantilla pública según el presupuesto ----------
function staffPublic(G, opts = {}) {
  const p = G.pol, e = G.eco;
  const gdpN = opts.gdpN || (e.gdpTrend || e.gdp || 0) * 1e6;
  const gdpC = opts.gdpC || G.cantons.map(c => (c.stats.gdp || 0) * 1e6);
  const staffCost = PUBLIC_WAGE * 1.1 * (1 + (p.nominas || 0.2));
  const staff = staffOf(G);
  const byC = byCanton(G);
  const pools = byC.map(list => list.filter(cz => inLaborForce(cz) && !cz.emp));
  // los centros cambian de manos si la competencia se mueve
  G.firms.forEach(f => {
    if (f.pub == null || f.pe || (PUBLIC_CENTERS[f.ctype] || {}).stateOnly) return;
    const area = PUBLIC_CENTERS[f.ctype] ? PUBLIC_CENTERS[f.ctype].sector : FIRM_KINDS[f.kind].sector;
    if (f.pub === 'estado' && !natApplies(p, area)) f.pub = f.c;
    else if (f.pub !== 'estado' && !cantApplies(p, area)) f.pub = 'estado';
  });
  // cada centro cobra de una partida: la de su materia (los cuarteles, de defensa)
  const budgetOf = f => { const C = PUBLIC_CENTERS[f.ctype]; return C ? C.budget || C.sector : FIRM_KINDS[f.kind].sector; };
  // (para el panel de centros: a cuánta gente paga el presupuesto de cada gobierno y materia, y cuánto se llevan
  // los centros con plazas fijadas)
  e.pubBud = {};
  for (const area of ['sanidad', 'educacion', 'seguridad', 'defensa']) {
    const units = G.firms.filter(f => isCenterF(f) && !f.obra && budgetOf(f) === area);
    const groups = {};
    units.forEach(f => { (groups[f.pub] = groups[f.pub] || []).push(f); });
    for (const owner in groups) {
      const list = groups[owner];
      const money = area === 'defensa' ? (owner === 'estado' ? (p.gasto.defensa || 0) / 100 * gdpN : 0)
        : owner === 'estado' ? (natApplies(p, area) ? (p.gasto[area] || 0) / 100 * gdpN : 0)
        : (cantApplies(p, area) ? (G.cantons[+owner].pol.gasto[area] || 0) / 100 * gdpC[+owner] : 0);
      let budget = money * PUB_WAGE_SHARE / staffCost;
      // los centros con plazas fijadas por su gobierno se llevan primero lo suyo (según el sueldo que pagan);
      // si se pasan del presupuesto, el exceso se paga aparte (más gasto, más déficit)
      const fixed = list.filter(f => f.plazas != null);
      const units = f => Math.min(firmCap(f), f.plazas) * centerWage(G, f, staffSpec(f).q || staffSpec(f).base) / Math.max(1, publicWage(G, staffSpec(f).q || staffSpec(f).base));
      const used = sum(fixed, units);
      if (!opts.init && used > budget) {
        const over = (used - budget) * staffCost * QF / 1e6;
        if (owner === 'estado') e.centersOverQ = (e.centersOverQ || 0) + over; else G.cantons[+owner].centersOverQ = (G.cantons[+owner].centersOverQ || 0) + over;
      }
      e.pubBud[owner + '_' + area] = { b: Math.round(budget * 10) / 10, u: Math.round(used * 10) / 10, sc: Math.round(staffCost * 100) / 100 };
      budget = Math.max(0, budget - used);
      // policía estatal: se reparte por población; centros: según su capacidad
      const weight = f => f.plazas != null ? 0 : f.kind === 'policia' ? G.cantons[f.c].pop : firmCap(f);
      const wsum = sum(list, weight);
      list.forEach(f => {
        // (si el centro paga un sueldo propio, el mismo dinero da para más o menos gente)
        const ratio = f.pay > 0 ? centerWage(G, f, staffSpec(f).q || staffSpec(f).base) / Math.max(1e-6, publicWage(G, staffSpec(f).q || staffSpec(f).base)) : 1;
        const target = f.plazas != null ? Math.min(firmCap(f), f.plazas) : Math.min(firmCap(f), Math.round(budget * weight(f) / Math.max(1, wsum) / ratio));
        f.target = target;
        const cur = staff.get(f.id) || [];
        const step = opts.init ? 1e9 : Math.max(1, Math.round(firmCap(f) * 0.25));
        if (opts.init) {
          if (cur.length > target) RNG.shuffle(cur).slice(0, cur.length - target).forEach(dropJob);
          else if (cur.length < target) pickUnemployed(pools[f.c], target - cur.length, area === 'defensa' ? 'seguridad' : area).forEach(cz => setJob(G, cz, f, false));
          return;
        }
        // la Administración despide si le sobra gente (primero a los no cualificados) y publica ofertas
        // con el sueldo público si le falta
        const sp = staffSpec(f);
        if (cur.length > target) {
          RNG.shuffle(cur).sort((a, b) => (a.prof === sp.q) - (b.prof === sp.q)).slice(0, Math.min(step, cur.length - target)).forEach(cz => { dropJob(cz); cz.ue = 0; });
          f.vac = [];
        } else {
          const open = Math.min(step * 2, target - cur.length);
          let Q = cur.filter(cz => cz.prof === sp.q).length;
          const vac = [];
          for (let i = 0; i < open; i++) {
            const p = sp.q && Q < sp.min * (cur.length + i + 1) - 1e-9 ? sp.q : sp.base;
            if (p === sp.q) Q++;
            vac.push({ p, w: centerWage(G, f, p), t: 0, k: p === sp.q ? 'req' : 'base', pub: 1 });
          }
          f.vac = vac;
        }
      });
    }
  }
}

// ---------- producción, mercados y cuentas del turno ----------
// 1) cada empresa calcula lo que producirá con su plantilla y pide sus materias primas;
// 2) hogares, Administraciones y empresas mandan sus órdenes de compra a su cantón;
// 3) los mercados se reparten producto a producto (primero las materias primas), con su transporte y
//    su comercio exterior, y los precios se ajustan;
// 4) cada uno paga lo que ha conseguido y cada empresa cobra lo que ha vendido.
// opts.init: solo calcula (no mueve cajas ni obras, no cobra a los hogares); opts.hold: no mueve los precios;
// opts.full: cuenta como vendido todo lo producido (para fijar los sueldos de partida)
// Un país solo (al preparar la partida): plan, mercado y cuentas
function produce(G, opts = {}) { worldProduce([G], opts); }
// Todos los países a la vez: cada uno planifica, se reparten los mercados mundiales y cada uno hace sus cuentas
function worldProduce(W, opts = {}) {
  W.forEach(S => producePlan(S, opts));
  worldMarkets(W, opts);
  W.forEach(S => produceSettle(S, opts));
}
function producePlan(G, opts = {}) {
  const e = G.eco, p = G.pol;
  const staff = staffOf(G);
  const books = bankBooks(G);
  const worksById = new Map((G.works || []).map(w => [w.id, w]));
  const minWage = (p.salarioMin || 0.45) * (e.avgWage || 26);
  const nC = G.cantons.length;
  const mix = energyMix(G), inps = {};
  if (!e.px) initMarkets(G);
  G.cantons.forEach(c => { c.staff = { sanidad: 0, educacion: 0, seguridad: 0, sanidadPub: 0, educacionPub: 0 }; c.firmVA = 0; c.firmProfit = 0; c.privDemand = { sanidad: 0, educacion: 0 }; c.agents = 0; });
  let barracks = 0;
  // órdenes de compra: D[g][c] y quién las ha puesto (para cobrarles luego)
  const D = Object.fromEntries(GOOD_IDS.map(g => [g, new Array(nC).fill(0)]));
  const order = (i, g, q) => { if (q > 0 && i != null && D[g][i] != null) D[g][i] += q; };
  // 1) plan de cada empresa: cuánto producirá (por turno) y qué materias primas y mejoras pide
  for (const f of G.firms) {
    const list = staff.get(f.id) || [], ws = workersOf(f, list), n = ws.length;
    f.staffN = list.length;
    const c = G.cantons[f.c];
    const sector = PUBLIC_CENTERS[f.ctype] ? PUBLIC_CENTERS[f.ctype].sector : FIRM_KINDS[f.kind].sector;
    f.sector = sector;
    if (c && c.staff[sector] !== undefined) {
      // los soldados de un cuartel ayudan algo a la seguridad de su cantón y algo a la de todo el país
      if (f.ctype === 'cuartel') { c.staff.seguridad += list.length * 0.1; barracks += list.length * 0.15; }
      else c.staff[sector] += list.length;
      if (isCenterF(f) && sector !== 'seguridad') c.staff[sector + 'Pub'] += list.length;
    }
    if (f.ctype === 'comisaria' || f.ctype === 'cuartel') c.agents += list.length;
    f.q_out = {}; f.q_in = {}; f._plan = null; f._any = null; f._inv = 0; f._ord = {}; f.prodF = 1; f.boostF = 1; f._boost = {}; f._fx = null;
    const K = FIRM_KINDS[f.kind];
    if (f.obra || !K || isCenterF(f)) continue;
    if (f.kind === 'constructora') {
      // obra que puede hacer este turno, repartida entre sus encargos; pide madera y piedra
      f.alloc = workShare(G, f).map(([w, a]) => [w.id, a]);
      const wq = sum(f.alloc, x => x[1]);
      f._ord.madera = wq * HOUSING.maderaPerWork; f._ord.piedra = wq * HOUSING.piedraPerWork;
      for (const g in f._ord) order(f.c, g, f._ord[g]);
      continue;
    }
    // mejoras: compra electricidad o conexión si le sale a cuenta (más producción por trabajador)
    if (K.boost && n > 0) {
      const outVal = K.out ? sum(Object.entries(K.out), ([g, r]) => r * localPrice(G, f.c, g)) : (f.revY || 0) / 4 / Math.max(1, n);
      for (const b in K.boost) {
        const cost = K.boost[b] * localPrice(G, f.c, b);
        if (cost < BOOST_GAIN[b] * Math.max(0.5, outVal) * 0.8) { f._boost[b] = K.boost[b] * n * levelF(f.lvl); f._ord[b] = (f._ord[b] || 0) + f._boost[b]; }
      }
    }
    if (K.out || K.alt) {
      const shock = 1 + (e.shock || 0) + ((e.sectorShock || {})[sector] || 0) + ((c.shock || {})[sector] || 0) + ((c.shock || {}).all || 0);
      // cada trabajador produce lo mismo; cada nivel suma un 1 % (y gasta un 1 % más de insumos)
      f.qF = qualFactor(f, ws);
      f.eqF = eqFactor(f, n);
      const k = n * levelF(f.lvl) * f.qF * f.eqF * policyFactor(G, f) * (e.prodIdx[sector] || 1) * Math.max(0.1, shock);
      const rates = f.kind === 'agricultura' && f.product === 'tejido' ? K.alt : K.out;
      f._plan = {}; for (const g in rates) f._plan[g] = rates[g] * k;
      const ki = inps[f.kind] || (inps[f.kind] = inpOf(G, f.kind));
      for (const g in ki) f._ord[g] = (f._ord[g] || 0) + ki[g] * k;
      if (K.inpAny) f._any = inMix(G, f.kind);
      // máquinas nuevas que ha decidido comprar (es inversión: no frena la producción si no llegan)
      if (f.invQ > 0) { f._inv = f.invQ; f._ord.maquinas = (f._ord.maquinas || 0) + f.invQ; }
    }
    for (const g in f._ord) order(f.c, g, f._ord[g]);
  }
  // los soldados que no cuentan en su cantón se reparten por población
  const popT = Math.max(1, sum(G.cantons, c => c.pop || 0));
  G.cantons.forEach(c => { c.staff.seguridad += barracks * (c.pop || 0) / popT; });
  // 2) órdenes de los hogares (su cesta) y de las Administraciones (armas de la policía y compras públicas)
  if (!G.cantons.some(c => c.hhDemand)) householdDemand(G, null);
  G.cantons.forEach((c, i) => { const hh = c.hhDemand || {}; GOOD_IDS.forEach(g => order(i, g, hh[g] || 0)); });
  const pubOrd = G.cantons.map(() => ({}));
  const socialCash = new Array(nC).fill(0);
  {
    const gdpN = (e.gdpTrend || e.gdp || 0) * 1e6, sb = e.spendingBreakdown || {};
    G.cantons.forEach((c, i) => {
      if (c.merged) return;
      const share = (c.pop || 0) / popT, gdpC = (c.stats.gdp || 0) * 1e6, cs = (c.budget && c.budget.spend) || {};
      pubOrd[i].armas = c.agents * ARMS_PER_AGENT;
      const buy = (basket, money) => { for (const g in basket) if (g !== 'armas') pubOrd[i][g] = (pubOrd[i][g] || 0) + money * basket[g] / localPrice(G, i, g); };
      for (const area of ['sanidad', 'educacion', 'seguridad', 'defensa']) {
        let money = area === 'defensa' ? (p.gasto.defensa || 0) / 100 * gdpN * share
          : (natApplies(p, area) ? (p.gasto[area] || 0) / 100 * gdpN * share : 0) + (cantApplies(p, area) ? (c.pol.gasto[area] || 0) / 100 * gdpC : 0);
        // lo que no son sueldos, lo de este turno (las armas de comisarías y cuarteles ya se cuentan por agente)
        buy(PUBLIC_BASKET[area], money * (1 - PUB_WAGE_SHARE) * QF);
      }
      // administración, cultura, ciencia, energías limpias y servicios sociales (miles de millones al año)
      const social = (sb.social || 0) * share + (cs.social || 0);
      const other = ((sb.administracion || 0) + (sb.cultura || 0) + (sb.ciencia || 0) + (sb.renovables || 0)) * share + (cs.administracion || 0) + (cs.identidad || 0) + social * (1 - SOCIAL_CASH);
      buy(PUBLIC_BASKET.otros, other * 1e6 * QF);
      socialCash[i] = social * SOCIAL_CASH * 1e6 * QF;
      for (const g in pubOrd[i]) order(i, g, pubOrd[i][g]);
    });
  }
  // productores y compradores de cada bien (para el mercado)
  const producers = {}; GOOD_IDS.forEach(g => producers[g] = []);
  const users = {}; GOOD_IDS.forEach(g => users[g] = []);
  e.potQ = {}; GOOD_IDS.forEach(g => e.potQ[g] = 0);
  for (const f of G.firms) {
    if (f._plan) for (const g in f._plan) { producers[g].push(f); e.potQ[g] += f._plan[g]; }
    for (const g in f._ord) users[g].push(f);
  }
  e.potD = Object.fromEntries(GOOD_IDS.map(g => [g, sum(D[g])]));
  G._pctx = { D, producers, users, pubOrd, socialCash, staff, books, worksById, minWage, mix, nC, res: {}, fill: G.cantons.map(() => ({})), bprice: G.cantons.map(() => ({})) };
}
// Mercados de todos los países, producto a producto (primero las materias primas)
function worldMarkets(W, opts = {}) {
  for (const g of GOOD_CHAIN) {
    // (empresas públicas con precio fijado para este producto: van aparte)
    const FX = W.map(() => []);
    const S = W.map((st, w) => {
      const x = st._pctx, arr = new Array(x.nC).fill(0);
      for (const f of x.producers[g]) {
        // la primera vez que se reparte algo suyo, la empresa sabe qué mejoras ha conseguido
        if (!f._bDone) {
          f._bDone = true;
          for (const b in f._boost) { const fr = x.res[b] ? x.res[b].fill[f.c] : (f.bFill && f.bFill[b] != null ? f.bFill[b] : 1); f.boostF *= 1 + BOOST_GAIN[b] * fr; }
        }
        const q = f._plan[g] * f.prodF * f.boostF;
        f.q_out[g] = q;
        if (f.fp && f.fp[g] > 0) FX[w].push({ f, q }); else arr[f.c] += q;
      }
      return arr;
    });
    const Dm = W.map(st => st._pctx.D[g]);
    const PRE = W.map((st, w) => FX[w].length ? fixedPriceSales(st, g, FX[w], Dm[w], S[w]) : null);
    const rs = worldClearGood(W, g, S, W.map((st, w) => PRE[w] ? PRE[w].Dleft : Dm[w]));
    W.forEach((st, w) => {
      const x = st._pctx, r = rs[w];
      if (PRE[w]) { fixedPriceAfter(st, g, PRE[w], r); (x.fxAdj = x.fxAdj || {})[g] = PRE[w]; }
      x.res[g] = r;
      st.cantons.forEach((c, i) => { x.fill[i][g] = r.fill[i]; x.bprice[i][g] = r.buyPrice[i]; });
      // quien usa este producto como materia prima produce menos si no ha conseguido todo
      for (const f of x.users[g]) {
        const fr = r.fill[f.c];
        f.q_in[g] = f._ord[g] * fr;
        // (las máquinas son desgaste del equipo: sin repuestos un turno se produce algo menos, no nada)
        const lim = g === 'maquinas' ? 0.75 + 0.25 * fr : fr;
        if (f._inv && g === 'maquinas' && !(inpOf(st, f.kind).maquinas > 0)) continue;
        if (f._any) { if (f._any[g] != null) f._anyF = (f._anyF || 0) + f._any[g] * lim; }   // (con varios insumos posibles, vale la media)
        else if (!(f._boost[g] > 0) || (FIRM_KINDS[f.kind].inp || {})[g]) f.prodF = Math.min(f.prodF, lim);
      }
    });
  }
  W.forEach(G => {
    const x = G._pctx, e = G.eco, fill = x.fill;
    // lo que han conseguido de sus mejoras (las clínicas, colegios y bancos la notan ya este turno)
    G.firms.forEach(f => {
      if (f._boost && Object.keys(f._boost).length) {
        f.bFill = {}; for (const b in f._boost) f.bFill[b] = fill[f.c][b];
        if (!f._plan) { f.boostF = 1; for (const b in f._boost) f.boostF *= 1 + BOOST_GAIN[b] * fill[f.c][b]; }
      }
      delete f._bDone;
      if (f._any) { f.prodF = Math.min(f.prodF, clamp(f._anyF == null ? 1 : f._anyF, 0, 1)); delete f._anyF; }
    });
    closeMarkets(G, x.res, { hold: opts.hold });
    // donde se vende a precio fijado, el precio que ve la gente es la mezcla (así se compra más de lo barato)
    for (const g in x.fxAdj || {}) { const X = x.fxAdj[g]; G.cantons.forEach((c, i) => { if (X.share[i] > 0) e.cprices[i][g] = lerp(e.cprices[i][g], X.pxFx[i], X.share[i]); }); }
    G.cantons.forEach((c, i) => { c.supplyQ = Object.fromEntries(GOOD_IDS.map(g => [g, sum(x.producers[g].filter(f => f.c === i), f => f.q_out[g] || 0)])); });
    e.energyCost = clamp(e.px.electricidad / worldPrice(G, 'electricidad'), 0.5, 3);
    G.cantons.forEach((c, i) => { c.armasF = clamp(0.7 + 0.3 * (fill[i].armas ?? 1), 0.3, 1); });
  });
}
// Cuentas del turno de un país: los hogares pagan lo que han conseguido y cada empresa cobra lo que ha vendido
function produceSettle(G, opts = {}) {
  const e = G.eco, p = G.pol;
  const { pubOrd, socialCash, staff, books, worksById, minWage, mix, nC, res, fill, bprice } = G._pctx;
  // compras públicas de verdad (lo que se ha conseguido)
  e.publicBuy = sum(range(nC), i => sum(Object.entries(pubOrd[i]), ([g, q]) => q * fill[i][g] * bprice[i][g])) / QF;
  // 4) los hogares pagan lo que han conseguido
  const spent = householdSettle(G, fill, bprice, { init: opts.init });
  if (!opts.init) { payBaskets(G, spent); socialAid(G, socialCash); }
  const incomeF = e.netIncomeTot ? Math.pow(Math.max(0.3, e.netIncomeTot / Math.max(1, G.citizens.length) / 18), 0.7) : 1;
  // servicios privados: los hogares con más renta y menos cobertura pública pagan clínicas y colegios
  G.cantons.forEach((c, i) => {
    const students = (c.stats.kids || 0) * 0.75 + G.citizens.filter(cz => cz.c === i && cz.prof === 'estudiante').length;
    c.students = students;
    const covH = c.staff.sanidadPub * SERVICE.sanidad.per / Math.max(1, c.pop), covE = c.staff.educacionPub * SERVICE.educacion.per / Math.max(1, students);
    c.coverage = { sanidad: covH, educacion: covE };
    // parte de lo que necesita de salud la gente del cantón que cubren los sanitarios (públicos y privados)
    c.healthMet = clamp(c.staff.sanidad * SERVICE.sanidad.per / Math.max(1, c.pop * 0.75), 0, 1);
    const shareH = clamp(0.05 + (incomeF - 1) * 0.25 + (0.8 - covH) * 0.45, 0.02, 0.6), shareE = clamp(0.04 + (incomeF - 1) * 0.2 + (0.8 - covE) * 0.4, 0.02, 0.5);
    c.privDemand = { sanidad: c.pop * shareH, educacion: students * shareE };
  });
  // 5) cuentas de cada empresa: cobra lo que vende (a los precios de su cantón) y paga lo que compra
  const subsidyPool = G.cantons.map(c => (c.pol.gasto.campo || 0) / 100 * (c.stats.gdp || 0) * 1e6 * QF);
  const PRIMARY = ['agricultura', 'ganaderia', 'pesca'];   // las ayudas al campo no van a los bosques
  const primaryWorkers = G.cantons.map((c, i) => sum(G.firms.filter(f => f.c === i && PRIMARY.includes(f.kind)), f => f.staffN || 0));
  const privCap = G.cantons.map((c, i) => ({ sanidad: sum(G.firms.filter(f => f.c === i && f.pub == null && f.kind === 'sanidad'), f => (f.staffN || 0) * SERVICE.sanidad.per * (f.boostF || 1)),
    educacion: sum(G.firms.filter(f => f.c === i && f.pub == null && f.kind === 'educacion'), f => (f.staffN || 0) * SERVICE.educacion.per * (f.boostF || 1)) }));
  e.emissionsBySector = {};
  // bases de los impuestos que pagan de verdad las empresas este turno (k€), por cantón: nóminas y beneficios
  const tx = { nom: G.cantons.map(() => 0), soc: G.cantons.map(() => 0), carbono: 0 };
  const INTENSITY = { agricultura: 0.8, ganaderia: 2.6, pesca: 0.5, silvicultura: 0.2, muebles: 0.9, textil: 1.3, sanidad: 0.15, educacion: 0.1, constructora: 0.7, banco: 0.05,
    cantera: 0.8, minaMetal: 1.2, minaCarbon: 1.5, maquinaria: 1, armamento: 0.9, electrica: mix.em, telecom: 0.1, medios: 0.05, alimentacion: 0.5, comercio: 0.1, automovilistica: 1.1, ferroviaria: 0.2 };
  const svcFees = G.cantons.map(() => 0);
  for (const f of G.firms) {
    const list = staff.get(f.id) || [], ws = workersOf(f, list);
    const c = G.cantons[f.c];
    const lm = 1;
    const nom = nomRate(G, c);
    let revenue = 0, inputs = 0;
    f.q_sold = {};
    if (f.obra) {
      // en obras: aún no produce, pero paga los intereses de su préstamo
      const interest = (f.debt || 0) * (e.firmRate || 0.05) * QF;
      f.revY = f.vaY = f.wagesY = f.inputsY = 0; f.profitY = -interest * 4; f.ownerY = 0; f.lm = lm;
      if (!opts.init) f.cash -= interest;
      continue;
    }
    if (isCenterF(f)) {
      // servicio público: su valor es lo que cuesta (sueldos)
      ws.forEach(cz => { cz.wg = centerWage(G, f, cz.prof); });
      f.wage = ws.length ? avg(ws, cz => cz.wg) : centerWage(G, f, staffSpec(f).base);
      const wageBill = sum(ws, cz => cz.wg) * QF;
      f.revY = f.vaY = wageBill * 4; f.profitY = 0; f.wagesY = wageBill * 4; f.ownerY = 0;
      // también la Administración cotiza por sus empleados
      tx.nom[f.c] += wageBill;
      c.firmVA += f.vaY;
      continue;
    }
    // lo vendido (lo que no se vende se pierde) y lo comprado
    // (lo vendido a precio fijado por una empresa pública va aparte; mktRev: lo que valdría a precio de mercado)
    let mktRev = 0;
    for (const g in f.q_out) {
      const r = res[g], fx = f._fx && f._fx[g];
      if (fx) { const mq = fx.m * (opts.full ? 1 : r.soldFrac[f.c]); f.q_sold[g] = fx.q + mq; revenue += fx.rev + mq * r.sellPrice[f.c]; mktRev += f.q_sold[g] * r.P; continue; }
      const sq = f.q_out[g] * (opts.full ? 1 : r.soldFrac[f.c]); f.q_sold[g] = sq; const v = sq * (opts.full ? r.P : r.sellPrice[f.c]); revenue += v; mktRev += v;
    }
    // la plantilla de una empresa pública cobra el sueldo público (o el que haya fijado su gobierno)
    if (isPE(f)) { ws.forEach(cz => { cz.wg = centerWage(G, f, cz.prof); }); f.wage = ws.length ? avg(ws, cz => cz.wg) : centerWage(G, f, staffSpec(f).base); }
    for (const g in f.q_in) inputs += f.q_in[g] * bprice[f.c][g];
    // las máquinas compradas para quedárselas son inversión: se pagan de la caja, no son un gasto del turno
    let invest = 0;
    if (f._inv && f.q_in.maquinas) {
      const got = Math.min(f.q_in.maquinas, f._inv);
      invest = got * bprice[f.c].maquinas; inputs -= invest;
      if (!opts.init) f.eq = (f.eq || 0) + got;
    }
    if (f.kind === 'sanidad' || f.kind === 'educacion') {
      const S = SERVICE[f.kind], capF = (ws.length * S.per * qualFactor(f, ws) + (list.length - ws.length) * S.per * 0.5) * (f.boostF || 1);
      f.capF = capF;
      const served = privCap[f.c][f.kind] > 0 ? Math.min(capF, c.privDemand[f.kind] * capF / privCap[f.c][f.kind]) : 0;
      f.served = served;
      revenue = served * S.fee * QF;
      svcFees[f.c] += revenue;
    }
    if (f.kind === 'banco') {
      // margen de intereses (lo que cobra por prestar menos lo que paga por los depósitos) y comisiones
      const b = books.get(f.id) || { D: 0, L: 0, n: 0, perf: 0, firmL: 0 };
      const intInc = (b.perf * (e.mortRate || 0.035) + b.firmL * (e.firmRate || 0.05)) * QF;
      const intExp = b.D * (e.depRate || 0.008) * QF;
      // lo que no presta lo deja en el banco central, que le paga casi el tipo oficial
      const reserves = Math.max(0, b.D + Math.max(0, f.cash) - b.L) * Math.max(0, (e.policyRate || 0.02) - 0.003) * QF;
      const service = Math.min(1, ws.length * CLIENTS_PER_ADMIN * (f.boostF || 1) / Math.max(1, b.n));
      revenue = Math.max(0, intInc + reserves - intExp + b.n * BANK_FEE) * (0.6 + 0.4 * service);
      f.served = b.n; f.dep = b.D; f.loans = b.L;
    }
    if (f.kind === 'constructora') {
      // lo que vale la obra hecha este turno (si faltan materiales, avanza menos)
      const matF = f.prodF;
      let acc = 0;
      for (const [id, a] of f.alloc || []) { const w = worksById.get(id); if (!w) continue; acc += a * matF * w.val / w.need; if (!opts.init) w.done += a * matF; }
      revenue = acc;
    }
    if (PRIMARY.includes(f.kind) && primaryWorkers[f.c]) revenue += subsidyPool[f.c] * (f.staffN || 0) / primaryWorkers[f.c];
    const other = f.kind === 'constructora' ? revenue * HOUSING.otherShare : 0;
    const va = revenue - inputs - other;
    const wageBill = sum(ws, cz => Math.max(cz.wg || f.wage || 0, minWage)) * QF;
    // emisiones y su impuesto
    const em = revenue * (INTENSITY[f.kind] || 0);
    e.emissionsBySector[f.kind] = (e.emissionsBySector[f.kind] || 0) + em;
    const carbonCost = em * (p.carbono || 0) * 0.02;
    const interest = (f.debt || 0) * (e.firmRate || 0.05) * QF;
    const profit = va - wageBill * (1 + nom) - carbonCost - interest;
    const pe = isPE(f);
    const corp = pe ? 0 : Math.max(0, profit) * ((p.sociedades || 0) + ((c.pol.sociedades) || 0));
    tx.nom[f.c] += wageBill; if (!pe) tx.soc[f.c] += Math.max(0, profit); tx.carbono += carbonCost;
    // el dueño se lleva parte del beneficio (los bancos, solo si les sobra capital)
    const canDraw = f.kind === 'banco' ? f.cash > (f.loans || 0) * (capReq(G) + 0.03) : f.cash > 0 || f.kind !== 'constructora';
    // el dueño se lleva parte del beneficio y, si la caja pasa de medio año de nóminas, también lo que sobra
    // (en el arranque: lo que se lleva de media a la larga)
    const buffer = Math.max(1, wageBill) * 2;
    const draw = pe || !canDraw ? 0 : f.kind === 'banco' ? Math.max(0, profit - corp) * 0.6 + (opts.init ? 0 : Math.max(0, f.cash - (f.loans || 0) * (capReq(G) + 0.06)) * 0.2)
      : opts.init ? Math.max(0, profit - corp) * 0.9 : Math.max(0, profit - corp) * 0.6 + Math.max(0, (f.cash || 0) - buffer) * 0.3;
    f.revY = revenue * 4; f.vaY = va * 4; f.wagesY = wageBill * 4; f.profitY = profit * 4; f.ownerY = draw * 4; f.inputsY = inputs * 4; f.interestY = interest * 4;
    f.mktRevY = mktRev * 4;
    // cuentas del trimestre (al año) y precios a los que ha vendido y comprado: para la ficha de la empresa
    f.acct = { rev: revenue * 4, inp: inputs * 4, other: other * 4, wages: wageBill * 4, payroll: wageBill * nom * 4, carbon: carbonCost * 4, interest: interest * 4, profit: profit * 4, corp: corp * 4, draw: draw * 4 };
    f.pxOut = {}; for (const g in f.q_out) f.pxOut[g] = opts.full ? res[g].P : res[g].sellPrice[f.c];
    f.pxIn = {}; for (const g in f.q_in) f.pxIn[g] = bprice[f.c][g];
    f.lm = lm;
    if (!opts.init && pe) {
      // empresa pública: lo que gana o pierde va a las cuentas de su gobierno (miles de millones del trimestre)
      const bn = (profit - invest) / 1e6;
      if (f.pub === 'estado') e.peQ = (e.peQ || 0) + bn; else if (G.cantons[f.pub]) G.cantons[f.pub].peQ = (G.cantons[f.pub].peQ || 0) + bn;
      f.loss = profit < 0 ? (f.loss || 0) + 1 : 0;
      f.profH = (f.profH || []).concat([Math.round(profit * 10) / 10]).slice(-4);
    } else if (!opts.init) {
      let delta = profit - corp - draw - invest;
      // las constructoras cobran las viviendas al venderlas (y los encargos, al firmarlos)
      if (f.kind === 'constructora') delta -= revenue;
      f.cash += delta;
      // devuelve poco a poco su préstamo
      // (las constructoras devuelven el préstamo promotor en cuanto venden)
      if (f.debt > 0 && f.cash > 0) {
        const pr = f.kind === 'constructora' ? Math.min(f.debt, Math.max(0, f.cash - wageBill * 1.5)) : Math.min(f.debt, f.debt / LOAN_Q_FIRM + 0.5, f.cash);
        f.debt -= pr; f.cash -= pr; if (f.debt < 0.05) f.debt = 0;
      }
      f.loss = profit < 0 ? (f.loss || 0) + 1 : 0;
      f.profH = (f.profH || []).concat([Math.round(profit * 10) / 10]).slice(-4);
    }
    c.firmVA += va * 4; c.firmProfit += Math.max(0, profit) * 4;
  }
  // los hogares pagan las clínicas y colegios privados
  if (!opts.init) payServices(G, svcFees);
  // lo que cuenta para Hacienda es lo del turno de verdad, salvo al empezar
  if (!opts.init || !(G.turn > 0)) e.firmTax = tx;
  G.firms.forEach(f => { delete f._plan; delete f._ord; });
  G._pctx = null;
}

// ---------- el turno de las empresas: decisiones (antes de producir) ----------
// Con lo que pasó el turno anterior, cada empresa contrata o despide, fija sueldos, pide crédito,
// amplía o cierra; se fundan empresas nuevas y las constructoras empiezan promociones.
function firmsQuarter(G) {
  const e = G.eco, p = G.pol;
  // productividad: mejora poco a poco con la educación y la ciencia
  const pg = 0.006 + ((e.education || 60) - 60) / 100 * 0.01 + (subsidy(G, 'ciencia') - 0.6) * 0.004 - (e.corruption - 30) / 100 * 0.004;
  for (const s in e.prodIdx) e.prodIdx[s] *= Math.pow(1 + pg, QF);
  e.prodIdx.construccion = e.prodIdx.construccion || 1; e.prodIdx.finanzas = e.prodIdx.finanzas || 1;
  stepEnergyMix(G); stepInMix(G);
  staffPublic(G);
  civilWorks(G);
  laborStats(G);
  const staff = staffOf(G);
  const byC = byCanton(G);
  const pools = byC.map(list => RNG.shuffle(list.filter(cz => inLaborForce(cz) && !cz.emp)));
  const flex = p.laboral ?? 2;
  const fireP = [0.35, 0.5, 0.7, 0.85, 1][flex];
  const minWage = (p.salarioMin || 0.45) * (e.avgWage || 26);
  const books = bankBooks(G);
  const closed = [], failedBanks = [];
  const flow = e.flow = { sep: 0, fired: 0, hired: 0, closedW: 0, moved: 0, relocated: 0, vac: 0 };
  const benefit = [0.15, 0.25, 0.35, 0.45, 0.6][p.desempleo ?? 2] * (p.rentaBasica ? 0.5 : 1) * (e.avgWage || 26);
  // (indemnización por despido, en parte del sueldo de un año, según la ley laboral)
  const H = e.cpiH || [], infQ = H.length > 1 ? clamp(H[H.length - 1] / H[H.length - 2] - 1, -0.03, 0.04) : 0;
  const lx = { minWage, flex, sev: [0.75, 0.5, 0.33, 0.2, 0.08][flex], fireP, flow, benefit, infQ };
  // algunos dejan su empleo por su cuenta (cuidados, cambio de vida…)
  for (const f of G.firms) {
    if (f.pub != null || f.obra || f.kind === 'policia') continue;
    for (const cz of workersOf(f, staff.get(f.id) || [])) if (RNG.chance(0.008)) { dropJob(cz); cz.ue = 0; flow.sep++; }
  }
  const czById = new Map(G.citizens.map(z => [z.id, z]));
  for (const f of G.firms.slice()) {
    // empresas públicas: la plantilla la decide su gobierno
    if (isPE(f)) { if (!f.obra) staffPE(G, f, workersOf(f, (staff.get(f.id) || []).filter(cz => cz.emp && cz.firm === f.id))); continue; }
    if (f.pub != null || f.obra) continue;
    const c = G.cantons[f.c], K = FIRM_KINDS[f.kind];
    const list = () => G.citizens.filter(cz => cz.emp && cz.firm === f.id);
    let ws = workersOf(f, (staff.get(f.id) || []).filter(cz => cz.emp && cz.firm === f.id));
    // la vara del dueño: lo que ganaría trabajando de lo suyo, y no menos que el 70 % de su plantilla; si dos
    // trimestres seguidos no la alcanza, toma medidas para cuadrar cuentas (crisis)
    if (f.kind !== 'banco' && (G.turn || 0) - (f.opened ?? f.born ?? 0) >= 2) {
      const wsW = ws.map(z => z.wg || 0).sort((a, b) => a - b);
      const p70 = wsW.length ? wsW[Math.floor(0.7 * (wsW.length - 1))] : 0;
      const o0 = czById.get(f.owner);
      f.vara = Math.max(o0 ? outsideOption(G, o0) : refWage(G, 'operario'), p70);
      f.crisisQ = ownerShareOf(f) < f.vara ? (f.crisisQ || 0) + 1 : 0;
    }
    // si no vende todo lo que produce, sobra gente
    // (si no ha podido producir por falta de materias primas, no es que le sobre producción)
    const qo = f.q_out ? sum(Object.values(f.q_out)) : 0;
    const unsold0 = qo > 1e-6 ? 1 - sum(Object.keys(f.q_out), g => (f.q_sold || {})[g] || 0) / qo : 0;
    const unsold = f.unsold = lerp(f.unsold ?? unsold0, unsold0, 0.5);
    // bancos: la plantilla que piden sus clientes; constructoras: la que piden sus obras pendientes
    if (f.kind === 'banco') f.want = Math.ceil((f.served || 0) / CLIENTS_PER_ADMIN);
    if (f.kind === 'constructora') f.want = Math.ceil(backlogOf(G, f) / 3 / WQ_PER_WORKER);
    ws = firmStaffing(G, f, ws, lx);
    delete f.fresh;
    const n = ws.length;
    const cost = Math.max(minWage, f.wage || minWage) * (1 + nomRate(G, c));
    const vaw = (f.vaY || 0) / Math.max(1, n);
    const ratio = (f.mv ?? vaw) / Math.max(1, cost);
    // maquinaria: el desgaste del trimestre y, si le sale a cuenta, una máquina más (con dinero de la caja)
    f.invQ = 0;
    if (MECH_KINDS.includes(f.kind)) {
      f.eq = (f.eq || 0) * (1 - MECH_DEP);
      if (n > 0 && (G.turn || 0) - (f.born || 0) >= 3 && !(f.loss > 0) && unsold < 0.06 && (f.eq || 0) < n - 0.5) {
        const vaQ = (f.vaY || 0) / 4 / eqFactor(f, n);
        const gain = MECH_GAIN * vaQ / n, px = localPrice(G, f.c, 'maquinas');
        // (con mucho paro en el cantón el trabajo es barato y mecanizar compensa menos)
        if ((c.tight || 0) > -0.03 && gain > px * (MECH_DEP + (e.firmRate || 0.05) / 4) * 2 && f.cash > px * 1.2 + (f.wage || 20) * n * 0.25) f.invQ = 1;
      }
    }
    // escalar: si está llena, gana dinero y las cuentas salen, el dueño paga un nivel más
    if (!f.upg && f.cash >= 0 && unsold < 0.05) maybeScale(G, f, n, ratio, cost, vaw, pools, books);
    if (f.kind === 'banco') { if (f.cash < 0) failedBanks.push(f); continue; }
    // sin caja: pide crédito a su banco (si se lo dan: no a quien lleva tiempo perdiendo dinero)
    if (f.cash < 0) {
      const amt = -f.cash + f.wage * Math.max(1, n) * 0.25;
      const lender = findLender(G, books, f.c, amt, f.bk);
      if (lender && (f.debt || 0) + amt <= creditLimit(G, f) && (f.loss || 0) < 3) { f.debt = (f.debt || 0) + amt; f.cash += amt; f.bk = lender.f.id; lender.L += amt; }
    }
    // quiebra: sin caja ni crédito para pagar las nóminas
    const young = (G.turn || 0) - (f.born || 0) < 3;
    if (f.cash < -0.1 * f.wage * Math.max(1, n) * QF) {
      const L = list(); L.forEach(cz => { dropJob(cz); pools[f.c].push(cz); }); flow.closedW += L.length;
      f.why = 'quiebra'; closed.push(f);
      continue;
    }
    // cierre: un año perdiendo dinero y sin perspectivas de que mejore (el dueño lo deja)
    // (solo si ni pagando el sueldo mínimo saldría a cuenta, y si lo que perdería en un año pasa de lo que le
    // costaría despedir a todos: unas indemnizaciones altas lo hacen aguantar más)
    if (!young && ((f.loss || 0) >= 4 || (f.crisisQ || 0) >= 6) && f.kind !== 'constructora') {
      const exp = expectedRatio(G, f.kind, f.c, minWage, Object.assign({}, f, { wage: minWage }));
      const sevAll = sum(ws, z => (z.wg || 0) * lx.sev);
      const yearLoss = Math.max(0, -(f.profitY || 0)) + Math.max(0, (f.vara || 0) - ownerShareOf(f));
      if (exp < 1.02 && yearLoss > sevAll) {
        const pay = Math.min(sevAll, Math.max(0, f.cash));
        ws.forEach(z => { z.sav = (z.sav || 0) + pay * (z.wg || 0) * lx.sev / Math.max(1e-9, sevAll); });
        f.cash -= pay;
        const L = list(); L.forEach(cz => { dropJob(cz); pools[f.c].push(cz); }); flow.closedW += L.length;
        f.why = 'cierre'; closed.push(f);
      }
    }
    // las explotaciones agrícolas cambian de cultivo si el otro rinde bastante más
    if (f.kind === 'agricultura' && !young && RNG.chance(0.25)) {
      const val = pr => sum(Object.entries(pr === 'tejido' ? K.alt : K.out), ([g, r]) => r * (e.px[g] || GOODS[g].price) * Math.min(1, (e.trade && e.trade[g] ? e.trade[g].soldF : 1)));
      const other = f.product === 'tejido' ? 'grano' : 'tejido';
      if (val(other) > val(f.product || 'grano') * 1.2) f.product = other;
    }
  }
  // socios que faltan (por una muerte o porque la empresa creció) y empresas que se quedan sin dueño
  partnersQuarter(G, lx);
  G.firms.filter(f => f.dying && !closed.includes(f)).forEach(f => { const L = G.citizens.filter(cz => cz.emp && cz.firm === f.id); L.forEach(cz => { dropJob(cz); pools[f.c].push(cz); }); flow.closedW += L.length; closed.push(f); });
  closed.forEach(f => closeFirm(G, f, books));
  if (closed.length) {
    const bk = closed.filter(f => f.why === 'quiebra');
    const names = l => l.slice(0, 3).map(f => f.name).join(', ') + (l.length > 3 ? '…' : '');
    if (closed.length >= 2) e.news.push({ type: 'bad', topic: 'cierres', importance: 4, text: `Cierran ${closed.length} empresas este trimestre${bk.length ? ` (${bk.length} en quiebra)` : ''}: ${names(closed)}.` });
    else e.news.push({ type: 'bad', topic: 'cierres', importance: 2, text: closed[0].why === 'quiebra' ? `Quiebra ${closed[0].name}: ${closed[0].staffN} personas pierden su empleo.` : `Cierra ${closed[0].name} tras un año de pérdidas: ${closed[0].staffN} personas pierden su empleo.` });
  }
  // quiebras bancarias: otro banco se queda con sus clientes
  failedBanks.forEach(f => {
    bankFailure(G, f, books);
    G.citizens.forEach(cz => { if (cz.firm === f.id) { dropJob(cz); pools[f.c].push(cz); } });
    G.firms = G.firms.filter(x => x !== f);
  });
  // ofertas y demandantes de empleo se encuentran (también las de las Administraciones)
  matchJobs(G, lx);
  // nuevas empresas: alguien con ahorros (o con un préstamo) funda una donde espere ganar dinero
  const corpGap = totTax(G, 'sociedades') - avg(G.foreign, f => f.corpTax);
  const govEco = governmentEcoIdeology(G);
  e.capitalFlight = corpGap > 0.07 || (govEco < -1.2 && p.empresasPublicas >= 3) || p.empresasPublicas === 4;
  if (e.capitalFlight && !e.wasFlight) e.news.push({ type: 'bad', topic: 'fuga', importance: 7, text: 'Fuga de capitales: los empresarios dejan de invertir ante el clima fiscal y político.' });
  const opened = [];
  const lu = lotsUsed(G);
  const books2 = bankBooks(G);
  e.noFounder = 0;
  // hueco que deja cada mercado para empresas nuevas este turno (para que no entren todas a la vez)
  G._room = {};
  for (const g of GOOD_IDS) { const t = (e.trade || {})[g]; G._room[g] = t ? Math.max(0.1 * t.q, t.qm + t.short - t.lost) : 0; }
  // (lo que van a producir las empresas que ya están en obras cuenta como oferta que viene)
  for (const f of G.firms) { const K = f.obra && FIRM_KINDS[f.kind]; if (K && K.out) for (const g in K.out) G._room[g] -= K.out[g] * K.cap * 0.6; }
  G.cantons.forEach((c, i) => {
    const biggest = Math.max(...pools.map(x => x.length));
    if (pools[i].length < 2 && biggest < 6) return;
    const mood = clamp(0.5 + (e.confidence || 0.5) - 0.5 - corpGap * 2 - (e.capitalFlight ? 0.3 : 0) + (e.plans.inversion ? 0.25 : 0) + (c.invest ? 0.3 : 0), 0.05, 1);
    for (const kind of RNG.shuffle(Object.keys(FIRM_KINDS).filter(k => k !== 'policia'))) {
      const slots = freeSlots(G, kind, i, lu);
      if (!slots.length) continue;
      const K = FIRM_KINDS[kind];
      if (K.out && Object.keys(K.out).some(g => (G._room[g] || 0) < K.out[g] * K.cap * 0.5)) continue;
      const exp = expectedRatio(G, kind, i, minWage);
      // (más ganas de abrir donde falta el producto: el precio está muy por encima del normal)
      const scarce = K.out ? Math.max(...Object.keys(K.out).map(g => ((e.px || {})[g] || GOODS[g].price) / GOODS[g].price)) : 1;
      if (exp < (kind === 'banco' || kind === 'constructora' ? 1.15 : 1) || !RNG.chance(Math.min(0.6, 0.25 * mood * clamp(scarce, 1, 2.5)))) continue;
      const f = foundFirm(G, kind, i, slots, books2, lu, exp);
      if (f) { opened.push(f); if (K.out) for (const g in K.out) G._room[g] -= K.out[g] * K.cap; }
    }
    if (c.invest) c.invest--;
  });
  if (opened.length >= 2) e.news.push({ type: 'good', topic: 'aperturas', importance: 3, text: `Se fundan ${opened.length} empresas nuevas: ${opened.slice(0, 3).map(f => f.name).join(', ')}${opened.length > 3 ? '…' : ''}.` });
  e.firmsOpened = opened.length; e.firmsClosed = closed.length;
  // las constructoras deciden nuevas promociones de viviendas
  G.firms.filter(f => f.kind === 'constructora' && !f.obra).forEach(f => startHousing(G, f, lu));
}
// Plantilla de una empresa pública: la que fije su gobierno (si no, todas sus plazas). Si sobra gente, se despide
// poco a poco (primero a quien no está cualificado); si falta, se publican ofertas con el sueldo público
function staffPE(G, f, cur) {
  const cap = firmCap(f), target = Math.min(cap, f.plazas ?? cap);
  const step = Math.max(1, Math.round(cap * 0.25)), sp = staffSpec(f);
  if (MECH_KINDS.includes(f.kind)) f.eq = (f.eq || 0) * (1 - MECH_DEP);
  f.invQ = 0; f.target = target;
  if (cur.length > target) {
    RNG.shuffle(cur).sort((a, b) => (a.prof === sp.q) - (b.prof === sp.q)).slice(0, Math.min(step, cur.length - target)).forEach(cz => { dropJob(cz); cz.ue = 0; });
    f.vac = []; return;
  }
  const open = Math.min(step * 2, target - cur.length);
  let Q = cur.filter(cz => cz.prof === sp.q).length;
  const vac = [];
  for (let i = 0; i < open; i++) {
    const p = sp.q && Q < (sp.min || 0) * (cur.length + i + 1) - 1e-9 ? sp.q : sp.base;
    if (p === sp.q) Q++;
    vac.push({ p, w: centerWage(G, f, p), t: 0, k: p === sp.q ? 'req' : 'base', pub: 1 });
  }
  f.vac = vac;
}
// Obras del turno: las terminadas abren empresas y ponen viviendas a la venta (después de producir)
function worksQuarter(G) {
  const e = G.eco;
  foreignWorks(G);
  const fin = finishWorks(G);
  railFirmsQuarter(G);
  e.builtQ = fin.homes;
  if (fin.homes >= 6) e.news.push({ type: 'good', topic: 'vivienda', importance: 3, text: `Se terminan ${fin.homes} viviendas nuevas este trimestre.` });
  e.upgradesQ = (fin.upgraded || []).length;
  const big = (fin.upgraded || []).filter(f => f.lvl >= 3).sort((a, b) => b.lvl - a.lvl)[0];
  if (big) e.news.push({ type: 'good', topic: 'aperturas', importance: 3, text: `${big.name} amplía sus instalaciones: ya es una empresa de nivel ${big.lvl} y contratará a más gente.` });
}
// Funda una empresa: busca a alguien con ahorros, pide el resto al banco y encarga el edificio
function foundFirm(G, kind, canton, slots, books, lu, exp) {
  const e = G.eco, K = FIRM_KINDS[kind];
  const build = (K.capex || 100) * wageFactor(G);
  const aid = build * investAid(G);   // parte de la obra que paga el Estado
  const need = build - aid + 0.4 * (e.avgWage || 30) * 3;
  const cands = G.citizens.filter(cz => cz.c === canton && inLaborForce(cz) && cz.age >= 24 && cz.age <= 62 && cz.lvl >= 3 && cz.prof !== 'empresario' && (cz.sav || 0) >= need * 0.2 + 3);
  if (!cands.length) { e.noFounder = (e.noFounder || 0) + 1; return null; }
  const founder = RNG.weighted(cands, cz => (cz.emp ? 1 : 2.5) * Math.sqrt(cz.sav) * cz.lvl);
  const equity = Math.min(founder.sav - 3, need);
  const loan = Math.max(0, need - equity);
  // ¿le compensa? lo que espera llevarse el primer año (con una plantilla del 60 %, contratada con un 30 % menos
  // de lo que se paga de media, y trabajando él también) frente a su vara: lo que ganaría trabajando de lo suyo
  // (algo más, por el riesgo, y lo que le darían sus ahorros en el banco), y nunca menos que sus empleados
  if (kind !== 'banco' && kind !== 'constructora') {
    const c = G.cantons[canton], nomF = 1 + nomRate(G, c), sp = staffSpec({ kind, pub: null });
    const n0 = Math.max(1, Math.round(K.cap * 0.6)), minW = (G.pol.salarioMin || 0.45) * (e.avgWage || 26);
    const wB = Math.max(minW, refWage(G, sp.base) * OFFER_START), wQ = sp.q ? Math.max(minW, refWage(G, sp.q) * OFFER_START) : wB, qs = sp.q ? sp.min : 0;
    const profit = expectedVaw(G, kind, canton) * n0 - n0 * ((1 - qs) * wB + qs * wQ) * nomF - loan * (e.firmRate || 0.05);
    const ownerInc = Math.max(0, profit) * (1 - totTax(G, 'sociedades')) * 0.85;
    const vara = Math.max(outsideOption(G, founder) * 1.2 + equity * ((e.depRate || 0.01) + 0.03), qs > 0 ? wQ : wB);
    if (ownerInc < vara) { e.noVara = (e.noVara || 0) + 1; return null; }
  }
  let lender = null;
  if (loan > 0.5) {
    // el banco solo presta si el negocio promete
    lender = findLender(G, books, canton, loan, founder.bk);
    if (!lender || exp < 1.2) return null;
  }
  // el sitio lo elige quien funda: el mejor de los disponibles
  const score = h => siteFactor(G, { kind, q: h.q, r: h.r }) + (isCity(h) && ['banco', 'sanidad', 'educacion', 'constructora'].includes(kind) ? 0.3 : 0) + RNG.range(0, 0.15);
  const slot = slots.map(h => ({ h, s: score(h) })).sort((a, b) => b.s - a.s)[0].h;
  if (founder.emp) dropJob(founder);
  const f = newFirm(G, kind, slot, founder);
  setJob(G, founder, f, true);
  founder.sav -= equity;
  f.cash = need; f.debt = loan; f.bk = lender ? lender.f.id : founder.bk;
  if (lender) lender.L += loan;
  const key = slot.q + ',' + slot.r;
  lu.set(key, (lu.get(key) || 0) + (LOTS[kind] || 1));
  // la constructora se instala en una oficina; el resto necesita que le construyan el edificio
  if (kind === 'constructora') f.fresh = 1;
  else { f.cash -= build - aid; payInvestAid(G, aid); contractBuilding(G, f, build, canton); }
  return f;
}
// ---------- escalar una empresa (subirla de nivel) ----------
// Parte de la obra de fundar o ampliar una empresa que paga el Estado (ley de ayudas a la inversión)
function investAid(G) { return G.pol.ayudaInversion || 0; }
function payInvestAid(G, amt) { if (amt > 0) G.eco.investAidQ = (G.eco.investAidQ || 0) + amt; }
// Lo que cuesta construir un nivel más
function scaleCost(G, f) { return (FIRM_KINDS[f.kind].capex || 100) * 0.8 * wageFactor(G); }
// El dueño decide ampliar si la empresa está llena, gana dinero, hay gente para contratar
// y lo que ganaría con la nueva plantilla paga la obra en menos de tres años.
function maybeScale(G, f, n, ratio, cost, vaw, pools, books) {
  const K = FIRM_KINDS[f.kind]; if (!K || f.kind === 'policia') return false;
  if ((f.lvl || 1) >= (K.maxLvl || MAX_LVL)) return false;   // (nivel 6 como mucho; los gimnasios, 2; los comercios, 3)
  if ((G.turn || 0) - (f.lvlTurn ?? f.born ?? 0) < 2 || (f.loss || 0) > 0) return false;
  const cap = firmCap(f);
  // ¿hace falta más plantilla? (bancos y constructoras, según sus clientes u obras)
  const full = f.kind === 'banco' || f.kind === 'constructora' ? (f.want || 0) > cap && n >= cap - 1 : n >= cap - 0.5 && ratio > 1.12;
  if (!full) return false;
  const free = pools[f.c].length + Math.max(0, ...pools.map(x => x.length)) * 0.3;
  if (free < K.cap * 0.5) return false;
  // ¿se venderá lo que produzca de más? (todo se vende y el precio no está bajando, o aún se importa)
  if (K.out) for (const g in (f.q_out || {})) {
    const t = (G.eco.trade || {})[g]; if (!t) continue;
    if ((t.soldF ?? 1) < 0.95 || (t.next < t.origin * 0.99 && t.qm + t.short < 0.05 * t.q)) return false;
  }
  // previsión: lo que dejaría cada trabajador nuevo (con algo de prudencia por si bajan los precios)
  const perWorker = f.kind === 'banco' || f.kind === 'constructora' ? Math.max(0, (f.profitY || 0) / Math.max(1, n)) : vaw * levelF((f.lvl || 1) + 1) * 0.85 - cost;
  const gain = perWorker * K.cap;
  const price = scaleCost(G, f), own = price * (1 - investAid(G));
  if (gain <= 0 || own > gain * 3) return false;
  // dinero: de la caja (dejando para un trimestre de sueldos) o con un préstamo del banco
  const reserve = f.wage * Math.max(1, n) * 0.25;
  let fromCash = Math.min(own, Math.max(0, f.cash - reserve)), loan = own - fromCash;
  if (loan > 0.5) {
    const lender = findLender(G, books, f.c, loan, f.bk);
    if (!lender || (f.debt || 0) + loan > creditLimit(G, f) + own) return false;
    f.debt = (f.debt || 0) + loan; f.bk = lender.f.id; lender.L += loan; f.cash += loan;
  }
  // de mediana (nivel 3) o grande (nivel 5): hace falta un socio más, que pone su parte de la obra
  const os = ownersOf(f), needP = partnersFor((f.lvl || 1) + 1);
  if (needP > os.length) {
    const share = Math.max(0, (f.ownerY || 0) + gain * 0.5) / needP, stake = own / needP;
    const cz = findPartner(G, f, stake, share);
    if (!cz) { if (loan > 0.5) { f.debt -= loan; f.cash -= loan; const lb = books.get(f.bk); if (lb) lb.L -= loan; } return false; }
    cz.sav -= stake; f.cash += stake; addPartner(G, f, cz);
  }
  f.cash -= own; payInvestAid(G, price - own);
  contractUpgrade(G, f, price);
  return true;
}
// Cierre de una empresa: el banco pierde lo que no recupera y las obras se reparten
function closeFirm(G, f, books) {
  G.works = (G.works || []).filter(w => !(w.up && w.fid === f.id));
  const b = books && books.get(f.bk);
  // el banco se queda con las viviendas sin vender (y las venderá él)
  let recov = (FIRM_KINDS[f.kind].capex || 100) * (f.lvl || 1) * wageFactor(G) * 0.3;
  for (const k in G.forSale || {}) if (G.forSale[k].f === f.id) {
    const v = G.forSale[k];
    if (b) { v.f = b.f.id; recov += marketPrice(G, v.k, hexAtG(G, v.q, v.r), v.c) * 0.7; } else delete G.forSale[k];
  }
  // con lo que queda en caja se devuelve la deuda; lo que sobre es para el dueño
  if (f.cash > 0 && f.debt > 0) { const pay = Math.min(f.cash, f.debt); f.cash -= pay; f.debt -= pay; if (b) { b.L -= pay; } }
  if (f.cash > 0) { const os = ownersOf(f).map(id => G.citizens.find(z => z.id === id)).filter(Boolean); os.forEach(ow => { ow.sav = (ow.sav || 0) + f.cash / os.length; }); f.cash = 0; }
  if (b && f.debt > 0) { const loss = Math.max(0, f.debt - recov); b.f.cash -= loss; b.f.lossQ = (b.f.lossQ || 0) + loss; b.L -= f.debt; }
  G.eco.closedQ = (G.eco.closedQ || []).concat([{ name: f.name, kind: f.kind, c: f.c, why: f.why || 'cierre', turn: G.turn || 0 }]).slice(-12);
  const others = G.firms.filter(x => x.kind === 'constructora' && x !== f && !x.obra);
  G.works = (G.works || []).filter(w => {
    if (w.fid === f.id) return false;                 // su propio edificio, a medio hacer
    if (w.by !== f.id) return true;
    if (w.t !== 'firm') return false;                 // promociones de viviendas y obra civil abandonadas
    const nb = others.filter(x => x.c === f.c)[0] || others[0];
    w.by = nb ? nb.id : 0; return true;               // los encargos pasan a otra constructora
  });
  G.firms = G.firms.filter(x => x !== f);
}
// Rentabilidad esperada de una empresa de ese tipo en el cantón (valor por trabajador / lo que cuesta).
// Para los bienes, el dueño prevé el precio en origen hacia el que va el mercado y si se vende todo lo que
// se produce. f: si es una empresa que ya existe (para decidir si sigue), con su nivel y sus sueldos.
function expectedRatio(G, kind, canton, minWage, f) {
  const e = G.eco, K = FIRM_KINDS[kind], c = G.cantons[canton];
  if (kind === 'banco') {
    const banks = banksIn(G, canton);
    if (!banks.length) return 1.5;
    const clients = G.citizens.filter(cz => cz.c === canton).length;
    const capNow = sum(banks, f => Math.max(1, (f.staffN || 1) - 1)) * CLIENTS_PER_ADMIN;
    return clients > capNow * 1.25 && clients / (banks.length + 1) > 250 ? 1.25 : 0.8;
  }
  if (kind === 'constructora') {
    const hs = c.housing || {};
    const share = (hs.vacant || 0) / Math.max(1, hs.stock || 1);
    const cons = G.firms.filter(f => f.kind === 'constructora' && f.c === canton);
    const backlog = sum(cons, f => backlogOf(G, f)), cap = sum(cons, f => capacityOf(f));
    // sin ninguna constructora en el cantón, siempre hay obra pública y reformas que hacer
    if (!cons.length) return 1.3;
    const pressure = (c.noSlotAvg || 0) + (share < 0.05 ? 2 : 0) + backlog / Math.max(1, cap) / 4;
    const price = marketPrice(G, 'piso', null, canton);
    return pressure > 2 && price > unitCost(G, canton, 'piso', price) * 1.15 ? 1.25 : 0.9;
  }
  const vaw = expectedVaw(G, kind, canton, f);
  const wage = f ? Math.max(minWage, f.wage || 0) : Math.max(minWage, refWage(G, staffSpec({ kind, pub: null }).base));
  return vaw / Math.max(1, wage * (1 + nomRate(G, c)));
}
// Valor añadido que espera dejar cada trabajador al año (k€) en una empresa de ese tipo en el cantón
function expectedVaw(G, kind, canton, f) {
  const e = G.eco, K = FIRM_KINDS[kind], c = G.cantons[canton];
  if (kind === 'banco' || kind === 'constructora') {
    const same = G.firms.filter(x => x.kind === kind && x.vaY > 0 && x.staffN > 1);
    return same.length ? sum(same, x => x.vaY) / sum(same, x => x.staffN - 1) : (e.avgWage || 26) * 1.4;
  }
  const n = Math.max(2, Math.round(K.cap * 0.8));
  let rev = 0, inp = 0;
  if (kind === 'sanidad' || kind === 'educacion') {
    const capNow = sum(G.firms.filter(f => f.c === canton && f.pub == null && f.kind === kind), f => (f.staffN || 0) * SERVICE[kind].per);
    const unmet = (c.privDemand ? c.privDemand[kind] : 0) - capNow;
    rev = Math.min(unmet, n * SERVICE[kind].per) * SERVICE[kind].fee * QF;
  } else {
    const rates = f && f.kind === 'agricultura' && f.product === 'tejido' ? K.alt : K.out, k = n * levelF(f ? f.lvl : 1);
    const t = e.trade || {};
    const sellAt = g => { const x = t[g]; const P = (e.px && e.px[g]) || GOODS[g].price; return x ? Math.sqrt(P * (x.next || P)) * Math.min(1, x.soldF ?? 1) : P; };
    let boost = 1, boostCost = 0;
    for (const b in (K.boost || {})) { boost *= 1 + BOOST_GAIN[b]; boostCost += K.boost[b] * k * localPrice(G, canton, b); }
    for (const g in rates) rev += rates[g] * k * boost * sellAt(g);
    if (kind === 'ferroviaria') rev *= railFactorOf(G, canton);   // (sin vías apenas hay viajes que vender)
    const ki = inpOf(G, kind); for (const g in ki) inp += ki[g] * k * localPrice(G, canton, g);
    inp += boostCost;
  }
  // (las cuentas van por turno; los sueldos, al año)
  return (rev - inp) * 4 / n;
}

// ---------- abrir y cerrar centros públicos (acciones de los gobiernos) ----------
function openPublicCenter(G, ctype, q, r, owner) {
  const C = PUBLIC_CENTERS[ctype], h = hexAtG(G, q, r);
  if (!C || !h || h.c !== (G.ci || 0) || h.t === 'mar') return { ok: false, msg: 'Ese terreno no es válido.' };
  if (!(C.town ? isSettlement(h) : isCity(h))) return { ok: false, msg: C.town ? 'Tiene que estar en un pueblo o una ciudad.' : 'Tiene que estar en una ciudad.' };
  if (owner !== 'estado' && owner !== h.k) return { ok: false, msg: 'Ese terreno no es de tu cantón.' };
  if (G.firms.some(f => f.q === h.q && f.r === h.r && f.ctype === ctype)) return { ok: false, msg: 'Ya hay un centro así en ese lugar.' };
  if (lotsFree(G, h) < (LOTS[ctype] || 1)) return { ok: false, msg: 'En ese terreno no quedan parcelas libres para un edificio así.' };
  const f = newCenter(G, ctype, h, owner);
  // lo construye una constructora (se le paga por adelantado); hasta que acabe la obra no atiende a nadie
  contractBuilding(G, f, C.cost * 1000, h.k);
  // la obra se paga una vez (cuenta como gasto extraordinario de quien la hace)
  const cost = C.cost / 1000;   // C.cost va en millones; aquí, miles de millones
  // (extraSpend: lo que se paga este trimestre, en miles de millones)
  if (owner === 'estado') G.eco.extraSpend = (G.eco.extraSpend || 0) + cost;
  else G.cantons[owner].extraSpend = (G.cantons[owner].extraSpend || 0) + cost;
  return { ok: true, firm: f, cost };
}
function closePublicCenter(G, id, owner) {
  const f = G.firms.find(x => x.id === id);
  if (!f || f.pub == null || (!f.ctype && !f.pe)) return { ok: false, msg: 'Centro desconocido.' };
  if (f.pub !== owner) return { ok: false, msg: f.pe ? 'Esa empresa no es de tu gobierno.' : 'Ese centro no depende de tu gobierno.' };
  G.citizens.forEach(cz => { if (cz.firm === f.id) dropJob(cz); });
  if (f.upg) G.works = (G.works || []).filter(w => w.id !== f.upg);
  G.firms = G.firms.filter(x => x !== f);
  if (f.obra) G.works = (G.works || []).filter(w => w.fid !== f.id);   // si estaba en obras, se paran
  return { ok: true, firm: f };
}
// Sueldo de un puesto en un centro público: el que haya fijado su gobierno (el de los puestos cualificados;
// los demás cobran un 68 %) o, si no, el sueldo público de referencia
function centerWage(G, f, prof) {
  if (f && f.pay > 0) { const sp = staffSpec(f); return !sp.q || prof === sp.q ? f.pay : f.pay * 0.68; }
  return publicWage(G, prof);
}
// Plazas y sueldo de un centro público: plazas (null: las que dé el presupuesto) y sueldo bruto al mes (€)
// de los puestos cualificados (null: el sueldo público de referencia)
function setCenterStaffing(G, id, owner, plazas, payMonth) {
  const f = G.firms.find(x => x.id === id);
  if (!f || f.pub == null || (!f.ctype && !f.pe)) return { ok: false, msg: 'Centro desconocido.' };
  if (f.pub !== owner) return { ok: false, msg: f.pe ? 'Esa empresa no es de tu gobierno.' : 'Ese centro no depende de tu gobierno.' };
  const minW = (G.pol.salarioMin || 0.45) * (G.eco.avgWage || 26);
  if (plazas != null) { plazas = Math.round(+plazas); if (!isFinite(plazas) || plazas < 0) return { ok: false, msg: 'Número de plazas no válido.' }; plazas = Math.min(plazas, firmCap(f)); }
  let pay = null;
  if (payMonth != null && payMonth !== '') {
    pay = +payMonth * 12 / 1000;
    if (!isFinite(pay) || pay <= 0) return { ok: false, msg: 'Sueldo no válido.' };
    const low = staffSpec(f).q ? 0.68 : 1;
    if (pay * low < minW) return { ok: false, msg: low < 1 ? `Con ese sueldo el personal sin cualificar cobraría menos del salario mínimo (${fmt.int(minW / low * 1000 / 12)} €/mes como poco).` : `Ese sueldo está por debajo del salario mínimo (${fmt.int(minW * 1000 / 12)} €/mes).` };
    pay = Math.min(pay, publicWage(G, 'sanitario') * 4);
  }
  f.plazas = plazas; f.pay = pay;
  // los que ya trabajan pasan a cobrar el sueldo nuevo; las ofertas abiertas se rehacen el turno que viene
  G.citizens.forEach(cz => { if (cz.emp && cz.firm === f.id) cz.wg = centerWage(G, f, cz.prof); });
  (f.vac || []).forEach(v => { v.w = centerWage(G, f, v.p); });
  return { ok: true, firm: f };
}
// Precio de una clínica o un colegio privado: lo que vale la empresa (edificios y caja, menos lo que debe)
const privateCenterPrice = (G, f) => firmValue(G, f);
// Nacionalizar: el gobierno compra la empresa por lo que vale (paga también su deuda con el banco); los dueños
// se quedan el dinero y la plantilla pasa a ser personal público
function nationalizeCenter(G, id, owner) {
  const f = G.firms.find(x => x.id === id);
  if (!f || f.pub != null || (f.kind !== 'sanidad' && f.kind !== 'educacion')) return { ok: false, msg: 'Esa empresa no es un centro sanitario o educativo privado.' };
  if (f.obra) return { ok: false, msg: 'Aún está en obras.' };
  if (owner !== 'estado' && f.c !== owner) return { ok: false, msg: 'Ese centro no está en tu cantón.' };
  const price = privateCenterPrice(G, f), debt = Math.max(0, f.debt || 0);
  const books = bankBooks(G), b = books.get(f.bk);
  if (b && debt > 0) { b.f.cash += debt; }
  const os = ownersOf(f).map(oid => G.citizens.find(z => z.id === oid)).filter(Boolean);
  os.forEach(z => { z.sav = (z.sav || 0) + price / Math.max(1, os.length); if (z.emp && z.firm === f.id) { dropJob(z); z.ue = 0; } });
  const cap = firmCap(f);
  const cost = (price + debt) / 1e6;
  if (owner === 'estado') G.eco.centersBuyQ = (G.eco.centersBuyQ || 0) + cost; else G.cantons[owner].centersBuyQ = (G.cantons[owner].centersBuyQ || 0) + cost;
  f.pub = owner; f.ctype = f.kind === 'sanidad' ? 'centroSalud' : 'colegio'; f.capX = Math.max(cap, PUBLIC_CENTERS[f.ctype].cap);
  f.owner = null; delete f.owners; f.cash = 0; f.debt = 0; f.vac = []; f.plazas = null; f.pay = null; f.loss = 0;
  delete f.tgt; delete f.crisisQ; delete f.acct;
  f.name = f.name + ' (pública)';
  G.citizens.forEach(cz => { if (cz.emp && cz.firm === f.id) { cz.wg = centerWage(G, f, cz.prof); cz.pb = 1; } });
  return { ok: true, firm: f, price, cost };
}
// Privatizar: el centro sale a subasta. Cada persona con ahorros calcula lo que ganaría llevándolo como
// clínica o colegio privado (con su plantilla, cobrando a quien no le llega lo público); si le sale a cuenta
// frente a lo que ganaría trabajando, puja lo que valen tres años de ese beneficio (como mucho, lo que tiene).
// Se lo queda quien más puja; si nadie puja, la subasta queda desierta.
function privatizeCenter(G, id, owner) {
  const f = G.firms.find(x => x.id === id);
  if (!f || f.pub == null || !PUBLIC_CENTERS[f.ctype] || !['sanidad', 'educacion'].includes(PUBLIC_CENTERS[f.ctype].sector)) return { ok: false, msg: 'Solo se pueden privatizar centros de salud, hospitales, colegios y universidades.' };
  if (f.pub !== owner) return { ok: false, msg: 'Ese centro no depende de tu gobierno.' };
  if (f.obra) return { ok: false, msg: 'Aún está en obras.' };
  const kind = PUBLIC_CENTERS[f.ctype].sector, S = SERVICE[kind], c = G.cantons[f.c];
  const ws = G.citizens.filter(cz => cz.emp && cz.firm === f.id);
  const n = Math.max(1, ws.length);
  const capF = n * S.per;
  // clientes: lo que ya no cubre lo público (la mitad de su capacidad pasaría a pagar) y la demanda privada sin atender
  const privCap = sum(G.firms.filter(x => x.c === f.c && x.pub == null && x.kind === kind), x => (x.staffN || 0) * S.per);
  const unmet = Math.max(0, ((c.privDemand || {})[kind] || 0) - privCap);
  const served = Math.min(capF, capF * 0.5 + unmet);
  const nomF = 1 + nomRate(G, c);
  const wages = sum(ws, cz => Math.max(cz.wg || 0, (G.pol.salarioMin || 0.45) * (G.eco.avgWage || 26))) * nomF;
  const profitY = (served * S.fee - wages) * (1 - totTax(G, 'sociedades'));
  const own = ownerIds(G);
  let best = null, second = 0, bidders = 0;
  for (const cz of G.citizens) {
    if (!inLaborForce(cz) || cz.age < 25 || cz.age > 64 || own.has(cz.id) || !(cz.sav > 10)) continue;
    // lo que ganaría (el dueño se lleva la mayor parte del beneficio) frente a su vara
    if (profitY * 0.85 < outsideOption(G, cz) * 1.2) continue;
    const bid = Math.min(profitY * 3, (cz.sav || 0) - 3);
    if (bid <= 0) continue;
    bidders++;
    if (!best || bid > best.bid) { second = best ? best.bid : 0; best = { cz, bid }; } else if (bid > second) second = bid;
  }
  if (!best) return { ok: false, msg: `Subasta desierta: nadie ve rentable llevar ${f.name} como centro privado (ganaría unos ${fmt.int(Math.max(0, profitY) * 1000 / 12)} €/mes).`, deserted: true };
  const buyer = best.cz, price = best.bid;
  buyer.sav -= price;
  const income = price / 1e6;
  if (owner === 'estado') G.eco.centersSellQ = (G.eco.centersSellQ || 0) + income; else G.cantons[owner].centersSellQ = (G.cantons[owner].centersSellQ || 0) + income;
  const K = FIRM_KINDS[kind];
  f.pub = null; delete f.ctype; delete f.capX; delete f.plazas; delete f.pay; delete f.target;
  f.kind = kind; f.lvl = clamp(Math.ceil(ws.length / K.cap), 1, MAX_LVL); f.born = G.turn || 0; f.opened = G.turn || 0;
  f.cash = Math.max(5, wages * QF * 0.5); f.debt = 0; f.loss = 0; f.vac = []; f.tgt = ws.length; f.bk = buyer.bk;
  f.name = f.name.replace(/ \(pública\)$/, '').replace(/^(Centro de salud|Hospital|Colegio público|Universidad) de /, (m, t) => ({ 'Centro de salud': 'Clínica', 'Hospital': 'Hospital privado', 'Colegio público': 'Colegio', 'Universidad': 'Universidad privada' })[t] + ' ') + ` ${surnameOf(buyer.nm)}`;
  f.owners = []; f.owner = null;
  // si hay más trabajadores de los que caben en una empresa privada de nivel 6, los que sobran van al paro
  const capP = K.cap * f.lvl;
  if (ws.length > capP) ws.slice(capP).forEach(cz => { dropJob(cz); cz.ue = 0; });
  ws.forEach(cz => { if (cz.emp && cz.firm === f.id) cz.pb = 0; });
  addPartner(G, f, buyer);
  return { ok: true, firm: f, price, buyer, bidders };
}

// ---------- empresas públicas: lo que puede hacer el gobierno que las tiene ----------
// Lo que produce una empresa (las explotaciones agrícolas, grano o tejido)
const peOutputs = f => Object.keys((f.kind === 'agricultura' && f.product === 'tejido' ? FIRM_KINDS[f.kind].alt : FIRM_KINDS[f.kind].out) || {});
// Parte del empleo (fuera de los servicios públicos) que tienen las empresas públicas, y lo que permite la ley
// (add: empleos que se sumarían; addAll: si también son empleos nuevos en el total)
function peShare(G, add = 0, addAll = false) {
  const byF = new Map(G.firms.map(f => [f.id, f]));
  let pe = 0, all = 0;
  for (const cz of G.citizens) { if (!cz.emp) continue; const f = byF.get(cz.firm); if (!f || isCenterF(f)) continue; all++; if (isPE(f)) pe++; }
  const lim = PE_LIMIT[G.pol.empresasPublicas ?? 2] ?? 1;
  return { pe, all, share: pe / Math.max(1, all), after: (pe + add) / Math.max(1, all + (addAll ? add : 0)), limit: lim };
}
// Lo que paga un gobierno por comprar, construir o ampliar empresas públicas (miles de millones, este trimestre)
function addPeBuy(G, owner, bn) { if (owner === 'estado') G.eco.peBuyQ = (G.eco.peBuyQ || 0) + bn; else if (G.cantons[owner]) G.cantons[owner].peBuyQ = (G.cantons[owner].peBuyQ || 0) + bn; }
const peLawMsg = s => s.limit <= 0 ? 'La ley del sector público no permite empresas públicas («Privatización total»).'
  : `La ley del sector público solo permite que las empresas públicas tengan el ${fmt.pct(s.limit, 0)} del empleo (ya tienen el ${fmt.pct(s.share, 1)}).`;
// Crear una empresa pública: el gobierno encarga el edificio (se paga una vez) y, cuando esté, contrata
function createPublicFirm(G, kind, q, r, owner) {
  const K = FIRM_KINDS[kind], h = hexAtG(G, q, r);
  if (!K || !PE_KINDS.includes(kind)) return { ok: false, msg: 'No se puede crear una empresa pública de ese tipo.' };
  if (!h || h.c !== (G.ci || 0) || h.t === 'mar') return { ok: false, msg: 'Ese terreno no es válido.' };
  if (owner !== 'estado' && h.k !== owner) return { ok: false, msg: 'Ese terreno no es de tu cantón.' };
  if (!freeSlots(G, kind, h.k).includes(h)) return { ok: false, msg: `Ahí no cabe una ${K.name.toLowerCase()}: no es buen sitio o no quedan parcelas libres.` };
  const sh = peShare(G, K.cap, true);
  if (sh.after > sh.limit + 1e-9) return { ok: false, msg: peLawMsg(sh) };
  const build = (K.capex || 100) * wageFactor(G);
  const masc = ['medios', 'gimnasio', 'comercio'].includes(kind);
  const f = newFirm(G, kind, h, null, { pub: owner, pe: 1, fp: {}, name: `${K.name} ${masc ? 'público' : 'pública'} de ${placeName(G, h)}` });
  contractBuilding(G, f, build, h.k);
  addPeBuy(G, owner, build / 1e6);
  return { ok: true, firm: f, cost: build / 1e6 };
}
// Nacionalizar una empresa: el gobierno la compra por lo que vale (y paga su deuda con el banco). Los dueños se
// quedan el dinero; la plantilla pasa a ser funcionaria
function nationalizeFirm(G, id, owner) {
  const f = G.firms.find(x => x.id === id);
  if (!f || f.pub != null || !PE_KINDS.includes(f.kind)) return { ok: false, msg: 'Esa empresa no se puede nacionalizar.' };
  if (f.obra) return { ok: false, msg: 'Aún está en obras.' };
  if (owner !== 'estado' && f.c !== owner) return { ok: false, msg: 'Esa empresa no está en tu cantón.' };
  const ws = G.citizens.filter(cz => cz.emp && cz.firm === f.id);
  const os = ownersOf(f).map(oid => G.citizens.find(z => z.id === oid)).filter(Boolean);
  const sh = peShare(G, ws.length - os.filter(z => z.emp && z.firm === f.id).length);
  if (sh.after > sh.limit + 1e-9) return { ok: false, msg: peLawMsg(sh) };
  const price = firmValue(G, f), debt = Math.max(0, f.debt || 0);
  const b = bankBooks(G).get(f.bk);
  if (b && debt > 0) b.f.cash += debt;
  os.forEach(z => { z.sav = (z.sav || 0) + price / Math.max(1, os.length); if (z.emp && z.firm === f.id) { dropJob(z); z.ue = 0; } });
  const cost = (price + debt) / 1e6;
  addPeBuy(G, owner, cost);
  f.pub = owner; f.pe = 1; f.fp = {}; f.owner = null; delete f.owners;
  f.cash = 0; f.debt = 0; f.vac = []; f.plazas = null; f.pay = null; f.loss = 0;
  ['tgt', 'crisisQ', 'vara', 'noPartner', 'dying', 'why', 'invQ'].forEach(k => { delete f[k]; });
  f.name = f.name + ' (pública)';
  G.citizens.forEach(cz => { if (cz.emp && cz.firm === f.id) { cz.wg = centerWage(G, f, cz.prof); cz.pb = 1; } });
  f.staffN = G.citizens.filter(cz => cz.emp && cz.firm === f.id).length;
  return { ok: true, firm: f, price, cost };
}
// Lo que un particular espera ganar al año llevando la empresa (a precios de mercado, con sueldos de mercado)
function privateProfitOf(G, f, ws) {
  const c = G.cantons[f.c], nomF = 1 + nomRate(G, c), minW = (G.pol.salarioMin || 0.45) * (G.eco.avgWage || 26);
  const wages = sum(ws, cz => Math.max(refWage(G, cz.prof), minW)) * nomF;
  let rev = f.mktRevY || 0, inp = f.inputsY || 0;
  if (!(rev > 0)) { const n = Math.max(1, ws.length); return { profitY: (expectedVaw(G, f.kind, f.c, f) * n - wages) * (1 - totTax(G, 'sociedades')), wages }; }
  return { profitY: (rev - inp - wages - ((f.acct && f.acct.carbon) || 0)) * (1 - totTax(G, 'sociedades')), wages };
}
// Privatizar: la empresa sale a subasta (como los centros): puja quien la vea rentable y se la queda quien más pague
function privatizeFirm(G, id, owner) {
  const f = G.firms.find(x => x.id === id);
  if (!f || !isPE(f)) return { ok: false, msg: 'Esa empresa no es pública.' };
  if (f.pub !== owner) return { ok: false, msg: 'Esa empresa no es de tu gobierno.' };
  if (f.obra) return { ok: false, msg: 'Aún está en obras.' };
  const ws = G.citizens.filter(cz => cz.emp && cz.firm === f.id);
  const { profitY, wages } = privateProfitOf(G, f, ws);
  const own = ownerIds(G);
  let best = null, bidders = 0;
  for (const cz of G.citizens) {
    if (!inLaborForce(cz) || cz.age < 25 || cz.age > 64 || own.has(cz.id) || !(cz.sav > 10)) continue;
    if (profitY * 0.85 < outsideOption(G, cz) * 1.2) continue;
    const bid = Math.min(profitY * 3, (cz.sav || 0) - 3);
    if (bid <= 0) continue;
    bidders++;
    if (!best || bid > best.bid) best = { cz, bid };
  }
  if (!best) return { ok: false, msg: `Subasta desierta: nadie ve rentable llevar ${f.name} como empresa privada (ganaría unos ${fmt.int(Math.max(0, profitY) * 1000 / 12)} €/mes a precios de mercado).`, deserted: true };
  const buyer = best.cz, price = best.bid;
  buyer.sav -= price;
  if (owner === 'estado') G.eco.centersSellQ = (G.eco.centersSellQ || 0) + price / 1e6; else G.cantons[owner].centersSellQ = (G.cantons[owner].centersSellQ || 0) + price / 1e6;
  const K = FIRM_KINDS[f.kind];
  f.pub = null; ['pe', 'fp', 'plazas', 'pay', 'target', 'mktRevY'].forEach(k => { delete f[k]; });
  f.opened = G.turn || 0; f.cash = Math.max(5, wages * QF * 0.5); f.debt = 0; f.loss = 0; f.vac = []; f.tgt = ws.length; f.bk = buyer.bk;
  f.name = / \(pública\)$/.test(f.name) ? f.name.replace(/ \(pública\)$/, '') : firmName(K, buyer);
  f.owners = []; f.owner = null;
  ws.forEach(cz => { if (cz.emp && cz.firm === f.id) cz.pb = 0; });
  addPartner(G, f, buyer);
  return { ok: true, firm: f, price, buyer, bidders };
}
// Precios de una empresa pública: { bien: €/u (null: el de mercado) }
function setPEPrices(G, id, owner, prices) {
  const f = G.firms.find(x => x.id === id);
  if (!f || !isPE(f)) return { ok: false, msg: 'Esa empresa no es pública.' };
  if (f.pub !== owner) return { ok: false, msg: 'Esa empresa no es de tu gobierno.' };
  const outs = peOutputs(f), fp = {};
  for (const g in prices || {}) {
    if (!outs.includes(g) || prices[g] == null || prices[g] === '') continue;
    const v = +prices[g] / 1000, ref = worldPrice(G, g);
    if (!isFinite(v) || v <= 0) return { ok: false, msg: `Precio no válido para ${GOODS[g].name.toLowerCase()}.` };
    fp[g] = clamp(v, ref * 0.05, ref * PRICE_MAX);
  }
  f.fp = fp;
  return { ok: true, firm: f };
}
// Ampliar una empresa pública un nivel (más plazas): la obra la paga su gobierno
function upgradePublicFirm(G, id, owner) {
  const f = G.firms.find(x => x.id === id);
  if (!f || !isPE(f)) return { ok: false, msg: 'Esa empresa no es pública.' };
  if (f.pub !== owner) return { ok: false, msg: 'Esa empresa no es de tu gobierno.' };
  if (f.obra) return { ok: false, msg: 'Aún está en obras.' };
  if (f.upg) return { ok: false, msg: 'Ya se está ampliando.' };
  const K = FIRM_KINDS[f.kind];
  if ((f.lvl || 1) >= (K.maxLvl || MAX_LVL)) return { ok: false, msg: 'Ya tiene el tamaño máximo.' };
  const sh = peShare(G, K.cap, true);
  if (sh.after > sh.limit + 1e-9) return { ok: false, msg: peLawMsg(sh) };
  const cost = scaleCost(G, f);
  contractUpgrade(G, f, cost);
  addPeBuy(G, owner, cost / 1e6);
  return { ok: true, firm: f, cost: cost / 1e6 };
}
