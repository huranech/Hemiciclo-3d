'use strict';
// ============================================================
//  CARRETERAS Y VÍAS DE TREN
//  Las pone quien tenga la competencia de transporte: el Ministerio de Transporte en todo el país (si la
//  competencia es nacional o compartida) y cada gobierno cantonal en su cantón (si es cantonal o compartida).
//  Las vías de tren también las pueden tender las compañías ferroviarias privadas, si la ley lo permite.
//  Se trazan casilla a casilla (nunca por montañas ni por el mar) y abaratan el transporte entre dos cantones
//  (o dos países) cuando unen sus capitales: el coste pasa a depender de las casillas de la red entre ellas
//  (el tren, mucho más barato por casilla que la carretera).
//  Las ciudades y los pueblos son parte de la red (tienen sus calles y su estación), pero solo se pasa de uno a
//  otro por una carretera o una vía (o dentro de la misma ciudad).
//  Además: los pueblos unidos por carretera con la capital de su cantón mejoran su calidad del transporte, y las
//  compañías ferroviarias solo venden viajes de verdad si su ciudad está unida por tren con otras.
// ============================================================
const ROAD_HEX_STEP = 0.08;      // coste de transporte por casilla de carretera (cruzar a un cantón vecino sin ella: 1)
const RAIL_HEX_STEP = 0.025;     // y por casilla de vía de tren
const ROAD_COST = 0.00004;       // miles de millones por casilla en llano (40.000 €), a sueldos de partida
const RAIL_COST = 0.0001;        // la vía de tren: 100.000 € por casilla en llano
const ROAD_MAX_HEXES = 40;       // casillas como mucho en una obra
const ROAD_TRANSPORT_BONUS = 12; // puntos de calidad del transporte para un cantón con todos sus pueblos conectados
const RAIL_TRANSPORT_BONUS = 8;  // y para un cantón con buen tren (su capital unida con dos ciudades o más)
const NET_KINDS = ['road', 'rail'];
const NET = {
  road: { list: 'roads', ver: 'roadVer', cache: '_roadSet', step: ROAD_HEX_STEP, cost: ROAD_COST, noun: 'carretera', nounPl: 'carreteras', q: 'roadQ' },
  rail: { list: 'rails', ver: 'railVer', cache: '_railSet', step: RAIL_HEX_STEP, cost: RAIL_COST, noun: 'vía de tren', nounPl: 'vías de tren', q: 'railQ' },
};

