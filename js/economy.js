// ============================================================
//  SIMULACIÓN ECONÓMICA Y DEMOGRÁFICA
//  Unidades: PIB y presupuestos en miles de millones de € (bn).
//  Salarios en miles de € al año por persona (k€).
// ============================================================
'use strict';

const LABOR_SHARE = 0.55;
const QF = 0.25; // fracción de año que dura un turno (un trimestre)

function citizenStatus(cz) {
  if (cz.prof === 'jubilado') return 'jubilado';
  if (cz.prof === 'estudiante') return 'estudiante';
  if (!cz.emp) return 'parado';
  return cz.prof;
}
const inLaborForce = cz => cz.prof !== 'jubilado' && cz.prof !== 'estudiante';
// Situación laboral: jubilado, desempleado, sector privado o funcionario (y quien todavía estudia)
function workSector(cz) {
  if (cz.prof === 'jubilado') return 'jubilado';
  if (cz.prof === 'estudiante') return 'estudiante';
  if (!cz.emp) return 'parado';
  return cz.pb ? 'publico' : 'privado';
}
// Cuando alguien cambia de situación (entra en la Administración, pasa a la privada, se queda en paro…),
// su ideología se va acercando a la de su nuevo grupo. Al arrancar la partida, de golpe.
function syncWorkSectors(G, init) {
  for (const cz of G.citizens) {
    const ws = workSector(cz);
    if (cz.ls === ws) continue;
    const was = cz.ls; cz.ls = ws;
    if (init) { if (cz.emp) computeIdeology(G, cz, PROFESSIONS[cz.prof], false, true); continue; }
    if (was == null) continue;
    computeIdeology(G, cz, PROFESSIONS[citizenStatus(cz)] || PROFESSIONS.parado, false);
  }
}

function byCanton(G) {
  const m = G.cantons.map(() => []);
  for (const cz of G.citizens) m[cz.c].push(cz);
  return m;
}

// ---------- Impuestos y gasto por niveles de gobierno ----------
const taxN = (G, id) => G.pol[id] || 0;
const taxC = (c, id) => c.pol[id] || 0;
function popShare(G, c) { const tot = sum(G.cantons, x => x.stats.pop || x.pop || 0); return tot ? (c.stats.pop || c.pop || 0) / tot : 1 / G.cantons.length; }
// Media de lo que añaden los cantones a un impuesto, ponderada por población
function avgCantTax(G, id) { return sum(G.cantons, c => taxC(c, id) * popShare(G, c)); }
// Tipo total medio de un impuesto (Estado + cantones)
function totTax(G, id) { return taxN(G, id) + avgCantTax(G, id); }
// Gasto efectivo de una materia en un cantón, expresado como "% del PIB nacional por habitante"
function areaEff(G, c, area) {
  const p = G.pol; let v = 0;
  if (natApplies(p, area)) v += p.gasto[area] || 0;
  if (cantApplies(p, area)) {
    const e = G.eco, natPc = e && e.gdp && e.population ? e.gdp / e.population : 0;
    const cPc = c.stats.gdp && c.stats.pop ? c.stats.gdp / c.stats.pop : natPc;
    v += (c.pol.gasto[area] || 0) * (natPc ? cPc / natPc : 1);
  }
  return v;
}
function avgAreaEff(G, area) { return sum(G.cantons, c => areaEff(G, c, area) * popShare(G, c)); }
const subsidy = (G, id) => (G.pol.sub && G.pol.sub[id]) || 0;

// Recaudación (miles de millones al año) de un impuesto con un tipo dado, sobre una base por unidad de tipo.
// tot: tipo total (Estado + cantón) del mismo impuesto; progTot: IRPF progresivo total (para la evasión).
function taxEvasion(progTot, control) { return clamp(0.06 + Math.max(0, progTot - 0.3) * 0.6 - control, 0.01, 0.3); }
// Lo que recauda un tipo sobre una base: exactamente base × tipo (la economía ya reacciona a los impuestos por su cuenta)
function taxYield(id, base, rate) { return rate && base ? base * rate : 0; }
// Estimación estática de lo que recaudaría un impuesto (para el redactor de leyes)
//   st: estado (G o la vista V) · scope 'nacional' | 'cantonal' · rate: tipo propuesto
function estimateTax(st, id, rate, scope, cantonIdx) {
  const p = st.pol, control = (p.transparencia ? 0.02 : 0) + (p.fiscalia ? 0.02 : 0);
  const one = (c, rN, rC, own) => {
    if (!c.taxBase) return 0;
    const progTot = (id === 'irpf' ? (scope === 'nacional' ? rN + (c.pol.irpf || 0) : (p.irpf || 0) + rC) : (p.irpf || 0) + (c.pol.irpf || 0));
    return taxYield(id, c.taxBase[id], own, rN + rC, progTot, control);
  };
  if (scope === 'cantonal') { const c = st.cantons[cantonIdx]; return one(c, p[id] || 0, rate || 0, rate || 0); }
  return sum(st.cantons, c => one(c, rate || 0, c.pol[id] || 0, rate || 0));
}

// Calificación crediticia a partir de la prima de riesgo y la deuda
function creditRating(G) {
  const sc = spreadBps(G) + Math.max(0, G.eco.debtRatio - 0.6) * 120;
  return sc < 35 ? 'AAA' : sc < 70 ? 'AA' : sc < 120 ? 'A' : sc < 200 ? 'BBB' : sc < 320 ? 'BB' : sc < 500 ? 'B' : 'CCC';
}

// ============================================================
//  Inicialización
// ============================================================
// Primera parte (cada país por separado): economía, empresas y centros públicos de partida
function initEconomyBase(G) {
  const d = G.country.devel;
  G.eco = {
    history: [], shock: 0, sectorShock: {}, pandemic: 0, refugees: 0, strike: 0,
    priceIndex: 100, inflation: 0.02, interestRate: 0.03, tradeStreak: 0, foodStreak: 0,
    infraQ: 35 + d * 35, corruption: 30 + (G.pol.judicial === 0 ? 15 : 0), scandalHeat: 0, confidence: 0.5,
    plans: { sanidad: 0, educacion: 0, social: 0, transporte: 0, inversion: 0 }, extraSpend: 0, capitalFlight: false, waste: 0, wasFlight: false,
    news: [], debt: 0,
  };
  updateRates(G, true);
  initFirms(G);
}
// Segunda parte (todos los países a la vez, con el mercado mundial): sueldos, ahorros, primera cesta,
// presupuestos cuadrados y primer registro
function initWorldEconomy(W) {
  // cualificaciones de partida (quien ocupa los puestos cualificados, y parte de quien tiene estudios superiores)
  W.forEach(initQualifications);
  W.forEach(initPartners);
  // sueldos de partida: la parte habitual del valor que crea cada trabajador (vendiendo todo a precios de referencia)
  for (let it = 0; it < 2; it++) { worldProduce(W, { init: true, hold: true, full: true }); W.forEach(initWages); }
  W.forEach(G => {
    computeIncomes(G, true);
    // ahorros, hipotecas, préstamos y capital de los bancos
    initFinance(G);
    civilWorks(G);
    // las constructoras arrancan con la plantilla que piden sus obras
    const byC = byCanton(G);
    G.firms.filter(f => f.kind === 'constructora').forEach(f => {
      const pool = byC[f.c].filter(cz => inLaborForce(cz) && !cz.emp);
      const n = G.citizens.filter(cz => cz.firm === f.id).length - 1;
      const want = Math.min(firmCap(f), Math.ceil(backlogOf(G, f) / 3 / WQ_PER_WORKER));
      if (want > n) pickUnemployed(pool, Math.min(want - n, Math.ceil(n * 0.3), Math.floor(pool.length * 0.3)), 'construccion').forEach(cz => setJob(G, cz, f, false));
      f.staffN = G.citizens.filter(cz => cz.firm === f.id).length;
    });
  });
  // primera cesta y primer mercado (a precios de referencia, sin mover nada)
  for (let it = 0; it < 2; it++) {
    W.forEach(G => householdDemand(G, null));
    worldProduce(W, { init: true, hold: true });
    W.forEach(G => { computeIncomes(G, true); computeEconomy(G, true); });
  }
  // las plantillas se ajustan a lo que de verdad se pide en el mundo (y se vuelve a cuadrar todo)
  for (let rb = 0; rb < 3; rb++) {
    rebalanceInit(W, [0.85, 0.7, 0.5][rb]);
    for (let it = 0; it < 2; it++) { worldProduce(W, { init: true, hold: true, full: true }); W.forEach(G => initWages(G, true)); }
    for (let it = 0; it < 2; it++) {
      W.forEach(G => { computeIncomes(G, true); householdDemand(G, null); });
      worldProduce(W, { init: true, hold: true });
      W.forEach(G => { computeIncomes(G, true); computeEconomy(G, true); });
    }
  }
  W.forEach(G => {
    G.eco.debt = G.eco.gdp * RNG.range(0.45, 1.05);
    computeEconomy(G, true);
    calibrateInitialBudgets(G);
    // con los presupuestos ya cuadrados: plantillas públicas según el PIB de verdad
    staffPublic(G, { init: true });
    householdDemand(G, null);
  });
  // y el mercado de partida otra vez (las compras públicas dependen de los presupuestos), con las plantillas
  // ajustadas a lo que se pide con los presupuestos ya hechos
  worldProduce(W, { init: true, hold: true });
  for (let rb = 0; rb < 2; rb++) {
    rebalanceInit(W, [0.7, 0.5][rb]);
    for (let it = 0; it < 2; it++) { worldProduce(W, { init: true, hold: true, full: true }); W.forEach(G => initWages(G, true)); }
    W.forEach(G => { computeIncomes(G, true); householdDemand(G, null); });
    worldProduce(W, { init: true, hold: true });
  }
  // los presupuestos, otra vez cuadrados con la economía ya ajustada
  W.forEach(G => { computeIncomes(G, true); computeEconomy(G, true); calibrateInitialBudgets(G); staffPublic(G, { init: true }); householdDemand(G, null); });
  worldProduce(W, { init: true, hold: true });
  W.forEach(G => {
    ensureQualMin(G);
    syncWorkSectors(G, true);
    laborStats(G);
    computeEconomy(G, true);
    if ((G.nid || 'f0') === 'f0' && typeof fervorDisplay === 'function') fervorDisplay(G);
    G.eco.emissionsRaw0 = G.eco.emissionsRaw;
    G.eco.emissions = 100;
    G.eco.start = { gdp: G.eco.gdp, unemployment: G.eco.unemployment, debtRatio: G.eco.debtRatio };
    G.eco.cpiPrev = G.eco.cpi;
    recordHistory(G);
  });
}

