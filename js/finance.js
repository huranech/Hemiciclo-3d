// ============================================================
//  AHORRO, BANCOS, PRÉSTAMOS, VIVIENDA Y CONSTRUCCIÓN
//  · Cada habitante tiene sus ahorros (cz.sav, k€) depositados en un banco (cz.bk).
//  · Los bancos prestan: hipotecas (cz.hip) y préstamos a empresas (f.debt).
//  · No hay alquiler: para independizarse hay que comprar una vivienda vacía,
//    al contado o con hipoteca.
//  · Las constructoras levantan viviendas donde hay demanda y los edificios de las
//    empresas nuevas y de los centros públicos. Cada casilla tiene un límite de parcelas.
// ============================================================
'use strict';

const CLIENTS_PER_ADMIN = 50;   // clientes que atiende un oficinista
const BANK_FEE = 0.06;          // comisiones: k€ por cliente y trimestre
const WQ_PER_WORKER = 1.0;      // obra (trabajador × trimestre) que hace un operario en un trimestre
const LOAN_Q_FIRM = 40;         // trimestres para devolver un préstamo de empresa
const VACANCY_NORMAL = 0.07;    // parte de viviendas vacías con la que los precios no se mueven

// ---------- reglas que dependen de las leyes ----------
function mortgageRules(G) {
  const v = G.pol.hipotecas ?? 1;
  return { ltv: [0.7, 0.8, 0.9, 1.0][v], dti: [0.30, 0.35, 0.40, 0.50][v], years: [20, 25, 30, 35][v] };
}
const capReq = G => [0.05, 0.08, 0.12][G.pol.solvencia ?? 1];
const lotsMult = G => [0.85, 1, 1.25][G.pol.suelo ?? 1];
const maxFloors = G => [5, 8, 12][G.pol.suelo ?? 1];
const evictAfter = G => [4, 8, 8][G.pol.desahucios ?? 1];
const depositGuarantee = G => [0, 100, Infinity][G.pol.garantiaDepositos ?? 1];

// Cuota trimestral de un préstamo (sistema francés)
function annuityQ(P, rate, nq) {
  if (P <= 0) return 0;
  nq = Math.max(1, nq);
  const i = rate / 4;
  return i < 1e-6 ? P / nq : P * i / (1 - Math.pow(1 + i, -nq));
}

// ---------- tipos de interés ----------
function updateRates(G, initial) {
  const e = G.eco, p = G.pol;
  const pi = e.inflation ?? 0.02, g = e.growth ?? 0.02;
  const target = p.bancoCentral === 'gobierno'
    ? clamp(0.01 + 0.4 * (pi - 0.02), 0, 0.05)
    : clamp(0.02 + 1.1 * (clamp(pi, -0.02, 0.15) - 0.02) + 0.15 * (clamp(g, -0.05, 0.08) - 0.02) - 0.4 * Math.max(0, (e.unemployment ?? 0.06) - 0.08), 0, 0.1);
  // el banco central mueve el tipo poco a poco (como mucho medio punto por trimestre)
  e.policyRate = initial || e.policyRate == null ? target : e.policyRate + clamp((target - e.policyRate) * 0.3, -0.005, 0.005);
  e.depRate = Math.max(0, e.policyRate - 0.012);
  e.mortRate = e.policyRate + 0.02 + [0, 0.003, 0.008][p.desahucios ?? 1];
  e.firmRate = e.policyRate + 0.035;
}

// ---------- parcelas de cada casilla ----------
function isUrbanizable(G, h) {
  if (!h || h.c !== (G.ci || 0) || h.t === 'mar' || isSettlement(h)) return false;
  if ((G.pol.suelo ?? 1) < 2 || h.rel === 'montana' || h.t === 'roca' || hasF(h, 'bosque')) return false;
  return HEX.neighbors(h.q, h.r).some(([q, r]) => isSettlement(hexAtG(G, q, r)));
}
function baseLots(h) {
  if (!h || h.t === 'mar') return 0;
  if (isCity(h)) return h.cs ? 34 + 6 * h.cs : 28;
  if (hasF(h, 'pueblo')) return 22;
  if (hasF(h, 'fabrica')) return 14;
  if (h.rel === 'montana') return 5;
  let b = h.rel === 'colinas' ? 7 : 10;
  if (hasF(h, 'bosque')) b -= 3;
  return b;
}
const hexLots = (G, h) => Math.floor(baseLots(h) * lotsMult(G));
// Parcelas ocupadas por casilla (viviendas, empresas, centros y obras de viviendas)
function lotsUsed(G) {
  const used = new Map();
  const add = (q, r, n) => { const k = q + ',' + r; used.set(k, (used.get(k) || 0) + n); };
  for (const h of G.map.hexes) {
    if (h.c !== (G.ci || 0) || h.t === 'mar') continue;
    const n = (h.nh || 0) * LOTS.casa + (h.bb ? h.bb.length : 0) * LOTS.bloque;
    if (n) add(h.q, h.r, n);
  }
  for (const f of G.firms) if (f.q != null) add(f.q, f.r, LOTS[f.ctype || f.kind] || 1);
  for (const w of G.works || []) if (isHomeWork(w)) add(w.q, w.r, LOTS[w.t]);
  return used;
}
function lotsFree(G, h, used) { return hexLots(G, h) - ((used || lotsUsed(G)).get(h.q + ',' + h.r) || 0); }

