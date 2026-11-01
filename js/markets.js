// ============================================================
//  MERCADOS: ÓRDENES DE COMPRA Y VENTA, PRECIOS, TRANSPORTE Y COMERCIO ENTRE PAÍSES
//  · Cada turno las empresas de todos los países ponen a la venta lo que producen (órdenes de venta) y
//    hogares, empresas y administraciones piden lo que quieren comprar (órdenes de compra), cantón a cantón.
//  · Cada país tiene un precio en origen para cada producto (lo que cobra quien lo produce). Lo que se
//    compra en el mismo cantón donde se produce se paga a ese precio; lo que hay que traer de otro cantón
//    paga además el transporte (un tanto por cada paso), y lo que viene de otro país, sus aranceles (salvo
//    que los dos países tengan un tratado de libre comercio). Así un producto es más barato donde se
//    produce y más caro donde escasea.
//  · Cada comprador se queda con lo más barato que encuentra; lo que nadie compra ese turno se pierde y lo
//    que no se encuentra en ningún sitio falta. No hay más mundo que el de los países del mapa.
//  · Al acabar el turno, el precio en origen de cada país se ajusta comparando compras (D) y ventas (S):
//        P(t+1) = P(t) · e^(η·(D−S)/S)
//  Cantidades en unidades por turno; precios en miles de € por unidad.
// ============================================================
'use strict';

const PRICE_ETA = 0.2;                      // velocidad de ajuste de los precios (η)
const PRICE_MIN = 0.25, PRICE_MAX = 4;      // límites del precio en origen frente al de referencia
const TRADE_PULL = 1.5;
const UNSOLD_OK = 0.04;                     // parte de lo producido que normalmente se queda sin vender                     // empuje de importadores y exportadores cuando el precio se aleja del de otro país
const STEP_COST = { land: 1, sea: 1.5 };    // pasos que cuesta cruzar a un cantón vecino (por tierra o por mar)

