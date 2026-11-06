// ============================================================
//  GENERACIÓN DEL MUNDO
//  Mapa hexagonal -> países -> cantones -> recursos -> ciudadanos
// ============================================================
'use strict';

const MAP_W = 46, MAP_H = 34, MAP_PAD = 3;   // margen de mar alrededor de la tierra
const SEA_REACH = 3;   // hasta dónde llega el mar dibujado (en hexágonos desde la costa)
const WATERS = 2;      // aguas territoriales: hasta 2 hexágonos de la costa
const FOREIGN_LEADERS = ['Henrik Vass', 'Amara Okoye', 'Lorenzo Bassi', 'Ingrid Holm', 'Pierre Lacombe', 'Mila Novak', 'Tariq Haddad', 'Sofía Arce', 'Jonas Weber', 'Yara Costa'];
let MAP_FAIL = '';

// --- Geometría hexagonal (pointy-top, filas impares desplazadas) ---
const HEX = {
  neighbors(q, r) {
    const odd = r & 1;
    const d = odd
      ? [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]
      : [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
    return d.map(([dq, dr]) => [q + dq, r + dr]);
  },
  toCube(q, r) { const x = q - (r - (r & 1)) / 2; const z = r; return [x, -x - z, z]; },
  dist(a, b) {
    const A = HEX.toCube(a.q, a.r), B = HEX.toCube(b.q, b.r);
    return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
  },
  center(q, r, size) { return [size * Math.sqrt(3) * (q + 0.5 * (r & 1)) + size, size * 1.5 * r + size]; },
  corners(cx, cy, size) {
    return range(6).map(i => { const a = Math.PI / 180 * (60 * i - 30); return [cx + size * Math.cos(a), cy + size * Math.sin(a)]; });
  },
};

// Campo de "ruido" a base de manchas gaussianas
function blobField(n, sigmaMin, sigmaMax) {
  const blobs = range(n).map(() => ({ x: RNG.range(0, MAP_W), y: RNG.range(0, MAP_H), s: RNG.range(sigmaMin, sigmaMax), a: RNG.range(0.4, 1) }));
  return (q, r) => {
    let v = 0;
    for (const b of blobs) { const dx = q - b.x, dy = (r - b.y) * 1.1; v += b.a * Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s)); }
    return v;
  };
}

function generateMap(nCountries, nCantons) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const res = tryGenerateMap(nCountries, nCantons);
    if (res) return res;
  }
  throw new Error('No se pudo generar el mapa: ' + MAP_FAIL);
}

