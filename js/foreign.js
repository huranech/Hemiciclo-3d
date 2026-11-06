// ============================================================
//  LOS OTROS PAÍSES
//  Cada país del mapa se simula igual que el nuestro: sus habitantes, viviendas, empresas, bancos,
//  presupuestos y leyes. Sus partidos defienden su ideología (con más empeño cuanto más extrema es):
//  proponen y votan leyes en su Parlamento, forman gobierno y se presentan a elecciones generales y
//  cantonales, en las que votan sus habitantes con los mismos criterios que los nuestros.
//  Aquí también: tratados de libre comercio (los dos países tienen que querer), migración entre
//  países y la prensa internacional.
// ============================================================
'use strict';

const FOREIGN_FIRST = ['Henrik', 'Amara', 'Lorenzo', 'Ingrid', 'Pierre', 'Mila', 'Tariq', 'Sofía', 'Jonas', 'Yara', 'Olaf', 'Nadia', 'Kofi', 'Elsa', 'Dmitri',
  'Leila', 'Mateus', 'Aiko', 'Brigid', 'Rasmus', 'Zeynep', 'Tomasz', 'Inés', 'Kenji', 'Fiona', 'Bruno', 'Astrid', 'Omar', 'Greta', 'Vítor'];
const FOREIGN_LAST = ['Vass', 'Okoye', 'Bassi', 'Holm', 'Lacombe', 'Novak', 'Haddad', 'Arce', 'Weber', 'Costa', 'Lindqvist', 'Mensah', 'Rossi', 'Kowalski',
  'Duarte', 'Moreau', 'Petrov', 'Byrne', 'Sato', 'Aydın', 'Nyberg', 'Varga', 'Castell', 'Ferrand', 'Ibsen', 'Okafor', 'Radić', 'Lenz', 'Keane', 'Morales'];
// Nombre de un líder de la cultura del país
const foreignLeaderName = cu => { const C = NATION_CULTURES[cu]; return C ? RNG.pick(RNG.chance(0.5) ? C.f : C.m) + ' ' + RNG.pick(C.sn) : RNG.pick(FOREIGN_FIRST) + ' ' + RNG.pick(FOREIGN_LAST); };

// Familias de partido: ideología central (6 ejes), nombres posibles, colores y símbolos
const FOREIGN_FAMILIES = [
  { id: 'izquierda', fis: -0.35, ideo: { eco: -1.6, soc: -1.2, ter: 0, ext: -0.6, aut: -0.6, amb: -0.8 }, names: ['Izquierda Unida', 'Partido Comunista', 'Frente Popular', 'Alianza Obrera'], colors: ['#b3202f', '#8f1d2c'], icons: ['puno', 'estrella', 'cog'] },
  { id: 'socialdemocracia', fis: 0.1, ideo: { eco: -0.9, soc: -0.7, ter: 0.2, ext: -0.6, aut: -0.3, amb: -0.4 }, names: ['Partido Socialdemócrata', 'Partido Laborista', 'Partido Socialista', 'Unión Progresista'], colors: ['#d84a4a', '#e0643a'], icons: ['rosa', 'antorcha', 'hand-heart'] },
  { id: 'verdes', fis: -0.1, ideo: { eco: -0.6, soc: -1.1, ter: 0.5, ext: -1.0, aut: -0.8, amb: -1.8 }, names: ['Los Verdes', 'Alianza Ecologista', 'Partido Verde', 'Movimiento por la Tierra'], colors: ['#2f9e44', '#4caf50'], icons: ['girasol', 'leaf', 'arbol'] },
  { id: 'liberales', fis: 0.45, ideo: { eco: 1.0, soc: -0.6, ter: 0, ext: -1.2, aut: -0.7, amb: 0.2 }, names: ['Partido Liberal', 'Demócratas Liberales', 'Alianza Cívica', 'Partido Progresista Liberal'], colors: ['#f0a32f', '#e8c53a'], icons: ['flecha', 'feather', 'scale'] },
  { id: 'centro', fis: 0.3, ideo: { eco: 0.2, soc: 0, ter: 0, ext: -0.3, aut: 0, amb: 0 }, names: ['Unión de Centro', 'Movimiento Ciudadano', 'Partido Cívico', 'Coalición Moderada'], colors: ['#7a5cc7', '#29a3b6'], icons: ['hemiciclo', 'handshake', 'anillos'] },
  { id: 'conservadores', fis: 0.4, ideo: { eco: 1.1, soc: 1.0, ter: -0.6, ext: 0.3, aut: 0.6, amb: 0.6 }, names: ['Partido Conservador', 'Unión Cristiana', 'Partido Popular', 'Alianza Republicana'], colors: ['#1f4fa0', '#2b6cc4'], icons: ['columna', 'cruz', 'shield'] },
  { id: 'nacionalistas', fis: -0.2, ideo: { eco: 0.4, soc: 1.4, ter: -1.4, ext: 1.6, aut: 1.3, amb: 0.9 }, names: ['Frente Nacional', 'Partido de la Patria', 'Movimiento Soberanista', 'Liga Nacional'], colors: ['#3b3f4a', '#5b4a2e'], icons: ['flag', 'llama', 'castle'] },
  { id: 'agrarios', fis: -0.1, ideo: { eco: 0.1, soc: 0.6, ter: 0.4, ext: 0.7, aut: 0.2, amb: 0.4 }, names: ['Partido Agrario', 'Unión Rural', 'Liga de los Campos'], colors: ['#7d8b2e', '#a0822c'], icons: ['espigas', 'tractor', 'wheat'] },
];
// Responsabilidad fiscal (eje oculto, de −1 a 1): los partidos con mucha buscan el superávit y los que tienen poca,
// el gasto y el déficit. No sale en ninguna brújula; solo se nota en lo que proponen y votan.
const FIS_BASE = fam => fam.fis || 0;
const FOREIGN_SHAPES = ['circle', 'rounded', 'shield', 'hexagon', 'square', 'ring', 'flag', 'octagon'];

