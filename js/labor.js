// ============================================================
//  MERCADO DE TRABAJO Y CUALIFICACIONES
//  · Cada empresa calcula lo que le aporta un trabajador más (lo que produce y vende, menos los insumos):
//    si le sale a cuenta pagando su sueldo y sus cotizaciones, publica ofertas; si alguien ya le cuesta más
//    de lo que aporta, lo despide (si la indemnización que marca la ley laboral le compensa).
//  · Quien busca trabajo mira hasta 5 ofertas al azar de su cantón (y de otros cantones si lleva tiempo en
//    paro o no hay ninguna en el suyo). Se apunta a las que le pagan más de lo que gana ahora (o del paro)
//    y para las que vale. Cada oferta se cubre con alguien al azar entre los que viven más cerca; la que no
//    se cubre sube el sueldo el turno siguiente, mientras siga saliendo a cuenta.
//  · Sueldos individuales: cada uno entra con el de su oferta y luego sube poco a poco hacia lo que se
//    paga en su profesión (y solo baja si la empresa está en crisis y la ley lo permite).
//  · Cualificaciones (ingeniería, administración, docencia, sanidad y periodismo): se consiguen en 4
//    trimestres de estudios. Quien tiene una solo trabaja de lo suyo, de académico o en un empleo sin
//    cualificar.
// ============================================================
'use strict';

const QUALS = ['ingeniero', 'oficinista', 'academico', 'sanitario', 'periodista'];
const QUAL_NAMES = { ingeniero: 'Ingeniería', oficinista: 'Administración y finanzas', academico: 'Docencia e investigación', sanitario: 'Sanidad', periodista: 'Periodismo' };
const isQualJob = p => QUALS.includes(p);
const STUDY_Q = 4;            // trimestres que dura una especialización
const Q_BONUS = 0.3;          // lo que rinde de más cada cualificado por encima del mínimo
const SEARCH_N = 5;           // ofertas que mira cada persona que busca trabajo
const OFFER_START = 0.7;      // primera oferta: un 30 % menos que lo que se paga de media en la profesión
// Plantilla de cada tipo de empresa: profesión sin cualificar (base) y, si la hay, la cualificada (q) con la
// parte mínima y máxima de la plantilla que debe (o puede) tenerla
const STAFF = {
  agricultura: { base: 'agricultor' }, ganaderia: { base: 'agricultor' }, pesca: { base: 'pescador' },
  silvicultura: { base: 'operario' }, cantera: { base: 'operario' },
  minaMetal: { base: 'operario', q: 'ingeniero', min: 0, max: 0.5 }, minaCarbon: { base: 'operario', q: 'ingeniero', min: 0, max: 0.5 },
  muebles: { base: 'operario', q: 'ingeniero', min: 0, max: 0.3 }, textil: { base: 'operario', q: 'ingeniero', min: 0, max: 0.3 },
  alimentacion: { base: 'operario', q: 'ingeniero', min: 0, max: 0.3 },
  maquinaria: { base: 'operario', q: 'ingeniero', min: 0.2, max: 0.5 }, armamento: { base: 'operario', q: 'ingeniero', min: 0.2, max: 0.5 },
  electrica: { base: 'operario', q: 'ingeniero', min: 0.2, max: 0.5 }, constructora: { base: 'operario', q: 'ingeniero', min: 0.2, max: 0.5 },
  telecom: { base: 'operario', q: 'ingeniero', min: 0.6, max: 1 }, medios: { base: 'operario', q: 'periodista', min: 0.6, max: 1 },
  gimnasio: { base: 'comerciante', q: 'oficinista', min: 0.2, max: 0.6 }, comercio: { base: 'comerciante', q: 'oficinista', min: 0, max: 0.3 },
  banco: { base: 'oficinista', q: 'oficinista', min: 1, max: 1 },
  sanidad: { base: 'operario', q: 'sanitario', min: 0.7, max: 1 }, educacion: { base: 'operario', q: 'academico', min: 0.8, max: 1 },
  seguridad: { base: 'policia' }, policia: { base: 'policia' },
};
function staffSpec(f) {
  if (f.pub != null && f.ctype) return STAFF[PUBLIC_CENTERS[f.ctype].sector] || STAFF.seguridad;
  return STAFF[f.kind] || { base: 'operario' };
}
// ¿Puede trabajar de eso? (los cualificados, de lo suyo, de académicos o de lo que no pide cualificación)
function canWork(cz, prof) {
  if (!isQualJob(prof)) return true;
  if (prof === 'academico') return !!cz.q;
  return cz.q === prof;
}
// Cualificados que tiene, mínimo que necesita y máximo que aprovecha
function qualStats(f, ws) {
  const sp = staffSpec(f), N = ws.length;
  if (!sp.q) return { N, Q: 0, R: 0, M: 0, sp };
  const Q = ws.filter(cz => cz.prof === sp.q).length;
  return { N, Q, R: sp.min * N, M: sp.max * N, sp };
}
// Productividad por las cualificaciones: por debajo del mínimo rinde menos; cada cualificado de más (hasta
// el máximo) rinde un 30 % más
function qualFactor(f, ws) {
  const s = qualStats(f, ws);
  if (!s.sp.q || !s.N) return 1;
  const low = s.R > 0 && s.Q < s.R - 1e-9 ? 0.5 + 0.5 * s.Q / s.R : 1;
  const extra = clamp(Math.min(s.Q, s.M) - s.R, 0, s.N);
  return low * (1 + Q_BONUS * extra / s.N);
}
// La profesión con la que entra alguien si no se dice otra (el puesto cualificado, si vale para él)
function defaultJob(f, cz) {
  const sp = staffSpec(f);
  return sp.q && cz.q && canWork(cz, sp.q) ? sp.q : sp.base;
}
// Sueldo medio de cada profesión (los que trabajan por cuenta ajena)
function laborStats(G) {
  const e = G.eco, sum0 = {}, n0 = {};
  let su = 0, nu = 0, sq = 0, nq = 0;
  const owners = new Set(G.firms.filter(f => f.owner != null).flatMap(f => f.owners || [f.owner]));
  for (const cz of G.citizens) {
    if (!cz.emp || !cz.firm || owners.has(cz.id) || !(cz.wg > 0)) continue;
    sum0[cz.prof] = (sum0[cz.prof] || 0) + cz.wg; n0[cz.prof] = (n0[cz.prof] || 0) + 1;
    if (isQualJob(cz.prof)) { sq += cz.wg; nq++; } else { su += cz.wg; nu++; }
  }
  const old = e.wageBy || {};
  e.wageBy = {};
  for (const p in PROFESSIONS) if (n0[p]) e.wageBy[p] = sum0[p] / n0[p]; else if (old[p]) e.wageBy[p] = old[p];
  e.wageUnq = nu ? su / nu : (e.wageUnq || e.avgWage || 24);
  e.wageQual = nq ? sq / nq : (e.wageQual || (e.avgWage || 24) * 1.3);
  // sueldo medio de cada cualificación: lo que cobran los que trabajan de ella
  e.qualWage = {}; QUALS.forEach(q => { e.qualWage[q] = e.wageBy[q] || e.wageQual; });
  e.qualN = {}; QUALS.forEach(q => { e.qualN[q] = 0; }); for (const cz of G.citizens) if (cz.q && e.qualN[cz.q] != null) e.qualN[cz.q]++;
}
// Lo que se paga de media en una profesión
function refWage(G, prof) {
  const e = G.eco, w = (e.wageBy || {})[prof];
  if (w > 0) return w;
  return (e.avgWage || 24) * (isQualJob(prof) ? 1.3 : 0.9);
}
// Sueldo público de cada profesión (lo marca la Administración; sube con los precios)
function publicWage(G, prof) {
  return PUBLIC_WAGE * ((G.eco.priceIndex || 100) / 100) * (isQualJob(prof) ? 1.25 : prof === 'policia' ? 0.95 : 0.85);
}
// Mitad de la plantilla de una empresa que se lleva cada persona según su cualificación (para los sueldos de partida)
const wageMult = cz => (isQualJob(cz.prof) ? 1.35 : 1) * (0.92 + 0.16 * ((cz.id * 0.6180339887) % 1));