// Mundo con un continente principal, a veces otro continente al otro lado del mar, e islas.
// Devuelve hexágonos con país (c) y cantón (k, -1 si ese país no tiene cantones).
function tryGenerateMap(nCountries, nCantons) {
  const hexes = [];
  const idx = (q, r) => r * MAP_W + q;
  const inside = (q, r) => q >= 0 && r >= 0 && q < MAP_W && r < MAP_H;
  const nForeign = nCountries - 1;
  // 1) Tierra: continentes e islas
  // la tierra ocupa la zona interior; alrededor queda un margen de mar
  const IW = MAP_W - 2 * MAP_PAD, IH = MAP_H - 2 * MAP_PAD, X = f => MAP_PAD + f * IW, Y = f => MAP_PAD + f * IH;
  const conts = [{ x: X(RNG.range(0.30, 0.42)), y: Y(RNG.range(0.42, 0.58)), rx: RNG.range(0.22, 0.28) * IW, ry: RNG.range(0.31, 0.38) * IH }];
  const second = nForeign >= 3 && RNG.chance(0.7);
  if (second) conts.push({ x: X(RNG.range(0.80, 0.87)), y: Y(RNG.range(0.32, 0.68)), rx: RNG.range(0.08, 0.12) * IW, ry: RNG.range(0.17, 0.28) * IH });
  const isl = range(RNG.int(4, 8)).map(() => ({ x: X(RNG.range(0.05, 0.95)), y: Y(RNG.range(0.08, 0.92)), rx: RNG.range(1.1, 2.8), ry: RNG.range(1.1, 2.6) }));
  const bumps = blobField(12, 2, 4.5);
  for (let r = 0; r < MAP_H; r++) for (let q = 0; q < MAP_W; q++) {
    let v = -9;
    for (const c of conts) { const dx = (q - c.x) / c.rx, dy = (r - c.y) / c.ry; v = Math.max(v, 1 - Math.sqrt(dx * dx + dy * dy)); }
    for (const c of isl) { const dx = (q - c.x) / c.rx, dy = (r - c.y) / c.ry; v = Math.max(v, (1 - Math.sqrt(dx * dx + dy * dy)) * 0.8); }
    v += bumps(q, r) * 0.18 - 0.08 + RNG.range(-0.07, 0.07);
    hexes.push({ q, r, land: v > 0.1, country: -1, canton: -1, comp: -1 });
  }
  hexes.forEach(hx => { if (hx.q < MAP_PAD || hx.r < MAP_PAD || hx.q >= MAP_W - MAP_PAD || hx.r >= MAP_H - MAP_PAD) hx.land = false; });
  // 2) Masas de tierra (componentes conexas)
  const comps = [];
  for (const hx of hexes) {
    if (!hx.land || hx.comp >= 0) continue;
    const list = []; const stack = [hx]; hx.comp = comps.length;
    while (stack.length) {
      const cur = stack.pop(); list.push(cur);
      for (const [nq, nr] of HEX.neighbors(cur.q, cur.r)) {
        if (!inside(nq, nr)) continue; const n = hexes[idx(nq, nr)];
        if (n.land && n.comp < 0) { n.comp = hx.comp; stack.push(n); }
      }
    }
    comps.push(list);
  }
  // fuera los islotes de un solo hexágono
  comps.forEach(list => { if (list.length < 2) list.forEach(h => { h.land = false; h.comp = -1; }); });
  const order = comps.map((l, i) => i).filter(i => comps[i].length >= 2).sort((a, b) => comps[b].length - comps[a].length);
  const main = comps[order[0]];
  if (main.length < 200) { MAP_FAIL = 'main ' + main.length; return null; }
  const secondComp = second && order[1] !== undefined && comps[order[1]].length >= 35 ? comps[order[1]] : null;
  const islandComps = order.slice(secondComp ? 2 : 1).map(i => comps[i]);

  // 3) Reparto de países: continente principal, el otro continente y naciones isleñas
  let onSecond = secondComp ? (secondComp.length >= 80 && nForeign >= 4 ? 2 : 1) : 0;
  const bigIslands = islandComps.filter(l => l.length >= 5);
  let islandNations = Math.min(bigIslands.length, nForeign - onSecond - 1 >= 1 ? RNG.int(0, 2) : 0);
  let onMain = nForeign - onSecond - islandNations;
  if (onMain < 1) { MAP_FAIL = 'reparto'; return null; }
  const farthestSeeds = (pool, first, n) => {
    const seeds = first ? [first] : [RNG.pick(pool)];
    while (seeds.length < n) {
      let cand = null, bestD = -1;
      for (let k = 0; k < 60; k++) { const hx = RNG.pick(pool); const d = Math.min(...seeds.map(sd => HEX.dist(sd, hx))) + RNG.range(0, 2); if (d > bestD) { bestD = d; cand = hx; } }
      seeds.push(cand);
    }
    return seeds;
  };
  const mq = avg(main, h => h.q), mr = avg(main, h => h.r);
  const ourSeed = main.slice().sort((a, b) => HEX.dist(a, { q: Math.round(mq), r: Math.round(mr) }) - HEX.dist(b, { q: Math.round(mq), r: Math.round(mr) }))[RNG.int(0, 6)];
  const mainSeeds = farthestSeeds(main, ourSeed, 1 + onMain);
  // tamaños muy distintos: algunos vecinos pequeños, otros enormes
  const sizeF = mainSeeds.map((_, i) => i === 0 ? RNG.range(0.85, 1.0) : RNG.range(0.55, 1.7));
  partition(hexes, main, mainSeeds, 'country', i => sizeF[i], idx, inside);
  let next = 1 + onMain;
  const kinds = {}; for (let i = 1; i <= onMain; i++) kinds[i] = 'vecino';
  if (secondComp) {
    const sd = farthestSeeds(secondComp, null, onSecond);
    const base = next;
    partition(hexes, secondComp, sd, 'country', () => RNG.range(0.8, 1.25), idx, inside);
    secondComp.forEach(h => { h.country += base; });
    for (let i = 0; i < onSecond; i++) kinds[base + i] = 'continente';
    next += onSecond;
  }
  const ourMain = main.filter(h => h.country === 0);
  RNG.shuffle(bigIslands).filter(l => Math.min(...l.map(h => Math.min(...ourMain.filter((_, k) => k % 3 === 0).map(o => HEX.dist(o, h))))) > 3).slice(0, islandNations)
    .forEach(l => { l.forEach(h => { h.country = next; }); kinds[next] = 'isla'; next++; });
  if (next !== nCountries) { MAP_FAIL = 'islas ' + next; return null; }
  // el resto de islas pertenecen al país más cercano
  const assigned = hexes.filter(h => h.land && h.country >= 0);
  islandComps.forEach(l => {
    if (l[0].country >= 0) return;
    let best = null, bd = Infinity;
    for (const h of l) for (const a of assigned) { const d = HEX.dist(h, a); if (d < bd) { bd = d; best = a.country; } }
    l.forEach(h => { h.country = best; });
  });

  // 4) Nuestro país y sus cantones (puede incluir un cantón insular)
  const own = hexes.filter(hx => hx.land && hx.country === 0);
  const ownMain = own.filter(h => main.includes(h)), ownIsl = own.filter(h => !main.includes(h));
  if (ownMain.length < Math.max(45, nCantons * 11) || ownMain.length > main.length * 0.55) { MAP_FAIL = 'own ' + ownMain.length + '/' + main.length; return null; }
  for (let i = 1; i < nCountries; i++) if (hexes.filter(hx => hx.land && hx.country === i).length < (kinds[i] === 'isla' ? 5 : 14)) { MAP_FAIL = 'foreign ' + i; return null; }
  const islandCanton = ownIsl.length >= 3 && nCantons >= 3;
  const mainlandC = islandCanton ? nCantons - 1 : nCantons;
  const cSeeds = farthestSeeds(ownMain, null, mainlandC);
  partition(hexes, ownMain, cSeeds, 'canton', () => RNG.range(0.85, 1.15), idx, inside);
  for (let i = 0; i < mainlandC; i++) if (ownMain.filter(hx => hx.canton === i).length < 6) { MAP_FAIL = 'canton'; return null; }
  if (islandCanton) ownIsl.forEach(h => { h.canton = nCantons - 1; });
  else ownIsl.forEach(h => { let best = 0, bd = Infinity; for (const o of ownMain) { const d = HEX.dist(o, h); if (d < bd) { bd = d; best = o.canton; } } h.canton = best; });

  // 5) Cantones de los países extranjeros (no todos tienen)
  const foreignCantons = {};
  for (let fi = 1; fi < nCountries; fi++) {
    const fh = hexes.filter(h => h.land && h.country === fi);
    const compsOf = {}; fh.forEach(h => { (compsOf[h.comp] = compsOf[h.comp] || []).push(h); });
    const parts = Object.values(compsOf).sort((a, b) => b.length - a.length);
    if (fh.length < 22 || !RNG.chance(0.7)) { fh.forEach(h => { h.canton = -1; }); foreignCantons[fi] = 0; continue; }
    let nc = clamp(Math.round(parts[0].length / 13), 2, 5);
    const sd = farthestSeeds(parts[0], null, nc);
    partition(hexes, parts[0], sd, 'canton', () => RNG.range(0.8, 1.2), idx, inside);
    parts.slice(1).forEach(pt => {
      if (pt.length >= 3 && nc < 6) { pt.forEach(h => { h.canton = nc; }); nc++; }
      else pt.forEach(h => { let best = 0, bd = Infinity; for (const o of parts[0]) { const d = HEX.dist(o, h); if (d < bd) { bd = d; best = o.canton; } } h.canton = best; });
    });
    foreignCantons[fi] = nc;
  }

  // 6) Terreno: tipo de suelo (hierba, arena, roca), relieve y contenidos
  const elev = blobField(12, 1.5, 3.5), moist = blobField(12, 2, 4), mins = blobField(16, 1, 2.5), fish = blobField(10, 1.5, 3), coal = blobField(14, 1, 2.5);
  const nb = hx => HEX.neighbors(hx.q, hx.r).map(([nq, nr]) => inside(nq, nr) ? hexes[idx(nq, nr)] : null);
  for (const hx of hexes) {
    if (!hx.land) continue;
    hx.e = elev(hx.q, hx.r) * 0.6 + RNG.range(0, 0.25);
    hx.m = moist(hx.q, hx.r) * 0.6 + RNG.range(0, 0.3);
  }
  // relieve relativo: las zonas más altas de cada mapa son montaña (≈6 %) y las siguientes, colinas (≈16 %)
  const elevSorted = hexes.filter(h => h.land).map(h => h.e).sort((a, b) => a - b);
  const eq = p => elevSorted[Math.min(elevSorted.length - 1, Math.floor(p * elevSorted.length))];
  const eMont = Math.min(0.74, eq(0.94)), eHill = Math.min(0.56, eq(0.78));
  for (const hx of hexes) {
    hx.f = [];
    if (!hx.land) { hx.terrain = 'mar'; hx.country = -1; hx.canton = -1; continue; }
    const e = hx.e, m = hx.m;
    hx.coast = nb(hx).some(n => !n || !n.land);
    hx.relief = e > eMont ? 'montana' : e > eHill ? 'colinas' : 'llano';
    hx.terrain = hx.relief === 'montana' ? 'roca'
      : hx.relief === 'colinas' && m < 0.3 ? 'roca'
      : m < 0.11 ? 'arena'
      : hx.coast && hx.relief === 'llano' && RNG.chance(0.22) ? 'arena'
      : 'hierba';
    if (hx.terrain === 'hierba' && m > 0.62) hx.f.push('bosque');
    if ((hx.relief !== 'llano' || hx.terrain === 'roca') && mins(hx.q, hx.r) > (hx.terrain === 'roca' ? 0.25 : 0.35) && RNG.chance(0.65)) hx.f.push('mina');
    else if (hx.relief !== 'montana' && !hx.f.includes('bosque') && coal(hx.q, hx.r) > (hx.relief === 'colinas' ? 0.4 : 0.6) && RNG.chance(0.55)) hx.f.push('carbon');
  }
  // en el mundo siempre hay algo de carbón y de minas (repartidos: sin ellos no hay electricidad ni máquinas)
  {
    const nLand = hexes.filter(h => h.land).length, min = Math.max(4, Math.round(nLand / 70));
    const ensure = (feat, ok, score) => {
      let have = hexes.filter(h => h.f && h.f.includes(feat)).length;
      if (have >= min) return;
      const cands = hexes.filter(h => h.land && ok(h) && !h.f.includes('mina') && !h.f.includes('carbon') && !h.f.includes('bosque')).sort((a, b) => score(b) - score(a));
      for (const h of cands) {
        if (have >= min) break;
        if (hexes.some(o => o.f && o.f.includes(feat) && HEX.dist(o, h) <= 3)) continue;
        h.f.push(feat); have++;
      }
    };
    ensure('carbon', h => h.relief !== 'montana', h => coal(h.q, h.r));
    ensure('mina', h => h.relief !== 'llano' || h.terrain === 'roca', h => mins(h.q, h.r));
  }
  // Ríos: nacen en zonas altas y bajan hacia la costa más cercana
  const landH = hexes.filter(h => h.land);
  const toSea = new Map(); let frontier = landH.filter(h => h.coast); frontier.forEach(h => toSea.set(h, 0));
  for (let d = 1; frontier.length; d++) {
    const nx = [];
    frontier.forEach(h => nb(h).forEach(n => { if (n && n.land && !toSea.has(n)) { toSea.set(n, d); nx.push(n); } }));
    frontier = nx;
  }
  const sources = landH.filter(h => toSea.get(h) >= 2).map(h => ({ h, k: h.e + toSea.get(h) * 0.08 + RNG.range(0, 0.3) })).sort((a, b) => b.k - a.k).map(o => o.h);
  const nRivers = clamp(Math.round(landH.length / 85), 3, 10);
  let rivers = 0;
  for (const src of sources) {
    if (rivers >= nRivers) break;
    if (landH.some(h => h.rv && HEX.dist(h, src) <= 2)) continue;
    const path = [src]; let cur = src;
    while (true) {
      const d = toSea.get(cur);
      const ns = nb(cur);
      if (d === 0) {
        const k = ns.findIndex(n => !n || !n.land);
        path.push({ mouth: k }); break;
      }
      const cand = ns.map((n, k) => ({ n, k })).filter(o => o.n && o.n.land && toSea.get(o.n) === d - 1);
      if (!cand.length) break;
      const nxt = cand.sort((a, b) => (a.n.e + RNG.range(0, 0.15)) - (b.n.e + RNG.range(0, 0.15)))[0];
      path.push(nxt.n);
      if (nxt.n.rv) break;   // desemboca en otro río
      cur = nxt.n;
    }
    if (path.length < 3) continue;
    rivers++;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      a.rv = a.rv || [];
      if (b.mouth !== undefined) { a.rv.push(b.mouth); continue; }
      const k = nb(a).indexOf(b);
      a.rv.push(k); b.rv = b.rv || []; b.rv.push((k + 3) % 6);
    }
  }
  landH.forEach(h => {
    if (h.rv) { if (!h.f.includes('rio')) h.f.push('rio'); if (h.terrain === 'arena' && !h.coast) h.terrain = 'hierba'; }
    // campos de cultivo en llanuras de hierba, sobre todo junto a los ríos
    if (h.terrain === 'hierba' && h.relief === 'llano' && !h.f.includes('bosque') && h.m > 0.28 && RNG.chance(h.rv || nb(h).some(n => n && n.rv) ? 0.75 : 0.3)) h.f.push('cultivo');
  });

  // 7) Mar: solo se dibuja cerca de la costa. Las aguas a ≤2 hexágonos son del país más cercano (o están en disputa si empatan)
  const seaDist = new Map(); const dByCountry = range(nCountries).map(() => new Map());
  frontier = landH.slice(); frontier.forEach(h => seaDist.set(h, 0));
  for (let d = 1; d <= SEA_REACH && frontier.length; d++) {
    const nx = [];
    frontier.forEach(h => nb(h).forEach(n => { if (n && !n.land && !seaDist.has(n)) { seaDist.set(n, d); nx.push(n); } }));
    frontier = nx;
  }
  for (let ci = 0; ci < nCountries; ci++) {
    const dm = dByCountry[ci]; let fr = landH.filter(h => h.country === ci); fr.forEach(h => dm.set(h, 0));
    for (let d = 1; d <= WATERS && fr.length; d++) {
      const nx = [];
      fr.forEach(h => nb(h).forEach(n => { if (n && !n.land && !dm.has(n)) { dm.set(n, d); nx.push(n); } }));
      fr = nx;
    }
  }
  hexes.forEach(h => {
    if (h.land) return;
    h.sea = seaDist.get(h) || 0;
    if (!h.sea) return;
    let best = Infinity, who = [];
    dByCountry.forEach((dm, ci) => { const d = dm.get(h); if (d === undefined) return; if (d < best) { best = d; who = [ci]; } else if (d === best) who.push(ci); });
    h.owner = who.length === 1 ? who[0] : -1;
    if (who.length > 1) h.disputed = who.slice(0, 2);
    if (h.sea <= 2 && fish(h.q, h.r) > 0.55 && RNG.chance(0.35)) h.f.push('pesca');
  });
  // 8) Ninguna isla queda flotando: todo lo dibujado (tierra y mar) forma una sola pieza.
  //    Si un grupo queda suelto, se une al resto con un canal de mar abierto.
  connectRendered(hexes, nb);
  return { hexes, kinds, foreignCantons, islandCanton };
}

