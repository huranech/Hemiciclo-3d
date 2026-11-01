// ============================================================
//  CONTROLADOR DE LA PARTIDA (se ejecuta en el anfitrión)
//  El anfitrión guarda el estado completo G, valida las acciones
//  que envían los jugadores y avanza de fase cuando todos están listos.
// ============================================================
'use strict';

let G = null;
const SAVE_KEY = 'hemiciclo-anfitrion-v37';
const START_YEAR = 2031;

// Fases en las que se espera a que todos pulsen "Listo"
const READY_PHASES = ['world', 'missions', 'parties', 'ideology', 'election', 'invDeclare', 'invVote', 'invResult', 'cantonGov', 'cantonGovResult', 'news', 'actions', 'ballot', 'sessionResult'];
const PHASE_NAMES = {
  world: 'El país', missions: 'Misiones secretas', parties: 'Fundación de partidos', debate: 'Debate inaugural', ideology: 'Mapa ideológico',
  election: 'Noche electoral', invDeclare: 'Candidaturas', invVote: 'Votación de investidura', invResult: 'Resultado de la investidura',
  ministries: 'Formación de gobierno', cantonGov: 'Gobiernos cantonales', cantonGovResult: 'Gobiernos cantonales', news: 'Prensa del trimestre',
  actions: 'Acciones', ballot: 'Pleno: votación', sessionResult: 'Pleno: resultados', gameover: 'Fin de la partida',
};

function hostNewGame(cfg, lobbyPlayers) {
  const seed = cfg.seed || Math.floor(Math.random() * 1e9);
  RNG.seed(seed);
  G = {
    version: 2, seed, code: cfg.code, turn: 0, quarter: 0, year: START_YEAR, maxTurns: (cfg.years || 6) * 4, phase: 'world',
    players: lobbyPlayers.map((p, i) => createParty(i, p.name, p.token)),
    proposals: [], ready: {}, chat: [], qEvents: [], announcements: [], lawLog: [], barometers: [], papers: [],
    gov: { president: null, ministers: {}, interim: false, investedTurn: null, supporters: [] },
    elections: { lastNational: null, nextNational: 0, lastCantonal: null, nextCantonal: 0 },
    history: { elections: [], cantonal: [] },
  };
  generateWorld(G, { nCantons: cfg.nCantons, nCountries: cfg.nCountries, agents: cfg.agents });
  initEconomyBase(G);
  // los demás países, simulados igual que el nuestro (y la economía de partida de todos a la vez)
  buildForeignStates(G);
  G.citizens.forEach(cz => G.players.forEach(p => cz.aff[p.id] = 0));
  G.players.forEach(p => { p.missions = drawMissions(G, 3, [], p); });
  refreshPublicSample(G);
  resetReady();
  save();
  return G;
}

// ---------- Misiones ----------
function missionFits(m, party) { return party && party.regional != null ? !m.national : !m.regionalOnly; }
function drawMission(G, excludeIds, excludeCats, party) {
  const pool = MISSIONS.filter(m => (!excludeIds.includes(m.id) || m.multi) && (!m.valid || m.valid(G)) && missionFits(m, party)).filter(m => !excludeCats.includes(m.cat));
  // una de cada cinco cartas es una «agenda oscura»: que algo vaya mal
  const bad = RNG.chance(BAD_MISSION_SHARE), sub = pool.filter(x => !!x.bad === bad);
  const m = RNG.pick(sub.length ? sub : pool.length ? pool : MISSIONS.filter(x => !x.bad));
  return { id: m.id, params: m.gen(G), done: false, doneTurn: null };
}
function drawMissions(G, n, have, party) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ids = have.concat(out).map(x => x.id);
    const cats = have.concat(out).map(x => MISSIONS.find(m => m.id === x.id).cat);
    out.push(drawMission(G, ids, cats.length < 4 ? cats : [], party));
  }
  return out;
}
function missionDef(m) { return MISSIONS.find(x => x.id === m.id); }

// ---------- Guardado (solo en el anfitrión) ----------
const CZ_FIELDS = ['id', 'c', 'sex', 'age', 'prof', 'sector', 'lastSector', 'emp', 'lvl', 'edu', 'rel', 'urban', 'origin', 'from', 'yrs', 'nat', 'x', 'sal', 'aff', 'income', 'prevIncome', 'sat', 'base', 'hh', 'nm', 'role', 'firm', 'sav', 'bk', 'hip', 'wantsHome', 'fu', 'fs', 'fv', 'sr', 'src', 'cu', 'q', 'wg', 'st', 'sq', 'ue', 'hired', 'pb', 'ls'];
const r3 = v => Math.round(v * 1000) / 1000;
const r2 = v => Math.round(v * 100) / 100;
function encodeCitizens(g) {
  const pids = g.players.map(p => p.id);
  return g.citizens.map(cz => CZ_FIELDS.map(f => {
    const v = cz[f];
    if (f === 'aff') return pids.map(id => r2(v[id] || 0));
    if (Array.isArray(v)) return v.map(r2);
    if (typeof v === 'number' && !Number.isInteger(v)) return r3(v);
    return v;
  }));
}
function decodeCitizens(g, rows) {
  const pids = g.players.map(p => p.id);
  const pubIds = new Set((g.firms || []).filter(f => f.pub != null).map(f => f.id));
  return rows.map(row => {
    const cz = {};
    CZ_FIELDS.forEach((f, i) => { cz[f] = row[i]; });
    const aff = {}; pids.forEach((id, i) => aff[id] = cz.aff[i] || 0); cz.aff = aff;
    // (partidas guardadas antes de distinguir a los funcionarios)
    if (cz.pb == null) cz.pb = cz.emp && pubIds.has(cz.firm) ? 1 : 0;
    if (cz.ls === null) delete cz.ls;
    return cz;
  });
}
// Redondeo al guardar y enviar: 6 cifras significativas (el dinero va en miles de millones y un país pequeño maneja cifras muy pequeñas)
const numRound = (k, v) => (k && k[0] === '_') ? undefined : (typeof v === 'number' && !Number.isInteger(v) && isFinite(v)) ? Number(v.toPrecision(6)) : v;
function serializeGame() {
  G.rngState = RNG.state;
  // los habitantes de cada país van comprimidos
  const foreign = G.foreign.map(f => f.st ? Object.assign({}, f, { st: Object.assign({}, f.st, { citizens: undefined, czPacked: encodeCitizens(f.st) }) }) : f);
  return JSON.stringify(Object.assign({}, G, { citizens: undefined, czPacked: encodeCitizens(G), foreign }), numRound);
}
function deserializeGame(raw) {
  const g = JSON.parse(raw);
  if (!g || g.version !== 2) return null;
  g.citizens = decodeCitizens(g, g.czPacked); delete g.czPacked;
  (g.foreign || []).forEach(f => {
    if (!f.st) return;
    hide(f.st, 'players', f.parties);
    f.st.citizens = decodeCitizens(f.st, f.st.czPacked); delete f.st.czPacked;
  });
  linkStates(g);
  return g;
}
// (con muchos países la partida ocupa mucho: si se acerca al límite del navegador, se guarda comprimida)
const SAVE_PACK_FROM = 3.2e6;
function save() {
  if (!G) return;
  try {
    const raw = serializeGame();
    localStorage.setItem(SAVE_KEY, raw.length > SAVE_PACK_FROM ? 'LZ1:' + lzPack(raw) : raw);
    localStorage.setItem(SAVE_KEY + '-info', JSON.stringify({ code: G.code, country: G.country.name, turn: G.turn, players: G.players.map(p => p.player) }));
  } catch (e) { /* sin almacenamiento: la partida sigue en memoria */ }
}
function readSaved() { const raw = localStorage.getItem(SAVE_KEY); return raw && raw.startsWith('LZ1:') ? lzUnpack(raw.slice(4)) : raw; }
function loadSaved() {
  try { const raw = readSaved(); return raw ? deserializeGame(raw) : null; } catch (e) { return null; }
}
function savedSummary() {
  try {
    if (!localStorage.getItem(SAVE_KEY)) return null;
    const info = localStorage.getItem(SAVE_KEY + '-info');
    if (info) return JSON.parse(info);
    const g = JSON.parse(readSaved());
    return { code: g.code, country: g.country.name, turn: g.turn, players: g.players.map(p => p.player) };
  } catch (e) { return null; }
}
function clearSaved() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '-info'); } catch (e) { } }

// ============================================================
//  "Listo" y avance de fase
// ============================================================
function resetReady() { G.ready = {}; G.players.forEach(p => G.ready[p.id] = false); }
function allReady() {
  const active = G.players.filter(p => p.online);
  return active.length > 0 && active.every(p => G.ready[p.id]);
}
function setPhase(ph) { G.phase = ph; if (G.gov) delete G.gov.draft; resetReady(); save(); }

// Se llama tras cada acción: si todos están listos, avanza
function checkAdvance() {
  let guard = 0;
  while (READY_PHASES.includes(G.phase) && allReady() && guard++ < 10) advancePhase();
}
// El anfitrión puede forzar el avance si alguien no responde
function forceAdvance() {
  if (G.phase === 'debate') { const cur = debateCurrent(); debateAnswer({ idx: RNG.pick(cur.remaining) }); return; }
  if (G.phase === 'ministries') { const pres = G.gov.president; MINISTRIES.forEach(m => G.gov.ministers[m.id] = G.gov.ministers[m.id] || pres); afterGovernmentFormation(); return; }
  if (READY_PHASES.includes(G.phase)) advancePhase();
}

function advancePhase() {
  switch (G.phase) {
    case 'world': setPhase('missions'); break;
    case 'missions': setPhase('parties'); break;
    case 'parties':
      G.players.forEach((p, i) => { if (!p.configured) autoConfigureParty(p, i); });
      startDebate(); break;
    case 'ideology':
      holdNationalElection(); holdCantonalElections();
      G.electionNow = { national: true, cantonal: true };
      setPhase('election'); break;
    case 'election': afterElectionScreen(); break;
    case 'invDeclare': investitureStartVoting(); break;
    case 'invVote': investitureResolveRound(); break;
    case 'invResult': investitureContinue(); break;
    case 'cantonGov': confirmCantonGovernments(); break;
    case 'cantonGovResult': afterGovernmentFormation(); break;
    case 'news': setPhase('actions'); break;
    case 'actions': startBallot(); break;
    case 'ballot': resolveBallot(); break;
    case 'sessionResult': afterSession(); break;
  }
}