// ---------- bancos ----------
function banksIn(G, canton) { return G.firms.filter(f => f.kind === 'banco' && !f.obra && (canton == null || f.c === canton)); }
function assignBank(G, cz) {
  let list = banksIn(G, cz.c); if (!list.length) list = banksIn(G);
  cz.bk = list.length ? RNG.weighted(list, f => 1 + (f.staffN || 1)).id : null;
}
// Balance de cada banco: depósitos, préstamos y clientes
function bankBooks(G) {
  const m = new Map();
  for (const f of G.firms) if (f.kind === 'banco') m.set(f.id, { f, D: 0, L: 0, n: 0, mort: 0, perf: 0, firmL: 0 });
  for (const cz of G.citizens) {
    const b = m.get(cz.bk); if (b) { b.n++; b.D += Math.max(0, cz.sav || 0); }
    if (cz.hip) { const h = m.get(cz.hip.b); if (h) { h.L += cz.hip.p; h.mort += cz.hip.p; if (!cz.hip.ar) h.perf += cz.hip.p; } }
  }
  for (const f of G.firms) if (f.debt > 0) { const b = m.get(f.bk); if (b) { b.L += f.debt; b.firmL += f.debt; } }
  return m;
}
// Lo que aún puede prestar un banco: lo limitan su capital (solvencia) y sus fondos (depósitos, más lo que
// le presta el banco central contra sus préstamos)
function bankRoom(G, b) { return b ? Math.min(b.D * 0.95 + Math.max(0, b.f.cash) + 0.3 * b.L - b.L, Math.max(0, b.f.cash) / capReq(G) - b.L) : 0; }
// Busca un banco que pueda prestar esa cantidad (primero el propio, luego los del cantón, luego cualquiera)
function findLender(G, books, canton, amt, prefer) {
  const own = books.get(prefer);
  if (own && bankRoom(G, own) >= amt) return own;
  const all = Array.from(books.values()).filter(b => !b.f.obra && bankRoom(G, b) >= amt);
  if (!all.length) return null;
  const near = all.filter(b => b.f.c === canton);
  return (near.length ? near : all).sort((a, b) => bankRoom(G, b) - bankRoom(G, a))[0];
}

// ---------- precios de la vivienda ----------
function wageFactor(G) { const e = G.eco; return clamp((e.avgWage || 30) / (e.avgWage0 || e.avgWage || 30), 0.5, 3); }
function locFactor(h) { return !h ? 1 : isCity(h) ? (h.cs ? 1.3 : 1.12) : hasF(h, 'pueblo') ? 0.92 : 0.8; }
function marketPrice(G, kind, h, canton) {
  const c = G.cantons[canton != null ? canton : h.k];
  return HOUSING.price[kind] * ((c && c.housePx) || 1) * locFactor(h) * wageFactor(G);
}
// Precio al que se vende una vivienda vacía concreta
function slotPrice(G, sl) {
  const h = hexAtG(G, sl.q, sl.r);
  let px = marketPrice(G, sl.kind, h, sl.c);
  const fs = G.forSale && G.forSale[sl.key];
  if (fs) px *= 1 - 0.025 * Math.min(8, (G.turn || 0) - (fs.t || 0));   // las promotoras rebajan lo que no venden
  return px;
}
// Coste de una unidad de obra: sueldos y madera (los materiales, el suelo y las licencias son otra parte del precio)
function workCost(G, canton) {
  const e = G.eco, c = G.cantons[canton];
  const cons = G.firms.filter(f => f.kind === 'constructora');
  const wage = avg(cons, f => f.wage) || e.avgWage || 30;
  const mat = HOUSING.maderaPerWork * localPrice(G, canton, 'madera') + HOUSING.piedraPerWork * localPrice(G, canton, 'piedra');
  return wage * (1 + nomRate(G, c)) / 4 / WQ_PER_WORKER + mat;
}
// Coste total de levantar una vivienda que se venderá a ese precio
const unitCost = (G, canton, kind, price) => workCost(G, canton) * HOUSING.work[kind] + price * HOUSING.otherShare;

// ---------- viviendas vacías ----------
function vacantSlots(G) {
  const taken = new Set(G.homes.map(homeKey));
  return homeSlots(G).filter(sl => !taken.has(sl.key));
}

// Financiación de una compra: { ok, cash, loan, lender, aid, reason }
//   sav: ahorros disponibles; income: ingresos netos anuales; age: edad del titular
function financePurchase(G, books, price, sav, income, age, canton, prefer) {
  const e = G.eco, R = mortgageRules(G), p = G.pol;
  const aid = p.ayudaCompra === 2 ? price * 0.1 : 0;
  const need = price - aid + price * HOUSING.buyCosts;
  const reserve = 3;
  if (sav - reserve >= need) return { ok: true, cash: need, loan: 0, aid };
  let ltv = R.ltv; if (p.ayudaCompra === 1 && age < 36) ltv = Math.min(1, ltv + 0.15);
  const own = Math.max(0, sav - reserve);
  const loan = need - own;
  if (loan > ltv * price + 1e-6) return { ok: false, reason: 'entrada' };
  const years = Math.min(R.years, Math.max(5, 75 - age));
  const pay = annuityQ(loan, e.mortRate || 0.035, years * 4) * 4;
  if (income <= 0 || pay > R.dti * income) return { ok: false, reason: 'cuota' };
  const lender = findLender(G, books, canton, loan, prefer);
  if (!lender) return { ok: false, reason: 'banco' };
  return { ok: true, cash: own, loan, lender, aid, nq: years * 4 };
}
// Ejecuta la compra: paga al vendedor (si es una promotora o un banco) y apunta la hipoteca
function closePurchase(G, books, fin, buyer, sl, price) {
  buyer.sav = (buyer.sav || 0) - fin.cash;
  if (fin.loan > 0) { buyer.hip = { b: fin.lender.f.id, p: fin.loan, n: fin.nq, ar: 0 }; fin.lender.L += fin.loan; fin.lender.mort += fin.loan; }
  if (fin.aid) G.eco.aidQ = (G.eco.aidQ || 0) + fin.aid;
  const fs = G.forSale && G.forSale[sl.key];
  if (fs) {
    const seller = G.firms.find(f => f.id === fs.f);
    if (seller) { seller.cash += price; seller.salesQ = (seller.salesQ || 0) + price; }
    delete G.forSale[sl.key];
  }
}

