// ============================================================
//  NECESIDADES DE LOS HOGARES (al estilo de Victoria 3)
//  · Cada hogar tiene un nivel de riqueza (1-10) según sus ingresos por adulto equivalente.
//    El nivel cambia poco a poco: sube un escalón por turno si los ingresos lo permiten
//    y baja si el hogar no llega a cubrir sus necesidades.
//  · La cesta de cada nivel pide unas unidades de cada necesidad por turno (data.js, NEEDS). Cada
//    necesidad se cubre con unos bienes (en alimentos básicos, el grano cuenta 1, el pescado 1,5 y la
//    carne 2); el hogar compra sobre todo lo que le sale más barato por unidad cubierta.
//  · El hogar paga antes el IRPF y la hipoteca; luego pide su cesta (con IVA). Si no le llega, tira de
//    ahorros y, si tampoco, pide primero lo básico. Lo que pide son sus órdenes de compra en el mercado
//    de su cantón; lo que consigue de verdad (si falta algo) es lo que paga y lo que cubre.
// ============================================================
'use strict';

// (orden en el que se cubren si no llega el dinero: primero lo básico)
const NEED_ORDER = ['salud', 'comida', 'calor', 'ropaS', 'enseres', 'ropa', 'lujo', 'hogar', 'ocio'];
// Lo que necesita de salud cada persona según su edad (los niños, la mitad)
const healthAgeF = age => age < 30 ? 0.6 : age < 60 ? 1 : age < 75 ? 1.6 : 2.2;
const NEEDS_BY_ID = Object.fromEntries(NEEDS.map(n => [n.id, n]));
const NEED_IDX = Object.fromEntries(NEED_IDS.map((id, k) => [id, k]));
function wealthTarget(G, eqIncome) {
  const real = eqIncome / Math.max(0.5, (G.eco.priceIndex || 100) / 100);
  let wl = 1;
  for (let i = 0; i < WEALTH_INCOME.length; i++) if (real >= WEALTH_INCOME[i]) wl = i + 1;
  return wl;
}
// Cuánto se acerca al nivel siguiente (0-1): con lo que le sobra, el hogar ya compra algo de su cesta
function wealthFrac(G, eqIncome, wl) {
  if (wl >= 10) return 0;
  const real = eqIncome / Math.max(0.5, (G.eco.priceIndex || 100) / 100);
  const a = WEALTH_INCOME[wl - 1], b = WEALTH_INCOME[wl];
  return clamp((real - a) / Math.max(1e-9, b - a), 0, 1);
}
// Unidades de una necesidad que pide cada adulto equivalente en el nivel wl (y fr hacia el siguiente)
const needQ = (n, wl, fr) => n.q[wl - 1] * (1 - (fr || 0)) + n.q[Math.min(9, wl)] * (fr || 0);
// (con los tipos de interés bajos se ahorra menos: el colchón que se quiere tener es más pequeño)
const WEALTH_DRAW = 0.2, WEALTH_REFILL = 0;
const saveBuffer = G => clamp(1 + 40 * ((G.eco.depRate ?? 0.008) - 0.008), 0.5, 1.6);
// Ahorros que quiere tener una persona (miles de €)
function wealthGoal(cz) {
  if (cz.prof === 'jubilado') return 45 * (0.5 + cz.lvl / 3);
  if (cz.prof === 'estudiante') return 2;
  return Math.max(5, cz.income || 15) * 0.5 * clamp((cz.age - 20) / 6, 0.1, 6) * (cz.role === 'hijo' ? 1.3 : 1);
}
const vatRate = (G, c) => taxN(G, 'iva') + taxC(c, 'iva');
// Reparto de cada necesidad entre sus bienes y coste (con IVA) de una unidad de necesidad, en cada cantón
function needCosts(G, smooth) {
  const p = G.pol;
  return G.cantons.map((c, i) => {
    const vf = 1 + vatRate(G, c);
    const out = {};
    c.needSh = c.needSh || {};
    for (const n of NEEDS) {
      if (n.service) { out[n.id] = { sh: {}, unit: 0 }; continue; }
      // la gente cambia sus costumbres poco a poco: el reparto se mueve hacia el nuevo cada turno
      let sh = needShares(n, g => localPrice(G, i, g), p.armasCiviles);
      const old = c.needSh[n.id];
      if (old && smooth) { const m = {}; for (const g in sh) m[g] = lerp(old[g] ?? sh[g], sh[g], 0.3); const t = sum(Object.values(m)) || 1; for (const g in m) m[g] /= t; sh = m; }
      if (smooth) c.needSh[n.id] = sh;
      out[n.id] = { sh, unit: vf * sum(Object.entries(sh), ([g, s]) => s * localPrice(G, i, g) / n.goods[g]) };
    }
    return out;
  });
}
// Órdenes de compra de los hogares para este turno.
// liquid: Map hogar -> dinero del que dispone (k€), ya pagados el IRPF y la hipoteca. Sin liquid (al
// preparar la partida) cada hogar pide su cesta entera.
function householdDemand(G, liquid) {
  const members = new Map(); for (const cz of G.citizens) { if (!members.has(cz.hh)) members.set(cz.hh, []); members.get(cz.hh).push(cz); }
  const costs = needCosts(G, !!liquid);
  const ord = G.cantons.map(() => Object.fromEntries(GOOD_IDS.map(g => [g, 0])));
  for (const home of G.homes) {
    const ms = members.get(home.id) || [];
    const i = home.c;
    const eq = ms.length + home.kids.length * 0.5;
    home._o = null;
    if (!eq) continue;
    // (lo que se va en la hipoteca no se puede gastar en la cesta)
    const mort = sum(ms, cz => cz.hip ? annuityQ(cz.hip.p, G.eco.mortRate || 0.04, cz.hip.n) * 4 : 0);
    const inc0 = Math.max(0, sum(ms, cz => Math.max(0, cz.income || 0)) - mort);
    const L = liquid ? (liquid.get(home.id) || 0) : sum(ms, cz => Math.max(0, cz.sav || 0));
    // ahorros: cada hogar quiere tener los suyos según la edad (los mayores han ahorrado más); si tiene más,
    // gasta parte de lo que le sobra; si tiene menos, ahorra algo para reponerlos
    const T = sum(ms, wealthGoal) * saveBuffer(G);
    const inc = Math.max(0.5 * inc0, inc0 + (L > T ? WEALTH_DRAW : WEALTH_REFILL) * (L - T));
    const target = wealthTarget(G, inc / eq);
    const wl = liquid ? (home.wl || target) : target;
    home._target = target;
    // parte del camino al nivel siguiente: la que permiten los ingresos (si ya está en su nivel)
    const fr = wl < target ? 1 : wl > target ? 0 : wealthFrac(G, inc / eq, wl);
    let budget = liquid ? L : Infinity;
    const o = { wl, fr, eq, need: {}, goods: {}, cost: 0, budget };
    for (const nid of NEED_ORDER) {
      const n = NEEDS_BY_ID[nid];
      // salud: no se compra en el mercado (la cubren la sanidad pública y las clínicas); pesa más la de los mayores
      if (n.service) { const q = needQ(n, wl, fr) * (sum(ms, cz => healthAgeF(cz.age)) + home.kids.length * 0.5); if (q) o.need[nid] = { q, gq: {}, svc: true }; continue; }
      const q = needQ(n, wl, fr) * eq; if (!q) continue;
      const nc = costs[i][nid], cost = q * nc.unit;
      const f = cost <= 1e-9 ? 1 : clamp(budget / cost, 0, 1);
      budget -= cost * f; o.cost += cost;
      const gq = {};
      for (const g in nc.sh) { const u = q * f * nc.sh[g] / n.goods[g]; if (u > 0) { gq[g] = u; o.goods[g] = (o.goods[g] || 0) + u; ord[i][g] += u; } }
      o.need[nid] = { q, gq };
    }
    home._o = o;
  }
  G.cantons.forEach((c, i) => { c.hhDemand = ord[i]; });
  return ord;
}
// Lo que consiguen y pagan los hogares tras los mercados del turno.
// fill[c][g]: parte de lo pedido que consiguen; price[c][g]: precio medio pagado (sin IVA). Devuelve lo que
// gasta cada hogar (k€ del turno). opts.init: al preparar la partida (el nivel queda en el de sus ingresos).
function householdSettle(G, fill, price, opts = {}) {
  const e = G.eco;
  const vat = G.cantons.map(c => [taxN(G, 'iva'), taxC(c, 'iva')]);
  const vatTax = G.cantons.map(() => [0, 0, 0]);   // [IVA del Estado, IVA del cantón, compras sin IVA] (k€ del turno)
  const needV = NEED_IDS.map(() => 0), needMet = NEED_IDS.map(() => 0);
  const cNeed = G.cantons.map(() => ({ v: NEED_IDS.map(() => 0), m: NEED_IDS.map(() => 0) }));
  const basket = {}; GOOD_IDS.forEach(g => basket[g] = 0);
  const wlHist = new Array(10).fill(0);
  const members = new Map(); for (const cz of G.citizens) members.set(cz.hh, (members.get(cz.hh) || 0) + 1);
  const spent = new Map();
  for (const home of G.homes) {
    const o = home._o; if (!o) continue;
    const i = home.c;
    let paid = 0, met = 0, total = 0;
    for (const nid in o.need) {
      const n = NEEDS_BY_ID[nid], k = NEED_IDX[nid], x = o.need[nid];
      let cover = 0;
      if (x.svc) cover = x.q * clamp(G.cantons[i].healthMet ?? 1, 0, 1);
      for (const g in x.gq) {
        const u = x.gq[g] * fill[i][g];
        cover += u * n.goods[g];
        const net = u * price[i][g];
        paid += net * (1 + vat[i][0] + vat[i][1]);
        vatTax[i][0] += net * vat[i][0]; vatTax[i][1] += net * vat[i][1]; vatTax[i][2] += net;
        basket[g] += u;
      }
      // lo que pesa cada necesidad: lo que cuesta a precios de referencia
      const wgt = NEED_UNIT_REF[nid];
      met += Math.min(cover, x.q) * wgt; total += x.q * wgt;
      needV[k] += x.q; needMet[k] += Math.min(cover, x.q); cNeed[i].v[k] += x.q; cNeed[i].m[k] += Math.min(cover, x.q);
    }
    // necesidades del nivel que no se han pedido por falta de dinero
    for (const nid of NEED_ORDER) {
      if (o.need[nid] || NEEDS_BY_ID[nid].service) continue;
      const q = needQ(NEEDS_BY_ID[nid], o.wl, o.fr) * o.eq; if (!q) continue;
      const k = NEED_IDX[nid]; total += q * NEED_UNIT_REF[nid]; needV[k] += q; cNeed[i].v[k] += q;
    }
    spent.set(home.id, paid);
    const F = total ? met / total : 1;
    // el nivel de vida cambia poco a poco: sube si los ingresos dan para más y baja si no llega
    const target = home._target || o.wl, wl = o.wl;
    // (si lo que falta es porque no hay en el mercado y no por dinero, no baja de nivel)
    const afford = o.cost > 1e-9 ? Math.min(1, o.budget / o.cost) : 1;
    const goal = F < 0.85 && afford < 0.95 ? Math.min(target, wl - 1) : target;
    home.wl = clamp(opts.init ? target : wl + Math.sign(goal - wl), 1, 10);
    home.F = Math.round(F * 1000) / 1000;
    wlHist[home.wl - 1] += (members.get(home.id) || 0) + home.kids.length;
  }
  G.cantons.forEach((c, i) => { c.needs = NEED_IDS.map((id, k) => ({ id, v: cNeed[i].v[k], met: cNeed[i].v[k] ? cNeed[i].m[k] / cNeed[i].v[k] : 1 })); });
  e.needs = NEED_IDS.map((id, k) => ({ id, v: needV[k], met: needV[k] ? needMet[k] / needV[k] : 1 }));
  const wsum = sum(NEED_IDS, id => (e.needs[NEED_IDX[id]].v) * NEED_UNIT_REF[id]);
  e.needsMet = wsum ? sum(NEED_IDS, id => e.needs[NEED_IDX[id]].v * e.needs[NEED_IDX[id]].met * NEED_UNIT_REF[id]) / wsum : 1;
  e.wealthHist = wlHist;
  e.vatTax = vatTax;
  e.hhSpend = sum([...spent.values()]) / QF;   // gasto de los hogares en su cesta (k€ al año)
  e.basket = basket;                          // unidades que compran los hogares en el turno (para el IPC)
  return spent;
}
