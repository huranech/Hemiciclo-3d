// ============================================================
//  POLÍTICA: partidos, voto ciudadano, elecciones, encuestas,
//  leyes marco, ideología dinámica, corrupción e ingresos.
//  Todo esto se ejecuta en el ordenador del anfitrión.
// ============================================================
'use strict';

// ---------- Partidos ----------
function createParty(i, playerName, token) {
  return {
    id: 'p' + i, idx: i, player: playerName, token, online: true, ready: false,
    name: '', short: '', color: null, color2: '#ffffff', logo: { shape: 'circle', icon: PARTY_ICONS_ALL[(i * 3) % PARTY_ICONS_ALL.length], style: 'lleno' },
    candidate: { name: playerName, face: randomFace() },
    regional: null, ideo: { eco: 0, soc: 0, ter: 0, ext: 0, aut: 0, amb: 0 }, ideoBase: null, rec: null, ideoHistory: [], debate: [],
    missions: [], discards: 2, configured: false,
    pc: 5, funds: 600, evidence: 0, pop: 0, imputado: 0, investigated: null,
    stats: { lawsPassed: 0, maxSeats: 0, wonPopularVote: false, scandalsExposed: 0, scandals: 0, investitures: 0, consecutive: 0 },
    polls: [], intel: [], log: [], turnActions: {},
  };
}
const partyById = (G, id) => G.players.find(p => p.id === id);
const seatsOf = (G, pid) => G.parliament.composition[pid] || 0;
const cantonSeatsOf = (G, pid) => sum(G.cantons, c => c.parliament.composition[pid] || 0);
const absMajority = n => Math.floor(n / 2) + 1;
function partyDistance(a, b) { return avg(AXIS_IDS, k => Math.abs(a.ideo[k] - b.ideo[k])); }
function isGovParty(G, pid) { return !!pid && (G.gov.president === pid || Object.values(G.gov.ministers).includes(pid)); }
function ministriesOf(G, pid) { return Object.entries(G.gov.ministers).filter(([, v]) => v === pid).map(([k]) => k); }
function cantonsGovernedBy(G, pid) { return G.cantons.filter(c => c.gov.president === pid); }
function quarterLabel(G, turn) {
  const t = turn ?? G.turn;
  if (t <= 0) return 'Fundación';
  return `${['1.er', '2.º', '3.er', '4.º'][(t - 1) % 4]} trimestre de ${START_YEAR + Math.floor((t - 1) / 4)}`;
}
function shortQuarter(t) { return t <= 0 ? 'Inicio' : `T${((t - 1) % 4) + 1} ${String(START_YEAR + Math.floor((t - 1) / 4)).slice(2)}`; }
// Registro de lo que pasa en el trimestre (alimenta el periódico)
function logEvent(G, ev) { G.qEvents = G.qEvents || []; ev.turn = G.turn; G.qEvents.push(ev); }
// ---------- Voto de un ciudadano ----------
function canVote(G, cz) {
  const minAge = G.pol.edadVoto || 18;
  if (cz.age < minAge) return false;
  if (cz.nat) return true;
  return G.pol.votoResidentes && cz.yrs >= 3;
}

// Un partido regionalista solo se presenta en los cantones de su región (en generales y en cantonales)
function runsIn(party, cantonIdx) { return party.regional == null || (party.region ? party.region.includes(cantonIdx) : party.regional === cantonIdx); }
// Voto económico: cada punto de satisfacción ganado (o perdido) desde el inicio de la legislatura cuenta
// 1,6; el premio no pasa de +0,25 y el castigo de −0,35 (la gente castiga más de lo que premia).
const ECO_VOTE = { w: 1.6, max: 0.25, min: -0.35 };
function ecoVote(cz, ref) { return clamp((cz.sat - (ref ?? cz.sat)) * ECO_VOTE.w, ECO_VOTE.min, ECO_VOTE.max); }
// Desgaste por gobernar: muy ligero, crece con cada trimestre en el poder y no pasa de −0,06
const GOV_WEAR = { q: 0.004, max: 0.06 };
function govWear(G, since) { return since == null ? 0 : -Math.min(GOV_WEAR.max, GOV_WEAR.q * Math.max(0, G.turn - since)); }
function citizenUtility(G, cz, party, level, canton) {
  let d = 0, ws = 0;
  for (let i = 0; i < AXIS_IDS.length; i++) {
    let w = cz.sal[i];
    // a quien tiene fervor (cantonalista o centralista) el eje territorial le importa más
    if (i === 2 && cz.fv) w *= level === 'cantonal' ? 1.8 : 1.4;
    d += w * Math.abs(cz.x[i] - party.ideo[AXIS_IDS[i]]);
    ws += w;
  }
  d /= ws;
  let u = -1.7 * d + clamp(cz.aff[party.id] || 0, -1.6, 1.6) + party.pop;
  // voto identitario: en su tierra, el regionalista atrae a los cantonalistas (sin pasarse)
  if (party.regional != null && runsIn(party, cz.c)) u += cz.fv === -1 ? 0.2 : cz.origin === 'nativo' ? 0.04 : 0.01;
  // voto económico: premio o castigo al gobierno según cómo ha cambiado la satisfacción de cada uno
  // desde que empezó la legislatura (no según lo contento que esté), con tope; y un desgaste muy ligero
  if (level === 'nacional') {
    if (G.gov.president === party.id) u += ecoVote(cz, cz.sr) + govWear(G, G.gov.since);
    else if (Object.values(G.gov.ministers).includes(party.id)) u += ecoVote(cz, cz.sr) * 0.5;
  } else {
    if (canton.gov.president === party.id) u += ecoVote(cz, cz.src) * 0.8 + govWear(G, canton.gov.since);
    else if (canton.gov.coalition.includes(party.id)) u += ecoVote(cz, cz.src) * 0.4;
    if (G.gov.president === party.id) u += ecoVote(cz, cz.sr) * 0.4;
  }
  return u;
}