// ---------- al empezar la partida ----------
// Cualificaciones de partida: en cada empresa, los que ocupan los puestos cualificados (los de más estudios);
// además, parte de los que tienen estudios superiores y están en paro
function initQualifications(G) {
  const staff = staffOf(G);
  const demand = {}; QUALS.forEach(q => { demand[q] = 1; });
  for (const f of G.firms) {
    const list = staff.get(f.id) || [], ws = workersOf(f, list), sp = staffSpec(f);
    ws.forEach(cz => { cz.q = cz.q || null; });
    if (!sp.q) { ws.forEach(cz => { if (cz.prof !== sp.base) { cz.prof = sp.base; } }); continue; }
    const want = Math.min(ws.length, Math.round(ws.length * (sp.min + (sp.max - sp.min) * 0.45) + (sp.min > 0 ? 0.49 : 0)));
    const sorted = ws.slice().sort((a, b) => (b.edu - a.edu) || (b.lvl - a.lvl));
    sorted.forEach((cz, k) => {
      if (k < want) { cz.q = sp.q; cz.prof = sp.q; cz.edu = 3; }
      else cz.prof = sp.base;
    });
    demand[sp.q] += want;
  }
  const tot = sum(Object.values(demand));
  for (const cz of G.citizens) {
    if (cz.emp || !inLaborForce(cz) || cz.q) continue;
    if (cz.edu >= 3 && RNG.chance(0.45)) cz.q = RNG.weighted(QUALS, q => demand[q] / tot);
  }
  // los jubilados con estudios también tienen su cualificación (no cuenta para nada, pero se ve)
  for (const cz of G.citizens) if (cz.prof === 'jubilado' && cz.edu >= 3 && cz.q === undefined && RNG.chance(0.5)) cz.q = RNG.weighted(QUALS, q => demand[q] / tot);
}
// Al terminar de preparar la partida: ninguna empresa por debajo de sus cualificados mínimos
function ensureQualMin(G) {
  const staff = staffOf(G);
  for (const f of G.firms) {
    const ws = workersOf(f, staff.get(f.id) || []), s = qualStats(f, ws);
    if (!s.sp.q || s.Q >= Math.ceil(s.R - 1e-9)) continue;
    let need = Math.ceil(s.R - 1e-9) - s.Q;
    for (const cz of ws.filter(z => z.prof !== s.sp.q).sort((a, b) => b.edu - a.edu)) {
      if (need <= 0) break;
      cz.q = s.sp.q; cz.prof = s.sp.q; cz.edu = 3; need--;
    }
  }
}
// Sueldos de partida de cada persona: el sueldo base de su empresa por lo que pesa su puesto
function initPersonalWages(G, f, ws, base) {
  if (f.pub != null) { ws.forEach(cz => { cz.wg = publicWage(G, cz.prof); }); return; }
  ws.forEach(cz => { cz.wg = base * wageMult(cz); });
}