// ============================================================
//  Saldo inicial: al empezar, el Estado y cada cantón arrancan con un saldo verosímil.
//  Lo normal es un déficit o superávit pequeño (déficit el 51 % de las veces) y, de vez
//  en cuando, uno grande. Para conseguirlo se retocan a la vez los tipos de los impuestos
//  y las partidas de gasto sorteados (mitad y mitad), así que el saldo se mantiene después.
// ============================================================
function initialBalanceTarget(small, bigLo, bigHi) {
  const sign = RNG.chance(0.51) ? -1 : 1;
  const mag = RNG.chance(0.85) ? clamp(Math.abs(RNG.normal(0, small)), small * 0.05, bigLo) : RNG.range(bigLo, bigHi);
  return sign * mag;   // fracción del PIB (positivo = superávit)
}
const CAL_TAXES = ['irpf', 'irpfPlano', 'nominas', 'sociedades', 'iva', 'sucesiones', 'ibi', 'vacias'];
const round4 = x => Math.round(x * 10000) / 10000, round2 = x => Math.round(x * 100) / 100;
function calibrateInitialBudgets(G) {
  const p = G.pol;
  // (si se vuelve a cuadrar al final de la preparación, con el mismo saldo de antes)
  const natTarget = G._natT ?? (G._natT = initialBalanceTarget(0.01, 0.025, 0.05));
  const cTarget = G._cT || (G._cT = G.cantons.map(() => initialBalanceTarget(0.0045, 0.012, 0.025)));
  for (let it = 0; it < 12; it++) {
    const e = G.eco;
    // --- Estado ---
    const gap = natTarget * e.gdp - (e.revenue - e.spending);   // >0: hay que ahorrar más
    const taxRev = sum(CAL_TAXES, id => p[id] != null ? (e.revenueBreakdown[id] || 0) : 0);
    const spItems = AREA_IDS.filter(a => natApplies(p, a) && p.gasto[a]).concat(['defensa', 'cultura']);
    const spTot = sum(spItems, k => e.spendingBreakdown[k] || 0);
    let done = Math.abs(gap) < e.gdp * 0.0004;
    if (!done) {
      const f = clamp(1 + gap / 2 / Math.max(1e-6, taxRev), 0.8, 1.25);
      CAL_TAXES.forEach(id => { if (p[id]) p[id] = clamp(round4(p[id] * f), 0.0005, 0.6); });
      const g = clamp(1 - gap / 2 / Math.max(1e-6, spTot), 0.8, 1.25);
      spItems.forEach(k => { p.gasto[k] = Math.max(0.05, round2(p.gasto[k] * g)); });
    }
    // --- Cantones ---
    G.cantons.forEach((c, i) => {
      const b = c.budget, gdpC = c.stats.gdp;
      const cg = cTarget[i] * gdpC - (b.revenue - b.spending);
      if (Math.abs(cg) < gdpC * 0.0003) return;
      done = false;
      const ownTax = b.taxRevenue || 0;
      const items = AREA_IDS.filter(a => cantApplies(p, a) && c.pol.gasto[a]).concat(['campo']).filter(k => c.pol.gasto[k]);
      const cSp = sum(items, k => b.spend[k] || 0);
      // si no tiene impuestos que tocar (o muy poco), todo el ajuste va al gasto, y al revés
      const share = ownTax < 1e-6 ? 0 : cSp < 1e-6 ? 1 : 0.5;
      const f = clamp(1 + cg * share / Math.max(1e-6, ownTax), 0.7, 1.4);
      CAL_TAXES.forEach(id => { if (c.pol[id]) c.pol[id] = clamp(round4(c.pol[id] * f), id === 'ibi' ? 0.001 : 0.0005, id === 'ibi' ? 0.012 : 0.15); });
      const g = clamp(1 - cg * (1 - share) / Math.max(1e-6, cSp), 0.7, 1.4);
      items.forEach(k => { c.pol.gasto[k] = Math.max(0.02, round2(c.pol.gasto[k] * g)); });
    });
    if (done) break;
    computeEconomy(G, true);
  }
}

// ============================================================
//  Turno económico completo
// ============================================================
// Un turno de todos los países a la vez. G: el estado de nuestro país (los demás cuelgan de G.foreign[].st)
function simulateEconomy(G) {
  const W = worldStates(G);
  W.forEach(S => {
    if (S !== G) { S.turn = G.turn; S.quarter = G.quarter; S.year = G.year; }
    const e = S.eco;
    e.news = [];
    e.gdpPrev = e.gdp;
    e.prevUnemployment = e.unemployment;
    e.wasFlight = e.capitalFlight;
  });
  updateWorld(G);
  W.forEach(S => demography(S));
  // la gente que se va a vivir a otro país (y la que llega)
  worldMigration(W);
  // 1) las empresas deciden (contratan, despiden, cierran, se fundan) con lo que pasó el turno anterior
  W.forEach(S => { firmsQuarter(S); syncWorkSectors(S); });
  // 2) cada persona cobra; los hogares pagan la hipoteca y piden su cesta
  W.forEach(S => { computeIncomes(S, false); householdDemand(S, householdBudget(S)); });
  // 3) se produce, se reparten los mercados de todos los países, cada uno paga lo que consigue y cambian los precios
  worldProduce(W);
  W.forEach(S => {
    const e = S.eco;
    worksQuarter(S);
    // 4) cuentas de cada país, presupuestos y lo que sale de todo ello
    computeEconomy(S, false);
    householdAfter(S);
    S._liquid = null; S._inc = null;
    if (S === G) fervorQuarter(S);
    housingStats(S);
    economicNews(S);
    // los shocks duran un turno
    e.shock = 0; e.sectorShock = {}; e.refugees = 0; e.strike = 0;
    if (e.pandemic > 0) e.pandemic--;
    S.cantons.forEach(c => { c.shock = {}; if (c.disaster > 0) c.disaster--; });
    for (const k in e.plans) if (e.plans[k] > 0) e.plans[k]--;
    recordHistory(S);
  });
  // la política de los demás países: sus partidos legislan, hay elecciones y la prensa internacional lo cuenta
  foreignPoliticsQuarter(G);
}