function makeForeignParty(f, fam, k, regionalCanton) {
  const ideo = {}; AXIS_IDS.forEach(a => { ideo[a] = clamp((fam.ideo[a] || 0) + RNG.normal(0, 0.3), -2, 2); });
  let name = RNG.pick(fam.names);
  if (regionalCanton != null) { ideo.ter = clamp(ideo.ter + 1.4, -2, 2); name = RNG.pick(['Partido de ', 'Unión de ', 'Bloque de ', 'Coalición de ']) + f.cantons[regionalCanton].name; }
  const short = name.split(/\s+/).filter(w => w.length > 2 && !/^(del|las|los|por)$/i.test(w)).map(w => w[0].toUpperCase()).join('').slice(0, 4) || name.slice(0, 3).toUpperCase();
  return {
    id: f.id + 'p' + k, name, short, family: fam.id, color: RNG.pick(fam.colors), color2: '#ffffff', regional: regionalCanton ?? null,
    logo: { shape: RNG.pick(FOREIGN_SHAPES), icon: RNG.pick(fam.icons), style: RNG.chance(0.75) ? 'lleno' : 'invertido', text: short },
    leader: foreignLeaderName(f.cul), ideo, base: Object.assign({}, ideo), fis: Math.round(clamp(FIS_BASE(fam) + RNG.normal(0, 0.4), -1, 1) * 100) / 100, share: 0, seats: 0, pop: 0, stats: { maxSeats: 0 },
  };
}
// Partidos de cada país (al generar el mundo)
function initForeignPolitics(G) {
  G.foreign.forEach(f => {
    const n = clamp(Math.round(f.hexCount / 22) + RNG.int(2, 3), 2, 5);
    const fams = RNG.shuffle(FOREIGN_FAMILIES.slice()).slice(0, n);
    // casi siempre hay un partido de cada lado
    if (!fams.some(x => x.ideo.eco < 0)) fams[0] = FOREIGN_FAMILIES[1];
    if (!fams.some(x => x.ideo.eco > 0.5)) fams[fams.length - 1] = FOREIGN_FAMILIES[5];
    f.parties = [];
    fams.forEach((fam, k) => { let p, tries = 0; do { p = makeForeignParty(f, fam, k); } while (tries++ < 6 && f.parties.some(x => x.name === p.name || x.short === p.short)); f.parties.push(p); });
    f.cantons.filter(c => !c.nominal).forEach(c => { if (c.identity > 0.55) f.parties.push(makeForeignParty(f, FOREIGN_FAMILIES[RNG.pick([1, 3, 5, 7])], f.parties.length, c.idx)); });
    // Siglas únicas dentro del país
    const seen = new Set();
    f.parties.forEach(p => {
      let s = p.short, n2 = 2;
      while (seen.has(s)) s = p.short.slice(0, 3) + n2++;
      if (s !== p.short) { p.short = s; p.logo.text = s; }
      seen.add(s);
    });
  });
}
const foreignGovParty = f => f.st && f.st.gov ? f.parties.find(p => p.id === f.st.gov.president) : null;

// ============================================================
//  Estados de los países
// ============================================================
const hide = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });
// Todos los países: el nuestro primero
function worldStates(G) { return [G].concat((G.foreign || []).filter(f => f.st).map(f => f.st)); }
// Enlaces de cada país con lo que comparte con los demás (no se guardan dos veces)
function linkStates(G) {
  G.nid = G.nid || 'f0'; G.ci = 0; G.cul = G.cul || 'hispana';
  G.self = Object.assign(G.self || {}, { id: 'f0', name: G.country.name, mapIndex: 0, cul: G.cul, color: '#e0b84e' });
  (G.foreign || []).forEach(f => {
    const S = f.st; if (!S) return;
    hide(S, 'map', G.map); hide(S, 'world', G.world); hide(S, 'main', G); hide(S, 'nation', f);
    hide(S, 'players', f.parties); hide(S, 'foreign', [G.self].concat(G.foreign.filter(x => x !== f)));
  });
}
// Lo que se sabe de cada país desde fuera (y lo que usan los otros países)
function refreshNations(G) {
  worldStates(G).forEach(S => {
    const d = S === G ? G.self : S.nation, e = S.eco || {};
    d.name = S.country.name;
    d.corpTax = totTax(S, 'sociedades'); d.tariff = S.pol.aranceles || 0;
    d.growth = e.growth || 0; d.unemployment = e.unemployment || 0; d.inflation = e.inflation || 0; d.debtRatio = e.debtRatio || 0;
    d.gdp = e.gdp || 0; d.gdpPc = e.gdpPerCapita || 0; d.population = e.population || 0;
    if (S !== G) {
      const gp = foreignGovParty(S.nation);
      if (gp) { d.leader = gp.leader; d.govEco = gp.ideo.eco; d.govSoc = gp.ideo.soc; }
    }
  });
}
// Cantón de un país extranjero (como los nuestros), a partir del mapa
function buildForeignCanton(G, f, fc, capitalIdx) {
  const hx = G.map.hexes.filter(h => h.c === f.mapIndex && h.k === fc.idx && h.t !== 'mar');
  const count = fn => hx.filter(fn).length;
  const coast = count(h => h.coast);
  const pisos = sum(hx, h => sum(h.bb || [], b => b[0] * b[1])), casas = sum(hx, h => h.nh || 0);
  const name = fc.nominal ? f.capitalName : fc.name;
  return {
    id: 'c' + fc.idx, idx: fc.idx, name, capitalCity: name, nominal: !!fc.nominal, hexCount: hx.length, island: !!fc.island,
    res: { fertil: sum(hx, h => h.t !== 'hierba' ? 0 : hasF(h, 'bosque') ? 0.2 : (h.rel === 'colinas' ? 0.4 : 1) + (hasF(h, 'cultivo') ? 0.3 : 0) + (hasF(h, 'rio') ? 0.2 : 0)),
      mineral: count(h => hasF(h, 'mina')), bosque: count(h => hasF(h, 'bosque')), costa: coast, turismo: coast * 0.5, renovable: 0 },
    urban: clamp(pisos / Math.max(1, pisos + casas), 0.2, 0.97), industrial: clamp(f.dev + RNG.normal(0, 0.2), 0, 1), capital: fc.idx === capitalIdx,
    pol: { irpf: null, irpfPlano: null, nominas: null, sociedades: null, sucesiones: null, iva: null, ibi: null, vacias: null, lengua: false, rotulacion: 0, tv: false, fiestas: 0, exterior: false,
      gasto: { campo: RNG.pick([0.2, 0.4, 0.6]) } },
    gov: { president: null, coalition: [] }, parliament: { seats: 0, composition: {} },
    shock: {}, disaster: 0, budget: { revenue: 0, spending: 0, balance: 0, debt: 0 }, stats: {}, cityHex: fc.cityHex.slice(),
  };
}
// Un país extranjero completo: cantones, leyes, habitantes, Parlamento y economía de partida
function makeNationState(G, f) {
  const S = {
    version: 2, nid: f.id, ci: f.mapIndex, cul: f.cul, turn: G.turn || 0, quarter: G.quarter || 0, year: G.year,
    country: { name: f.name, devel: f.dev }, ideoShift: AXIS_IDS.map(() => RNG.normal(0, 0.3)),
    proposals: [], lawLog: [], qEvents: [],
    gov: { president: null, ministers: {}, since: 0, coalition: [] },
    elections: { lastNational: null, nextNational: 0, lastCantonal: null, nextCantonal: 0 },
  };
  f.st = S;
  linkStates(G);
  const capC = (G.map.hexes.find(h => h.q === f.cityHex[0] && h.r === f.cityHex[1]) || {}).k || 0;
  S.cantons = f.cantons.map(fc => buildForeignCanton(G, f, fc, capC));
  const federal = S.cantons.some(c => !c.nominal);
  S.pol = initialPolicies(S);
  if (!federal) {
    // un Estado sin cantones: todas las competencias son del Estado
    AREAS.forEach(a => { S.pol.comp[a.id] = 'nacional'; S.pol.gasto[a.id] = Math.round(a.base * RNG.range(0.85, 1.15) * 100) / 100; });
    S.pol.gasto.transferencias = 0.4;
  }
  S.cantons.forEach(c => {
    c.pol.ibi = RNG.pick([0.003, 0.004, 0.005, 0.006]);
    if (!c.nominal && RNG.chance(0.35)) c.pol.irpf = RNG.pick([0.01, 0.02, 0.03]);
    AREAS.forEach(a => { const share = 1 - NAT_SHARE[S.pol.comp[a.id]]; c.pol.gasto[a.id] = Math.round(a.base * share * RNG.range(0.85, 1.15) * 100) / 100; });
  });
  f.parties.forEach(p => { p.pop = p.pop || 0; p.stats = p.stats || { maxSeats: 0 }; });
  populateHomes(S);
  const real = S.cantons.filter(c => !c.nominal);
  S.parliament = { seats: 100 + 10 * real.length, composition: {}, lastElection: null };
  allocateCantonSeats(S);
  const maxPop = Math.max(...S.cantons.map(c => c.pop));
  S.cantons.forEach(c => { c.parliament.seats = c.nominal ? 0 : clamp(15 + Math.round(26 * c.pop / maxPop), 15, 41) | 1; });
  initEconomyBase(S);
  return S;
}
// Todos los países extranjeros (después de generar el nuestro)
function buildForeignStates(G) {
  G.foreign.forEach(f => makeNationState(G, f));
  linkStates(G);
  // la red ferroviaria de partida de cada país (antes de repartir las empresas: los trenes necesitan vías)
  initialRails(G);
  // tratados de libre comercio entre países (siempre de los dos lados)
  const W = worldStates(G);
  for (let a = 0; a < W.length; a++) for (let b = a + 1; b < W.length; b++) {
    const A = W[a], B = W[b];
    const v = a === 0 ? !!G.pol.tratados[B.nid] : RNG.chance(0.4);
    A.pol.tratados[B.nid] = v; B.pol.tratados[A.nid] = v;
  }
  worldGoodsFirms(W);
  initWorldEconomy(W);
  // primeras elecciones de cada país extranjero (con el humor de partida de su gente)
  W.forEach(S => {
    if (S === G) return;
    foreignElections(G, S, { national: true, cantonal: S.cantons.some(c => !c.nominal) }, true);
    // cada país vota en su propio calendario
    S.elections.nextNational = RNG.int(2, S.pol.legislatura * 4);
    S.elections.nextCantonal = S.elections.nextNational + RNG.pick([0, 0, 2, 4]);
  });
  refreshNations(G);
}