// ============================================================
//  Partidos y debate
// ============================================================
function autoConfigureParty(p, i) {
  const used = G.players.filter(x => x !== p).map(x => x.color).filter(Boolean);
  const def = DEFAULT_PARTIES[i];
  const nameFree = def && !G.players.some(x => x !== p && x.configured && x.name === def.name);
  p.name = p.name || (nameFree ? def.name : 'Partido de ' + p.player);
  p.short = p.short || (nameFree ? def.short : p.name.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase().slice(0, 5) || 'P' + (i + 1));
  p.color = p.color || (def && !used.includes(def.color) ? def.color : PARTY_COLORS.find(c => !used.includes(c.hex)).hex);
  p.configured = true;
}
function colorTaken(hex, exceptId) {
  const near = (a, b) => { const A = hexToRgb(a), B = hexToRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 60; };
  return G.players.some(p => p.id !== exceptId && p.configured && p.color && near(p.color, hex));
}
function startDebate() {
  G.debate = { block: 0, perPlayer: 1, log: [] };   // una intervención por partido en cada bloque
  setupDebateBlock();
  G.phase = 'debate'; resetReady(); save();
}
function setupDebateBlock() {
  const n = G.players.length, d = G.debate;
  const blk = DEBATE_BLOCKS[d.block];
  // una pregunta por bloque, con tantas respuestas como partidos más una (siempre una de cada extremo)
  const ok = range(blk.questions.length).filter(i => blk.questions[i].a.length >= n + 1);
  d.qid = RNG.pick(ok.length ? ok : range(blk.questions.length));
  const q = blk.questions[d.qid], k = Math.min(q.a.length, n + 1), ax = blk.axis;
  const byV = range(q.a.length).sort((x, y) => (q.a[x].fx[ax] || 0) - (q.a[y].fx[ax] || 0));
  const pick = [byV[0], byV[byV.length - 1]];
  RNG.shuffle(byV.slice(1, -1)).forEach(i => { if (pick.length < k) pick.push(i); });
  d.ans = RNG.shuffle(pick.slice(0, k));
  d.remaining = d.ans.slice(); d.step = 0;
  const start = d.block % n;
  d.order = [];
  for (let r = 0; r < d.perPlayer; r++) for (let k2 = 0; k2 < n; k2++) d.order.push(G.players[(start + k2) % n].id);
}
function debateCurrent() {
  const d = G.debate; const blk = DEBATE_BLOCKS[d.block];
  return { block: blk, question: blk.questions[d.qid], speaker: partyById(G, d.order[d.step]), remaining: d.remaining, ans: d.ans };
}
// Respuestas regionalistas que puede dar un partido (no se gastan: varios pueden ser de la misma tierra)
function debateRegOptions(G, party, blk) {
  // solo para quien aún no es regionalista: una vez dentro, se responde como todos
  if (G.players.length < 3 || party.regional != null) return [];
  const full = regionalCount(G) >= regionalCap(G);
  const tpl = REGIONAL_ANSWERS[blk.axis];
  return regionalCultures(G).filter(() => !full).map(cu => ({
    cul: cu.id, name: cu.name, label: cultureLabel(G, cu), cantons: cu.region.slice(), t: tpl.t.replace(/\{R\}/g, cu.name), fx: tpl.fx, joins: party.regional == null,
  }));
}
function debateAnswer(sel) {
  const d = G.debate; const cur = debateCurrent();
  let ans, reg = null;
  if (sel && typeof sel === 'object' && sel.reg != null) {
    const opt = debateRegOptions(G, cur.speaker, cur.block).find(o => o.cul === sel.reg);
    if (!opt) return 'Esa respuesta ya no está disponible.';
    ans = { t: opt.t, fx: opt.fx }; reg = opt.cul;
    if (cur.speaker.regional == null) makeRegional(G, cur.speaker, G.cultures[opt.cul]);
  } else {
    const idx = sel && typeof sel === 'object' ? sel.idx : sel;
    if (!cur.remaining.includes(idx)) return 'Esa respuesta ya la ha dado otro partido.';
    ans = cur.question.a[idx];
    d.remaining = d.remaining.filter(i => i !== idx);
  }
  cur.speaker.debate.push({ block: d.block, fx: ans.fx, t: ans.t });
  d.log.push({ party: cur.speaker.id, block: d.block, q: cur.question.q, t: ans.t, reg });
  d.lastAnswer = { party: cur.speaker.id, t: ans.t, at: Date.now() };
  d.step++;
  if (d.step >= d.order.length) {
    d.block++;
    if (d.block >= DEBATE_BLOCKS.length) { finishDebate(); return null; }
    setupDebateBlock();
  }
  save();
  return null;
}
// El anfitrión puede saltarse el debate: a cada partido se le asigna una respuesta al azar
// en cada bloque que le faltaba (las que ya había dado se mantienen)
function skipDebate() {
  const d = G.debate;
  for (let b = d.block; b < DEBATE_BLOCKS.length; b++) {
    const blk = DEBATE_BLOCKS[b];
    G.players.forEach(p => {
      if (p.debate.some(x => x.block === b)) return;
      const q = RNG.pick(blk.questions), ans = RNG.pick(q.a);
      p.debate.push({ block: b, fx: ans.fx, t: ans.t });
    });
  }
  finishDebate();
}
function finishDebate() {
  G.players.forEach(p => {
    AXIS_IDS.forEach(a => {
      const vals = p.debate.map(x => x.fx[a]).filter(v => v !== undefined);
      p.ideo[a] = vals.length ? clamp(avg(vals), -2, 2) : 0;
    });
    if (p.regional != null) {
      // un partido regionalista defiende más autogobierno para su tierra
      p.ideo.ter = clamp(Math.max(p.ideo.ter, 0) + 0.6, -2, 2);
      // las misiones de ámbito nacional se cambian por otras propias de su escala
      p.missions = p.missions.map(m => {
        if (m.done || missionFits(missionDef(m), p)) return m;
        const others = p.missions.filter(x => x !== m);
        return drawMission(G, others.map(x => x.id).concat([m.id]), [], p);
      });
      logEvent(G, { kind: 'regionalista', importance: 6, party: p.id, canton: p.regional, cul: p.cul, region: (p.region || []).slice() });
    }
    initIdeologyRecord(p);
  });
  setPhase('ideology');
}

// ============================================================
//  Elecciones e investidura
// ============================================================
function holdNationalElection() {
  const res = runNationalElection(G);
  G.history.elections.push({ turn: G.turn, shares: res.shares, seats: res.seats, turnout: res.turnout, system: res.system });
  logEvent(G, { kind: 'elecciones', importance: 10, shares: res.shares, seats: res.seats, turnout: res.turnout });
  return res;
}
function holdCantonalElections() {
  const res = runCantonalElections(G);
  G.history.cantonal.push({ turn: G.turn, results: res });
  logEvent(G, { kind: 'cantonales', importance: 6, results: res });
  return res;
}
function afterElectionScreen() {
  const en = G.electionNow; G.electionNow = null;
  G.pendingCantonGov = !!(en && en.cantonal);
  if (en && en.national) { startInvestiture(); return; }
  afterGovernmentFormation();
}
function canBeCandidate(p) {
  if (seatsOf(G, p.id) === 0) return false;
  if (p.imputado > 0) return false;
  if (G.pol.limiteMandatos && p.stats.consecutive >= 2) return false;
  return true;
}
function startInvestiture() {
  G.inv = { round: 1, declared: {}, candidates: [], votes: {}, log: [], result: null };
  G.players.forEach(p => { G.inv.declared[p.id] = canBeCandidate(p) && seatsOf(G, p.id) === Math.max(...G.players.map(x => seatsOf(G, x.id))); });
  setPhase('invDeclare');
}
function investitureStartVoting() {
  const inv = G.inv;
  inv.candidates = G.players.filter(p => inv.declared[p.id] && canBeCandidate(p)).sort((a, b) => seatsOf(G, b.id) - seatsOf(G, a.id)).map(p => p.id);
  if (!inv.candidates.length) { investitureFail(); return; }
  inv.votes = {};
  G.players.forEach(p => { inv.votes[p.id] = {}; inv.candidates.forEach(c => inv.votes[p.id][c] = c === p.id ? 'si' : null); });
  setPhase('invVote');
}
// Se votan todos los candidatos a la vez; gana el que cumpla la mayoría de la ronda con más síes
function investitureResolveRound() {
  const inv = G.inv;
  const maj = absMajority(G.parliament.seats);
  const tallies = inv.candidates.map(cand => {
    let yes = 0, no = 0, abs = 0;
    G.players.forEach(p => { const s = seatsOf(G, p.id); const v = inv.votes[p.id][cand] || 'abs'; if (v === 'si') yes += s; else if (v === 'no') no += s; else abs += s; });
    return { cand, yes, no, abs, passed: inv.round === 1 ? yes >= maj : yes > no };
  });
  const winners = tallies.filter(t => t.passed).sort((a, b) => b.yes - a.yes);
  inv.result = { round: inv.round, tallies, winner: winners.length ? winners[0].cand : null, votes: JSON.parse(JSON.stringify(inv.votes)) };
  inv.log.push(inv.result);
  setPhase('invResult');
}
function investitureContinue() {
  const inv = G.inv, r = inv.result;
  if (r.winner) {
    const supporters = G.players.filter(p => inv.votes[p.id][r.winner] === 'si' && p.id !== r.winner).map(p => p.id);
    installGovernment(r.winner, supporters);
    return;
  }
  if (inv.round === 1) {
    inv.round = 2;
    G.players.forEach(p => inv.candidates.forEach(c => { if (c !== p.id) inv.votes[p.id][c] = null; }));
    setPhase('invVote');
    return;
  }
  investitureFail();
}
function installGovernment(presId, supporters) {
  const prev = G.gov.president;
  G.players.forEach(p => { if (p.id !== presId) p.stats.consecutive = 0; });
  const pres = partyById(G, presId);
  pres.stats.investitures++;
  pres.stats.consecutive = prev === presId ? pres.stats.consecutive + 1 : 1;
  const since = prev === presId && G.gov.since != null ? G.gov.since : G.turn;
  G.gov = { president: presId, ministers: {}, interim: false, investedTurn: G.turn, supporters, since };
  // empieza la legislatura: el voto económico se medirá desde la satisfacción de hoy
  G.citizens.forEach(cz => { cz.sr = Math.round(cz.sat * 1000) / 1000; });
  logEvent(G, { kind: 'investidura', importance: 10, party: presId, supporters });
  setPhase('ministries');
}
function investitureFail() {
  if (G.gov.president) G.gov.interim = true;
  logEvent(G, { kind: 'investiduraFallida', importance: 9 });
  G.elections.nextNational = G.turn + 1;
  G.inv.failed = true;
  afterGovernmentFormation();
}
function afterGovernmentFormation() {
  if (G.pendingCantonGov) { G.pendingCantonGov = false; prepareCantonSupports(); setPhase('cantonGov'); return; }
  if (G.afterCensure) { G.afterCensure = false; finishTurn(); return; }
  nextTurn();
}
function prepareCantonSupports() {
  G.cantonSupports = {};
  G.cantons.forEach(c => {
    G.cantonSupports[c.idx] = {};
    G.players.forEach(p => { if ((c.parliament.composition[p.id] || 0) > 0) G.cantonSupports[c.idx][p.id] = p.id; });
  });
}
function confirmCantonGovernments() {
  const res = formCantonalGovernments(G, G.cantonSupports);
  G.citizens.forEach(cz => { cz.src = Math.round(cz.sat * 1000) / 1000; });
  G.lastCantonGov = res;
  logEvent(G, { kind: 'gobiernosCantonales', importance: 5, results: res });
  setPhase('cantonGovResult');
}

// ============================================================
//  Turnos
// ============================================================
function nextTurn() {
  G.turn++;
  G.quarter = ((G.turn - 1) % 4) + 1;
  G.year = START_YEAR + Math.floor((G.turn - 1) / 4);
  G.proposals = [];
  G.players.forEach(p => { p.turnActions = {}; });
  // tratados que nos proponen otros países: van al pleno como una propuesta más
  (G.treatyOffers || []).forEach(o => {
    const f = G.foreign.find(x => x.id === o.from); if (!f || G.pol.tratados[f.id]) return;
    const changes = {}; changes['tratado_' + f.id] = true;
    const prop = makeProposal(G, { id: null }, 'comercio', changes, { scope: 'nacional', free: true });
    prop.foreign = f.id; G.proposals.push(prop);
    logEvent(G, { kind: 'tratadoExterior', importance: 5, foreign: f.id, tone: 'neutral', text: `${f.name} propone un tratado de libre comercio con nosotros: las Cortes lo votarán en este pleno.` });
  });
  G.treatyOffers = [];
  G.lastIncome = applyIncome(G);
  decayIdeologyRecords(G);
  // imprevisto
  if (RNG.chance(0.3)) {
    const evs = EVENTS.filter(e => !e.cond || e.cond(G));
    const ev = RNG.weighted(evs, e => e.w);
    const c = RNG.pick(G.cantons), f = RNG.pick(G.foreign);
    ev.apply(G, c, f);
    const txt = s => s.replace(/\{canton\}/g, c.name).replace(/\{foreign\}/g, f.name);
    logEvent(G, { kind: 'imprevisto', importance: 7, id: ev.id, title: txt(ev.title), text: txt(ev.text), canton: ev.canton ? c.idx : null, foreign: ev.foreign ? f.id : null });
  }
  const bar = officialBarometer(G);
  logEvent(G, { kind: 'barometro', importance: 3, shares: bar.shares });
  refreshPublicSample(G);
  G.paper = buildNewspaper(G, G.qEvents);
  G.papers.push(G.paper); if (G.papers.length > 12) G.papers.shift();
  G.qEvents = [];
  setPhase('news');
}