function updateWorld(G) {
  // los datos de cada país que ven los demás (impuestos, aranceles…)
  refreshNations(G);
}

function governmentEcoIdeology(G) {
  const p = G.players.find(x => x.id === G.gov.president);
  return p ? p.ideo.eco : 0;
}

function naturalUnemployment(G) {
  const p = G.pol, e = G.eco;
  return clamp(0.055 + (2 - p.laboral) * 0.014 + Math.max(0, p.salarioMin - 0.45) * 0.15 + p.desempleo * 0.006 + (totTax(G, 'nominas') - 0.20) * 0.08
    + (p.rentaBasica ? 0.015 : 0) - (p.servicioMilitar ? 0.008 : 0) + (e.corruption - 30) / 1000 + (G.country.devel < 0.5 ? 0.02 : 0), 0.03, 0.25);
}

// ---------------- Demografía ----------------
// Cada persona vive en una vivienda (casa o piso). Los niños viven en su hogar y entran en la
// simulación a los 16 años; los recién llegados necesitan una vivienda vacía.
function demography(G) {
  const e = G.eco, p = G.pol;
  const dead = new Set(), emig = new Set();
  const healthF = 1.3 - (e.health || 60) / 100 * 0.6;
  // eutanasia: algo más de mortalidad entre mayores y enfermos cuanto más libre es
  const eu = +p.eutanasia || 0, euthF = age => age >= 75 ? [1, 1.04, 1.1][eu] : age >= 60 ? [1, 1.01, 1.03][eu] : 1;
  G.nextCzId = Math.max(G.nextCzId || 0, G.citizens.reduce((m, c) => Math.max(m, c.id), 0) + 1);
  let born = 0, kidsGone = 0, immigrants = 0, emigrants = 0;
  for (const cz of G.citizens) {
    // cada persona cumple años en "su" trimestre, así no hay oleadas artificiales
    if ((cz.id % 4) + 1 === G.quarter) { cz.age++; if (cz.origin === 'extranjero') cz.yrs++; }
    if (cz.origin === 'extranjero' && cz.yrs >= (p.naturalizacion || 10)) cz.nat = true;
    const pd = QF * (cz.age < 60 ? 0.002 : cz.age < 75 ? 0.013 : cz.age < 85 ? 0.05 : 0.15) * healthF * (e.pandemic && cz.age > 70 ? 1.5 : 1) * euthF(cz.age) * (SEX_MORTALITY[cz.sex] || 1);
    if (RNG.chance(pd)) { dead.add(cz.id); continue; }
    if (inLaborForce(cz) && cz.age >= p.jubilacion) {
      cz.lastSector = cz.sector || cz.lastSector; cz.prof = 'jubilado'; cz.emp = false; cz.sector = null; cz.pb = 0; cz.ls = 'jubilado';
      computeIdeology(G, cz, PROFESSIONS.jubilado, false);
    }
  }
  // niños: cumplen años y, a los 16, entran en la simulación como estudiantes de su hogar
  const promoted = [];
  for (const home of G.homes) {
    home.kids = home.kids.filter(k => {
      if (k.q === G.quarter) k.a++;
      if (k.a < 16) return true;
      const adult = G.citizens.find(z => z.hh === home.id && z.from);
      const cz = makeCitizen(G, G.nextCzId++, G.cantons[home.c], 16, k.s, k.o || 'nativo', k.o === 'extranjero' && adult ? adult.from : null, k.o === 'extranjero' ? 16 : 99, [['servicios', 1]], home.kind === 'piso');
      cz.prof = 'estudiante'; cz.emp = false; cz.sector = null; if (k.cu) cz.cu = k.cu;
      computeIdeology(G, cz, PROFESSIONS.estudiante, false);
      cz.hh = home.id; cz.role = 'hijo'; cz.nm = k.n + ' ' + (home.sn || RNG.pick(APELLIDOS));
      cz.sav = Math.round(RNG.range(0, 2) * 10) / 10; assignBank(G, cz);
      for (const pl of G.players) cz.aff[pl.id] = 0;
      promoted.push(cz);
      return false;
    });
  }
  // socios que mueren: hereda su parte alguien de su casa
  if (dead.size) { const own = ownerIds(G); for (const cz of G.citizens) if (dead.has(cz.id) && own.has(cz.id)) ownerDied(G, cz, dead); }
  // herencias: los ahorros (y la hipoteca) pasan a quien sigue en la casa
  const byHome = new Map();
  for (const cz of G.citizens) { if (!byHome.has(cz.hh)) byHome.set(cz.hh, []); byHome.get(cz.hh).push(cz); }
  // impuesto de sucesiones: lo que de verdad se paga por las herencias de este trimestre (k€), [Estado, cantón]
  e.inhTax = G.cantons.map(() => 0);   // herencias del trimestre (k€): la base del impuesto
  for (const cz of G.citizens) {
    if (!dead.has(cz.id) || emig.has(cz.id)) continue;
    const heirs = (byHome.get(cz.hh) || []).filter(z => !dead.has(z.id));
    if (!heirs.length) continue;
    const c = G.cantons[cz.c], estate = Math.max(0, cz.sav || 0);
    const tN = estate * taxN(G, 'sucesiones'), tC = estate * taxC(c, 'sucesiones');
    if (e.inhTax[cz.c] != null) e.inhTax[cz.c] += estate;
    const share = Math.max(0, estate - tN - tC) / heirs.length;
    heirs.forEach(z => { z.sav = (z.sav || 0) + share; });
    if (cz.hip) { const h = heirs.find(z => z.role !== 'hijo') || heirs[0]; if (!h.hip) h.hip = cz.hip; }
  }
  const leaving = G.citizens.filter(cz => dead.has(cz.id));
  G.citizens = G.citizens.filter(cz => !dead.has(cz.id)).concat(promoted);
  emigrants += emig.size;
  // hogares que se quedan sin adultos: si emigraron, los niños se van con ellos; si fallecieron, los acoge otra familia del cantón
  const members = new Map(G.homes.map(h => [h.id, 0]));
  for (const cz of G.citizens) if (members.has(cz.hh)) members.set(cz.hh, members.get(cz.hh) + 1);
  const size = h => members.get(h.id) + h.kids.length;
  G.homes = G.homes.filter(h => {
    if (members.get(h.id) > 0) return true;
    if (h.kids.length) {
      const emigrated = leaving.some(z => z.hh === h.id && emig.has(z.id));
      const host = emigrated ? null : RNG.pick(G.homes.filter(o => o !== h && o.c === h.c && members.get(o.id) > 0 && size(o) + h.kids.length <= HOME_CAP[o.kind]));
      if (host) host.kids.push(...h.kids); else { kidsGone += h.kids.length; if (emigrated) emigrants += h.kids.length; }
    }
    return false;
  });
  // nacimientos: en hogares con alguna mujer de 18 a 44 años y sitio en la vivienda
  // aborto: cuanto más fácil, menos nacimientos
  const fert = 0.055 * (1 + ((e.happiness || 50) - 50) / 300) * (avgAreaEff(G, 'social') > 2 ? 1.04 : 1) * [1.06, 1, 0.94][p.aborto ?? 1];
  const homeById = new Map(G.homes.map(h => [h.id, h]));
  for (const cz of G.citizens) {
    if (cz.sex !== 'M' || cz.age < 18 || cz.age > 44 || cz.role === 'hijo' && cz.age < 22) continue;
    const h = homeById.get(cz.hh); if (!h || size(h) >= HOME_CAP[h.kind]) continue;
    if (!RNG.chance(fert * QF)) continue;
    const sex = RNG.chance(GIRL_SHARE) ? 'M' : 'H';   // nacen 104 niños por cada 100 niñas
    const used = G.citizens.filter(z => z.hh === h.id).map(z => z.nm.split(' ')[0]).concat(h.kids.map(k => k.n));
    h.kids.push({ a: 0, s: sex, n: personName(sex, cz.cu || G.cul, '-', used).split(' ')[0], q: G.quarter, o: 'nativo', cu: cz.cu || G.cul });
    members.set(h.id, members.get(h.id)); born++;
  }
  // estudios: quien termina su especialización y quien empieza a trabajar o a estudiar
  educationQuarter(G);
  // vivienda: los jóvenes que se independizan tienen que comprar una vivienda vacía
  // (los inmigrantes llegan de los otros países: worldMigration)
  housingMarket(G, 0);
  e.lastDemography = { deaths: dead.size - emig.size, births: born, immigrants, emigrants, promoted: promoted.length };
}