function connectRendered(hexes, nb) {
  const shown = h => h.land || h.sea > 0;
  for (let guard = 0; guard < 30; guard++) {
    // grupos conexos de casillas dibujadas
    const comp = new Map(); const groups = [];
    for (const h of hexes) {
      if (!shown(h) || comp.has(h)) continue;
      const list = [h]; comp.set(h, groups.length);
      for (let i = 0; i < list.length; i++) nb(list[i]).forEach(n => { if (n && shown(n) && !comp.has(n)) { comp.set(n, groups.length); list.push(n); } });
      groups.push(list);
    }
    if (groups.length <= 1) return;
    const mainG = groups.reduce((a, g, i) => g.length > groups[a].length ? i : a, 0);
    const lone = groups.find((g, i) => i !== mainG);
    // camino más corto desde el grupo suelto hasta el resto
    const prev = new Map(); const queue = lone.slice(); lone.forEach(h => prev.set(h, null));
    let hit = null;
    for (let i = 0; i < queue.length && !hit; i++) {
      for (const n of nb(queue[i])) {
        if (!n || prev.has(n)) continue;
        prev.set(n, queue[i]);
        if (shown(n) && comp.get(n) !== comp.get(lone[0])) { hit = n; break; }
        queue.push(n);
      }
    }
    if (!hit) return;
    const channel = [];
    for (let h = prev.get(hit); h && !shown(h); h = prev.get(h)) channel.push(h);
    // canal de tres casillas de ancho, de mar abierto e internacional
    const widen = new Set(channel); channel.forEach(h => nb(h).forEach(n => { if (n && !shown(n)) widen.add(n); }));
    widen.forEach(h => { h.sea = 3; h.owner = -1; h.f = h.f || []; });
  }
}