// ---------- el valor de un trabajador más ----------
// Lo que deja al año un trabajador más (k€): lo que produce y se vende (si sobra producción, lo de más casi
// no se vende) menos los insumos que gasta
function marginalValue(G, f, n) {
  const N = Math.max(1, n);
  if (f.kind === 'sanidad' || f.kind === 'educacion') {
    // servicios privados: si le sobran plazas, uno más no aporta
    const util = f.capF ? clamp((f.served || 0) / f.capF, 0, 1) : 1;
    return (f.revY || 0) / N * (util > 0.92 ? 1 : util * 0.6);
  }
  const uns = clamp(f.unsold || 0, 0, 0.9);
  const revFull = (f.revY || 0) / Math.max(0.3, 1 - uns);
  const sellM = clamp(1 - 1.5 * Math.max(0, uns - 0.06), 0.3, 1);
  return revFull / N * sellM - (f.inputsY || 0) / N;
}

// ---------- las decisiones de plantilla de una empresa ----------
// x: { minWage, flex, sev, fireP, flow }
function firmStaffing(G, f, ws, x) {
  const sp = staffSpec(f), c = G.cantons[f.c], n = ws.length, cap = firmCap(f);
  const nOwn = 0;
  const nomF = 1 + nomRate(G, c);
  // (recién abierta: lo que espera; si no, lo que de verdad aporta cada uno, que es poco si le faltan insumos)
  const young = f.fresh || (!n && (G.turn || 0) - (f.born || 0) < 2) || (G.turn || 0) - (f.opened ?? -9) < 1;
  let mv;
  if (f.kind === 'banco') mv = n && f.vaY > 0 ? f.vaY / n : expectedVaw(G, f.kind, f.c, f);
  else if (f.kind === 'constructora') mv = n && f.vaY > 0 ? f.vaY / n : (young ? expectedVaw(G, f.kind, f.c, f) : 0);
  else if (young) mv = expectedVaw(G, f.kind, f.c, f) * 0.9;
  else mv = marginalValue(G, f, n + nOwn);
  f.mv = mv;
  const s = qualStats(f, ws);
  const bonusOK = !!sp.q && sp.max > sp.min && !['banco', 'sanidad', 'educacion'].includes(f.kind);
  // valor de cada uno: el cualificado por encima del mínimo rinde un 30 % más
  let qSeen = 0;
  const valueOf = cz => {
    if (!bonusOK || cz.prof !== sp.q) return mv;
    qSeen++;
    return qSeen > s.R ? mv * (1 + Q_BONUS) : mv;
  };
  const vals = new Map(ws.map(cz => [cz.id, valueOf(cz)]));
  const crisis = (f.loss || 0) >= 2 || (f.crisisQ || 0) >= 3;
  // 1) sueldos de la plantilla (convenio de empresa): cada uno se acerca poco a poco a la parte habitual de lo que
  //    aporta (el 70 % del valor añadido de cada trabajador, vendiendo lo normal; algo más si faltan
  //    trabajadores en el cantón), sin pasar nunca del 90 % de lo que aporta descontadas sus cotizaciones.
  //    Si la empresa pierde dinero, el ajuste a la baja es más rápido (descuelgues, menos horas…), tanto más
  //    cuanto más flexible es la ley laboral
  if (n > 0 && f.vaY > 0 && !young) {
    const vaw = f.vaY / (n + nOwn);
    const vawW = vaw / Math.max(0.75, 1 - Math.max(0, (f.unsold || 0) - UNSOLD_OK));
    const tightF = clamp(1 + (c.tight || 0) * 1.5, 0.95, 1.08);
    const mAvg = avg(ws, wageMult);
    const down = [0.25, 0.35, 0.45, 0.55, 0.65][x.flex];
    for (const cz of ws) {
      const m = wageMult(cz) / mAvg;
      const goal = Math.max(x.minWage, Math.min(LABOR_SHARE_F * vawW * tightF * m, 0.9 * vawW * m / nomF));
      const w = cz.wg || goal;
      cz.wg = Math.max(x.minWage, lerp(w, goal, goal < w ? ((f.loss || 0) >= 1 || (f.crisisQ || 0) >= 2 ? down : 0.15) : 0.2));
    }
  }
  // 2) despidos: quien cuesta más de lo que aporta (si un año de pérdidas pasa de lo que cuesta despedirlo).
  //    Solo se plantea despedir si la empresa pierde dinero o le sobra mucha producción (si no, aguanta a su gente)
  const mustCut = (f.profitY || 0) < 0 || (f.unsold || 0) > 0.12 || (f.kind === 'constructora' && (f.want ?? n) < n - 1);
  if (n > 0 && f.kind !== 'banco' && mustCut) {
    const wantN = f.kind === 'constructora' ? clamp(f.want ?? n, 1, cap) : n;
    const loss = cz => (cz.wg || 0) * nomF - vals.get(cz.id);
    const order = ws.slice().sort((a, b) => loss(b) - loss(a));
    let fired = 0, Qnow = s.Q;
    const maxF = Math.max(1, Math.ceil(n * (f.kind === 'constructora' && wantN < n / 2 ? 0.5 : 0.15)));
    for (const cz of order) {
      if (fired >= maxF) break;
      const extraStaff = f.kind === 'constructora' && n - fired > wantN + 1;
      const l = loss(cz);
      if (l <= 0.05 * (cz.wg || 0) && !extraStaff) break;
      // (no se queda sin los cualificados mínimos mientras le queden otros que despedir)
      if (cz.prof === sp.q && Qnow - 1 < s.R - 1e-9 && fired < n - 1 && !extraStaff) continue;
      const sevPay = (cz.wg || 0) * x.sev * (f.kind === 'constructora' ? 0.3 : 1);
      if (!extraStaff && l < sevPay) continue;
      if (!RNG.chance(x.fireP)) continue;
      dropJob(cz); cz.ue = 0;
      if (sevPay > 0) { f.cash -= sevPay; cz.sav = (cz.sav || 0) + sevPay; }
      if (cz.prof === sp.q) Qnow--;
      fired++;
    }
    x.flow.fired += fired;
    if (fired) { ws = ws.filter(cz => cz.emp && cz.firm === f.id); f.tgt = Math.min(f.tgt ?? n, ws.length); }
  }
  // 3) ofertas de empleo
  const n2 = ws.length, s2 = qualStats(f, ws);
  const capFor = v => (v.k === 'bonus' ? mv * (1 + Q_BONUS) : mv) / nomF;
  const vac = [];
  for (const v of f.vac || []) {
    // la que no se cubrió: sube el sueldo si sigue saliendo a cuenta (y la del cualificado que nadie pide
    // en dos turnos se duplica en una para alguien sin cualificar)
    v.t = (v.t || 0) + 1;
    if (v.pub) { v.w = publicWage(G, v.p); vac.push(v); continue; }
    v.w = Math.max(x.minWage, v.w * 1.1);
    if (v.w > capFor(v) && !(v.k === 'req')) continue;
    if (v.k === 'bonus' && v.t > 4) continue;   // (el cualificado que nadie pide en un año, se deja)
    if (v.k === 'req' && v.w > capFor(v) * 1.5) continue;
    vac.push(v);
    if (v.k === 'bonus' && v.t >= 2 && !v.alt) {
      v.alt = 1;
      const w = Math.max(x.minWage, refWage(G, sp.base) * OFFER_START);
      if (w <= mv / nomF) vac.push({ p: sp.base, w, t: 0, k: 'base' });
    }
  }
  if (f.pub == null) {
    // plantilla que quiere tener: la de siempre (cubre a quien se va), más si le sale a cuenta crecer;
    // en crisis o con el mercado saturado no cubre las bajas
    if (f.tgt == null) f.tgt = n2;
    let target = Math.min(f.tgt, cap);
    if (f.kind === 'banco' || f.kind === 'constructora') target = clamp(f.want ?? n2, 2, cap);
    else if (young) target = Math.max(target, 2, Math.round(cap * 0.6));
    else if (crisis) target = Math.min(target, n2);
    else if ((f.unsold || 0) < 0.08) {
      // (crece si un trabajador más deja más de lo que cuesta, contando con el sueldo que ya paga a los suyos,
      // y si el mercado de lo suyo no está saturado)
      const costU = Math.max(x.minWage, refWage(G, sp.base) * OFFER_START, n2 ? avg(ws, cz => cz.wg || 0) : 0) * nomF;
      const g0 = FIRM_KINDS[f.kind].out ? Object.keys(FIRM_KINDS[f.kind].out)[0] : null, tr = g0 && G.eco.trade ? G.eco.trade[f.product || g0] : null;
      const glut = tr && (tr.soldF ?? 1) < 0.9;
      if (mv > costU * 1.08 && !glut) target = Math.min(cap, Math.max(target, n2 + Math.max(1, Math.round(cap * 0.2))));
      else if (glut || mv < costU) target = Math.min(target, n2);
    }
    else if ((f.unsold || 0) > 0.12) target = Math.min(target, n2);
    f.tgt = target;
    // (las ofertas para cualificados de más son aparte: no frenan las demás)
    const core = vac.filter(v => v.k !== 'bonus');
    let k = target - n2 - core.length;
    if (k < 0) { const drop = core.sort((a, b) => (a.k === 'req') - (b.k === 'req')).slice(0, -k); for (const v of drop) vac.splice(vac.indexOf(v), 1); k = 0; }
    const bonusOpen = vac.filter(v => v.k === 'bonus').length, bonusMax = Math.max(1, Math.round(cap * 0.25));
    let qOpen = vac.filter(v => v.p === sp.q).length;
    for (let i = 0; i < k; i++) {
      const tot = n2 + vac.length + 1;
      let v;
      if (sp.q && s2.Q + qOpen < sp.min * tot - 1e-9) v = { p: sp.q, k: 'req' };
      else v = { p: sp.base, k: 'base' };
      v.w = Math.max(x.minWage, refWage(G, v.p) * OFFER_START); v.t = 0;
      if (v.k !== 'req' && v.w > capFor(v)) continue;
      if (v.p === sp.q) qOpen++;
      vac.push(v);
    }
    // cualificados de más (rinden un 30 % más), si le salen a cuenta y le cabe gente
    if (bonusOK && !crisis && bonusOpen < bonusMax && n2 + vac.length < cap && s2.Q + qOpen < sp.max * (n2 + 1) - 1e-9) {
      const v = { p: sp.q, k: 'bonus', t: 0, w: Math.max(x.minWage, refWage(G, sp.q) * OFFER_START) };
      if (v.w <= capFor(v)) vac.push(v);
    }
  }
  f.vac = vac;
  f.wage = n2 ? avg(ws, cz => cz.wg || 0) : refWage(G, sp.base);
  return ws;
}