// ---------- red de mercados ----------
// Nodos: los cantones de todos los países. Se construye siempre desde el estado de nuestro país (G.main).
function marketTopo(G0) {
  const G = G0.main || G0;
  if (G._mk) return G._mk;
  const nodes = [];
  G.cantons.forEach((c, i) => nodes.push({ key: 'c' + i, country: 0, nid: G.nid || 'f0', canton: i, name: c.name }));
  G.foreign.forEach(f => f.cantons.forEach(fc => nodes.push({ key: f.id + ':' + fc.idx, country: f.mapIndex, nid: f.id, fid: f.id, canton: fc.idx, name: fc.nominal ? f.name : fc.name + ' (' + f.name + ')' })));
  const idx = new Map(nodes.map((n, i) => [n.key, i]));
  const nodeOf = h => {
    if (!h || h.t === 'mar') return -1;
    if (h.c === 0) return idx.get('c' + h.k) ?? -1;
    const f = G.foreign.find(x => x.mapIndex === h.c); if (!f) return -1;
    return idx.get(f.id + ':' + Math.max(0, h.k)) ?? -1;
  };
  const byKey = new Map(G.map.hexes.map(h => [h.q + ',' + h.r, h]));
  const edges = new Map();
  const addE = (a, b, kind, steps) => { if (a === b || a < 0 || b < 0) return; const k = Math.min(a, b) + '-' + Math.max(a, b); const e = edges.get(k); if (!e || e.steps > steps) edges.set(k, { a: Math.min(a, b), b: Math.max(a, b), kind, steps }); };
  const coastal = nodes.map(() => []);
  for (const h of G.map.hexes) {
    const m = nodeOf(h); if (m < 0) continue;
    if (h.coast) coastal[m].push(h);
    for (const [q, r] of HEX.neighbors(h.q, h.r)) { const n = byKey.get(q + ',' + r); const m2 = nodeOf(n); if (m2 >= 0 && m2 !== m) addE(m, m2, 'land', STEP_COST.land); }
  }
  // rutas por mar entre costas cercanas (más caras cuanto más lejos)
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    if (!coastal[a].length || !coastal[b].length || edges.has(a + '-' + b)) continue;
    let best = Infinity;
    for (const x of coastal[a]) for (const y of coastal[b]) best = Math.min(best, HEX.dist(x, y));
    if (best <= 4) addE(a, b, 'sea', STEP_COST.sea);
    else if (best <= 10) addE(a, b, 'sea', STEP_COST.sea + (best - 4) * 0.35);
  }
  // ningún cantón puede quedar aislado: si una isla queda lejos de todo, se la une por mar al cantón más cercano
  const comp = nodes.map((_, i) => i), find = i => { while (comp[i] !== i) i = comp[i] = comp[comp[i]]; return i; };
  for (const e of edges.values()) comp[find(e.a)] = find(e.b);
  for (let guard = 0; guard < nodes.length; guard++) {
    let best = null;
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      if (find(a) === find(b) || !coastal[a].length || !coastal[b].length) continue;
      let d = Infinity; for (const x of coastal[a]) for (const y of coastal[b]) d = Math.min(d, HEX.dist(x, y));
      if (!best || d < best.d) best = { a, b, d };
    }
    if (!best) break;
    addE(best.a, best.b, 'sea', STEP_COST.sea + Math.max(0, best.d - 4) * 0.35);
    comp[find(best.a)] = find(best.b);
  }
  const E = Array.from(edges.values());
  // distancias (en pasos) entre todos los nodos: por cualquier ruta y solo por tierra
  const dijkstra = landOnly => nodes.map((_, s) => {
    const d = new Array(nodes.length).fill(Infinity); d[s] = 0;
    const done = new Array(nodes.length).fill(false);
    for (let it = 0; it < nodes.length; it++) {
      let u = -1; for (let v = 0; v < nodes.length; v++) if (!done[v] && (u < 0 || d[v] < d[u])) u = v;
      if (u < 0 || d[u] === Infinity) break;
      done[u] = true;
      for (const e of E) {
        if (landOnly && e.kind !== 'land') continue;
        const v = e.a === u ? e.b : e.b === u ? e.a : -1; if (v < 0) continue;
        if (d[u] + e.steps < d[v]) d[v] = d[u] + e.steps;
      }
    }
    return d;
  });
  G._mk = { nodes, edges: E, idx, nodeOf, dist: dijkstra(false), distLand: dijkstra(true) };
  return G._mk;
}
// Nodo de mercado de un cantón de un país
function marketNode(S, i) { const mk = marketTopo(S); return mk.idx.get((S.ci || 0) === 0 ? 'c' + i : S.nid + ':' + i); }

// ---------- aranceles y tratados ----------
// Un tratado de libre comercio necesita que los dos países lo tengan aprobado
const treatyHas = (t, g) => t === true || (Array.isArray(t) && t.includes(g));
const treatyCovers = (G, fid, g) => { const t = G.pol.tratados && G.pol.tratados[fid]; return treatyHas(t, g); };
function treatyBetween(A, B, g) { return treatyCovers(A, B.nid || 'f0', g) && treatyCovers(B, A.nid || 'f0', g); }
function importTariff(G, g) { const p = G.pol; const v = p.arImp && p.arImp[g]; return v != null ? v : (p.aranceles || 0); }
function exportTariff(G, g) { const p = G.pol; const v = p.arExp && p.arExp[g]; return v != null ? v : 0; }
// Precio de referencia de un producto (lo que vale «normalmente», en nuestra moneda de cada país)
const worldPrice = (G, g) => GOODS[g].price * ((G.world && G.world.prices && G.world.prices[g]) || 1) * ((G.eco && G.eco.nom) || 1);