// Ciudades, pueblos, fábricas y puertos (necesita conocer cantones, población e industria)
function placeSettlements(G, map) {
  const byKey = new Map(map.hexes.map(h => [h.q + ',' + h.r, h]));
  const nbs = h => HEX.neighbors(h.q, h.r).map(([q, r]) => byKey.get(q + ',' + r));
  const at = (q, r) => byKey.get(q + ',' + r);
  const makeCity = (h, name, size, capital) => { h.terrain = 'asfalto'; h.f = h.f.filter(x => x === 'rio'); h.f.push(capital ? 'capital' : 'ciudad'); h.cn = name; h.cs = size; };
  const free = h => h && h.land && !h.cn && !h.f.includes('pueblo') && !h.f.includes('fabrica');
  const grow = (h, n, name) => {
    const ring = nbs(h).filter(x => free(x) && x.country === h.country && x.canton === h.canton && x.terrain !== 'roca');
    RNG.shuffle(ring).slice(0, n).forEach(x => { x.terrain = 'asfalto'; x.f = x.f.filter(y => y === 'rio'); x.f.push('ciudad'); x.cn = name; });
  };
  const towns = (list, n, name) => {
    const cand = RNG.shuffle(list.filter(h => free(h) && h.terrain === 'hierba' && !nbs(h).some(x => x && (x.cn || (x.f || []).includes('pueblo')))));
    cand.sort((a, b) => (b.rv ? 1 : 0) + (b.coast ? 0.6 : 0) - (a.rv ? 1 : 0) - (a.coast ? 0.6 : 0));
    cand.slice(0, n).forEach(h => { h.f = h.f.filter(x => x !== 'cultivo' && x !== 'bosque'); h.f.push('pueblo'); h.cn = cantonNameFrom(RNG.pick(['santo', 'rasgo', 'inventado', 'alto', 'adjetivo'])); });
  };
  const factories = (list, n, name) => {
    const cand = RNG.shuffle(list.filter(h => free(h) && h.terrain !== 'roca' && h.relief === 'llano'));
    cand.sort((a, b) => (nbs(b).some(x => x && x.cn) ? 1 : 0) - (nbs(a).some(x => x && x.cn) ? 1 : 0));
    cand.slice(0, n).forEach(h => { h.terrain = 'asfalto'; h.f = h.f.filter(x => x === 'rio'); h.f.push('fabrica'); h.cn = 'Polígono de ' + name; });
  };
  const port = (list, name) => {
    const coastal = list.filter(h => h.coast && (h.cn || (h.f || []).includes('pueblo')));
    const h = coastal.find(x => x.f.includes('ciudad') || x.f.includes('capital')) || coastal[0] || RNG.pick(list.filter(x => x.coast && free(x)));
    if (h && !h.f.includes('puerto')) h.f.push('puerto');
  };
  // nuestro país
  G.cantons.forEach(c => {
    const list = map.hexes.filter(h => h.land && h.country === 0 && h.canton === c.idx);
    const h = at(c.cityHex[0], c.cityHex[1]);
    const big = c.sizeShare * G.cantons.length;   // >1: más grande que la media
    makeCity(h, c.name, c.capital ? 3 : big > 1.15 ? 2 : 1, c.capital);
    grow(h, clamp(Math.round(big * 1.3) - 1, 0, 3) + (c.capital ? 1 : 0), c.name);
    towns(list, Math.max(1, Math.round(list.length / 9)), c.name);
    factories(list, Math.round(c.industrial * 1.4 + c.urban * 0.6), c.name);
    if (list.some(x => x.coast)) port(list, c.name);
  });
  // países extranjeros (capital de cada cantón o del país)
  G.foreign.forEach(f => {
    const all = map.hexes.filter(h => h.land && h.country === f.mapIndex);
    const groups = f.cantons.length ? f.cantons.map(fc => ({ list: all.filter(h => h.canton === fc.idx), hex: at(fc.cityHex[0], fc.cityHex[1]), name: fc.name })) : [{ list: all, hex: at(f.cityHex[0], f.cityHex[1]), name: f.capitalName }];
    groups.forEach((g, i) => {
      makeCity(g.hex, g.name, i === 0 ? 2 : 1, false);
      grow(g.hex, Math.round(g.list.length / 45) + (i === 0 ? 1 : 0), g.name);
      towns(g.list, Math.max(1, Math.round(g.list.length / 10)), g.name);
      factories(g.list, Math.round(f.dev * g.list.length / 35), g.name);
      if (g.list.some(x => x.coast)) port(g.list, g.name);
    });
  });
}

// Edificios residenciales de cada casilla (fijos: forman parte del mapa)
//   nh: número de casas de un pueblo (una familia en cada una)
//   bb: bloques de pisos de una ciudad, cada uno [plantas, pisos por planta]
function placeBuildings(map) {
  map.hexes.forEach(h => {
    if (!h.land || !h.f) return;
    if (h.f.includes('pueblo')) h.nh = RNG.int(6, 16);
    else if (h.f.includes('ciudad') || h.f.includes('capital')) {
      const center = !!h.cs, size = h.cs || 1;
      const n = center ? 4 + size * 2 : RNG.int(4, 7);
      h.bb = range(n).map(() => [center ? RNG.int(4, 4 + size * 3) : RNG.int(3, 7), RNG.int(2, center ? 4 : 3)]);
    }
  });
}

// Mapa que se envía a los jugadores: tierra y el mar cercano (el mar lejano no existe)
function publicMap(map) {
  const out = [];
  map.hexes.forEach(h => {
    if (!h.land && !h.sea) return;
    const o = { q: h.q, r: h.r, t: h.terrain, c: h.land ? h.country : -1, k: h.land ? h.canton : -1 };
    if (h.land) { o.rel = h.relief; if (h.coast) o.coast = 1; }
    else { o.d = h.sea; o.w = h.owner; if (h.disputed) o.dz = h.disputed; }
    if (h.f && h.f.length) o.f = h.f.slice();
    if (h.rv) o.rv = h.rv.slice();
    if (h.cn) o.cn = h.cn;
    if (h.cs) o.cs = h.cs;
    if (h.nh) o.nh = h.nh;
    if (h.bb) o.bb = h.bb.map(x => x.slice());
    out.push(o);
  });
  return { w: MAP_W, h: MAP_H, hexes: out };
}

// Partición por Dijkstra multi-origen con costes aleatorios
function partition(hexes, pool, seeds, key, factorFn, idx, inside) {
  const allowed = new Set(pool.map(hx => idx(hx.q, hx.r)));
  const dist = new Map();
  const factors = seeds.map((_, i) => factorFn(i));
  const open = [];
  seeds.forEach((sd, i) => { dist.set(idx(sd.q, sd.r), 0); sd[key] = i; open.push({ hx: sd, d: 0, owner: i }); });
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].d < open[bi].d) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.d > (dist.get(idx(cur.hx.q, cur.hx.r)) ?? Infinity)) continue;
    for (const [nq, nr] of HEX.neighbors(cur.hx.q, cur.hx.r)) {
      if (!inside(nq, nr)) continue; const k = idx(nq, nr);
      if (!allowed.has(k)) continue;
      const nd = cur.d + RNG.range(1, 1.7) * factors[cur.owner];
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd); const n = hexes[k]; n[key] = cur.owner; open.push({ hx: n, d: nd, owner: cur.owner });
      }
    }
  }
}