// Casilla preferida para vivir: cerca del trabajo, o donde vive ahora
function preferredHex(G, cz, firmsById) {
  const f = cz.firm && firmsById.get(cz.firm);
  if (f && f.q != null) return hexAtG(G, f.q, f.r);
  const home = G.homes.find(h => h.id === cz.hh);
  if (home) return hexAtG(G, home.q, home.r);
  const c = G.cantons[cz.c]; return hexAtG(G, c.cityHex[0], c.cityHex[1]);
}
// Busca entre las viviendas vacías del cantón la mejor que se pueda permitir
function shopFor(G, books, buyer, canton, pref, opts) {
  const pool = opts.free.filter(sl => sl.c === canton && (!opts.kind || sl.kind === opts.kind));
  if (!pool.length) return { res: 'nada' };
  const scored = pool.map(sl => { const px = slotPrice(G, sl); return { sl, px, s: px * (1 + 0.06 * (pref ? HEX.dist(pref, sl) : 0)) }; }).sort((a, b) => a.s - b.s).slice(0, 12);
  let reason = 'cuota';
  for (const o of scored) {
    const fin = financePurchase(G, books, o.px, opts.sav, opts.income, opts.age, canton, buyer && buyer.bk);
    if (fin.ok) return { res: 'ok', sl: o.sl, px: o.px, fin };
    reason = fin.reason;
  }
  return { res: 'caro', reason };
}

// ---------- el mercado de la vivienda del trimestre (lo llama demography) ----------
//  Jóvenes que se independizan e inmigrantes compran viviendas vacías.
function housingMarket(G, inflow) {
  const e = G.eco;
  const books = bankBooks(G);
  const free = vacantSlots(G);
  const firmsById = new Map(G.firms.map(f => [f.id, f]));
  G.hdem = G.hdem || {};
  for (const k in G.hdem) { G.hdem[k] *= 0.7; if (G.hdem[k] < 0.05) delete G.hdem[k]; }
  const hm = G.cantons.map(() => ({ tries: 0, buys: 0, noSlot: 0, unaff: 0 }));
  const take = sl => { free.splice(free.indexOf(sl), 1); };
  const demand = h => { if (h) G.hdem[h.q + ',' + h.r] = (G.hdem[h.q + ',' + h.r] || 0) + 1; };
  // 1) jóvenes que quieren independizarse
  for (const cz of G.citizens) {
    if (cz.role !== 'hijo' || cz.age < 22 || cz.age > 45) continue;
    const want = cz.emp ? (cz.age >= 27 ? 0.12 : 0.07) : (cz.sav > 60 ? 0.04 : 0);
    if (!want || !RNG.chance(want)) continue;
    const st = hm[cz.c]; st.tries++;
    const pref = preferredHex(G, cz, firmsById);
    demand(pref);
    // la familia ayuda con la entrada (una parte de sus ahorros)
    const family = G.citizens.filter(z => z.hh === cz.hh && z !== cz && z.role !== 'hijo' && (z.sav || 0) > 10);
    const help = sum(family, z => (z.sav - 10) * 0.4);
    const r = shopFor(G, books, cz, cz.c, pref, { free, sav: (cz.sav || 0) + help, income: Math.max(0, cz.income || 0), age: cz.age });
    if (r.res === 'nada') { st.noSlot++; cz.wantsHome = 1; continue; }
    if (r.res === 'caro') { st.unaff++; cz.wantsHome = 1; e.whyNot = e.whyNot || {}; e.whyNot[r.reason] = (e.whyNot[r.reason] || 0) + 1; continue; }
    take(r.sl);
    if (help > 0) {
      // lo que pone la familia sale de sus ahorros, en proporción
      const used = Math.max(0, Math.min(help, r.fin.cash - (cz.sav || 0)));
      family.forEach(z => { z.sav -= used * ((z.sav - 10) * 0.4) / help; });
      cz.sav = (cz.sav || 0) + used;
    }
    closePurchase(G, books, r.fin, cz, r.sl, r.px);
    G.nextHomeId = (G.nextHomeId || 0) + 1;
    G.homes.push({ id: G.nextHomeId, c: r.sl.c, q: r.sl.q, r: r.sl.r, b: r.sl.b, u: r.sl.u, kind: r.sl.kind, sn: surnameOf(cz.nm), kids: [] });
    cz.hh = G.nextHomeId; cz.role = 'titular'; cz.urban = r.sl.kind === 'piso'; delete cz.wantsHome;
    st.buys++;
  }
  // 2) inmigrantes: solo llegan si pueden comprar una vivienda
  let immigrants = 0, blocked = 0;
  const avgNet = e.avgNet || 20;
  let want = Math.floor(inflow) + (RNG.chance(inflow - Math.floor(inflow)) ? 1 : 0);
  for (let guard = 0; want > 0 && guard < 40; guard++) {
    const c = RNG.weighted(G.cantons, cc => (cc.stats.pop || cc.pop) * (0.6 + cc.urban));
    const plan = householdPlan(RNG.chance(c.urban) ? 'piso' : 'casa');
    if (plan.type === 'tres') plan.adults.pop();
    const workers = plan.adults.filter(a => a.age < G.pol.jubilacion && a.age >= 18).length || 1;
    const sav = RNG.range(10, 45) * plan.adults.length;
    const hm1 = hm[c.idx]; hm1.tries++;
    const pref = hexAtG(G, c.cityHex[0], c.cityHex[1]);
    demand(pref);
    const r = shopFor(G, books, null, c.idx, pref, { free, sav, income: 0.7 * avgNet * workers, age: plan.adults[0].age });
    if (r.res !== 'ok') { if (r.res === 'nada') hm1.noSlot++; else hm1.unaff++; blocked++; want--; continue; }
    take(r.sl);
    const { home, made } = settleHousehold(G, r.sl, plan, 'extranjero', RNG.pick(G.foreign).id, 0);
    home.kids.forEach(k => { k.o = 'extranjero'; });
    made.forEach(cz => {
      cz.sav = 0; assignBank(G, cz);
      if (cz.prof === 'jubilado' || cz.prof === 'estudiante') return;
      cz.prof = 'parado'; cz.emp = false; cz.sector = null; cz.lvl = Math.min(cz.lvl, 3);
      computeIdeology(G, cz, PROFESSIONS.parado, false);
    });
    const head = made[0];
    if (head) { head.sav = sav; closePurchase(G, books, r.fin, head, r.sl, r.px); }
    hm1.buys++;
    immigrants += made.length + home.kids.length; want -= made.length;
  }
  // 3) precios: suben si escasean las viviendas vacías y bajan si sobran
  const vac = new Array(G.cantons.length).fill(0), stock = new Array(G.cantons.length).fill(0);
  homeSlots(G).forEach(sl => { stock[sl.c]++; });
  free.forEach(sl => { vac[sl.c]++; });
  G.cantons.forEach((c, i) => {
    const s = hm[i], share = vac[i] / Math.max(1, stock[i]);
    const g = 0.5 * (VACANCY_NORMAL - share) + 0.02 * Math.tanh(s.noSlot / 3) - 0.012 * (s.unaff / Math.max(1, s.tries)) * (share > 0.04 ? 1 : 0);
    c.housePx = clamp((c.housePx || 1) * (1 + clamp(g, -0.025, 0.035)), 0.45, 4);
    // ritmo de ventas y de compradores sin vivienda (media de los últimos trimestres)
    c.salesAvg = lerp(c.salesAvg ?? s.buys, s.buys, 0.3); c.noSlotAvg = lerp(c.noSlotAvg ?? s.noSlot, s.noSlot, 0.3);
    c.housing = Object.assign(c.housing || {}, { stock: stock[i], vacant: vac[i], tries: s.tries, buys: s.buys, noSlot: s.noSlot, unaff: s.unaff,
      price: { casa: marketPrice(G, 'casa', null, i), piso: marketPrice(G, 'piso', null, i) } });
  });
  return { immigrants, blocked };
}