// ============================================================
//  Rentas de cada persona: sueldo (o beneficio del dueño), pensión, paro o ayuda, y su IRPF.
//  Se calculan al empezar el turno, antes de que los hogares hagan su compra.
// ============================================================
function computeIncomes(G, initial) {
  const e = G.eco, p = G.pol;
  const firmsById = new Map(G.firms.map(f => [f.id, f]));
  // lo que se lleva cada dueño o socio (a partes iguales entre los socios; también los jubilados que siguen siéndolo)
  const ownerShare = new Map();
  for (const f of G.firms) { if (f.pub != null) continue; const os = ownersOf(f); if (!os.length) continue; const sh = Math.max(0, f.ownerY || 0) / os.length; os.forEach(id => ownerShare.set(id, (ownerShare.get(id) || 0) + sh)); }
  const grossOf = cz => {
    const f = firmsById.get(cz.firm); if (!f) return 0;
    if (ownerShare.has(cz.id) && ownersOf(f).includes(cz.id)) return ownerShare.get(cz.id);
    return cz.wg || f.wage || 0;
  };
  const emps = G.citizens.filter(cz => cz.emp && cz.firm && firmsById.has(cz.firm) && !ownerShare.has(cz.id));
  const avgWage = emps.length ? avg(emps, grossOf) : (e.avgWage || 26);
  e.avgWage = avgWage;
  const minWage = p.salarioMin * avgWage;
  const benefitRate = [0.15, 0.25, 0.35, 0.45, 0.6][p.desempleo] * (p.rentaBasica ? 0.5 : 1);
  const ubi = p.rentaBasica ? 0.2 * avgWage : 0;
  const control = (p.transparencia ? 0.02 : 0) + (p.fiscalia ? 0.02 : 0);
  let pensions = 0, benefits = 0, ubiCost = 0, netIncomeTot = 0;
  const nC = G.cantons.length;
  // bases y recaudación por cantón: [nacional, cantonal]
  const wagesC = new Array(nC).fill(0), netC = new Array(nC).fill(0);
  const irpfN = new Array(nC).fill(0), irpfC = new Array(nC).fill(0), flatN = new Array(nC).fill(0), flatC = new Array(nC).fill(0);
  const progBase = new Array(nC).fill(0), flatBase = new Array(nC).fill(0);
  const nets = [];
  // 1) renta bruta de cada persona (sueldo, beneficios del dueño, pensión, paro o ayuda familiar)
  const rows = [];
  for (const cz of G.citizens) {
    const i = cz.c, c = G.cantons[i];
    let gross = 0, taxable = true, transfer = 0;
    if (cz.emp && cz.firm) {
      const f = firmsById.get(cz.firm);
      const isOwn = ownerShare.has(cz.id) && f && ownersOf(f).includes(cz.id);
      gross = isOwn ? grossOf(cz) : Math.max(grossOf(cz), minWage);
      if (!isOwn) wagesC[i] += gross * c.w;
    } else if (cz.prof === 'jubilado') {
      transfer = p.pensiones * avgWage * (0.55 + 0.1 * cz.lvl); pensions += transfer * c.w; gross = transfer;
    } else if (cz.prof === 'estudiante') {
      gross = 0.22 * avgWage * LEVEL_MULT[cz.lvl]; taxable = false;
    } else {
      transfer = benefitRate * avgWage * (cz.lastSector ? 1 : 0.5); benefits += transfer * c.w; gross = transfer;
    }
    // (los socios que no trabajan en la empresa —jubilados, herederos— cobran su parte igualmente)
    if (!cz.emp && ownerShare.has(cz.id)) gross += ownerShare.get(cz.id);
    if (ubi) { gross += ubi; ubiCost += ubi * c.w; }
    rows.push([cz, gross, taxable]);
  }
  // 2) IRPF: el plano se lleva exactamente su tipo; el progresivo, un tipo personal que sube con la renta
  //    y que, de media, es exactamente el tipo de la ley (lo recaudado = tipo × rentas)
  const progOf = g => clamp(Math.pow(g / Math.max(1, avgWage), 0.45), 0.15, 1.9);
  let sg = 0, sgp = 0; for (const [, g, t] of rows) if (t) { sg += g; sgp += g * progOf(g); }
  const Z = sgp > 0 ? sg / sgp : 1;
  for (const [cz, gross, taxable] of rows) {
    const i = cz.c, c = G.cantons[i];
    let tax = 0;
    if (taxable) {
      const prog = progOf(gross) * Z;
      progBase[i] += gross * c.w; flatBase[i] += gross * c.w;
      let rN = taxN(G, 'irpf') * prog, rC = taxC(c, 'irpf') * prog, fN = taxN(G, 'irpfPlano'), fC = taxC(c, 'irpfPlano');
      const tot = rN + rC + fN + fC, k = tot > 0.6 ? 0.6 / tot : 1;
      rN *= k; rC *= k; fN *= k; fC *= k;
      tax = gross * (rN + rC + fN + fC);
      irpfN[i] += gross * rN * c.w; irpfC[i] += gross * rC * c.w; flatN[i] += gross * fN * c.w; flatC[i] += gross * fC * c.w;
    }
    const net = gross - tax;
    cz.gross = gross;
    cz.prevIncome = initial ? net / (1 + (e.inflation || 0.02)) : cz.income;
    cz.income = net;
    netIncomeTot += net * c.w; netC[i] += net * c.w;
    nets.push(net);
  }
  const empNets = G.citizens.filter(cz => cz.emp);
  e.avgNet = empNets.length ? avg(empNets, cz => cz.income) : (e.avgNet || 20);
  e.realIncomeGrowth = e.netIncomeTot ? Math.pow((netIncomeTot / e.netIncomeTot) / Math.pow(1 + e.inflation, QF), 4) - 1 : 0;
  e.netIncomeTot = netIncomeTot;

  G._inc = { irpfN, irpfC, flatN, flatC, progBase, flatBase, nets, pensions, benefits, ubiCost };
}