const roadKey = (q, r) => q + ',' + r;
function mainOf(G0) { return (G0 && G0.main) || G0; }
// Versión de las dos redes (para rehacer lo que depende de ellas)
const infraVer = G0 => { const G = mainOf(G0); return (G.roadVer || 0) + '|' + (G.railVer || 0); };
function netSet(G0, kind = 'road') {
  const G = mainOf(G0), N = NET[kind];
  if (!G[N.cache] || G[N.cache].ver !== (G[N.ver] || 0)) G[N.cache] = { ver: G[N.ver] || 0, set: new Set(G[N.list] || []) };
  return G[N.cache].set;
}
const roadSet = G0 => netSet(G0, 'road');
const railSet = G0 => netSet(G0, 'rail');
const isRoadNode = (G, h, kind = 'road') => !!h && h.t !== 'mar' && (netSet(G, kind).has(roadKey(h.q, h.r)) || isSettlement(h));
// ¿Se pasa de la casilla a a la b por la red? (por la carretera o la vía, o dentro de una misma ciudad)
function netStep(set, a, b) {
  if (!b || b.t === 'mar') return false;
  const ka = set.has(roadKey(a.q, a.r)), kb = set.has(roadKey(b.q, b.r));
  if (kb && (ka || isSettlement(a))) return true;
  if (ka && isSettlement(b)) return true;
  return isCity(a) && isCity(b) && a.cn && a.cn === b.cn;
}
// ¿Se puede construir en esta casilla? (nunca en el mar ni en las montañas)
function roadBuildable(h) { return !!h && h.t !== 'mar' && h.rel !== 'montana'; }
// Lo que cuesta una casilla según el terreno (las colinas, los bosques y los puentes encarecen la obra; al tren,
// las cuestas aún más)
function roadTerrainMult(h, kind = 'road') {
  let m = 1;
  if (h.rel === 'colinas') m *= kind === 'rail' ? 2.2 : 1.6;
  if (hasF(h, 'bosque')) m *= 1.3;
  if (hasF(h, 'rio')) m *= kind === 'rail' ? 1.8 : 1.5;
  if (h.t === 'roca') m *= 1.3;
  return m;
}
function roadHexCost(G, h, kind = 'road') { return NET[kind].cost * roadTerrainMult(h, kind) * wageFactor(mainOf(G)); }
// Quién puede construir y dónde: [{ owner: 'estado' | índice del cantón, label }]
function roadOwners(G, party) {
  const out = [], comp = G.pol.comp.transporte;
  if (comp !== 'cantonal' && G.gov.ministers && G.gov.ministers.transporte === party.id && !G.gov.interim) out.push({ owner: 'estado', label: 'Ministerio de Transporte' });
  if (comp !== 'nacional') G.cantons.forEach((c, i) => { if (!c.merged && c.gov.president === party.id) out.push({ owner: i, label: 'Gobierno de ' + c.name }); });
  return out;
}
// Casillas en las que puede construir cada administración (y a quién pertenecen)
function roadHexAllowed(G, owner, h) {
  if (!roadBuildable(h) || h.c !== (G.ci || 0)) return false;
  return owner === 'estado' ? true : h.k === owner;
}
// Ruta más barata entre dos casillas por las que cumplan ok(h): aprovecha lo que ya hay de esa red
function roadPath(G, from, to, ok, kind = 'road') {
  const idx = hexIndex(mainOf(G)), rs = netSet(G, kind);
  const start = idx.get(roadKey(from[0], from[1])), goal = idx.get(roadKey(to[0], to[1]));
  if (!start || !goal || !ok(start) || !ok(goal)) return null;
  const hill = kind === 'rail' ? 1.2 : 0.6;
  const stepCost = h => rs.has(roadKey(h.q, h.r)) || isSettlement(h) ? 0.15 : 1 + (h.rel === 'colinas' ? hill : 0) + (hasF(h, 'bosque') ? 0.3 : 0) + (hasF(h, 'rio') ? 0.5 : 0);
  const g = new Map([[start, 0]]), prev = new Map(), open = [[HEX.dist(start, goal) * 0.15, start]], done = new Set();
  let guard = 0;
  while (open.length && guard++ < 20000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, h] = open.splice(bi, 1)[0];
    if (h === goal) break;
    if (done.has(h)) continue; done.add(h);
    for (const [q, r] of HEX.neighbors(h.q, h.r)) {
      const n = idx.get(roadKey(q, r)); if (!n || done.has(n) || !ok(n)) continue;
      const ng = g.get(h) + stepCost(n);
      if (ng < (g.get(n) ?? Infinity)) { g.set(n, ng); prev.set(n, h); open.push([ng + HEX.dist(n, goal) * 0.15, n]); }
    }
  }
  if (!g.has(goal)) return null;
  const path = [goal]; let cur = goal;
  while (cur !== start) { cur = prev.get(cur); path.push(cur); }
  return path.reverse().map(h => [h.q, h.r]);
}
// Casillas nuevas de una obra (sin las que ya tienen esa red ni las ciudades y pueblos) y lo que cuesta
function roadQuote(G, hexes, kind = 'road') {
  const idx = hexIndex(mainOf(G)), rs = netSet(G, kind);
  const fresh = [];
  const seen = new Set();
  for (const [q, r] of hexes || []) {
    const k = roadKey(q, r); if (seen.has(k)) continue; seen.add(k);
    const h = idx.get(k); if (!h || rs.has(k) || isSettlement(h)) continue;
    fresh.push(h);
  }
  return { fresh, cost: mainOf(G).eco ? sum(fresh, h => roadHexCost(G, h, kind)) : 0 };
}
// Lo que le cuesta a un país (con sus sueldos) un conjunto de casillas, en miles de millones
const netCostFor = (S, fresh, kind) => sum(fresh, h => NET[kind].cost * roadTerrainMult(h, kind)) * wageFactor(S);
// Construir: comprueba que las casillas se tocan, que se puede en todas y que la administración puede pagarla
function buildRoad(G, owner, hexes, opts = {}) {
  const kind = opts.kind === 'rail' ? 'rail' : 'road', N = NET[kind];
  const idx = hexIndex(mainOf(G)), maxN = opts.maxHexes || ROAD_MAX_HEXES;
  if (!Array.isArray(hexes) || hexes.length < 2) return { ok: false, msg: 'Marca al menos dos casillas.' };
  if (hexes.length > maxN * 2) return { ok: false, msg: 'Demasiado larga: divídela en varias obras.' };
  const list = hexes.map(([q, r]) => idx.get(roadKey(+q, +r)));
  if (list.some(h => !h)) return { ok: false, msg: 'Casilla desconocida.' };
  for (let i = 1; i < list.length; i++) if (HEX.dist(list[i - 1], list[i]) !== 1) return { ok: false, msg: `La ${N.noun} tiene que ir de casilla en casilla, sin saltos.` };
  const allowed = opts.allowed || (h => roadHexAllowed(G, owner, h));
  const bad = list.find(h => !allowed(h));
  if (bad) return { ok: false, msg: bad.rel === 'montana' ? `No se pueden hacer ${N.nounPl} por las montañas.` : bad.t === 'mar' ? 'No se puede construir en el mar.' : 'Esa administración no puede construir en todas esas casillas.' };
  const q = roadQuote(G, hexes, kind);
  if (!q.fresh.length) return { ok: false, msg: `Ese tramo ya tiene ${N.noun}.` };
  if (q.fresh.length > maxN) return { ok: false, msg: `Como mucho ${maxN} casillas nuevas por obra.` };
  const M = mainOf(G);
  M[N.list] = (M[N.list] || []).concat(q.fresh.map(h => roadKey(h.q, h.r)));
  M[N.ver] = (M[N.ver] || 0) + 1;
  M._mk = null; M._roadInfo = null; M._railInfo = null;
  if (!opts.free) {
    if (owner === 'estado') G.eco[N.q] = (G.eco[N.q] || 0) + q.cost;
    else G.cantons[owner][N.q] = (G.cantons[owner][N.q] || 0) + q.cost;
  }
  return { ok: true, n: q.fresh.length, cost: q.cost, kind };
}
// Distancia por la red (en casillas) desde una casilla a las demás de la red
function netBFS(G, startH, kind = 'road') {
  const idx = hexIndex(mainOf(G)), set = netSet(G, kind);
  const d = new Map([[startH, 0]]), queue = [startH];
  while (queue.length) {
    const h = queue.shift(), dh = d.get(h);
    for (const [q, r] of HEX.neighbors(h.q, h.r)) {
      const n = idx.get(roadKey(q, r));
      if (!n || d.has(n) || !netStep(set, h, n)) continue;
      d.set(n, dh + (set.has(roadKey(n.q, n.r)) ? 1 : 0)); queue.push(n);
    }
  }
  return d;
}
const roadBFS = (G, startH) => netBFS(G, startH, 'road');
// Casilla de la capital de cada nodo del mercado (cantones de todos los países)
function marketHubs(G, nodes) {
  const idx = hexIndex(G);
  return nodes.map(n => {
    let ch = null;
    if (n.country === 0) ch = G.cantons[n.canton] && !G.cantons[n.canton].merged && G.cantons[n.canton].cityHex;
    else { const f = G.foreign.find(x => x.id === n.fid); const fc = f && f.cantons.find(c => c.idx === n.canton); ch = fc ? fc.cityHex : f && f.cityHex; }
    return ch ? idx.get(roadKey(ch[0], ch[1])) : null;
  });
}
// Aristas por carretera y por tren entre los nodos del mercado: por sus capitales
function roadMarketEdges(G0, nodes) {
  const G = mainOf(G0), out = [];
  const hub = marketHubs(G, nodes);
  const byHex = new Map(); hub.forEach((h, i) => { if (h) byHex.set(h, i); });
  for (const kind of NET_KINDS) {
    if (!(G[NET[kind].list] || []).length) continue;
    hub.forEach((h, a) => {
      if (!h) return;
      const d = netBFS(G, h, kind);
      for (const [hx, b] of byHex) if (b > a && d.has(hx)) out.push({ a, b, steps: Math.max(1, d.get(hx)) * NET[kind].step, kind });
    });
  }
  return out;
}
// Pueblos de cada cantón unidos por carretera con su capital (0 a 1)
function roadConnectivity(G0) {
  const G = mainOf(G0);
  if (G._roadInfo && G._roadInfo.ver === (G.roadVer || 0)) return G._roadInfo.conn;
  const idx = hexIndex(G);
  const conn = G.cantons.map(c => {
    if (c.merged || !c.cityHex) return 0;
    const cap = idx.get(roadKey(c.cityHex[0], c.cityHex[1])); if (!cap) return 0;
    const towns = G.map.hexes.filter(h => h.c === (G.ci || 0) && h.k === c.idx && hasF(h, 'pueblo'));
    if (!towns.length) return 0;
    const d = netBFS(G, cap, 'road');
    return towns.filter(t => d.has(t)).length / towns.length;
  });
  G._roadInfo = { ver: G.roadVer || 0, conn };
  return conn;
}
// Ciudades (y pueblos, a un tercio) a las que llega el tren desde la capital de cada nodo del mercado
function railLinks(G0) {
  const G = mainOf(G0), ver = infraVer(G);
  if (G._railInfo && G._railInfo.ver === ver) return G._railInfo.links;
  const mk = marketTopo(G), hubs = marketHubs(G, mk.nodes);
  const any = (G.rails || []).length > 0;
  const links = hubs.map(h => {
    if (!h || !any) return 0;
    const cities = new Set(), towns = new Set();
    for (const x of netBFS(G, h, 'rail').keys()) {
      if (isCity(x)) { if (x.cn !== h.cn) cities.add(x.cn); }
      else if (hasF(x, 'pueblo')) towns.add(roadKey(x.q, x.r));
    }
    return cities.size + 0.35 * towns.size;
  });
  G._railInfo = { ver, links };
  return links;
}
// Parte de su capacidad que puede aprovechar una compañía ferroviaria del cantón i del país S: sin vías apenas
// vende viajes (algún cercanías: una cuarta parte); unida con una ciudad, el 85 %; con dos o más, todo
const RAIL_F0 = 0.25;
const railFactorFromLinks = L => clamp(RAIL_F0 + 0.6 * L, RAIL_F0, 1);
// Parte de la gente del cantón que puede moverse en tren (el resto, si quiere, en coche)
const railAccessFromLinks = L => clamp(0.1 + 0.9 * L, 0.1, 1);
function railAccess(S, i) { const n = marketNode(S, i); return railAccessFromLinks(n == null ? 0 : railLinks(S)[n] || 0); }
function railFactorOf(S, i) { const n = marketNode(S, i); return railFactorFromLinks(n == null ? 0 : railLinks(S)[n] || 0); }
// Calidad del tren de cada cantón de nuestro país (0 a 1) y ciudades a las que llega
function railCantonInfo(G) {
  const L = railLinks(G);
  return G.cantons.map((c, i) => { const n = marketNode(G, i); const l = n == null ? 0 : L[n] || 0; return { links: l, q: (railFactorFromLinks(l) - RAIL_F0) / (1 - RAIL_F0) }; });
}