// ---------- el encuentro entre ofertas y demandantes ----------
// Lo mínimo que acepta alguien: si trabaja, lo que gana ahora y algo más; si está en paro, más que el subsidio
// (cuanto más tiempo lleva en paro, menos exige)
function reservationWage(G, cz, x) {
  if (cz.emp) return (cz.wg || 0) * 1.08;
  const ben = x.benefit * (cz.lastSector ? 1 : 0.5);
  return Math.max(x.minWage, ben * 1.15) * Math.max(0.85, 1 - 0.04 * (cz.ue || 0));
}
// Cantones vecinos de cada cantón (se puede ir a trabajar a diario a uno vecino sin mudarse)
function cantonNeighbors(G) {
  const ver = G.mapVer || 0;
  if (G._cadj && G._cadj.ver === ver) return G._cadj.adj;
  const ci = G.ci || 0, adj = G.cantons.map(() => new Set());
  for (const h of G.map.hexes) {
    if (h.c !== ci || h.k == null || h.k < 0 || !adj[h.k]) continue;
    for (const [q, r] of HEX.neighbors(h.q, h.r)) { const n = hexAtG(G, q, r); if (n && n.c === ci && n.k >= 0 && n.k !== h.k && adj[n.k]) adj[h.k].add(n.k); }
  }
  // (se puede ir a diario hasta a dos cantones de distancia)
  const near = adj.map((set, i) => { const out = new Set(set); for (const k of set) for (const k2 of adj[k]) if (k2 !== i) out.add(k2); return out; });
  G._cadj = { ver, adj: near };
  return near;
}
function matchJobs(G, x) {
  const e = G.eco;
  const vacs = [];
  for (const f of G.firms) for (const v of f.vac || []) vacs.push({ f, v });
  const flow = x.flow;
  flow.vac = vacs.length;
  const firmsById = new Map(G.firms.map(f => [f.id, f]));
  const owners = new Set(G.firms.filter(f => f.owner != null).flatMap(f => f.owners || [f.owner]));
  const byC = G.cantons.map(() => []);
  vacs.forEach(o => byC[o.f.c].push(o));
  const apps = new Map(vacs.map(o => [o, []]));
  const seekers = [];
  for (const cz of G.citizens) {
    if (!inLaborForce(cz) || owners.has(cz.id)) continue;
    if (cz.emp && !RNG.chance(0.2)) continue;
    seekers.push(cz);
  }
  const adj = cantonNeighbors(G);
  for (const cz of seekers) {
    const own = byC[cz.c];
    let pool = own;
    // quien lleva tiempo en paro (o no ve nada en su cantón) busca también en los cantones vecinos (puede ir a
    // diario) y, si sigue sin encontrar, en todo el país (tendría que mudarse)
    if (!cz.emp && ((cz.ue || 0) >= 1 || !own.length)) pool = own.concat(...[...(adj[cz.c] || [])].map(k => byC[k]));
    if (!cz.emp && (cz.ue || 0) >= 3) pool = vacs;
    if (!pool.length) continue;
    const res = reservationWage(G, cz, x);
    const pick = pool.length <= SEARCH_N ? pool : RNG.shuffle(pool.slice()).slice(0, SEARCH_N);
    for (const o of pick) {
      if (o.f.id === cz.firm || !canWork(cz, o.v.p)) continue;
      const need = o.f.c === cz.c ? res : (adj[cz.c] || new Set()).has(o.f.c) ? res * 1.06 : res * 1.15;
      if (o.v.w >= need) apps.get(o).push(cz);
    }
  }
  const homeOf = new Map(G.homes.map(h => [h.id, h]));
  const tier = (cz, f) => { if (cz.c !== f.c) return (adj[cz.c] || new Set()).has(f.c) ? 2 : 3; const h = homeOf.get(cz.hh); return h && h.q === f.q && h.r === f.r ? 0 : 1; };
  const taken = new Set();
  const books = bankBooks(G);
  let moved = 0, relocated = 0;
  vacs.sort((a, b) => b.v.w - a.v.w);
  for (const o of vacs) {
    const list = apps.get(o).filter(cz => !taken.has(cz.id) && o.f.vac.includes(o.v));
    if (!list.length) continue;
    const ts = list.map(cz => tier(cz, o.f)), best = Math.min(...ts);
    const cand = RNG.shuffle(list.filter((cz, i) => ts[i] === best));
    for (const cz of cand) {
      if (best === 3 && !relocateHome(G, books, cz, o.f, o.v.w)) continue;
      if (best === 3) relocated++;
      if (cz.emp) { moved++; const old = firmsById.get(cz.firm); dropJob(cz); if (old && old.pub == null) old.quits = (old.quits || 0) + 1; }
      setJob(G, cz, o.f, false, o.v.p);
      cz.wg = o.v.w; cz.ue = 0; cz.hired = G.turn || 0;
      taken.add(cz.id);
      o.f.vac.splice(o.f.vac.indexOf(o.v), 1);
      flow.hired++;
      break;
    }
  }
  flow.moved = moved; flow.relocated = relocated;
  flow.vacLeft = sum(G.firms, f => (f.vac || []).length);
  // tensión del mercado de trabajo de cada cantón: ofertas sin cubrir frente a la gente en paro
  // (si faltan trabajadores, los sueldos de todos suben un poco más deprisa)
  const left = G.cantons.map(() => 0), idle = G.cantons.map(() => 0), lf = G.cantons.map(() => 0);
  for (const f of G.firms) left[f.c] += (f.vac || []).filter(v => v.k !== 'bonus').length;
  for (const cz of G.citizens) if (inLaborForce(cz)) { lf[cz.c]++; if (!cz.emp) idle[cz.c]++; }
  G.cantons.forEach((c, i) => { c.tight = lerp(c.tight || 0, (left[i] - idle[i]) / Math.max(1, lf[i]), 0.5); });
  for (const cz of G.citizens) if (inLaborForce(cz) && !cz.emp) cz.ue = (cz.ue || 0) + 1;
}
// Mudanza a otro cantón por un trabajo: el banco compra la vivienda de la familia (la pone a la venta), se
// cancelan sus hipotecas y la familia compra otra cerca del trabajo nuevo. Solo si nadie más de la casa
// trabaja y si encuentran una vivienda que puedan pagar.
function relocateHome(G, books, cz, f, wage) {
  const home = G.homes.find(h => h.id === cz.hh);
  if (!home) return false;
  const ms = G.citizens.filter(z => z.hh === home.id);
  if (ms.some(z => z !== cz && (z.emp || G.firms.some(ff => ff.owner === z.id)))) return false;
  const bank = books.get(cz.bk) || [...books.values()].find(b => b.f.c === cz.c) || [...books.values()][0];
  if (!bank) return false;
  const h0 = hexAtG(G, home.q, home.r);
  const price = marketPrice(G, home.kind, h0, home.c) * 0.9;
  const debt = sum(ms, z => z.hip ? z.hip.p : 0);
  const savAll = sum(ms, z => Math.max(0, z.sav || 0));
  const sav = savAll + price - debt;
  if (sav < 3) return false;
  const inc = sum(ms.filter(z => z !== cz), z => Math.max(0, z.income || 0)) + wage * 0.75;
  const free = vacantSlots(G);
  const pref = f.q != null ? hexAtG(G, f.q, f.r) : null;
  const r = shopFor(G, books, cz, f.c, pref, { free, sav, income: inc, age: cz.age });
  if (r.res !== 'ok') return false;
  // venta al banco y cancelación de las hipotecas
  bank.f.cash -= price;
  G.forSale = G.forSale || {};
  G.forSale[homeKey(home)] = { f: bank.f.id, t: G.turn || 0, k: home.kind, q: home.q, r: home.r, c: home.c };
  for (const z of ms) if (z.hip) { const b = books.get(z.hip.b); if (b) { b.f.cash += z.hip.p; b.L -= z.hip.p; b.mort -= z.hip.p; } delete z.hip; }
  // los ahorros de la casa y lo que queda de la venta, para quien compra
  ms.forEach(z => { if (z !== cz) { cz.sav = (cz.sav || 0) + Math.max(0, z.sav || 0); z.sav = Math.min(0, z.sav || 0); } });
  cz.sav = (cz.sav || 0) + price - debt;
  G.homes = G.homes.filter(h => h !== home);
  G.nextHomeId = (G.nextHomeId || 0) + 1;
  const nh = { id: G.nextHomeId, c: r.sl.c, q: r.sl.q, r: r.sl.r, b: r.sl.b, u: r.sl.u, kind: r.sl.kind, sn: home.sn, kids: home.kids };
  G.homes.push(nh);
  ms.forEach(z => { z.c = f.c; z.hh = nh.id; z.urban = nh.kind === 'piso'; delete z.wantsHome; z.mvT = G.turn || 0; });
  closePurchase(G, books, r.fin, cz, r.sl, r.px);
  return true;
}