// ============================================================
//  Cálculo de indicadores (producción, rentas, presupuestos...)
// ============================================================
function computeEconomy(G, initial) {
  const e = G.eco, p = G.pol, P = G.world.prices;
  const groups = byCanton(G);
  // --- Producción: valor añadido de las empresas y sueldos de los servicios públicos ---
  const sectorOut = {}; SECTORS.forEach(s => sectorOut[s.id] = 0);
  const sectorJobs = {}; SECTORS.forEach(s => sectorJobs[s.id] = 0);
  let laborForce = 0, employed = 0, adults = 0;
  G.cantons.forEach((c, i) => {
    c.stats.gdp = 0; c.stats.priv = 0; c.stats.lf = 0; c.stats.emp = 0; c.stats.n = groups[i].length;
    for (const cz of groups[i]) {
      adults += c.w;
      if (inLaborForce(cz)) { laborForce += c.w; c.stats.lf++; }
      if (cz.emp) { employed += c.w; c.stats.emp++; if (cz.sector) sectorJobs[cz.sector] = (sectorJobs[cz.sector] || 0) + 1; }
    }
    c.stats.unemployment = c.stats.lf ? 1 - c.stats.emp / c.stats.lf : 0;
    c.stats.kids = 0;
    c.stats.pop = groups[i].length * c.w;   // se suman los niños más abajo
    c.pop = c.stats.pop;
  });
  for (const f of G.firms) {
    const c = G.cantons[f.c]; if (!c) continue;
    const va = Math.max(0, f.vaY || 0) / 1e6;   // k€ al año -> miles de millones
    c.stats.gdp += va;
    sectorOut[f.sector] = (sectorOut[f.sector] || 0) + va;
    if (f.pub == null) c.stats.priv += Math.max(0, f.profitY || 0) / 1e6;
  }
  // niños de cada cantón (viven en los hogares, no trabajan ni votan)
  for (const h of G.homes || []) { const c = G.cantons[h.c]; if (c) { c.stats.kids += h.kids.length; c.stats.pop += h.kids.length; c.pop = c.stats.pop; } }
  const kidsTot = sum(G.cantons, c => c.stats.kids);
  const gdp = Math.max(1e-6, sum(Object.values(sectorOut)));
  e.gdp = gdp; e.sectorOut = sectorOut; e.sectorJobs = sectorJobs;
  e.sectorShare = {}; SECTORS.forEach(s => e.sectorShare[s.id] = (sectorOut[s.id] || 0) / gdp);
  e.laborForce = laborForce; e.employed = employed; e.unemployment = 1 - employed / Math.max(1, laborForce);
  e.population = adults + kidsTot;
  e.gdpPerCapita = gdp * 1e9 / e.population;
  // crecimiento interanual (frente al mismo trimestre del año anterior) o anualizado si aún no hay un año de datos
  const hist = e.history || [];
  e.qGrowth = e.gdpPrev ? gdp / e.gdpPrev - 1 : 0;
  // (mientras no haya un año de datos: lo que va del año, anualizado y con prudencia)
  e.growth = hist.length >= 4 ? gdp / hist[hist.length - 4].gdp - 1 : hist.length ? lerp(0.02, Math.pow(gdp / hist[0].gdp, 4 / hist.length) - 1, hist.length / 4) : 0.02;

  // --- Salarios y rentas (calculados antes de los mercados del turno; al preparar la partida, aquí) ---
  if (initial || !G._inc) computeIncomes(G, initial);
  const { irpfN, irpfC, flatN, flatC, progBase, flatBase, nets, pensions, benefits, ubiCost } = G._inc;
  const toBn = x => x / 1e6;

  // --- Comercio exterior: lo calculan los mercados de cada bien (firms.js); aquí, el reparto por países ---
  tradePartners(G);

  // --- Valor de las viviendas de cada cantón (base del IBI y del impuesto sobre viviendas vacías) ---
  const hv = G.cantons.map(() => ({ all: 0, vac: 0 }));
  const takenH = new Set((G.homes || []).map(homeKey));
  for (const sl of homeSlots(G)) { const v = marketPrice(G, sl.kind, hexAtG(G, sl.q, sl.r), sl.c); hv[sl.c].all += v; if (!takenH.has(sl.key)) hv[sl.c].vac += v; }
  // --- Recaudación de cada impuesto en cada cantón, separando Estado y cantón ---
  const laborAdj = 1 - (p.laboral - 2) * 0.02;
  const rev = {}; TAX_IDS.forEach(id => rev[id] = 0);
  const cRev = G.cantons.map(() => { const o = {}; TAX_IDS.forEach(id => o[id] = 0); return o; });
  const natByC = G.cantons.map(() => ({}));   // lo que el Estado recauda en cada cantón (para el concierto económico)
  // Lo que se recauda sale de lo que pasa de verdad este trimestre: sueldos y rentas (IRPF), lo que las empresas
  // pagan por sus plantillas y sus beneficios (nóminas y sociedades), lo que compran los hogares (IVA, del
  // trimestre anterior, que es cuando compraron), las herencias (sucesiones) y el valor de las viviendas (IBI).
  // Cada impuesto = su tipo × lo que de verdad ha pasado (bases en k€ del trimestre)
  const ft = e.firmTax || { nom: [], soc: [], carbono: 0 }, vat = e.vatTax || [], inh = e.inhTax || [];
  const A = x => toBn(x) / QF;   // k€ del trimestre -> miles de millones al año
  G.cantons.forEach((c, i) => {
    c.taxBase = { irpf: toBn(progBase[i]), irpfPlano: toBn(flatBase[i]), nominas: A(ft.nom[i] || 0), sociedades: A(ft.soc[i] || 0),
      iva: A((vat[i] || [])[2] || 0), sucesiones: A(inh[i] || 0), ibi: toBn(hv[i].all), vacias: toBn(hv[i].vac) };
    rev.irpf += toBn(irpfN[i]); cRev[i].irpf += toBn(irpfC[i]); natByC[i].irpf = toBn(irpfN[i]);
    rev.irpfPlano += toBn(flatN[i]); cRev[i].irpfPlano += toBn(flatC[i]); natByC[i].irpfPlano = toBn(flatN[i]);
    for (const id of ['nominas', 'sociedades', 'iva', 'sucesiones', 'ibi', 'vacias']) {
      const yN = c.taxBase[id] * taxN(G, id), yC = c.taxBase[id] * taxC(c, id);
      rev[id] += yN; cRev[i][id] += yC; natByC[i][id] = yN;
    }
  });
  rev.carbono = A(ft.carbono || 0);
  rev.aranceles = e.tariffRev || 0;
  rev.otros = gdp * 0.018 + (p.cannabis ? gdp * 0.0015 : 0);

  // --- Gasto del Estado ---
  const devolved = AREA_IDS.filter(a => p.comp[a] !== 'nacional').length;
  // las partidas de gasto van según el PIB de los últimos años (no recortan de golpe en una crisis)
  e.gdpTrend = initial || !e.gdpTrend ? gdp : lerp(e.gdpTrend, gdp, 0.25);
  const gB = e.gdpTrend;
  const spend = {};
  AREA_IDS.forEach(a => { if (natApplies(p, a)) spend[a] = (p.gasto[a] || 0) / 100 * gB; });
  Object.assign(spend, {
    defensa: p.gasto.defensa / 100 * gB + (p.servicioMilitar ? 0.003 * gB : 0), cultura: p.gasto.cultura / 100 * gB,
    transferencias: (p.gasto.transferencias || 0) / 100 * gB,
    ciencia: subsidy(G, 'ciencia') / 100 * gB, renovables: subsidy(G, 'renovables') / 100 * gB, sindicatos: subsidy(G, 'sindicatos') / 100 * gB,
    administracion: (0.026 + 0.002 * devolved) * gB,
    pensiones: toBn(pensions), desempleo: toBn(benefits), rentaBasica: toBn(ubiCost),
    intereses: (e.debt || 0) * e.interestRate, corrupcion: e.waste || 0, planes: (e.extraSpend || 0) / QF,
    vivienda: toBn(e.aidQ || 0) / QF, rescates: toBn(e.rescueQ || 0) / QF, ayudasInversion: toBn(e.investAidQ || 0) / QF,
    compraCentros: (e.centersBuyQ || 0) / QF, plantillaExtra: (e.centersOverQ || 0) / QF,
  });
  if (e.centersSellQ) rev.privatizaciones = e.centersSellQ / QF;
  // empresas públicas: lo que ganan entra en las cuentas; lo que pierden, sale; comprarlas, construirlas o ampliarlas
  if (e.peQ > 0) rev.empresasPublicas = e.peQ / QF; else if (e.peQ < 0) spend.perdidasEmpresas = -e.peQ / QF;
  if (e.peBuyQ) spend.inversionEmpresas = e.peBuyQ / QF;
  if (e.roadQ) spend.carreteras = e.roadQ / QF;
  if (e.railQ) spend.ferrocarriles = e.railQ / QF;
  if (!initial) { e.roadQ = 0; e.railQ = 0; e.aidQ = 0; e.rescueQ = 0; e.investAidQ = 0; e.centersBuyQ = 0; e.centersOverQ = 0; e.centersSellQ = 0; e.peQ = 0; e.peBuyQ = 0; }
  for (const k in spend) if (!spend[k]) delete spend[k];

  const conc = (p.concierto || []).filter(i => G.cantons[i] && !G.cantons[i].merged);
  const concierto = {};

  // --- Cantones: presupuestos propios ---
  const avgGdpPc = gdp / e.population;
  const solid = [0.2, 0.5, 0.9][p.solidaridad];
  const rawShare = G.cantons.map((c, i) => c.merged || !c.stats.pop ? 0 : (c.stats.pop / e.population) * Math.max(0.2, 1 + solid * (avgGdpPc / Math.max(1e-9, c.stats.gdp / c.stats.pop) - 1)));
  const rsum = sum(rawShare);
  // --- Concierto económico: el cantón se queda con lo que el Estado recauda en él, deja de recibir
  //     transferencias y paga un cupo por los servicios comunes. El cupo se negocia para que el cantón
  //     salga ganando (favorable), algo (equilibrado) o un poco perdiendo (exigente) frente a no tenerlo.
  const transfTot = spend.transferencias || 0;
  const stateBase = sum(Object.entries(spend).filter(([k]) => k !== 'transferencias'), ([, v]) => v);
  const bonusF = [0.1, 0.04, -0.02][p.cupo ?? 1];
  conc.forEach(i => {
    const c = G.cantons[i];
    const keep = sum(Object.values(natByC[i]));
    for (const id in natByC[i]) rev[id] -= natByC[i][id];
    const transfer = transfTot * rawShare[i] / Math.max(1e-9, rsum);
    spend.transferencias -= transfer;   // lo que le habría tocado se lo ahorra el Estado
    const bonus = bonusF * stateBase * (c.stats.pop / Math.max(1, e.population));
    concierto[i] = { keep, transfer, bonus, cupo: keep - transfer - bonus };
  });
  if (conc.length) {
    const net = sum(Object.values(concierto), x => x.cupo);
    if (net >= 0) rev.cupo = net; else spend.cupo = -net;
  }
  e.concierto = concierto;
  G.cantons.forEach((c, i) => {
    const gdpC = c.stats.gdp;
    const transfer = concierto[i] ? 0 : transfTot * rawShare[i] / Math.max(1e-9, rsum);
    const r = Object.assign({}, cRev[i]); for (const k in r) if (!r[k]) delete r[k];
    if (c.centersSellQ) r.privatizaciones = c.centersSellQ / QF;
    if (c.peQ > 0) r.empresasPublicas = c.peQ / QF;
    if (transfer) r.transferencias = transfer;
    if (concierto[i]) { r.concierto = concierto[i].keep; if (concierto[i].cupo < 0) r.cupo = -concierto[i].cupo; }
    const sp = {};
    AREA_IDS.forEach(a => { if (cantApplies(p, a) && c.pol.gasto[a]) sp[a] = c.pol.gasto[a] / 100 * gdpC; });
    if (c.pol.gasto.campo) sp.campo = c.pol.gasto.campo / 100 * gdpC;
    if (concierto[i] && concierto[i].cupo > 0) sp.cupo = concierto[i].cupo;
    // políticas de identidad del cantón: televisión, promoción cultural y delegaciones
    const idc = (c.pol.tv ? 0.0008 : 0) + [0, 0.0003, 0.0008][c.pol.fiestas || 0] + (c.pol.exterior ? 0.0003 : 0);
    if (idc) sp.identidad = idc * gdpC;
    sp.administracion = 0.004 * gdpC;
    const debt0 = (c.budget && c.budget.debt) || 0;
    c.interestRate = clamp((e.interestRate || 0.03) + 0.005 + Math.max(0, debt0 / Math.max(0.01, gdpC) - 0.3) * 0.05, 0.005, 0.2);
    if (debt0 > 0) sp.intereses = debt0 * c.interestRate;
    if (c.extraSpend) { sp.planes = c.extraSpend / QF; }
    if (c.centersBuyQ) sp.compraCentros = c.centersBuyQ / QF;
    if (c.centersOverQ) sp.plantillaExtra = c.centersOverQ / QF;
    if (c.peQ < 0) sp.perdidasEmpresas = -c.peQ / QF;
    if (c.peBuyQ) sp.inversionEmpresas = c.peBuyQ / QF;
    if (c.roadQ) sp.carreteras = c.roadQ / QF;
    if (c.railQ) sp.ferrocarriles = c.railQ / QF;
    const revenue = sum(Object.values(r)), spending = sum(Object.values(sp));
    const debt = initial ? debt0 : Math.max(0, debt0 + (spending - revenue) * QF);
    c.budget = { revenue, spending, balance: revenue - spending, debt, debtRatio: debt / Math.max(0.01, gdpC), rev: r, spend: sp,
      taxRevenue: sum(Object.values(cRev[i])) };
    if (!initial) { c.roadQ = 0; c.railQ = 0; c.extraSpend = 0; c.centersBuyQ = 0; c.centersOverQ = 0; c.centersSellQ = 0; c.peQ = 0; c.peBuyQ = 0; }
  });
  e.revenue = sum(Object.values(rev));
  e.spending = sum(Object.values(spend));
  for (const k in rev) if (!rev[k]) delete rev[k];
  e.revenueBreakdown = rev; e.spendingBreakdown = spend;
  e.deficit = e.spending - e.revenue;
  e.deficitRatio = e.deficit / gdp;
  const cantonTaxes = sum(G.cantons, c => c.budget.taxRevenue);
  e.cantonTaxes = cantonTaxes;
  e.taxBurden = (e.revenue - (rev.otros || 0) - (rev.empresasPublicas || 0) - (rev.privatizaciones || 0) + cantonTaxes) / gdp;
  if (!initial) e.extraSpend = 0;

  // --- Índice de precios: lo que pagan de verdad los hogares por su cesta (con el IVA) frente a los precios
  //     de referencia; la inflación es lo que sube en un año ---
  // (cesta fija: la de la primera compra de la partida)
  if (initial || !e.basket0) e.basket0 = Object.assign({}, e.basket || Object.fromEntries(GOOD_IDS.map(g => [g, 1])));
  const bk = e.basket0;
  const vatF = 1 + totTax(G, 'iva');
  e.cpi = vatF * sum(GOOD_IDS, g => (bk[g] || 0) * (e.prices ? e.prices[g] : GOODS[g].price)) / Math.max(1e-9, sum(GOOD_IDS, g => (bk[g] || 0) * GOODS[g].price));
  if (initial) { e.cpi0 = e.cpi; e.priceIndex = 100; e.cpiH = [100]; }
  else {
    e.priceIndex = 100 * e.cpi / (e.cpi0 || e.cpi);
    // subida en el último año (o anualizada mientras no haya un año de datos)
    e.cpiH = (e.cpiH || [e.priceIndex]).concat([e.priceIndex]).slice(-5);
    const q = e.cpiH.length - 1;
    const raw = q >= 4 ? e.priceIndex / e.cpiH[0] - 1 : Math.pow(e.priceIndex / e.cpiH[0], 4 / Math.max(1, q)) - 1;
    e.inflation = clamp(raw, -0.15, 0.4);
    // --- Nivel general de precios de fuera en nuestra moneda: sube poco a poco, más si el Estado vive del
    //     déficit o si el banco central depende del Gobierno ---
    const mi = clamp(0.012 + (e.deficitRatio - 0.03) * 0.15 + (p.bancoCentral === 'gobierno' ? 0.006 : 0) + RNG.normal(0, 0.002), -0.01, 0.06);
    e.nom = (e.nom || 1) * Math.pow(1 + mi, QF);
    // --- Deuda (el déficit se calcula en ritmo anual; en un trimestre se acumula la cuarta parte) ---
    e.debt = Math.max(0, e.debt + e.deficit * QF);
  }
  e.debtRatio = e.debt / gdp;
  if (!initial) updateRates(G);
  e.interestRate = clamp((e.policyRate ?? 0.02) - 0.005 + Math.max(0, e.debtRatio - 0.6) * 0.05 + Math.max(0, e.inflation - 0.02) * 0.3 + (e.corruption - 30) / 100 * 0.01
    + Math.max(0, e.deficitRatio - 0.03) * 0.15, 0.005, 0.15);
  e.rating = creditRating(G);

  // --- Tensión de convivencia: inmigrantes de culturas lejanas que aún no se han integrado (por cantón) ---
  const tensionC = G.cantons.map(() => 0), adultsC = G.cantons.map(() => 0);
  for (const cz of G.citizens) {
    if (adultsC[cz.c] == null) continue;
    adultsC[cz.c]++;
    if (cz.origin === 'extranjero') tensionC[cz.c] += (1 - cultureCompat(cz.cu, G.cul || 'hispana')) * clamp(1 - (cz.yrs || 0) / 12, 0.15, 1);
  }
  tensionC.forEach((v, i) => { tensionC[i] = v / Math.max(1, adultsC[i]); });
  // --- Servicios públicos por cantón ---
  if (!initial) e.infraQ = lerp(e.infraQ, 25 + avgAreaEff(G, 'transporte') * 13 + (e.plans.transporte ? 4 : 0), 0.05);
  const roadConn = mainOf(G) === G ? roadConnectivity(G) : [];
  const railQ = G.cantons.map((c, i) => (railFactorOf(G, i) - RAIL_F0) / (1 - RAIL_F0));
  G.cantons.forEach((c, i) => {
    const people = groups[i];
    const old = people.filter(cz => cz.age >= 65).length / Math.max(1, people.length);
    const waste = (e.corruption - 30) / 10;
    // sanidad, educación y seguridad dependen del personal que de verdad atiende en el cantón
    const st = c.staff || { sanidad: 0, educacion: 0, seguridad: 0 };
    // los agentes rinden menos si no se pueden comprar las armas que necesitan
    const docs = st.sanidad * 1000 / Math.max(1, c.stats.pop), teach = st.educacion * 100 / Math.max(1, c.students || c.stats.kids || 1), cops = st.seguridad * 1000 / Math.max(1, c.stats.pop) * (0.7 + 0.3 * (c.armasF ?? 1));
    c.stats.staffRatios = { sanidad: docs, educacion: teach, seguridad: cops };
    c.stats.health = clamp(14 + docs * 2.7 - (old - 0.2) * 60 - e.pandemic * 8 - waste + (e.plans.sanidad ? 6 : 0) - (c.disaster ? 4 : 0), 5, 98);
    c.stats.education = clamp(10 + teach * 7.5 + (e.plans.educacion ? 6 : 0) - waste * 0.5 + (cantApplies(p, 'educacion') && c.pol.lengua ? 1 : 0), 5, 98);
    c.stats.security = clamp(28 + cops * 11 - (c.stats.unemployment - 0.08) * 120 + (p.penal - 1) * 4 + (p.servicioMilitar ? 1 : 0) - (c.disaster ? 5 : 0) - [0, 1, 3][p.armasCiviles || 0], 5, 98);
    c.stats.social = clamp(20 + areaEff(G, c, 'social') * 22 - (c.stats.unemployment - 0.08) * 80 + (p.rentaBasica ? 10 : 0) + (e.plans.social ? 8 : 0) - waste * 0.5, 5, 98);
    c.stats.transport = clamp(20 + areaEff(G, c, 'transporte') * 14 + (e.infraQ - 50) * 0.3 + (roadConn[i] || 0) * ROAD_TRANSPORT_BONUS + (railQ[i] || 0) * RAIL_TRANSPORT_BONUS, 5, 98);
    // convivencia: muchos inmigrantes recién llegados de culturas muy distintas, y poco integrados, traen más delincuencia
    const tension = tensionC[i] * clamp(1 - (c.stats.social - 55) / 200, 0.6, 1.3);
    c.stats.tension = tension;
    c.stats.crime = clamp(18 + (100 - c.stats.security) * 0.5 + (c.stats.unemployment - 0.08) * 120 - (c.stats.social - 55) * 0.1 + [0, 1, 4][p.armasCiviles || 0]
      + 160 * Math.max(0, tension - 0.015), 4, 120);
    c.stats.old = old;
  });
  const wpop = c => c.stats.pop / e.population;
  e.health = sum(G.cantons, c => c.stats.health * wpop(c));
  e.education = sum(G.cantons, c => c.stats.education * wpop(c));
  e.security = sum(G.cantons, c => c.stats.security * wpop(c));
  e.social = sum(G.cantons, c => c.stats.social * wpop(c));
  e.transport = sum(G.cantons, c => c.stats.transport * wpop(c));

  // --- Emisiones ---
  const energyF = { fosil: 1.3, mixto: 1, nuclear: 0.75, renovable: 0.6 }[p.energia];
  e.emissionsRaw = sum(Object.values(e.emissionsBySector || {})) * energyF * (1 - 0.12 * p.carbono) * (1 - subsidy(G, 'renovables') * 0.12) * (1 - (p.proteccionNatural - 1) * 0.04) + 1e-9;
  if (e.emissionsRaw0) e.emissions = e.emissionsRaw / e.emissionsRaw0 * 100;

  // --- Desigualdad y satisfacción ---
  e.gini = gini(nets);
  let satTot = 0;
  const homeById = new Map((G.homes || []).map(h => [h.id, h]));
  for (const cz of G.citizens) {
    const c = G.cantons[cz.c];
    const ch = cz.prevIncome > 0 ? (cz.income / Math.pow(1 + e.inflation, QF)) / cz.prevIncome - 1 : 0;
    let sat = 0.5 + 0.22 * Math.tanh(ch * 20) + (inLaborForce(cz) && !cz.emp ? -0.18 : 0)
      + (c.stats.health - 60) / 250 + (c.stats.education - 60) / 400 + (c.stats.security - 60) / 300
      - Math.max(0, e.inflation - 0.03) * 2 + (cz.lvl - 3) * 0.03 - (c.disaster ? 0.05 : 0);
    if (cz.prof === 'jubilado') sat += (p.pensiones - 0.65) * 0.5;
    if (cz.lvl <= 2 || (inLaborForce(cz) && !cz.emp)) sat += (c.stats.social - 55) / 250 + (e.plans.social ? 0.04 : 0);
    if (cz.age < 35) sat += (taxN(G, 'vacias') + taxC(c, 'vacias')) * 1.5;
    if (cz.age >= 45 && cz.lvl >= 3) sat -= (taxN(G, 'ibi') + taxC(c, 'ibi')) * 4 + (taxN(G, 'sucesiones') + taxC(c, 'sucesiones')) * 0.06;
    sat += (c.stats.transport - 55) / 600 - (c.stats.crime - 35) / 600;
    // vivienda: no poder independizarse, una hipoteca que ahoga o tener ahorros
    if (cz.wantsHome && cz.role === 'hijo') sat -= 0.05;
    if (cz.hip) sat -= cz.hip.ar ? 0.1 : clamp(annuityQ(cz.hip.p, e.mortRate || 0.035, cz.hip.n) * 4 / Math.max(1, cz.income) - 0.3, 0, 0.3) * 0.3;
    // necesidades: cuánto cubre su hogar y su nivel de vida
    const home = homeById.get(cz.hh);
    if (home && home.F != null) sat += (home.F - 0.97) * 0.6 + ((home.wl || 6) - 6.5) * 0.01;
    sat += clamp((cz.sav || 0) / 400, 0, 0.04);
    cz.sat = initial ? clamp(sat, 0, 1) : clamp(lerp(cz.sat, sat, 0.35), 0, 1);
    satTot += cz.sat;
  }
  e.happiness = satTot / G.citizens.length * 100;

  // --- Indicadores sociales y de país ---
  const scale = 1;   // cada ciudadano simulado es una persona
  const dem = e.lastDemography || { immigrants: 0, emigrants: 0 };
  e.immigration = initial ? 0 : dem.immigrants * scale / QF;      // personas al año
  e.emigration = initial ? 0 : (dem.emigrants || 0) * scale / QF;
  e.netMigration = e.immigration - e.emigration;
  e.foreignShare = G.citizens.filter(cz => cz.origin === 'extranjero').length / Math.max(1, G.citizens.length);
  e.crime = sum(G.cantons, c => c.stats.crime * wpop(c));
  e.lifeExp = 66 + e.health * 0.18;
  const lifeI = clamp((e.lifeExp - 20) / 65, 0, 1), eduI = clamp(e.education / 100 * 1.1, 0, 1);
  const incI = clamp((Math.log(Math.max(100, e.gdpPerCapita)) - Math.log(100)) / (Math.log(75000) - Math.log(100)), 0, 1);
  e.hdi = Math.cbrt(lifeI * eduI * incI);

  // --- Corrupción percibida y confianza ---
  e.corruption = clamp(28 + (p.judicial === 0 ? 18 : p.judicial === 1 ? 6 : 0) - (p.transparencia ? 7 : 0) - (p.fiscalia ? 7 : 0)
    + (p.tvPublica === 'gubernamental' ? 5 : 0) + e.scandalHeat, 0, 100);
  if (!initial) e.scandalHeat *= 0.85;
  e.confidence = clamp(0.5 + governmentEcoIdeology(G) * 0.05 + (e.growth - 0.015) * 4 - Math.max(0, e.debtRatio - 1) * 0.3, 0, 1);
  // Inversión extranjera directa (miles de millones al año)
  const treaties = sum(Object.values(p.tratados), t => t === true ? 1 : Array.isArray(t) && t.length ? 0.5 : 0);
  e.fdi = gdp * clamp(0.025 + (0.22 - totTax(G, 'sociedades')) * 0.08 + treaties * 0.003 - spreadBps(G) / 10000 * 0.6 + (e.confidence - 0.5) * 0.03
    - (e.corruption - 30) / 100 * 0.03 - (e.capitalFlight ? 0.02 : 0) - p.aranceles * 0.03 + (e.plans.inversion ? 0.008 : 0) - totTax(G, 'sucesiones') * 0.01, -0.01, 0.07);
  e.waste = 0;
}