// ---------- ahorro, cuotas e impagos de los hogares ----------
// Orden de cada turno: 1) cobra su renta (ya sin IRPF), 2) paga la hipoteca, 3) pide su cesta (los precios
// llevan el IVA) con lo que tiene, 4) paga lo que de verdad consigue y ahorra lo que sobra. Si no llega para
// la cesta, tira de ahorros; si ni así, pide primero lo básico y su nivel de vida baja.
function householdBudget(G) {
  const e = G.eco, p = G.pol;
  const books = bankBooks(G);
  const homeKids = new Map(G.homes.map(h => [h.id, h.kids.length]));
  const evicted = [];
  const liquid = new Map();   // hogar -> dinero disponible para la cesta este turno (k€)
  let arrears = 0;
  for (const cz of G.citizens) {
    if (cz.bk == null || !books.has(cz.bk)) assignBank(G, cz);
    const yQ = Math.max(0, cz.income || 0) * QF;
    const hip = cz.hip;
    const pay = hip ? annuityQ(hip.p, e.mortRate, hip.n) : 0;
    cz.sav = (cz.sav || 0) * (1 + e.depRate * QF) + yQ - pay;
    if (hip) {
      if (cz.sav < 0) {
        // no llega a pagar toda la cuota: lo que falta se suma a la deuda
        hip.p += -cz.sav; cz.sav = 0; hip.ar = (hip.ar || 0) + 1; arrears++;
      } else {
        hip.p -= Math.max(0, pay - hip.p * e.mortRate / 4); hip.ar = 0;
      }
      hip.n--;
      if (hip.p <= 0.05 || hip.n <= 0) { if (hip.p > 0.05 && cz.sav >= hip.p) cz.sav -= hip.p; delete cz.hip; }
      else if (hip.ar >= evictAfter(G)) {
        const vulnerable = (homeKids.get(cz.hh) || 0) > 0 || cz.age >= 65 || !cz.emp;
        if (!(p.desahucios === 2 && vulnerable)) evicted.push(cz);
      }
    } else if (cz.sav < 0) cz.sav = 0;
    liquid.set(cz.hh, (liquid.get(cz.hh) || 0) + Math.max(0, cz.sav));
  }
  e.arrears = arrears;
  G._evicted = evicted;
  G._liquid = liquid;
  return liquid;
}
// Lo que gasta cada hogar sale de lo que tienen sus miembros (a partes proporcionales)
function chargeHomes(G, byHome) {
  const liquid = new Map();
  for (const cz of G.citizens) liquid.set(cz.hh, (liquid.get(cz.hh) || 0) + Math.max(0, cz.sav || 0));
  for (const cz of G.citizens) {
    const L = liquid.get(cz.hh) || 0, sp = Math.min(L, byHome.get(cz.hh) || 0);
    if (L > 0 && sp > 0) cz.sav = Math.max(0, cz.sav - sp * Math.max(0, cz.sav) / L);
  }
}
// Pago de la cesta, de las comisiones del banco y de las reformas de la vivienda
function payBaskets(G, spent) {
  const e = G.eco;
  const incomeF = clamp((e.avgNet || 20) / 20, 0.6, 1.8);
  const n = new Map(); for (const cz of G.citizens) n.set(cz.hh, (n.get(cz.hh) || 0) + 1);
  const bill = new Map();
  for (const home of G.homes) bill.set(home.id, (spent.get(home.id) || 0) + (n.get(home.id) || 0) * BANK_FEE + RENOVATION_Q * incomeF);
  chargeHomes(G, bill);
}
// Ayudas sociales en dinero: van a los hogares con menos nivel de vida de cada cantón (según su tamaño)
function socialAid(G, money) {
  const n = new Map(), mem = new Map(); for (const cz of G.citizens) { n.set(cz.hh, (n.get(cz.hh) || 0) + 1); if (!mem.has(cz.hh)) mem.set(cz.hh, []); mem.get(cz.hh).push(cz); }
  G.cantons.forEach((c, i) => {
    if (!(money[i] > 0)) return;
    const homes = G.homes.filter(h => h.c === i && (h.wl || 1) <= 3 && n.get(h.id));
    const w = sum(homes, h => (n.get(h.id) + h.kids.length * 0.5) * (4 - (h.wl || 1)));
    if (!w) return;
    for (const h of homes) {
      const amt = money[i] * (n.get(h.id) + h.kids.length * 0.5) * (4 - (h.wl || 1)) / w;
      const ms = mem.get(h.id) || [];
      ms.forEach(z => { z.sav = (z.sav || 0) + amt / ms.length; });
    }
  });
}
// Las clínicas y colegios privados los pagan los hogares con más nivel de vida del cantón
function payServices(G, fees) {
  const bill = new Map();
  G.cantons.forEach((c, i) => {
    if (!(fees[i] > 0)) return;
    const homes = G.homes.filter(h => h.c === i && (h.wl || 1) >= 5);
    const w = sum(homes, h => (h.wl || 1) - 4);
    homes.forEach(h => bill.set(h.id, (bill.get(h.id) || 0) + fees[i] * ((h.wl || 1) - 4) / Math.max(1e-9, w)));
  });
  chargeHomes(G, bill);
}
// Después del turno: desahucios de quien lleva tiempo sin pagar la hipoteca
function householdAfter(G) {
  const e = G.eco, p = G.pol;
  const books = bankBooks(G);
  const evicted = G._evicted || [];
  G._evicted = null;
  // desahucios: el banco se queda la vivienda y la vende; la familia se va con parientes o deja el país
  let evictions = 0, gone = 0;
  for (const cz of evicted) {
    const hip = cz.hip; if (!hip) continue;
    const home = G.homes.find(h => h.id === cz.hh); if (!home) { delete cz.hip; continue; }
    const key = homeKey(home);
    const bank = books.get(hip.b);
    const recovery = marketPrice(G, home.kind, hexAtG(G, home.q, home.r), home.c) * 0.7;
    if (bank) { bank.f.cash -= Math.max(0, hip.p - recovery); bank.f.lossQ = (bank.f.lossQ || 0) + Math.max(0, hip.p - recovery); G.forSale[key] = { f: bank.f.id, t: G.turn || 0, k: home.kind, q: home.q, r: home.r, c: home.c }; }
    delete cz.hip;
    const members = G.citizens.filter(z => z.hh === home.id);
    const size = h => G.citizens.filter(z => z.hh === h.id).length + h.kids.length;
    const host = RNG.pick(G.homes.filter(o => o !== home && o.c === home.c && size(o) + members.length + home.kids.length <= HOME_CAP[o.kind]));
    if (host) { members.forEach(z => { z.hh = host.id; z.role = 'pariente'; }); host.kids.push(...home.kids); }
    else { const ids = new Set(members.map(z => z.id)); G.citizens = G.citizens.filter(z => !ids.has(z.id)); gone += members.length + home.kids.length; }
    G.homes = G.homes.filter(h => h !== home);
    evictions++;
  }
  e.evictions = evictions; e.evictedGone = gone;
  if (evictions >= 2) e.news.push({ type: 'bad', topic: 'vivienda', importance: 5, text: `${evictions} familias pierden su casa este trimestre por no poder pagar la hipoteca.` });
  else if (evictions === 1) e.news.push({ type: 'bad', topic: 'vivienda', importance: 3, text: 'Primer desahucio en meses: una familia pierde su casa por no poder pagar la hipoteca.' });
}