// ---------- estudios ----------
// Los estudiantes de 18 años o más eligen una especialización (si alguna se paga mejor que los empleos sin
// cualificar) y estudian 4 trimestres; si ninguna compensa, empiezan a trabajar. Los adultos en paro sin
// cualificar también pueden volver a estudiar. Las plazas dependen de los académicos que hay.
function educationQuarter(G) {
  const e = G.eco;
  if (!e.wageBy) laborStats(G);
  const unq = e.wageUnq || (e.avgWage || 24) * 0.9;
  const prem = QUALS.map(q => [q, (e.qualWage && e.qualWage[q] || unq * 1.3) / unq]);
  const good = prem.filter(([, p]) => p > 1.05);
  const teachers = G.citizens.filter(cz => cz.emp && cz.prof === 'academico').length;
  let seats = Math.max(2, teachers * 3) - G.citizens.filter(cz => cz.prof === 'estudiante' && cz.st > 0).length;
  const pickQ = () => RNG.weighted(good, ([, p]) => Math.pow(p - 1, 2)) [0];
  let started = 0, graduated = 0;
  for (const cz of G.citizens) {
    if (cz.prof !== 'estudiante') continue;
    if (cz.st > 0) {
      cz.st--;
      if (cz.st <= 0) {
        cz.q = cz.sq || cz.q; delete cz.sq; cz.st = 0; cz.edu = 3;
        cz.prof = 'parado'; cz.emp = false; cz.sector = null; cz.lastSector = null; cz.ue = 0;
        computeIdeology(G, cz, PROFESSIONS.parado, false);
        graduated++;
      }
      continue;
    }
    // (de los 18 a los 25 se decide poco a poco: unos siguen con estudios generales un tiempo y otros empiezan
    // antes; a los 25, todos han decidido)
    if (cz.age < 18 || (cz.age < 25 && !RNG.chance(0.1 + 0.07 * (cz.age - 18)))) continue;
    if (good.length && seats > 0 && !cz.q) { cz.sq = pickQ(); cz.st = STUDY_Q; seats--; started++; continue; }
    // sin especialización que compense (o sin plaza): a trabajar
    if (!good.length || seats <= 0 || cz.q) {
      cz.prof = 'parado'; cz.emp = false; cz.sector = null; cz.lastSector = null; cz.ue = 0;
      computeIdeology(G, cz, PROFESSIONS.parado, false);
    }
  }
  // adultos en paro sin cualificar que vuelven a estudiar
  if (good.length && seats > 0) {
    const bestP = Math.max(...good.map(([, p]) => p));
    for (const cz of G.citizens) {
      if (seats <= 0) break;
      if (cz.emp || cz.q || !inLaborForce(cz) || cz.age > 40 || cz.age < 20 || (cz.ue || 0) < 2) continue;
      if (!RNG.chance(0.04 * clamp((bestP - 1.05) / 0.3, 0, 1))) continue;
      cz.prof = 'estudiante'; cz.sq = pickQ(); cz.st = STUDY_Q; seats--; started++;
      computeIdeology(G, cz, PROFESSIONS.estudiante, false);
    }
  }
  e.edu = { started, graduated, seats: Math.max(0, seats), teachers };
}