// ---------- consumo por persona (para planificar empresas) ----------
// Reparto de una necesidad entre los bienes que la cubren: cada hogar mira lo que le cuesta cada bien por
// unidad cubierta (precio con IVA entre lo que cubre) y compra sobre todo el más barato, con algo de variedad.
// priceOf(g): precio del bien; devuelve { bien: parte de la necesidad que cubre }.
function needShares(n, priceOf, armasLaw) {
  const opts = [];
  if (!Object.keys(n.goods).length) return {};
  for (const g in n.goods) {
    let max = (n.max && n.max[g]) ?? 1;
    if (g === 'armas') { max = [0, 0.08, 0.25][armasLaw ?? 0]; if (max <= 0) continue; }
    opts.push({ g, c: Math.max(1e-9, priceOf(g)) / n.goods[g], max, min: (n.min && n.min[g]) || 0 });
  }
  if (opts.length === 1) return { [opts[0].g]: 1 };
  const cmin = Math.min(...opts.map(o => o.c));
  opts.forEach(o => { o.w = Math.pow(cmin / o.c, 4); });
  const out = {}; opts.forEach(o => out[o.g] = 0);
  // reparto con topes: lo que pasa del tope se reparte entre los demás
  let free = opts.slice(), left = 1;
  for (let it = 0; it < 4 && free.length; it++) {
    const wsum = sum(free, o => o.w);
    const capped = [];
    free.forEach(o => { const s = left * o.w / wsum; if (s > o.max) { out[o.g] = o.max; capped.push(o); } else out[o.g] = s; });
    if (!capped.length) break;
    left -= sum(capped, o => o.max); free = free.filter(o => !capped.includes(o));
    if (left <= 1e-9) break;
  }
  // (lo que tiene que cubrir como poco cada bien, como la carne entre los alimentos de lujo)
  for (const o of opts) if (o.min > out[o.g]) {
    const add = o.min - out[o.g]; out[o.g] = o.min;
    const rest = opts.filter(x => x !== o && out[x.g] > 0), rs = sum(rest, x => out[x.g]);
    rest.forEach(x => { out[x.g] -= add * out[x.g] / Math.max(1e-9, rs); });
  }
  const s = sum(Object.values(out)) || 1;
  for (const g in out) out[g] /= s;
  return out;
}
// Consumo de los hogares por persona y turno (unidades) para un nivel de riqueza, a precios de referencia
function needsPerCapita(wl, armasLaw) {
  const out = {}; GOOD_IDS.forEach(g => out[g] = 0);
  for (const n of NEEDS) {
    if (n.service) continue;
    const q = n.q[clamp(wl, 1, 10) - 1] * 0.85;   // 0,85 adultos equivalentes por persona
    if (!q) continue;
    const sh = needShares(n, g => GOODS[g].price, armasLaw);
    for (const g in sh) out[g] += q * sh[g] / n.goods[g];
  }
  return out;
}
// Qué produce cada bien (la «receta» de su empresa)
function recipeOf(g) {
  for (const k in FIRM_KINDS) { const K = FIRM_KINDS[k]; if (K.out && K.out[g] && (k !== 'ganaderia' || g === 'carne')) return K; }
  return null;
}