// ---------- obras ----------
// Tipos de obra: 'casa' y 'bloque' (viviendas), 'firm' (edificio de una empresa o centro), 'civil' (obra pública y reformas)
const isHomeWork = w => w.t === 'casa' || w.t === 'bloque';
function newWork(G, w) { G.nextWorkId = (G.nextWorkId || 0) + 1; w.id = G.nextWorkId; w.done = 0; G.works = G.works || []; G.works.push(w); return w; }
function backlogOf(G, f) { return sum((G.works || []).filter(w => w.by === f.id), w => Math.max(0, w.need - w.done)); }
function capacityOf(f) { return Math.max(0, (f.staffN || 1) - 1) * WQ_PER_WORKER * levelF(f.lvl); }
// Encarga un edificio (de una empresa o de un centro público) a la constructora con menos trabajo
function contractBuilding(G, f, price, canton) {
  // los edificios de empresas y centros se hacen antes que las viviendas (y tienen prioridad en la obra)
  const need = Math.max(3, (LOTS[f.ctype || f.kind] || 1) * FIRM_WORK_PER_LOT * (f.ctype ? 1.6 : 1));
  const cons = G.firms.filter(x => x.kind === 'constructora' && !x.obra);
  const local = cons.filter(x => x.c === canton);
  const pickFrom = local.length ? local : cons;
  const by = pickFrom.length ? pickFrom.sort((a, b) => backlogOf(G, a) / Math.max(1, capacityOf(a)) - backlogOf(G, b) / Math.max(1, capacityOf(b)))[0] : null;
  const w = newWork(G, { by: by ? by.id : 0, t: 'firm', fid: f.id, q: f.q, r: f.r, need, val: price, paid: true });
  if (by) by.cash += price;   // el cliente paga la obra por adelantado
  f.obra = w.id;
  return w;
}
// Ampliación de una empresa (un nivel más): la hace una constructora mientras la empresa sigue trabajando
const FIRM_WORK_PER_LOT = 2.5, UPGRADE_WORK = 4;
function contractUpgrade(G, f, price) {
  const cons = G.firms.filter(x => x.kind === 'constructora' && !x.obra && x !== f);
  const local = cons.filter(x => x.c === f.c), pickFrom = local.length ? local : cons;
  const by = pickFrom.length ? pickFrom.sort((a, b) => backlogOf(G, a) / Math.max(1, capacityOf(a)) - backlogOf(G, b) / Math.max(1, capacityOf(b)))[0] : null;
  const w = newWork(G, { by: by ? by.id : 0, t: 'firm', up: true, fid: f.id, q: f.q, r: f.r, need: UPGRADE_WORK + (LOTS[f.kind] || 1), val: price, paid: true });
  if (by) by.cash += price;
  f.upg = w.id;
  return w;
}
// Obra pública y reformas: parte del gasto en transporte (carreteras, vías…) y de lo que gastan
// los hogares en reformar sus casas se encarga a las constructoras del cantón cada trimestre.
const CIVIL_VALUE = 20;   // k€ por unidad de obra en obra civil y reformas
const RENOVATION_Q = 0.15;   // lo que gasta cada hogar por turno en reformas (k€, con los ingresos medios de partida)
function civilWorks(G) {
  const e = G.eco, p = G.pol;
  const cons = G.firms.filter(f => f.kind === 'constructora' && !f.obra);
  const gdpN = (e.gdp || 0) * 1e6;
  const incomeF = clamp((e.avgNet || 20) / 20, 0.6, 1.8);
  const homesC = G.cantons.map(() => 0); (G.homes || []).forEach(h => { homesC[h.c]++; });
  e.civilQ = 0;
  G.cantons.forEach((c, i) => {
    const nat = natApplies(p, 'transporte') ? (p.gasto.transporte || 0) / 100 * gdpN * popShare(G, c) : 0;
    const cant = cantApplies(p, 'transporte') ? (c.pol.gasto.transporte || 0) / 100 * (c.stats.gdp || 0) * 1e6 : 0;
    const plan = e.plans && e.plans.transporte ? 0.002 * gdpN * popShare(G, c) : 0;
    const money = ((nat + cant) * 0.45 + plan) * QF + homesC[i] * RENOVATION_Q * incomeF;
    if (money < 1) return;
    e.civilQ += money;
    const local = cons.filter(f => f.c === i);
    const list = local.length ? local : cons;
    if (!list.length) { newWork(G, { by: 0, t: 'civil', c: i, need: money / CIVIL_VALUE, val: money, paid: true }); return; }
    // se reparte entre las constructoras según su tamaño
    const wsum = sum(list, f => 1 + (f.staffN || 0));
    list.forEach(f => { const m = money * (1 + (f.staffN || 0)) / wsum; newWork(G, { by: f.id, t: 'civil', c: i, need: m / CIVIL_VALUE, val: m, paid: true }); f.cash += m; });
  });
}
// Avance de las obras de una constructora (lo llama produce). init: solo calcula
function workShare(G, f) {
  // primero los edificios y ampliaciones de empresas y centros (son obras cortas), pero si hay obras de
  // viviendas o públicas a medias, como mucho con la mitad de la plantilla; el resto, por orden de encargo
  const list = (G.works || []).filter(w => w.by === f.id && w.done < w.need);
  const firmW = list.filter(w => w.t === 'firm'), restW = list.filter(w => w.t !== 'firm');
  const capT = capacityOf(f) * ((G.eco.prodIdx && G.eco.prodIdx.construccion) || 1);
  let cap = restW.length ? capT * 0.5 : capT, rest = capT - cap;
  const out = [];
  const take = w => { if (cap <= 1e-9) return; const a = Math.min(cap, w.need - w.done); out.push([w, a]); cap -= a; };
  firmW.forEach(take);
  cap += rest;
  restW.forEach(take);
  return out;
}
// Las obras de constructoras extranjeras (cuando aquí no hay ninguna) avanzan solas
function foreignWorks(G) {
  for (const w of G.works || []) if (!w.by && w.done < w.need) w.done = Math.min(w.need, w.done + (w.t === 'civil' ? w.need : 8));
}
// Termina las obras acabadas
function finishWorks(G) {
  const done = (G.works || []).filter(w => w.done >= w.need - 1e-6);
  if (!done.length) return { homes: 0, upgraded: [] };
  let homes = 0;
  const upgraded = [];
  G.bldMod = G.bldMod || [];
  const mark = h => { const k = h.q + ',' + h.r; if (!G.bldMod.includes(k)) G.bldMod.push(k); };
  for (const w of done) {
    if (w.t === 'civil') continue;
    if (w.t === 'firm') {
      const f = G.firms.find(x => x.id === w.fid);
      if (f && w.up) { f.lvl = (f.lvl || 1) + 1; f.lvlTurn = G.turn || 0; delete f.upg; upgraded.push(f); }
      else if (f) { delete f.obra; f.fresh = 1; f.opened = G.turn || 0; }
      continue;
    }
    const h = hexAtG(G, w.q, w.r); if (!h) continue;
    G.forSale = G.forSale || {};
    if (w.t === 'casa') {
      h.nh = (h.nh || 0) + 1;
      G.forSale[slotKey(h.q, h.r, 'casa', h.nh - 1, 0)] = { f: w.by, t: G.turn || 0, k: 'casa', q: h.q, r: h.r, c: h.k };
      homes++;
    } else {
      h.bb = h.bb || []; h.bb.push([w.fl, w.pf]);
      const b = h.bb.length - 1;
      for (let u = 0; u < w.fl * w.pf; u++) G.forSale[slotKey(h.q, h.r, 'piso', b, u)] = { f: w.by, t: G.turn || 0, k: 'piso', q: h.q, r: h.r, c: h.k };
      homes += w.fl * w.pf;
    }
    mark(h);
    G._slots = null;
  }
  const ids = new Set(done.map(w => w.id));
  G.works = G.works.filter(w => !ids.has(w.id));
  return { homes, upgraded };
}
// Una constructora decide si empieza una promoción de viviendas y dónde
function startHousing(G, f, used, init) {
  const e = G.eco, c = G.cantons[f.c];
  const cap = Math.max(1, capacityOf(f));
  if (backlogOf(G, f) > cap * (init ? 6 : 4)) return null;
  const hs = c.housing || {};
  const share = (hs.vacant || 0) / Math.max(1, hs.stock || 1);
  if (!init && share > VACANCY_NORMAL && !(hs.noSlot > 0)) return null;
  // cuántas viviendas nuevas puede absorber el cantón: según lo que se vende, quien no encuentra casa
  // y lo que falta para tener un nivel normal de viviendas vacías; se descuenta lo que ya está en obras o sin vender
  let room = Infinity;
  if (!init) {
    const unsold = Object.values(G.forSale || {});
    if (unsold.filter(v => v.f === f.id).length > 3) return null;
    const pipeline = unsold.filter(v => v.c === f.c).length + sum((G.works || []).filter(w => isHomeWork(w) && hexAtG(G, w.q, w.r) && hexAtG(G, w.q, w.r).k === f.c), w => w.fl * w.pf || 1);
    room = 2 + 6 * (c.salesAvg || 0) + 3 * (c.noSlotAvg || 0) + Math.max(0, (VACANCY_NORMAL - share) * (hs.stock || 0)) - pipeline;
    if (room < 1) return null;
  }
  // casillas del cantón donde se puede construir vivienda y quedan parcelas
  const cands = G.map.hexes.filter(h => h.c === (G.ci || 0) && h.k === f.c && h.t !== 'mar' && (isSettlement(h) || isUrbanizable(G, h)));
  const scored = [];
  for (const h of cands) {
    const freeL = lotsFree(G, h, used);
    const city = isCity(h);
    const type = city ? 'bloque' : (hasF(h, 'pueblo') && (h.nh || 0) >= 10 && freeL >= LOTS.bloque && RNG.chance(0.35)) ? 'bloque' : 'casa';
    if (freeL < LOTS[type]) continue;
    let dem = 0;
    for (const k in G.hdem || {}) { const [q, r] = k.split(',').map(Number); const d = HEX.dist(h, { q, r }); if (d <= 2) dem += G.hdem[k] / (1 + d); }
    scored.push({ h, type, s: dem + (city ? 0.6 : 0.3) + RNG.range(0, 0.4) });
  }
  if (!scored.length) return null;
  const best = scored.sort((a, b) => b.s - a.s)[0];
  const h = best.h;
  let fl = 1, pf = 1;
  if (best.type === 'bloque') { fl = isCity(h) ? RNG.int(3, Math.min(maxFloors(G), init ? 4 : 5 + (h.cs || 0))) : RNG.int(2, 3); pf = isCity(h) ? RNG.int(2, 3) : 2; }
  if (best.type === 'bloque' && fl * pf > room) { fl = Math.max(2, Math.floor(room / pf)); if (fl * pf > room) { if (!isCity(h) && room >= 1) { best.type = 'casa'; fl = pf = 1; } else return null; } }
  const units = fl * pf, kind = best.type === 'casa' ? 'casa' : 'piso';
  const need = HOUSING.work[kind] * units;
  const price = marketPrice(G, kind, h, h.k);
  const cost = unitCost(G, f.c, kind, price);
  if (!init && price < cost * 1.1) return null;               // no sale a cuenta
  // préstamo promotor: el banco adelanta buena parte de lo que cuesta la obra
  if (!init) {
    const loan = Math.max(0, cost * units * 0.75 - Math.max(0, f.cash));
    if (loan > 0) {
      const books = bankBooks(G);
      const b = findLender(G, books, f.c, loan, f.bk);
      if (!b) return null;
      f.debt = (f.debt || 0) + loan; f.cash += loan; f.bk = b.f.id; b.L += loan;
    }
  }
  const w = newWork(G, { by: f.id, t: best.type, q: h.q, r: h.r, fl, pf, need, val: price * units });
  used.set(h.q + ',' + h.r, (used.get(h.q + ',' + h.r) || 0) + LOTS[best.type]);
  return w;
}
// Crédito máximo de una empresa: su edificio y equipo, más lo que valen sus obras y viviendas sin vender
function creditLimit(G, f) {
  const K = FIRM_KINDS[f.kind];
  let lim = (K.capex || 100) * (f.lvl || 1) * wageFactor(G) * 0.8 + Math.max(0, f.revY || 0) * 0.25;
  if (f.kind === 'constructora') {
    lim += sum((G.works || []).filter(w => w.by === f.id && !w.paid), w => w.val) * 0.75;
    lim += sum(Object.values(G.forSale || {}).filter(v => v.f === f.id), v => marketPrice(G, v.k, hexAtG(G, v.q, v.r), v.c)) * 0.7;
  }
  return lim;
}