// ============================================================
//  Elecciones y gobiernos de los otros países
// ============================================================
// Gobierno: el partido más votado (que no sea regionalista) y, si no tiene mayoría, los más afines hasta tenerla
// La coalición que gobierna: no tiene por qué incluir al partido más votado. Entre todas las combinaciones que suman
// mayoría absoluta se elige la más coherente: la que reúne partidos más parecidos entre sí (distancia ideológica media,
// ponderada por escaños), con pocos socios y sin partidos que sobren.
function bestCoalition(S, comp, total) {
  const ps = S.players.filter(p => (comp[p.id] || 0) > 0).sort((a, b) => (comp[b.id] || 0) - (comp[a.id] || 0)).slice(0, 9);
  if (!ps.length) return null;
  const maj = absMajority(total), n = ps.length, lead = ps[0];
  let best = null;
  for (let m = 1; m < (1 << n); m++) {
    const set = ps.filter((p, i) => m & (1 << i));
    const seats = sum(set, p => comp[p.id]);
    if (seats < maj) continue;
    let num = 0, den = 0;
    for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) { const w = comp[set[i].id] * comp[set[j].id]; num += w * partyDistance(set[i], set[j]); den += w; }
    const spread = den ? num / den : 0;
    const minimal = set.every(p => seats - comp[p.id] < maj);
    const score = spread + 0.12 * (set.length - 1) + (minimal ? 0 : 0.35) - (set.includes(lead) ? 0.08 : 0);
    if (!best || score < best.score) best = { set, score, seats };
  }
  return best;
}
function formForeignGovernment(G, S, initial) {
  const comp = S.parliament.composition, total = S.parliament.seats;
  const best = bestCoalition(S, comp, total);
  if (!best) return;
  const set = best.set.slice().sort((a, b) => (comp[b.id] || 0) - (comp[a.id] || 0));
  const head = set.find(p => p.regional == null) || set[0];
  const coalition = set.filter(p => p !== head).map(p => p.id), seats = best.seats;
  const prev = S.gov.president;
  const ministers = {}; coalition.forEach((id, k) => { ministers[(MINISTRIES[k] || { id: 'm' + k }).id] = id; });
  S.gov = { president: head.id, ministers, coalition, majority: seats >= absMajority(total), since: prev === head.id && S.gov.since != null ? S.gov.since : S.turn || 0 };
  // empieza la legislatura: el voto económico se medirá desde la satisfacción de hoy
  S.citizens.forEach(cz => { cz.sr = Math.round((cz.sat ?? 0.5) * 1000) / 1000; });
  const f = S.nation;
  f.leader = head.leader;
  f.govEco = sum(set, p => p.ideo.eco * comp[p.id]) / Math.max(1, seats); f.govSoc = sum(set, p => p.ideo.soc * comp[p.id]) / Math.max(1, seats);
  if (!initial) {
    const shares = S.parliament.lastElection ? S.parliament.lastElection.shares : {};
    const share = shares[head.id] || 0;
    const title = f.regime.includes('Monarquía') ? 'primer ministro' : 'presidente';
    const winner = S.players.slice().sort((a, b) => (shares[b.id] || 0) - (shares[a.id] || 0))[0];
    const partners = coalition.map(id => S.players.find(p => p.id === id)).filter(Boolean);
    let text;
    if (winner && !set.includes(winner)) text = `${head.name} (${head.short}) forma gobierno en ${f.name} junto a ${partners.length ? partners.map(p => p.short).join(' y ') : 'su mayoría'} y deja en la oposición a ${winner.name}, el partido más votado (${fmt.pct(shares[winner.id] || 0, 0)}). ${head.leader} será ${title}.`;
    else if (prev !== head.id) text = `Cambio de gobierno en ${f.name}: ${head.name} (${head.short}) gana con el ${fmt.pct(share, 0)} y ${head.leader} será ${title}${coalition.length ? ' en coalición' : ''}.`;
    else text = `${head.name} revalida el gobierno de ${f.name} con el ${fmt.pct(share, 0)} de los votos${coalition.length ? ', otra vez en coalición' : ''}.`;
    pushWorldNews(G, { type: 'neutral', importance: prev !== head.id || (winner && !set.includes(winner)) ? 5 : 3, text });
  }
}
// Gobiernos cantonales: también la coalición más coherente que suma mayoría
function formForeignCantonGovs(S) {
  S.cantons.forEach(c => {
    if (c.nominal) return;
    const comp = c.parliament.composition;
    const best = bestCoalition(S, comp, c.parliament.seats);
    if (!best) return;
    const set = best.set.slice().sort((a, b) => (comp[b.id] || 0) - (comp[a.id] || 0));
    const head = set[0], coalition = set.map(p => p.id);
    const since = c.gov && c.gov.president === head.id && c.gov.since != null ? c.gov.since : S.turn || 0;
    c.gov = { president: head.id, coalition, majority: true, since };
    S.citizens.forEach(cz => { if (cz.c === c.idx) cz.src = Math.round((cz.sat ?? 0.5) * 1000) / 1000; });
  });
}
function foreignElections(G, S, which, initial) {
  if (which.national) {
    const r = runNationalElection(S);
    S.players.forEach(p => { p.share = r.shares[p.id] || 0; p.seats = r.seats[p.id] || 0; });
    formForeignGovernment(G, S, initial);
  }
  if (which.cantonal && S.cantons.some(c => !c.nominal)) {
    const real = S.cantons;
    runCantonalElections(S);
    real.forEach(c => { if (c.nominal) { c.parliament.composition = {}; } });
    formForeignCantonGovs(S);
  }
}