// Reparto de exportaciones e importaciones entre los países (para mostrar)
// (el reparto ya lo calculan los mercados; aquí solo se cuentan las rachas para las misiones)
function tradePartners(G) {
  const e = G.eco;
  if (G.turn > 0) {
    e.tradeStreak = e.tradeBalance > 0 ? (e.tradeStreak || 0) + 1 : 0;
    e.foodStreak = (e.foodNet || 0) >= 0 ? (e.foodStreak || 0) + 1 : 0;
  }
}

// Noticias económicas del trimestre (el periódico las redacta después con su propio enfoque)
function economicNews(G) {
  const e = G.eco;
  const n = e.news;
  const add = (topic, tone, importance, text, data) => n.push({ type: tone, topic, importance, text, data: data || {} });
  const q = e.qGrowth;
  if (q < -0.004) add('recesion', 'bad', 7, `La economía se contrae: el PIB cae un ${fmt.pct(-q)} en el trimestre.`, { q });
  else if (q > 0.01) add('boom', 'good', 5, `La economía acelera: el PIB crece un ${fmt.pct(q)} en el trimestre (${fmt.pct(e.growth)} interanual).`, { q });
  else add('pib', q >= 0 ? 'neutral' : 'bad', 2, `El PIB ${q >= 0 ? 'crece' : 'cae'} un ${fmt.pct(Math.abs(q))} en el trimestre (${fmt.pct(e.growth)} interanual).`, { q });
  const du = e.unemployment - e.prevUnemployment;
  if (du > 0.006) add('paro', 'bad', 6, `El paro sube ${fmt.num(du * 100, 1)} puntos y llega al ${fmt.pct(e.unemployment)}.`, { du });
  else if (du < -0.006) add('paro', 'good', 5, `El paro baja ${fmt.num(-du * 100, 1)} puntos, hasta el ${fmt.pct(e.unemployment)}.`, { du });
  if (e.inflation > 0.05) add('inflacion', 'bad', 6, `La inflación se desboca: ${fmt.pct(e.inflation)} interanual. La cesta de la compra no para de subir.`);
  if (e.deficitRatio > 0.06) add('deficit', 'bad', 5, `Los mercados alertan del déficit (${fmt.pct(e.deficitRatio)} del PIB). La prima de riesgo sube a ${Math.round(spreadBps(G))} puntos.`);
  if (e.deficitRatio < -0.005) add('superavit', 'good', 4, `Superávit en las cuentas públicas: el Estado ingresa más de lo que gasta.`);
  if (e.debtRatio > 1.2) add('deuda', 'bad', 4, `La deuda supera el ${fmt.pct(e.debtRatio, 0)} del PIB. Las agencias de calificación amenazan con rebajar la nota.`);
  if (e.lastDemography && e.lastDemography.immigrants > G.citizens.length * 0.003) add('inmigracion', 'neutral', 3, `Llegada récord de inmigrantes atraídos por la situación del país.`);
  const H = e.history, last = H[H.length - 1];
  if (last && last.rating && e.rating !== last.rating) {
    const order = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'], up = order.indexOf(e.rating) < order.indexOf(last.rating);
    add('mercados', up ? 'good' : 'bad', up ? 5 : 7, up ? `Las agencias suben la nota de la deuda a ${e.rating}.` : `Las agencias rebajan la nota de la deuda a ${e.rating}. Financiarse será más caro.`);
  }
  if (last && last.crime && e.crime - last.crime > 3) add('seguridad', 'bad', 4, `La delincuencia se dispara: ${fmt.num(e.crime, 1)} delitos por cada 1.000 habitantes.`);
  if (e.emigration > e.immigration * 1.2 && e.emigration > e.population * 0.003) add('emigracion', 'bad', 4, `Fuga de talento: ${fmt.int(e.emigration)} personas al año emigran en busca de oportunidades.`);
  // vivienda: precios y jóvenes que no pueden independizarse
  const Hn = e.housing, Hy = H.length >= 4 ? H[H.length - 4].housePrice : null;
  if (Hn && Hy) {
    const ch = Hn.price.piso / Hy - 1;
    if (ch > 0.1) add('vivienda', 'bad', 5, `El precio de la vivienda se dispara: un ${fmt.pct(ch)} más que hace un año. Un piso cuesta ya ${fmt.int(Hn.price.piso)} mil euros de media.`);
    else if (ch < -0.1) add('vivienda', 'neutral', 4, `Se desploma el precio de la vivienda: un ${fmt.pct(-ch)} menos que hace un año.`);
  }
  if (Hn && G.turn % 4 === 0 && Hn.wantHome > G.citizens.length * 0.02) add('vivienda', 'bad', 4, `${fmt.int(Hn.wantHome)} jóvenes con trabajo siguen viviendo con sus padres porque no pueden pagar la entrada de una vivienda.`);
  G.cantons.forEach(c => { if (c.budget.debtRatio > 0.3) add('deudaCanton', 'bad', 3, `La deuda de ${c.name} alcanza el ${fmt.pct(c.budget.debtRatio, 0)} de su PIB cantonal.`, { canton: c.idx }); });
  G.cantons.forEach(c => {
    const prev = c.stats.prevUnemp;
    if (prev !== undefined && c.stats.unemployment - prev > 0.02) add('paroCanton', 'bad', 3, `Golpe al empleo en ${c.name}: el paro sube al ${fmt.pct(c.stats.unemployment)}.`, { canton: c.idx });
    c.stats.prevUnemp = c.stats.unemployment;
  });
}
// Prima de riesgo: lo que paga el Estado por encima del tipo oficial (sin riesgo)
function spreadBps(G) { return Math.max(0, (G.eco.interestRate - ((G.eco.policyRate ?? 0.02) - 0.005)) * 10000); }