// ============================================================
//  Estado inicial de políticas (aleatorio pero verosímil)
// ============================================================
function initialPolicies(G) {
  const pol = {
    // impuestos del Estado (null = ese impuesto no existe)
    irpf: RNG.pick([0.12, 0.14, 0.16]), irpfPlano: null, nominas: RNG.pick([0.18, 0.20, 0.22]), sociedades: RNG.pick([0.20, 0.25, 0.30]),
    sucesiones: RNG.chance(0.6) ? RNG.pick([0.08, 0.12, 0.15]) : null, iva: RNG.pick([0.16, 0.18, 0.21]), ibi: null, vacias: null,
    carbono: RNG.pick([0, 0, 1]), aranceles: RNG.pick([0, 0.05, 0.10]),
    sub: { sindicatos: RNG.chance(0.5) ? 0.02 : null, ciencia: RNG.chance(0.6) ? RNG.pick([0.4, 0.6, 0.8]) : null, renovables: RNG.chance(0.35) ? 0.15 : null },
    hipotecas: RNG.pick([1, 1, 2]), suelo: RNG.pick([0, 1, 1, 2]), ayudaCompra: RNG.pick([0, 0, 1]), desahucios: RNG.pick([0, 1, 1, 2]),
    solvencia: RNG.pick([1, 1, 2]), garantiaDepositos: RNG.pick([1, 1, 2]), bancoCentral: RNG.pick(['independiente', 'independiente', 'gobierno']),
    salarioMin: RNG.pick([0.35, 0.45, 0.55]), laboral: RNG.pick([1, 2, 3]), desempleo: RNG.pick([1, 2, 3]),
    pensiones: RNG.pick([0.55, 0.65, 0.75]), jubilacion: RNG.pick([65, 67]), rentaBasica: false, empresasPublicas: RNG.pick([1, 2, 3]),
    gasto: { defensa: RNG.pick([1, 1.5, 2]), cultura: RNG.pick([0.5, 0.8]), transferencias: 0 },
    inmigracion: RNG.pick([1, 2, 2, 3]), matrimonio: RNG.chance(0.6), aborto: RNG.pick([1, 2]), eutanasia: RNG.pick([0, 0, 0, 1, 2]),
    cannabis: RNG.chance(0.15), religionEscuela: RNG.chance(0.4), servicioMilitar: RNG.chance(0.1), penal: 1,
    lenguas: G.cantons.some(c => c.cul > 0 && c.fv.can > 0.5) ? RNG.chance(0.6) : false,
    concierto: [], cupo: 1, curriculo: RNG.pick(['comun', 'mixto', 'mixto']), simbolos: RNG.pick(['nacional', 'ambas', 'ambas']), derechoDecidir: 'prohibida', selecciones: false,
    energia: RNG.pick(['fosil', 'mixto', 'mixto', 'nuclear', 'renovable']),
    proteccionNatural: 1, viasPrivadas: RNG.chance(0.4),
    comp: {
      sanidad: RNG.weighted(['nacional', 'compartida', 'cantonal'], v => ({ nacional: 4, compartida: 2, cantonal: 3 })[v]),
      educacion: RNG.weighted(['nacional', 'compartida', 'cantonal'], v => ({ nacional: 4, compartida: 2, cantonal: 3 })[v]),
      transporte: RNG.weighted(['nacional', 'compartida', 'cantonal'], v => ({ nacional: 2, compartida: 5, cantonal: 1 })[v]),
      seguridad: RNG.weighted(['nacional', 'compartida', 'cantonal'], v => ({ nacional: 6, compartida: 2, cantonal: 1 })[v]),
      social: RNG.weighted(['nacional', 'compartida', 'cantonal'], v => ({ nacional: 2, compartida: 3, cantonal: 3 })[v]) },
    solidaridad: 1, sistemaElectoral: 'dhondt_canton', umbral: 0.03, legislatura: 3, financiacion: 'mixta',
    transparencia: RNG.chance(0.5), fiscalia: false, judicial: RNG.pick([1, 2]), tvPublica: 'independiente',
    limiteMandatos: false, votoObligatorio: false, edadVoto: 18, votoResidentes: false, naturalizacion: 10,
    tratados: {}, arImp: {}, arExp: {}, ayudaInversion: RNG.pick([0, 0, 0.15]), armasCiviles: RNG.pick([0, 0, 1]),
  };
  G.foreign.forEach(f => pol.tratados[f.id] = RNG.chance(0.4));
  // caos inicial (solo nuestro país): cada ley de la lista puede salirse de su valor estándar
  const chaosP = CHAOS_LEVELS[G.chaos || 0] ? CHAOS_LEVELS[G.chaos || 0].p : 0;
  if (chaosP > 0) for (const id in CHAOS_STD) {
    if (!RNG.chance(chaosP)) continue;
    const f = FIELDS[id], std = CHAOS_STD[id];
    pol[f.path] = RNG.pick(f.options.filter(o => o !== std));
  }
  // partidas por materia según quién tenga la competencia
  AREAS.forEach(a => {
    const lvl = Math.round(a.base * RNG.range(0.85, 1.15) * 100) / 100;
    pol.gasto[a.id] = Math.round(lvl * NAT_SHARE[pol.comp[a.id]] * 100) / 100;
    pol.gasto.transferencias += lvl * (1 - NAT_SHARE[pol.comp[a.id]]);
  });
  pol.gasto.transferencias = Math.round((pol.gasto.transferencias + 0.8) * 100) / 100;
  return pol;
}