// ---------- el mercado de un producto en un turno, en todos los países a la vez ----------
// W: estados de los países; S[w][i] y D[w][i]: órdenes de venta y de compra (unidades) del cantón i del país w.
// Devuelve, para cada país, lo que consigue cada comprador, lo que vende cada vendedor, a qué precio y el nuevo precio.
function worldClearGood(W, g, S, D) {
  const mk = marketTopo(W[0]);
  const tau = GOODS[g].bulk, overseas = GOODS[g].overseas !== false, local = !!GOODS[g].local;
  const dist = overseas ? mk.dist : mk.distLand;
  // todos los cantones de todos los países en una lista
  const N = [];
  W.forEach((st, w) => st.cantons.forEach((c, i) => { const m = marketNode(st, i); if (m == null) return; N.push({ w, i, m, S: S[w][i] || 0, D: D[w][i] || 0 }); }));
  const P = W.map(st => st.eco.px[g]);
  // aranceles entre dos países (lo que paga quien compra en w lo que viene de u)
  const tar = W.map(A => W.map(B => {
    if (A === B) return { imp: 0, exp: 0 };
    if (treatyBetween(A, B, g)) return { imp: 0, exp: 0 };
    return { imp: importTariff(A, g), exp: exportTariff(B, g) };
  }));
  const R = W.map(() => ({ got: [], cost: [], sold: [], rev: [], imp: [], expQ: [], impVal: 0, expVal: 0, tariffs: 0, impComp: 0, partnerX: {}, partnerM: {} }));
  W.forEach((st, w) => { const n = st.cantons.length; ['got', 'cost', 'sold', 'rev', 'imp', 'expQ'].forEach(k => { R[w][k] = new Array(n).fill(0); }); });
  // 1) lo que se produce en un cantón se vende primero allí
  for (const x of N) {
    x.loc = Math.min(x.S, x.D); x.sur = x.S - x.loc; x.def = x.D - x.loc;
    const r = R[x.w], p = P[x.w];
    r.got[x.i] += x.loc; r.cost[x.i] += x.loc * p; r.sold[x.i] += x.loc; r.rev[x.i] += x.loc * p;
  }
  // 2) lo que falta se trae de donde salga más barato (otro cantón del país o de otro país)
  if (!local) {
    const offers = [];
    const defs = N.filter(x => x.def > 1e-9), surs = N.filter(x => x.sur > 1e-9);
    for (const c of defs) for (const k of surs) {
      const d = dist[k.m][c.m]; if (!isFinite(d)) continue;
      const t = tar[c.w][k.w];
      offers.push({ c, k, p: P[k.w] * (1 + tau * d) * (1 + t.imp) * (1 + t.exp), base: P[k.w] * (1 + tau * d), t });
    }
    offers.sort((a, b) => a.p - b.p);
    // si no llega para todos, el reparto es proporcional: ningún cantón (una isla, por ejemplo) se queda sin nada
    // solo porque el transporte hasta él sea más caro; primero cada comprador recibe la misma parte de lo que le falta
    // y después se reparte lo que sobre por orden de precio.
    const reachS = new Set(), reachD = new Set();
    for (const o of offers) { reachS.add(o.k); reachD.add(o.c); }
    const totS = sum([...reachS], k => k.sur), totD = sum([...reachD], c => c.def);
    const lam = totD > totS && totD > 1e-9 ? totS / totD : 1;
    for (const c of reachD) c.cap = c.def * lam;
    for (const pass of lam < 1 ? [0, 1] : [1]) for (const o of offers) {
      const c = o.c, k = o.k;
      if (c.def <= 1e-9 || k.sur <= 1e-9) continue;
      const q = Math.min(pass === 0 ? Math.max(0, c.cap) : c.def, k.sur);
      if (q <= 1e-9) continue;
      if (pass === 0) c.cap -= q;
      c.def -= q; k.sur -= q;
      const rc = R[c.w], rk = R[k.w];
      rc.got[c.i] += q; rc.cost[c.i] += q * o.p;
      rk.sold[k.i] += q; rk.rev[k.i] += q * o.base;
      if (c.w !== k.w) {
        const val = q * o.base;
        rc.imp[c.i] += q; rc.impVal += val; rk.expQ[k.i] += q; rk.expVal += val;
        rc.tariffs += val * o.t.imp; rk.tariffs += val * (1 + o.t.imp) * o.t.exp;
        const nidK = W[k.w].nid || 'f0', nidC = W[c.w].nid || 'f0';
        rc.partnerM[nidK] = (rc.partnerM[nidK] || 0) + val; rk.partnerX[nidC] = (rk.partnerX[nidC] || 0) + val;
        if (P[k.w] * (1 + o.t.imp) * (1 + o.t.exp) <= P[c.w] * 1.02) rc.impComp += q;   // solo cuenta como oferta lo que compite en precio
      }
    }
  }
  // 3) nuevo precio en origen de cada país: compras frente a ventas. Si otro país vende más barato (y le sobra),
  //    los importadores empujan el precio hacia abajo; si otro país paga más (y le falta), los exportadores, hacia arriba.
  const dmin = (a, b) => { let best = Infinity; for (const x of N) if (x.w === a) for (const y of N) if (y.w === b) best = Math.min(best, dist[x.m][y.m]); return best; };
  const out = W.map((st, w) => {
    const ref = worldPrice(st, g);
    const mine = N.filter(x => x.w === w);
    const Dn = sum(mine, x => x.D), Sn = sum(mine, x => x.S);
    const lost = sum(mine, x => x.sur), short = sum(mine, x => x.def);
    const r = R[w], Xq = sum(r.expQ);
    let Dt = Dn + Xq, St = Sn + r.impComp;
    if (!local) W.forEach((u, k) => {
      if (k === w) return;
      const uS = sum(N.filter(x => x.w === k), x => x.S), uD = sum(N.filter(x => x.w === k), x => x.D);
      const d = dmin(w, k); if (!isFinite(d)) return;
      const tIn = tar[w][k], tOut = tar[k][w];
      // le sobra a u y lo vende más barato que aquí
      const Pm = P[k] * (1 + tau * d) * (1 + tIn.imp) * (1 + tIn.exp);
      if (uS > uD * 1.02 && P[w] > Pm) St += TRADE_PULL * (P[w] / Pm - 1) * Dn * Math.min(1, (uS - uD) / Math.max(1e-9, Dn));
      // le falta a u y paga más que aquí
      const Px = P[k] / ((1 + tau * d) * (1 + tOut.imp) * (1 + tOut.exp));
      if (uD > uS * 1.02 && P[w] < Px) Dt += TRADE_PULL * (Px / P[w] - 1) * Math.max(Sn, Dn * 0.2) * Math.min(1, (uD - uS) / Math.max(1e-9, Sn + 1e-9));
    });
    let P2 = P[w], exc = 0;
    if (Dt > 1e-9 || St > 1e-9) {
      // (que sobre un poco es lo normal: existencias, mermas; los precios no bajan por eso)
      const Sx = St * (1 - UNSOLD_OK);
      exc = clamp((Dt - Sx) / Math.max(Sx, Dt * 0.1, 1e-9), -1, 1.5);
      P2 = P[w] * Math.exp(PRICE_ETA * exc);
    } else P2 = lerp(P[w], ref, 0.1);
    // ancla suave: sin presiones, los precios tienden muy despacio a su nivel normal en ese país
    P2 *= Math.pow(ref / P2, 0.01);
    P2 = clamp(P2, ref * PRICE_MIN, ref * PRICE_MAX);
    const n = st.cantons.length;
    const fill = range(n).map(i => { const x = mine.find(y => y.i === i); return x && x.D > 1e-9 ? r.got[i] / x.D : 1; });
    // precio que se paga en cada cantón (el de origen más el transporte de lo que se ha traído o se traería)
    const markup = range(n).map(i => {
      if (r.got[i] > 1e-9) return r.cost[i] / r.got[i] / P[w];
      const me = mine.find(y => y.i === i); if (!me) return 1;
      let best = Infinity;
      for (const k of N) {
        if (k.S <= 1e-9) continue;
        const d = k.m === me.m ? 0 : dist[k.m][me.m]; if (!isFinite(d) || (local && d > 0)) continue;
        const t = tar[w][k.w];
        best = Math.min(best, P[k.w] * (1 + tau * d) * (1 + t.imp) * (1 + t.exp) / P[w]);
      }
      return isFinite(best) ? best : 1.2;
    });
    const buyPrice = range(n).map(i => r.got[i] > 1e-9 ? r.cost[i] / r.got[i] : P[w] * markup[i]);
    const sellPrice = range(n).map(i => r.sold[i] > 1e-9 ? r.rev[i] / r.sold[i] : P[w]);
    const soldFrac = range(n).map(i => { const x = mine.find(y => y.i === i); return x && x.S > 1e-9 ? r.sold[i] / x.S : 1; });
    return { P: P[w], P2, exc, ref, fill, buyPrice, sellPrice, soldFrac, markup, got: r.got, sold: r.sold, imp: r.imp, expQ: r.expQ, lost, short,
      impVal: r.impVal, expVal: r.expVal, tariffs: r.tariffs, partnerX: r.partnerX, partnerM: r.partnerM, Dn, Sn };
  });
  return out;
}