// ---------- quiebra de un banco ----------
function bankFailure(G, f, books) {
  const e = G.eco, b = books.get(f.id); if (!b) return;
  const loss = Math.max(0, -f.cash);
  const hcut = b.D > 0 ? Math.min(1, loss / b.D) : 0;
  const guar = depositGuarantee(G);
  let statePays = 0, lost = 0;
  // otro banco se queda con los clientes y los préstamos
  let heir = banksIn(G, f.c).filter(x => x !== f).sort((a, b2) => (b2.staffN || 0) - (a.staffN || 0))[0] || banksIn(G).filter(x => x !== f)[0];
  if (!heir) {
    const h = hexAtG(G, f.q, f.r);
    heir = newFirm(G, 'banco', h, null, { name: 'Caja de Rescate de ' + G.cantons[f.c].name, pub: null });
    heir.cash = b.L * capReq(G); statePays += heir.cash;
  }
  for (const cz of G.citizens) {
    if (cz.bk === f.id) {
      const hit = (cz.sav || 0) * hcut, covered = Math.min(hit, guar);
      cz.sav -= hit - covered; statePays += covered; lost += hit - covered; cz.bk = heir.id;
    }
    if (cz.hip && cz.hip.b === f.id) cz.hip.b = heir.id;
  }
  for (const x of G.firms) if (x.bk === f.id) x.bk = heir.id;
  e.rescueQ = (e.rescueQ || 0) + statePays;
  for (const k in G.forSale || {}) if (G.forSale[k].f === f.id) G.forSale[k].f = heir.id;
  e.news.push({ type: 'bad', topic: 'mercados', importance: 8, text: `Quiebra ${f.name}. ` + (statePays > 0 ? `El Estado pone ${fmt.bn(statePays / 1e6)} para garantizar los depósitos` : 'Sin garantía de depósitos') + (lost > 0 ? ` y los ahorradores pierden ${fmt.bn(lost / 1e6)}.` : '.') });
  return heir;
}