// ============================================================
//  Leyes: lo que cada partido piensa de cada ley y cómo legislan
// ============================================================
// Lo cerca que está un valor de una ley de la ideología del partido (más alto = le gusta más)
function partyFieldScore(party, field, v) {
  const pos = field.pos ? field.pos(v == null ? 0 : v) || {} : {};
  let s = 0;
  for (const a in pos) if (party.ideo[a] != null && isFinite(pos[a])) s -= Math.abs(clamp(pos[a], -2.5, 2.5) - party.ideo[a]);
  return s;
}
function partyPropScore(S, party, prop) {
  let s = 0;
  for (const fid in prop.changes) { const f = fieldById(S, fid); if (!f) continue; s += partyFieldScore(party, f, prop.changes[fid]) - partyFieldScore(party, f, prop.prev[fid]); }
  return s;
}
// Coste de un cambio para las cuentas públicas (positivo: más gasto o menos ingresos)
function fiscalCost(field, from, to) {
  if (field.path && field.path.startsWith('gasto.')) return (to || 0) - (from || 0);
  if (field.tax || TAXES.some(t => t.id === field.path)) return ((from || 0) - (to || 0)) * 30;
  if (field.id === 'pensiones') return ((to || 0) - (from || 0)) * 20;
  if (field.id === 'desempleo') return ((to || 0) - (from || 0)) * 0.5;
  if (field.id === 'rentaBasica') return to ? 4 : from ? -4 : 0;
  return 0;
}
// Lo que quiere un partido de las cuentas públicas según su responsabilidad fiscal: −1 (hay que ahorrar), 0 o +1 (se puede gastar).
// Los muy responsables aspiran a superávit y los poco responsables toleran (y buscan) el déficit.
const partyFis = p => (p && p.fis) || 0;
function fiscalWish(S, party) {
  const e = S.eco, fis = partyFis(party);
  const aim = 0.008 - 0.02 * fis;                       // déficit que le parece bien (en % del PIB / 100)
  const d = e.deficitRatio || 0;
  if (d > aim + 0.01 || (e.debtRatio > 1.1 && fis > -0.5)) return -1;
  if (d < aim - 0.01 && fis < 0.6) return 1;
  return 0;
}
// Cuánto cuesta una propuesta a las cuentas públicas (en puntos de gasto)
const fiscalDelta = (S, prop) => sum(Object.keys(prop.changes), fid => { const f = fieldById(S, fid); return f ? fiscalCost(f, prop.prev[fid], prop.changes[fid]) : 0; });
// Los valores posibles de un campo (con «no existe» si el impuesto es opcional)
function fieldChoices(field, cur) {
  let opts = (field.options || []).slice();
  if (field.optional) opts = [null].concat(opts);
  if (cur !== undefined && !opts.some(o => sameVal(o, cur))) opts.push(cur);
  return opts;
}
// El partido arma una propuesta de una ley marco: en cada campo se acerca a lo que quiere
// (de golpe si es muy extremista; poco a poco si es moderado). fiscal: −1 solo ahorrar, +1 se puede gastar
function partyProposal(S, party, pack, scope, canton, fiscal) {
  const ext = avg(AXIS_IDS, a => Math.abs(party.ideo[a]));
  const cands = [];
  for (const f of packFields(S, pack)) {
    if (!f || f.treaty || f.organic && scope === 'nacional' && f.id === 'sistemaElectoral') continue;
    if (scope === 'cantonal' && f.requiresComp && !cantApplies(S.pol, f.requiresComp)) continue;
    const cur = fieldValue(S, f, scope, canton);
    const opts = fieldChoices(f, cur);
    const sc = opts.map(v => ({ v, s: partyFieldScore(party, f, v) }));
    const best = sc.reduce((a, b) => b.s > a.s ? b : a);
    if (sameVal(best.v, cur)) continue;
    // moderados: un paso; extremistas: dos (en impuestos y gasto, siempre de uno en uno: un salto brusco
    // hundiría las cuentas de empresas y hogares)
    const numeric = opts.every(o => o == null || typeof o === 'number');
    let target = best.v;
    if (numeric) {
      const steps = fiscalCost(f, cur, best.v) !== 0 ? 1 : (ext > 1.05 || RNG.chance(ext * 0.35)) ? 2 : 1;
      const sorted = opts.filter(o => o != null).sort((a, b) => a - b);
      let curN = cur == null ? 0 : cur;
      const dir = Math.sign((best.v ?? 0) - curN);
      for (let k = 0; k < steps; k++) {
        const next = dir > 0 ? sorted.find(o => o > curN + 1e-9) : sorted.slice().reverse().find(o => o < curN - 1e-9);
        if (next == null) break;
        target = next; curN = next;
        if (sameVal(next, best.v)) break;
      }
    }
    const gain = partyFieldScore(party, f, target) - partyFieldScore(party, f, cur);
    if (gain < 0.08) continue;
    const cost = fiscalCost(f, cur, target);
    if (fiscal < 0 && cost > 0) continue;
    if (fiscal > 0 && cost < 0) continue;
    cands.push({ f, v: target, gain: gain * (1 + ext * 0.5) + (fiscal < 0 ? -cost * 0.3 : 0) - partyFis(party) * 0.08 * clamp(cost, -4, 4) });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.gain - a.gain);
  const n = Math.min(cands.length, 1 + (ext > 1.1 ? 2 : RNG.chance(0.4) ? 1 : 0));
  const changes = {}; cands.slice(0, n).forEach(c => { changes[c.f.id] = c.v; });
  return makeProposal(S, party, pack.id, changes, { scope, canton });
}
// Cuentas en rojo: la izquierda sube impuestos y la derecha recorta gasto (en lo que menos le duele)
function fiscalFixProposal(S, party, scope, canton) {
  const left = party.ideo.eco < 0;
  const pack = packById(scope === 'cantonal' ? (left ? 'ct_fiscal' : 'ct_presupuesto') : (left ? 'fiscal' : 'presupuestos'));
  const cands = [];
  for (const f of packFields(S, pack)) {
    if (scope === 'cantonal' && f.requiresComp && !cantApplies(S.pol, f.requiresComp)) continue;
    const cur = fieldValue(S, f, scope, canton);
    if (left) {
      if (cur == null && !['iva', 'irpf', 'ct_irpf', 'ct_iva'].includes(f.id)) continue;
      const v = Math.round(Math.min(f.range ? f.range[1] : 1, (cur || 0) + Math.max(0.01, (cur || 0) * 0.12)) * 1000) / 1000;
      cands.push({ f, v, pain: partyFieldScore(party, f, cur) - partyFieldScore(party, f, v) });
    } else {
      if (!cur || cur <= 0.05) continue;
      const v = Math.round(cur * 0.88 * 100) / 100;
      cands.push({ f, v, pain: partyFieldScore(party, f, cur) - partyFieldScore(party, f, v) });
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.pain - b.pain);
  const changes = {}; cands.slice(0, 2).forEach(c => { changes[c.f.id] = c.v; });
  return makeProposal(S, party, pack.id, changes, { scope, canton });
}
// Votación en un parlamento extranjero: cada partido vota según su ideología (y los del Gobierno, con el Gobierno)
function foreignVote(S, prop) {
  const govIds = prop.scope === 'cantonal' ? (S.cantons[prop.canton].gov.coalition || []) : [S.gov.president].concat(S.gov.coalition || []);
  const proposerInGov = govIds.includes(prop.proposer), fc = fiscalDelta(S, prop);
  S.players.forEach(p => {
    const sc = partyPropScore(S, p, prop) - partyFis(p) * 0.1 * clamp(fc, -5, 5);
    let v = sc > 0.05 ? 'si' : sc < -0.05 ? 'no' : 'abs';
    if (p.id === prop.proposer) v = 'si';
    else if (proposerInGov && govIds.includes(p.id) && sc > -0.6) v = 'si';
    prop.votes[p.id] = v;
  });
  return tallyProposal(S, prop);
}
// Cambios que interesan a la prensa internacional
const WORLD_NEWS_FIELDS = ['inmigracion', 'aranceles', 'sociedades', 'irpf', 'iva', 'salarioMin', 'rentaBasica', 'empresasPublicas', 'energia', 'servicioMilitar', 'matrimonio', 'aborto', 'eutanasia', 'cannabis', 'pensiones', 'jubilacion', 'laboral', 'naturalizacion', 'penal', 'armasCiviles'];
function pushWorldNews(G, n) { G.eco.worldNews = (G.eco.worldNews || []).concat([Object.assign({ topic: 'extranjero' }, n)]); }
// Un trimestre de la política de un país extranjero
function foreignLegislate(G, S) {
  const f = S.nation, e = S.eco;
  const gp = S.players.find(p => p.id === S.gov.president);
  const props = [];
  // el Gobierno decide si toca ahorrar o se puede gastar según su responsabilidad fiscal (más o menos ganas de cuadrar las cuentas)
  const fiscalNat = gp ? fiscalWish(S, gp) : 0;
  if (gp) {
    // el Gobierno: casi siempre algo; si hay que ahorrar, primero eso
    if (fiscalNat < 0 && RNG.chance(0.25 + 0.25 * (partyFis(gp) + 1))) { const p = fiscalFixProposal(S, gp, 'nacional'); if (p) props.push(p); }
    if (RNG.chance(0.65)) {
      const packs = LAW_PACKS.filter(pk => pk.id !== 'electoral' && (pk.id !== 'territorial' || S.cantons.some(c => !c.nominal)) && pk.id !== 'finTerritorial' && pk.id !== 'identidad');
      const pk = RNG.weighted(packs, pk => ({ fiscal: 3, presupuestos: 3, laboral: 2, comercio: 1.2, extranjeria: 1.5, derechos: 1, energia: 1, vivienda: 1, seguridad: 1, sectorPublico: 1, gobierno: 0.6, educacion: 0.6, banca: 0.5 })[pk.id] || 0.5);
      const p = partyProposal(S, gp, pk, 'nacional', null, pk.id === 'presupuestos' || pk.id === 'fiscal' || pk.id === 'laboral' ? fiscalNat : 0);
      if (p) props.push(p);
    }
  }
  // la oposición también presenta alguna (casi nunca sale)
  const opp = S.players.filter(p => p.id !== S.gov.president && !(S.gov.coalition || []).includes(p.id) && (S.parliament.composition[p.id] || 0) > 0);
  if (opp.length && RNG.chance(0.25)) {
    const p0 = RNG.pick(opp), pk = RNG.pick(LAW_PACKS.filter(pk => ['laboral', 'derechos', 'extranjeria', 'energia', 'vivienda', 'seguridad'].includes(pk.id)));
    const p = partyProposal(S, p0, pk, 'nacional', null, 0); if (p) props.push(p);
  }
  // gobiernos cantonales
  S.cantons.forEach(c => {
    if (c.nominal || !c.gov.president || !RNG.chance(0.3)) return;
    const cp = S.players.find(p => p.id === c.gov.president); if (!cp) return;
    const b = c.budget || {}, fiscalC = (b.balance || 0) < (-0.02 + 0.015 * partyFis(cp)) * (c.stats.gdp || 1) ? -1 : 0;
    const p = fiscalC < 0 ? fiscalFixProposal(S, cp, 'cantonal', c.idx) : partyProposal(S, cp, RNG.pick(CANTON_PACKS.filter(pk => pk.id !== 'ct_cultura' || RNG.chance(0.3))), 'cantonal', c.idx, 0);
    if (p) props.push(p);
  });
  const news = [];
  for (const prop of props) {
    const t = foreignVote(S, prop);
    prop.result = t;
    S.lawLog.push({ turn: S.turn, id: prop.id, pack: prop.pack, changes: prop.changes, prev: prop.prev, passed: t.passed, proposer: prop.proposer, scope: prop.scope, canton: prop.canton, yes: t.yes, no: t.no });
    if (S.lawLog.length > 40) S.lawLog.shift();
    if (!t.passed) continue;
    applyLaw(S, prop);
    if (prop.scope !== 'nacional') continue;
    for (const fid in prop.changes) {
      if (!WORLD_NEWS_FIELDS.includes(fid) && !fid.startsWith('c_')) continue;
      const fld = fieldById(S, fid);
      news.push({ type: 'neutral', importance: 3, text: `${f.name} aprueba un cambio en ${packById(prop.pack).noun || packById(prop.pack).name}: ${fld.name.toLowerCase()}, de «${fld.label(prop.prev[fid])}» a «${fld.label(prop.changes[fid])}».` });
    }
  }
  news.slice(0, 1).forEach(n => pushWorldNews(G, n));
}

// ============================================================
//  Tratados de libre comercio (los dos países tienen que estar de acuerdo)
// ============================================================
// Ganas del Gobierno de un país de firmar con otro (0-1): la derecha liberal y los abiertos al exterior, más
function treatyStance(S, otherNid) {
  const gp = S.players.find(p => p.id === S.gov.president);
  if (!gp) return 0.3;
  let v = 0.5 + 0.22 * gp.ideo.eco - 0.3 * gp.ideo.ext;
  if (otherNid === 'f0' && S.nation) v += ((S.nation.friendliness ?? 0.5) - 0.5) * 0.6;
  return clamp(v, 0.04, 0.95);
}
const stateByNid = (G, nid) => nid === 'f0' ? G : ((G.foreign.find(f => f.id === nid) || {}).st || null);
function setTreaty(A, B, v) { A.pol.tratados[B.nid || 'f0'] = v; B.pol.tratados[A.nid || 'f0'] = v; }
// Nuestras Cortes aprueban (o tumban) cambios en un tratado: el otro país tiene que estar de acuerdo
function onOurTreatyLaw(G, prop, passed) {
  for (const fid in prop.changes) {
    if (!fid.startsWith('tratado_')) continue;
    const nid = fid.slice(8), S = stateByNid(G, nid); if (!S) continue;
    const f = S.nation, v = prop.changes[fid];
    if (!passed) {
      if (prop.foreign === nid) logEvent(G, { kind: 'tratadoExterior', importance: 5, foreign: nid, text: `Las Cortes rechazan el tratado de libre comercio que proponía ${f.name}.`, tone: 'neutral' });
      continue;
    }
    if (v) {
      if (prop.foreign === nid || RNG.chance(treatyStance(S, 'f0'))) {
        setTreaty(G, S, v);
        logEvent(G, { kind: 'tratadoExterior', importance: 6, foreign: nid, text: `Entra en vigor el tratado de libre comercio con ${f.name}: ${treatyLabel(v).toLowerCase()}.`, tone: 'good' });
      } else {
        G.pol.tratados[nid] = prop.prev[fid] ?? false;
        logEvent(G, { kind: 'tratadoExterior', importance: 6, foreign: nid, text: `El Parlamento de ${f.name} rechaza el tratado de libre comercio que aprobaron nuestras Cortes: no entra en vigor.`, tone: 'bad' });
      }
    } else {
      setTreaty(G, S, false);
      logEvent(G, { kind: 'tratadoExterior', importance: 6, foreign: nid, text: `Fin del tratado de libre comercio con ${f.name}.`, tone: 'neutral' });
    }
  }
}
// Tratados que deciden los gobiernos extranjeros: proponer, aceptar o romper
function foreignTreaties(G, S) {
  const f = S.nation, gp = S.players.find(p => p.id === S.gov.president); if (!gp) return;
  for (const other of S.foreign) {
    const T = stateByNid(G, other.id); if (!T) continue;
    const has = !!S.pol.tratados[other.id] && !!T.pol.tratados[S.nid];
    if (has) {
      // un gobierno muy soberanista puede romperlo
      if (gp.ideo.ext > 1.2 && RNG.chance(0.03)) {
        setTreaty(S, T, false);
        pushWorldNews(G, { type: other.id === 'f0' ? 'bad' : 'neutral', importance: other.id === 'f0' ? 6 : 3, text: other.id === 'f0' ? `${f.name} rompe el tratado comercial con nosotros: ${gp.leader} lo considera una cesión de soberanía.` : `${f.name} rompe su tratado de libre comercio con ${T.country.name}.` });
      }
      continue;
    }
    if (!RNG.chance(0.03 * treatyStance(S, other.id))) continue;
    if (other.id === 'f0') {
      // a nosotros nos lo propone: irá a votación en nuestras Cortes
      G.treatyOffers = (G.treatyOffers || []).filter(o => o.from !== S.nid).concat([{ from: S.nid, turn: G.turn }]);
      pushWorldNews(G, { type: 'good', importance: 5, text: `${f.name} nos propone un tratado de libre comercio. Las Cortes lo votarán en el próximo pleno.` });
    } else if (RNG.chance(treatyStance(T, S.nid))) {
      setTreaty(S, T, true);
      pushWorldNews(G, { type: 'neutral', importance: 3, text: `${f.name} y ${T.country.name} firman un tratado de libre comercio.` });
    }
  }
}

// ============================================================
//  El trimestre político de todos los países extranjeros
// ============================================================
function foreignPoliticsQuarter(G) {
  const ours = G.players.find(p => p.id === G.gov.president);
  G.foreign.forEach(f => {
    const S = f.st; if (!S) return;
    // los partidos se mueven un poco y vuelven a su sitio
    f.parties.forEach(p => AXIS_IDS.forEach(a => { p.ideo[a] = clamp(p.ideo[a] + (p.base[a] - p.ideo[a]) * 0.3 + RNG.normal(0, 0.06), -2, 2); }));
    foreignLegislate(G, S);
    foreignTreaties(G, S);
    const gp = foreignGovParty(f);
    // simpatía hacia nuestro Gobierno según la afinidad ideológica
    if (gp && ours) { const d = (Math.abs(gp.ideo.ext - ours.ideo.ext) + Math.abs(gp.ideo.eco - ours.ideo.eco)) / 2; f.friendliness = clamp((f.friendliness ?? 0.5) + ((0.85 - d * 0.25) - (f.friendliness ?? 0.5)) * 0.1, 0.15, 0.95); }
    // elecciones (y alguna crisis de gobierno que las adelanta)
    const early = S.gov.coalition && S.gov.coalition.length && !S.gov.majority && RNG.chance(0.02);
    const nat = S.turn >= S.elections.nextNational || early, can = S.cantons.some(c => !c.nominal) && S.turn >= S.elections.nextCantonal;
    if (early) pushWorldNews(G, { type: 'neutral', importance: 4, text: `Se rompe la coalición de gobierno en ${f.name}: habrá elecciones anticipadas.` });
    if (nat || can) foreignElections(G, S, { national: nat, cantonal: can }, false);
    if (can && !nat) pushWorldNews(G, { type: 'neutral', importance: 2, text: `Elecciones cantonales en ${f.name}: ${S.cantons.filter(c => !c.nominal).map(c => `${c.name}, ${(S.players.find(p => p.id === c.gov.president) || {}).short || '—'}`).join('; ')}.` });
    // crisis económicas de los vecinos
    const e = S.eco;
    if (e.growth < -0.02 && !(f.crisis > 0)) { f.crisis = 4; pushWorldNews(G, { type: 'bad', importance: 4, text: `${f.name} entra en recesión: su economía cae un ${fmt.pct(-e.growth, 1)} anual.` }); }
    if (e.unemployment > 0.15 && !(f.crisisU > 0)) { f.crisisU = 6; pushWorldNews(G, { type: 'bad', importance: 3, text: `El paro se dispara en ${f.name}: ya afecta al ${fmt.pct(e.unemployment, 0)} de su población activa.` }); }
    if (f.crisis > 0) f.crisis--; if (f.crisisU > 0) f.crisisU--;
  });
  foreignInfraQuarter(G);
  refreshNations(G);
  // a nuestra prensa llegan las noticias internacionales más importantes del trimestre
  const wn = (G.eco.worldNews || []).sort((a, b) => b.importance - a.importance).slice(0, 4);
  G.eco.news = G.eco.news.concat(wn);
  G.eco.worldNews = [];
}

// ============================================================
//  MIGRACIÓN ENTRE PAÍSES
//  Cada trimestre algunas familias (o jóvenes por su cuenta) se plantean irse: más si están en paro o no
//  llegan a fin de mes. Eligen el país que más les atrae: mejores sueldos, menos paro, una cultura parecida
//  a la suya, cercanía y una política migratoria abierta. Solo pueden llegar los que el país de destino
//  admite (según su ley de extranjería) y si encuentran vivienda (comprando o con familia de su cultura).
// ============================================================
const MIG_QUOTA = [0.012, 0.008, 0.005, 0.0025, 0.0005];   // llegadas al año por habitante según la ley (de abierta a cerrada)
const MIG_OPEN = [1.6, 1.2, 0.8, 0.4, 0.08];
function worldMigration(W) {
  const G = W[0], mk = marketTopo(G);
  const info = W.map(S => ({
    inc: (S.eco.netIncomeTot || 0) / Math.max(1, S.citizens.length), u: S.eco.unemployment ?? 0.07,
    quota: S.citizens.length * MIG_QUOTA[S.pol.inmigracion ?? 2] * QF * (S.eco.refugees ? 2 : 1), open: MIG_OPEN[S.pol.inmigracion ?? 2], used: 0,
    // ayudas: el subsidio de paro y la renta básica también atraen (sobre todo a quien no tiene trabajo)
    ben: [0.15, 0.25, 0.35, 0.45, 0.6][S.pol.desempleo ?? 2] + (S.pol.rentaBasica ? 0.25 : 0),
  }));
  // cercanía entre países (por la red de transporte)
  const nodesOf = S => S.cantons.map((c, i) => marketNode(S, i)).filter(m => m != null);
  const prox = W.map(A => W.map(B => {
    if (A === B) return 0;
    let d = Infinity; for (const a of nodesOf(A)) for (const b of nodesOf(B)) d = Math.min(d, mk.dist[a][b]);
    return isFinite(d) ? 1 / (1 + d / 3) : 0.1;
  }));
  const flows = W.map(() => W.map(() => 0));
  W.forEach((S, a) => {
    const members = new Map(); for (const cz of S.citizens) { if (!members.has(cz.hh)) members.set(cz.hh, []); members.get(cz.hh).push(cz); }
    const units = [], own = ownerIds(S);
    for (const home of S.homes) {
      const ms = members.get(home.id) || []; if (!ms.length || ms.some(z => z.mvT === S.turn)) continue;
      const lf = ms.filter(inLaborForce); if (!lf.length) continue;
      const unemp = lf.filter(z => !z.emp).length / lf.length;
      const p = (0.0012 + 0.012 * unemp + 0.03 * Math.max(0, 0.95 - (home.F ?? 1)) + 0.02 * Math.max(0, info[a].u - 0.1)) * (S.eco.refugeeOut > 0 ? 8 : 1);
      if (ms.some(z => z.prof === 'empresario' || own.has(z.id))) continue;   // los empresarios y los socios no dejan su negocio
      if (RNG.chance(p)) { units.push({ home, ms, kids: home.kids }); continue; }
      // jóvenes que se van solos
      for (const z of ms) if (z.role === 'hijo' && z.age >= 18 && z.age <= 34 && inLaborForce(z) && RNG.chance(0.002 + (z.emp ? 0 : 0.01) + 0.01 * Math.max(0, info[a].u - 0.12) + (z.lvl >= 4 ? 0.002 : 0))) units.push({ home: null, ms: [z], kids: [] });
    }
    const gone = new Set();
    for (const u of units) {
      const cu = u.ms[0].cu || S.cul;
      const opts = W.map((T, b) => {
        if (b === a) return 0;
        const I = info[b];
        let A0 = Math.pow(Math.max(0.2, I.inc) / Math.max(0.2, info[a].inc), 1.5) * Math.pow((1 - I.u) / Math.max(0.05, 1 - info[a].u), 2)
          * Math.pow(cultureCompat(cu, T.cul), 1.5) * I.open * (0.4 + prox[a][b]);
        if (cu === T.cul && u.ms[0].origin === 'extranjero' && u.ms[0].from === T.nid) A0 *= 3;   // volver a casa
        if (u.ms.some(z => z.lvl >= 4)) A0 *= 1.1;
        // quien está en paro (o no tiene cualificación) se fija también en las ayudas del otro país
        const idle = u.ms.filter(z => inLaborForce(z) && (!z.emp || !z.q)).length / Math.max(1, u.ms.filter(inLaborForce).length);
        A0 *= 1 + idle * 0.8 * (I.ben - info[a].ben);
        return A0;
      });
      const good = opts.map((v, b) => ({ v, b })).filter(x => x.v > 1.15);
      if (!good.length) continue;
      const b = RNG.weighted(good, x => x.v - 1).b;
      if (info[b].used + u.ms.length > info[b].quota + 0.5) continue;
      if (moveUnit(S, W[b], u)) { info[b].used += u.ms.length; flows[a][b] += u.ms.length + u.kids.length; u.ms.forEach(z => gone.add(z)); }
    }
    if (gone.size) S.citizens = S.citizens.filter(z => !gone.has(z));
  });
  // estadísticas y noticias
  W.forEach(S => { if (S.eco.refugeeOut > 0) S.eco.refugeeOut--; });
  W.forEach((S, i) => {
    const d = S.eco.lastDemography = S.eco.lastDemography || {};
    d.emigrants = (d.emigrants || 0) + sum(flows[i]); d.immigrants = (d.immigrants || 0) + sum(range(W.length), k => flows[k][i]);
    S.eco.migFlows = W.map((T, k) => ({ id: T.nid || 'f0', out: flows[i][k], in: flows[k][i] })).filter(x => x.out || x.in);
  });
  const outMax = W.map((T, k) => ({ T, n: flows[0][k] })).sort((x, y) => y.n - x.n)[0];
  if (outMax && outMax.n >= 6) G.eco.news.push({ type: 'bad', topic: 'emigracion', importance: 3, text: `${outMax.n} personas se van a vivir a ${outMax.T.country.name} en busca de oportunidades.` });
  const inMax = W.map((T, k) => ({ T, n: flows[k][0] })).sort((x, y) => y.n - x.n)[0];
  if (inMax && inMax.n >= 8) G.eco.news.push({ type: 'neutral', topic: 'inmigracion', importance: 3, text: `Llegan ${inMax.n} inmigrantes de ${inMax.T.country.name} este trimestre.` });
}
// Mueve una familia (o una persona) de un país a otro, si encuentra dónde vivir. Devuelve si se ha ido.
function moveUnit(S, T, u) {
  const books = bankBooks(T);
  const c = RNG.weighted(T.cantons.filter(x => !x.merged && x.pop > 0), cc => (cc.pop || 1) * (0.6 + (cc.urban || 0.5)));
  if (!c) return false;
  const adults = u.ms, workers = adults.filter(z => inLaborForce(z)).length || 1;
  const sav = sum(adults, z => Math.max(0, z.sav || 0));
  const free = vacantSlots(T);
  const pref = hexAtG(T, c.cityHex[0], c.cityHex[1]);
  const r = shopFor(T, books, null, c.idx, pref, { free, sav, income: 0.7 * (T.eco.avgNet || 20) * workers, age: adults[0].age });
  let host = null;
  if (r.res !== 'ok') {
    // sin vivienda propia: con una familia de su misma cultura que tenga sitio
    const cu = adults[0].cu;
    const size = new Map(); for (const z of T.citizens) size.set(z.hh, (size.get(z.hh) || 0) + 1);
    const cand = T.homes.filter(h => (size.get(h.id) || 0) + h.kids.length + adults.length + u.kids.length <= HOME_CAP[h.kind] && T.citizens.some(z => z.hh === h.id && z.cu === cu));
    host = cand.length ? RNG.pick(cand) : null;
    if (!host) return false;
  }
  // en el país de origen: dejan el trabajo y liquidan la hipoteca con sus ahorros (el banco pierde parte de lo que falte)
  const booksS = bankBooks(S);
  for (const z of adults) {
    if (z.emp) dropJob(z);
    if (z.hip) {
      const pay = Math.min(Math.max(0, z.sav || 0), z.hip.p); z.sav -= pay;
      const b = booksS.get(z.hip.b); if (b) { const loss = (z.hip.p - pay) * 0.3; b.f.cash -= loss; b.f.lossQ = (b.f.lossQ || 0) + loss; }
      delete z.hip;
    }
  }
  if (u.home) S.homes = S.homes.filter(h => h !== u.home);
  // en el de destino
  let home;
  if (host) home = host;
  else {
    T.nextHomeId = (T.nextHomeId || 0) + 1;
    home = { id: T.nextHomeId, c: r.sl.c, q: r.sl.q, r: r.sl.r, b: r.sl.b, u: r.sl.u, kind: r.sl.kind, sn: surnameOf(adults[0].nm), kids: [] };
    T.homes.push(home);
  }
  u.kids.forEach(k => { k.o = 'extranjero'; home.kids.push(k); });
  T.nextCzId = Math.max(T.nextCzId || 0, T.citizens.reduce((m, z) => Math.max(m, z.id), 0) + 1);
  adults.forEach((z, k) => {
    const back = z.cu === T.cul && z.origin === 'extranjero' && z.from === T.nid;
    z.id = T.nextCzId++; z.c = host ? host.c : r.sl.c; z.hh = home.id;
    z.role = host ? 'pariente' : (k === 0 ? 'titular' : z.role === 'hijo' && u.home ? 'hijo' : z.role === 'titular' ? 'pareja' : z.role);
    if (back) { z.origin = 'nativo'; z.from = null; z.yrs = 99; z.nat = true; }
    else { z.origin = 'extranjero'; z.from = S.nid || 'f0'; z.yrs = 0; z.nat = false; }
    z.emp = false; z.firm = null; z.sector = null; z.pb = 0; z.ls = null;
    if (inLaborForce(z)) { z.prof = 'parado'; z.lvl = Math.min(z.lvl, 4); }
    z.aff = {}; (T.players || []).forEach(p => { z.aff[p.id] = 0; });
    z.sr = z.src = z.sat; z.fv = 0; z.fs = 0; delete z.wantsHome; z.mvT = T.turn;
    z.urban = home.kind === 'piso';
    assignBank(T, z);
    computeIdeology(T, z, PROFESSIONS[z.prof], false);
    T.citizens.push(z);
  });
  if (!host) {
    // la vivienda la paga quien encabeza la familia (con los ahorros de todos)
    const head = adults[0]; adults.forEach(z => { if (z !== head) { head.sav = (head.sav || 0) + Math.max(0, z.sav || 0); z.sav = 0; } });
    closePurchase(T, books, r.fin, head, r.sl, r.px);
  }
  return true;
}

// ============================================================
//  Lo que ven los jugadores de cada país extranjero
// ============================================================
function foreignView(G, f) {
  const S = f.st;
  const out = { id: f.id, mapIndex: f.mapIndex, name: f.name, color: f.color, kind: f.kind, regime: f.regime, cul: f.cul, exports: f.exports, federal: f.federal,
    friendliness: f.friendliness, hexCount: f.hexCount, cityHex: f.cityHex, capitalName: f.capitalName,
    parties: f.parties.map(p => ({ id: p.id, name: p.name, short: p.short, color: p.color, color2: p.color2, logo: p.logo, leader: p.leader, ideo: p.ideo, regional: p.regional, share: p.share, seats: p.seats, family: p.family })) };
  if (!S) return out;
  const e = S.eco;
  Object.assign(out, {
    population: e.population, growth: e.growth, unemployment: e.unemployment, inflation: e.inflation, debtRatio: e.debtRatio, deficitRatio: e.deficitRatio,
    gdp: e.gdp, gdpPerCapita: e.gdpPerCapita, happiness: e.happiness, hdi: e.hdi, crime: e.crime, tradeBalance: e.tradeBalance, avgWage: e.avgWage,
    corpTax: totTax(S, 'sociedades'), tariff: S.pol.aranceles || 0, leader: f.leader, govEco: f.govEco, govSoc: f.govSoc,
    gov: { party: S.gov.president, coalition: S.gov.coalition || [], since: S.gov.since, majority: S.gov.majority },
    nextElection: S.elections.nextNational, lastElection: S.elections.lastNational,
    parliament: { seats: S.parliament.seats, composition: S.parliament.composition, shares: S.parliament.lastElection ? S.parliament.lastElection.shares : {} },
    pol: { tratados: S.pol.tratados, inmigracion: S.pol.inmigracion, legislatura: S.pol.legislatura, comp: S.pol.comp, irpf: S.pol.irpf, iva: S.pol.iva, salarioMin: S.pol.salarioMin, pensiones: S.pol.pensiones, energia: S.pol.energia, sistemaElectoral: S.pol.sistemaElectoral },
    laws: (S.lawLog || []).filter(l => l.passed && l.scope === 'nacional').slice(-6).reverse().map(l => ({ turn: l.turn, pack: l.pack, proposer: l.proposer,
      changes: Object.keys(l.changes).map(fid => { const fld = fieldById(S, fid); return fld ? `${fld.name}: ${fld.label(l.prev[fid])} → ${fld.label(l.changes[fid])}` : fid; }) })),
    cantons: S.cantons.map(c => ({ idx: c.idx, name: c.name, nominal: c.nominal, island: c.island, pop: c.pop, gdp: c.stats.gdp, unemployment: c.stats.unemployment, cityHex: c.cityHex, hexCount: c.hexCount,
      gov: c.gov.president, coalition: c.gov.coalition, seats: c.parliament.seats, composition: c.parliament.composition })),
    history: (e.history || []).slice(-48).map(x => ({ turn: x.turn, growth: x.growth, unemployment: x.unemployment, inflation: x.inflation, debtRatio: x.debtRatio, gdp: x.gdp, population: x.population, gdpPerCapita: x.gdpPerCapita, deficitRatio: x.deficitRatio })),
    // lo que más produce (por valor) y lo que vende y compra fuera
    top: GOOD_IDS.map(g => [g, ((e.trade || {})[g] ? e.trade[g].q : 0) * ((e.px || {})[g] || GOODS[g].price)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]),
    exportsVal: e.exports || 0, importsVal: e.imports || 0, needsMet: e.needsMet, wealthHist: e.wealthHist,
    firmsN: S.firms.filter(x => x.pub == null).length, energia: S.pol.energia,
    migFlows: e.migFlows || [],
  });
  return out;
}