function recordHistory(G) {
  const e = G.eco;
  const cap = (arr, n) => { while (arr.length > n) arr.shift(); };
  G.cantons.forEach(c => {
    c.history = c.history || [];
    c.history.push({ turn: G.turn, gdp: c.stats.gdp, unemployment: c.stats.unemployment, pop: c.stats.pop, gdpPc: c.stats.gdp * 1e9 / Math.max(1, c.stats.pop),
      health: c.stats.health, education: c.stats.education, security: c.stats.security, social: c.stats.social, crime: c.stats.crime,
      revenue: c.budget.revenue, spending: c.budget.spending, balance: c.budget.balance, debtRatio: c.budget.debtRatio,
      housePrice: c.housing ? c.housing.price.piso : null, fervCan: c.ferv ? c.ferv.can : null, fervCen: c.ferv ? c.ferv.cen : null });
    cap(c.history, 48);
  });
  e.history.push({
    turn: G.turn, gdp: e.gdp, growth: e.growth, unemployment: e.unemployment, inflation: e.inflation, debtRatio: e.debtRatio,
    deficitRatio: e.deficitRatio, gini: e.gini, health: e.health, education: e.education, security: e.security,
    happiness: e.happiness, tradeBalance: e.tradeBalance, emissions: e.emissions, population: e.population, gdpPerCapita: e.gdpPerCapita,
    taxBurden: e.taxBurden, revenue: e.revenue, spending: e.spending, debt: e.debt, interestRate: e.interestRate, qGrowth: e.qGrowth,
    deficit: e.deficit, spread: spreadBps(G), crime: e.crime, hdi: e.hdi, immigration: e.immigration, emigration: e.emigration, fdi: e.fdi,
    lifeExp: e.lifeExp, foreignShare: e.foreignShare, social: e.social, transport: e.transport, rating: e.rating,
    housePrice: e.housing ? e.housing.price.piso : null, policyRate: e.policyRate, mortRate: e.mortRate, firmRate: e.firmRate, depRate: e.depRate, fervCan: e.ferv ? e.ferv.can : null, fervCen: e.ferv ? e.ferv.cen : null, built: e.builtQ || 0,
  });
  if (G.nid && G.nid !== 'f0') cap(e.history, 48);
}