function citizenChoice(G, cz, level, canton, noiseScale = 0.45) {
  let best = null, bestU = -Infinity, maxU = -Infinity;
  for (const p of G.players) {
    if (!runsIn(p, cz.c)) continue;
    const u0 = citizenUtility(G, cz, p, level, canton);
    maxU = Math.max(maxU, u0);
    const g = -Math.log(-Math.log(Math.max(1e-9, RNG.next())));
    const u = u0 + g * noiseScale;
    if (u > bestU) { bestU = u; best = p.id; }
  }
  // participación
  let logit = 0.55 + (cz.age - 45) * 0.018 + (cz.edu - 2) * 0.3 + (cz.lvl - 3) * 0.15 + (maxU + 1.4) * 0.7
    - (G.eco.corruption - 30) / 40 + (level === 'cantonal' ? -0.3 : 0)
    // los nacidos fuera votan algo menos (los extranjeros nacionalizados, bastante menos); los nativos, como mínimo igual
    + (cz.origin === 'extranjero' ? -0.7 : cz.origin === 'interno' ? -0.05 : 0.05);
  if (G.pol.votoObligatorio) logit += 1.6;
  const pVote = 1 / (1 + Math.exp(-logit));
  return RNG.chance(pVote) ? best : null;
}

// ---------- Reparto de escaños ----------
function hashFrac(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

function nationalSeats(G, res, rules) {
  const pol = rules || G.pol;
  const seats = {}; G.players.forEach(p => seats[p.id] = 0);
  const byCantonSeats = G.cantons.map(() => ({}));
  if (pol.sistemaElectoral === 'proporcional_nacional') {
    const r = dhondt(res.votes, G.parliament.seats, pol.umbral);
    Object.assign(seats, r);
    // reparto orientativo por cantones (solo informativo)
    G.cantons.forEach((c, i) => { byCantonSeats[i] = dhondt(res.byCanton[i].votes, c.nationalSeats, 0); });
  } else if (pol.sistemaElectoral === 'mayoritario') {
    G.cantons.forEach((c, i) => {
      const r = {}; G.players.forEach(p => r[p.id] = 0);
      const dv = res.byCanton[i].districts;
      dv.forEach(d => {
        let best = null, bv = -1;
        for (const [pid, v] of Object.entries(d)) if (v > bv) { bv = v; best = pid; }
        if (best && bv > 0) { r[best]++; seats[best]++; }
      });
      byCantonSeats[i] = r;
    });
  } else {
    G.cantons.forEach((c, i) => {
      const r = dhondt(res.byCanton[i].votes, c.nationalSeats, pol.umbral);
      byCantonSeats[i] = r;
      for (const k in r) seats[k] += r[k];
    });
  }
  return { seats, byCantonSeats };
}

// ---------- Elecciones ----------
// Simula una votación sobre toda la población. Devuelve votos por cantón y distrito.
function simulateVote(G, level, noiseScale = 0.45) {
  const res = { votes: {}, byCanton: G.cantons.map(c => ({ votes: {}, districts: range(c.nationalSeats).map(() => ({})), electorate: 0, voters: 0 })), electorate: 0, voters: 0, choices: new Map() };
  G.players.forEach(p => { res.votes[p.id] = 0; res.byCanton.forEach(bc => bc.votes[p.id] = 0); });
  // distritos: ordenamos a los ciudadanos de cada cantón por una "geografía" estable
  const groups = byCanton(G);
  groups.forEach((list, i) => {
    const c = G.cantons[i];
    const nd = c.nationalSeats;
    const sorted = list.slice().sort((a, b) => ((a.urban ? 0 : 1) + hashFrac(a.id)) - ((b.urban ? 0 : 1) + hashFrac(b.id)));
    sorted.forEach((cz, k) => {
      if (!canVote(G, cz)) return;
      res.byCanton[i].electorate += c.w; res.electorate += c.w;
      const v = citizenChoice(G, cz, level, c, noiseScale);
      res.choices.set(cz.id, v);
      if (!v) return;
      res.byCanton[i].voters += c.w; res.voters += c.w;
      res.byCanton[i].votes[v] += c.w; res.votes[v] += c.w;
      const d = Math.min(nd - 1, Math.floor(k / sorted.length * nd));
      res.byCanton[i].districts[d][v] = (res.byCanton[i].districts[d][v] || 0) + c.w;
    });
  });
  res.turnout = res.voters / Math.max(1, res.electorate);
  return res;
}

function runNationalElection(G) {
  const res = simulateVote(G, 'nacional');
  const { seats, byCantonSeats } = nationalSeats(G, res);
  const totalV = sum(Object.values(res.votes));
  const shares = {}; for (const k in res.votes) shares[k] = res.votes[k] / Math.max(1, totalV);
  const prevSeats = Object.assign({}, G.parliament.composition);
  G.parliament.composition = seats;
  const winner = Object.entries(res.votes).sort((a, b) => b[1] - a[1])[0][0];
  if (G.turn > 0) G.players.forEach(p => {
    p.stats.maxSeats = Math.max(p.stats.maxSeats, seats[p.id] || 0);
    if (p.id === winner) p.stats.wonPopularVote = true;
  });
  const result = {
    level: 'nacional', turn: G.turn, votes: res.votes, shares, seats, prevSeats, turnout: res.turnout,
    byCanton: res.byCanton.map((bc, i) => ({ votes: bc.votes, seats: byCantonSeats[i], turnout: bc.voters / Math.max(1, bc.electorate), districts: bc.districts })),
    system: G.pol.sistemaElectoral, threshold: G.pol.umbral,
  };
  G.parliament.lastElection = result;
  G.elections.lastNational = G.turn;
  G.elections.nextNational = G.turn + G.pol.legislatura * 4;
  return result;
}

function runCantonalElections(G) {
  const res = simulateVote(G, 'cantonal');
  const results = G.cantons.map((c, i) => {
    const bc = res.byCanton[i];
    const seats = dhondt(bc.votes, c.parliament.seats, Math.max(0.03, G.pol.umbral));
    c.parliament.prev = Object.assign({}, c.parliament.composition);
    c.parliament.composition = seats;
    const tv = sum(Object.values(bc.votes));
    const shares = {}; for (const k in bc.votes) shares[k] = bc.votes[k] / Math.max(1, tv);
    c.parliament.lastElection = { turn: G.turn, votes: bc.votes, shares, seats, turnout: bc.voters / Math.max(1, bc.electorate) };
    return { canton: c.idx, seats, shares, turnout: bc.voters / Math.max(1, bc.electorate) };
  });
  G.elections.lastCantonal = G.turn;
  G.elections.nextCantonal = G.turn + G.pol.legislatura * 4;
  return results;
}

// Gobiernos cantonales a partir de los apoyos declarados {cantonIdx: {pid: candidatePid}}
function formCantonalGovernments(G, supports) {
  const out = [];
  G.cantons.forEach(c => {
    const comp = c.parliament.composition;
    const cands = G.players.filter(p => (comp[p.id] || 0) > 0);
    const backing = {};
    cands.forEach(p => backing[p.id] = 0);
    G.players.forEach(p => {
      const seats = comp[p.id] || 0; if (!seats) return;
      const choice = (supports[c.idx] && supports[c.idx][p.id]) || p.id;
      if (backing[choice] !== undefined) backing[choice] += seats;
    });
    const maj = absMajority(c.parliament.seats);
    let best = null, bv = -1;
    for (const [pid, v] of Object.entries(backing)) if (v > bv || (v === bv && (comp[pid] || 0) > (comp[best] || 0))) { bv = v; best = pid; }
    const coalition = G.players.filter(p => (comp[p.id] || 0) > 0 && ((supports[c.idx] && supports[c.idx][p.id]) || p.id) === best).map(p => p.id);
    const since = c.gov && c.gov.president === best && c.gov.since != null ? c.gov.since : G.turn;
    c.gov = { president: best, coalition, majority: bv >= maj, since };
    out.push({ canton: c.idx, president: best, coalition, majority: bv >= maj, backing: bv });
  });
  return out;
}

// ---------- Encuestas ----------
// Ámbito de una encuesta: todo el país (null) o una lista de cantones. Los regionalistas solo pueden
// encuestar los cantones donde se presentan; los demás, todo el país o un cantón suelto.
function pollScopes(G, party) {
  const live = G.cantons.filter(c => !c.merged);
  if (party.regional != null) {
    const reg = (party.region || [party.regional]).filter(i => G.cantons[i] && !G.cantons[i].merged);
    return (reg.length > 1 ? [reg] : []).concat(reg.map(i => [i]));
  }
  return [null].concat(live.map(c => [c.idx]));
}
function pollCost(G, tier, scope) {
  if (!scope) return tier.cost;
  const share = sum(scope, i => G.cantons[i].pop || 0) / Math.max(1, sum(G.cantons, c => c.merged ? 0 : c.pop || 0));
  return Math.round(tier.cost * (0.4 + 0.6 * share));
}
function runPoll(G, party, tierId, scope) {
  const tier = POLL_TIERS.find(t => t.id === tierId);
  party.funds -= pollCost(G, tier, scope);
  const res = simulateVote(G, 'nacional', 0.5);
  const inS = i => !scope || scope.includes(i);
  const err = () => RNG.normal(0, tier.error * 0.7);
  const votes = {}; G.players.forEach(p => votes[p.id] = sum(res.byCanton.filter((bc, i) => inS(i)), bc => bc.votes[p.id] || 0));
  const runs = p => !scope || scope.some(i => runsIn(p, i));
  const tv = sum(Object.values(votes)) || 1;
  const shares = {};
  for (const k in votes) shares[k] = runs(partyById(G, k)) ? clamp(votes[k] / tv + err(), 0, 1) : 0;
  const st = sum(Object.values(shares)) || 1; for (const k in shares) shares[k] /= st;
  const elect = sum(res.byCanton.filter((bc, i) => inS(i)), bc => bc.electorate), voters = sum(res.byCanton.filter((bc, i) => inS(i)), bc => bc.voters);
  const poll = { tier: tierId, turn: G.turn, label: quarterLabel(G), shares, turnout: clamp(voters / Math.max(1, elect) + err(), 0.3, 1), scope: scope ? scope.slice() : null };
  if (tierId !== 'basica') {
    // por cantones con error y proyección de escaños
    poll.cantons = res.byCanton.map((bc, i) => {
      if (!inS(i) || G.cantons[i].merged) return null;
      const t = sum(Object.values(bc.votes));
      const sh = {}; for (const k in bc.votes) sh[k] = bc.votes[k] > 0 ? clamp(bc.votes[k] / Math.max(1, t) + err() * 1.4, 0, 1) : 0;
      const s2 = sum(Object.values(sh)) || 1; for (const k in sh) sh[k] /= s2;
      return sh;
    });
    const cv = i => { const o = {}; G.players.forEach(p => o[p.id] = poll.cantons[i] ? poll.cantons[i][p.id] * G.cantons[i].pop : 0); return o; };
    if (!scope) {
      const fake = { votes: {}, byCanton: G.cantons.map((c, i) => ({ votes: cv(i), districts: res.byCanton[i].districts })) };
      G.players.forEach(p => { fake.votes[p.id] = shares[p.id]; });
      poll.seats = nationalSeats(G, fake).seats;
    } else {
      // solo los diputados que se eligen en esos cantones
      poll.seats = {}; G.players.forEach(p => poll.seats[p.id] = 0);
      scope.forEach(i => { const r = dhondt(cv(i), G.cantons[i].nationalSeats, G.pol.umbral); for (const k in r) poll.seats[k] += r[k]; });
      poll.seatsTotal = sum(scope, i => G.cantons[i].nationalSeats);
    }
    poll.cantonSeats = G.cantons.map((c, i) => poll.cantons[i] ? dhondt(cv(i), c.parliament.seats, Math.max(0.03, G.pol.umbral)) : null);
  }
  // los estudios sociológicos y de leyes, solo con la gente del ámbito
  const all = G.citizens;
  if (scope) G.citizens = all.filter(cz => scope.includes(cz.c));
  try {
    if (tierId === 'sociologica' || tierId === 'completa') poll.groups = pollGroups(G, res, tier.error);
    if (tierId === 'completa') { poll.ideoMap = ideologyHistogram(G); poll.wishes = popularWishes(G); poll.leaderRatings = leaderRatings(G); }
  } finally { G.citizens = all; }
  party.polls.unshift(poll);
  return poll;
}

function pollGroups(G, res, error) {
  const groups = {};
  const add = (cat, key, label, v) => {
    groups[cat] = groups[cat] || {};
    const g = groups[cat][key] = groups[cat][key] || { label, n: 0, votes: {}, abst: 0 };
    g.n++;
    if (v) g.votes[v] = (g.votes[v] || 0) + 1; else g.abst++;
  };
  for (const cz of G.citizens) {
    if (!res.choices.has(cz.id)) continue;
    const v = res.choices.get(cz.id);
    const st = citizenStatus(cz);
    add('Ocupación', st, PROFESSIONS[st].name, v);
    const ws = workSector(cz);
    add('Situación laboral', ws, WORK_SECTORS[ws].name, v);
    const ab = cz.age < 30 ? '18-29' : cz.age < 45 ? '30-44' : cz.age < 65 ? '45-64' : '65+';
    add('Edad', ab, ab + ' años', v);
    add('Sexo', cz.sex, cz.sex === 'M' ? 'Mujeres' : 'Hombres', v);
    add('Nivel económico', 'l' + cz.lvl, LEVEL_NAMES[cz.lvl], v);
    add('Origen', cz.origin, { nativo: 'Nacido en su cantón', interno: 'De otro cantón', extranjero: 'Nacionalizado o residente extranjero' }[cz.origin], v);
    add('Hábitat', cz.urban ? 'u' : 'r', cz.urban ? 'Urbano' : 'Rural', v);
  }
  for (const cat in groups) for (const k in groups[cat]) {
    const g = groups[cat][k];
    const voted = g.n - g.abst;
    g.shares = {};
    G.players.forEach(p => g.shares[p.id] = voted ? clamp((g.votes[p.id] || 0) / voted + RNG.normal(0, error * (g.n < 60 ? 2 : 1)), 0, 1) : 0);
    g.turnout = g.n ? voted / g.n : 0;
    g.size = g.n / G.citizens.length;
  }
  return groups;
}

function ideologyHistogram(G) {
  const bins = AXIS_IDS.map(() => [0, 0, 0, 0, 0]);
  for (const cz of G.citizens) for (let i = 0; i < AXIS_IDS.length; i++) bins[i][clamp(Math.round(cz.x[i]) + 2, 0, 4)]++;
  return bins.map(b => b.map(v => v / G.citizens.length));
}

function leaderRatings(G) {
  const r = {};
  G.players.forEach(p => {
    let s = 0;
    let n = 0;
    for (const cz of G.citizens) { if (!runsIn(p, cz.c)) continue; n++; s += 10 / (1 + Math.exp(-(citizenUtility(G, cz, p, 'nacional', G.cantons[cz.c]) + 1.6) * 1.4)); }
    r[p.id] = n ? s / n : 0;
  });
  return r;
}

// Qué cambios legislativos apoya la mayoría de la gente

// ============================================================
//  LEYES MARCO
// ============================================================
// Tratado comercial: false (no hay), true (libre comercio total) o una lista de productos (parcial)
function treatyLabel(v) {
  if (v === true) return 'Libre comercio total';
  if (Array.isArray(v) && v.length) return 'Parcial: ' + v.map(g => GOODS[g] ? GOODS[g].name.toLowerCase() : g).join(', ');
  return 'Sin tratado';
}
function treatyField(f) {
  return { id: 'tratado_' + f.id, name: 'Tratado con ' + f.name, path: 'tratados.' + f.id, options: [false, true], treaty: true,
    label: treatyLabel, pos: v => ({ ext: v === true ? -1 : Array.isArray(v) && v.length ? -0.5 : 0.6, eco: v === true ? 0.3 : Array.isArray(v) && v.length ? 0.15 : 0 }),
    desc: 'Quita los aranceles con ' + f.name + ' (en todos los productos o solo en algunos): más exportaciones y más competencia.', icon: 'handshake' };
}
function fieldById(G, id) {
  if (id.startsWith('tratado_')) { const f = G.foreign.find(x => 'tratado_' + x.id === id); return f ? treatyField(f) : null; }
  return FIELDS[id];
}
function packById(id) { return LAW_PACKS.find(p => p.id === id) || CANTON_PACKS.find(p => p.id === id); }
// Campos disponibles de una ley marco en la situación actual
function packFields(G, pack) {
  let ids = pack.fields.slice();
  if (pack.dynamicTreaties) ids = ids.concat(G.foreign.map(f => 'tratado_' + f.id));
  return ids.map(id => fieldById(G, id)).filter(f => {
    if (!f) return false;
    if (f.competence && !natApplies(G.pol, f.competence)) return false;
    if (f.requiresComp && !cantApplies(G.pol, f.requiresComp)) return false;
    return true;
  });
}
function availablePacks(G, scope) {
  return (scope === 'cantonal' ? CANTON_PACKS : LAW_PACKS).filter(p => packFields(G, p).length > 0);
}
function fieldValue(G, field, scope, canton) {
  const v = scope === 'cantonal' ? getPath(G.cantons[canton].pol, field.path) : getPath(G.pol, field.path);
  return v === undefined ? (field.optional ? null : v) : v;
}
// ¿Quién puede presentar esta ley?
function canProposePack(G, party, pack, scope, canton) {
  if (scope === 'cantonal') {
    if (!(G.cantons[canton].parliament.composition[party.id] > 0)) return 'Necesitas escaños en ese parlamento cantonal.';
    return null;
  }
  if (pack.govOnly && G.gov.president !== party.id && G.gov.ministers.hacienda !== party.id) return 'Los Presupuestos solo los presenta el Gobierno (presidencia o Hacienda).';
  if (pack.govOnly && G.gov.interim) return 'Un Gobierno en funciones no puede presentar Presupuestos.';
  return null;
}
function proposalCost(G, party, pack, scope, opts = {}) {
  if (opts.free) return 0;
  if (scope === 'cantonal') return G.cantons[opts.canton]?.gov.president === party.id ? 1 : 2;
  let cost = 3;
  if (isGovParty(G, party.id)) cost = 2;
  if (G.gov.ministers.hacienda === party.id && (pack.id === 'fiscal' || pack.id === 'presupuestos')) cost -= 1;
  if (opts.decree) cost += 1;
  if (seatsOf(G, party.id) === 0) cost += 2; // iniciativa extraparlamentaria
  return Math.max(1, cost);
}

let PROP_COUNTER = 1;
function makeProposal(G, party, packId, changes, opts = {}) {
  const pack = packById(packId);
  const scope = opts.scope || (pack.canton ? 'cantonal' : 'nacional');
  const prev = {};
  for (const fid in changes) prev[fid] = fieldValue(G, fieldById(G, fid), scope, opts.canton);
  const organic = scope === 'nacional' && (!!pack.organic || Object.keys(changes).some(fid => fieldById(G, fid).organic));
  return {
    id: 'L' + G.turn + '_' + (PROP_COUNTER++), kind: 'law', pack: packId, scope, canton: opts.canton ?? null, changes, prev,
    proposer: party.id, decree: !!opts.decree, organic, votes: {}, result: null, free: !!opts.free, turn: G.turn, cost: opts.cost || 0,
  };
}
function proposalTitle(G, prop) {
  if (prop.kind === 'censura') return 'Moción de censura';
  const pack = packById(prop.pack);
  return pack.name + (prop.scope === 'cantonal' ? ' de ' + G.cantons[prop.canton].name : '');
}
function proposalSummary(G, prop) {
  if (prop.kind === 'censura') return 'Propone un nuevo presidente.';
  return Object.keys(prop.changes).map(fid => { const f = fieldById(G, fid); return `${f.name}: ${f.label(prop.prev[fid])} → ${f.label(prop.changes[fid])}`; }).join('; ');
}

// Votación: devuelve {yes, no, abs, passed}
function tallyProposal(G, prop) {
  let yes = 0, no = 0, abs = 0;
  const comp = prop.scope === 'cantonal' ? G.cantons[prop.canton].parliament.composition : G.parliament.composition;
  const total = prop.scope === 'cantonal' ? G.cantons[prop.canton].parliament.seats : G.parliament.seats;
  G.players.forEach(p => {
    const s = comp[p.id] || 0; const v = prop.votes[p.id] || 'abs';
    if (v === 'si') yes += s; else if (v === 'no') no += s; else abs += s;
  });
  const maj = absMajority(total);
  let passed;
  if (prop.kind === 'censura') passed = yes >= maj;
  else if (prop.decree) passed = no < maj;           // el decreto decae solo si lo rechaza la mayoría absoluta
  else if (prop.organic) passed = yes >= maj;        // ley orgánica: mayoría absoluta
  else passed = yes > no;                            // ley ordinaria: mayoría simple
  return { yes, no, abs, total, maj, passed };
}

function applyLaw(G, prop) {
  for (const fid in prop.changes) {
    const f = fieldById(G, fid), v = prop.changes[fid];
    if (prop.scope === 'cantonal') { setPath(G.cantons[prop.canton].pol, f.path, v); continue; }
    const before = getPath(G.pol, f.path);
    setPath(G.pol, f.path, v);
    if (fid.startsWith('c_') && before !== v) moveCompetence(G, f.path.split('.')[1], before, v);
    if (fid === 'legislatura') {
      G.elections.nextNational = Math.max(G.turn + 1, (G.elections.lastNational ?? 0) + v * 4);
      G.elections.nextCantonal = Math.max(G.turn + 1, (G.elections.lastCantonal ?? 0) + v * 4);
    }
  }
}

// Al cambiar quién tiene una competencia, el dinero se mueve con ella: lo que deja de pagar
// el Estado pasa a las transferencias a los cantones (y al revés).
function moveCompetence(G, area, from, to) {
  const p = G.pol, e = G.eco;
  const natPart = (from !== 'cantonal' ? p.gasto[area] || 0 : 0);
  const cantPart = from !== 'nacional' ? sum(G.cantons, c => (c.pol.gasto[area] || 0) * (c.stats.gdp || 0)) / Math.max(1e-9, e.gdp) : 0;
  const total = Math.max(0.1, natPart + cantPart);
  const newNat = total * NAT_SHARE[to], newCant = total * (1 - NAT_SHARE[to]);
  const r2 = x => Math.round(x * 100) / 100;
  p.gasto[area] = r2(newNat);
  G.cantons.forEach(c => { c.pol.gasto[area] = to === 'nacional' ? 0 : r2(newCant); });
  p.gasto.transferencias = r2(Math.max(0, (p.gasto.transferencias || 0) + (newCant - cantPart)));
}

// ---------- Opinión ciudadana sobre una ley ----------
function interestMult(fid, cz) {
  const m = LAW_INTEREST[fid]; if (!m) return 1;
  return m[citizenStatus(cz)] || m[cz.prof] || (cz.origin === 'extranjero' && m.extranjero) || 1;
}
function citizenFieldPref(cz, f, cur, v) {
  const a = f.pos(cur), b = f.pos(v);
  let s = 0, ws = 0;
  for (let i = 0; i < AXIS_IDS.length; i++) {
    const k = AXIS_IDS[i];
    if (a[k] === undefined && b[k] === undefined) continue;
    const pa = clamp(a[k] ?? 0, -2.5, 2.5), pb = clamp(b[k] ?? 0, -2.5, 2.5);
    s += cz.sal[i] * (Math.abs(cz.x[i] - pa) - Math.abs(cz.x[i] - pb));
    ws += cz.sal[i];
  }
  if (!ws) return 0;
  return clamp(s / ws / 2, -1, 1) * interestMult(f.id, cz);
}
function citizenProposalPref(G, cz, prop) {
  let s = 0;
  for (const fid in prop.changes) s += citizenFieldPref(cz, fieldById(G, fid), prop.prev[fid], prop.changes[fid]);
  return clamp(s, -1.6, 1.6);
}
function proposalSupport(G, citizens, prop) {
  let yes = 0, no = 0;
  for (const cz of citizens) { const p = citizenProposalPref(G, cz, prop); if (p > 0.05) yes++; else if (p < -0.05) no++; }
  return { yes: yes / citizens.length, no: no / citizens.length, net: (yes - no) / citizens.length };
}
// Qué cambios de un solo campo apoya la mayoría (para la macroencuesta)
function popularWishes(G) {
  const sample = RNG.shuffle(G.citizens).slice(0, 600);
  const out = [];
  for (const pack of availablePacks(G, 'nacional')) for (const f of packFields(G, pack)) {
    const cur = fieldValue(G, f, 'nacional');
    for (const v of f.options) {
      if (v === cur || (cur == null && f.optional)) continue;
      let yes = 0, no = 0;
      for (const cz of sample) { const p = citizenFieldPref(cz, f, cur, v); if (p > 0.05) yes++; else if (p < -0.05) no++; }
      const net = (yes - no) / sample.length;
      if (net > 0.08) out.push({ pack: pack.name, name: f.name, label: f.label(v), support: yes / sample.length, against: no / sample.length });
    }
  }
  return out.sort((a, b) => (b.support - b.against) - (a.support - a.against)).slice(0, 10);
}

// La ciudadanía reacciona a lo que vota cada partido
function citizensReact(G, prop, passed) {
  if (prop.kind !== 'law') return;
  const voteVal = {}; G.players.forEach(p => voteVal[p.id] = prop.votes[p.id] === 'si' ? 1 : prop.votes[p.id] === 'no' ? -1 : 0);
  const visibility = passed ? 1 : 0.55;
  let favor = 0, contra = 0, n = 0;
  for (const cz of G.citizens) {
    if (prop.scope === 'cantonal' && cz.c !== prop.canton) continue;
    const pref = citizenProposalPref(G, cz, prop);
    n++; if (pref > 0.05) favor++; else if (pref < -0.05) contra++;
    if (Math.abs(pref) < 0.03) continue;
    for (const p of G.players) {
      const vv = voteVal[p.id]; if (!vv) continue;
      const k = (p.id === prop.proposer ? 0.16 : 0.1) * visibility;
      cz.aff[p.id] = (cz.aff[p.id] || 0) + k * pref * vv;
    }
  }
  prop.publicSupport = { favor: favor / Math.max(1, n), contra: contra / Math.max(1, n) };
}

// ============================================================
//  IDEOLOGÍA DINÁMICA
//  Cada partido tiene una posición de partida (el debate) y un
//  historial de votos. La ideología pública es una mezcla de ambos:
//  un voto suelto apenas la mueve, pero votar una y otra vez en
//  una dirección acaba cambiando la etiqueta del partido.
// ============================================================
const IDEO_ANCHOR_WEIGHT = 5;   // el debate "pesa" como 5 votos relevantes
const IDEO_DECAY = 0.95;        // por trimestre, el historial pierde un 5 % de peso
function initIdeologyRecord(p) {
  p.ideoBase = Object.assign({}, p.ideo);
  p.rec = {}; AXIS_IDS.forEach(a => p.rec[a] = { w: 0, s: 0 });
}
function recomputeIdeology(p) {
  AXIS_IDS.forEach(a => {
    const r = p.rec[a];
    p.ideo[a] = clamp((p.ideoBase[a] * IDEO_ANCHOR_WEIGHT + r.s) / (IDEO_ANCHOR_WEIGHT + r.w), -2, 2);
  });
}
function recordVoteStances(G, prop) {
  if (prop.kind !== 'law') return;
  G.players.forEach(p => {
    const v = prop.votes[p.id];
    if (v !== 'si' && v !== 'no') return;
    if (prop.scope === 'cantonal' && !(G.cantons[prop.canton].parliament.composition[p.id] > 0)) return;
    const before = AXIS_IDS.map(a => axisLabel(a, p.ideo[a]));
    for (const fid in prop.changes) {
      const f = fieldById(G, fid);
      const a = f.pos(prop.prev[fid]), b = f.pos(prop.changes[fid]);
      for (const ax of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const pa = a[ax] ?? 0, pb = b[ax] ?? 0;
        const delta = Math.abs(pb - pa);
        if (delta < 0.05) continue;
        // apoyar un cambio te acerca a donde lleva; rechazarlo, a donde está
        const stance = v === 'si' ? pb : pa;
        const w = Math.min(1, delta / 1.5) * (p.id === prop.proposer ? 1.5 : 1) * (v === 'no' ? 0.7 : 1) * (prop.scope === 'cantonal' ? 0.5 : 1);
        p.rec[ax].w += w; p.rec[ax].s += w * stance;
      }
    }
    recomputeIdeology(p);
    AXIS_IDS.forEach((ax, i) => {
      const now = axisLabel(ax, p.ideo[ax]);
      if (now !== before[i]) logEvent(G, { kind: 'giro', party: p.id, axis: ax, from: before[i], to: now, importance: 5 });
    });
  });
}
// Cuánto movería la ideología de un partido votar sí o no a una ley (la abstención no la mueve).
// Devuelve el cambio por eje; sirve para avisar al votar (es una estimación: cuenta solo esta ley).
function voteShiftEstimate(st, party, prop, v) {
  const out = {};
  if (!party || !party.rec || !party.ideoBase || prop.kind !== 'law' || (v !== 'si' && v !== 'no')) return out;
  const rec = {}; AXIS_IDS.forEach(a => rec[a] = Object.assign({}, party.rec[a]));
  for (const fid in prop.changes) {
    const f = fieldById(st, fid); if (!f) continue;
    const a = f.pos(prop.prev[fid]), b = f.pos(prop.changes[fid]);
    for (const ax of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const pa = a[ax] ?? 0, pb = b[ax] ?? 0, delta = Math.abs(pb - pa);
      if (delta < 0.05 || !rec[ax]) continue;
      const w = Math.min(1, delta / 1.5) * (party.id === prop.proposer ? 1.5 : 1) * (v === 'no' ? 0.7 : 1) * (prop.scope === 'cantonal' ? 0.5 : 1);
      rec[ax].w += w; rec[ax].s += w * (v === 'si' ? pb : pa);
    }
  }
  AXIS_IDS.forEach(a => {
    const now = clamp((party.ideoBase[a] * IDEO_ANCHOR_WEIGHT + rec[a].s) / (IDEO_ANCHOR_WEIGHT + rec[a].w), -2, 2);
    const d = now - party.ideo[a]; if (Math.abs(d) >= 0.01) out[a] = d;
  });
  return out;
}
function decayIdeologyRecords(G) {
  G.players.forEach(p => {
    if (!p.rec) return;
    AXIS_IDS.forEach(a => { p.rec[a].w *= IDEO_DECAY; p.rec[a].s *= IDEO_DECAY; });
    recomputeIdeology(p);
    p.ideoHistory.push({ turn: G.turn, ideo: Object.assign({}, p.ideo) });
    if (p.ideoHistory.length > 40) p.ideoHistory.shift();
  });
}
// ---------- Corrupción ----------
function detectionRate(G, party) {
  const p = G.pol;
  let r = 0.025 * (1 + (p.transparencia ? 0.5 : 0) + (p.fiscalia ? 0.7 : 0) + p.judicial * 0.35);
  if (G.gov.ministers.interior === party.id) r *= 0.6;
  if (p.judicial === 0 && isGovParty(G, party.id)) r *= 0.5;
  if (party.investigated) r *= party.investigated.mult;
  return r;
}
function detectionProbability(G, party) { return 1 - Math.exp(-detectionRate(G, party) * party.evidence); }

function scandal(G, party, cause, exposerId) {
  const sev = party.evidence;
  const title = cause || 'Estalla un caso de corrupción';
  party.pop = clamp(party.pop - (0.25 + 0.12 * sev) - (G.gov.president === party.id ? 0.15 : 0), -2, 1);
  const fine = Math.min(Math.max(0, party.funds), Math.round(40 * sev));
  party.funds -= fine;
  party.evidence = 0;
  party.imputado = 4;
  party.stats.scandals++;
  G.eco.scandalHeat += 4 + 2 * sev;
  if (G.gov.president === party.id) party.pc = Math.max(0, party.pc - 2);
  if (exposerId) { const ex = partyById(G, exposerId); if (ex) ex.stats.scandalsExposed++; }
  const caseName = RNG.pick(['Aurora', 'Tridente', 'Lince', 'Marea', 'Cóndor', 'Hidra', 'Escorpión', 'Laberinto', 'Ámbar', 'Ciprés', 'Vértice', 'Medusa', 'Andrómeda', 'Zafiro']) + ' ' + RNG.pick(['II', 'bis', '', '', 'Sur', 'Norte']);
  const ev = { kind: 'escandalo', importance: 9, party: party.id, caseName: caseName.trim(), fine, severity: sev, exposer: exposerId || null, cause: title,
    text: `Caso ${caseName.trim()}: ${title.toLowerCase()} en ${party.name}. Multa de ${fmt.k(fine)}.${exposerId ? ' La investigación la impulsó ' + partyById(G, exposerId).name + '.' : ''}` };
  logEvent(G, ev);
  return ev;
}

function corruptionPhase(G) {
  const news = [];
  for (const p of G.players) {
    if (p.evidence > 0.2 && RNG.chance(detectionProbability(G, p))) {
      news.push(scandal(G, p, 'Estalla un escándalo de corrupción', p.investigated ? p.investigated.by : null));
    }
    p.investigated = null;
    p.evidence = Math.max(0, p.evidence * 0.97);
    if (p.imputado > 0) p.imputado--;
  }
  return news;
}


// ---------- Ingresos de cada trimestre ----------
function partyIncome(G, p) {
  const seats = seatsOf(G, p.id), cseats = cantonSeatsOf(G, p.id);
  const le = G.parliament.lastElection;
  // subvención por voto según la cuota (equivale a la de un país de unos 11 millones de votantes)
  const totVotes = le ? sum(Object.values(le.votes || {})) : 0;
  const votesM = le && totVotes ? (le.votes[p.id] || 0) / totVotes * 11 : 0;
  const fin = { publica: 1.45, mixta: 1, privada: 0.45 }[G.pol.financiacion];
  const subsidy = Math.round((seats * 4 + cseats * 1 + votesM * 30) * fin);
  const costs = Math.round(40 + seats * 1 + cseats * 0.3);
  const pcGain = 2 + Math.floor(seats / 15) + Math.floor(cseats / 30) + (G.gov.president === p.id ? 2 : 0)
    + ministriesOf(G, p.id).length + cantonsGovernedBy(G, p.id).length;
  return { subsidy, costs, net: subsidy - costs, pc: pcGain };
}
function applyIncome(G) {
  const rep = {};
  for (const p of G.players) {
    const inc = partyIncome(G, p);
    p.funds += inc.net;
    p.pc = Math.min(20, p.pc + inc.pc);
    p.pop *= 0.88;
    rep[p.id] = inc;
  }
  // las simpatías de la ciudadanía se desgastan con el tiempo
  for (const cz of G.citizens) for (const k in cz.aff) cz.aff[k] *= 0.96;
  return rep;
}

// ---------- Barómetro oficial (público, cada trimestre) ----------
function officialBarometer(G) {
  const res = simulateVote(G, 'nacional', 0.5);
  const tv = sum(Object.values(res.votes)) || 1;
  const shares = {};
  G.players.forEach(p => shares[p.id] = clamp((res.votes[p.id] || 0) / tv + RNG.normal(0, 0.02), 0, 1));
  const st = sum(Object.values(shares)) || 1; for (const k in shares) shares[k] /= st;
  const b = { turn: G.turn, shares, turnout: res.turnout };
  G.barometers = G.barometers || [];
  G.barometers.push(b);
  if (G.barometers.length > 40) G.barometers.shift();
  return b;
}
// Muestra de ciudadanos (posición económica y social) para dibujar la nube ideológica sin enviar a todos
function refreshPublicSample(G) {
  G.publicSample = RNG.shuffle(G.citizens).slice(0, 320).map(cz => [Math.round(cz.x[0] * 100) / 100, Math.round(cz.x[1] * 100) / 100]);
}
// ---------- Acciones de partido ----------
function campaignEffect(G, party, target, amount) {
  // target: {type:'nacional'} | {type:'canton', idx} | {type:'grupo', status}
  const k = target.type === 'nacional' ? 0.22 : target.type === 'canton' ? 0.42 : 0.48;
  const boost = k * Math.log(1 + amount / 60);
  for (const cz of G.citizens) {
    if (target.type === 'canton' && cz.c !== target.idx) continue;
    if (target.type === 'grupo' && citizenStatus(cz) !== target.status) continue;
    if (target.type === 'sector' && workSector(cz) !== target.ws) continue;
    const d = avg(range(AXIS_IDS.length), i => Math.abs(cz.x[i] - party.ideo[AXIS_IDS[i]]));
    const recept = clamp((2 - d) / 1.5, 0.15, 1);
    cz.aff[party.id] = (cz.aff[party.id] || 0) + boost * recept;
  }
}
function rallyEffect(G, party) {
  for (const cz of G.citizens) {
    const d = avg(range(AXIS_IDS.length), i => Math.abs(cz.x[i] - party.ideo[AXIS_IDS[i]]));
    if (d < 0.9) cz.aff[party.id] = (cz.aff[party.id] || 0) + 0.18;
  }
}
function donationAmount(G, party) {
  if (G.pol.financiacion === 'publica') return 0;
  const lean = clamp((party.ideo.eco + 2) / 4, 0, 1);
  const base = G.pol.financiacion === 'privada' ? 100 + 200 * lean : 40 + 60 * lean;
  return Math.round(base * RNG.range(0.8, 1.2));
}
function groupEffect(G, filter, partyId, amount) {
  for (const cz of G.citizens) if (filter(cz)) cz.aff[partyId] = (cz.aff[partyId] || 0) + amount;
}