// ============================================================
//  DUEÑOS Y SOCIOS
//  Una empresa de nivel 1-2 (pequeña) tiene un dueño; de nivel 3-4 (mediana), dos socios; de nivel 5-6
//  (grande), tres. Los socios se reparten a partes iguales lo que se lleva la propiedad. Quien se jubila sigue
//  siendo socio; si muere, hereda su parte alguien de su casa; si no hay nadie, los demás socios la absorben
//  y buscan otro socio (si es el único dueño, la empresa se vende a quien tenga ahorros o cierra).
// ============================================================
const MAX_LVL = 6;
const partnersFor = lvl => (lvl || 1) <= 2 ? 1 : (lvl || 1) <= 4 ? 2 : 3;
const ownersOf = f => f.owners || (f.owner != null ? [f.owner] : []);
const firmSize = lvl => (lvl || 1) <= 2 ? 'pequeña' : (lvl || 1) <= 4 ? 'mediana' : 'grande';
// Todos los dueños y socios de todas las empresas
function ownerIds(G) { const s = new Set(); for (const f of G.firms) if (f.pub == null) for (const id of ownersOf(f)) s.add(id); return s; }
// Valor de la empresa (lo que pagaría alguien por ella): sus edificios y su caja
const firmValue = (G, f) => Math.max(0, (FIRM_KINDS[f.kind].capex || 100) * (f.lvl || 1) * wageFactor(G) * 0.6 + Math.max(0, f.cash || 0) - (f.debt || 0));
// Lo que una persona podría ganar trabajando de lo suyo (su alternativa a ser socio)
// (quien lleva tiempo en paro se conforma con menos: lo que le ofrecerían al entrar en una empresa)
const outsideOption = (G, cz) => (cz.q ? Math.max(refWage(G, cz.q), refWage(G, 'operario')) : refWage(G, 'operario')) * (!cz.emp && (cz.ue || 0) >= 2 ? OFFER_START : 1);
// Busca un socio en el cantón (o en el país) con ahorros para poner su parte y que gane más como socio que
// trabajando (share: lo que se llevaría al año)
function findPartner(G, f, stake, share, owners) {
  const own = owners || ownerIds(G);
  const ok = cz => inLaborForce(cz) && cz.age >= 25 && cz.age <= 64 && !own.has(cz.id) && (cz.sav || 0) >= stake + 3 && share >= outsideOption(G, cz) * 1.2;
  let cands = G.citizens.filter(cz => cz.c === f.c && ok(cz));
  if (!cands.length) cands = G.citizens.filter(ok);
  if (!cands.length) return null;
  return RNG.weighted(cands, cz => Math.sqrt(cz.sav) * (cz.emp ? 1 : 1.5));
}
function addPartner(G, f, cz) {
  if (cz.emp) dropJob(cz);
  f.owners = ownersOf(f).concat([cz.id]);
  if (f.owner == null) f.owner = cz.id;
  setJob(G, cz, f, true);
}
// Lo que cada socio se lleva al año
const ownerShareOf = f => Math.max(0, f.ownerY || 0) / Math.max(1, ownersOf(f).length);
// Cada turno: las empresas a las que les faltan socios los buscan (la parte la paga el nuevo socio a los
// demás); si en un año no encuentran a nadie, bajan de nivel
function partnersQuarter(G, x) {
  const own = ownerIds(G);
  for (const f of G.firms) {
    if (f.pub != null || f.obra || !FIRM_KINDS[f.kind]) continue;
    const os = ownersOf(f), need = partnersFor(f.lvl);
    if (os.length >= need) { f.noPartner = 0; continue; }
    const value = firmValue(G, f), stake = value / need;
    const share = Math.max(0, f.ownerY || 0) / need;
    const cz = findPartner(G, f, stake, share, own);
    if (cz) {
      cz.sav -= stake;
      const others = os.map(id => G.citizens.find(z => z.id === id)).filter(Boolean);
      if (others.length) others.forEach(z => { z.sav = (z.sav || 0) + stake / others.length; }); else f.cash += stake;
      addPartner(G, f, cz); own.add(cz.id); f.noPartner = 0;
      continue;
    }
    f.noPartner = (f.noPartner || 0) + 1;
    if (f.noPartner >= 4 && f.lvl > 1) {
      // sin socios: la empresa se queda en el tamaño que puede llevar (despide a quien sobra)
      f.lvl--; f.noPartner = 0;
      const ws = workersOf(f, G.citizens.filter(z => z.emp && z.firm === f.id));
      const extra = ws.length - firmCap(f);
      if (extra > 0) ws.sort((a, b) => (a.hired || 0) - (b.hired || 0)).slice(-extra).forEach(z => { const sev = (z.wg || 0) * x.sev; f.cash -= sev; z.sav = (z.sav || 0) + sev; dropJob(z); z.ue = 0; });
      f.vac = [];
      G.eco.news.push({ type: 'bad', topic: 'empresas', importance: 2, text: `${f.name} no encuentra socios y reduce su tamaño (nivel ${f.lvl}).` });
    }
  }
}
// Muerte de un socio: hereda alguien de su casa; si no, los demás socios se quedan su parte; si era el único,
// la empresa se vende a quien tenga ahorros o cierra
function ownerDied(G, cz, dead, books) {
  for (const f of G.firms) {
    if (f.pub != null || !ownersOf(f).includes(cz.id)) continue;
    const heirs = G.citizens.filter(z => z.hh === cz.hh && !dead.has(z.id) && z.age >= 18 && !ownersOf(f).includes(z.id))
      .sort((a, b) => (b.role === 'hijo' ? 2 : b.role === 'pareja' || b.role === 'titular' ? 1 : 0) - (a.role === 'hijo' ? 2 : a.role === 'pareja' || a.role === 'titular' ? 1 : 0));
    const heir = heirs[0];
    f.owners = ownersOf(f).filter(id => id !== cz.id);
    if (heir) {
      f.owners.push(heir.id);
      // si puede trabajar, pasa a llevar la empresa (deja su empleo); si no, es socio sin más
      if (inLaborForce(heir) && !G.firms.some(o => o !== f && ownersOf(o).includes(heir.id))) { if (heir.emp) dropJob(heir); setJob(G, heir, f, true); }
    } else if (!f.owners.length) {
      const own = ownerIds(G);
      const buyer = findPartner(G, f, firmValue(G, f) * 0.5, ownerShareOf(f), own);
      if (buyer) { buyer.sav -= firmValue(G, f) * 0.5; f.owners = []; addPartner(G, f, buyer); G.eco.news.push({ type: 'neutral', topic: 'empresas', importance: 1, text: `${buyer.nm} compra ${f.name} tras la muerte de su dueño.` }); }
      else {
        // si nadie la compra, se la quedan sus trabajadores (la lleva el que más tiempo lleva en ella)
        const staff = G.citizens.filter(z => z.emp && z.firm === f.id && !dead.has(z.id)).sort((a, b) => (a.hired ?? -99) - (b.hired ?? -99));
        if (staff.length) { f.owners = []; addPartner(G, f, staff[0]); G.eco.news.push({ type: 'neutral', topic: 'empresas', importance: 1, text: `La plantilla se queda con ${f.name} tras la muerte de su dueño: la llevará ${staff[0].nm}.` }); }
        else { f.why = 'sin herederos'; f.dying = 1; }
      }
    }
    f.owner = f.owners[0] ?? null;
  }
}
// Al empezar: las empresas medianas y grandes tienen ya sus socios (gente del cantón con algo de nivel)
function initPartners(G) {
  const own = ownerIds(G);
  for (const f of G.firms) {
    if (f.pub != null || !FIRM_KINDS[f.kind]) continue;
    f.lvl = Math.min(f.lvl || 1, FIRM_KINDS[f.kind].maxLvl || MAX_LVL);
    f.owners = ownersOf(f).slice();
    let need = partnersFor(f.lvl) - f.owners.length;
    if (need <= 0) continue;
    const cands = RNG.shuffle(G.citizens.filter(cz => cz.c === f.c && inLaborForce(cz) && cz.age >= 30 && cz.age <= 64 && !own.has(cz.id) && cz.lvl >= 3));
    for (const cz of cands) {
      if (need <= 0) break;
      if (cz.emp) dropJob(cz);
      f.owners.push(cz.id); own.add(cz.id); setJob(G, cz, f, true); need--;
    }
  }
}