function startBallot() {
  if (!G.proposals.length) { finishTurn(); return; }
  // moción de censura primero, después las leyes nacionales y por último las cantonales
  G.proposals.sort((a, b) => (a.kind === 'censura' ? 0 : a.scope === 'nacional' ? 1 : 2) - (b.kind === 'censura' ? 0 : b.scope === 'nacional' ? 1 : 2));
  G.proposals.forEach(p => { G.players.forEach(pl => { if (!p.votes[pl.id]) p.votes[pl.id] = pl.id === p.proposer ? 'si' : null; }); });
  setPhase('ballot');
}
function voterHasSeats(prop, pid) {
  return prop.scope === 'cantonal' ? (G.cantons[prop.canton].parliament.composition[pid] || 0) > 0 : seatsOf(G, pid) > 0;
}
function resolveBallot() {
  G.sessionResults = [];
  let censured = null;
  for (const prop of G.proposals) {
    G.players.forEach(p => { if (!prop.votes[p.id]) prop.votes[p.id] = 'abs'; });
    const t = tallyProposal(G, prop);
    prop.result = t;
    const proposer = partyById(G, prop.proposer);
    G.lawLog.push({ turn: G.turn, id: prop.id, kind: prop.kind, pack: prop.pack, changes: prop.changes, prev: prop.prev, passed: t.passed, proposer: prop.proposer, foreign: prop.foreign || undefined,
      scope: prop.scope, canton: prop.canton, decree: prop.decree, yes: t.yes, no: t.no, abs: t.abs, votes: Object.assign({}, prop.votes) });
    if (G.lawLog.length > 120) G.lawLog.shift();
    if (prop.kind === 'censura') {
      if (t.passed) censured = { pres: prop.proposer, supporters: G.players.filter(p => prop.votes[p.id] === 'si' && p.id !== prop.proposer).map(p => p.id) };
      else proposer.pop -= 0.08;
      logEvent(G, { kind: 'censura', importance: 9, party: prop.proposer, passed: t.passed, against: G.gov.president, votes: Object.assign({}, prop.votes) });
    } else {
      if (t.passed) { applyLaw(G, prop); if (proposer) proposer.stats.lawsPassed++; }
      else if (prop.decree && proposer) proposer.pop -= 0.1;
      // los tratados necesitan que el otro país también los quiera
      onOurTreatyLaw(G, prop, t.passed);
      citizensReact(G, prop, t.passed);
      recordVoteStances(G, prop);
      if (prop.proposer) logEvent(G, { kind: 'ley', importance: prop.scope === 'nacional' ? (prop.organic ? 8 : 6) : 3, prop: JSON.parse(JSON.stringify(prop)), passed: t.passed });
    }
    G.sessionResults.push(Object.assign({ id: prop.id }, t));
  }
  G.censured = censured;
  setPhase('sessionResult');
}
function afterSession() {
  if (G.censured) {
    const c = G.censured; G.censured = null;
    G.afterCensure = true;
    installGovernment(c.pres, c.supporters);
    return;
  }
  finishTurn();
}
// Economía, corrupción, misiones y, si toca, elecciones
function finishTurn() {
  simulateEconomy(G);
  G.eco.news.forEach(n => logEvent(G, { kind: 'economia', importance: n.importance || 3, topic: n.topic, tone: n.type, text: n.text, data: n.data }));
  corruptionPhase(G);
  checkMissions();
  if (winners().length || G.turn >= G.maxTurns) { finishGame(); return; }
  const national = G.turn >= G.elections.nextNational;
  const cantonal = G.turn >= G.elections.nextCantonal;
  if (national || cantonal) {
    G.electionNow = { national, cantonal };
    if (national) holdNationalElection();
    if (cantonal) holdCantonalElections();
    setPhase('election');
    return;
  }
  nextTurn();
}
function checkMissions() {
  // trimestres seguidos en el Gobierno nacional (para la misión «Tocar poder»)
  G.players.forEach(p => { const inGov = G.gov.president === p.id || Object.values(G.gov.ministers).includes(p.id); p.stats.govStreak = inGov ? (p.stats.govStreak || 0) + 1 : 0; });
  G.players.forEach(p => {
    p.missions.forEach(m => {
      if (m.done) return;
      const r = missionDef(m).check(G, p, m.params);
      if (r.done) {
        m.done = true; m.doneTurn = G.turn;
        const n = p.missions.filter(x => x.done).length;
        logEvent(G, { kind: 'mision', importance: 8, party: p.id, count: n });
      }
    });
  });
}
function winners() { return G.players.filter(p => p.missions.every(m => m.done)); }
function finishGame() {
  const ranking = G.players.slice().sort((a, b) => {
    const da = a.missions.filter(m => m.done).length, db = b.missions.filter(m => m.done).length;
    if (db !== da) return db - da;
    return seatsOf(G, b.id) - seatsOf(G, a.id);
  });
  G.ranking = ranking.map(p => p.id);
  G.paper = buildNewspaper(G, G.qEvents);
  setPhase('gameover');
}