// ---------- arranque: ahorros, hipotecas, deudas y capital de los bancos ----------
function initFinance(G) {
  const e = G.eco;
  updateRates(G, true);
  e.avgWage0 = e.avgWage || 30;
  G.forSale = G.forSale || {}; G.hdem = G.hdem || {};
  G.cantons.forEach(c => { c.housePx = RNG.range(0.85, 1.2) * (0.9 + c.urban * 0.25); });
  for (const cz of G.citizens) assignBank(G, cz);
  // ahorros según la edad y los ingresos
  for (const cz of G.citizens) {
    const y = Math.max(5, cz.income || 15);
    let sav;
    if (cz.prof === 'jubilado') sav = RNG.range(10, 90) * (0.5 + cz.lvl / 3);
    else if (cz.prof === 'estudiante') sav = RNG.range(0, 4);
    else sav = y * RNG.range(0.15, 0.9) * clamp((cz.age - 20) / 6, 0.1, 6) * (cz.role === 'hijo' ? 1.3 : 1);
    cz.sav = Math.round(sav * 10) / 10;
  }
  // hipotecas vivas de quienes compraron hace unos años
  const R = mortgageRules(G);
  for (const home of G.homes) {
    const adults = G.citizens.filter(z => z.hh === home.id);
    const t = adults.find(z => z.role === 'titular') || adults[0];
    if (!t || t.age < 25 || t.age > 62) continue;
    if (!RNG.chance(clamp(0.8 - (t.age - 30) * 0.025, 0.05, 0.75))) continue;
    const years = 25, ago = RNG.int(0, Math.min(24, t.age - 24));
    const price = marketPrice(G, home.kind, hexAtG(G, home.q, home.r), home.c) * RNG.range(0.7, 1);
    let p = price * 0.8 * (1 - ago / years);
    const income = sum(adults.filter(z => z.emp), z => Math.max(0, z.income || 0)) || Math.max(0, t.income || 0);
    const nq = (years - ago) * 4;
    const maxP = 0.4 * income / 4 / Math.max(1e-6, annuityQ(1, e.mortRate, nq));
    p = Math.min(p, maxP);
    if (p < 5) continue;
    t.hip = { b: t.bk, p: Math.round(p * 10) / 10, n: nq, ar: 0 };
  }
  // deudas de las empresas y capital de los bancos
  for (const f of G.firms) {
    if (f.pub != null || f.kind === 'banco' || f.kind === 'policia') continue;
    const list = banksIn(G, f.c), all = list.length ? list : banksIn(G);
    f.bk = all.length ? RNG.pick(all).id : null;
    f.debt = Math.round((FIRM_KINDS[f.kind].capex || 100) * (f.lvl || 1) * RNG.range(0, 0.6) * 10) / 10;
  }
  const books = bankBooks(G);
  books.forEach(b => { b.f.cash = b.L * (capReq(G) + RNG.range(0.03, 0.05)) + 50; });
  housingStats(G);
}