// ---------- red ferroviaria de partida ----------
// Cada país empieza con algunas líneas que salen de su capital hacia las ciudades más cercanas (más cuanto más
// desarrollado es). Un país con una sola ciudad tiene un tren de cercanías a sus pueblos.
function countryHubs(G, ci) {
  const idx = hexIndex(G);
  if (ci === (G.ci || 0)) return G.cantons.filter(c => !c.merged && c.cityHex).sort((a, b) => (b.capital ? 1 : 0) - (a.capital ? 1 : 0)).map(c => idx.get(roadKey(...c.cityHex))).filter(Boolean);
  const f = G.foreign.find(x => x.mapIndex === ci); if (!f) return [];
  const l = (f.cantons || []).filter(fc => fc.cityHex).map(fc => fc.cityHex);
  if (!l.length && f.cityHex) l.push(f.cityHex);
  return l.map(k => idx.get(roadKey(...k))).filter(Boolean);
}
function initialRails(G) {
  if (G.rails) return;
  G.rails = []; G.railVer = (G.railVer || 0) + 1;
  const countries = [{ ci: G.ci || 0, dev: G.country.devel ?? 0.6 }].concat(G.foreign.map(f => ({ ci: f.mapIndex, dev: f.dev ?? 0.5 })));
  countries.forEach(C => {
    const ok = h => roadBuildable(h) && h.c === C.ci;
    const hubs = countryHubs(G, C.ci);
    if (!hubs.length) return;
    const lay = (a, b) => { const p = roadPath(G, [a.q, a.r], [b.q, b.r], ok, 'rail'); if (p && p.length <= 34) { buildRoad(G, null, p, { kind: 'rail', allowed: ok, free: true, maxHexes: 60 }); return true; } return false; };
    let built = 0;
    if (hubs.length >= 2) {
      // las parejas de ciudades más cercanas primero (las de la capital, algo antes), sin cerrar círculos
      const lines = clamp(Math.round((hubs.length - 1) * (0.35 + 0.4 * C.dev)), 1, 4);
      const comp = hubs.map((_, i) => i), find = i => { while (comp[i] !== i) i = comp[i] = comp[comp[i]]; return i; };
      const pairs = [];
      for (let a = 0; a < hubs.length; a++) for (let b = a + 1; b < hubs.length; b++) pairs.push({ a, b, d: HEX.dist(hubs[a], hubs[b]) - (a === 0 ? 3 : 0) });
      pairs.sort((x, y) => x.d - y.d);
      for (const pr of pairs) {
        if (built >= lines) break;
        if (pr.d > 26 || find(pr.a) === find(pr.b)) continue;
        if (lay(hubs[pr.a], hubs[pr.b])) { comp[find(pr.a)] = find(pr.b); built++; }
      }
    }
    // (si no hay otra ciudad a mano: un cercanías de la capital a sus pueblos)
    if (!built) {
      const towns = G.map.hexes.filter(h => h.c === C.ci && hasF(h, 'pueblo') && HEX.dist(h, hubs[0]) <= 9).sort((a, b) => HEX.dist(a, hubs[0]) - HEX.dist(b, hubs[0])).slice(0, 3);
      towns.forEach(t => lay(hubs[0], t));
    }
  });
  G._mk = null; G._railInfo = null;
}