// ============================================================
//  Mundo completo
// ============================================================
function generateWorld(G, opts) {
  const nCountries = opts.nCountries || RNG.int(4, 7);
  const nCantons = opts.nCantons || RNG.int(3, 6);
  const map = generateMap(nCountries, nCantons);
  const names = generateCountryNames(nCountries + 1);
  // cultura de cada país extranjero: la de la familia de su nombre (la nuestra es la hispana)
  const fams = generateCountryNames.lastFamilies || [];
  const leaders = RNG.shuffle(FOREIGN_LEADERS);
  const cnames = generateCantonNames(nCantons);
  // el cantón insular, si lo hay, se llama como un archipiélago
  if (map.islandCanton) {
    let nm; do { nm = RNG.pick(['Islas ', 'Archipiélago de ', 'Isla de ']) + cantonNameFrom('inventado'); } while (cnames.includes(nm));
    cnames[nCantons - 1] = nm;
  }
  G.country = { name: names[0], devel: RNG.range(0.35, 0.85) };
  G.nid = 'f0'; G.ci = 0; G.cul = 'hispana';

  // --- Países extranjeros ---
  G.foreign = range(nCountries - 1).map(i => {
    const hx = map.hexes.filter(h => h.land && h.country === i + 1);
    const share = fn => hx.filter(fn).length / hx.length;
    const waters = map.hexes.filter(h => !h.land && h.owner === i + 1);
    const exportsOf = [];
    if (share(h => h.terrain === 'hierba' && h.relief === 'llano') > 0.3 || waters.filter(h => h.f.includes('pesca')).length > 3) exportsOf.push('alimentos');
    if (share(h => h.relief === 'montana') > 0.25) exportsOf.push('energia');
    if (hx.some(h => h.f.includes('mina'))) exportsOf.push('minerales');
    exportsOf.push(RNG.pick(['manufacturas', 'tecnologia']));
    const kind = map.kinds[i + 1];
    const population = Math.round(hx.length * RNG.range(0.25, 0.75) * 10) / 10 * 1e6;
    const dev = RNG.range(0.3, 0.95);
    const nC = map.foreignCantons[i + 1] || 0;
    const fcNames = nC ? generateCantonNames(nC) : [];
    // los países sin cantones tienen uno solo, sin competencias (sirve para su mercado)
    if (!nC) hx.forEach(h => { h.canton = 0; });
    const compCount = {}; hx.forEach(h => { compCount[h.comp] = (compCount[h.comp] || 0) + 1; });
    const mainComp = +Object.entries(compCount).sort((a, b) => b[1] - a[1])[0][0];
    const cantons = range(nC).map(k => {
      const ch = hx.filter(h => h.canton === k);
      const mq = avg(ch, h => h.q), mr = avg(ch, h => h.r);
      const cost = h => (h.q - mq) ** 2 + (h.r - mr) ** 2 + (h.relief === 'montana' ? 9 : 0);
      const city = ch.slice().sort((a, b) => cost(a) - cost(b))[0];
      return { idx: k, name: fcNames[k], island: ch.every(h => h.comp !== mainComp), hexCount: ch.length, identity: RNG.chance(0.3) ? RNG.range(0.5, 0.95) : RNG.range(0, 0.4), cityHex: [city.q, city.r], gov: null, shares: {} };
    });
    return {
      id: 'f' + (i + 1), mapIndex: i + 1, name: names[i + 1], color: FOREIGN_PALETTE[i % FOREIGN_PALETTE.length], kind,
      cul: NATION_CULTURES[fams[i + 1]] ? fams[i + 1] : RNG.pick(Object.keys(NATION_CULTURES).filter(k => k !== 'hispana')),
      size: population / 1e7 * (0.6 + dev), dev, corpTax: RNG.pick([0.15, 0.20, 0.25, 0.30]), tariff: RNG.pick([0, 0.05, 0.1]),
      growth: RNG.range(0.01, 0.03), baseGrowth: RNG.range(0.012, 0.028), friendliness: RNG.range(0.3, 0.9),
      exports: [...new Set(exportsOf)], regime: RNG.pick(nC ? ['República federal', 'Monarquía federal', 'Confederación'] : ['Democracia liberal', 'Monarquía parlamentaria', 'República presidencialista', 'República parlamentaria']),
      leader: leaders[i % leaders.length], govEco: 0, govSoc: 0,
      unemployment: RNG.range(0.04, 0.16), inflation: RNG.range(0.01, 0.04), debtRatio: RNG.range(0.3, 1.2),
      population, hexCount: hx.length, cantons, federal: nC > 0,
      capitalName: cantonNameFrom('inventado'), cityHex: (() => { const mq = avg(hx, h => h.q), mr = avg(hx, h => h.r); const cost = h => (h.q - mq) ** 2 + (h.r - mr) ** 2 + (h.relief === 'montana' ? 9 : 0); const ch = hx.filter(h => h.comp === mainComp).sort((a, b) => cost(a) - cost(b))[0]; return [ch.q, ch.r]; })(),
    };
  });
  // un cantón nominal (sin competencias ni elecciones propias) para los países que no tienen cantones
  G.foreign.forEach(f => { if (!f.cantons.length) f.cantons = [{ idx: 0, name: f.capitalName, nominal: true, island: false, hexCount: f.hexCount, identity: 0, cityHex: f.cityHex.slice(), gov: null, shares: {} }]; });
  G.world = { prices: { alimentos: 1, energia: 1, minerales: 1, manufacturas: 1, tecnologia: 1 } };

  // --- Cantones ---
  const capitalIdx = RNG.int(0, nCantons - 1);
  G.cantons = range(nCantons).map(i => {
    const hx = map.hexes.filter(h => h.country === 0 && h.canton === i);
    const count = fn => hx.filter(fn).length;
    const has = k => h => h.f.includes(k);
    const coast = count(h => h.coast);
    // aguas territoriales del cantón: las de nuestro país más cercanas a su costa
    const own = map.hexes.filter(h => !h.land && h.owner === 0 && hx.some(l => l.coast && HEX.dist(l, h) <= 2));
    const res = {
      fertil: sum(hx, h => h.terrain !== 'hierba' ? 0 : h.f.includes('bosque') ? 0.2 : (h.relief === 'colinas' ? 0.4 : 1) + (h.f.includes('cultivo') ? 0.3 : 0) + (h.f.includes('rio') ? 0.2 : 0)) + own.filter(has('pesca')).length * 0.5,
      mineral: count(has('mina')),
      bosque: count(has('bosque')),
      costa: coast,
      turismo: coast * 0.5 + count(h => h.coast && h.terrain === 'arena') * 0.5 + count(h => h.relief === 'montana') * 0.5 + RNG.range(0, 3),
      renovable: count(h => h.terrain === 'arena') * 0.9 + count(h => h.relief === 'montana') * 0.5 + coast * 0.3 + count(h => h.relief === 'colinas') * 0.3,
    };
    const urban = clamp(RNG.range(0.35, 0.8) + (i === capitalIdx ? 0.2 : 0), 0.3, 0.95);
    return {
      id: 'c' + i, idx: i, name: cnames[i], hexCount: hx.length, res, urban, island: !!(map.islandCanton && i === nCantons - 1),
      industrial: RNG.range(0, 1), capital: i === capitalIdx,
      popWeight: hx.length * RNG.range(0.6, 1.5) * (1 + coast / hx.length * 0.6) * (i === capitalIdx ? 1.7 : 1),
      pol: { irpf: null, irpfPlano: null, nominas: null, sociedades: null, sucesiones: null, iva: null, ibi: null, vacias: null, lengua: false, rotulacion: 0, tv: false, fiestas: 0, exterior: false,
        gasto: { campo: RNG.pick([0.2, 0.4, 0.6]) } },
      gov: { president: null, coalition: [] },
      parliament: { seats: 0, composition: {} },
      shock: {}, disaster: 0, budget: { revenue: 0, spending: 0, balance: 0, debt: 0 },
      stats: {},
    };
  });
  const pw = sum(G.cantons, c => c.popWeight);
  G.cantons.forEach(c => { c.sizeShare = c.popWeight / pw; delete c.popWeight; });
  G.cantons.forEach(c => {
    c.capitalCity = c.name;
    // celda donde se dibuja la capital: la más cercana al centro del cantón
    const hx = map.hexes.filter(h => h.land && h.country === 0 && h.canton === c.idx);
    const mq = avg(hx, h => h.q), mr = avg(hx, h => h.r);
    const cost = h => (h.q - mq) ** 2 + (h.r - mr) ** 2 + (h.relief === 'montana' ? 9 : h.relief === 'colinas' ? 2 : 0);
    const best = hx.slice().sort((a, b) => cost(a) - cost(b))[0];
    c.cityHex = [best.q, best.r];
  });
  // ciudades, pueblos, fábricas y puertos sobre el mapa; luego, el mapa público
  placeSettlements(G, map);
  placeBuildings(map);
  G.map = publicMap(map);
  // parte de las viviendas del cantón que son pisos en la ciudad
  G.cantons.forEach(c => {
    const hx = map.hexes.filter(h => h.land && h.country === 0 && h.canton === c.idx);
    const pisos = sum(hx, h => sum(h.bb || [], b => b[0] * b[1])), casas = sum(hx, h => h.nh || 0);
    c.urban = clamp(pisos / Math.max(1, pisos + casas), 0.2, 0.97);
  });
  // culturas y fervor identitario de cada cantón
  initRegions(G);
  G.pol = initialPolicies(G);
  G.cantons.forEach(c => {
    if (c.cul > 0 && c.fv.can > 0.5 && RNG.chance(0.6)) c.pol.lengua = true;
    if (c.cul > 0) { c.pol.rotulacion = c.pol.lengua ? RNG.pick([1, 1, 2]) : RNG.pick([0, 1]); c.pol.fiestas = RNG.pick([1, 1, 2]); c.pol.tv = c.fv.can > 0.45 && RNG.chance(0.6); }
    else c.pol.fiestas = RNG.pick([0, 0, 1]);
    // cada cantón arranca con su IBI y, a veces, algún impuesto propio; y con su parte de cada materia
    c.pol.ibi = RNG.pick([0.003, 0.004, 0.005, 0.006]);
    if (RNG.chance(0.35)) c.pol.irpf = RNG.pick([0.01, 0.02, 0.03]);
    if (RNG.chance(0.25)) c.pol.sucesiones = RNG.pick([0.03, 0.05]);
    AREAS.forEach(a => {
      const share = 1 - NAT_SHARE[G.pol.comp[a.id]];
      c.pol.gasto[a.id] = Math.round(a.base * share * RNG.range(0.85, 1.15) * 100) / 100;
    });
  });

  // --- Habitantes: cada vivienda, una familia (o ninguna) ---
  populateHomes(G);
  // los países extranjeros, a la misma escala de población que el nuestro
  const density = sum(G.cantons, c => c.pop) / Math.max(1, sum(G.cantons, c => c.hexCount));
  G.foreign.forEach(f => { f.population = Math.round(f.hexCount * density * RNG.range(0.6, 1.4)); });

  // --- Escaños ---
  const nSeats = 100 + 10 * nCantons;
  G.parliament = { seats: nSeats, composition: {}, lastElection: null };
  allocateCantonSeats(G);
  const maxPop = Math.max(...G.cantons.map(c => c.pop));
  G.cantons.forEach(c => { c.parliament.seats = clamp(15 + Math.round(26 * c.pop / maxPop), 15, 41) | 1; });
  // --- Partidos y gobiernos de los países extranjeros ---
  initForeignPolitics(G);
  // tipo de cada habitante (cantonalista, centralista o neutral) y regiones con regionalistas posibles
  finishRegions(G);
  // a veces, el cantón con más fervor ya tiene concierto económico
  const top = G.cantons.filter(c => c.cul > 0).sort((a, b) => b.ferv.can - a.ferv.can)[0];
  if (top && top.ferv.can > 0.5 && RNG.chance(0.35)) { G.pol.concierto = [top.idx]; G.cantons.forEach(c => { c.pr0 = (({ can, cen }) => ({ can, cen }))(fervorPressures(G, c)); }); }
}