// ============================================================
//  Acciones que llegan de los jugadores
// ============================================================
// Abrir o cerrar un centro público. Lo hace quien gobierna esa competencia:
// el ministro de Sanidad o de Educación (Estado) o el presidente del cantón.
function publicCenterAction(party, a) {
  const ok = (msg, data) => ({ ok: true, msg, data }), fail = msg => ({ ok: false, msg });
  if (G.phase !== 'actions') return fail('Solo durante la fase de acciones.');
  const C = a.op === 'open' ? PUBLIC_CENTERS[a.ctype] : null;
  const target = a.op !== 'open' ? G.firms.find(f => f.id === +a.id) : null;
  if (a.op === 'open' && !C) return fail('Tipo de centro desconocido.');
  if (a.op === 'nationalize' && (!target || target.pub != null || !['sanidad', 'educacion'].includes(target.kind))) return fail('Empresa desconocida.');
  if (a.op !== 'open' && a.op !== 'nationalize' && (!target || !target.ctype)) return fail('Centro desconocido.');
  const CC = C || (a.op === 'nationalize' ? PUBLIC_CENTERS[target.kind === 'sanidad' ? 'centroSalud' : 'colegio'] : PUBLIC_CENTERS[target.ctype]);
  const area = CC.budget || CC.sector;   // los cuarteles van con el gasto en defensa
  const owner = a.owner === 'estado' ? 'estado' : +a.owner;
  if (CC.stateOnly && owner !== 'estado') return fail('Los cuarteles son del Estado.');
  if (owner === 'estado') {
    // quién decide en el Estado: Sanidad, Educación, Interior (comisarías) o la presidencia (cuarteles)
    const who = area === 'defensa' ? G.gov.president : area === 'seguridad' ? G.gov.ministers.interior : G.gov.ministers[area];
    if (who !== party.id) return fail(area === 'defensa' ? 'Solo la presidencia del Gobierno puede hacerlo.' : `Solo el Ministerio de ${area === 'sanidad' ? 'Sanidad' : area === 'educacion' ? 'Educación y Cultura' : 'Interior'} puede hacerlo.`);
    if (area !== 'defensa' && !natApplies(G.pol, area)) return fail('Esa competencia es de los cantones.');
  } else {
    const c = G.cantons[owner];
    if (!c || c.gov.president !== party.id) return fail('Solo el gobierno de ese cantón puede hacerlo.');
    if (!cantApplies(G.pol, area)) return fail('Esa competencia es del Estado.');
  }
  // plazas y sueldo de un centro: no cuesta PC (es gestión del día a día)
  if (a.op === 'staff') {
    const res = setCenterStaffing(G, target.id, owner, a.plazas === '' || a.plazas == null ? null : a.plazas, a.pay === '' || a.pay == null ? null : a.pay);
    if (!res.ok) return fail(res.msg);
    save();
    const f = res.firm;
    return ok(`${f.name}: ${f.plazas == null ? 'plazas según el presupuesto' : `${f.plazas} plazas`}, ${f.pay ? `${fmt.int(f.pay * 1000 / 12)} €/mes los puestos cualificados (el resto, ${fmt.int(f.pay * 0.68 * 1000 / 12)} €)` : 'sueldo público de referencia'}.`);
  }
  const ta = party.turnActions = party.turnActions || {};
  const key = a.op === 'nationalize' || a.op === 'privatize' ? 'own_' + target.id : 'center_' + owner + '_' + area;
  if (ta[key]) return fail('Ya has tomado una decisión sobre esos centros este trimestre.');
  if (party.pc < 1) return fail('Necesitas 1 PC.');
  let res;
  if (a.op === 'open') res = openPublicCenter(G, a.ctype, +a.q, +a.r, owner);
  else if (a.op === 'nationalize') res = nationalizeCenter(G, target.id, owner);
  else if (a.op === 'privatize') res = privatizeCenter(G, target.id, owner);
  else res = closePublicCenter(G, target.id, owner);
  if (!res.ok) { if (res.deserted) { party.pc -= 1; ta[key] = 1; save(); } return fail(res.msg); }
  party.pc -= 1; ta[key] = 1;
  if (a.op === 'nationalize' || a.op === 'privatize') {
    const f = res.firm, grp = area === 'sanidad' ? 'sanitario' : 'academico';
    groupEffect(G, cz => citizenStatus(cz) === grp, party.id, a.op === 'nationalize' ? 0.08 : -0.08);
    groupEffect(G, cz => citizenStatus(cz) === 'empresario', party.id, a.op === 'nationalize' ? -0.1 : 0.08);
    logEvent(G, { kind: a.op === 'nationalize' ? 'nacionalizacion' : 'privatizacion', importance: 4, party: party.id, canton: f.c, name: f.name, area, price: res.price });
    save();
    return ok(a.op === 'nationalize' ? `${f.name} pasa a ser pública: se ha pagado ${fmt.int((res.cost || 0) * 1e9)} € (su valor y su deuda).`
      : `${f.name} se privatiza: ${res.buyer.nm} gana la subasta (${res.bidders} ${res.bidders === 1 ? 'puja' : 'pujas'}) y paga ${fmt.int(res.price * 1000)} €.`);
  }
  const grp = area === 'sanidad' ? 'sanitario' : area === 'educacion' ? 'academico' : 'policia';
  const f = res.firm;
  groupEffect(G, cz => citizenStatus(cz) === grp || cz.c === f.c, party.id, a.op === 'open' ? 0.12 : -0.25);
  logEvent(G, { kind: a.op === 'open' ? 'inauguracion' : 'cierreCentro', importance: 4, party: party.id, canton: f.c, name: f.name, area });
  save();
  return ok(a.op === 'open' ? `${f.name}: encargadas las obras (${fmt.bn(res.cost)}). Cuando la constructora termine el edificio, contratará personal según el presupuesto.` : `${f.name} cierra sus puertas.`);
}
// Empresas públicas: las del Estado las lleva el Ministerio de Economía; las de cada cantón, su presidente.
// Crear, nacionalizar, privatizar, ampliar o cerrar cuesta 1 PC; plantilla, sueldo y precios, nada.
function publicFirmAction(party, a) {
  const ok = (msg, data) => ({ ok: true, msg, data }), fail = msg => ({ ok: false, msg });
  if (G.phase !== 'actions') return fail('Solo durante la fase de acciones.');
  const owner = a.owner === 'estado' ? 'estado' : +a.owner;
  if (owner === 'estado') { if (G.gov.ministers.economia !== party.id) return fail('Las empresas del Estado las lleva el Ministerio de Economía.'); }
  else { const c = G.cantons[owner]; if (!c || c.gov.president !== party.id) return fail('Solo el gobierno de ese cantón puede hacerlo.'); }
  const f = a.op === 'create' ? null : G.firms.find(x => x.id === +a.id);
  if (a.op !== 'create' && !f) return fail('Empresa desconocida.');
  // gestión del día a día: gratis
  if (a.op === 'manage') {
    const r1 = setCenterStaffing(G, f.id, owner, a.plazas === '' || a.plazas == null ? null : a.plazas, a.pay === '' || a.pay == null ? null : a.pay);
    if (!r1.ok) return fail(r1.msg);
    const before = JSON.stringify(f.fp || {});
    const r2 = setPEPrices(G, f.id, owner, a.prices || {});
    if (!r2.ok) return fail(r2.msg);
    const fixed = Object.keys(f.fp || {});
    if (fixed.length && JSON.stringify(f.fp) !== before) logEvent(G, { kind: 'precioPublico', importance: 3, party: party.id, canton: f.c, name: f.name, goods: fixed.map(g => [g, f.fp[g], G.eco.px[g]]) });
    save();
    return ok(`${f.name}: ${f.plazas == null ? 'todas sus plazas' : f.plazas + ' plazas'}, ${f.pay ? fmt.int(f.pay * 1000 / 12) + ' €/mes' : 'sueldo público de referencia'}, ${fixed.length ? 'precio fijado para ' + fixed.map(g => GOODS[g].name.toLowerCase()).join(' y ') : 'precio de mercado'}.`);
  }
  const ta = party.turnActions = party.turnActions || {};
  const key = a.op === 'create' ? 'pe_new_' + owner : 'pe_' + f.id;
  if (ta[key]) return fail(a.op === 'create' ? 'Ya has creado una empresa pública con ese gobierno este trimestre.' : 'Ya has tomado una decisión sobre esa empresa este trimestre.');
  if (party.pc < 1) return fail('Necesitas 1 PC.');
  let res;
  if (a.op === 'create') res = createPublicFirm(G, a.kind, +a.q, +a.r, owner);
  else if (a.op === 'nationalize') res = nationalizeFirm(G, f.id, owner);
  else if (a.op === 'privatize') res = privatizeFirm(G, f.id, owner);
  else if (a.op === 'upgrade') res = upgradePublicFirm(G, f.id, owner);
  else if (a.op === 'close') { if (!f.pe) return fail('Esa empresa no es pública.'); res = closePublicCenter(G, f.id, owner); }
  else return fail('Acción desconocida.');
  if (!res.ok) { if (res.deserted) { party.pc -= 1; ta[key] = 1; save(); } return fail(res.msg); }
  party.pc -= 1; ta[key] = 1;
  const F = res.firm, sector = FIRM_KINDS[F.kind].sector;
  const sameSector = cz => cz.sector === sector || cz.lastSector === sector;
  if (a.op === 'nationalize') {
    groupEffect(G, cz => citizenStatus(cz) === 'empresario', party.id, -0.12);
    groupEffect(G, cz => workSector(cz) === 'publico' || (cz.emp && cz.firm === F.id), party.id, 0.06);
    logEvent(G, { kind: 'nacionalizaEmpresa', importance: 4, party: party.id, canton: F.c, name: F.name, price: res.price, kindName: FIRM_KINDS[F.kind].name });
    save();
    return ok(`${F.name} pasa a ser pública: se ha pagado ${fmt.int((res.cost || 0) * 1e9)} € (su valor y su deuda).`);
  }
  if (a.op === 'privatize') {
    groupEffect(G, cz => citizenStatus(cz) === 'empresario', party.id, 0.08);
    groupEffect(G, cz => workSector(cz) === 'publico' || (cz.emp && cz.firm === F.id), party.id, -0.08);
    logEvent(G, { kind: 'privatizaEmpresa', importance: 4, party: party.id, canton: F.c, name: F.name, price: res.price, buyer: res.buyer.nm });
    save();
    return ok(`${F.name} se privatiza: ${res.buyer.nm} gana la subasta (${res.bidders} ${res.bidders === 1 ? 'puja' : 'pujas'}) y paga ${fmt.int(res.price * 1000)} €.`);
  }
  if (a.op === 'create') {
    groupEffect(G, cz => cz.c === F.c && !cz.emp && inLaborForce(cz), party.id, 0.1);
    groupEffect(G, cz => citizenStatus(cz) === 'empresario' && sameSector(cz), party.id, -0.08);
    logEvent(G, { kind: 'creaEmpresa', importance: 4, party: party.id, canton: F.c, name: F.name, cost: res.cost });
    save();
    return ok(`${F.name}: encargadas las obras (${fmt.bn(res.cost)}). Cuando terminen, contratará a su plantilla.`);
  }
  if (a.op === 'upgrade') { save(); return ok(`${F.name}: encargada la ampliación (${fmt.bn(res.cost)}). Cuando termine, tendrá más plazas.`); }
  groupEffect(G, cz => cz.c === F.c, party.id, -0.15);
  logEvent(G, { kind: 'cierraEmpresa', importance: 4, party: party.id, canton: F.c, name: F.name, staff: F.staffN || 0 });
  save();
  return ok(`${F.name} cierra. Su plantilla se va al paro.`);
}
// Lo que ve el gobierno de cada empresa pública: cuentas, precios, producción y ventas
function peView(S, f) {
  const r1 = v => Math.round(v * 10) / 10, A = f.acct || {};
  const outs = peOutputs(f);
  return { pe: 1, pr: r1(f.profitY || 0), lq: f.loss || 0, lvMax: FIRM_KINDS[f.kind].maxLvl || MAX_LVL, up: f.upg ? workPct(f.upg) : null,
    ac: f.acct ? { rev: r1(A.rev), inp: r1(A.inp), wages: r1(A.wages), payroll: r1(A.payroll), carbon: r1(A.carbon || 0), profit: r1(A.profit) } : null,
    outs, fp: Object.fromEntries(Object.entries(f.fp || {}).map(([g, v]) => [g, Math.round(v * 1000)])),
    mk: Object.fromEntries(outs.map(g => [g, Math.round((S.eco.px[g] || GOODS[g].price) * 1000)])),
    qo: Object.fromEntries(outs.map(g => [g, r1((f.q_out || {})[g] || 0)])), qs: Object.fromEntries(outs.map(g => [g, r1((f.q_sold || {})[g] || 0)])) };
}
// Estadísticas de la población (terreno, cantón o país): pirámide, profesiones, ingresos…
function popStats(scope, idx) {
  let people, kids;
  if (scope === 'hex') {
    const [q, r] = idx; const homes = G.homes.filter(h => h.q === q && h.r === r); const ids = new Set(homes.map(h => h.id));
    people = G.citizens.filter(cz => ids.has(cz.hh)); kids = [].concat(...homes.map(h => h.kids));
  } else if (scope === 'canton') { people = G.citizens.filter(cz => cz.c === +idx); kids = [].concat(...G.homes.filter(h => h.c === +idx).map(h => h.kids)); }
  else { people = G.citizens; kids = [].concat(...G.homes.map(h => h.kids)); }
  // pirámide por grupos de 10 años
  const bands = range(10).map(i => ({ from: i * 10, to: i === 9 ? 120 : i * 10 + 9, M: 0, H: 0 }));
  const put = (age, sex) => { const b = bands[Math.min(9, Math.floor(age / 10))]; b[sex === 'M' ? 'M' : 'H']++; };
  people.forEach(cz => put(cz.age, cz.sex)); kids.forEach(k => put(k.a, k.s));
  const prof = {}; people.forEach(cz => { const k = citizenStatus(cz); prof[k] = (prof[k] || 0) + 1; });
  const firmsById = new Map(G.firms.map(f => [f.id, f]));
  const sectors = {}; people.forEach(cz => { if (cz.emp && cz.sector) sectors[cz.sector] = (sectors[cz.sector] || 0) + 1; });
  const monthly = cz => (cz.income || 0) * 1000 / 12;
  const workers = people.filter(cz => cz.emp);
  const sal = workers.map(monthly).sort((a, b) => a - b);
  const median = a => a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : 0;
  const allInc = people.map(monthly);
  const bins = [0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 6000];
  const hist = bins.map((b, i) => ({ from: b, to: bins[i + 1] || null, n: allInc.filter(v => v >= b && (bins[i + 1] == null || v < bins[i + 1])).length }));
  const origin = { nativo: 0, interno: 0, extranjero: 0 }; people.forEach(cz => { origin[cz.origin] = (origin[cz.origin] || 0) + 1; });
  const edu = { 1: 0, 2: 0, 3: 0 }; people.forEach(cz => { edu[cz.edu] = (edu[cz.edu] || 0) + 1; });
  const lf = people.filter(inLaborForce);
  // cualificaciones: cuántos la tienen, cuántos trabajan de ella y cuántos la están estudiando
  const quals = {}; QUALS.forEach(q => { quals[q] = { n: 0, work: 0, idle: 0, study: 0 }; });
  people.forEach(cz => {
    if (cz.q && quals[cz.q] && inLaborForce(cz)) { quals[cz.q].n++; if (cz.emp && cz.prof === cz.q) quals[cz.q].work++; else if (!cz.emp) quals[cz.q].idle++; }
    if (cz.prof === 'estudiante' && cz.st > 0 && cz.sq && quals[cz.sq]) quals[cz.sq].study++;
  });
  const vacs = sum(G.firms.filter(f => scope !== 'canton' || f.c === +idx), f => (f.vac || []).length);
  const labor = { quals, vacs, flow: scope === 'country' || scope == null ? (G.eco.flow || null) : null, wageQ: G.eco.qualWage || {}, wageUnq: G.eco.wageUnq || 0 };
  const publicJobs = workers.filter(cz => { const f = firmsById.get(cz.firm); return f && f.pub != null; }).length;
  // situación laboral: cuántos hay en cada grupo y hacia dónde tiran en economía y en lo social
  const work = {}; WORK_SECTOR_IDS.forEach(k => { work[k] = { n: 0, eco: 0, soc: 0 }; });
  people.forEach(cz => { const w = work[workSector(cz)]; if (!w) return; w.n++; w.eco += cz.x[0]; w.soc += cz.x[1]; });
  WORK_SECTOR_IDS.forEach(k => { const w = work[k]; if (w.n) { w.eco = Math.round(w.eco / w.n * 100) / 100; w.soc = Math.round(w.soc / w.n * 100) / 100; } });
  // ahorros e hipotecas
  const savs = people.map(cz => cz.sav || 0).sort((a, b) => a - b);
  const sbins = [0, 5, 20, 50, 100, 200];
  const savHist = sbins.map((b, i) => ({ from: b, to: sbins[i + 1] || null, n: savs.filter(v => v >= b && (sbins[i + 1] == null || v < sbins[i + 1])).length }));
  const withHip = people.filter(cz => cz.hip);
  const hh = new Set(people.map(cz => cz.hh));
  const money = { medianSav: median(savs), meanSav: savs.length ? avg(savs, x => x) : 0, savHist, mortgages: withHip.length, households: hh.size,
    mortDebt: sum(withHip, cz => cz.hip.p), arrears: withHip.filter(cz => cz.hip.ar).length,
    medianPay: median(withHip.map(cz => annuityQ(cz.hip.p, G.eco.mortRate || 0.035, cz.hip.n) * 1000 / 3).sort((a, b) => a - b)),
    wantHome: people.filter(cz => cz.wantsHome && cz.role === 'hijo').length };
  // nivel de vida de los hogares y cuánto cubren sus necesidades
  const homesIn = scope === 'hex' ? G.homes.filter(h => h.q === idx[0] && h.r === idx[1]) : scope === 'canton' ? G.homes.filter(h => h.c === +idx) : G.homes;
  const wlHist = new Array(10).fill(0); let fSum = 0, fN = 0;
  const hhSize = new Map(); for (const cz of people) hhSize.set(cz.hh, (hhSize.get(cz.hh) || 0) + 1);
  homesIn.forEach(hm => { const n = (hhSize.get(hm.id) || 0) + hm.kids.length; if (hm.wl) wlHist[hm.wl - 1] += n; if (hm.F != null) { fSum += hm.F * n; fN += n; } });
  const cIdx = scope === 'hex' ? (G.map.hexes.find(h => h.q === idx[0] && h.r === idx[1]) || {}).k : scope === 'canton' ? +idx : null;
  const needs = { wlHist, F: fN ? fSum / fN : 1, list: (cIdx != null && G.cantons[cIdx] ? G.cantons[cIdx].needs : G.eco.needs) || [] };
  return { money, needs, pop: people.length + kids.length, adults: people.length, kids: kids.length, bands, prof, sectors, medianWage: median(sal), meanWage: sal.length ? avg(sal, x => x) : 0,
    medianIncome: median(allInc.slice().sort((a, b) => a - b)), hist, origin, edu, labor, work, unemployment: lf.length ? lf.filter(cz => !cz.emp).length / lf.length : 0, workers: workers.length, publicJobs };
}
// Edificios de una casilla y quién vive en ellos (lo pide el panel de terreno)
function workPct(id) { const w = (G.works || []).find(x => x.id === id); return w ? Math.round(100 * w.done / Math.max(1e-6, w.need)) : 100; }
// (de cualquier país: se busca el estado del país al que pertenece la casilla)
function hexInfo(q, r) {
  const hx = G.map.hexes.find(h => h.q === q && h.r === r);
  if (!hx) return null;
  if (hx.c > 0) { const f = G.foreign.find(x => x.mapIndex === hx.c); if (f && f.st) { const o = hexInfoIn(f.st, q, r); o.own = false; o.foreign = f.id; return o; } }
  return hexInfoIn(G, q, r);
}
function hexInfoIn(G, q, r) {
  const workPct = id => { const w = (G.works || []).find(x => x.id === id); return w ? Math.round(100 * w.done / Math.max(1e-6, w.need)) : 100; };
  const hx = G.map.hexes.find(h => h.q === q && h.r === r);
  if (!hx) return null;
  const out = { own: hx.c === (G.ci || 0), houses: hx.nh || 0, blocks: (hx.bb || []).map(b => ({ floors: b[0], perFloor: b[1] })), buildings: [], pop: 0, homes: 0, empty: 0, firms: [] };
  if (!out.own) return out;
  // empresas y centros públicos de la casilla, con su plantilla
  const fhere = G.firms.filter(f => f.q === q && f.r === r);
  if (fhere.length) {
    const ids = new Set(fhere.map(f => f.id));
    const staff = {}; for (const cz of G.citizens) if (cz.emp && ids.has(cz.firm)) (staff[cz.firm] = staff[cz.firm] || []).push(cz);
    const fname2 = id => (G.foreign.find(f => f.id === id) || {}).name || 'otro país';
    const P = cz => ({ n: cz.nm, s: cz.sex, a: cz.age, p: profName(cz.prof, cz.sex), o: cz.origin, f: cz.origin === 'extranjero' ? fname2(cz.from) : null, y: cz.origin === 'extranjero' ? cz.yrs : null, cu: cz.cu || null,
      inc: Math.round((cz.income || 0) * 1000 / 12), lvl: cz.lvl, owner: false, q: cz.q || null, ws: workSector(cz), wg: Math.round((cz.wg || 0) * 1000 / 12), hired: cz.hired ?? null });
    out.firms = fhere.map(f => {
      const os = f.pub == null ? ownersOf(f) : [];
      const list = (staff[f.id] || []).map(cz => Object.assign(P(cz), { owner: os.includes(cz.id) })).sort((a, b) => (b.owner ? 1 : 0) - (a.owner ? 1 : 0) || b.inc - a.inc);
      const ownerName = f.pub == null ? (list.find(x => x.owner) || {}).n || null : null;
      // socios que no trabajan en la empresa (jubilados, herederos)
      const passive = os.filter(id => !(staff[f.id] || []).some(z => z.id === id)).map(id => G.citizens.find(z => z.id === id)).filter(Boolean).map(z => ({ n: z.nm, p: profName(z.prof, z.sex), a: z.age }));
      const sp = staffSpec(f), qs = qualStats(f, workersOf(f, staff[f.id] || []));
      const K = FIRM_KINDS[f.kind] || {};
      return { id: f.id, kind: f.kind, ctype: f.ctype || null, name: f.name, pub: f.pub, ownerName, staff: list, cap: firmCap(f), target: f.target ?? null, plazas: f.plazas ?? null, lvl: !isCenterF(f) ? f.lvl || 1 : null, pe: f.pe ? 1 : 0, peOwner: f.pe ? (f.pub === 'estado' ? 'el Estado' : 'el cantón de ' + G.cantons[f.pub].name) : null, fp: f.pe ? Object.fromEntries(Object.entries(f.fp || {}).map(([g, v]) => [g, Math.round(v * 1000)])) : null,
        upg: f.upg ? workPct(f.upg) : null, perWorker: !isCenterF(f) && FIRM_KINDS[f.kind] ? Object.fromEntries(Object.entries((f.kind === 'agricultura' && f.product === 'tejido' ? FIRM_KINDS[f.kind].alt : FIRM_KINDS[f.kind].out) || {}).map(([g, v]) => [g, v * levelF(f.lvl)])) : null,
        perInp: !isCenterF(f) && FIRM_KINDS[f.kind] && (FIRM_KINDS[f.kind].inp || FIRM_KINDS[f.kind].inpAny) ? Object.fromEntries(Object.entries(inpOf(G, f.kind)).filter(([g, v]) => v > 1e-6).map(([g, v]) => [g, v * levelF(f.lvl)])) : null,
        soldPct: f.q_out && Object.keys(f.q_out).length ? 100 * sum(Object.keys(f.q_out), g => (f.q_sold || {})[g] || 0) / Math.max(1e-9, sum(Object.values(f.q_out))) : null, loss: f.loss || 0,
        wage: Math.round((f.wage || 0) * 1000 / 12), revY: f.revY || 0, vaY: f.vaY || 0, profitY: f.profitY || 0, product: f.product || null,
        out: Object.assign({}, f.q_out || {}), inp: Object.assign({}, f.q_in || {}), served: f.served ? f.served : null,
        debt: f.debt || 0, obra: f.obra ? workPct(f.obra) : null, boost: f.boostF > 1 ? Object.keys(f.q_in || {}).filter(g => FIRM_KINDS[f.kind].boost && FIRM_KINDS[f.kind].boost[g]) : [], dep: f.kind === 'banco' ? f.dep || 0 : null, loans: f.kind === 'banco' ? f.loans || 0 : null,
        jobs: f.kind === 'constructora' ? (G.works || []).filter(w => w.by === f.id).map(w => ({ t: w.t, p: Math.round(100 * w.done / w.need), units: w.t === 'bloque' ? w.fl * w.pf : w.t === 'casa' ? 1 : 0,
          what: w.t === 'firm' ? (w.up ? 'Ampliación de ' : '') + ((G.firms.find(x => x.id === w.fid) || {}).name || 'Edificio') : w.t === 'civil' ? 'Obra pública y reformas' : null,
          where: w.q != null ? placeName(G, hexAtG(G, w.q, w.r)) : null })) : null,
        unsold: f.kind === 'constructora' || f.kind === 'banco' ? Object.values(G.forSale || {}).filter(v => v.f === f.id).length : null,
        // ficha completa
        owners: os.length, partnersNeed: f.pub == null ? partnersFor(f.lvl) : 0, passive, size: !isCenterF(f) ? firmSize(f.lvl) : null, maxLvl: K.maxLvl || MAX_LVL,
        cash: f.cash || 0, acct: f.acct || null, pxOut: f.pxOut || {}, pxIn: f.pxIn || {}, unsoldPct: f.unsold != null ? f.unsold : null, born: f.born ?? 0, bank: f.bk ? ((G.firms.find(x => x.id === f.bk) || {}).name || null) : null,
        vac: (f.vac || []).map(v => ({ p: profName(v.p, 'M').replace(/a$/, 'a/o'), prof: v.p, w: Math.round(v.w * 1000 / 12), t: v.t || 0, k: v.k })), mv: f.mv != null ? f.mv : null,
        spec: sp.q ? { q: sp.q, base: sp.base, min: sp.min, max: sp.max, Q: qs.Q, N: qs.N } : { base: sp.base },
        prod: !isCenterF(f) && K.out ? { level: levelF(f.lvl), qual: f.qF || 1, boost: f.boostF || 1, inputs: f.prodF ?? 1, eq: f.eqF || 1, policy: policyFactor(G, f), idx: (G.eco.prodIdx || {})[K.sector] || 1 } : null,
        crisis: !f.pe && (f.loss || 0) >= 2, noPartner: f.noPartner || 0 };
    });
  }
  // parcelas, obras y viviendas a la venta
  const lu = lotsUsed(G);
  out.lots = { used: lu.get(q + ',' + r) || 0, cap: hexLots(G, hx) };
  out.works = (G.works || []).filter(w => w.q === q && w.r === r && w.t !== 'civil').map(w => {
    const by = G.firms.find(f => f.id === w.by);
    return { t: w.t, p: Math.round(100 * w.done / w.need), units: w.t === 'bloque' ? w.fl * w.pf : w.t === 'casa' ? 1 : 0, floors: w.fl || null, by: by ? by.name : 'Constructora extranjera',
      what: w.t === 'firm' ? ((G.firms.find(x => x.id === w.fid) || {}).name || 'Edificio') : null };
  });
  out.price = { casa: marketPrice(G, 'casa', hx, hx.k), piso: marketPrice(G, 'piso', hx, hx.k) };
  out.housingOk = isSettlement(hx) || isUrbanizable(G, hx);
  const homes = G.homes.filter(h => h.q === q && h.r === r);
  const ids = new Set(homes.map(h => h.id));
  const people = {}; for (const cz of G.citizens) if (ids.has(cz.hh)) (people[cz.hh] = people[cz.hh] || []).push(cz);
  const fname = id => (G.foreign.find(f => f.id === id) || {}).name || 'otro país';
  const person = cz => ({ n: cz.nm, s: cz.sex, a: cz.age, p: profName(cz.prof, cz.sex), emp: !!cz.emp, ws: workSector(cz), job: cz.prof !== 'parado' && !cz.emp && inLaborForce(cz) ? 'parado' : null,
    o: cz.origin, f: cz.origin === 'extranjero' ? fname(cz.from) : null, y: cz.origin === 'extranjero' ? cz.yrs : null, cu: cz.cu || null, inc: Math.round((cz.income || 0) * 1000 / 12), role: cz.role,
    sav: Math.round((cz.sav || 0) * 1000), hip: cz.hip ? { p: Math.round(cz.hip.p * 1000), y: Math.ceil(cz.hip.n / 4), ar: cz.hip.ar || 0, pay: Math.round(annuityQ(cz.hip.p, G.eco.mortRate || 0.035, cz.hip.n) * 1000 / 3) } : null,
    want: !!(cz.wantsHome && cz.role === 'hijo'), q: cz.q || null, st: cz.prof === 'estudiante' && cz.st > 0 ? cz.st : 0, sq: cz.sq || null });
  const homeOut = h => {
    const ms = (people[h.id] || []).sort((x, y) => ['titular', 'pareja', 'abuelo', 'hijo', 'companero'].indexOf(x.role) - ['titular', 'pareja', 'abuelo', 'hijo', 'companero'].indexOf(y.role) || y.age - x.age);
    return { u: h.u, sn: h.sn, adults: ms.map(person), kids: h.kids.map(k => ({ n: k.n, s: k.s, a: k.a })), wl: h.wl || null, F: h.F ?? null };
  };
  const byB = {}; homes.forEach(h => { const k = h.kind + h.b; (byB[k] = byB[k] || []).push(h); });
  if (hx.nh) for (let b = 0; b < hx.nh; b++) out.buildings.push({ kind: 'casa', idx: b, units: 1, homes: (byB['casa' + b] || []).map(homeOut) });
  (hx.bb || []).forEach(([fl, fpf], b) => out.buildings.push({ kind: 'bloque', idx: b, floors: fl, perFloor: fpf, units: fl * fpf, homes: (byB['piso' + b] || []).sort((x, y) => x.u - y.u).map(homeOut) }));
  out.buildings.forEach(b => { b.pop = sum(b.homes, h => h.adults.length + h.kids.length); out.pop += b.pop; out.homes += b.units; out.empty += b.units - b.homes.length; });
  // viviendas vacías a la venta: quién las vende y a qué precio
  out.buildings.forEach(b => {
    const kind = b.kind === 'casa' ? 'casa' : 'piso';
    const taken = new Set(b.homes.map(h => h.u));
    b.forSale = [];
    for (let u = 0; u < b.units; u++) {
      if (b.kind === 'casa' ? b.homes.length : taken.has(u)) continue;
      const key = slotKey(q, r, kind, b.idx, u), fs = (G.forSale || {})[key];
      const seller = fs && G.firms.find(f => f.id === fs.f);
      b.forSale.push({ u, price: Math.round(slotPrice(G, { q, r, c: hx.k, kind, key })), seller: seller ? seller.name : null, isNew: !!(fs && seller && seller.kind === 'constructora') });
    }
  });
  return out;
}
function hostHandleAction(pid, a) {
  const p = partyById(G, pid);
  if (!p) return { ok: false, msg: 'Jugador desconocido.' };
  const ok = (msg, data) => ({ ok: true, msg, data });
  const fail = msg => ({ ok: false, msg });
  switch (a.type) {
    case 'hexInfo': return ok(undefined, hexInfo(+a.q, +a.r));
    case 'popStats': return ok(undefined, popStats(a.scope, a.idx));
    case 'publicCenter': return publicCenterAction(p, a);
    case 'publicFirm': return publicFirmAction(p, a);
    case 'ready':
      if (G.phase === 'parties' && a.value && !p.configured) return fail('Primero funda tu partido.');
      if (G.phase === 'ministries' || G.phase === 'debate' || G.phase === 'gameover') return fail('En esta fase no hace falta.');
      G.ready[pid] = !!a.value; checkAdvance(); return ok();
    case 'chat': {
      const text = String(a.text || '').slice(0, 400).trim(); if (!text) return fail('Mensaje vacío.');
      if (a.to && !partyById(G, a.to)) return fail('Destinatario desconocido.');
      G.chat.push({ id: (G.chat.length ? G.chat[G.chat.length - 1].id + 1 : 1), from: pid, to: a.to || null, text, turn: G.turn, t: Date.now() });
      if (G.chat.length > 300) G.chat.shift();
      return ok();
    }
    case 'discard':
      if (G.phase !== 'missions') return fail('Ahora no.');
      if (p.discards <= 0) return fail('No te quedan descartes.');
      discardMission(p, a.k); return ok();
    case 'party': {
      if (G.phase !== 'parties') return fail('Ahora no.');
      const d = a.data || {};
      const name = String(d.name || '').trim().slice(0, 34);
      if (!name) return fail('Ponle nombre a tu partido.');
      if (G.players.some(x => x.id !== pid && x.configured && x.name.toLowerCase() === name.toLowerCase())) return fail('Ese nombre ya lo ha cogido otro partido.');
      if (!/^#[0-9a-f]{6}$/i.test(d.color || '')) return fail('Elige un color.');
      if (colorTaken(d.color, pid)) return fail('Ese color (o uno casi igual) ya lo usa otro partido.');
      p.name = name; p.short = String(d.short || '').toUpperCase().slice(0, 6) || name.slice(0, 3).toUpperCase();
      p.color = d.color.toLowerCase(); p.color2 = /^#[0-9a-f]{6}$/i.test(d.color2 || '') ? d.color2 : '#ffffff';
      p.logo = { shape: LOGO_SHAPES.some(s => s.id === (d.logo && d.logo.shape)) ? d.logo.shape : 'circle', icon: PARTY_ICONS_ALL.includes(d.logo && d.logo.icon) ? d.logo.icon : PARTY_ICONS_ALL[0],
        style: LOGO_STYLES.some(s => s.id === (d.logo && d.logo.style)) ? d.logo.style : 'lleno', text: p.short };
      p.candidate = { name: String((d.candidate && d.candidate.name) || p.player).trim().slice(0, 30) || p.player, face: sanitizeFace(d.candidate && d.candidate.face) };
      p.configured = true;
      return ok('Partido registrado.');
    }
    case 'debateAnswer': {
      if (G.phase !== 'debate') return fail('Ahora no.');
      if (debateCurrent().speaker.id !== pid) return fail('No es tu turno de palabra.');
      { const err = debateAnswer(a.reg != null ? { reg: +a.reg } : { idx: +a.idx }); if (err) return fail(err); }
      return ok();
    }
    case 'renameCanton': {
      if (G.phase !== 'actions') return fail('Solo durante la fase de acciones.');
      const c = G.cantons[a.canton];
      if (!liveCanton(c)) return fail('Ese cantón no existe.');
      if (c.gov.president !== pid) return fail('Solo quien preside el cantón puede cambiarle el nombre.');
      if (c.renamedTurn === G.turn) return fail('Ya le has cambiado el nombre este trimestre.');
      const v = validCantonName(G, a.name, c.idx);
      if (!v.ok) return fail(v.msg);
      if (v.name === c.name) return fail('Ese ya es su nombre.');
      const old = c.name;
      renameCanton(G, c.idx, v.name); c.renamedTurn = G.turn;
      return ok(`${old} pasa a llamarse ${v.name}.`);
    }
    case 'proposeMerge': {
      if (G.phase !== 'actions') return fail('Solo durante la fase de acciones.');
      const A = G.cantons[a.canton], B = G.cantons[a.with];
      if (!liveCanton(A) || !liveCanton(B)) return fail('Cantón desconocido.');
      if (A.gov.president !== pid) return fail('Solo quien preside el cantón puede proponer una fusión.');
      const chk = mergeCheck(G, A.idx, B.idx); if (!chk.ok) return fail(chk.msg);
      const v = validCantonName(G, a.name || A.name, [A.idx, B.idx]); if (!v.ok) return fail(v.msg);
      if (B.gov.president === pid) { mergeCantons(G, A.idx, B.idx, v.name); save(); return ok(`${A.name === v.name ? A.name : v.name}: la fusión está hecha.`); }
      if (!B.gov.president) return fail(`${B.name} no tiene gobierno con quien negociarla.`);
      G.mergeOffers = (G.mergeOffers || []).filter(o => !(o.a === A.idx && o.b === B.idx) && o.turn === G.turn);
      G.mergeOffers.push({ id: 'M' + G.turn + '_' + A.idx + '_' + B.idx, a: A.idx, b: B.idx, by: pid, to: B.gov.president, name: v.name, turn: G.turn });
      return ok(`Propuesta enviada al gobierno de ${B.name}. Tiene hasta el final del trimestre para responder.`);
    }
    case 'answerMerge': {
      const o = (G.mergeOffers || []).find(x => x.id === a.id);
      if (!o || o.turn !== G.turn) return fail('Esa propuesta ya no está en pie.');
      if (o.to !== pid) return fail('No te corresponde responderla.');
      G.mergeOffers = G.mergeOffers.filter(x => x !== o);
      const A = G.cantons[o.a], B = G.cantons[o.b];
      if (!a.yes) { logEvent(G, { kind: 'fusionRechazada', importance: 3, nameA: A.name, nameB: B.name, party: pid, by: o.by }); return ok('Has rechazado la fusión.'); }
      if (A.gov.president !== o.by || B.gov.president !== pid) return fail('Los gobiernos han cambiado: la propuesta ya no vale.');
      const chk = mergeCheck(G, o.a, o.b); if (!chk.ok) return fail(chk.msg);
      const v = validCantonName(G, o.name, [o.a, o.b]); if (!v.ok) return fail(v.msg);
      mergeCantons(G, o.a, o.b, v.name); save();
      return ok('Fusión aprobada.');
    }
    case 'declare':
      if (G.phase !== 'invDeclare') return fail('Ahora no.');
      if (!canBeCandidate(p)) return fail('Tu partido no puede presentar candidato.');
      G.inv.declared[pid] = !!a.value; return ok();
    case 'invVote':
      if (G.phase !== 'invVote') return fail('Ahora no.');
      if (!G.inv.candidates.includes(a.cand)) return fail('Candidato desconocido.');
      if (!['si', 'no', 'abs'].includes(a.value)) return fail('Voto no válido.');
      G.inv.votes[pid][a.cand] = a.value; return ok();
    case 'govDraft': {
      // el presidente enseña a los demás el reparto de carteras mientras lo prepara (formación de gobierno o remodelación)
      const resh = G.phase === 'actions';
      if (!(G.phase === 'ministries' || resh) || G.gov.president !== pid) return fail('Ahora no.');
      if (!a.map) { delete G.gov.draft; return ok(); }
      const elig = [pid].concat(G.gov.supporters || []);
      const dm = {};
      for (const mi of MINISTRIES) dm[mi.id] = elig.includes(a.map[mi.id]) ? a.map[mi.id] : pid;
      G.gov.draft = { by: pid, kind: resh ? 'reshuffle' : 'ministries', map: dm };
      return ok();
    }
    case 'ministries': {
      if (G.phase !== 'ministries' || G.gov.president !== pid) return fail('Solo el presidente forma gobierno.');
      const eligible = [pid].concat(G.gov.supporters || []);
      const m = {};
      for (const mi of MINISTRIES) m[mi.id] = eligible.includes(a.map && a.map[mi.id]) ? a.map[mi.id] : pid;
      G.gov.ministers = m; delete G.gov.draft;
      logEvent(G, { kind: 'gobierno', importance: 6, ministers: m, party: pid });
      afterGovernmentFormation(); return ok('Gobierno nombrado.');
    }
    case 'cantonSupport':
      if (G.phase !== 'cantonGov') return fail('Ahora no.');
      if (!(G.cantonSupports[a.canton] && G.cantonSupports[a.canton][pid] !== undefined)) return fail('No tienes escaños en ese cantón.');
      if (!(G.cantons[a.canton].parliament.composition[a.cand] > 0)) return fail('Ese partido no tiene escaños allí.');
      G.cantonSupports[a.canton][pid] = a.cand; return ok();
    case 'vote': {
      if (G.phase !== 'ballot') return fail('Ahora no se vota.');
      const prop = G.proposals.find(x => x.id === a.id);
      if (!prop) return fail('Propuesta desconocida.');
      if (!['si', 'no', 'abs'].includes(a.value)) return fail('Voto no válido.');
      prop.votes[pid] = a.value; return ok();
    }
    case 'advance':
      if (pid !== G.players[0].id) return fail('Solo el anfitrión puede forzar el avance.');
      forceAdvance(); return ok('Fase forzada.');
    case 'skipDebate':
      if (pid !== G.players[0].id) return fail('Solo el anfitrión puede saltarse el debate.');
      if (G.phase !== 'debate') return fail('Ahora no hay debate.');
      skipDebate(); return ok('Debate saltado: las respuestas que faltaban se han repartido al azar.');
  }
  if (G.phase !== 'actions') return fail('Las acciones solo se pueden hacer durante la fase de acciones.');
  if (G.ready[pid]) return fail('Ya has marcado que estás listo. Desmárcalo para seguir actuando.');
  const A = actor(p);
  if (typeof A[a.type] !== 'function') return fail('Acción desconocida.');
  return A[a.type](a) || fail('Acción sin efecto.');
}
function discardMission(party, k) {
  const others = party.missions.filter((_, i) => i !== k);
  const old = party.missions[k];
  if (!old) return;
  const cats = others.map(x => MISSIONS.find(m => m.id === x.id).cat);
  party.missions[k] = drawMission(G, others.map(x => x.id).concat([old.id]), cats, party);
  party.discards--;
}

// Acciones de la fase de acciones (validadas aquí, en el anfitrión)
function actor(party) {
  const ta = party.turnActions;
  const ok = (msg, data) => ({ ok: true, msg, data });
  const fail = msg => ({ ok: false, msg });
  const spend = (pc, funds) => { party.pc -= pc; party.funds -= funds; };
  const log = (txt, secret) => party.log.unshift({ turn: G.turn, text: txt, secret: !!secret });
  return {
    propose(a) {
      const pack = packById(a.pack);
      if (!pack) return fail('Ley desconocida.');
      const scope = pack.canton ? 'cantonal' : 'nacional';
      if (scope === 'cantonal' && !G.cantons[a.canton]) return fail('Elige un cantón.');
      // como mucho dos nacionales y dos en cada cantón por trimestre
      const key = scope === 'nacional' ? 'nat' : 'cant_' + a.canton;
      if ((ta[key] || 0) >= 2) return fail(scope === 'nacional' ? 'Ya has presentado dos propuestas nacionales este trimestre.' : `Ya has presentado dos propuestas en ${G.cantons[a.canton].name} este trimestre.`);
      const why = canProposePack(G, party, pack, scope, a.canton);
      if (why) return fail(why);
      const avail = packFields(G, pack).map(f => f.id);
      const changes = {};
      for (const fid in (a.changes || {})) {
        if (!avail.includes(fid)) continue;
        const f = fieldById(G, fid); const v = a.changes[fid];
        if (!fieldValueOk(f, v)) return fail('Valor no válido para ' + f.name + '.');
        if (!sameVal(fieldValue(G, f, scope, a.canton), v)) changes[fid] = Array.isArray(v) ? GOOD_IDS.filter(g => v.includes(g)) : v;
      }
      if (!Object.keys(changes).length) return fail('La propuesta no cambia nada respecto a la situación actual.');
      if (a.decree && (G.gov.president !== party.id || G.gov.interim)) return fail('Solo el presidente (no en funciones) puede aprobar decretos-ley.');
      const organic = scope === 'nacional' && (pack.organic || Object.keys(changes).some(fid => fieldById(G, fid).organic));
      if (a.decree && organic) return fail('Las leyes orgánicas no pueden aprobarse por decreto.');
      if (G.proposals.some(p => p.pack === pack.id && p.scope === scope && p.canton === (scope === 'cantonal' ? a.canton : null))) return fail('Ya hay una propuesta sobre esta ley en este trimestre.');
      const cost = proposalCost(G, party, pack, scope, { decree: a.decree, canton: a.canton });
      if (party.pc < cost) return fail(`Necesitas ${cost} PC.`);
      const prop = makeProposal(G, party, pack.id, changes, { scope, canton: scope === 'cantonal' ? a.canton : null, decree: !!a.decree, cost });
      spend(cost, 0); ta[key] = (ta[key] || 0) + 1;
      G.proposals.push(prop);
      log(`Propone: ${proposalTitle(G, prop)} (${proposalSummary(G, prop)})${a.decree ? ' como decreto-ley' : ''}`);
      return ok('Propuesta registrada. Se votará en el pleno.');
    },
    withdraw(a) {
      const i = G.proposals.findIndex(x => x.id === a.id && x.proposer === party.id);
      if (i < 0) return fail('No es una propuesta tuya.');
      const prop = G.proposals[i];
      G.proposals.splice(i, 1);
      party.pc += prop.cost || 0;
      if (prop.kind === 'censura') ta.censure = 0; else { const key = prop.scope === 'nacional' ? 'nat' : 'cant_' + prop.canton; ta[key] = Math.max(0, (ta[key] || 1) - 1); }
      return ok('Propuesta retirada. Recuperas el capital político.');
    },
    censure() {
      if (!G.gov.president || G.gov.president === party.id) return fail('No hay un Gobierno al que censurar.');
      if (ta.censure) return fail('Ya has presentado una moción este trimestre.');
      if (G.proposals.some(p => p.kind === 'censura')) return fail('Ya hay una moción de censura en marcha.');
      if (!canBeCandidate(party)) return fail('Tu partido no puede presentar candidato ahora mismo.');
      if (party.pc < 4) return fail('Necesitas 4 PC.');
      spend(4, 0); ta.censure = 1;
      G.proposals.push({ id: 'C' + G.turn + '_' + party.id, kind: 'censura', proposer: party.id, scope: 'nacional', votes: {}, result: null, turn: G.turn, cost: 4, canton: null });
      log('Presenta una moción de censura');
      return ok('Moción de censura registrada.');
    },
    campaign(a) {
      const amount = [50, 100, 200, 400].includes(a.amount) ? a.amount : 100;
      if ((ta.campaign || 0) >= 2) return fail('Máximo dos campañas por trimestre.');
      if (party.pc < 1 || party.funds < amount) return fail('Necesitas 1 PC y fondos suficientes.');
      const t = a.target || { type: 'nacional' };
      spend(1, amount); ta.campaign = (ta.campaign || 0) + 1;
      campaignEffect(G, party, t, amount);
      log(`Campaña publicitaria (${fmt.k(amount)})`);
      return ok('Campaña lanzada.');
    },
    rally() {
      if (ta.rally) return fail('Ya has celebrado un mitin este trimestre.');
      if (party.pc < 1 || party.funds < 20) return fail('Necesitas 1 PC y 20 k€.');
      spend(1, 20); ta.rally = 1; rallyEffect(G, party);
      log('Gran mitin del partido');
      return ok('Mitin celebrado: tus votantes afines se movilizan.');
    },
    donations() {
      if (ta.donations) return fail('Ya has organizado una cena de donantes este trimestre.');
      if (G.pol.financiacion === 'publica') return fail('Las donaciones privadas están prohibidas.');
      if (party.pc < 1) return fail('Necesitas 1 PC.');
      const amt = donationAmount(G, party);
      spend(1, -amt); ta.donations = 1;
      log(`Cena de donantes: ${fmt.k(amt)}`);
      return ok(`Recaudas ${fmt.k(amt)}.`);
    },
    poll(a) {
      const t = POLL_TIERS.find(x => x.id === a.tier);
      if (!t) return fail('Encuesta desconocida.');
      const scopes = pollScopes(G, party), key = JSON.stringify(a.scope ?? null);
      const scope = scopes.find(x => JSON.stringify(x) === key);
      if (scope === undefined) return fail(party.regional != null ? 'Solo puedes encargar encuestas en los cantones donde te presentas.' : 'Ámbito de encuesta no válido.');
      if (party.funds < pollCost(G, t, scope)) return fail('No tienes fondos suficientes.');
      runPoll(G, party, t.id, scope);
      log(`Encarga: ${t.name}`);
      return ok('Encuesta recibida. La tienes en la pestaña Encuestas.');
    },
    commission(a) {
      if (ta.commission) return fail('Ya has impulsado una comisión este trimestre.');
      if (party.pc < 2) return fail('Necesitas 2 PC.');
      const t = partyById(G, a.target);
      if (!t || t.id === party.id) return fail('Elige otro partido.');
      if (isGovParty(G, party.id) && isGovParty(G, t.id)) return fail('No puedes investigar a tus socios de Gobierno.');
      spend(2, 0); ta.commission = 1;
      t.investigated = { mult: 2.5, by: party.id };
      logEvent(G, { kind: 'comision', importance: 4, party: party.id, target: t.id });
      log(`Comisión de investigación sobre ${t.name}`);
      return ok(`Comisión creada: si ${t.name} esconde algo, es más probable que salga a la luz este trimestre.`);
    },
    corruption(a) {
      const def = CORRUPTION_ACTIONS.find(c => c.id === a.id);
      if (!def) return fail('Acción desconocida.');
      if (ta['cor_' + def.id]) return fail('Ya has hecho eso este trimestre.');
      if (party.pc < def.pc || party.funds < def.funds) return fail('No tienes recursos suficientes.');
      if (def.needsGov && !isGovParty(G, party.id) && !cantonsGovernedBy(G, party.id).length) return fail('Necesitas gobernar (en el país o en un cantón).');
      if (def.needsCanton && !cantonsGovernedBy(G, party.id).length) return fail('Necesitas gobernar algún cantón.');
      let target = null;
      if (def.id === 'espionaje') { target = partyById(G, a.target); if (!target || target.id === party.id) return fail('Elige otro partido.'); }
      spend(def.pc, def.funds); ta['cor_' + def.id] = 1;
      party.evidence = Math.max(0, party.evidence + def.evidence);
      let msg = '';
      if (def.id === 'sobres') { const x = Math.round(RNG.range(150, 300)); party.funds += x; msg = `Ingresas ${fmt.k(x)} en B.`; }
      if (def.id === 'comisiones') { const x = Math.round(RNG.range(250, 450)); party.funds += x; G.eco.waste += G.eco.gdp * 0.0015; msg = `Ingresas ${fmt.k(x)}. La obra se encarece.`; }
      if (def.id === 'clientelismo') {
        const gv = cantonsGovernedBy(G, party.id);
        const c = gv.find(x => x.idx === a.canton) || gv[0];
        groupEffect(G, cz => cz.c === c.idx && cz.lvl <= 3, party.id, 0.5);
        msg = `Tu red clientelar se extiende por ${c.name}.`;
      }
      if (def.id === 'espionaje') {
        party.intel.unshift({ turn: G.turn, target: target.id, evidence: target.evidence });
        msg = `${target.name} acumula un nivel de pruebas de ${fmt.num(target.evidence, 1)}.`;
        if (a.leak && target.evidence >= 1.5) { scandal(G, target, 'Una filtración destapa irregularidades', party.id); msg += ' Lo filtras a la prensa y estalla el escándalo.'; }
        else if (a.leak) msg += ' No hay material suficiente para filtrar nada.';
      }
      if (def.id === 'abogados') msg = 'Tus pruebas comprometedoras se reducen.';
      log(def.name, true);
      return ok(msg + ` Pruebas acumuladas: ${fmt.num(party.evidence, 1)}.`);
    },
    ministry(a) {
      const mid = a.id;
      if (G.gov.ministers[mid] !== party.id) return fail('No ocupas ese ministerio.');
      if (ta['min_' + mid]) return fail('Ya has usado ese ministerio este trimestre.');
      if (party.pc < 1) return fail('Necesitas 1 PC.');
      let msg = '';
      const pct = x => Math.round(x * 100) / 100;
      if (mid === 'hacienda') {
        const { from, to } = a;
        const items = Object.keys(G.pol.gasto).filter(k => !AREA_IDS.includes(k) || natApplies(G.pol, k));
        if (!items.includes(from) || !items.includes(to) || from === to) return fail('Elige dos partidas distintas del Estado.');
        const amt = clamp(+a.amount || 0.5, 0.01, 0.5);
        if ((G.pol.gasto[from] || 0) < amt) return fail('Esa partida no tiene tanto dinero.');
        G.pol.gasto[from] = pct(G.pol.gasto[from] - amt);
        G.pol.gasto[to] = pct((G.pol.gasto[to] || 0) + amt);
        logEvent(G, { kind: 'hacienda', importance: 4, party: party.id, from, to, amount: amt });
        msg = `Se trasladan ${num2(amt)} puntos de PIB.`;
      } else if (mid === 'interior') {
        if (a.mode === 'investigar') {
          const t = partyById(G, a.target);
          if (!t || t.id === party.id) return fail('Elige otro partido.');
          t.investigated = { mult: 3, by: party.id };
          msg = `La policía investiga a ${t.name}.`;
        } else {
          party.evidence = Math.max(0, party.evidence - 1.5) + 0.4;
          msg = 'Las pruebas contra tu partido se "enfrían"... por ahora.';
        }
      } else if (mid === 'exteriores') {
        const f = G.foreign.find(x => x.id === a.country);
        if (!f || G.pol.tratados[f.id]) return fail('Elige un país sin tratado.');
        if (G.proposals.some(p => p.pack === 'comercio')) return fail('Ya hay una propuesta de comercio este trimestre.');
        // su Gobierno tiene que querer (según su ideología y cómo se lleva con el nuestro)
        if (!f.st || !RNG.chance(Math.min(0.95, treatyStance(f.st, 'f0') + 0.15))) { party.pc -= 1; ta['min_' + mid] = 1; f.friendliness = Math.min(0.95, (f.friendliness || 0.5) + 0.1); return ok(`El Gobierno de ${f.name} no quiere negociar un tratado por ahora (insistir mejora la relación).`); }
        const changes = {}; changes['tratado_' + f.id] = true;
        const prop = makeProposal(G, party, 'comercio', changes, { scope: 'nacional', free: true });
        prop.foreign = f.id;   // ya pactado con su Gobierno: si nuestras Cortes lo aprueban, entra en vigor
        G.proposals.push(prop);
        logEvent(G, { kind: 'tratadoNegociado', importance: 4, party: party.id, foreign: f.id });
        msg = `Tratado negociado con ${f.name}: su Gobierno lo acepta. Irá al pleno sin coste.`;
      } else if (mid === 'economia') {
        if (a.mode === 'inversion') {
          G.eco.plans.inversion = 2;
          groupEffect(G, cz => citizenStatus(cz) === 'empresario', party.id, 0.15);
          logEvent(G, { kind: 'plan', importance: 3, party: party.id, area: 'inversion' });
          msg = 'Plan de atracción de inversiones en marcha.';
        } else {
          const opts = FIELDS.salarioMin.options;
          let i = opts.indexOf(G.pol.salarioMin); if (i < 0) i = 2;
          const j = clamp(i + (a.dir === 'up' ? 1 : -1), 0, opts.length - 1);
          if (i === j) return fail('No se puede mover más.');
          G.pol.salarioMin = opts[j];
          groupEffect(G, cz => ['operario', 'agricultor', 'pescador', 'parado'].includes(citizenStatus(cz)), party.id, a.dir === 'up' ? 0.15 : -0.15);
          groupEffect(G, cz => citizenStatus(cz) === 'empresario', party.id, a.dir === 'up' ? -0.15 : 0.15);
          logEvent(G, { kind: 'smi', importance: 5, party: party.id, dir: a.dir, value: opts[j] });
          msg = 'Salario mínimo ajustado por decreto.';
        }
      } else if (mid === 'sanidad' || mid === 'educacion' || mid === 'transporte') {
        if (!natApplies(G.pol, mid)) return fail('La competencia está transferida por completo a los cantones.');
        G.eco.plans[mid] = 2;
        G.eco.extraSpend = (G.eco.extraSpend || 0) + G.eco.gdp * 0.002;
        const grp = { sanidad: 'sanitario', educacion: 'academico', transporte: 'operario' }[mid];
        groupEffect(G, cz => citizenStatus(cz) === grp, party.id, 0.3);
        logEvent(G, { kind: 'plan', importance: 3, party: party.id, area: mid });
        msg = mid === 'transporte' ? 'Plan de obras en marcha.' : 'Plan de choque en marcha.';
      } else if (mid === 'social') {
        G.eco.plans.social = 2;
        G.eco.extraSpend = (G.eco.extraSpend || 0) + G.eco.gdp * 0.002;
        groupEffect(G, cz => cz.lvl <= 2 || citizenStatus(cz) === 'parado', party.id, 0.18);
        logEvent(G, { kind: 'plan', importance: 3, party: party.id, area: 'social' });
        msg = 'Plan contra la pobreza en marcha.';
      } else return fail('Ministerio desconocido.');
      party.pc -= 1; ta['min_' + mid] = 1;
      log(`Ministerio de ${MINISTRIES.find(m => m.id === mid).name}: ${msg}`);
      return ok(msg);
    },
    dissolve() {
      if (G.gov.president !== party.id || G.gov.interim) return fail('Solo el presidente puede disolver las Cortes.');
      if (G.elections.lastNational !== null && G.turn - G.elections.lastNational < 2) return fail('No se puede disolver justo después de unas elecciones.');
      if (party.pc < 2) return fail('Necesitas 2 PC.');
      spend(2, 0); G.elections.nextNational = G.turn;
      logEvent(G, { kind: 'disolucion', importance: 9, party: party.id });
      log('Disuelve las Cortes');
      return ok('Habrá elecciones al final de este trimestre.');
    },
    pardon(a) {
      if (G.gov.president !== party.id) return fail('Solo el presidente puede indultar.');
      if (ta.pardon) return fail('Ya has indultado este trimestre.');
      if (party.pc < 2) return fail('Necesitas 2 PC.');
      const t = partyById(G, a.target);
      if (!t || !t.imputado) return fail('Ese partido no tiene a nadie imputado.');
      spend(2, 0); ta.pardon = 1;
      t.imputado = 0; t.pop += 0.15; party.pop -= 0.15; G.eco.scandalHeat += 3;
      logEvent(G, { kind: 'indulto', importance: 8, party: party.id, target: t.id });
      log(`Indulta a ${t.name}`);
      return ok('Indulto concedido. La oposición pone el grito en el cielo.');
    },
    reshuffle(a) {
      if (G.gov.president !== party.id) return fail('Solo el presidente puede remodelar el Gobierno.');
      if (ta.reshuffle) return fail('Ya has remodelado el Gobierno este trimestre.');
      if (party.pc < 1) return fail('Necesitas 1 PC.');
      const eligible = [party.id].concat(G.gov.supporters || []);
      const m = {};
      for (const mi of MINISTRIES) m[mi.id] = eligible.includes(a.map && a.map[mi.id]) ? a.map[mi.id] : party.id;
      spend(1, 0); ta.reshuffle = 1;
      G.gov.ministers = m; delete G.gov.draft;
      logEvent(G, { kind: 'remodelacion', importance: 5, party: party.id, ministers: m });
      log('Remodela el Gobierno');
      return ok('Nuevo Gobierno.');
    },
    inaugurate(a) {
      const c = G.cantons[a.canton];
      if (!c || c.gov.president !== party.id) return fail('No gobiernas ese cantón.');
      if (ta['inaug_' + c.idx]) return fail('Ya has inaugurado algo allí este trimestre.');
      if (party.pc < 1 || party.funds < 30) return fail('Necesitas 1 PC y 30 k€.');
      spend(1, 30); ta['inaug_' + c.idx] = 1;
      groupEffect(G, cz => cz.c === c.idx, party.id, 0.25);
      logEvent(G, { kind: 'inauguracion', importance: 2, party: party.id, canton: c.idx });
      log(`Inaugura obras en ${c.name}`);
      return ok(`Corte de cinta en ${c.name}. Buena prensa local.`);
    },
  };
}

// ============================================================
//  Vista de la partida para cada jugador (oculta lo privado)
// ============================================================
const PRIVATE_KEYS = ['missions', 'polls', 'intel', 'log', 'turnActions', 'evidence', 'pc', 'funds', 'discards', 'investigated', 'token', 'pop', 'rec'];
function viewFor(pid) {
  const v = {};
  for (const k in G) {
    if (k === 'citizens' || k === 'homes' || k === 'firms' || k === 'map' || k === 'players' || k === 'chat' || k === 'papers' || k === 'lawLog' || k[0] === '_'
      || k === 'works' || k === 'forSale' || k === 'hdem' || k === 'bldMod' || k === 'fmarkets' || k === 'foreign' || k === 'treatyOffers') continue;
    v[k] = G[k];
  }
  const out = JSON.parse(JSON.stringify(v, numRound));
  out.me = pid;
  out.lawLog = JSON.parse(JSON.stringify(G.lawLog.slice(-30), numRound));
  // empresas y centros públicos (lo justo para el mapa y para los gobiernos)
  const worksById = new Map((G.works || []).map(w => [w.id, w]));
  const pct = w => w ? Math.round(100 * w.done / Math.max(1e-6, w.need)) : 100;
  // (de todos los países: los extranjeros llevan el número de su país en «x»)
  out.firms = []; out.bld = []; out.works = [];
  worldStates(G).forEach(S => {
    const wById = new Map((S.works || []).map(w => [w.id, w]));
    const pc = w => w ? Math.round(100 * w.done / Math.max(1e-6, w.need)) : 100;
    const x = S === G ? undefined : S.ci;
    S.firms.forEach(f => out.firms.push(Object.assign({ id: f.id, k: f.kind, ct: f.ctype || null, q: f.q, r: f.r, c: f.c, pub: f.pub, n: f.staffN || 0, tg: f.target ?? null, lv: f.lvl || 1, name: f.name, ob: f.obra ? pc(wById.get(f.obra)) : null, x,
      // (centros públicos: plazas y sueldo fijados; centros privados de sanidad o educación: lo que costaría comprarlos)
      cap: x == null && f.pub != null && (f.ctype || f.pe) ? firmCap(f) : undefined, pl: f.plazas ?? undefined, pay: f.pay ? Math.round(f.pay * 1000 / 12) : undefined,
      // (sueldo público de referencia del puesto principal, y qué puesto cualificado pide y en qué proporción)
      pw: x == null && f.pub != null && (f.ctype || f.pe) ? Math.round(publicWage(S, staffSpec(f).q || staffSpec(f).base) * 1000 / 12) : undefined,
      pq: x == null && f.pub != null && (f.ctype || f.pe) ? staffSpec(f).q || null : undefined, qm: x == null && f.pub != null && (f.ctype || f.pe) ? staffSpec(f).min || 0 : undefined,
      bp: x == null && f.pub != null && (f.ctype || f.pe) ? staffSpec(f).base : undefined,
      // (lo que costaría comprar una empresa privada: lo que vale y su deuda)
      val: x == null && f.pub == null && (f.kind === 'sanidad' || f.kind === 'educacion' || PE_KINDS.includes(f.kind)) && !f.obra ? Math.round(firmValue(S, f) + Math.max(0, f.debt || 0)) : undefined },
      x == null && f.pe ? peView(S, f) : null)));
    // viviendas construidas durante la partida (el mapa estático no las tiene) y obras de viviendas en marcha
    (S.bldMod || []).forEach(k => { const h = hexAtG(S, ...k.split(',').map(Number)); if (h) out.bld.push({ q: h.q, r: h.r, nh: h.nh || 0, bb: h.bb || [] }); });
    (S.works || []).filter(isHomeWork).forEach(w => out.works.push({ q: w.q, r: w.r, t: w.t, fl: w.fl, pf: w.pf, p: pc(w) }));
  });
  void worksById; void pct;
  // los otros países: su economía, sus partidos, su Parlamento, sus leyes y su gente
  out.peLaw = peShare(G);
  out.foreign = G.foreign.map(f => foreignView(G, f));
  out.cultures2 = Object.fromEntries(Object.entries(NATION_CULTURES).map(([k, c]) => [k, c.name]));
  delete out.eco.basket0;
  // de los distritos solo enviamos quién ganó cada uno (para el sistema mayoritario)
  if (out.parliament && out.parliament.lastElection) out.parliament.lastElection.byCanton.forEach(b => {
    b.winners = (b.districts || []).map(d => { let best = null, bv = 0; for (const k in d) if (d[k] > bv) { bv = d[k]; best = k; } return best; });
    delete b.districts;
  });
  // las propuestas del trimestre son secretas hasta el pleno: cada uno ve solo las suyas
  if (G.phase === 'actions' && out.proposals) out.proposals = out.proposals.filter(pr => pr.proposer === pid || pr.foreign);
  out.players = G.players.map(p => {
    const c = JSON.parse(JSON.stringify(p, numRound));
    if (p.id === pid) {
      // misiones con su progreso, calculado aquí para no enviar a la ciudadanía
      c.missions = p.missions.map(m => { const d = missionDef(m); const r = d.check(G, p, m.params); return Object.assign({}, m, { title: d.title, cat: d.cat, text: d.text(m.params), progress: r.progress }); });
      c.detection = detectionProbability(G, p);
      delete c.token;
      return c;
    }
    PRIVATE_KEYS.forEach(k => delete c[k]);
    c.missions = G.phase === 'gameover'
      ? p.missions.map(m => { const d = missionDef(m); return Object.assign({}, m, { title: d.title, cat: d.cat, text: d.text(m.params) }); })
      : p.missions.map(m => ({ done: m.done, doneTurn: m.doneTurn }));
    c.pollCount = p.polls.length;
    return c;
  });
  // durante las votaciones, solo se ve el voto propio
  if (G.phase === 'ballot') out.proposals.forEach(pr => { for (const k in pr.votes) if (k !== pid) pr.votes[k] = pr.votes[k] ? 'oculto' : null; });
  if (G.phase === 'cantonGov' && out.cantonSupports) { const cs = {}; for (const c in out.cantonSupports) { cs[c] = {}; if (out.cantonSupports[c][pid] !== undefined) cs[c][pid] = out.cantonSupports[c][pid]; } out.cantonSupports = cs; }
  if (G.phase === 'invVote' && out.inv) for (const k in out.inv.votes) if (k !== pid) { const o = out.inv.votes[k]; for (const c in o) o[c] = o[c] ? 'oculto' : null; }
  out.chat = G.chat.filter(m => !m.to || m.to === pid || m.from === pid);
  // cantones vecinos (para proponer fusiones); se recalcula solo si cambia el mapa
  if (!G._adj || G._adj.ver !== (G.mapVer || 0)) G._adj = { ver: G.mapVer || 0, adj: cantonAdjacency(G).map(x => [...x]) };
  out.cadj = G._adj.adj;
  const me = partyById(G, pid);
  out.derived = {
    maj: absMajority(G.parliament.seats),
    income: me ? partyIncome(G, me) : null,
    debateCurrent: G.phase === 'debate' ? (() => { const c = debateCurrent(); return { blockIdx: G.debate.block, blockTitle: c.block.title, axis: c.block.axis, q: c.question.q,
      answers: c.ans.map(i => ({ i, t: c.question.a[i].t, fx: c.question.a[i].fx })), speaker: c.speaker.id, remaining: c.remaining,
      reg: debateRegOptions(G, c.speaker, c.block), regCap: regionalCap(G), regCount: regionalCount(G) }; })() : null,
    available: {
      nacional: availablePacks(G, 'nacional').map(p => ({ id: p.id, fields: packFields(G, p).map(f => f.id) })),
      cantonal: availablePacks(G, 'cantonal').map(p => ({ id: p.id, fields: packFields(G, p).map(f => f.id) })),
    },
    spread: spreadBps(G),
  };
  return out;
}