// ---------- las compañías ferroviarias privadas tienden sus propias vías (si la ley lo permite) ----------
// Una compañía cuya ciudad no está bien unida por tren se plantea llevar la vía hasta la ciudad más cercana de
// su país a la que aún no llega. Le sale caro: pone parte con su caja y pide el resto al banco, y solo lo hace
// si los viajes que venderá de más pagan la obra en unos veinte años (una vía dura mucho).
function railFirmsQuarter(S) {
  if (!S.pol.viasPrivadas) return;
  const G = mainOf(S), ci = S.ci || 0;
  const mine = h => roadBuildable(h) && h.c === ci;
  const fs = S.firms.filter(f => f.kind === 'ferroviaria' && f.pub == null && !f.obra && !f.dying && (S.turn || 0) - (f.born || 0) >= 2);
  if (!fs.length) return;
  const hubs = S.cantons.map(c => c.merged || !c.cityHex ? null : hexIndex(G).get(roadKey(...c.cityHex)));
  let books = null, done = 0;
  for (const f of RNG.shuffle(fs)) {
    if (done || !RNG.chance(0.08)) continue;
    const L = railLinks(S)[marketNode(S, f.c)] || 0;
    if (L >= 2) continue;
    const home = hubs[f.c]; if (!home) continue;
    const reach = netBFS(G, home, 'rail');
    const t = hubs.filter((h, i) => h && i !== f.c && !reach.has(h) && HEX.dist(home, h) <= 24).sort((a, b) => HEX.dist(home, a) - HEX.dist(home, b))[0];
    if (!t) continue;
    const path = roadPath(G, [home.q, home.r], [t.q, t.r], mine, 'rail'); if (!path) continue;
    const q = roadQuote(G, path, 'rail'); if (!q.fresh.length || q.fresh.length > ROAD_MAX_HEXES) continue;
    const cost = netCostFor(S, q.fresh, 'rail') * 1e6;   // (miles de €, como las cuentas de las empresas)
    const oldF = railFactorFromLinks(L), newF = railFactorFromLinks(L + 1);
    const gainY = Math.max(0, f.revY || 0) / oldF * (newF - oldF) * 0.6;
    if (gainY * 20 < cost) continue;
    const reserve = (f.wage || 30) * Math.max(1, f.staffN || 1) * 0.25;
    const equity = Math.min(cost, Math.max(0, (f.cash || 0) - reserve));
    if (equity < cost * 0.2) continue;
    const loan = cost - equity;
    if (loan > 0.5) {
      books = books || bankBooks(S);
      const lender = findLender(S, books, f.c, loan, f.bk); if (!lender) continue;
      f.debt = (f.debt || 0) + loan; lender.L += loan; f.bk = lender.f.id; f.cash += loan;
    }
    const r = buildRoad(G, null, path, { kind: 'rail', allowed: mine, free: true });
    if (!r.ok) continue;
    f.cash -= cost; done++;
    const a = S.cantons[f.c].name, b = S.cantons[t.k] ? S.cantons[t.k].name : t.cn;
    if (S === G) S.eco.news.push({ type: 'good', topic: 'aperturas', importance: 4, text: `${f.name} tiende por su cuenta una vía de tren de ${a} a ${b}: ${r.n} casillas de obra por ${fmt.bn(cost / 1e6)}${loan > cost * 0.4 ? ', buena parte con un préstamo' : ''}. Llegarán más trenes entre las dos ciudades.` });
    else pushWorldNews(G, { type: 'neutral', importance: 1, text: `Una compañía ferroviaria privada de ${S.country.name} une ${a} y ${b} por tren.` });
  }
}