// ---------- ventas a precio fijado (empresas públicas) ----------
// Una empresa pública con precio fijado no pasa por el mercado: si su precio está por debajo del de mercado, vende
// antes que nadie a los compradores de su cantón y, si le sobra, a los de los demás cantones de su país (con el
// transporte); lo que aún le sobre lo vende fuera a precio de mercado. Si su precio está por encima del de mercado,
// solo le compran quienes no encuentran el producto en el mercado; lo que no vende se pierde.
// list: [{ f, q }] (q: lo que produce este turno); D: órdenes de compra por cantón (no se tocan); Sarr: lo que se
// pone a la venta en el mercado por cantón (se le suma lo que sobra a precio de mercado).
function fixedPriceSales(st, g, list, D, Sarr) {
  const n = st.cantons.length, tau = GOODS[g].bulk, local = !!GOODS[g].local;
  const mk = marketTopo(st), dist = GOODS[g].overseas !== false ? mk.dist : mk.distLand;
  const node = range(n).map(i => marketNode(st, i));
  const P = st.eco.px[g];
  const Dl = D.slice(), got = new Array(n).fill(0), cost = new Array(n).fill(0);
  const late = [];
  const byDist = from => range(n).map(i => ({ i, d: i === from ? 0 : (node[from] != null && node[i] != null ? dist[node[from]][node[i]] : Infinity) }))
    .filter(o => isFinite(o.d) && (!local || o.d === 0)).sort((a, b) => a.d - b.d);
  list.sort((a, b) => a.f.fp[g] - b.f.fp[g]);
  for (const s of list) {
    const pf = s.f.fp[g];
    s.sold = 0; s.rev = 0; s.m = 0; s.left = s.q;
    if (pf > P * 1.0001) { late.push(s); continue; }
    for (const o of byDist(s.f.c)) {
      if (s.left <= 1e-9) break;
      const pb = pf * (1 + tau * o.d);
      if (o.d > 0 && pb >= P) continue;
      const q = Math.min(s.left, Dl[o.i]); if (q <= 1e-9) continue;
      Dl[o.i] -= q; s.left -= q; got[o.i] += q; cost[o.i] += q * pb; s.sold += q; s.rev += q * pf;
    }
    // lo que sobra, al mercado (a precio de mercado)
    Sarr[s.f.c] += s.left; s.m = s.left; s.left = 0;
  }
  return { Dleft: Dl, D, got, cost, late, list, byDist, tau };
}
// Después del mercado: los de precio alto venden a quien se ha quedado sin producto, y se juntan las cuentas de
// cada cantón (lo que consigue cada uno y lo que paga de media) con lo vendido a precio fijado
function fixedPriceAfter(st, g, X, r) {
  const n = st.cantons.length;
  const un = range(n).map(i => Math.max(0, X.Dleft[i] - r.got[i]));
  for (const s of X.late) {
    const pf = s.f.fp[g];
    for (const o of X.byDist(s.f.c)) {
      if (s.left <= 1e-9) break;
      const q = Math.min(s.left, un[o.i]); if (q <= 1e-9) continue;
      const pb = pf * (1 + X.tau * o.d);
      un[o.i] -= q; s.left -= q; X.got[o.i] += q; X.cost[o.i] += q * pb; s.sold += q; s.rev += q * pf;
    }
    r.lost += s.left; s.left = 0;
  }
  let soldFx = 0;
  for (const s of X.list) { soldFx += s.sold; s.f._fx = s.f._fx || {}; s.f._fx[g] = { q: s.sold, rev: s.rev, m: s.m }; }
  X.share = new Array(n).fill(0); X.pxFx = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (X.got[i] <= 1e-9) continue;
    const gotT = r.got[i] + X.got[i], costT = r.buyPrice[i] * r.got[i] + X.cost[i];
    X.share[i] = X.got[i] / gotT; X.pxFx[i] = X.cost[i] / X.got[i];
    r.buyPrice[i] = costT / gotT; r.got[i] = gotT;
    r.fill[i] = X.D[i] > 1e-9 ? Math.min(1, gotT / X.D[i]) : 1;
  }
  r.Dn += sum(X.D) - sum(X.Dleft); r.Sn += soldFx;
  r.short = Math.max(0, sum(range(n), i => X.D[i] - r.got[i]));
}