function allocateCantonSeats(G) {
  const total = G.parliament.seats, minSeats = 3;
  const pops = G.cantons.map(c => c.merged ? 0 : c.pop);
  const nLive = G.cantons.filter(c => !c.merged).length;
  const ptot = sum(pops);
  const rest = total - minSeats * nLive;
  const quotas = pops.map(p => rest * p / ptot);
  const seats = quotas.map(q => Math.floor(q));
  let left = rest - sum(seats);
  const order = quotas.map((q, i) => [q - Math.floor(q), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < left; k++) seats[order[k % order.length][1]]++;
  G.cantons.forEach((c, i) => c.nationalSeats = c.merged ? 0 : seats[i] + minSeats);
}

// ============================================================
//  CIUDADANOS
// ============================================================
function sampleAge() {
  const buckets = [[16, 29, 1.0], [30, 49, 1.15], [50, 64, 1.05], [65, 79, 0.72], [80, 95, 0.28]];
  const b = RNG.weighted(buckets, x => x[2] * (x[1] - x[0] + 1));
  return RNG.int(b[0], b[1]);
}
// Viviendas de nuestro país: una por casa y una por piso de cada bloque
//   { q, r, b (casa o bloque), u (piso), c (cantón), kind: 'casa' | 'piso' }
function homeSlots(G) {
  if (G._slots) return G._slots;
  const out = [];
  G.map.hexes.forEach(h => {
    if (h.c !== (G.ci || 0) || h.t === 'mar') return;
    for (let b = 0; b < (h.nh || 0); b++) out.push({ q: h.q, r: h.r, b, u: 0, c: h.k, kind: 'casa', key: slotKey(h.q, h.r, 'casa', b, 0) });
    (h.bb || []).forEach(([fl, fpf], b) => { for (let u = 0; u < fl * fpf; u++) out.push({ q: h.q, r: h.r, b, u, c: h.k, kind: 'piso', key: slotKey(h.q, h.r, 'piso', b, u) }); });
  });
  G._slots = out;
  return out;
}
const HOME_CAP = { casa: 7, piso: 6 };
// Clave única de cada vivienda (las casas y los bloques de una casilla se numeran por separado)
const slotKey = (q, r, kind, b, u) => q + ',' + r + ',' + (kind === 'piso' ? 'p' : 'c') + b + ',' + u;
const homeKey = h => slotKey(h.q, h.r, h.kind, h.b, h.u);   // máximo de personas por vivienda
// Nombre y apellido; «avoid»: nombres de pila ya usados en el hogar (no se repiten)
// cu: cultura de la persona (sus nombres y apellidos salen de ella)
function personName(sex, cu, surname, avoid) {
  const C = NATION_CULTURES[cu] || NATION_CULTURES.hispana;
  const pool = sex === 'M' ? C.f : C.m;
  let first, k = 0;
  do { first = RNG.pick(pool); } while (avoid && avoid.includes(first) && k++ < 20);
  if (avoid) avoid.push(first);
  return first + ' ' + (surname || RNG.pick(C.sn));
}
// Cultura de un país (el nuestro o uno extranjero) desde el estado de cualquier país
function cultureOf(G, nid) {
  if (!nid || nid === (G.nid || 'f0')) return G.cul || 'hispana';
  const f = (G.foreign || []).find(x => x.id === nid);
  return (f && f.cul) || 'hispana';
}
const surnameOf = nm => nm.split(' ').slice(1).join(' ');
function adultAge(min, max) { let a; do { a = sampleAge(); } while (a < min || a > max); return a; }
// Composición de un hogar: adultos [{age, sex, role}] y niños [{age, sex}]
function householdPlan(kind) {
  const type = RNG.weighted(kind === 'casa'
    ? [['solo', 16], ['pareja', 24], ['familia', 36], ['mono', 7], ['tres', 12], ['compartido', 5]]
    : [['solo', 27], ['pareja', 25], ['familia', 28], ['mono', 9], ['tres', 3], ['compartido', 8]], x => x[1])[0];
  const adults = [], kids = [];
  const sexPair = () => RNG.chance(0.92) ? ['M', 'H'] : RNG.chance(0.5) ? ['M', 'M'] : ['H', 'H'];
  const children = (parentAge, n) => {
    for (let k = 0; k < n; k++) {
      const age = RNG.int(0, Math.max(0, Math.min(parentAge - 19, 24)));
      const sex = RNG.chance(GIRL_SHARE) ? 'M' : 'H';
      if (age >= 16) adults.push({ age, sex, role: 'hijo' }); else kids.push({ age, sex });
    }
  };
  if (type === 'solo') { const age = adultAge(19, 95); adults.push({ age, sex: RNG.chance(age > 70 ? 0.68 : 0.47) ? 'M' : 'H', role: 'titular' }); }
  else if (type === 'pareja') { const a = adultAge(20, 92), [s1, s2] = sexPair(); adults.push({ age: a, sex: s1, role: 'titular' }, { age: clamp(a + Math.round(RNG.normal(0, 3)), 19, 95), sex: s2, role: 'pareja' }); }
  else if (type === 'familia' || type === 'tres') {
    const a = RNG.int(type === 'tres' ? 32 : 26, 55), [s1, s2] = sexPair();
    adults.push({ age: a, sex: s1, role: 'titular' }, { age: clamp(a + Math.round(RNG.normal(0, 3)), 22, 70), sex: s2, role: 'pareja' });
    children(a, RNG.weighted([[1, 40], [2, 42], [3, 18]], x => x[1])[0]);
    if (type === 'tres') adults.push({ age: clamp(a + RNG.int(24, 32), 60, 96), sex: RNG.chance(0.65) ? 'M' : 'H', role: 'abuelo' });
  } else if (type === 'mono') { const a = RNG.int(24, 55); adults.push({ age: a, sex: RNG.chance(0.8) ? 'M' : 'H', role: 'titular' }); children(a, RNG.int(1, 2)); }
  else for (let k = RNG.int(2, kind === 'piso' ? 4 : 3); k > 0; k--) adults.push({ age: RNG.int(19, 34), sex: RNG.chance(0.5) ? 'M' : 'H', role: 'companero' });
  return { type, adults, kids };
}
// Mete un hogar en una vivienda vacía. origin: 'nativo' | 'interno' | 'extranjero'
function settleHousehold(G, slot, plan, origin, from, yrs) {
  const c = G.cantons[slot.c];
  G.nextHomeId = (G.nextHomeId || 0) + 1;
  G.nextCzId = G.nextCzId || G.citizens.reduce((m, x) => Math.max(m, x.id), (G.ci || 0) * 1e6) + 1;
  const shared = plan.type === 'compartido';
  const cu = origin === 'extranjero' ? cultureOf(G, from) : (G.cul || 'hispana'), C = NATION_CULTURES[cu] || NATION_CULTURES.hispana;
  const sn = RNG.pick(C.sn);
  const home = { id: G.nextHomeId, c: slot.c, q: slot.q, r: slot.r, b: slot.b, u: slot.u, kind: slot.kind, sn: shared ? null : sn, kids: [] };
  const made = [], used = [];
  plan.adults.forEach(a => {
    // en los hogares de inmigrantes, los hijos nacidos aquí son nativos
    const o = origin === 'extranjero' && a.role === 'hijo' && a.age < yrs ? 'nativo' : origin;
    const cz = makeCitizen(G, G.nextCzId++, c, a.age, a.sex, o, o === 'extranjero' ? from : null, o === 'extranjero' ? yrs : 99, null, slot.kind === 'piso');
    const ownSn = shared || a.role === 'pareja' ? null : sn;
    cz.hh = home.id; cz.role = a.role; cz.cu = cu; cz.nm = personName(a.sex, cu, ownSn, used);
    for (const pl of G.players || []) cz.aff[pl.id] = cz.aff[pl.id] || 0;
    G.citizens.push(cz); made.push(cz);
  });
  plan.kids.forEach(k => home.kids.push({ a: k.age, s: k.sex, n: personName(k.sex, cu, '-', used).split(' ')[0], q: RNG.int(1, 4), o: origin === 'extranjero' && k.age >= yrs ? 'extranjero' : 'nativo', cu }));
  G.homes.push(home);
  return { home, made };
}
function populateHomes(G) {
  G.citizens = []; G.homes = []; G.nextHomeId = (G.ci || 0) * 1e6; G.nextCzId = (G.ci || 0) * 1e6 + 1;
  const P0 = G.pol;
  const baseUnemp = 0.04 + (2 - P0.laboral) * 0.012 + Math.max(0, P0.salarioMin - 0.45) * 0.12 + P0.desempleo * 0.005 + (G.country.devel < 0.5 ? 0.015 : 0) + RNG.range(0, 0.04);
  const immigrantShare = RNG.range(0.05, 0.15);
  G.cantons.forEach(c => { c.w = 1; c.unemp0 = clamp(baseUnemp * RNG.range(0.7, 1.35) * (1.2 - c.urban * 0.3), 0.03, 0.3); });
  homeSlots(G).forEach(slot => {
    if (RNG.chance(slot.kind === 'casa' ? 0.09 : 0.065)) return;   // vivienda vacía
    const plan = householdPlan(slot.kind);
    const origin = RNG.chance(immigrantShare * 1.1) ? 'extranjero' : RNG.chance(0.14) ? 'interno' : 'nativo';
    settleHousehold(G, slot, plan, origin, RNG.pick(G.foreign).id, RNG.int(0, 22));
  });
  G.cantons.forEach(c => {
    const adults = G.citizens.filter(z => z.c === c.idx).length;
    const kids = sum(G.homes.filter(h => h.c === c.idx), h => h.kids.length);
    c.pop = adults + kids;
  });
}

function studentProb(age) { return age <= 17 ? 0.93 : ({ 18: 0.7, 19: 0.52, 20: 0.39, 21: 0.29, 22: 0.17, 23: 0.1, 24: 0.06 })[age] || 0.02; }

// Una persona nueva: si está en edad de trabajar empieza sin empleo (las empresas la contratarán)
function makeCitizen(G, id, c, age, sex, originType, originCountry, yearsRes, _unused, urbanHome) {
  let prof = 'parado';
  if (age >= G.pol.jubilacion) prof = 'jubilado';
  else if (RNG.chance(studentProb(age))) prof = 'estudiante';
  // nivel de cualificación (1 precario … 5 alto) y estudios
  const lvl = clamp(Math.round(2.7 + RNG.normal(0, 0.95) - (originType === 'extranjero' && yearsRes < 5 ? 0.4 : 0)), 1, 5);
  const urban = urbanHome !== undefined ? !!urbanHome : RNG.chance(c.urban);
  const highEdu = prof === 'estudiante' ? 0.5 : 0.12 + 0.13 * lvl;
  const edu = RNG.chance(highEdu) ? 3 : RNG.chance(0.6) ? 2 : 1;
  const rel = clamp(0.3 + (age - 45) / 120 + (urban ? -0.1 : 0.12) + RNG.normal(0, 0.22), 0, 1);
  const cz = {
    id, c: c.idx, sex, age, prof, sector: null, lastSector: null, emp: false, firm: null, pb: 0, lvl, edu, rel, urban,
    origin: originType, from: originCountry, yrs: yearsRes, nat: originType !== 'extranjero' || yearsRes >= (G.pol.naturalizacion || 10),
    cu: originType === 'extranjero' && originCountry ? cultureOf(G, originCountry) : (G.cul || 'hispana'),
    x: AXIS_IDS.map(() => 0), sal: AXIS_IDS.map(() => 1), aff: {}, income: 0, prevIncome: 0, sat: 0.5,
  };
  computeIdeology(G, cz, PROFESSIONS[prof], true);
  if (c.fv) assignFervor(G, cz);
  return cz;
}

// Ideología del ciudadano a partir de sus rasgos (con ruido personal estable)
function computeIdeology(G, cz, P, fresh, full) {
  const c = G.cantons[cz.c];
  const lean = P.lean;
  const agef = (cz.age - 45) / 30;
  // los funcionarios tiran más a la izquierda; los del sector privado, más al liberalismo económico
  const wl = (WORK_SECTORS[workSector(cz)] || {}).lean || {};
  const target = [
    lean.eco + (cz.lvl - 3) * 0.35 + (wl.eco || 0),
    lean.soc + (wl.soc || 0) + agef * 0.55 + cz.rel * 1.3 - 0.45 + (cz.sex === 'M' ? -0.15 : 0.1) + (cz.edu === 3 ? -0.3 : 0) + (cz.urban ? -0.2 : 0.2),
    lean.ter + TER_BASE + (cz.origin === 'interno' ? -0.2 : cz.origin === 'extranjero' ? 0.2 : 0) + (cz.fs || 0),
    lean.ext + (cz.edu === 3 ? -0.4 : 0) + agef * 0.3 + (cz.origin === 'extranjero' ? -1.1 : 0) + (cz.urban ? -0.1 : 0.3),
    lean.amb + agef * 0.4 + (cz.urban ? -0.3 : 0.2) + (cz.edu === 3 ? -0.3 : 0),
    (lean.aut || 0) + agef * 0.35 + cz.rel * 0.5 - 0.25 + (cz.edu === 3 ? -0.35 : 0) + (cz.origin === 'extranjero' ? -0.3 : 0) + (cz.urban ? -0.1 : 0.15),
  ];
  // cada país tiene su propio clima político
  if (G.ideoShift) for (let i = 0; i < target.length; i++) target[i] += G.ideoShift[i] || 0;
  if (fresh) {
    cz.base = range(AXIS_IDS.length).map(() => RNG.normal(0, 0.62));
    cz.x = target.map((t, i) => clamp(t + cz.base[i], -2.3, 2.3));
    const sal = P.sal || {};
    cz.sal = AXIS_IDS.map(a => (1 + (sal[a] ? sal[a] - 1 : 0)) * RNG.range(0.75, 1.25));
  } else {
    // ajuste gradual (cambio de profesión, envejecimiento)
    cz.x = cz.x.map((v, i) => clamp(lerp(v, target[i] + cz.base[i], full ? 1 : 0.35), -2.3, 2.3));
  }
}

// Nombre corto de la ideología media de un grupo
function ideologySummary(x) { return AXES.map((a, i) => axisLabel(a.id, x[i])); }