// ---------- los gobiernos extranjeros también hacen carreteras y vías de tren (de vez en cuando) ----------
// Depende de quién gobierna: los partidos productivistas hacen más carreteras; los ecologistas prefieren el tren.
// Si las cuentas no le cuadran a un partido responsable (déficit por encima de lo que tolera), no hay obras.
// Primero unen sus ciudades (siempre hacia la red que sale de su capital, nunca dos veces lo mismo) y después
// llevan una línea hasta la frontera con cada vecino, una sola por vecino. Además, cada país tiene un tope de
// casillas de cada red según su tamaño. Solo construyen en su propio territorio.
const FOREIGN_INFRA_CAP = { road: [0.08, 8, 50], rail: [0.07, 7, 40] };
const foreignInfraCap = (n, kind) => { const [s, lo, hi] = FOREIGN_INFRA_CAP[kind]; return clamp(Math.round(n * s), lo, hi); };
function foreignInfraQuarter(G) {
  G.foreign.forEach(f => {
    const S = f.st; if (!S || !S.eco) return;
    const gp = foreignGovParty(f);
    const prod = gp ? clamp((gp.ideo.amb + 1.5) / 3, 0, 1) : 0.5;   // de ecologista (0) a productivista (1)
    const fis = gp ? partyFis(gp) : 0, wish = gp ? fiscalWish(S, gp) : 0;
    if (wish < 0 && fis > -0.4) return;                              // toca ahorrar: ni una obra
    const money = wish > 0 ? 1.3 : wish < 0 ? 0.5 : 1;
    const dev = f.dev ?? 0.5;
    const own = G.map.hexes.filter(h => h.c === f.mapIndex && roadBuildable(h));
    for (const kind of RNG.shuffle(NET_KINDS.slice())) {
      const cap = foreignInfraCap(own.length, kind), set = netSet(G, kind);
      const have = own.filter(h => set.has(roadKey(h.q, h.r))).length;
      if (have >= cap) continue;
      const p = (kind === 'road' ? 0.01 + 0.05 * prod : 0.015 + 0.03 * (1 - prod)) * money * (0.5 + dev);
      if (!RNG.chance(p)) continue;
      if (foreignBuild(G, f, kind, Math.min(ROAD_MAX_HEXES, cap - have))) break;
    }
  });
}
function foreignBuild(G, f, kind, room) {
  const S = f.st, N = NET[kind];
  const mine = h => roadBuildable(h) && h.c === f.mapIndex;
  const hubs = countryHubs(G, f.mapIndex);
  if (!hubs.length) return false;
  let path = null, why = 'interior', pick = null, toName = '';
  // 1) unir a la red de la capital la ciudad más cercana que aún no está en ella
  if (hubs.length > 1) {
    const d0 = netBFS(G, hubs[0], kind);
    const on = hubs.filter(h => d0.has(h)), off = hubs.filter(h => !d0.has(h));
    let best = null;
    for (const a of on) for (const b of off) { const d = HEX.dist(a, b); if (!best || d < best.d) best = { a, b, d }; }
    if (best && best.d <= room + 2) path = roadPath(G, [best.a.q, best.a.r], [best.b.q, best.b.r], mine, kind);
  }
  // 2) una línea hasta la frontera con un vecino al que aún no llega esta red (una por vecino)
  if (!path) {
    f.links = f.links || {}; const done = f.links[kind] = f.links[kind] || [];
    const idx = hexIndex(G), border = new Map();
    for (const h of G.map.hexes) {
      if (!mine(h)) continue;
      for (const [q, r] of HEX.neighbors(h.q, h.r)) { const n = idx.get(roadKey(q, r)); if (n && n.c >= 0 && n.c !== f.mapIndex && roadBuildable(n)) { if (!border.has(n.c)) border.set(n.c, new Set()); border.get(n.c).add(h); } }
    }
    const cands = [...border.keys()].filter(ci => !done.includes(ci));
    if (!cands.length) return false;
    pick = RNG.weighted(cands, ci => ci === (G.ci || 0) ? 0.3 + 1.5 * (f.friendliness ?? 0.5) : 1);
    const theirs = countryHubs(G, pick);
    const tc = theirs.sort((a, b) => HEX.dist(a, hubs[0]) - HEX.dist(b, hubs[0]))[0];
    if (!tc) { done.push(pick); return false; }
    const bh = [...border.get(pick)].sort((a, b) => HEX.dist(a, tc) - HEX.dist(b, tc))[0];
    const from = hubs.slice().sort((a, b) => HEX.dist(a, bh) - HEX.dist(b, bh))[0];
    done.push(pick);                                   // (se intenta una vez; si sale demasiado larga, no se hace)
    if (netBFS(G, from, kind).has(bh)) return false;
    path = roadPath(G, [from.q, from.r], [bh.q, bh.r], mine, kind);
    why = pick === (G.ci || 0) ? 'nosotros' : 'vecino';
    toName = pick === (G.ci || 0) ? G.country.name : ((G.foreign.find(x => x.mapIndex === pick) || {}).name || 'un vecino');
  }
  if (!path || path.length < 2) return false;
  const q = roadQuote(G, path, kind);
  if (!q.fresh.length || q.fresh.length > room) return false;
  const r = buildRoad(G, null, path, { kind, allowed: mine, free: true });
  if (!r.ok) return false;
  S.eco[N.q] = (S.eco[N.q] || 0) + netCostFor(S, q.fresh, kind);
  const what = kind === 'rail' ? 'una vía de tren' : 'una carretera';
  if (why === 'nosotros') pushWorldNews(G, { type: 'neutral', importance: 4, text: `${f.name} lleva ${what} hasta nuestra frontera (${r.n} ${r.n === 1 ? 'casilla' : 'casillas'} de obra). Si la continuamos hasta nuestras ciudades, ${kind === 'rail' ? 'el tren unirá los dos países y el comercio' : 'el comercio entre los dos países'} saldrá más barato.` });
  else if (why === 'vecino') pushWorldNews(G, { type: 'neutral', importance: 2, text: `${f.name} construye ${what} hacia ${toName}.` });
  else pushWorldNews(G, { type: 'neutral', importance: 1, text: `${f.name} une dos de sus ciudades con ${what} nueva.` });
  return true;
}
// (nombre antiguo)
const foreignRoadsQuarter = foreignInfraQuarter;

// ---------- partidas guardadas antes de las vías de tren ----------
// Les pone la red de partida y quita las carreteras que hacían los países extranjeros sin límite (las telarañas):
// con las reglas nuevas las volverán a hacer con cabeza. Las nuestras se quedan.
function migrateInfra(g) {
  if ((g.infraV || 0) >= 2) return;
  g.infraV = 2;
  const idx = hexIndex(g), ci = g.ci || 0;
  if ((g.roads || []).length) {
    const keep = g.roads.filter(k => { const h = idx.get(k); return h && h.c === ci; });
    if (keep.length !== g.roads.length) { g.roads = keep; g.roadVer = (g.roadVer || 0) + 1; g._mk = null; g._roadInfo = null; }
  }
  (g.foreign || []).forEach(f => { delete f.links; });
  if (!g.rails) initialRails(g);
}