// ---------- estado de los mercados de un país ----------
// Precio en origen de cada producto (arranca en el de referencia) y precio de cada cantón
function initMarkets(G) {
  const e = G.eco;
  e.nom = e.nom || 1;
  e.px = Object.fromEntries(GOOD_IDS.map(g => [g, worldPrice(G, g)]));
  e.cprices = G.cantons.map(() => Object.fromEntries(GOOD_IDS.map(g => [g, e.px[g]])));
  e.prices = Object.assign({}, e.px);
}
// Precio que paga un comprador de un cantón (con el transporte)
const localPrice = (G, c, g) => (G.eco.cprices && G.eco.cprices[c] && G.eco.cprices[c][g]) || (G.eco.px && G.eco.px[g]) || GOODS[g].price;
// Al terminar los mercados del turno: precios nuevos, comercio exterior y resumen de cada producto
// res: resultados de este país por producto; opts.hold: no mover los precios (al preparar la partida)
function closeMarkets(G, res, opts = {}) {
  const e = G.eco, n = G.cantons.length;
  const trade = {};
  let exports = 0, imports = 0, tariffRev = 0, foodNet = 0;
  const partnerX = {}, partnerM = {};
  const A = x => x * 4 / 1e6;   // k€ del turno -> miles de millones al año
  e.pxPrev = Object.assign({}, e.px);
  for (const g of GOOD_IDS) {
    const r = res[g]; if (!r) continue;
    const newP = opts.hold ? r.P : r.P2;
    e.px[g] = newP;
    G.cantons.forEach((c, i) => { e.cprices[i][g] = newP * r.markup[i]; });
    const Dn = r.Dn, Sn = r.Sn;
    const got = sum(r.got);
    const avgBuy = sum(range(n), i => r.got[i] * r.buyPrice[i]) / Math.max(1e-9, got);
    const price = got > 1e-9 ? avgBuy : r.P;
    trade[g] = { name: GOODS[g].name, unit: GOODS[g].unit, q: Sn, qd: Dn, exc: r.exc, qx: sum(r.expQ), qm: sum(r.imp), lost: r.lost, short: r.short,
      fill: Dn > 1e-9 ? got / Dn : 1, soldF: Sn > 1e-9 ? sum(r.sold) / Sn : 1,
      prod: A(Sn * r.P), dem: A(Dn * price), exp: A(r.expVal), imp: A(r.impVal), net: A(r.expVal - r.impVal),
      origin: r.P, next: newP, price, ref: r.ref, min: Math.min(...G.cantons.map((c, i) => r.P * r.markup[i])), max: Math.max(...G.cantons.map((c, i) => r.P * r.markup[i])) };
    exports += trade[g].exp; imports += trade[g].imp; tariffRev += r.tariffs;
    if (GOODS[g].food) foodNet += trade[g].net;
    for (const k in r.partnerX) partnerX[k] = (partnerX[k] || 0) + r.partnerX[k];
    for (const k in r.partnerM) partnerM[k] = (partnerM[k] || 0) + r.partnerM[k];
  }
  e.trade = trade; e.exports = exports; e.imports = imports; e.tradeBalance = exports - imports; e.foodNet = foodNet;
  e.prices = Object.fromEntries(GOOD_IDS.map(g => [g, trade[g] ? trade[g].price : e.px[g]]));
  e.tariffRev = A(tariffRev);   // miles de millones al año
  e.partners = (G.foreign || []).map(f => ({ id: f.id, name: f.name, exports: A(partnerX[f.id] || 0), imports: A(partnerM[f.id] || 0) }));
}