// Estadísticas de vivienda y banca (país y cantones)
function housingStats(G) {
  const e = G.eco;
  const free = vacantSlots(G);
  const stock = new Array(G.cantons.length).fill(0), vac = new Array(G.cantons.length).fill(0);
  homeSlots(G).forEach(sl => { stock[sl.c]++; }); free.forEach(sl => { vac[sl.c]++; });
  const books = bankBooks(G);
  let mortN = 0, mortP = 0, savT = 0, wantHome = 0;
  const savs = [];
  const perC = G.cantons.map(() => ({ mortN: 0, mortP: 0, sav: 0, n: 0, want: 0 }));
  for (const cz of G.citizens) {
    const pc = perC[cz.c]; pc.n++;
    savT += cz.sav || 0; pc.sav += cz.sav || 0; savs.push(cz.sav || 0);
    if (cz.hip) { mortN++; mortP += cz.hip.p; pc.mortN++; pc.mortP += cz.hip.p; }
    if (cz.wantsHome && cz.role === 'hijo') { wantHome++; pc.want++; }
  }
  savs.sort((a, b) => a - b);
  const works = G.works || [];
  G.cantons.forEach((c, i) => {
    const hx = new Set(G.map.hexes.filter(h => h.k === i && h.c === (G.ci || 0)).map(h => h.q + ',' + h.r));
    c.housing = Object.assign(c.housing || {}, {
      stock: stock[i], vacant: vac[i], price: { casa: marketPrice(G, 'casa', null, i), piso: marketPrice(G, 'piso', null, i) }, px: c.housePx || 1,
      mortgages: perC[i].mortN, mortDebt: perC[i].mortP / 1e6, savings: perC[i].sav / 1e6, wantHome: perC[i].want,
      works: works.filter(w => isHomeWork(w) && hx.has(w.q + ',' + w.r)).length,
      worksUnits: sum(works.filter(w => isHomeWork(w) && hx.has(w.q + ',' + w.r)), w => w.fl * w.pf || 1),
      banks: banksIn(G, i).length,
    });
  });
  const pw = c => (c.stats.pop || c.pop || 1);
  const ptot = sum(G.cantons, pw);
  e.housing = {
    stock: sum(stock), vacant: sum(vac), price: { casa: sum(G.cantons, c => c.housing.price.casa * pw(c)) / ptot, piso: sum(G.cantons, c => c.housing.price.piso * pw(c)) / ptot },
    mortgages: mortN, mortDebt: mortP / 1e6, savings: savT / 1e6, medianSav: savs.length ? savs[Math.floor(savs.length / 2)] : 0,
    wantHome, works: works.filter(isHomeWork).length, worksUnits: sum(works.filter(isHomeWork), w => w.fl * w.pf || 1),
    built: e.builtQ || 0, sales: sum(G.cantons, c => c.housing.buys || 0), evictions: e.evictions || 0, arrears: e.arrears || 0,
    deposits: sum(Array.from(books.values()), b => b.D) / 1e6, loans: sum(Array.from(books.values()), b => b.L) / 1e6, banks: books.size,
    policyRate: e.policyRate, mortRate: e.mortRate, firmRate: e.firmRate, depRate: e.depRate,
  };
}
