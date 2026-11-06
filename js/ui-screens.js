// ============================================================
//  PANTALLAS DE CADA FASE (paneles sobre la escena 3D)
// ============================================================
'use strict';

const SPEND_ICONS = Object.assign({ administracion: 'building-2', pensiones: 'users', desempleo: 'briefcase', rentaBasica: 'hand-coins', intereses: 'percent', corrupcion: 'triangle-alert', planes: 'sparkles', compraCentros: 'hand-coins', plantillaExtra: 'users', perdidasEmpresas: 'factory', inversionEmpresas: 'factory', carreteras: 'route', ferrocarriles: 'train-front', vivienda: 'house', rescates: 'landmark', ayudasInversion: 'factory', cupo: 'handshake', identidad: 'flag' },
  ...NAT_SPEND.concat(CANT_SPEND, STANDALONE).map(x => ({ [x.id]: x.icon })));
const SPEND_NAMES = Object.assign({ administracion: 'Administración', pensiones: 'Pensiones', desempleo: 'Prestaciones por desempleo', rentaBasica: 'Renta básica',
  intereses: 'Intereses de la deuda', corrupcion: 'Sobrecostes', planes: 'Planes de choque', compraCentros: 'Compra de centros privados', perdidasEmpresas: 'Pérdidas de las empresas públicas', inversionEmpresas: 'Compra, obras y ampliación de empresas públicas', carreteras: 'Construcción de carreteras', ferrocarriles: 'Construcción de vías de tren', plantillaExtra: 'Plantillas de centros públicos por encima del presupuesto', vivienda: 'Cheque vivienda', rescates: 'Rescates bancarios', ayudasInversion: 'Ayudas a la inversión empresarial', cupo: 'Cupo al Estado (concierto)', identidad: 'Lengua, cultura y símbolos propios' }, ...NAT_SPEND.concat(CANT_SPEND, STANDALONE).map(x => ({ [x.id]: x.name })));
const liveCantonsV = () => V.cantons.filter(c => !c.merged);
const REV_ICONS = Object.assign({ carbono: 'leaf', aranceles: 'ship', otros: 'coins', empresasPublicas: 'factory', privatizaciones: 'hand-coins', transferencias: 'map', cupo: 'handshake', concierto: 'handshake' }, ...TAXES.map(t => ({ [t.id]: t.icon })));
const REV_NAMES = Object.assign({ carbono: 'Impuesto al carbono', aranceles: 'Aranceles', otros: 'Otros ingresos (patrimonio)', empresasPublicas: 'Beneficios de las empresas públicas', transferencias: 'Transferencias del Estado', cupo: 'Cupo de los cantones con concierto', concierto: 'Tributos concertados (impuestos del Estado)', privatizaciones: 'Privatizaciones (venta de centros y empresas públicas)' }, ...TAXES.map(t => ({ [t.id]: t.name })));

// ---------- Selector de símbolo: grupos curados + búsqueda en todo el catálogo Lucide ----------
let iconQuery = '';
let iconPool = null;
const normIcon = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function iconButton(ic, D) {
  const name = logoIconName(ic);
  const b = h('button', { type: 'button', class: 'icon-btn logo-pick' + (D.logo.icon === ic ? ' on' : ''), title: name, 'aria-label': name, onclick: () => { D.logo.icon = ic; render(); } });
  b.innerHTML = logoSVG(Object.assign({}, D.logo, { icon: ic, text: D.short || 'AB' }), D.color, D.color2, 34);
  return b;
}
function fillIconHits(box, q, D) {
  if (!iconPool) iconPool = [...new Set(PARTY_ICONS_ALL.concat(LUCIDE_ALL_IDS))];
  const words = normIcon(q).split(/\s+/).filter(Boolean);
  const hits = iconPool.filter(id => { const hay = normIcon(id + ' ' + logoIconName(id)); return words.every(w => hay.includes(w)); });
  const MAX = 300;
  box.replaceChildren(...hits.slice(0, MAX).map(ic => iconButton(ic, D)));
  if (!hits.length) box.appendChild(h('div', { class: 'small muted', style: { gridColumn: '1 / -1' } }, 'Ningún símbolo coincide con «' + q.trim() + '».'));
  else if (hits.length > MAX) box.appendChild(h('div', { class: 'small muted', style: { gridColumn: '1 / -1' } }, 'Mostrando ' + MAX + ' de ' + hits.length + '. Escribe más para acotar.'));
}
function symbolField(D) {
  const hitsBox = h('div', { class: 'icon-grid icon-hits', style: { display: 'none', maxHeight: '240px', overflowY: 'auto' } });
  const groups = h('div', { 'data-sk': 'icons', class: 'icon-groups' }, LOGO_ICON_GROUPS.map(g => h('div', null, h('div', { class: 'small muted icon-group-name' }, g.name),
    h('div', { class: 'icon-grid' }, g.ids.map(ic => iconButton(ic, D))))));
  const search = h('input', { type: 'search', class: 'icon-search', placeholder: 'Buscar en todo el catálogo: tren, mano, sol…', 'aria-label': 'Buscar símbolo', value: iconQuery,
    oninput: e => { iconQuery = e.target.value; const on = !!iconQuery.trim(); groups.style.display = on ? 'none' : ''; hitsBox.style.display = on ? '' : 'none'; if (on) fillIconHits(hitsBox, iconQuery, D); } });
  if (iconQuery.trim()) { groups.style.display = 'none'; hitsBox.style.display = ''; fillIconHits(hitsBox, iconQuery, D); }
  return h('div', { class: 'field' }, h('label', null, 'Símbolo ', h('span', { class: 'small muted' }, '· ' + logoIconName(D.logo.icon))), search, groups, hitsBox);
}

// ---------- textos de fase ----------
const PHASE_HELP = {
  world: 'Echad un vistazo al país. Podéis girar el mapa, acercaros y tocar cantones o países vecinos.',
  missions: 'Lee tus misiones secretas. Puedes descartar hasta dos cartas.',
  parties: 'Funda tu partido: nombre, colores, logotipo y candidato.',
  debate: 'Debate inaugural: responde cuando te toque la palabra.',
  ideology: 'Así os ve la ciudadanía tras el debate.',
  election: 'Resultados electorales.',
  invDeclare: 'Decide si tu partido presenta candidato a la presidencia.',
  invVote: 'Vota a cada candidato. Es el momento de negociar.',
  invResult: 'Resultado de la votación de investidura.',
  ministries: 'El presidente forma su Gobierno.',
  cantonGov: 'En cada cantón donde tengas escaños, decide a quién apoyas.',
  cantonGovResult: 'Así quedan los gobiernos cantonales.',
  news: 'La prensa cuenta lo que ha pasado este trimestre.',
  actions: 'Haz tus movimientos del trimestre. Todos actuáis a la vez.',
  ballot: 'Pleno: vota todas las propuestas del trimestre.',
  sessionResult: 'Resultados del pleno.',
  gameover: 'Fin de la partida.',
};

// ============================================================
//  BARRA SUPERIOR E INFERIOR
// ============================================================
function topBar() {
  const p = me();
  const unread = V.chat.filter(m => m.id > UI.chatSeen && m.from !== V.me).length;
  const players = h('div', { class: 'players-strip' }, V.players.map(x => {
    const st = h('span', { class: 'pl' + (x.id === V.me ? ' me' : '') + (x.online ? '' : ' off'), title: `${x.player}${x.online ? '' : ' (desconectado)'}${V.ready[x.id] ? ' · listo' : ''}` },
      x.configured ? partyLogo(x, 22) : h('span', { class: 'pl-dot' }), h('span', { class: 'pl-nm' }, x.short || x.player),
      V.ready[x.id] ? icon('circle-check', { size: 14, cls: 'ok' }) : null);
    return st;
  }));
  const canToggle = ['actions', 'news', 'world', 'cantonGovResult', 'cantonGov', 'election', 'sessionResult', 'ballot', 'invVote', 'invDeclare', 'invResult'].includes(V.phase);
  const scene = currentSceneName();
  return h('div', null, h('div', { class: 'topbar glass' },
    h('div', { class: 'brand' }, logoMark(), h('span', null, 'Hemiciclo')),
    h('div', { class: 'when' }, h('b', null, 'República de ' + V.country.name), h('span', null, quarterLabelV()), h('span', { class: 'phase' }, PHASE_NAMES[V.phase] || V.phase)),
    players, h('span', { class: 'spacer' }),
    canToggle ? h('div', { class: 'seg' },
      h('button', { type: 'button', class: scene === 'map' ? 'on' : '', onclick: () => { UI.viewOverride = 'map'; render(); } }, icon('map', { size: 16 }), 'Mapa'),
      h('button', { type: 'button', class: scene === 'chamber' ? 'on' : '', onclick: () => { UI.viewOverride = 'chamber'; render(); } }, icon('landmark', { size: 16 }), 'Hemiciclo')) : null,
    btn(unread ? String(unread) : '', () => { UI.chatOpen = !UI.chatOpen; renderChat(); render(); }, { kind: 'ghost' + (unread ? ' badge' : ''), icon: 'message-square-quote', title: 'Chat' }),
    btn('', openMenu, { kind: 'ghost', icon: 'settings', title: 'Menú' })), V.turn >= 0 ? indicatorStrip() : null);
}
function quarterLabelV() { return V.turn <= 0 ? 'Fundación' : `${['1.er', '2.º', '3.er', '4.º'][(V.turn - 1) % 4]} trimestre de ${START_YEAR + Math.floor((V.turn - 1) / 4)} · ${V.turn}/${V.maxTurns}`; }
function timerText() {
  const ms = Math.max(0, (UI.timerEnd || 0) - Date.now()), s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function tickPhaseTimer() {
  const el = document.getElementById('phase-timer'); if (!el || !V || V.timerLeft == null) return;
  const left = (UI.timerEnd || 0) - Date.now();
  const b = el.querySelector('b'); if (b) b.textContent = timerText();
  el.classList.toggle('urgent', left <= 20000);
  if (left <= 20000 && left > 19000 && !UI.timerWarned) { UI.timerWarned = true; toast('Quedan 20 segundos para actuar.', 'bad'); }
}
function bottomBar() {
  const ready = !!V.ready[V.me];
  const online = V.players.filter(p => p.online);
  const nReady = online.filter(p => V.ready[p.id]).length;
  const needsReady = READY_PHASES.includes(V.phase);
  const isHostP = Client.isHost;
  const labels = { world: 'Listo', missions: 'Guardar mis misiones', parties: 'Listo', ideology: 'A las urnas', election: 'Continuar', invDeclare: 'Confirmar', invVote: 'Emitir mi voto',
    invResult: 'Continuar', cantonGov: 'Confirmar apoyos', cantonGovResult: 'Continuar', news: 'Pasar a la acción', actions: 'He terminado', ballot: 'Emitir mis votos', sessionResult: 'Continuar' };
  return h('div', { class: 'bottombar glass' },
    h('div', { class: 'help' }, PHASE_HELP[V.phase] || ''),
    h('span', { class: 'spacer' }),
    V.timerLeft != null && V.phase === 'actions' ? h('span', { class: 'phase-timer', id: 'phase-timer', title: 'Tiempo que queda para actuar este trimestre' }, icon('hourglass', { size: 15 }), h('b', null, timerText())) : null,
    needsReady ? h('span', { class: 'ready-count' }, `${nReady}/${online.length} listos`) : null,
    isHostP && (needsReady || V.phase === 'debate' || V.phase === 'ministries') && V.phase !== 'gameover' ? btn('Forzar', () => act({ type: 'advance' }), { kind: 'ghost', size: 'sm', icon: 'skip-forward', title: 'Avanzar sin esperar' }) : null,
    isHostP && V.phase === 'debate' ? btn('Saltar debate', () => askConfirm('¿Saltar el resto del debate? A cada partido se le asignará una respuesta al azar en los bloques que le falten, y su ideología saldrá de ahí.', 'Saltar debate', () => act({ type: 'skipDebate' })), { kind: 'ghost', size: 'sm', icon: 'fast-forward', title: 'Saltar todo el debate' }) : null,
    needsReady ? btn(ready ? 'Esperando al resto…' : labels[V.phase] || 'Listo', () => act({ type: 'ready', value: !ready }, { toast: false }), { kind: ready ? 'ghost' : 'primary', icon: ready ? 'clock' : 'check', id: 'btn-ready', title: ready ? 'Pulsa para seguir editando' : '' }) : null);
}

// ============================================================
//  CONTENIDO PRINCIPAL POR FASE
// ============================================================
function phaseContent() {
  const f = {
    world: phaseWorld, missions: phaseMissions, parties: phaseParties, debate: phaseDebate, ideology: phaseIdeology, election: phaseElection,
    invDeclare: phaseInvDeclare, invVote: phaseInvVote, invResult: phaseInvResult, ministries: phaseMinistries, cantonGov: phaseCantonGov,
    cantonGovResult: phaseCantonGovResult, news: phaseNews, actions: phaseActions, ballot: phaseBallot, sessionResult: phaseSessionResult, gameover: phaseGameover,
  }[V.phase];
  return f ? f() : { main: h('div', { class: 'dock glass' }, 'Fase ' + V.phase) };
}

// ---------- El país ----------
function phaseWorld() {
  const e = V.eco;
  return {
    main: h('div', { class: 'dock left glass', 'data-sk': 'world' },
      h('h1', null, 'República de ' + V.country.name),
      h('p', { class: 'muted' }, `${fmt.people(e.population)} habitantes en ${liveCantonsV().length} cantones y ${V.foreign.length} países vecinos. Aquí competiréis por el poder.`),
      h('div', { class: 'grid2' }, stat('PIB anual', fmt.bn(e.gdp), { icon: 'trending-up' }), stat('Paro', fmt.pct(e.unemployment), { icon: 'users' }),
        stat(e.deficit >= 0 ? 'Déficit' : 'Superávit', fmt.pct(Math.abs(e.deficitRatio)) + ' PIB', { icon: 'scale' }), stat('Deuda pública', fmt.pct(e.debtRatio, 0) + ' PIB', { icon: 'piggy-bank' })),
      h('div', { class: 'notice' }, icon('map-pin', { size: 16 }), 'Aleja la cámara para ver los países y acércala para ver los cantones o el terreno. Toca un país, un cantón o un terreno en su vista para ver sus datos.'),
      group('w-rules', 'Reglas de partida', 'Sistema electoral, competencias…', rulesList(), { icon: 'scroll-text' })),
    side: sidePanel(),
  };
}
function rulesList() {
  return h('dl', { class: 'kv' },
    h('dt', null, 'Parlamento'), h('dd', null, `${V.parliament.seats} escaños, mayoría ${absMajority(V.parliament.seats)}`),
    h('dt', null, 'Sistema electoral'), h('dd', null, FIELDS.sistemaElectoral.label(V.pol.sistemaElectoral)),
    h('dt', null, 'Umbral'), h('dd', null, FIELDS.umbral.label(V.pol.umbral)),
    h('dt', null, 'Legislatura'), h('dd', null, V.pol.legislatura + ' años'),
    h('dt', null, 'Competencias'), h('dd', null, AREAS.map(a => `${a.name}: ${COMP_LABEL[V.pol.comp[a.id]].toLowerCase()}`).join(' · ')),
    h('dt', null, 'Duración'), h('dd', null, `${V.maxTurns / 4} años (${V.maxTurns} trimestres)`));
}

// ---------- Misiones ----------
function missionCard(m, opts = {}) {
  return h('div', { class: `doc mission cat-${m.cat}${m.done ? ' done' : ''}` },
    m.done ? h('span', { class: 'stamp' }, 'Cumplida') : null,
    h('div', { class: 'cat' }, MISSION_CATS[m.cat] || ''),
    h('h3', null, m.title), h('p', { class: 'text' }, m.text),
    opts.progress !== false && m.progress && !m.done ? h('div', { class: 'progress' }, m.progress) : null,
    opts.footer || null);
}
function phaseMissions() {
  const p = me();
  return {
    main: h('div', { class: 'center-overlay' }, h('div', { class: 'glass panel-wide' },
      h('h1', null, 'Tu agenda secreta'),
      h('p', { class: 'muted' }, 'Gana quien cumpla primero sus tres misiones. Una misión cumplida queda cumplida para siempre. Te quedan ', h('b', null, String(p.discards)), ' descartes.'),
      h('div', { class: 'grid3' }, p.missions.map((m, k) => missionCard(m, {
        footer: V.ready[V.me] ? null : btn('Cambiar esta carta', () => act({ type: 'discard', k }, { toast: false }), { size: 'sm', icon: 'shuffle', disabled: p.discards <= 0 }),
      }))))),
  };
}

// Tus misiones secretas, a la vista mientras moldeas tu partido (fundación y debate)
function myMissionsPanel() {
  const p = me();
  if (!p || !p.missions || !p.missions.length) return null;
  const open = UI.missOpen !== false;
  return h('section', { class: 'card missions-peek' },
    h('div', { class: 'row' }, h('h3', { class: 'grow' }, icon('eye-off', { size: 16 }), ' Tus misiones secretas'),
      btn(open ? 'Ocultar' : 'Ver', () => { UI.missOpen = !open; render(); }, { kind: 'ghost', size: 'sm' })),
    open ? h('div', { class: 'stack' }, p.missions.map(m => missionCard(m, { progress: false }))) : null,
    open ? h('p', { class: 'muted small' }, 'Solo tú las ves. Úsalas para decidir qué ideología y qué respuestas encajan con tu partido.') : null);
}

// ---------- Fundación de partidos ----------
function partyDraft() {
  const p = me();
  if (!UI.partyDraft) {
    const used = V.players.filter(x => x.id !== p.id && x.configured).map(x => x.color);
    // los tres primeros jugadores empiezan con el Partido Demócrata (rojo), el Independiente (azul) y el del Centro (verde)
    const def = DEFAULT_PARTIES[V.players.findIndex(x => x.id === p.id)];
    const defOk = def && !V.players.some(x => x.id !== p.id && x.configured && x.name === def.name);
    UI.partyDraft = {
      name: p.configured ? p.name : defOk ? def.name : '', short: p.configured ? p.short : defOk ? def.short : '',
      color: p.color || (defOk && !used.includes(def.color) ? def.color : (PARTY_COLORS.find(c => !used.includes(c.hex)) || PARTY_COLORS[0]).hex),
      color2: p.color2 || '#ffffff', logo: Object.assign({}, p.logo), candidate: { name: p.candidate.name, face: Object.assign({}, p.candidate.face) },
    };
  }
  return UI.partyDraft;
}
function colorTakenV(hex) {
  const near = (a, b) => { const A = hexToRgb(a), B = hexToRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 60; };
  return V.players.some(p => p.id !== V.me && p.configured && p.color && near(p.color, hex));
}
function phaseParties() {
  const p = me(), D = partyDraft();
  const autoShort = n => n.split(/\s+/).filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase().slice(0, 5);
  const upd = () => { syncScene(); renderRegion('side'); };
  const swatches = (cur, set, list, check) => h('div', { class: 'swatches' }, list.map(c => h('button', { type: 'button', class: 'swatch' + (cur === c.hex ? ' on' : ''), title: c.name, 'aria-label': c.name, disabled: check && check(c.hex), style: { background: c.hex }, onclick: () => { set(c.hex); render(); } })));
  const faceKeys = FACE_KEYS;
  const faceCtl = k => {
    const o = FACE_OPTIONS[k];
    if (o.values) return h('div', { class: 'field' }, h('label', null, o.name), h('div', { class: 'swatches small' }, o.values.map((v, i) => h('button', { type: 'button', class: 'swatch' + (D.candidate.face[k] === i ? ' on' : ''), style: { background: v }, 'aria-label': o.name + ' ' + (i + 1), onclick: () => { D.candidate.face[k] = i; render(); } }))));
    return h('div', { class: 'field' }, h('label', { for: 'f-' + k }, o.name), h('select', { id: 'f-' + k, onchange: e => { D.candidate.face[k] = +e.target.value; render(); } }, o.labels.map((l, i) => h('option', { value: i, selected: D.candidate.face[k] === i }, l))));
  };
  const save = () => act({ type: 'party', data: D });
  return {
    main: h('div', { class: 'dock left wide glass', 'data-sk': 'parties' },
      h('h1', null, p.configured ? 'Tu partido' : 'Funda tu partido'),
      h('div', { class: 'grid2' },
        h('div', { class: 'field' }, h('label', { for: 'pn' }, 'Nombre del partido'), h('input', { id: 'pn', type: 'text', maxlength: 34, value: D.name, placeholder: 'Por ejemplo: Alianza Cívica', oninput: e => { const auto = !D.short || D.short === autoShort(D.name); D.name = e.target.value; if (auto) D.short = autoShort(D.name); D.logo.text = D.short; upd(); } })),
        h('div', { class: 'field' }, h('label', { for: 'ps' }, 'Siglas'), h('input', { id: 'ps', type: 'text', maxlength: 6, value: D.short, oninput: e => { D.short = e.target.value.toUpperCase(); D.logo.text = D.short; upd(); } }))),
      h('div', { class: 'field' }, h('label', null, 'Color del partido'), swatches(D.color, v => D.color = v, PARTY_COLORS, colorTakenV),
        h('label', { class: 'inline' }, 'O elige uno a medida ', h('input', { type: 'color', value: D.color, onchange: e => { if (colorTakenV(e.target.value)) toast('Ese color se parece demasiado al de otro partido.', 'bad'); else { D.color = e.target.value; render(); } } }))),
      h('div', { class: 'field' }, h('label', null, 'Color del símbolo'), swatches(D.color2, v => D.color2 = v, [{ hex: '#ffffff', name: 'Blanco' }, { hex: '#1a1a1a', name: 'Negro' }, { hex: '#f2c230', name: 'Oro' }, { hex: '#f5ead2', name: 'Crema' }, { hex: '#1b2f6b', name: 'Marino' }, { hex: '#d62839', name: 'Rojo' }])),
      h('div', { class: 'field' }, h('label', null, 'Estilo'), h('div', { class: 'seg' }, LOGO_STYLES.map(st => h('button', { type: 'button', class: (D.logo.style || 'lleno') === st.id ? 'on' : '', onclick: () => { D.logo.style = st.id; render(); } }, st.name)))),
      h('div', { class: 'field' }, h('label', null, 'Forma del logotipo'), h('div', { class: 'shape-row' }, LOGO_SHAPES.map(sh => { const b = h('button', { type: 'button', class: 'shape-btn' + (D.logo.shape === sh.id ? ' on' : ''), title: sh.name, onclick: () => { D.logo.shape = sh.id; render(); } }); b.innerHTML = logoSVG(Object.assign({}, D.logo, { shape: sh.id, text: D.short }), D.color, D.color2, 40); return b; }))),
      symbolField(D),
      h('h2', { style: { marginTop: '18px' } }, 'Tu candidato o candidata'),
      h('div', { class: 'field' }, h('label', { for: 'cn' }, 'Nombre'), h('input', { id: 'cn', type: 'text', maxlength: 30, value: D.candidate.name, oninput: e => { D.candidate.name = e.target.value; upd(); } })),
      h('div', { class: 'row' }, btn('Cara al azar', () => { D.candidate.face = randomFace(); render(); }, { icon: 'dices', size: 'sm' })),
      h('div', { class: 'grid2 face-grid' }, faceKeys.map(faceCtl)),
      h('div', { class: 'btn-row sticky-actions' }, btn(p.configured ? 'Guardar cambios' : 'Registrar el partido', save, { kind: 'primary', icon: 'check' }),
        p.configured ? h('span', { class: 'muted small' }, 'Registrado. Pulsa «Listo» abajo cuando acabes.') : null)),
    side: h('div', { class: 'dock right glass' }, myMissionsPanel(), h('h3', null, 'Así se verá'), partyPreviewCard(Object.assign({}, p, D, { configured: true })),
      h('h3', { style: { marginTop: '16px' } }, 'Partidos registrados'),
      h('div', { class: 'stack' }, V.players.filter(x => x.configured).map(x => h('div', { class: 'row' }, chip(x), h('span', { class: 'muted small' }, x.candidate.name)))),
      V.players.some(x => !x.configured) ? h('p', { class: 'muted small' }, 'Faltan: ' + V.players.filter(x => !x.configured).map(x => x.player).join(', ')) : null),
  };
}
function partyPreviewCard(p) {
  return h('div', { class: 'preview-card', style: { background: `linear-gradient(160deg, ${p.color}, ${mix(p.color, '#0b0f1a', 0.55)})` } },
    portrait(p, 120, 'big'),
    h('div', { class: 'preview-info' }, partyLogo(p, 64), h('h2', { style: { color: textOn(p.color) } }, p.name || 'Nombre del partido'),
      h('div', { style: { color: textOn(p.color), opacity: 0.85 } }, (p.short || 'SIGLAS') + ' · ' + (p.candidate.name || 'Candidato'))));
}

// ---------- Debate ----------
// Efecto de una respuesta en cada eje, en pequeño: icono, hacia dónde y cuánto (de uno a tres puntos)
const FX_POLES = { eco: ['Izquierda', 'Derecha'], soc: ['Progresista', 'Tradicional'], ter: ['Centralismo', 'Cantones'], ext: ['Apertura', 'Soberanía'], aut: ['Libertades', 'Orden'], amb: ['Ecología', 'Producción'] };
function fxChips(fx, main) {
  const axes = AXES.filter(a => fx[a.id] !== undefined && (a.id === main || Math.abs(fx[a.id]) >= 0.3)).sort((x, y) => (y.id === main) - (x.id === main));
  return h('span', { class: 'fx-row' }, axes.map(a => {
    const v = fx[a.id], n = Math.abs(v) < 0.3 ? 0 : Math.abs(v) < 0.8 ? 1 : Math.abs(v) < 1.5 ? 2 : 3;
    const pole = n ? FX_POLES[a.id][v < 0 ? 0 : 1] : 'Centro';
    return h('span', { class: 'fx ' + (n ? (v < 0 ? 'neg' : 'pos') : 'mid') + (a.id === main ? ' main' : ''), title: `${a.name}: ${axisLabel(a.id, v)}` },
      icon(a.icon, { size: 11 }), pole, n ? h('i', { class: 'dots' }, '●'.repeat(n) + '○'.repeat(3 - n)) : null);
  }));
}
function phaseDebate() {
  const d = V.derived.debateCurrent;
  const sp = P(d.speaker);
  const mine = d.speaker === V.me;
  const log = V.debate.log.filter(x => x.block === d.blockIdx);
  const regs = d.reg || [], left = Math.max(0, d.regCap - d.regCount);
  return {
    main: h('div', { class: 'debate-panel glass' },
      h('div', { class: 'muted small' }, `Debate inaugural · bloque ${d.blockIdx + 1} de ${DEBATE_BLOCKS.length}: ${d.blockTitle}`),
      h('div', { class: 'speaker' }, portrait(sp, 48), h('div', null, h('div', { class: 'muted small' }, mine ? 'Te toca a ti' : `Pregunta para ${sp.candidate.name}`), chip(sp, { small: true }))),
      h('div', { class: 'question' }, d.q),
      h('div', { class: 'answers' + (d.answers.length > 4 ? ' many' : '') }, d.answers.map(a => {
        const taken = !d.remaining.includes(a.i);
        return h('button', { type: 'button', class: 'answer' + (taken ? ' taken' : ''), disabled: taken || !mine, onclick: () => act({ type: 'debateAnswer', idx: a.i }, { toast: false }) },
          h('span', { class: 'ans-t' }, a.t), fxChips(a.fx, d.axis));
      })),
      regs.length ? h('div', { class: 'reg-answers' },
        h('div', { class: 'reg-head small' }, icon('flag', { size: 14 }), h('b', null, 'Respuestas regionalistas'),
          infoTip(`Si eliges una, ${mine ? 'tu partido pasa' : 'el partido pasa'} a ser regionalista: solo se presentará en los cantones de esa tierra que empezaron con al menos un ${Math.round(FERVOR_REGIONAL_MIN * 100)} % de fervor cantonalista (en las generales y en las cantonales). Allí los cantonalistas le dan un empujón. Quedan ${left} de ${d.regCap} plazas de regionalistas; siempre habrá al menos dos partidos de ámbito nacional. Estas respuestas no se gastan.`)),
        regs.map(o => h('button', { type: 'button', class: 'answer reg', disabled: !mine, onclick: () => askConfirm(`¿Convertir ${mine ? 'tu partido' : 'el partido'} en regionalista de ${o.name}? Solo te presentarás en ${o.cantons.map(i => V.cantons[i].name).join(' y ')}. No se puede deshacer.`, 'Sí, ser regionalista', () => act({ type: 'debateAnswer', reg: o.cul }, { toast: false })) },
          h('span', { class: 'ans-t' }, o.t), h('span', { class: 'fx-row' }, h('span', { class: 'fx reg-tag' }, icon('map-pin', { size: 11 }), 'Regionalista de ' + o.label)), fxChips(o.fx, d.axis)))) : null,
      h('p', { class: 'muted small center' }, mine ? 'Elige tu respuesta. Las ya usadas en esta pregunta no se pueden repetir.' : `${sp.candidate.name} está pensando su respuesta…`)),
    side: h('div', { class: 'dock right glass', 'data-sk': 'deb' }, myMissionsPanel(), regionalStatus(),
      log.length ? h('div', null, h('h3', null, 'Lo dicho en este bloque'), h('ul', { class: 'log' }, log.map(x => h('li', null, chip(P(x.party), { small: true, short: true }), h('div', null, x.t))))) : null),
  };
}
// Quién es regionalista y qué tierras pueden tenerlos
function regionalStatus() {
  const n = V.players.length, regs = V.players.filter(x => x.regional != null);
  const cults = (V.cultures || []).filter(cu => cu.id > 0 && cu.region && cu.region.length);
  const box = (...kids) => section('Partidos regionalistas', ...kids);
  if (n < 3) return box(h('p', { class: 'muted small' }, 'Con menos de 3 partidos no puede haber partidos regionalistas.'));
  if (!cults.length) return box(h('p', { class: 'muted small' }, `Ningún cantón llega al ${Math.round(FERVOR_REGIONAL_MIN * 100)} % de fervor cantonalista: todos los partidos serán de ámbito nacional.`));
  return box(
    h('p', { class: 'muted small' }, `Un partido se vuelve regionalista eligiendo una respuesta regionalista en el debate. Como mucho ${Math.max(0, n - 2)}.`),
    h('div', { class: 'stack' }, cults.map(cu => h('div', { class: 'row small' }, icon('flag', { size: 14 }), h('b', null, cu.name), h('span', { class: 'muted' }, cu.region.map(i => `${V.cantons[i].name} ${Math.round(V.cantons[i].ferv.can * 100)} %`).join(' · '))))),
    regs.length ? h('p', { class: 'small' }, 'Ya son regionalistas: ' + regs.map(x => `${x.short} (${partyRegionName(x)})`).join(', ') + '.') : null);
}
function phaseIdeology() {
  return {
    side: h('div', { class: 'dock right wide glass', 'data-sk': 'ideo' },
      h('h2', null, 'El mapa ideológico'),
      h('p', { class: 'muted small' }, 'Lo que votéis en el Parlamento irá moviendo a vuestros partidos. El eje ideológico es la media de todos los ejes.'),
      section('Eje ideológico', ideologyAxes(V.players, { overall: true })), ideologyAxes(V.players),
      h('table', { class: 'tbl' }, h('tbody', null, V.players.map(p => h('tr', null, h('td', null, chip(p, { small: true, short: true })), h('td', { class: 'small' }, p.regional != null ? h('b', null, partyScope(p) + '. ') : null, AXES.map(a => axisLabel(a.id, p.ideo[a.id])).join(' · '))))))),
  };
}

// ---------- Elecciones ----------
function electionResultsTable(r) {
  const sorted = V.players.slice().sort((a, b) => (r.votes[b.id] || 0) - (r.votes[a.id] || 0));
  return h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Partido'), h('th', { class: 'r' }, '%'), h('th', { class: 'r' }, 'Escaños'), h('th', { class: 'r' }, '±'))),
    h('tbody', null, sorted.map(p => {
      const prev = r.prevSeats && Object.keys(r.prevSeats).length ? (r.prevSeats[p.id] || 0) : null;
      const d = prev === null ? null : (r.seats[p.id] || 0) - prev;
      return h('tr', null, h('td', null, chip(p, { small: true })), h('td', { class: 'r num' }, fmt.pct(r.shares[p.id] || 0)), h('td', { class: 'r num' }, h('b', null, r.seats[p.id] || 0)),
        h('td', { class: 'r num ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') }, d === null ? '—' : fmt.signed(d, 0)));
    })));
}
// Resultados de las generales en cada circunscripción
function districtResults(r) {
  const sys = r.system;
  const players = V.players;
  const rows = V.cantons.map((c, i) => { if (c.merged) return null;
    const bc = r.byCanton[i]; if (!bc) return null;
    const tot = sum(Object.values(bc.votes)) || 1;
    const order = players.filter(p => (bc.votes[p.id] || 0) > 0).sort((a, b) => (bc.votes[b.id] || 0) - (bc.votes[a.id] || 0));
    const bar = h('div', { class: 'stacked' }, order.map(p => h('i', { style: { width: (bc.votes[p.id] / tot * 100) + '%', background: p.color }, title: `${p.short}: ${fmt.pct(bc.votes[p.id] / tot, 1)}` })));
    const seatTxt = sys === 'proporcional_nacional' ? 'reparto orientativo' : `${c.nationalSeats} escaños`;
    const chips = h('div', { class: 'small dist-chips' }, order.map(p => h('span', { class: 'tag', style: { borderColor: p.color } }, h('b', null, p.short), ` ${fmt.pct(bc.votes[p.id] / tot, 1)}`, (bc.seats && bc.seats[p.id]) ? h('b', { class: 'seats' }, ` · ${bc.seats[p.id]} esc.`) : null)));
    const dots = sys === 'mayoritario' && bc.winners ? h('div', { class: 'dist-dots', title: 'Cada cuadrado es un distrito de un escaño' }, bc.winners.map(w => h('i', { style: { background: w ? (P(w) || {}).color : '#444' } }))) : null;
    return h('div', { class: 'dist-row' }, h('div', { class: 'row' }, h('b', null, c.name), h('span', { class: 'spacer' }), h('span', { class: 'muted small' }, `${seatTxt} · participación ${fmt.pct(bc.turnout || 0, 0)}`)), bar, dots, chips);
  }).filter(Boolean);
  const intro = sys === 'proporcional_nacional' ? 'Circunscripción única: los escaños se reparten con el voto de todo el país. Por cantones, el voto fue así:'
    : sys === 'mayoritario' ? 'Cada cantón está dividido en distritos de un escaño: gana el distrito el partido más votado en él.'
      : 'Cada cantón es una circunscripción que reparte sus escaños por D\'Hondt entre los partidos que superan el umbral.';
  return h('div', null, h('p', { class: 'muted small' }, intro), h('div', { class: 'stack' }, rows));
}
// ---------- Noche electoral ----------
// Los resultados llegan localidad a localidad: primero los pueblos pequeños, al final las ciudades. Mientras tanto,
// el mapa se pinta con el ganador de cada sitio y la proyección de escaños va cambiando.
const NIGHT_SECONDS = { nacional: 42, cantonal: 32 };
const placeHash = k => { let x = 0; for (let i = 0; i < k.length; i++) x = (x * 31 + k.charCodeAt(i)) % 9973; return x / 9973; };
function nightState() {
  const en = V.electionNow || { national: true, cantonal: true };
  const level = en.national ? 'nacional' : 'cantonal';
  const src = level === 'nacional' ? V.parliament.lastElection : V.cantonalNight;
  if (!src || !src.places || !src.places.length || (src.turn != null && src.turn !== V.turn)) return null;
  const key = V.turn + '|' + level + '|' + src.places.length;
  if (!UI.night || UI.night.key !== key) {
    const order = src.places.slice().sort((a, b) => a.e * (0.75 + 0.5 * placeHash(a.k)) - b.e * (0.75 + 0.5 * placeHash(b.k)));
    UI.night = { key, level, src, order, start: Date.now(), T: NIGHT_SECONDS[level] * 1000, shown: -1, done: false, totalE: sum(order, p => p.e) };
    UI.viewOverride = 'map';
  }
  return UI.night;
}
// Cuántas localidades se han escrutado ya (las pequeñas van deprisa; las ciudades, al final)
function nightCount(N) {
  if (N.done) return N.order.length;
  const t = clamp((Date.now() - N.start) / N.T, 0, 1);
  return Math.min(N.order.length, Math.floor(N.order.length * Math.pow(t, 0.85) + (t >= 1 ? 1 : 0)));
}
function nightTally(N, n) {
  const pl = N.order.slice(0, n);
  const votes = {}, byC = V.cantons.map(() => ({ votes: {}, e: 0, n: 0 }));
  let e = 0, voters = 0;
  V.players.forEach(p => { votes[p.id] = 0; byC.forEach(b => b.votes[p.id] = 0); });
  for (const x of pl) { e += x.e; voters += x.n; const b = byC[x.c]; if (b) { b.e += x.e; b.n += x.n; } for (const k in x.v) { votes[k] = (votes[k] || 0) + x.v[k]; if (b) b.votes[k] = (b.votes[k] || 0) + x.v[k]; } }
  const cTot = V.cantons.map((c, i) => sum(N.order.filter(x => x.c === i), x => x.e));
  return { votes, byC, e, voters, pct: e / Math.max(1, N.totalE), cTot };
}
// Proyección de escaños con lo escrutado
function nightSeats(N, T) {
  const seats = {}; V.players.forEach(p => seats[p.id] = 0);
  const sys = (N.src && N.src.system) || V.pol.sistemaElectoral, th = N.level === 'nacional' ? ((N.src && N.src.threshold) ?? V.pol.umbral) : (N.src.threshold || 0.03);
  if (N.level === 'cantonal') return V.cantons.map((c, i) => c.merged || !T.byC[i].n ? null : dhondt(T.byC[i].votes, c.parliament.seats, th));
  if (sys === 'proporcional_nacional') Object.assign(seats, dhondt(T.votes, V.parliament.seats, th));
  else V.cantons.forEach((c, i) => {
    if (c.merged || !T.byC[i].n) return;
    // (en el sistema mayoritario, el que gana en un sitio se lleva casi todo: se aproxima exagerando las diferencias)
    const vv = sys === 'mayoritario' ? Object.fromEntries(Object.entries(T.byC[i].votes).map(([k, v]) => [k, v * v])) : T.byC[i].votes;
    const r = dhondt(vv, c.nationalSeats, sys === 'mayoritario' ? 0 : th);
    for (const k in r) seats[k] = (seats[k] || 0) + r[k];
  });
  return seats;
}
function placeLabel(x) {
  if (x.nm) return x.nm;
  const [q, r] = x.k.split(',').map(Number), hx = MapScene.hexAt(q, r);
  const c = V.cantons[x.c];
  return hx && hx.cn ? hx.cn : 'Zona rural de ' + (c ? c.name : '?');
}
function nightPanel(N) {
  const n = nightCount(N), T = nightTally(N, n), seats = nightSeats(N, T);
  const tv = sum(Object.values(T.votes)) || 1;
  const last = N.order.slice(Math.max(0, n - 6), n).reverse();
  const winnerOf = x => { let b = null, bv = -1; for (const k in x.v) if (x.v[k] > bv) { bv = x.v[k]; b = k; } return b; };
  const parties = V.players.slice().sort((a, b) => (T.votes[b.id] || 0) - (T.votes[a.id] || 0));
  const body = N.level === 'nacional'
    ? h('table', { class: 'tbl night-tbl' }, h('thead', null, h('tr', null, h('th', null, 'Partido'), h('th', { class: 'r' }, '%'), h('th', { class: 'r' }, 'Escaños (proyección)'))),
      h('tbody', null, parties.map(p => h('tr', null, h('td', null, chip(p, { small: true })), h('td', { class: 'r num' }, fmt.pct((T.votes[p.id] || 0) / tv)),
        h('td', { class: 'r num' }, h('div', { class: 'night-bar' }, h('i', { style: { width: Math.min(100, (seats[p.id] || 0) / Math.max(1, V.parliament.seats) * 200) + '%', background: p.color } }), h('b', null, String(seats[p.id] || 0))))))))
    : h('div', { class: 'stack' }, liveCantonsV().map(c => {
        const b = T.byC[c.idx], cs = seats[c.idx], tvc = sum(Object.values(b.votes)) || 1;
        const lead = V.players.filter(p => (b.votes[p.id] || 0) > 0).sort((x, y) => b.votes[y.id] - b.votes[x.id]);
        return h('div', { class: 'canton-row' }, h('div', { class: 'row' }, h('b', null, c.name), h('span', { class: 'spacer' }), h('span', { class: 'muted small' }, 'escrutado ' + fmt.pct(b.e / Math.max(1, T.cTot[c.idx]), 0))),
          cs ? miniHemicycle(cs, c.parliament.seats, V.players) : h('p', { class: 'muted small' }, 'Aún no hay datos.'),
          h('div', { class: 'small' }, lead.slice(0, 4).map(p => h('span', { class: 'tag', style: { borderColor: p.color } }, `${p.short} ${fmt.pct(b.votes[p.id] / tvc, 0)}`))));
      }));
  return h('div', { class: 'dock right wide glass night', 'data-sk': 'night' },
    h('h2', null, icon('vote', { size: 20 }), N.level === 'nacional' ? ' Noche electoral: generales' : ' Noche electoral: cantonales'),
    h('div', { class: 'night-prog' }, h('div', { class: 'row small' }, h('b', null, 'Escrutado ' + fmt.pct(T.pct, 1)), h('span', { class: 'spacer' }), h('span', { class: 'muted' }, `${n} de ${N.order.length} localidades · participación ${fmt.pct(T.voters / Math.max(1, T.e), 0)}`)),
      h('div', { class: 'bar' }, h('i', { style: { width: (T.pct * 100) + '%' } }))),
    body,
    last.length ? section('Últimos datos', h('ul', { class: 'log night-log' }, last.map(x => { const w = P(winnerOf(x)); return h('li', null, h('span', null, h('b', null, placeLabel(x)), h('span', { class: 'muted' }, ` · ${fmt.int(x.n)} votos`)), w ? chip(w, { small: true, short: true, sub: fmt.pct((x.v[w.id] || 0) / Math.max(1, x.n), 0) }) : null); }))) : null,
    h('div', { class: 'btn-row' }, btn('Ver el resultado final', () => { N.done = true; finishNight(); }, { kind: 'ghost', size: 'sm', icon: 'skip-forward' })));
}
// Colores del mapa durante la noche: cada localidad escrutada, del color de quien gana allí
function nightMapColors(N, n) {
  const m = new Map();
  for (const x of N.order.slice(0, n)) { let b = null, bv = -1; for (const k in x.v) if (x.v[k] > bv) { bv = x.v[k]; b = k; } const p = P(b); if (p) (x.ks || [x.k]).forEach(k => m.set(k, p.color)); }
  return m;
}
function finishNight() {
  const N = UI.night; if (!N) return;
  N.done = true; N.shown = N.order.length;
  MapScene.setNight(nightMapColors(N, N.order.length));
  UI.viewOverride = 'chamber';
  render();
}
function tickNight() {
  const N = UI.night; if (!N || N.done || !V || V.phase !== 'election') return;
  const n = nightCount(N);
  if (n !== N.shown) {
    N.shown = n;
    MapScene.setNight(nightMapColors(N, n));
    if (n >= N.order.length) { finishNight(); return; }
    renderRegion('side');
  }
}
function phaseElection() {
  const N0 = nightState();
  if (N0 && !N0.done) return { side: nightPanel(N0) };
  const r = V.parliament.lastElection;
  const en = V.electionNow || { national: true, cantonal: true };
  const tabs = [en.national ? ['general', 'Resultado'] : null, en.national ? ['distritos', 'Por circunscripción'] : null, en.cantonal ? ['cantonales', 'Parlamentos cantonales'] : null].filter(Boolean);
  if (!tabs.some(t => t[0] === UI.elecTab)) UI.elecTab = tabs[0][0];
  const body = UI.elecTab === 'general' ? [electionResultsTable(r), h('p', { class: 'muted small' }, `Participación ${fmt.pct(r.turnout, 0)}. ${FIELDS.sistemaElectoral.label(r.system)}, umbral ${FIELDS.umbral.label(r.threshold)}. Mayoría absoluta: ${absMajority(V.parliament.seats)}.`)]
    : UI.elecTab === 'distritos' ? districtResults(r)
      : h('div', { class: 'stack' }, liveCantonsV().map(c => h('div', { class: 'canton-row' }, h('b', null, c.name), miniHemicycle(c.parliament.composition, c.parliament.seats, V.players),
        h('div', { class: 'small' }, V.players.filter(p => (c.parliament.composition[p.id] || 0) > 0).sort((a, b) => c.parliament.composition[b.id] - c.parliament.composition[a.id]).map(p => h('span', { class: 'tag', style: { borderColor: p.color } }, `${p.short} ${c.parliament.composition[p.id]}`))))));
  return {
    side: h('div', { class: 'dock right wide glass', 'data-sk': 'elec-' + UI.elecTab },
      h('h2', null, en.national && en.cantonal ? 'Noche electoral' : en.national ? 'Elecciones generales' : 'Elecciones cantonales'),
      tabs.length > 1 ? h('div', { class: 'tabs' }, tabs.map(([id, name]) => h('button', { type: 'button', class: UI.elecTab === id ? 'on' : '', onclick: () => { UI.elecTab = id; render(); } }, name))) : null,
      body,
      h('p', { class: 'muted small' }, 'Con el botón «Mapa» de arriba verás el partido ganador en cada cantón.')),
  };
}

// ---------- Investidura ----------
function phaseInvDeclare() {
  const p = me();
  const can = seatsV(p.id) > 0 && !p.imputado;
  return {
    side: h('div', { class: 'dock right glass' }, h('h2', null, 'Candidaturas a la presidencia'),
      h('p', { class: 'muted small' }, 'Los partidos con escaños pueden presentar a su candidato. Después se votarán todos a la vez: en la primera ronda hace falta mayoría absoluta; en la segunda, más síes que noes.'),
      h('div', { class: 'stack' }, V.players.filter(x => seatsV(x.id) > 0).sort((a, b) => seatsV(b.id) - seatsV(a.id)).map(x => h('div', { class: 'cand-row' }, portrait(x, 40), h('div', { class: 'grow' }, chip(x, { small: true }), h('div', { class: 'muted small' }, `${x.candidate.name} · ${seatsV(x.id)} escaños`)),
        x.id === V.me ? (can ? h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: !!V.inv.declared[x.id], onchange: e => act({ type: 'declare', value: e.target.checked }, { toast: false }) }), 'Me presento') : h('span', { class: 'muted small' }, p.imputado ? 'Imputado' : 'Sin escaños'))
          : h('span', { class: 'tag' + (V.inv.declared[x.id] ? ' brass' : '') }, V.inv.declared[x.id] ? 'Se presenta' : 'No se presenta'))))),
  };
}
function phaseInvVote() {
  const inv = V.inv;
  const myVotes = inv.votes[V.me] || {};
  const iHaveSeats = seatsV(V.me) > 0;
  return {
    side: h('div', { class: 'dock right glass' }, h('h2', null, `Investidura: ${inv.round === 1 ? 'primera' : 'segunda'} votación`),
      h('p', { class: 'muted small' }, inv.round === 1 ? `Hace falta mayoría absoluta (${absMajority(V.parliament.seats)} escaños).` : 'Basta con más síes que noes. Si nadie lo logra, habrá nuevas elecciones.'),
      !iHaveSeats ? h('p', { class: 'muted' }, 'Tu partido no tiene escaños: no votas en esta sesión.') : null,
      h('div', { class: 'stack' }, inv.candidates.map(cid => {
        const c = P(cid);
        return h('div', { class: 'cand-card' }, portrait(c, 64), h('div', { class: 'grow' }, h('b', null, c.candidate.name), h('div', null, chip(c, { small: true, sub: `${seatsV(cid)} esc.` })),
          iHaveSeats ? voteButtons(myVotes[cid], v => act({ type: 'invVote', cand: cid, value: v }, { toast: false }), cid === V.me) : null));
      }))),
  };
}
function voteButtons(cur, onVote, locked) {
  const vb = (v, label, ic) => btn(label, () => onVote(v), { size: 'sm', kind: 'vote ' + v + (cur === v ? ' on' : ''), icon: ic, disabled: locked || V.ready[V.me] });
  return h('div', { class: 'vote-btns' }, vb('si', 'Sí', 'check'), vb('no', 'No', 'x'), vb('abs', 'Abst.', 'circle-minus'));
}
function phaseInvResult() {
  const r = V.inv.result;
  const w = r.winner ? P(r.winner) : null;
  return {
    side: h('div', { class: 'dock right glass' },
      w ? h('div', { class: 'verdict ok' }, `${w.candidate.name}, presidente`) : h('div', { class: 'verdict ko' }, r.round === 1 ? 'Nadie logra la mayoría absoluta' : 'Investidura fallida'),
      w ? null : h('p', { class: 'muted small' }, r.round === 1 ? 'Habrá una segunda votación con mayoría simple.' : 'Habrá repetición electoral al final del próximo trimestre.'),
      h('div', { class: 'stack' }, r.tallies.map(t => { const c = P(t.cand); return h('div', { class: 'cand-row' + (t.cand === r.winner ? ' win' : '') }, portrait(c, 40), h('div', { class: 'grow' }, h('b', null, c.candidate.name), h('div', { class: 'tally small' }, h('span', { class: 'si' }, 'Sí ' + t.yes), h('span', { class: 'no' }, 'No ' + t.no), h('span', { class: 'abs' }, 'Abst. ' + t.abs))), t.passed ? icon('circle-check', { cls: 'ok' }) : icon('circle-x', { cls: 'ko' })); })),
      section('Quién votó qué', h('table', { class: 'tbl small' }, h('thead', null, h('tr', null, h('th', null, ''), r.tallies.map(t => h('th', { class: 'r' }, P(t.cand).short)))),
        h('tbody', null, V.players.filter(p => seatsV(p.id) > 0).map(p => h('tr', null, h('td', null, chip(p, { small: true, short: true })), r.tallies.map(t => { const v = r.votes[p.id][t.cand] || 'abs'; return h('td', { class: 'r vote-' + v }, { si: 'Sí', no: 'No', abs: 'Abst.' }[v]); }))))))),
  };
}
function draftList(map, pres) {
  return h('div', { class: 'min-list' }, MINISTRIES.map(m => h('div', { class: 'min-mini', title: m.power }, icon(m.icon, { size: 16 }), h('span', null, m.name), chip(P((map || {})[m.id] || pres.id), { small: true, short: true, none: '—' }))));
}
function phaseMinistries() {
  const pres = P(V.gov.president);
  if (V.gov.president !== V.me) {
    const dr = V.gov.draft && V.gov.draft.kind === 'ministries' ? V.gov.draft : null;
    return { side: h('div', { class: 'dock right glass' }, h('h2', null, 'Formación de gobierno'), portrait(pres, 90), h('p', null, `${pres.candidate.name} está eligiendo a su Consejo de Ministros.`),
      V.gov.supporters.length ? h('p', { class: 'muted small' }, 'Puede dar carteras a quienes votaron su investidura: ' + V.gov.supporters.map(id => P(id).short).join(', ') + '.') : h('p', { class: 'muted small' }, 'Nadie más votó su investidura: gobernará en solitario.'),
      section(dr ? 'Reparto provisional' : 'Reparto', draftList(dr ? dr.map : null, pres), h('p', { class: 'muted small' }, dr ? 'Se actualiza según lo va decidiendo. Aún puede cambiarlo.' : 'Todavía no ha movido ninguna cartera.'))) };
  }
  const eligible = [V.me].concat(V.gov.supporters || []);
  if (!UI.minDraft) { UI.minDraft = {}; MINISTRIES.forEach(m => UI.minDraft[m.id] = V.me); act({ type: 'govDraft', map: UI.minDraft }, { toast: false }); }
  return {
    side: h('div', { class: 'dock right wide glass', 'data-sk': 'mins' }, h('h2', null, 'Tu Consejo de Ministros'),
      h('p', { class: 'muted small' }, 'Reparte las carteras entre tu partido y quienes votaron tu investidura. Cada ministerio da 1 PC por trimestre y una acción especial a quien lo ocupe. Los demás jugadores ven cómo vas repartiéndolas.'),
      h('div', { class: 'stack' }, MINISTRIES.map(m => h('div', { class: 'min-row' }, icon(m.icon, { size: 22, cls: 'min-ico' }), h('div', { class: 'grow' }, h('b', null, m.name), h('div', { class: 'muted small' }, m.power)),
        h('select', { onchange: e => { UI.minDraft[m.id] = e.target.value; act({ type: 'govDraft', map: UI.minDraft }, { toast: false }); } }, eligible.map(id => h('option', { value: id, selected: UI.minDraft[m.id] === id }, P(id).short)))))),
      h('div', { class: 'btn-row' }, btn('Nombrar al Gobierno', () => { act({ type: 'ministries', map: UI.minDraft }); UI.minDraft = null; }, { kind: 'primary', icon: 'check' }))),
  };
}
// Aviso para el resto de jugadores mientras el presidente remodela el Gobierno
function renderGovDraft() {
  let el = document.getElementById('gov-draft');
  const d = V && V.gov && V.gov.draft;
  if (!(d && d.kind === 'reshuffle' && d.by !== V.me && V.phase === 'actions' && P(d.by))) { if (el) el.remove(); return; }
  if (!el) { el = h('div', { id: 'gov-draft', class: 'gov-draft glass' }); document.body.appendChild(el); }
  el.innerHTML = '';
  el.appendChild(h('div', null, h('b', null, `${P(d.by).candidate.name} está remodelando el Gobierno`), h('div', { class: 'muted small' }, 'Reparto provisional:')));
  el.appendChild(draftList(d.map, P(d.by)));
}
function governmentCard() {
  const pres = P(V.gov.president);
  if (!pres) return section('Gobierno', h('p', { class: 'muted' }, 'No hay Gobierno: un gabinete técnico gestiona el país.'));
  return section(V.gov.interim ? 'Gobierno en funciones' : 'Gobierno',
    h('div', { class: 'row' }, portrait(pres, 52), h('div', null, h('b', null, pres.candidate.name), h('div', null, chip(pres, { small: true })))),
    h('div', { class: 'min-list' }, MINISTRIES.map(m => h('div', { class: 'min-mini', title: m.power }, icon(m.icon, { size: 16 }), h('span', null, m.name), chip(P(V.gov.ministers[m.id]), { small: true, short: true, none: '—' })))));
}

// ---------- Gobiernos cantonales ----------
function phaseCantonGov() {
  return {
    side: h('div', { class: 'dock right wide glass', 'data-sk': 'cg' }, h('h2', null, 'Gobiernos cantonales'),
      h('p', { class: 'muted small' }, 'En cada cantón, cada partido con procuradores apoya a un candidato. Gobierna quien reúna más apoyos. Los apoyos de los demás son secretos hasta el recuento.'),
      h('div', { class: 'stack' }, liveCantonsV().map(c => {
        const comp = c.parliament.composition;
        const parties = V.players.filter(p => (comp[p.id] || 0) > 0).sort((a, b) => comp[b.id] - comp[a.id]);
        const mine = V.cantonSupports[c.idx] && V.cantonSupports[c.idx][V.me] !== undefined;
        return h('div', { class: 'canton-row' }, h('div', { class: 'row' }, h('b', null, c.name), h('span', { class: 'spacer' }), h('span', { class: 'muted small' }, `mayoría ${absMajority(c.parliament.seats)} de ${c.parliament.seats}`)),
          h('div', { class: 'small' }, parties.map(p => h('span', { class: 'tag', style: { borderColor: p.color } }, `${p.short}: ${comp[p.id]} ${comp[p.id] === 1 ? 'procurador' : 'procuradores'}`))),
          mine ? h('div', { class: 'row' }, h('span', { class: 'small' }, 'Tu apoyo:'), h('select', { onchange: e => act({ type: 'cantonSupport', canton: c.idx, cand: e.target.value }, { toast: false }) }, parties.map(q => h('option', { value: q.id, selected: V.cantonSupports[c.idx][V.me] === q.id }, q.short + ' (' + q.candidate.name + ')')))) : null);
      }))),
  };
}
function phaseCantonGovResult() {
  return {
    side: h('div', { class: 'dock right glass' }, h('h2', null, 'Así quedan los cantones'),
      h('div', { class: 'stack' }, (V.lastCantonGov || []).map(r => h('div', { class: 'canton-row' }, h('div', { class: 'row' }, h('b', null, V.cantons[r.canton].name), h('span', { class: 'spacer' }), chip(P(r.president), { small: true, short: true })),
        h('div', { class: 'muted small' }, (r.majority ? 'Mayoría' : 'En minoría') + ' · apoyos: ' + r.coalition.map(id => P(id).short).join(', ')))))),
  };
}

// ---------- Prensa ----------
function phaseNews() {
  const paper = V.paper;
  if (!paper) return { main: null };
  const o = paper.outlets[UI.paperOutlet % paper.outlets.length];
  const storyEl = (st, big) => h('article', { class: 'story' + (big ? ' lead' : '') },
    big && st.portrait ? portrait(P(st.portrait), 110, 'story-portrait') : null,
    h(big ? 'h2' : 'h4', null, st.headline), st.body ? h('p', null, st.body) : null);
  const bar = paper.barometer;
  return {
    main: h('div', { class: 'center-overlay' }, h('div', { class: 'newspaper', 'data-sk': 'paper' },
      h('div', { class: 'outlet-tabs' }, paper.outlets.map((x, i) => h('button', { type: 'button', class: i === UI.paperOutlet % paper.outlets.length ? 'on' : '', onclick: () => { UI.paperOutlet = i; render(); } }, x.name))),
      h('header', { class: 'masthead' }, h('div', { class: 'mh-name' }, o.name), h('div', { class: 'mh-line' }, h('span', null, o.motto), h('span', null, paper.label), h('span', null, 'Línea editorial ' + o.style))),
      h('div', { class: 'paper-grid' },
        h('div', { class: 'paper-main' }, storyEl(o.lead, true),
          h('div', { class: 'paper-cols' }, o.items.map(st => storyEl(st))),
          o.quote ? h('blockquote', { class: 'pull' }, h('p', null, '«' + o.quote.text + '»'), h('cite', null, `${P(o.quote.party).candidate.name} (${P(o.quote.party).short}), sobre la ${o.quote.about}`)) : null,
          o.cantons.length ? h('div', { class: 'paper-section' }, h('h5', null, 'Cantones'), o.cantons.map(st => storyEl(st))) : null,
          o.international.length ? h('div', { class: 'paper-section' }, h('h5', null, 'Internacional'), o.international.map(st => storyEl(st))) : null),
        h('aside', { class: 'paper-side' },
          bar ? h('div', { class: 'box' }, h('h5', null, 'Barómetro oficial'), V.players.slice().sort((a, b) => bar.shares[b.id] - bar.shares[a.id]).map(p => {
            const prev = paper.prevBarometer ? paper.prevBarometer.shares[p.id] : null;
            const d = prev === null || prev === undefined ? null : bar.shares[p.id] - prev;
            return h('div', { class: 'bar-row' }, h('span', { class: 'short' }, p.short), hbar(bar.shares[p.id] / 0.5, p.color), h('span', { class: 'num' }, fmt.pct(bar.shares[p.id], 1)), d !== null ? h('span', { class: 'num small ' + (d > 0.002 ? 'up' : d < -0.002 ? 'down' : '') }, fmt.signed(d * 100, 1)) : null);
          }), h('p', { class: 'small' }, 'Estimación de voto. Margen de error ±3 puntos.')) : null,
          h('div', { class: 'box' }, h('h5', null, 'Economía'),
            econLine('PIB (trimestre)', fmt.pct(paper.economy.qGrowth, 2), paper.economy.qGrowth >= 0),
            econLine('PIB (interanual)', fmt.pct(paper.economy.growth, 1), paper.economy.growth >= 0),
            econLine('Paro', fmt.pct(paper.economy.unemployment, 1), paper.economy.dUnemp <= 0, fmt.signed(paper.economy.dUnemp * 100, 1)),
            econLine('Inflación', fmt.pct(paper.economy.inflation, 1), paper.economy.inflation < 0.035),
            econLine('Deuda/PIB', fmt.pct(paper.economy.debtRatio, 0), paper.economy.debtRatio < 0.9),
            econLine('Prima de riesgo', Math.round(paper.economy.spread) + ' pb', paper.economy.dSpread <= 0, fmt.signed(paper.economy.dSpread, 0))),
          h('div', { class: 'box' }, h('h5', null, 'El mundo'), paper.international.map(f => h('div', { class: 'small world-line' }, h('b', null, f.name), ` crece ${fmt.pct(f.growth, 1)}. Gobierna ${f.leader}.`, f.treaty ? ' Tratado comercial en vigor.' : ''))))))),
  };
}
function econLine(label, value, good, delta) {
  return h('div', { class: 'econ-line' }, h('span', null, label), h('b', { class: good ? 'up' : 'down' }, value), delta ? h('span', { class: 'small muted' }, delta) : null);
}

// ============================================================
//  FASE DE ACCIONES
// ============================================================
const ACTION_TABS = [['acciones', 'Acciones', 'zap'], ['partido', 'Mi partido', 'flag'], ['hacienda', 'Hacienda', 'landmark'], ['leyes', 'Leyes', 'scroll-text'],
  ['parlamento', 'Parlamento', 'users'], ['encuestas', 'Encuestas', 'chart-column'], ['partidos', 'Partidos', 'handshake']];
function phaseActions() {
  const p = me();
  const body = { acciones: tabActions, partido: tabParty, hacienda: tabHacienda, leyes: tabLaws, parlamento: tabParliament, encuestas: tabPolls, partidos: tabParties, mundo: tabWorld }[UI.tab] || tabActions;
  if (UI.road) return { main: roadToolbar(), side: null };
  return {
    main: h('div', { class: 'dock left wide glass', 'data-sk': 'act-' + UI.tab },
      h('div', { class: 'res-bar' }, resPill('Capital político', p.pc + ' PC', 'zap', p.pc < 2 ? 'warn' : ''), resPill('Fondos', fmt.k(p.funds), 'coins', p.funds < 50 ? 'bad' : ''),
        resPill('Escaños', `${seatsV(p.id)}/${V.parliament.seats}`, 'users'), resPill('Misiones', `${p.missions.filter(m => m.done).length}/3`, 'target'),
        p.evidence > 0.05 ? resPill('Riesgo judicial', fmt.pct(p.detection, 0), 'triangle-alert', p.detection > 0.15 ? 'bad' : 'warn') : null),
      h('div', { class: 'tabs' }, ACTION_TABS.map(([id, name, ic]) => h('button', { type: 'button', class: UI.tab === id ? 'on' : '', onclick: () => { UI.tab = id; render(); } }, icon(ic, { size: 15 }), name))),
      V.ready[V.me] ? h('div', { class: 'notice' }, icon('clock', { size: 16 }), 'Has marcado que has terminado. Pulsa abajo para seguir actuando.') : null,
      body(p)),
    side: sidePanel(),
  };
}
function resPill(label, value, ic, cls) { return h('div', { class: 'res ' + (cls || '') }, icon(ic, { size: 15 }), h('div', null, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value))); }
function group(id, title, hint, content, opts = {}) {
  const d = h('details', { class: 'group' + (opts.shady ? ' shady' : ''), open: !!(UI.open && UI.open[id]) }, h('summary', null, opts.icon ? icon(opts.icon, { size: 18 }) : null, h('span', null, title), hint ? h('span', { class: 'hint' }, hint) : null), h('div', { class: 'body' }, content));
  UI.open = UI.open || { ley: true };
  d.addEventListener('toggle', () => { UI.open[id] = d.open; });
  return d;
}
function actionLine(title, desc, cost, ctrl) {
  return h('div', { class: 'action-line' }, h('div', { class: 'what' }, h('b', null, title), desc ? h('span', null, desc) : null), cost ? h('span', { class: 'cost' }, cost) : null, ctrl);
}
// Encargar una encuesta: de todo el país o de un cantón (los regionalistas, solo de su tierra)
const pollScopeName = sc => !sc ? 'Todo el país' : sc.length > 1 ? 'Toda tu tierra (' + sc.map(i => V.cantons[i].name).join(', ') + ')' : V.cantons[sc[0]].name;
function pollGroup(p) {
  const scopes = pollScopes(V, p);
  const key = JSON.stringify(UI.pollScope ?? scopes[0] ?? null);
  const scope = scopes.find(x => JSON.stringify(x) === key) ?? scopes[0] ?? null;
  return group('poll', 'Encargar una encuesta', 'Solo tú verás el resultado', h('div', null,
    h('div', { class: 'row small' }, h('span', null, 'Ámbito:'), h('select', { onchange: e => { UI.pollScope = scopes[+e.target.value]; render(); } },
      scopes.map((sc, k) => h('option', { value: k, selected: JSON.stringify(sc) === JSON.stringify(scope) }, pollScopeName(sc)))),
      p.regional != null ? infoTip('Como partido regionalista, solo puedes encuestar los cantones donde te presentas.') : infoTip('Una encuesta de un solo cantón es más barata y te da su voto con detalle.')),
    POLL_TIERS.map(t => actionLine(t.name, scope ? t.desc.replace('nacional', 'en ese ámbito').replace('en cada cantón', 'en cada cantón del ámbito') : t.desc, fmt.k(pollCost(V, t, scope)),
      btn('Encargar', async () => { const r = await act({ type: 'poll', tier: t.id, scope }); if (r.ok) { UI.tab = 'encuestas'; UI.pollView = 0; render(); } }, { size: 'sm' })))), { icon: 'chart-column' });
}
// Lo que puede hacer quien preside un cantón: inaugurar obras, cambiarle el nombre y proponer una fusión
function cantonLeaderActions(c, p) {
  UI.cname = UI.cname || {}; UI.cmerge = UI.cmerge || {};
  const nb = ((V.cadj || [])[c.idx] || []).filter(i => V.cantons[i] && !V.cantons[i].merged);
  const mg = UI.cmerge[c.idx] || (UI.cmerge[c.idx] = { with: nb[0], name: '' });
  if (!nb.includes(mg.with)) mg.with = nb[0];
  const nameIn = h('input', { type: 'text', class: 'txt-in', maxlength: 28, placeholder: c.name, value: UI.cname[c.idx] || '', oninput: e => { UI.cname[c.idx] = e.target.value; } });
  const mergeName = h('input', { type: 'text', class: 'txt-in', maxlength: 28, placeholder: 'Nombre (opcional)', value: mg.name, oninput: e => { mg.name = e.target.value; } });
  return h('div', { class: 'leader-acts' },
    actionLine(`Inaugurar obras en ${c.name}`, 'Buena prensa local.', '1 PC + 30 k€', btn('Inaugurar', () => act({ type: 'inaugurate', canton: c.idx }), { size: 'sm' })),
    actionLine(`Cambiar el nombre de ${c.name}`, 'Una vez por trimestre. Sale en la prensa.', '', h('div', { class: 'row' }, nameIn,
      btn('Renombrar', async () => { const r = await act({ type: 'renameCanton', canton: c.idx, name: UI.cname[c.idx] || '' }); if (r.ok) UI.cname[c.idx] = ''; }, { size: 'sm' }))),
    nb.length ? actionLine(`Fusionar ${c.name} con un vecino`, 'Si gobiernas los dos cantones es inmediato; si no, el otro gobierno tiene que aceptarlo este trimestre. Los parlamentos se suman hasta las próximas cantonales.', '',
      h('div', { class: 'row wrap' }, h('select', { onchange: e => { mg.with = +e.target.value; } }, nb.map(i => h('option', { value: i, selected: i === mg.with }, V.cantons[i].name + (V.cantons[i].gov.president ? ` (${P(V.cantons[i].gov.president).short})` : '')))),
        mergeName, btn('Proponer', () => askConfirm(`¿Unir ${c.name} y ${V.cantons[mg.with].name} en un solo cantón${mg.name ? ' llamado «' + mg.name + '»' : ''}? No se puede deshacer.`, 'Proponer la fusión',
          () => act({ type: 'proposeMerge', canton: c.idx, with: mg.with, name: mg.name || c.name })), { size: 'sm' }))) : null);
}
function tabActions(p) {
  const out = [];
  const mine = V.proposals.filter(pr => pr.proposer === p.id);
  const myProps = mine.length ? h('div', { class: 'my-props' }, h('div', { class: 'small muted' }, 'Tus propuestas de este trimestre (los demás no las verán hasta el pleno):'),
    mine.map(pr => h('div', { class: 'prop-mini' }, h('div', { class: 'grow' }, h('b', null, proposalTitleV(pr)), h('div', { class: 'small muted' }, proposalSummaryV(pr))),
      btn('', () => act({ type: 'withdraw', id: pr.id }), { size: 'sm', kind: 'ghost', icon: 'x', title: 'Retirar (recuperas el PC)' })))) : null;
  out.push(group('ley', 'Proponer una ley', mine.length ? `${mine.length} registrada${mine.length > 1 ? 's' : ''}` : 'Máximo 2 nacionales y 2 en cada cantón por trimestre', h('div', null, myProps, lawComposer(p)), { icon: 'scroll-text' }));
  // campañas
  const targets = [['nacional', 'Todo el país']].concat(liveCantonsV().map(c => ['c' + c.idx, 'Cantón de ' + c.name])).concat(['publico', 'privado'].map(k => ['s' + k, 'Colectivo: ' + WORK_SECTORS[k].name])).concat(Object.keys(PROFESSIONS).map(k => ['g' + k, 'Colectivo: ' + PROFESSIONS[k].name]));
  const tgt = UI.camp.target === 'nacional' ? { type: 'nacional' } : UI.camp.target[0] === 'c' ? { type: 'canton', idx: +UI.camp.target.slice(1) } : UI.camp.target[0] === 's' ? { type: 'sector', ws: UI.camp.target.slice(1) } : { type: 'grupo', status: UI.camp.target.slice(1) };
  out.push(group('camp', 'Campañas y partido', 'Gana simpatías y dinero', h('div', null,
    actionLine('Campaña publicitaria', 'Mejora tu imagen entre el público elegido; funciona mejor con quien ya piensa parecido.', '1 PC + importe',
      h('div', { class: 'row' }, h('select', { onchange: e => UI.camp.target = e.target.value }, targets.map(([v, l]) => h('option', { value: v, selected: v === UI.camp.target }, l))),
        h('select', { onchange: e => UI.camp.amount = +e.target.value }, [50, 100, 200, 400].map(v => h('option', { value: v, selected: v === UI.camp.amount }, fmt.k(v)))),
        btn('Lanzar', () => act({ type: 'campaign', target: tgt, amount: UI.camp.amount }), { size: 'sm' }))),
    actionLine('Gran mitin', 'Moviliza a tus votantes afines.', '1 PC + 20 k€', btn('Celebrar', () => act({ type: 'rally' }), { size: 'sm' })),
    actionLine('Cena de donantes', V.pol.financiacion === 'publica' ? 'Prohibida por la ley de financiación vigente.' : 'Recauda dinero legal (más si eres liberal en economía).', '1 PC', btn('Organizar', () => act({ type: 'donations' }), { size: 'sm', disabled: V.pol.financiacion === 'publica' }))), { icon: 'megaphone' }));
  out.push(pollGroup(p));
  // gobierno
  const mins = Object.entries(V.gov.ministers).filter(([, v]) => v === p.id).map(([k]) => k);
  if (V.gov.president === p.id || mins.length) {
    const lines = [];
    if (V.gov.president === p.id) {
      lines.push(actionLine('Disolver las Cortes', 'Elecciones generales anticipadas al final de este trimestre.', '2 PC', btn('Disolver', () => askConfirm('¿Convocar elecciones anticipadas?', 'Disolver', () => act({ type: 'dissolve' })), { size: 'sm', kind: 'danger' })));
      const imput = V.players.filter(x => x.imputado);
      lines.push(actionLine('Indulto', 'Limpia la imputación de un partido. Polémica asegurada.', '2 PC', imput.length ? h('div', { class: 'row' }, imput.map(x => btn('Indultar a ' + x.short, () => act({ type: 'pardon', target: x.id }), { size: 'sm' }))) : h('span', { class: 'muted small' }, 'Nadie está imputado')));
      lines.push(actionLine('Remodelar el Gobierno', 'Reparte de nuevo los ministerios.', '1 PC', btn('Remodelar', () => openReshuffle(), { size: 'sm' })));
      lines.push(actionLine('Decretos-ley y Presupuestos', 'Puedes aprobar leyes por decreto (marca la casilla al proponer) y presentar los Presupuestos.', null, null));
    }
    mins.forEach(mid => lines.push(ministryLine(p, mid)));
    out.push(group('gov', 'Acción de gobierno', V.gov.president === p.id ? 'Presidencia' : 'Tus ministerios', h('div', null, lines), { icon: 'landmark' }));
  }
  // control
  const rivals = V.players.filter(x => x.id !== p.id);
  if ((!UI.ctrlTarget || UI.ctrlTarget === p.id) && rivals.length) UI.ctrlTarget = rivals[0].id;
  const rivalSel = () => h('select', { onchange: e => UI.ctrlTarget = e.target.value }, rivals.map(x => h('option', { value: x.id, selected: x.id === UI.ctrlTarget }, x.name)));
  out.push(group('ctrl', 'Control al Gobierno', 'Moción de censura y comisiones', h('div', null,
    V.gov.president && V.gov.president !== p.id ? actionLine('Moción de censura', `Propone a ${p.candidate.name} como presidente. Necesita ${absMajority(V.parliament.seats)} votos.`, '4 PC', btn('Presentar', () => askConfirm('¿Presentar una moción de censura?', 'Presentar', () => act({ type: 'censure' })), { size: 'sm' })) : null,
    actionLine('Comisión de investigación', 'Si el partido esconde corrupción, es más probable que salga a la luz este trimestre.', '2 PC', h('div', { class: 'row' }, rivalSel(), btn('Crear', () => act({ type: 'commission', target: UI.ctrlTarget }), { size: 'sm' })))), { icon: 'gavel' }));
  const gov = V.cantons.filter(c => c.gov.president === p.id);
  const offers = (V.mergeOffers || []).filter(o => o.to === p.id && o.turn === V.turn);
  if (offers.length) out.push(group('fusion', 'Propuestas de fusión', `${offers.length} pendiente${offers.length > 1 ? 's' : ''}`, h('div', null, offers.map(o => actionLine(
    `${P(o.by).short} propone unir ${V.cantons[o.a].name} y ${V.cantons[o.b].name}`, `El nuevo cantón se llamaría «${o.name}» y lo presidiría ${P(o.by).short}. Los dos parlamentos se juntan hasta las próximas cantonales.`, '',
    h('div', { class: 'row' }, btn('Aceptar', () => act({ type: 'answerMerge', id: o.id, yes: true }), { size: 'sm', kind: 'primary' }), btn('Rechazar', () => act({ type: 'answerMerge', id: o.id, yes: false }), { size: 'sm', kind: 'ghost' }))))), { icon: 'handshake' }));
  if (gov.length) out.push(group('cant', 'Tus gobiernos cantonales', gov.map(c => c.name).join(', '), h('div', null, gov.map(c => cantonLeaderActions(c, p))), { icon: 'building-2' }));
  const centers = centersPanel(p);
  if (centers) out.push(centers);
  const pef = pubFirmsPanel(p);
  if (pef) out.push(pef);
  const rds = roadsPanel(p);
  if (rds) out.push(rds);
  out.push(group('shady', 'Las cloacas', `Pruebas acumuladas: ${fmt.num(p.evidence, 1)} · riesgo este trimestre: ${fmt.pct(p.detection, 0)}`, h('div', null,
    h('p', { class: 'muted small' }, 'Cada acción turbia deja pruebas. Cada trimestre pueden salir a la luz: más fácil cuantas más pruebas, más instituciones de control y más investigaciones en tu contra. Se olvidan poco a poco.'),
    CORRUPTION_ACTIONS.map(c => {
      let ctrl;
      if (c.id === 'espionaje') ctrl = h('div', { class: 'row' }, rivalSel(), h('label', { class: 'toggle small' }, h('input', { type: 'checkbox', checked: !!UI.leak, onchange: e => UI.leak = e.target.checked }), 'Filtrar'), btn('Hacer', () => act({ type: 'corruption', id: 'espionaje', target: UI.ctrlTarget, leak: UI.leak }), { size: 'sm' }));
      else if (c.id === 'clientelismo') { const gv = V.cantons.filter(x => x.gov.president === p.id); ctrl = gv.length ? h('div', { class: 'row' }, h('select', { id: 'clc' }, gv.map(x => h('option', { value: x.idx }, x.name))), btn('Hacer', () => act({ type: 'corruption', id: 'clientelismo', canton: +document.getElementById('clc').value }), { size: 'sm' })) : h('span', { class: 'muted small' }, 'Necesitas gobernar un cantón'); }
      else ctrl = btn('Hacer', () => act({ type: 'corruption', id: c.id }), { size: 'sm' });
      const cost = [c.pc ? c.pc + ' PC' : null, c.funds ? fmt.k(c.funds) : null].filter(Boolean).join(' + ') || 'gratis';
      return actionLine(h('span', null, icon(c.icon, { size: 15 }), ' ', c.name), c.desc + (c.evidence > 0 ? ` Deja ${c.evidence} de pruebas.` : ''), cost, ctrl);
    })), { shady: true, icon: 'eye-off' }));
  return h('div', null, out);
}
// ---------- Carreteras y vías de tren ----------
// Quien tiene la competencia de transporte traza carreteras o vías tocando casillas en el mapa: cada toque añade
// un tramo por el camino más barato (aprovechando lo que ya hay de esa red y sin pasar por montañas).
const NET_UI = {
  road: { icon: 'route', title: 'Nueva carretera', noun: 'carretera', the: 'la carretera', unit: () => V.roadUnit || ROAD_COST, list: () => V.roads || [] },
  rail: { icon: 'train-front', title: 'Nueva vía de tren', noun: 'vía de tren', the: 'la vía', unit: () => V.railUnit || RAIL_COST, list: () => V.rails || [] },
};
function roadsPanel(p) {
  const owners = V.roadOwners || [];
  if (!owners.length) return null;
  if (!owners.some(o => String(o.owner) === String(UI.roadOwner))) UI.roadOwner = owners[0].owner;
  const ownN = kind => NET_UI[kind].list().filter(k => { const h = MapScene.hexAt(...k.split(',').map(Number)); return h && h.c === 0; }).length;
  const conn = V.roadConn || [], rail = V.railInfo || [];
  const mine = liveCantonsV().filter(c => UI.roadOwner === 'estado' || c.idx === UI.roadOwner);
  const railTxt = c => { const l = (rail[c.idx] || {}).links || 0; return l >= 1 ? `${c.name}: ${l >= 2 ? 'bien conectado' : 'una ciudad'}` : `${c.name}: ${l > 0 ? 'cercanías' : 'sin tren'}`; };
  return group('roads', 'Carreteras y trenes', `${ownN('road')} casillas de carretera y ${ownN('rail')} de vía en el país`, h('div', null,
    h('p', { class: 'muted small' }, 'Las carreteras y las vías de tren abaratan el transporte de mercancías entre dos cantones (o dos países) cuando unen sus capitales; el tren, mucho más (pero cuesta dos veces y media más). Las carreteras que llegan a los pueblos mejoran la calidad del transporte del cantón. Las compañías ferroviarias solo venden viajes de verdad si su ciudad está unida por tren con otras. No se puede construir por las montañas.'),
    owners.length > 1 ? h('div', { class: 'field' }, h('label', null, 'Quién la construye y la paga'), h('select', { onchange: e => { UI.roadOwner = e.target.value === 'estado' ? 'estado' : +e.target.value; render(); } },
      owners.map(o => h('option', { value: o.owner, selected: String(o.owner) === String(UI.roadOwner) }, o.label)))) : h('p', { class: 'small' }, 'Construye: ', h('b', null, owners[0].label)),
    actionLine(h('span', null, icon('route', { size: 15 }), ' Trazar una carretera'), 'Toca en el mapa una ciudad, un pueblo o una carretera y luego los sitios por los que quieras que pase.', '1 PC + obra',
      btn('Abrir el mapa', () => startRoadTool(UI.roadOwner, 'road'), { size: 'sm', kind: 'primary', icon: 'route' })),
    actionLine(h('span', null, icon('train-front', { size: 15 }), ' Tender una vía de tren'), 'Une ciudades por tren: abarata mucho el transporte y deja trabajar a las compañías ferroviarias. Empieza en una ciudad o en una vía.', '1 PC + obra',
      btn('Abrir el mapa', () => startRoadTool(UI.roadOwner, 'rail'), { size: 'sm', kind: 'primary', icon: 'train-front' })),
    h('div', { class: 'small muted' }, 'Pueblos unidos con su capital: ', mine.map(c => `${c.name} ${fmt.pct(conn[c.idx] || 0, 0)}`).join(' · ')),
    h('div', { class: 'small muted' }, 'Tren: ', mine.map(railTxt).join(' · ')),
    h('div', { class: 'small muted' }, V.pol.viasPrivadas ? 'La ley permite a las compañías ferroviarias privadas tender sus propias vías.' : 'Solo las Administraciones pueden construir vías (Ley del Sector Público).')), { icon: 'route' });
}
function roadPG() {
  if (!UI._pg || UI._pg.vref !== V) UI._pg = { vref: V, map: Client.map, roads: V.roads || [], rails: V.rails || [], roadVer: 0, railVer: 0, ci: 0, cantons: V.cantons, pol: V.pol, gov: V.gov };
  return UI._pg;
}
function startRoadTool(owner, kind = 'road') {
  UI.road = { owner, kind, pts: [], path: [] };
  UI.viewOverride = 'map';
  MapScene.roadTool = hx => roadToolClick(hx);
  render();
  setTimeout(() => { try { MapScene.goLod('hex'); } catch (e) { } }, 50);
}
function stopRoadTool() {
  UI.road = null; MapScene.roadTool = null; MapScene.setRoadPreview(null, null); render();
}
function roadToolClick(hx) {
  const R = UI.road; if (!R) return;
  const PG = roadPG(), ok = h => roadHexAllowed(PG, R.owner, h), N = NET_UI[R.kind];
  if (!ok(hx)) { toast(hx.rel === 'montana' ? 'No se puede construir por las montañas.' : 'Esa casilla no es de tu administración.', 'bad'); return; }
  if (!R.pts.length) { R.pts.push([hx.q, hx.r]); R.path = [[hx.q, hx.r]]; }
  else {
    const last = R.pts[R.pts.length - 1];
    if (last[0] === hx.q && last[1] === hx.r) return;
    const seg = roadPath(PG, last, [hx.q, hx.r], ok, R.kind);
    if (!seg) { toast(`No hay camino posible para ${N.the} hasta ahí (montañas, mar o fuera de tu territorio).`, 'bad'); return; }
    R.pts.push([hx.q, hx.r]); R.segs = (R.segs || []).concat([seg.length - 1]);
    R.path = R.path.concat(seg.slice(1));
  }
  MapScene.setRoadPreview(R.path, R.pts, R.kind);
  render();
}
function roadUndo() {
  const R = UI.road; if (!R || !R.pts.length) return;
  if (R.pts.length === 1) { R.pts = []; R.path = []; }
  else { const n = R.segs.pop(); R.pts.pop(); R.path = R.path.slice(0, R.path.length - n); }
  MapScene.setRoadPreview(R.path, R.pts, R.kind); render();
}
function roadToolbar() {
  const R = UI.road, PG = roadPG(), N = NET_UI[R.kind];
  const q = roadQuote(PG, R.path, R.kind);
  const cost = sum(q.fresh, h => roadTerrainMult(h, R.kind)) * N.unit();
  const owner = (V.roadOwners || []).find(o => String(o.owner) === String(R.owner));
  const p = me();
  const tooLong = q.fresh.length > ROAD_MAX_HEXES;
  const rail = R.kind === 'rail';
  return h('div', { class: 'dock left glass road-tool' + (rail ? ' rail' : '') },
    h('div', { class: 'row' }, h('h2', { class: 'grow' }, icon(N.icon, { size: 20 }), ' ', N.title), btn('', stopRoadTool, { kind: 'ghost', size: 'sm', icon: 'x', title: 'Cancelar' })),
    h('p', { class: 'muted small' }, owner ? owner.label + '. ' : '', R.pts.length ? `Toca otra casilla para alargarla: el tramo va por el camino más barato y aprovecha ${rail ? 'las vías' : 'las carreteras'} que ya hay.` : `Toca en el mapa la casilla donde empieza (mejor una ciudad${rail ? ' o una vía' : ', un pueblo o una carretera'}).`),
    h('div', { class: 'grid2' }, stat('Casillas nuevas', String(q.fresh.length), { icon: N.icon }), stat('Coste de la obra', fmt.bn(cost), { icon: 'coins' })),
    tooLong ? h('div', { class: 'notice bad' }, `Como mucho ${ROAD_MAX_HEXES} casillas nuevas por obra: divídela en varias.`) : null,
    h('p', { class: 'small muted' }, rail ? 'Las colinas (sobre todo), los bosques, los ríos (puentes) y las rocas encarecen la obra. Para que sirva, la vía tiene que llegar a otra ciudad. Lo paga ' : 'Las colinas, los bosques, los ríos (puentes) y las rocas encarecen la obra. Lo paga ', owner && owner.owner === 'estado' ? 'el Estado' : 'el cantón', '. Vista de casillas: acerca la cámara si no ves bien el terreno.'),
    h('div', { class: 'btn-row' },
      btn('Deshacer tramo', roadUndo, { size: 'sm', kind: 'ghost', icon: 'undo-2', disabled: !R.pts.length }),
      btn('Construir · 1 PC', async () => { const r = await act({ type: 'road', kind: R.kind, owner: R.owner, hexes: R.path }); if (r && r.ok) stopRoadTool(); }, { kind: 'primary', icon: 'check', disabled: !q.fresh.length || tooLong || p.pc < 1 })));
}

// ---------- Centros públicos ----------
// Hospitales, centros de salud, colegios, universidades, comisarías y cuarteles de los gobiernos que controla el
// jugador. Una pestaña por materia y gobierno; en cada una: cómo va el presupuesto, los centros (con su ficha para
// fijar plazas y sueldo), abrir uno nuevo y comprar centros privados.
const CTR_AREA = { sanidad: ['Sanidad', 'stethoscope'], educacion: ['Educación', 'graduation-cap'], seguridad: ['Seguridad', 'siren'], defensa: ['Defensa', 'shield'] };
const ctrBudgetOf = C => C.budget || C.sector;
function centerScopes(p) {
  const scopes = [];
  for (const area of ['sanidad', 'educacion', 'seguridad']) {
    const minister = area === 'seguridad' ? V.gov.ministers.interior : V.gov.ministers[area];
    if (minister === p.id && natApplies(V.pol, area)) scopes.push({ owner: 'estado', area, label: 'Estado' });
    V.cantons.filter(c => c.gov.president === p.id && cantApplies(V.pol, area)).forEach(c => scopes.push({ owner: c.idx, area, label: c.name }));
  }
  if (V.gov.president === p.id) scopes.push({ owner: 'estado', area: 'defensa', label: 'Estado' });
  return scopes;
}
// Nombre del pueblo o ciudad de una casilla
function ctrPlace(q, r) {
  const hx = Client.map.hexes.find(x => x.q === q && x.r === r);
  if (!hx) return '';
  const cn = V.cantons[hx.k] ? V.cantons[hx.k].name : '';
  return hx.cn ? (hx.cn === cn ? hx.cn : `${hx.cn} (${cn})`) : cn;
}
const eurM = v => fmt.int(Math.round(v / 10) * 10) + ' €/mes';
const CTR_PL = { sanitario: 'profesionales sanitarios', academico: 'docentes', operario: 'operarios', policia: 'agentes', ingeniero: 'ingenieros', oficinista: 'oficinistas', periodista: 'periodistas', agricultor: 'agricultores', pescador: 'pescadores', comerciante: 'comerciantes' };
function centersPanel(p) {
  const scopes = centerScopes(p);
  if (!scopes.length || !Client.map) return null;
  const key = sc => sc.owner + '_' + sc.area;
  if (!scopes.some(sc => key(sc) === UI.ctrScope)) UI.ctrScope = key(scopes[0]);
  const sc = scopes.find(x => key(x) === UI.ctrScope);
  // con pocas áreas, botones; con muchas, un desplegable agrupado por materia
  const tabs = scopes.length <= 1 ? null : scopes.length <= 3 ? h('div', { class: 'seg ctr-tabs' }, scopes.map(x => h('button', { type: 'button', class: key(x) === UI.ctrScope ? 'on' : '', onclick: () => { UI.ctrScope = key(x); render(); } },
    icon(CTR_AREA[x.area][1], { size: 14 }), `${CTR_AREA[x.area][0]} · ${x.label}`)))
    : h('label', { class: 'row ctr-pick' }, h('span', { class: 'small muted' }, 'Gestionar:'), h('select', { onchange: e => { UI.ctrScope = e.target.value; render(); } },
      Object.keys(CTR_AREA).filter(a => scopes.some(x => x.area === a)).map(a => h('optgroup', { label: CTR_AREA[a][0] }, scopes.filter(x => x.area === a).map(x => h('option', { value: key(x), selected: key(x) === UI.ctrScope },
        `${CTR_AREA[a][0]} · ${x.owner === 'estado' ? 'todo el país (Estado)' : 'cantón de ' + x.label}`))))));
  return group('centros', 'Centros públicos', scopes.length > 1 ? `${scopes.length} áreas a tu cargo` : `${CTR_AREA[sc.area][0]} · ${sc.label}`,
    h('div', { class: 'stack' }, tabs, centerScopeView(p, sc)), { icon: 'hospital' });
}
function centerScopeView(p, sc) {
  const ta = p.turnActions || {};
  const mine = V.firms.filter(f => f.x == null && f.ct && ctrBudgetOf(PUBLIC_CENTERS[f.ct]) === sc.area && f.pub === sc.owner);
  const built = mine.filter(f => f.ob == null), works = mine.filter(f => f.ob != null);
  const capOf = f => f.cap || PUBLIC_CENTERS[f.ct].cap;
  const staffTot = sum(built, f => f.n), capTot = sum(built, capOf), tgTot = sum(built, f => f.tg || 0);
  const autoCap = sum(built.filter(f => f.pl == null), capOf);
  const B = (V.eco.pubBud || {})[sc.owner + '_' + sc.area];
  // cómo va: lo más importante, en una frase
  let tone = 'ok', msg;
  if (!built.length) msg = works.length ? 'Tus centros están en obras: cuando terminen contratarán personal.' : 'No tienes ningún centro. Abre uno abajo.';
  else if (B && B.u > B.b + 0.5) { tone = 'bad'; msg = `Las plazas que has fijado cuestan más de lo que da el presupuesto: el exceso (unos ${fmt.int((B.u - B.b) * B.sc * 1000)} € al año) se paga aparte y sube el déficit.`; }
  else if (tgTot < staffTot - 0.5) { tone = 'bad'; msg = `El presupuesto no llega para toda la plantilla: sobran ${fmt.int(staffTot - tgTot)} personas y habrá despidos. Sube el gasto en ${CTR_AREA[sc.area][0].toLowerCase()} o cierra algún centro.`; }
  else if (B && B.b - B.u > capTot * 1.05 + 0.5) { tone = 'warn'; msg = `Sobra dinero: el presupuesto pagaría a unas ${fmt.int(B.b - B.u)} personas, pero en tus centros solo caben ${fmt.int(capTot)}. Abre otro centro o sube los sueldos.`; }
  else if (tgTot > staffTot + 0.5) { tone = 'ok'; msg = `${tgTot - staffTot === 1 ? 'Hay 1 plaza sin cubrir: se ofrece' : `Hay ${fmt.int(tgTot - staffTot)} plazas sin cubrir: se ofrecen`} y se presenta quien gane más así.`; }
  else msg = 'El presupuesto cubre la plantilla de tus centros.';
  const head = h('div', { class: 'grid3 ctr-stats' },
    stat('Centros', fmt.int(built.length), { icon: CTR_AREA[sc.area][1], sub: works.length ? `y ${works.length} en obras` : 'en funcionamiento' }),
    stat('Personal', `${fmt.int(staffTot)} / ${fmt.int(capTot)}`, { icon: 'users', sub: 'trabajando / plazas' }),
    stat('Presupuesto', B ? fmt.int(B.b) : '—', { icon: 'wallet', sub: B ? `personas que paga (≈ ${fmt.bn(B.b * B.sc / 1e6)} al año)` : 'sin centros todavía' }));
  const status = h('div', { class: 'ctr-status ' + tone }, icon(tone === 'bad' ? 'triangle-alert' : tone === 'warn' ? 'info' : 'circle-check', { size: 16 }), h('span', null, msg));
  // lista de centros
  // (dos centros iguales en el mismo pueblo se numeran)
  mine.sort((a, b) => (a.ob != null) - (b.ob != null) || a.name.localeCompare(b.name) || a.id - b.id);
  const cnt = {}, seen = {}; mine.forEach(f => { cnt[f.name] = (cnt[f.name] || 0) + 1; });
  const shown = new Map(mine.map(f => [f.id, cnt[f.name] > 1 ? `${f.name} (${seen[f.name] = (seen[f.name] || 0) + 1})` : f.name]));
  const list = mine.length ? h('div', { class: 'ctr-list' }, mine.map(f => {
    const T = PUBLIC_CENTERS[f.ct], cap = capOf(f), occ = f.n / Math.max(1, cap);
    const plTag = f.pl != null ? `${f.pl} plazas fijas` : `${f.tg ?? 0} plazas (presupuesto)`;
    return h('div', { class: 'ctr-item' + (f.ob != null ? ' obra' : '') },
      h('div', { class: 'ctr-ic' }, icon(f.ob != null ? 'hard-hat' : T.icon, { size: 18 })),
      h('div', { class: 'ctr-main' }, h('div', { class: 'ctr-name', title: shown.get(f.id) }, shown.get(f.id)), h('div', { class: 'small muted' }, `${T.name} · ${ctrPlace(f.q, f.r)}`)),
      f.ob != null ? null : btn('Gestionar', () => centerModal(p, sc, f, B, autoCap, shown.get(f.id)), { size: 'sm', icon: 'settings' }),
      f.ob != null ? h('div', { class: 'ctr-occ' }, hbar(f.ob / 100, '#9aa5b1'), h('span', { class: 'small muted' }, `En obras: ${f.ob} %`))
        : h('div', { class: 'ctr-occ' }, hbar(occ, occ >= 0.95 ? '#5ad391' : occ >= 0.6 ? '#e0b84e' : '#ff7a72'), h('span', { class: 'small' }, `${f.n} de ${cap} plazas ocupadas`)),
      f.ob != null ? null : h('div', { class: 'ctr-meta small muted' }, `${f.pay ? eurM(f.pay) + ' (sueldo propio)' : eurM(f.pw) + ' (referencia)'} · ${plTag}`));
  })) : null;
  // abrir un centro nuevo
  const types = Object.entries(PUBLIC_CENTERS).filter(([, C]) => ctrBudgetOf(C) === sc.area && (!C.stateOnly || sc.owner === 'estado'));
  UI.ctr = UI.ctr || {};
  const st = UI.ctr[key0(sc)] || (UI.ctr[key0(sc)] = { ctype: types[0][0], place: '' });
  if (!types.some(([id]) => id === st.ctype)) st.ctype = types[0][0];
  const C = PUBLIC_CENTERS[st.ctype];
  const places = Client.map.hexes.filter(x => x.c === 0 && x.f && x.cn && (x.f.includes('pueblo') || x.f.includes('ciudad') || x.f.includes('capital')) && (sc.owner === 'estado' || x.k === sc.owner) && (C.town || x.f.includes('ciudad') || x.f.includes('capital')))
    .sort((a, b) => a.k - b.k || a.cn.localeCompare(b.cn));
  if (!places.some(x => x.q + ',' + x.r === st.place)) st.place = places[0] ? places[0].q + ',' + places[0].r : '';
  const usedOpen = !!ta['center_' + sc.owner + '_' + sc.area];
  const openBox = h('div', { class: 'ctr-box' },
    h('h4', null, 'Abrir un centro nuevo'),
    h('div', { class: 'ctr-types' }, types.map(([id, T]) => h('button', { type: 'button', class: 'ctr-type' + (id === st.ctype ? ' on' : ''), onclick: () => { st.ctype = id; render(); } },
      icon(T.icon, { size: 18 }), h('b', null, T.name), h('span', { class: 'small muted' }, `${T.cap} plazas · ${fmt.bn(T.cost / 1000)}`), h('span', { class: 'small muted' }, T.town ? 'en pueblos y ciudades' : 'solo en ciudades')))),
    places.length ? h('div', { class: 'row wrap' }, h('span', { class: 'small muted' }, 'Dónde:'),
      h('select', { onchange: e => { st.place = e.target.value; } }, places.map(x => h('option', { value: x.q + ',' + x.r, selected: x.q + ',' + x.r === st.place }, `${x.cn} (${V.cantons[x.k].name})`))),
      btn(`Encargar las obras · 1 PC`, () => { const [q, r] = st.place.split(',').map(Number); act({ type: 'publicCenter', op: 'open', ctype: st.ctype, q, r, owner: sc.owner }); }, { size: 'sm', kind: 'primary', disabled: !st.place || usedOpen }))
      : h('p', { class: 'small muted' }, C.town ? 'No hay ningún pueblo ni ciudad donde abrirlo.' : 'No hay ninguna ciudad donde abrirlo.'),
    h('p', { class: 'small muted' }, usedOpen ? 'Ya has abierto o cerrado un centro de esta área este trimestre.' : `Lo construye una constructora: se paga una vez (${fmt.bn(C.cost / 1000)}) y tarda unos trimestres. Después contrata personal con el presupuesto.`));
  // nacionalizar centros privados
  const priv = (sc.area === 'sanidad' || sc.area === 'educacion') ? V.firms.filter(f => f.x == null && f.pub == null && f.k === sc.area && f.val != null && (sc.owner === 'estado' || f.c === sc.owner)) : [];
  const natBox = priv.length ? h('div', { class: 'ctr-box' },
    h('h4', null, sc.area === 'sanidad' ? 'Comprar clínicas privadas' : 'Comprar colegios privados'),
    h('p', { class: 'small muted' }, 'Nacionalizar: se paga con dinero público lo que vale la empresa (y su deuda con el banco) y su plantilla pasa a ser funcionaria.'),
    h('div', { class: 'ctr-list' }, priv.map(f => h('div', { class: 'ctr-item' },
      h('div', { class: 'ctr-ic' }, icon(FIRM_KINDS[f.k].icon, { size: 18 })),
      h('div', { class: 'ctr-main' }, h('div', { class: 'ctr-name' }, f.name), h('div', { class: 'small muted' }, `${ctrPlace(f.q, f.r)} · ${plural(Math.max(0, f.n - 1), 'trabajador', 'trabajadores')}`)),
      h('div', { class: 'ctr-price' }, fmt.int(f.val * 1000) + ' €'),
      h('div', { class: 'ctr-meta' },
        btn('Nacionalizar · 1 PC', () => askConfirm(`¿Comprar ${f.name} por ${fmt.int(f.val * 1000)} € de dinero público? Su plantilla pasará a ser funcionaria.`, 'Nacionalizar', () => act({ type: 'publicCenter', op: 'nationalize', id: f.id, owner: sc.owner })), { size: 'sm', disabled: !!ta['own_' + f.id] })))))) : null;
  return h('div', { class: 'stack' }, head, status, list, openBox, natBox,
    h('p', { class: 'small muted' }, 'Gestionar las plazas y el sueldo de un centro es gratis. Abrir o cerrar cuesta 1 PC (uno por trimestre en cada área) y privatizar o nacionalizar, 1 PC por centro.'));
}
const key0 = sc => sc.owner + '_' + sc.area;
// Ficha de un centro: cuántas plazas saca y con qué sueldo (con lo que costaría), privatizarlo o cerrarlo
function centerModal(p, sc, f, B, autoCap, title) {
  const T = PUBLIC_CENTERS[f.ct], cap = f.cap || T.cap, ta = p.turnActions || {};
  const ref = Math.max(1, f.pw || 1);
  const d = { fixed: f.pl != null, pl: f.pl ?? f.tg ?? f.n, own: !!f.pay, pay: f.pay || f.pw };
  const qName = f.pq ? CTR_PL[f.pq] || f.pq : null, bName = CTR_PL[f.bp] || 'resto';
  const nom = V.pol.nominas ?? 0.2;
  // plazas que le daría el presupuesto si no se fijan (al sueldo de referencia; con otro sueldo, más o menos)
  // (si ahora tiene plazas fijas, lo que le tocaría del dinero que dejan libre los centros con plazas fijas)
  const oldU0 = f.pl != null ? f.pl * (f.pay || ref) / ref : 0;
  const tgRef = f.pl == null ? (f.tg ?? f.n) * (f.pay ? f.pay / ref : 1)
    : B ? Math.max(0, B.b - B.u + oldU0) * cap / Math.max(1, (autoCap || 0) + cap) : f.n;
  const seg2 = (opts, val, set) => h('div', { class: 'seg' }, opts.map(([v, label]) => h('button', { type: 'button', class: val() === v ? 'on' : '', onclick: e => { set(v); [...e.currentTarget.parentNode.children].forEach((b, i) => b.classList.toggle('on', opts[i][0] === v)); upd(); } }, label)));
  // plazas
  const plRange = h('input', { type: 'range', min: 0, max: cap, step: 1, value: d.pl, 'aria-label': 'Plazas', oninput: e => { d.pl = +e.target.value; plNum.value = d.pl; upd(); } });
  const plNum = h('input', { type: 'number', class: 'num-in', min: 0, max: cap, value: d.pl, style: { width: '64px' }, oninput: e => { d.pl = clamp(Math.round(+e.target.value || 0), 0, cap); plRange.value = d.pl; upd(); } });
  const plRow = h('div', { class: 'row ctr-range' }, plRange, plNum, h('span', { class: 'small muted' }, `de ${cap}`));
  const plAutoTxt = h('p', { class: 'small muted' });
  // sueldo
  const payIn = h('input', { type: 'number', class: 'num-in', min: 0, step: 50, value: Math.round(d.pay), style: { width: '96px' }, oninput: e => { d.pay = +e.target.value || 0; upd(); } });
  const payRow = h('div', { class: 'row' }, payIn, h('span', { class: 'small muted' }, `€/mes brutos${qName ? ' para los ' + qName : ''}`));
  const payTxt = h('p', { class: 'small muted' });
  const sumBox = h('div', { class: 'ctr-sum' });
  const market = f.pq && V.eco.qualWage && V.eco.qualWage[f.pq] ? V.eco.qualWage[f.pq] * 1000 / 12 : !f.pq && V.eco.wageUnq ? V.eco.wageUnq * 1000 / 12 : null;
  function upd() {
    plRow.style.display = d.fixed ? '' : 'none';
    payRow.style.display = d.own ? '' : 'none';
    const payQ = d.own ? d.pay : f.pw, payB = f.pq ? payQ * 0.68 : payQ, ratio = payQ / ref;
    const n = d.fixed ? d.pl : Math.min(cap, Math.round(tgRef / Math.max(0.05, ratio)));
    plAutoTxt.textContent = d.fixed ? 'El centro ofrecerá estas plazas aunque el presupuesto no llegue: si se pasa, la diferencia es gasto extra.'
      : `Con el presupuesto de ahora le tocan unas ${n} plazas${d.own && Math.abs(ratio - 1) > 0.02 ? ' con ese sueldo' : ''}. Si el presupuesto cambia, cambian las plazas.`;
    payTxt.textContent = (f.pq ? `Los ${qName} cobran ${eurM(payQ)} y el resto de la plantilla (${bName}), ${eurM(payB)} (un 68 %).` : `Toda la plantilla cobra ${eurM(payQ)}.`)
      + (!market ? '' : ` En la empresa privada se paga de media ${eurM(market)}${f.pq ? '' : ' en un empleo sin cualificar'}: `
        + (payQ < market * 0.95 ? 'pagas menos, así que costará más cubrir las plazas.' : payQ > market * 1.05 ? 'pagas más, así que se presentará más gente (también de las empresas).' : 'pagas parecido.'));
    const qm = f.pq ? (f.qm || 0) : 0;
    const monthly = n * (qm * payQ + (1 - qm) * payB) * (1 + nom);
    const lines = [h('div', null, h('b', null, `${n} ${n === 1 ? 'plaza' : 'plazas'}`), ` · coste para el gobierno ≈ ${fmt.int(monthly)} €/mes (${fmt.int(monthly * 12)} € al año, con cotizaciones)`)];
    if (B && d.fixed) {
      const oldU = f.pl != null ? f.pl * (f.pay || ref) / ref : 0, newU = d.pl * ratio;
      const u = B.u - oldU + newU, over = u - B.b;
      lines.push(over > 0.5 ? h('div', { class: 'bad-txt' }, `Te pasas del presupuesto de ${CTR_AREA[sc.area][0].toLowerCase()}: unos ${fmt.int(over * B.sc * 1000)} € al año de gasto extra (más déficit).`)
        : h('div', { class: 'muted' }, `Cabe en el presupuesto: quedan unas ${fmt.int(B.b - u)} personas para tus otros centros.`));
    }
    if (n < f.n) lines.push(h('div', { class: 'bad-txt' }, `Ahora trabajan ${f.n}: sobrarían ${f.n - n} y se irían al paro poco a poco.`));
    sumBox.replaceChildren(...lines);
  }
  const canPriv = sc.area === 'sanidad' || sc.area === 'educacion';
  const body = h('div', { class: 'stack ctr-modal' },
    h('p', { class: 'small' }, `${T.name} en ${ctrPlace(f.q, f.r)}. Ahora trabajan ${f.n} de ${cap} plazas.`),
    h('h4', null, '¿Cuántas plazas saca?'),
    seg2([[false, 'Las que pague el presupuesto'], [true, 'Un número fijo']], () => d.fixed, v => { d.fixed = v; }), plRow, plAutoTxt,
    h('h4', null, '¿Con qué sueldo?'),
    seg2([[false, `El de referencia (${eurM(f.pw)})`], [true, 'Uno propio']], () => d.own, v => { d.own = v; }), payRow, payTxt,
    sumBox,
    h('details', { class: 'ctr-more' }, h('summary', { class: 'small' }, 'Privatizar o cerrar el centro'),
      h('div', { class: 'stack' },
        canPriv ? actionLine('Privatizar', 'Sale a subasta: se lo queda quien más pague, si a alguien le sale rentable llevarlo como centro privado. Si nadie puja, pierdes el PC igualmente.', '1 PC',
          btn('Subastar', () => askConfirm(`¿Sacar ${title || f.name} a subasta?`, 'Subastar', () => { closeM(); act({ type: 'publicCenter', op: 'privatize', id: f.id, owner: sc.owner }); }), { size: 'sm', disabled: !!ta['own_' + f.id] })) : null,
        actionLine('Cerrar', 'Su plantilla se va al paro. Mala prensa en el cantón.', '1 PC',
          btn('Cerrar', () => askConfirm(`¿Cerrar ${title || f.name}? Su plantilla irá al paro.`, 'Cerrar', () => { closeM(); act({ type: 'publicCenter', op: 'close', id: f.id, owner: sc.owner }); }), { size: 'sm', kind: 'danger', disabled: !!ta['center_' + sc.owner + '_' + sc.area] })))));
  upd();
  const closeM = modal(title || f.name, body, close => [
    btn('Guardar (gratis)', async () => {
      const r = await act({ type: 'publicCenter', op: 'staff', id: f.id, owner: sc.owner, plazas: d.fixed ? d.pl : null, pay: d.own ? Math.round(d.pay) : null });
      if (r && r.ok) close();
    }, { kind: 'primary' }),
    btn('Cancelar', close, { kind: 'ghost' })]);
}
// ---------- Empresas públicas ----------
// Las del Estado las lleva quien tenga el Ministerio de Economía; las de cada cantón, su presidente. Una pestaña por
// gobierno: cómo van sus empresas (lo que ganan o pierden lo pagan sus cuentas), cada empresa con su ficha (plazas,
// sueldo y precio), crear una nueva y nacionalizar empresas privadas.
const eurY = v => fmt.int(Math.round(Math.abs(v) * 1000 / 100) * 100) + ' €';
function peScopes(p) {
  const out = [];
  if (V.gov.ministers.economia === p.id) out.push({ owner: 'estado', label: 'Estado', long: 'Empresas del Estado' });
  V.cantons.filter(c => c.gov.president === p.id && !c.merged).forEach(c => out.push({ owner: c.idx, label: c.name, long: 'Empresas del cantón de ' + c.name }));
  return out;
}
function pubFirmsPanel(p) {
  const scopes = peScopes(p);
  if (!scopes.length || !Client.map) return null;
  const key = sc => 'pe_' + sc.owner;
  if (!scopes.some(sc => key(sc) === UI.peScope)) UI.peScope = key(scopes[0]);
  const sc = scopes.find(x => key(x) === UI.peScope);
  const pick = scopes.length <= 1 ? null : scopes.length <= 3 ? h('div', { class: 'seg ctr-tabs' }, scopes.map(x => h('button', { type: 'button', class: key(x) === UI.peScope ? 'on' : '', onclick: () => { UI.peScope = key(x); render(); } }, x.label)))
    : h('label', { class: 'row ctr-pick' }, h('span', { class: 'small muted' }, 'Gestionar:'), h('select', { onchange: e => { UI.peScope = e.target.value; render(); } }, scopes.map(x => h('option', { value: key(x), selected: key(x) === UI.peScope }, x.long))));
  const n = V.firms.filter(f => f.x == null && f.pe && scopes.some(x => x.owner === f.pub)).length;
  return group('empresasPub', 'Empresas públicas', n ? `${n} ${n === 1 ? 'empresa' : 'empresas'} a tu cargo` : 'Crear o nacionalizar', h('div', { class: 'stack' }, pick, peScopeView(p, sc)), { icon: 'factory' });
}
function peScopeView(p, sc) {
  const ta = p.turnActions || {};
  const L = V.peLaw || { share: 0, limit: 1 };
  const mine = V.firms.filter(f => f.x == null && f.pe && f.pub === sc.owner).sort((a, b) => (a.ob != null) - (b.ob != null) || a.name.localeCompare(b.name));
  const built = mine.filter(f => f.ob == null), works = mine.filter(f => f.ob != null);
  const res = sum(built, f => f.pr || 0), staffT = sum(built, f => f.n), capT = sum(built, f => f.cap || 0);
  const govName = sc.owner === 'estado' ? 'el Estado' : 'el cantón';
  const head = h('div', { class: 'grid3 ctr-stats' },
    stat('Empresas', fmt.int(built.length), { icon: 'factory', sub: works.length ? `y ${works.length} en obras` : 'funcionando' }),
    stat('Empleo', `${fmt.int(staffT)} / ${fmt.int(capT)}`, { icon: 'users', sub: 'trabajando / plazas' }),
    stat('Resultado', built.length ? (res >= 0 ? '+' : '−') + eurY(res) : '—', { icon: 'wallet', tone: built.length ? (res >= 0 ? 'good' : 'bad') : null, sub: built.length ? (res >= 0 ? 'de beneficio al año' : 'de pérdidas al año') : 'sin empresas todavía' }));
  let tone = 'ok', msg;
  if (!built.length) msg = works.length ? 'Tus empresas están en obras: cuando terminen contratarán a su plantilla.' : 'No tienes ninguna empresa pública. Puedes crear una o nacionalizar una privada.';
  else if (res < 0) { tone = 'bad'; msg = `Tus empresas pierden unos ${eurY(res)} al año. Lo paga ${govName} (sale como gasto en sus cuentas).`; }
  else msg = `Tus empresas ganan unos ${eurY(res)} al año, que entran en las cuentas de ${sc.owner === 'estado' ? 'el Estado' : 'tu cantón'}.`;
  const status = h('div', { class: 'ctr-status ' + tone }, icon(tone === 'bad' ? 'triangle-alert' : 'circle-check', { size: 16 }), h('span', null, msg));
  const lawTxt = h('p', { class: 'small muted' }, L.limit <= 0 ? 'La ley del sector público («Privatización total») no permite crear ni nacionalizar empresas: solo privatizar las que haya.'
    : L.limit >= 1 ? `Las empresas públicas de todos los gobiernos dan el ${fmt.pct(L.share, 1)} del empleo. La ley no pone límite.`
    : `Las empresas públicas de todos los gobiernos dan el ${fmt.pct(L.share, 1)} del empleo; la ley permite hasta el ${fmt.pct(L.limit, 0)}.`);
  const list = mine.length ? h('div', { class: 'ctr-list' }, mine.map(f => {
    const K = FIRM_KINDS[f.k], cap = f.cap || K.cap, occ = f.n / Math.max(1, cap);
    const fx = Object.entries(f.fp || {});
    const pxTxt = fx.length ? fx.map(([g, v]) => `${GOODS[g].name.toLowerCase()} a ${fmt.int(v)} €${f.mk && f.mk[g] ? ` (mercado ${fmt.int(f.mk[g])} €)` : ''}`).join(', ') : 'precio de mercado';
    return h('div', { class: 'ctr-item' + (f.ob != null ? ' obra' : '') },
      h('div', { class: 'ctr-ic' }, icon(f.ob != null ? 'hard-hat' : K.icon, { size: 18 })),
      h('div', { class: 'ctr-main' }, h('div', { class: 'ctr-name', title: f.name }, f.name), h('div', { class: 'small muted' }, `${K.name} · nivel ${f.lv || 1} · ${ctrPlace(f.q, f.r)}`)),
      f.ob != null ? null : btn('Gestionar', () => peModal(p, sc, f), { size: 'sm', icon: 'settings' }),
      f.ob != null ? h('div', { class: 'ctr-occ' }, hbar(f.ob / 100, '#9aa5b1'), h('span', { class: 'small muted' }, `En obras: ${f.ob} %`))
        : h('div', { class: 'ctr-occ' }, hbar(occ, occ >= 0.95 ? '#5ad391' : occ >= 0.6 ? '#e0b84e' : '#ff7a72'), h('span', { class: 'small' }, `${f.n} de ${cap} plazas ocupadas`)),
      f.ob != null ? null : h('div', { class: 'ctr-meta small' }, !f.ac || (!f.n && !f.pr) ? h('span', { class: 'muted' }, 'Acaba de abrir') : h('span', { class: (f.pr || 0) >= 0 ? 'good-txt' : 'bad-txt' }, `${(f.pr || 0) >= 0 ? 'Gana' : 'Pierde'} ${eurY(f.pr || 0)} al año`), h('span', { class: 'muted' }, ` · ${pxTxt}${f.up != null ? ` · ampliándose (${f.up} %)` : ''}`)));
  })) : null;
  // crear una empresa pública
  UI.peNew = UI.peNew || {};
  const st = UI.peNew[sc.owner] || (UI.peNew[sc.owner] = { kind: 'electrica', place: '' });
  const K = FIRM_KINDS[st.kind];
  const grp = k => ({ muebles: 'manuf', textil: 'manuf', maquinaria: 'manuf', armamento: 'manuf', automovilistica: 'manuf' })[k] || k;
  const used = {}; V.firms.forEach(f => { if (f.x != null || f.q == null || (f.pub != null && !f.pe)) return; const k = f.q + ',' + f.r + ':' + grp(f.k); used[k] = (used[k] || 0) + 1; });
  const places = Client.map.hexes.filter(x => x.c === 0 && x.k >= 0 && (sc.owner === 'estado' || x.k === sc.owner) && slotRule(st.kind, x, 0) > (used[x.q + ',' + x.r + ':' + grp(st.kind)] || 0))
    .sort((a, b) => a.k - b.k || (a.cn || '').localeCompare(b.cn || ''));
  if (!places.some(x => x.q + ',' + x.r === st.place)) st.place = places[0] ? places[0].q + ',' + places[0].r : '';
  const wf = typeof wageFactor === 'function' ? wageFactor({ eco: V.eco }) : 1;
  const usedNew = !!ta['pe_new_' + sc.owner];
  const outTxt = k => Object.entries(FIRM_KINDS[k].out || {}).map(([g, v]) => `${uTxt(v)} de ${GOODS[g].name.toLowerCase()}`).join(' y ');
  const newBox = h('div', { class: 'ctr-box' },
    h('h4', null, 'Crear una empresa pública'),
    h('div', { class: 'row wrap' }, h('span', { class: 'small muted' }, 'Qué:'), h('select', { onchange: e => { st.kind = e.target.value; render(); } }, PE_KINDS.map(k => h('option', { value: k, selected: k === st.kind }, FIRM_KINDS[k].name)))),
    h('p', { class: 'small muted' }, `${K.cap} plazas por nivel. Cada trabajador produce ${outTxt(st.kind)} por trimestre. La obra cuesta unos ${fmt.bn(((K.capex || 100) * wf) / 1e6)}.`),
    places.length ? h('div', { class: 'row wrap' }, h('span', { class: 'small muted' }, 'Dónde:'),
      h('select', { onchange: e => { st.place = e.target.value; } }, places.map(x => h('option', { value: x.q + ',' + x.r, selected: x.q + ',' + x.r === st.place }, `${x.cn || 'Campo'} (${V.cantons[x.k].name}) · ${x.q},${x.r}`))),
      btn('Encargar las obras · 1 PC', () => { const [q, r] = st.place.split(',').map(Number); act({ type: 'publicFirm', op: 'create', kind: st.kind, q, r, owner: sc.owner }); }, { size: 'sm', kind: 'primary', disabled: !st.place || usedNew || L.limit <= 0 }))
      : h('p', { class: 'small muted' }, 'No hay ningún sitio libre donde ponerla.'),
    usedNew ? h('p', { class: 'small muted' }, 'Ya has creado una empresa pública con este gobierno este trimestre.') : null);
  // nacionalizar
  const priv = V.firms.filter(f => f.x == null && f.pub == null && PE_KINDS.includes(f.k) && f.val != null && (sc.owner === 'estado' || f.c === sc.owner));
  UI.peNat = UI.peNat || { k: 'all', more: false };
  const kinds = PE_KINDS.filter(k => priv.some(f => f.k === k));
  if (UI.peNat.k !== 'all' && !kinds.includes(UI.peNat.k)) UI.peNat.k = 'all';
  const shown = priv.filter(f => UI.peNat.k === 'all' || f.k === UI.peNat.k).sort((a, b) => b.n - a.n);
  const lim = UI.peNat.more ? shown.length : 6;
  const natBox = priv.length ? h('div', { class: 'ctr-box' },
    h('h4', null, 'Nacionalizar una empresa privada'),
    h('p', { class: 'small muted' }, 'Se paga con dinero público lo que vale (sus edificios y su caja) y su deuda con el banco. Sus dueños se quedan el dinero y su plantilla pasa a ser funcionaria.'),
    h('div', { class: 'row wrap' }, h('span', { class: 'small muted' }, 'Sector:'), h('select', { onchange: e => { UI.peNat.k = e.target.value; UI.peNat.more = false; render(); } },
      [h('option', { value: 'all', selected: UI.peNat.k === 'all' }, `Todos (${priv.length})`)].concat(kinds.map(k => h('option', { value: k, selected: k === UI.peNat.k }, `${FIRM_KINDS[k].name} (${priv.filter(f => f.k === k).length})`))))),
    h('div', { class: 'ctr-list' }, shown.slice(0, lim).map(f => h('div', { class: 'ctr-item' },
      h('div', { class: 'ctr-ic' }, icon(FIRM_KINDS[f.k].icon, { size: 18 })),
      h('div', { class: 'ctr-main' }, h('div', { class: 'ctr-name', title: f.name }, f.name), h('div', { class: 'small muted' }, `${FIRM_KINDS[f.k].name} · nivel ${f.lv || 1} · ${ctrPlace(f.q, f.r)} · ${plural(Math.max(0, f.n - 1), 'trabajador', 'trabajadores')}`)),
      h('div', { class: 'ctr-price' }, fmt.int(f.val * 1000) + ' €'),
      h('div', { class: 'ctr-meta' }, btn('Nacionalizar · 1 PC', () => askConfirm(`¿Comprar ${f.name} por ${fmt.int(f.val * 1000)} € de dinero público? Su plantilla pasará a ser funcionaria.`, 'Nacionalizar',
        () => act({ type: 'publicFirm', op: 'nationalize', id: f.id, owner: sc.owner })), { size: 'sm', disabled: !!ta['pe_' + f.id] || L.limit <= 0 }))))),
    shown.length > lim ? btn(`Ver las ${shown.length} empresas`, () => { UI.peNat.more = true; render(); }, { size: 'sm', kind: 'ghost' }) : null) : null;
  return h('div', { class: 'stack' }, head, status, lawTxt, list, newBox, natBox,
    h('p', { class: 'small muted' }, 'Fijar plazas, sueldo y precios es gratis. Crear, nacionalizar, privatizar, ampliar o cerrar una empresa cuesta 1 PC. Los bancos y las constructoras no pueden ser públicos.'));
}
// Ficha de una empresa pública: precio de lo que vende, plazas, sueldo, cuentas y decisiones (ampliar, privatizar, cerrar)
function peModal(p, sc, f) {
  const K = FIRM_KINDS[f.k], cap = f.cap || K.cap, ta = p.turnActions || {}, ref = Math.max(1, f.pw || 1);
  const outs = f.outs || [];
  const d = { fixed: f.pl != null, pl: f.pl ?? cap, own: !!f.pay, pay: f.pay || f.pw, px: {} };
  outs.forEach(g => { d.px[g] = { on: f.fp && f.fp[g] != null, v: (f.fp && f.fp[g]) || (f.mk && f.mk[g]) || Math.round(GOODS[g].price * 1000) }; });
  const qName = f.pq ? (CTR_PL[f.pq] || PROFESSIONS[f.pq].name.toLowerCase()) : null;
  const seg2 = (opts, val, set) => h('div', { class: 'seg' }, opts.map(([v, label]) => h('button', { type: 'button', class: val() === v ? 'on' : '', onclick: e => { set(v); [...e.currentTarget.parentNode.children].forEach((b, i) => b.classList.toggle('on', opts[i][0] === v)); upd(); } }, label)));
  // precios
  const pxRows = outs.map(g => {
    const mk = (f.mk && f.mk[g]) || Math.round(GOODS[g].price * 1000);
    const inp = h('input', { type: 'number', class: 'num-in', min: 1, step: 10, value: Math.round(d.px[g].v), style: { width: '90px' }, oninput: e => { d.px[g].v = +e.target.value || 0; upd(); } });
    const row = h('div', { class: 'row' }, inp, h('span', { class: 'small muted' }, `€ por unidad de ${GOODS[g].name.toLowerCase()} (el mercado paga ${fmt.int(mk)} €)`));
    const txt = h('p', { class: 'small muted' });
    return { g, mk, row, txt, el: h('div', { class: 'stack' }, outs.length > 1 ? h('div', { class: 'small' }, h('b', null, GOODS[g].name)) : null,
      seg2([[false, `Precio de mercado (${fmt.int(mk)} €)`], [true, 'Fijar un precio']], () => d.px[g].on, v => { d.px[g].on = v; }), row, txt) };
  });
  // plazas y sueldo
  const plRange = h('input', { type: 'range', min: 0, max: cap, step: 1, value: d.pl, 'aria-label': 'Plazas', oninput: e => { d.pl = +e.target.value; plNum.value = d.pl; upd(); } });
  const plNum = h('input', { type: 'number', class: 'num-in', min: 0, max: cap, value: d.pl, style: { width: '64px' }, oninput: e => { d.pl = clamp(Math.round(+e.target.value || 0), 0, cap); plRange.value = d.pl; upd(); } });
  const plRow = h('div', { class: 'row ctr-range' }, plRange, plNum, h('span', { class: 'small muted' }, `de ${cap}`));
  const payIn = h('input', { type: 'number', class: 'num-in', min: 0, step: 50, value: Math.round(d.pay), style: { width: '96px' }, oninput: e => { d.pay = +e.target.value || 0; upd(); } });
  const payRow = h('div', { class: 'row' }, payIn, h('span', { class: 'small muted' }, `€/mes brutos${qName ? ' para los ' + qName : ''}`));
  const payTxt = h('p', { class: 'small muted' });
  const sumBox = h('div', { class: 'ctr-sum' });
  const market = f.pq && V.eco.qualWage && V.eco.qualWage[f.pq] ? V.eco.qualWage[f.pq] * 1000 / 12 : V.eco.wageUnq ? V.eco.wageUnq * 1000 / 12 : null;
  const nom = V.pol.nominas ?? 0.2;
  function upd() {
    plRow.style.display = d.fixed ? '' : 'none';
    payRow.style.display = d.own ? '' : 'none';
    // (lo que cambiarían sus ventas al año con el precio nuevo, si vende lo mismo)
    let dRev = 0;
    for (const r of pxRows) {
      const q = (f.qo && f.qo[r.g]) || 0, cur = f.fp && f.fp[r.g] != null ? f.fp[r.g] : r.mk, nw = d.px[r.g].on ? d.px[r.g].v : r.mk;
      dRev += (nw - cur) / 1000 * q * 4;
    }
    for (const r of pxRows) {
      const x = d.px[r.g]; r.row.style.display = x.on ? '' : 'none';
      if (!x.on) { r.txt.textContent = 'Vende como cualquier empresa: al precio que marque el mercado.'; continue; }
      if (x.v < r.mk * 0.995) {
        r.txt.textContent = `Más barato que el mercado: se lo quitan de las manos en su cantón (y en los demás, si les sale a cuenta con el transporte); lo que le sobre lo vende fuera a precio de mercado. Abarata la vida de la zona, pero la empresa ingresa menos y las privadas que hacen lo mismo venderán menos.`;
      } else if (x.v > r.mk * 1.005) r.txt.textContent = 'Más caro que el mercado: solo le comprarán quienes no encuentren el producto en el mercado. Lo que no venda se pierde.';
      else r.txt.textContent = 'Igual que el mercado.';
    }
    const payQ = d.own ? d.pay : f.pw, payB = f.pq ? payQ * 0.68 : payQ;
    payTxt.textContent = (f.pq ? `Los ${qName} cobran ${eurM(payQ)} y el resto de la plantilla, ${eurM(payB)} (un 68 %).` : `Toda la plantilla cobra ${eurM(payQ)}.`)
      + (market ? ` En la empresa privada se paga de media ${eurM(market)}${f.pq ? '' : ' en un empleo sin cualificar'}: ` + (payQ < market * 0.95 ? 'pagas menos, así que costará más cubrir las plazas.' : payQ > market * 1.05 ? 'pagas más, así que se presentará más gente (también de otras empresas).' : 'pagas parecido.') : '');
    const n = d.fixed ? d.pl : cap, qm = f.pq ? (f.qm || 0) : 0;
    const wagesY = n * (qm * payQ + (1 - qm) * payB) * 12 * (1 + nom);
    // (con más o menos plantilla se produce y se gasta en proporción)
    const ratio = f.n > 0 ? n / f.n : 1;
    const est = f.ac && f.n > 0 ? ((f.ac.rev + dRev) * ratio - f.ac.inp * ratio - (f.ac.carbon || 0) * ratio) * 1000 - wagesY : null;
    const lines = [h('div', null, h('b', null, `${n} ${n === 1 ? 'plaza' : 'plazas'}`), ` · sueldos y cotizaciones ≈ ${fmt.int(wagesY)} € al año`)];
    if (est != null) lines.push(h('div', { class: est >= 0 ? 'good-txt' : 'bad-txt' }, `Así, la empresa ${est >= 0 ? 'ganaría' : 'perdería'} unos ${fmt.int(Math.round(Math.abs(est) / 100) * 100)} € al año (ahora ${(f.pr || 0) >= 0 ? 'gana' : 'pierde'} ${eurY(f.pr || 0)}). ${est < 0 ? 'Lo paga ' + (sc.owner === 'estado' ? 'el Estado.' : 'tu cantón.') : ''}`));
    lines.push(h('div', { class: 'muted small' }, 'Estimación con lo que produjo y vendió el último trimestre (con más o menos plantilla, produce y gasta en proporción).'));
    sumBox.replaceChildren(...lines);
  }
  const A = f.ac;
  const acct = A ? h('table', { class: 'tbl small' }, h('tbody', null,
    [['Ventas', A.rev], ['Materias primas', -A.inp], ['Sueldos', -A.wages], ['Cotizaciones', -A.payroll]].concat(A.carbon ? [['Impuesto al carbono', -A.carbon]] : []).map(([l, v]) => h('tr', null, h('td', null, l), h('td', { class: 'r num' }, (v < 0 ? '−' : '') + eurY(v)))),
    h('tr', { class: 'tot' }, h('td', null, 'Resultado'), h('td', { class: 'r num ' + (A.profit >= 0 ? 'good-txt' : 'bad-txt') }, (A.profit < 0 ? '−' : '+') + eurY(A.profit))))) : h('p', { class: 'small muted' }, 'Aún no tiene cuentas: abrirá pronto.');
  const salesTxt = outs.map(g => `${uTxt((f.qs || {})[g] || 0)} de ${uTxt((f.qo || {})[g] || 0)} producidas de ${GOODS[g].name.toLowerCase()}`).join('; ');
  const canUp = (f.lv || 1) < (f.lvMax || 6) && f.up == null;
  const wf = typeof wageFactor === 'function' ? wageFactor({ eco: V.eco }) : 1;
  const body = h('div', { class: 'stack ctr-modal' },
    h('p', { class: 'small' }, `${K.name} de nivel ${f.lv || 1} en ${ctrPlace(f.q, f.r)}. Trabajan ${f.n} de ${cap} plazas. El último trimestre vendió ${salesTxt}.`),
    h('h4', null, '¿A qué precio vende?'), pxRows.map(r => r.el),
    h('h4', null, '¿Cuántas plazas saca?'),
    seg2([[false, `Todas (${cap})`], [true, 'Un número fijo']], () => d.fixed, v => { d.fixed = v; }), plRow,
    h('h4', null, '¿Con qué sueldo?'),
    seg2([[false, `El de referencia (${eurM(f.pw)})`], [true, 'Uno propio']], () => d.own, v => { d.own = v; }), payRow, payTxt,
    sumBox,
    h('h4', null, 'Cuentas del último año'), acct,
    h('details', { class: 'ctr-more' }, h('summary', { class: 'small' }, 'Ampliar, privatizar o cerrar'),
      h('div', { class: 'stack' },
        canUp ? actionLine('Ampliar un nivel', `Más plazas (${K.cap} más) y un 3 % más de productividad. La obra cuesta unos ${fmt.bn(((K.capex || 100) * 0.8 * wf) / 1e6)} y la paga ${sc.owner === 'estado' ? 'el Estado' : 'tu cantón'}.`, '1 PC',
          btn('Ampliar', () => { closeM(); act({ type: 'publicFirm', op: 'upgrade', id: f.id, owner: sc.owner }); }, { size: 'sm', disabled: !!ta['pe_' + f.id] })) : null,
        actionLine('Privatizar', 'Sale a subasta: se la queda quien más pague, si a alguien le sale rentable llevarla a precios de mercado. Si nadie puja, pierdes el PC igualmente.', '1 PC',
          btn('Subastar', () => askConfirm(`¿Sacar ${f.name} a subasta?`, 'Subastar', () => { closeM(); act({ type: 'publicFirm', op: 'privatize', id: f.id, owner: sc.owner }); }), { size: 'sm', disabled: !!ta['pe_' + f.id] })),
        actionLine('Cerrar', 'Su plantilla se va al paro. Mala prensa en el cantón.', '1 PC',
          btn('Cerrar', () => askConfirm(`¿Cerrar ${f.name}? Su plantilla irá al paro.`, 'Cerrar', () => { closeM(); act({ type: 'publicFirm', op: 'close', id: f.id, owner: sc.owner }); }), { size: 'sm', kind: 'danger', disabled: !!ta['pe_' + f.id] })))));
  upd();
  const closeM = modal(f.name, body, close => [
    btn('Guardar (gratis)', async () => {
      const prices = {}; outs.forEach(g => { prices[g] = d.px[g].on ? Math.round(d.px[g].v) : null; });
      const r = await act({ type: 'publicFirm', op: 'manage', id: f.id, owner: sc.owner, plazas: d.fixed ? d.pl : null, pay: d.own ? Math.round(d.pay) : null, prices });
      if (r && r.ok) close();
    }, { kind: 'primary' }),
    btn('Cancelar', close, { kind: 'ghost' })]);
}
function ministryLine(p, mid) {
  const m = MINISTRIES.find(x => x.id === mid);
  let ctrl;
  if (mid === 'hacienda') {
    const items = Object.keys(V.pol.gasto).filter(k => !AREA_IDS.includes(k) || natApplies(V.pol, k));
    ctrl = h('div', { class: 'row' }, h('select', { id: 'hf' }, items.map(a => h('option', { value: a }, 'De ' + SPEND_NAMES[a] + ` (${num2(V.pol.gasto[a])} %)`))),
      h('select', { id: 'ht' }, items.map((a, i) => h('option', { value: a, selected: i === 1 }, 'a ' + SPEND_NAMES[a]))),
      h('input', { id: 'ha', type: 'text', inputmode: 'decimal', class: 'num-in small-in', value: '0,5', title: 'Puntos de PIB (máximo 0,5)' }),
      btn('Mover', () => act({ type: 'ministry', id: 'hacienda', from: document.getElementById('hf').value, to: document.getElementById('ht').value, amount: parseFloat(document.getElementById('ha').value.replace(',', '.')) }), { size: 'sm' }));
  } else if (mid === 'interior') {
    ctrl = h('div', { class: 'row' }, h('select', { id: 'it' }, V.players.filter(x => x.id !== p.id).map(x => h('option', { value: x.id }, x.name))),
      btn('Investigar', () => act({ type: 'ministry', id: 'interior', mode: 'investigar', target: document.getElementById('it').value }), { size: 'sm' }),
      btn('Enfriar pruebas propias', () => act({ type: 'ministry', id: 'interior', mode: 'enfriar' }), { size: 'sm' }));
  } else if (mid === 'exteriores') {
    const fs = V.foreign.filter(f => !V.pol.tratados[f.id]);
    ctrl = fs.length ? h('div', { class: 'row' }, h('select', { id: 'ec' }, fs.map(f => h('option', { value: f.id }, f.name))), btn('Negociar', () => act({ type: 'ministry', id: 'exteriores', country: document.getElementById('ec').value }), { size: 'sm' })) : h('span', { class: 'muted small' }, 'Ya hay tratados con todos');
  } else if (mid === 'economia') {
    ctrl = h('div', { class: 'row' }, btn('Subir SMI', () => act({ type: 'ministry', id: 'economia', dir: 'up' }), { size: 'sm' }), btn('Bajar SMI', () => act({ type: 'ministry', id: 'economia', dir: 'down' }), { size: 'sm' }),
      btn('Atraer inversiones', () => act({ type: 'ministry', id: 'economia', mode: 'inversion' }), { size: 'sm' }));
  } else if (['sanidad', 'educacion', 'transporte'].includes(mid) && !natApplies(V.pol, mid)) {
    ctrl = h('span', { class: 'muted small' }, 'Competencia transferida a los cantones');
  } else ctrl = btn(mid === 'transporte' ? 'Plan de obras' : 'Lanzar el plan', () => act({ type: 'ministry', id: mid }), { size: 'sm' });
  return actionLine(h('span', null, icon(m.icon, { size: 15 }), ' Ministerio de ', m.name), m.power, '1 PC', ctrl);
}
function openReshuffle() {
  const eligible = [V.me].concat(V.gov.supporters || []);
  const draft = Object.assign({}, V.gov.ministers);
  const share = () => act({ type: 'govDraft', map: draft }, { toast: false });
  let done = false;
  share();
  modal('Remodelar el Gobierno', h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Los demás jugadores ven lo que vas eligiendo.'), MINISTRIES.map(m => h('div', { class: 'min-row' }, icon(m.icon, { size: 20 }), h('b', { class: 'grow' }, m.name),
    h('select', { onchange: e => { draft[m.id] = e.target.value; share(); } }, eligible.map(id => h('option', { value: id, selected: draft[m.id] === id }, P(id).short)))))),
  close => [btn('Nombrar (1 PC)', () => { done = true; close(); act({ type: 'reshuffle', map: draft }); }, { kind: 'primary' })],
  { onClose: () => { if (!done) act({ type: 'govDraft', map: null }, { toast: false }); } });
}

// ---------- Redactor de leyes ----------
function lawComposer(p) {
  const L = UI.law;
  const avail = V.derived.available[L.scope];
  const myCantons = V.cantons.filter(c => (c.parliament.composition[p.id] || 0) > 0);
  if (L.scope === 'cantonal' && (L.canton === null || !myCantons.some(c => c.idx === L.canton))) L.canton = myCantons.length ? myCantons[0].idx : null;
  if (!avail.some(a => a.id === L.pack)) { L.pack = avail[0].id; L.changes = {}; }
  const pack = packById(L.pack);
  const fieldIds = avail.find(a => a.id === L.pack).fields;
  const curOf = f => { const v = L.scope === 'cantonal' ? getPath(V.cantons[L.canton].pol, f.path) : getPath(V.pol, f.path); return v === undefined && f.optional ? null : v; };
  const fields = fieldIds.map(fid => fieldById(V, fid)).filter(Boolean);
  const valOf = f => L.changes[f.id] !== undefined ? L.changes[f.id] : curOf(f);
  const changed = Object.keys(L.changes).filter(fid => fields.some(f => f.id === fid) && !sameVal(L.changes[fid], curOf(fields.find(f => f.id === fid))));
  const isPres = V.gov.president === p.id && !V.gov.interim;
  const organic = L.scope === 'nacional' && (pack.organic || changed.some(fid => FIELDS[fid] && FIELDS[fid].organic));
  let cost = 0;
  if (L.scope === 'cantonal') cost = L.canton !== null && V.cantons[L.canton].gov.president === p.id ? 1 : 2;
  else { cost = (V.gov.president === p.id || Object.values(V.gov.ministers).includes(p.id)) ? 2 : 3; if (V.gov.ministers.hacienda === p.id && (pack.id === 'fiscal' || pack.id === 'presupuestos')) cost -= 1; if (L.decree && isPres && !organic) cost += 1; if (seatsV(p.id) === 0) cost += 2; cost = Math.max(1, cost); }
  const blockedGov = pack.govOnly && V.gov.president !== p.id && V.gov.ministers.hacienda !== p.id;
  const gdpRef = L.scope === 'cantonal' ? V.cantons[L.canton].stats.gdp : V.eco.gdp;
  const ctx = { scope: L.scope, canton: L.canton, gdp: gdpRef };
  UI.lawCtx = { fields, curOf, ctx };
  // En los regímenes fiscales, los impuestos que no existen no aparecen hasta que alguien los añade
  const shown = fields.filter(f => !(pack.addable && f.optional && curOf(f) == null && L.changes[f.id] === undefined));
  const addable = pack.addable ? fields.filter(f => !shown.includes(f)) : [];
  const fieldRow = f => {
    const cur = curOf(f), val = valOf(f), isCh = !sameVal(val, cur);
    let editor;
    if (f.treaty) {
      // tratado: ninguno, total o parcial (eligiendo los productos)
      const mode = val === true ? 'total' : Array.isArray(val) && val.length ? 'parcial' : 'no';
      const setV = v => { if (sameVal(v, cur)) delete L.changes[f.id]; else L.changes[f.id] = v; render(); };
      editor = h('div', { class: 'fnew-wrap treaty-ed' },
        h('select', { class: 'fnew', onchange: e => { const m = e.target.value; setV(m === 'total' ? true : m === 'parcial' ? (Array.isArray(cur) && cur.length ? cur.slice() : ['grano']) : false); } },
          [['no', 'Sin tratado'], ['total', 'Libre comercio total'], ['parcial', 'Parcial: solo algunos productos']].map(([k, t]) => h('option', { value: k, selected: k === mode }, t))),
        mode === 'parcial' ? h('div', { class: 'good-chips' }, GOOD_IDS.map(g => h('button', { type: 'button', class: 'chip-btn' + (val.includes(g) ? ' on' : ''), title: GOODS[g].name,
          onclick: () => { const nv = val.includes(g) ? val.filter(x => x !== g) : GOOD_IDS.filter(x => x === g || val.includes(x)); setV(nv.length ? nv : false); } }, icon(GOODS[g].icon, { size: 13 }), GOODS[g].name))) : null);
    } else if (f.cantonSet) {
      // lista de cantones (concierto económico)
      const setV = v => { if (sameVal(v, cur)) delete L.changes[f.id]; else L.changes[f.id] = v; render(); };
      const cur2 = Array.isArray(val) ? val : [];
      editor = h('div', { class: 'fnew-wrap treaty-ed' }, h('div', { class: 'good-chips' }, liveCantonsV().map(c => h('button', { type: 'button', class: 'chip-btn' + (cur2.includes(c.idx) ? ' on' : ''),
        title: `Fervor cantonalista ${Math.round((c.ferv ? c.ferv.can : 0) * 100)} %`,
        onclick: () => setV(cur2.includes(c.idx) ? cur2.filter(x => x !== c.idx) : cur2.concat([c.idx]).sort((x, y) => x - y)) }, icon('map-pin', { size: 12 }), c.name))));
    } else if (f.optional && val == null) {
      editor = h('div', { class: 'fnew opt-new' }, cur == null ? h('span', { class: 'muted small' }, 'No existe') : h('span', { class: 'small' }, h('b', null, 'Se suprime')),
        cur == null ? btn(f.tariff ? 'Ponerlo' : 'Crearla', () => { L.changes[f.id] = f.newValue; render(); }, { size: 'sm', icon: 'sparkles' }) : btn('Deshacer', () => { delete L.changes[f.id]; render(); }, { size: 'sm' }));
    } else {
      editor = h('div', { class: 'fnew-wrap' }, f.range ? numEditor(f, cur, val, L, gdpRef) :
        h('select', { class: 'fnew', onchange: e => { const v = f.options[+e.target.value]; if (sameVal(v, cur)) delete L.changes[f.id]; else L.changes[f.id] = v; render(); } },
          f.options.map((o, i) => h('option', { value: i, selected: o === val }, (o === cur ? 'Sin cambios: ' : '') + f.label(o)))),
        f.optional ? h('button', { type: 'button', class: 'link-btn small', title: cur == null ? 'Quitar de la propuesta' : 'Suprimir esta ley o impuesto',
          onclick: () => { if (cur == null) delete L.changes[f.id]; else L.changes[f.id] = null; render(); } }, icon('x', { size: 12 }), cur == null ? ' Quitar' : ' Suprimir') : null);
    }
    return h('div', { class: 'field-row' + (isCh ? ' changed' : '') },
      h('div', { class: 'fname' }, f.icon ? icon(f.icon, { size: 15 }) : null, h('b', null, f.name), infoTip(f.desc, { size: 13 })),
      h('div', { class: 'fnow' }, h('small', null, 'Ahora'), h('span', null, f.label(cur))),
      editor, moneyLine(f, cur, val, ctx));
  };
  const packBtn = a => { const pk = packById(a.id); return h('button', { type: 'button', class: 'pack-btn' + (a.id === L.pack ? ' on' : ''), onclick: () => { L.pack = a.id; L.changes = {}; render(); } }, icon(pk.icon, { size: 20 }), h('span', null, pk.name)); };
  const mainPacks = avail.filter(a => !packById(a.id).standalone), loose = avail.filter(a => packById(a.id).standalone);
  return h('div', { class: 'composer' },
    h('div', { class: 'seg' },
      h('button', { type: 'button', class: L.scope === 'nacional' ? 'on' : '', onclick: () => { L.scope = 'nacional'; L.pack = null; L.changes = {}; render(); } }, 'Parlamento nacional'),
      h('button', { type: 'button', class: L.scope === 'cantonal' ? 'on' : '', disabled: !myCantons.length, title: myCantons.length ? '' : 'Necesitas escaños en algún parlamento cantonal', onclick: () => { L.scope = 'cantonal'; L.pack = null; L.changes = {}; render(); } }, 'Parlamentos cantonales')),
    L.scope === 'cantonal' ? h('div', { class: 'row' }, h('span', { class: 'small' }, 'Cantón:'), h('select', { onchange: e => { L.canton = +e.target.value; L.changes = {}; render(); } }, myCantons.map(c => h('option', { value: c.idx, selected: c.idx === L.canton }, `${c.name} (${c.parliament.composition[p.id]} esc.)`)))) : null,
    h('div', { class: 'pack-grid' }, mainPacks.map(packBtn)),
    loose.length ? h('div', { class: 'small muted pack-sub' }, 'Leyes sueltas (no forman parte de ningún paquete)') : null,
    loose.length ? h('div', { class: 'pack-grid' }, loose.map(packBtn)) : null,
    h('div', { class: 'doc bill' },
      h('div', { class: 'row' }, icon(pack.icon, { size: 22 }), h('h3', null, pack.name), infoTip(pack.desc), organic ? h('span', { class: 'tag brass' }, 'Ley orgánica: mayoría absoluta') : h('span', { class: 'tag' }, 'Mayoría simple')),
      blockedGov ? h('p', { class: 'warn-text' }, 'Solo el Gobierno (presidencia o Hacienda) puede presentar esta ley.') : null,
      h('div', { class: 'fields' }, shown.map(fieldRow)),
      addable.length ? h('div', { class: 'row add-tax' }, icon('sparkles', { size: 15 }), h('span', { class: 'small' }, pack.addLabel || 'Crear un impuesto que hoy no existe:'),
        h('select', { onchange: e => { const f = addable.find(x => x.id === e.target.value); if (f) { L.changes[f.id] = f.newValue; render(); } } },
          h('option', { value: '' }, 'Elegir…'), addable.map(f => h('option', { value: f.id }, f.name)))) : null,
      billImpact(),
      changed.length ? h('div', { class: 'ideo-hint' }, 'Dirección: ', ideologyDirection(fields.filter(f => changed.includes(f.id)), curOf)) : null),
    h('div', { class: 'row' },
      isPres && L.scope === 'nacional' && !organic ? h('label', { class: 'toggle small' }, h('input', { type: 'checkbox', checked: L.decree, onchange: e => { L.decree = e.target.checked; render(); } }), 'Como decreto-ley (+1 PC): solo decae si lo tumba la mayoría absoluta') : null,
      h('span', { class: 'spacer' }),
      btn(changed.length ? `Registrar (${cost} PC)` : 'Cambia al menos un apartado', async () => {
        const r = await act({ type: 'propose', pack: L.pack, canton: L.scope === 'cantonal' ? L.canton : undefined, changes: Object.fromEntries(changed.map(fid => [fid, L.changes[fid]])), decree: L.decree && isPres && !organic });
        if (r.ok) { L.changes = {}; L.decree = false; render(); }
      }, { kind: 'primary', icon: 'check', disabled: !changed.length || blockedGov })));
}
// Editor continuo: impuestos (porcentaje con hasta dos decimales) y partidas (% del PIB).
// Mientras se arrastra la barra, la cifra, la recaudación o el coste y el efecto en el saldo se actualizan al momento.
function numEditor(f, cur, val, L, gdpRef) {
  const k = f.unit === 'pct' ? 1 : 100;
  const toU = v => Math.round((v || 0) * k * 100) / 100;
  const fromU = u => clamp(Math.round(u * 100) / (k * 100), f.range[0], f.range[1]);
  const store = v => { if (cur != null && Math.abs(v - cur) < 1e-9) delete L.changes[f.id]; else L.changes[f.id] = v; };
  const set = u => { if (!isFinite(u)) return; store(fromU(u)); render(); };
  const min = toU(f.range[0]), max = toU(f.range[1]), step = 0.01;
  const txt = h('input', { type: 'text', inputmode: 'decimal', class: 'num-in', value: toU(val).toLocaleString('es-ES', { maximumFractionDigits: 2 }), 'aria-label': f.name + (f.unit === 'pct' ? ' (% del PIB)' : ' (%)'), title: `Entre ${min.toLocaleString('es-ES')} y ${max.toLocaleString('es-ES')}, con hasta dos decimales`,
    onchange: e => set(parseFloat(String(e.target.value).replace(',', '.'))), onkeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
  const live = e => {
    const v = fromU(+e.target.value);
    txt.value = toU(v).toLocaleString('es-ES', { maximumFractionDigits: 2 });
    store(v);
    refreshMoney(f, cur, v);
  };
  return h('div', { class: 'num-edit fnew' },
    h('input', { type: 'range', min, max, step, value: toU(val), 'aria-label': f.name, oninput: live, onchange: e => set(+e.target.value) }),
    txt, h('span', { class: 'small' }, f.unit === 'pct' ? '% PIB' : '%'));
}
// Dinero que mueve un apartado de una ley con un valor dado: {kind: 'rev' | 'cost', amount (miles de millones al año)}
function fieldMoney(f, v, ctx) {
  const e = V.eco;
  if (f.tax) return { kind: 'rev', amount: v == null ? 0 : estimateTax(V, f.tax, v, ctx.scope, ctx.canton) };
  if (f.path && (f.path.startsWith('gasto.') || f.path.startsWith('sub.'))) return { kind: 'cost', amount: (v || 0) / 100 * ctx.gdp };
  if (ctx.scope !== 'nacional') return null;
  const sb = e.spendingBreakdown || {}, cur = getPath(V.pol, f.path);
  if (f.id === 'pensiones') return { kind: 'cost', amount: (sb.pensiones || 0) * v / cur };
  if (f.id === 'desempleo') { const r = q => [0.15, 0.25, 0.35, 0.45, 0.6][q]; return { kind: 'cost', amount: (sb.desempleo || 0) * r(v) / r(cur) }; }
  if (f.id === 'rentaBasica') return { kind: 'cost', amount: v ? (sb.rentaBasica || 0.2 * e.avgWage * e.population * 0.84 / 1e6) : 0 };
  if (f.id === 'carbono') return { kind: 'rev', amount: v * e.gdp * 0.004 * (e.emissions || 100) / 100 };
  if (f.id === 'aranceles') { const tr = e.trade || {}; return { kind: 'rev', amount: (v || 0) * sum(GOOD_IDS.filter(g => !(V.pol.arImp && V.pol.arImp[g] != null)), g => tr[g] ? tr[g].qm * tr[g].ref / 1e6 : 0) }; }
  if (f.tariff) { const t = (e.trade || {})[f.good]; if (!t) return null; const base = (f.exp ? t.qx : t.qm) * t.ref / 1e6; return { kind: 'rev', amount: (v == null ? (f.exp ? 0 : V.pol.aranceles || 0) : v) * base }; }
  return null;
}
function moneyParts(f, cur, val, ctx) {
  const m0 = fieldMoney(f, cur, ctx); if (!m0) return null;
  const m1 = fieldMoney(f, val, ctx), d = m1.amount - m0.amount;
  const verb = m0.kind === 'rev' ? 'Recauda' : 'Cuesta';
  if (Math.abs(d) < Math.max(1e-7, Math.abs(m0.amount) * 0.003)) return { text: `${verb} ≈ ${fmt.bn(m0.amount)} al año`, cls: '' };
  const good = m0.kind === 'rev' ? d > 0 : d < 0;
  return { text: `${verb} ≈ ${fmt.bn(m0.amount)} → ${fmt.bn(m1.amount)} al año (${fmt.sbn(d)})`, cls: good ? 'up' : 'down' };
}
function moneyLine(f, cur, val, ctx) {
  const mp = moneyParts(f, cur, val, ctx);
  return mp ? h('div', { class: 'money small ' + mp.cls, id: 'money-' + f.id }, icon(fieldMoney(f, cur, ctx).kind === 'rev' ? 'piggy-bank' : 'coins', { size: 13 }), ' ', h('span', null, mp.text)) : null;
}
// Efecto estimado de toda la propuesta en el saldo (positivo = mejora las cuentas)
function billImpactValue() {
  const lc = UI.lawCtx; if (!lc) return null;
  let tot = 0, any = false;
  for (const f of lc.fields) {
    if (UI.law.changes[f.id] === undefined) continue;
    const cur = lc.curOf(f), m0 = fieldMoney(f, cur, lc.ctx); if (!m0) continue;
    const m1 = fieldMoney(f, UI.law.changes[f.id], lc.ctx); any = true;
    tot += (m1.amount - m0.amount) * (m0.kind === 'rev' ? 1 : -1);
  }
  return any ? tot : null;
}
function billImpactText(v) {
  const lc = UI.lawCtx, who = lc && lc.ctx.scope === 'cantonal' ? 'del cantón' : 'del Estado';
  return `Efecto estimado en el saldo ${who}: ${v >= 0 ? '+' : '−'}${fmt.bn(Math.abs(v))} al año (${v >= 0 ? '+' : '−'}${fmt.pct(Math.abs(v) / lc.ctx.gdp, 2)} del PIB${lc.ctx.scope === 'cantonal' ? ' cantonal' : ''}). Cálculo estático: no incluye cómo reaccionará la economía.`;
}
function billImpact() {
  const v = billImpactValue();
  return h('div', { class: 'impact small ' + (v == null ? 'hidden' : v >= 0 ? 'up' : 'down'), id: 'bill-impact' }, icon('scale', { size: 14 }), ' ', h('span', null, v == null ? '' : billImpactText(v)));
}
function refreshMoney(f, cur, v) {
  const lc = UI.lawCtx; if (!lc) return;
  const el = document.getElementById('money-' + f.id), mp = moneyParts(f, cur, v, lc.ctx);
  if (el && mp) { el.className = 'money small ' + mp.cls; el.lastChild.textContent = mp.text; }
  const bi = document.getElementById('bill-impact'), tv = billImpactValue();
  if (bi) { bi.className = 'impact small ' + (tv == null ? 'hidden' : tv >= 0 ? 'up' : 'down'); bi.lastChild.textContent = tv == null ? '' : billImpactText(tv); }
}
function ideologyDirection(fields, curOf) {
  const tot = {};
  fields.forEach(f => { const a = f.pos(curOf(f)), b = f.pos(UI.law.changes[f.id]); for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) tot[k] = (tot[k] || 0) + (b[k] ?? 0) - (a[k] ?? 0); });
  const tags = Object.entries(tot).filter(([, d]) => Math.abs(d) > 0.05).map(([k, d]) => { const ax = AXES.find(x => x.id === k); const left = ax.flip ? d > 0 : d < 0; return h('span', { class: 'tag dir ' + (left ? 'dir-left' : 'dir-right') }, icon(left ? 'arrow-left' : 'arrow-right', { size: 13 }), `${ax.name}: hacia ${(d < 0 ? ax.ends[0] : ax.ends[1]).toLowerCase()}`); });
  return tags.length ? tags : h('span', { class: 'muted small' }, 'sin sesgo ideológico claro (cambia las reglas del juego)');
}

// ---------- Mi partido ----------
function tabParty(p) {
  return h('div', null,
    section('Mis misiones secretas', h('div', { class: 'grid3 compact' }, p.missions.map(m => missionCard(m)))),
    section('Mi ideología', h('p', { class: 'muted small' }, 'La línea muestra cuánto te has movido desde el debate por lo que has votado. Un voto suelto apenas cuenta; votar una y otra vez en una dirección cambia tu etiqueta.'),
      ideologyAxes([p], { trail: true }), h('div', { class: 'small' }, AXES.map(a => h('span', { class: 'tag' }, `${a.name}: ${axisLabel(a.id, p.ideo[a.id])}`)))),
    section('Ingresos del trimestre', V.derived.income ? h('dl', { class: 'kv' }, h('dt', null, 'Capital político'), h('dd', null, '+' + V.derived.income.pc + ' PC'),
      h('dt', null, 'Subvención pública'), h('dd', null, fmt.k(V.derived.income.subsidy)), h('dt', null, 'Gastos de estructura'), h('dd', null, '−' + fmt.k(V.derived.income.costs))) : null),
    p.intel && p.intel.length ? section('Informes de tus espías', h('ul', { class: 'log' }, p.intel.slice(0, 6).map(x => h('li', null, `${shortQuarter(x.turn)}: ${P(x.target).name} tenía ${fmt.num(x.evidence, 1)} de pruebas.`)))) : null,
    section('Lo que has hecho', h('ul', { class: 'log' }, p.log.slice(0, 20).map(l => h('li', { class: l.secret ? 'secret' : '' }, h('span', { class: 'faint' }, shortQuarter(l.turn) + ' '), l.text)))));
}

// ---------- Mercados ----------
// Precio de cada producto (lo que cobra quien lo produce y lo que se paga de media), cantidades del turno y comercio
const pxTxt = v => v >= 10 ? fmt.num(v, 1) + ' mil €' : fmt.int(v * 1000) + ' €';
const uTxt = v => (v >= 100 ? fmt.int(v) : v >= 10 ? fmt.num(v, 1).replace(/,0$/, '') : fmt.num(v, 2).replace(/,?0+$/, '')) + ' u';
function marketsTable() {
  const e = V.eco, tr = e.trade || {};
  const imp = g => V.pol.arImp && V.pol.arImp[g] != null ? V.pol.arImp[g] : V.pol.aranceles || 0, exp = g => V.pol.arExp && V.pol.arExp[g] != null ? V.pol.arExp[g] : 0;
  return h('div', null,
    h('div', { class: 'mkt-list' }, GOOD_IDS.filter(g => tr[g]).map(g => { const t = tr[g], d = t.price / t.ref - 1, ch = t.next / Math.max(1e-9, t.origin) - 1;
      const qline = [`producimos ${uTxt(t.q)}`, `se piden ${uTxt(t.qd)}`];
      if (t.qm > 0.5) qline.push(`importamos ${uTxt(t.qm)}`);
      if (t.qx > 0.5) qline.push(`exportamos ${uTxt(t.qx)}`);
      if (t.short > 0.5) qline.push(`faltan ${uTxt(t.short)}`);
      if (t.lost > 0.5) qline.push(`se pierden ${uTxt(t.lost)}`);
      return h('div', { class: 'mkt-row' },
        h('div', { class: 'row small' }, icon(GOODS[g].icon, { size: 14 }), h('b', { title: t.name }, goodShort(g)),
          h('span', { class: 'faint', title: 'Precio en origen: lo que cobra quien lo produce' }, 'origen ' + pxTxt(t.origin)),
          h('span', { class: 'px', title: 'Lo que se paga de media en el país (con el transporte)' }, pxTxt(t.price)),
          h('span', { class: 'small ' + (ch > 0.005 ? 'down' : ch < -0.005 ? 'up' : 'muted'), title: 'Cómo cambia el precio en origen para el próximo trimestre' }, ch > 0.005 ? '▲ ' + fmt.pct(ch, 0) : ch < -0.005 ? '▼ ' + fmt.pct(-ch, 0) : '= ')),
        h('div', { class: 'small muted' }, qline.join(' · ') + ' por trimestre'),
        h('div', { class: 'small faint' }, `Cantones ${pxTxt(t.min)} – ${pxTxt(t.max)} · ${(d >= 0 ? '+' : '') + fmt.pct(d, 0)} frente a su precio normal · saldo exterior `, h('span', { class: t.net >= 0 ? 'up' : 'down' }, fmt.sbn(t.net)),
          ` al año · aranceles ${fmt.pct(imp(g), 0)} / ${fmt.pct(exp(g), 0)}`)); })),
    h('p', { class: 'muted small' }, 'Cada trimestre las empresas venden lo que producen y hogares, empresas y Administraciones compran lo que necesitan. Si se pide más de lo que se vende, el precio sube; si sobra, baja (P siguiente = P · e^(0,2·(compras − ventas)/ventas)). Lo que se compra en el cantón que lo produce se paga a precio de origen; traerlo de otro cantón añade el transporte, y de otro país, además, los aranceles (salvo que un tratado lo cubra). Lo que sobra se vende a los países que lo necesitan y lo que nadie compra se pierde. La electricidad y la conexión a internet solo viajan por tierra.'));
}
const qty = v => v >= 1e6 ? fmt.num(v / 1e6, 1) + ' M' : v >= 1e4 ? fmt.int(v / 1e3) + ' mil' : v >= 10 ? fmt.int(v) : fmt.num(v, 1);
const goodShort = g => GOODS[g].name.split(' (')[0];
function cantonMarket(c) {
  const e = V.eco, i = c.idx, cp = (e.cprices || [])[i] || {}, tr = e.trade || {};
  return h('div', null,
    h('p', { class: 'small muted' }, 'Precios en este cantón: lo que se produce aquí sale a precio de origen; lo que hay que traer de lejos paga el transporte.'),
    h('div', { class: 'scroll-x' }, h('table', { class: 'tbl small' }, h('thead', null, h('tr', null, h('th', null, 'Producto'), h('th', { class: 'r' }, 'Precio'), h('th', { class: 'r' }, 'Transporte'), h('th', { class: 'r' }, 'Produce'), h('th', { class: 'r' }, 'Hogares'))),
      h('tbody', null, GOOD_IDS.filter(g => cp[g] && tr[g]).map(g => { const d = cp[g] / Math.max(1e-9, tr[g].next) - 1, sq = (c.supplyQ || {})[g] || 0, dq = (c.hhDemand || {})[g] || 0;
        return h('tr', null, h('td', { title: GOODS[g].name }, icon(GOODS[g].icon, { size: 13 }), ' ', goodShort(g)), h('td', { class: 'r num' }, pxTxt(cp[g])), h('td', { class: 'r num ' + (d > 0.02 ? 'down' : '') }, d > 0.005 ? '+' + fmt.pct(d, 0) : '—'),
          h('td', { class: 'r num' }, sq ? qty(sq) : '—'), h('td', { class: 'r num' }, dq ? qty(dq) : '—')); })))),
    h('p', { class: 'small muted' }, 'Precio por unidad para el próximo trimestre. «Transporte»: lo que se paga aquí por encima del precio de origen. «Produce» y «Hogares»: unidades por trimestre que salen de las empresas del cantón y que piden sus hogares (las empresas compran además sus materias primas).'));
}

// ---------- Hacienda ----------
function tabHacienda() {
  const e = V.eco;
  const rev = e.revenueBreakdown, sp = e.spendingBreakdown;
  const balance = e.revenue - e.spending;
  const hist = k => e.history.map(x => x[k]);
  const debtPct = e.debtRatio;
  const spendRows = Object.entries(sp).filter(([, v]) => v > e.spending * 0.001).sort((a, b) => b[1] - a[1]);
  const maxS = Math.max(...spendRows.map(r => r[1]));
  const revRows = Object.entries(rev).filter(([, v]) => v > e.revenue * 0.001).sort((a, b) => b[1] - a[1]);
  const maxR = Math.max(...revRows.map(r => r[1]));
  const palette = ['#e0b84e', '#4fa3e0', '#e06a5a', '#57c48d', '#b57be0', '#e08f4e', '#4fd0c7', '#c9c95a', '#9aa5b1', '#e05aa0', '#7b8be0', '#a8763e', '#5ad07e', '#d0d0d0', '#ff7a7a', '#88a'];
  return h('div', null,
    h('div', { class: 'big3' },
      h('div', { class: 'big' }, h('span', null, 'Ingresos'), h('b', null, fmt.bn(e.revenue)), h('small', null, fmt.pct(e.revenue / e.gdp) + ' del PIB')),
      h('div', { class: 'big' }, h('span', null, 'Gastos'), h('b', null, fmt.bn(e.spending)), h('small', null, fmt.pct(e.spending / e.gdp) + ' del PIB')),
      h('div', { class: 'big ' + (balance >= 0 ? 'good' : 'bad') }, h('span', null, balance >= 0 ? 'Superávit' : 'Déficit'), h('b', null, fmt.bn(Math.abs(balance))), h('small', null, fmt.pct(Math.abs(balance) / e.gdp) + ' del PIB'))),
    section('Deuda pública', h('div', { class: 'gauge' }, h('div', { class: 'gauge-fill', style: { width: clamp(debtPct / 1.6, 0, 1) * 100 + '%', background: debtPct > 1 ? '#ff6b6b' : debtPct > 0.6 ? '#ffc23d' : '#57c48d' } }),
      h('span', { class: 'mark', style: { left: 60 / 1.6 + '%' } }, '60 %'), h('span', { class: 'mark', style: { left: 100 / 1.6 + '%' } }, '100 %')),
      h('div', { class: 'row small' }, h('b', null, fmt.pct(debtPct, 1) + ' del PIB'), h('span', null, `(${fmt.bn(e.debt)})`), h('span', { class: 'spacer' }), h('span', null, `Interés medio ${fmt.pct(e.interestRate, 1)} · prima de riesgo ${Math.round(V.derived.spread)} pb · calificación `), h('b', { class: 'rating ' + ratingTone(e.rating) }, e.rating || '—'))),
    h('div', null,
      section('¿En qué se gasta?', h('div', { class: 'donut-split' }, donut(spendRows.map(([k, v], i) => ({ label: SPEND_NAMES[k] || k, value: v, color: palette[i % palette.length] })), { center: fmt.pct(e.spending / e.gdp, 0) }),
        h('div', { class: 'budget-list' }, spendRows.map(([k, v], i) => h('div', { class: 'brow' }, icon(SPEND_ICONS[k] || 'coins', { size: 15 }), h('span', { class: 'bname' }, SPEND_NAMES[k] || k), hbar(v / maxS, palette[i % palette.length]), h('span', { class: 'num' }, fmt.pct(v / e.gdp, 1))))))),
      section('¿De dónde sale el dinero?', h('div', { class: 'budget-list' }, revRows.map(([k, v]) => h('div', { class: 'brow' }, icon(REV_ICONS[k] || 'coins', { size: 15 }), h('span', { class: 'bname' }, REV_NAMES[k] || k), hbar(v / maxR, '#57c48d'), h('span', { class: 'num' }, fmt.pct(v / e.gdp, 1))))),
        h('p', { class: 'muted small' }, `Presión fiscal: ${fmt.pct(e.taxBurden, 1)} del PIB.`))),
    group('h-sect', 'Estructura productiva', 'Qué produce el país', h('div', null, h('div', { class: 'stacked' }, SECTORS.filter(s0 => e.sectorShare[s0.id] > 0.004).map(s0 => h('i', { style: { width: e.sectorShare[s0.id] * 100 + '%', background: s0.color }, title: `${s0.name}: ${fmt.pct(e.sectorShare[s0.id], 1)}` }))),
      h('div', { class: 'legend small' }, SECTORS.filter(s0 => e.sectorShare[s0.id] > 0.004).map(s0 => h('span', null, h('i', { style: { background: s0.color } }), `${s0.name} ${fmt.pct(e.sectorShare[s0.id], 0)}`)))), { icon: 'factory' }),
    group('h-trade', 'Mercados y comercio exterior', `Saldo ${fmt.sbn(e.tradeBalance || 0)}`, marketsTable(), { icon: 'ship' }),
    group('h-partners', 'Con quién comerciamos', 'Euros al año', h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'r' }, 'Les vendemos'), h('th', { class: 'r' }, 'Nos venden'), h('th', null, ''))),
      h('tbody', null, (e.partners || []).filter(x => V.foreign.some(y => y.id === x.id)).sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports)).map(x => { const f = V.foreign.find(y => y.id === x.id); const t = V.pol.tratados[f.id];
        return h('tr', { class: 'clickable', onclick: () => inspect({ type: 'foreign', id: f.id }, 'resumen') }, h('td', null, h('span', { class: 'flagchip', style: { background: f.color } }), ' ', f.name), h('td', { class: 'r num' }, fmt.bn(x.exports || 0)), h('td', { class: 'r num' }, fmt.bn(x.imports || 0)), h('td', { class: 'small muted' }, treatyLabel(t))); }))), { icon: 'globe' }),
    group('h-cant', 'Presupuestos de los cantones', 'Toca uno para verlo', h('div', null, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Cantón'), h('th', { class: 'r' }, 'Ingresos'), h('th', { class: 'r' }, 'Gastos'), h('th', { class: 'r' }, 'Saldo'), h('th', { class: 'r' }, 'Deuda'))),
      h('tbody', null, liveCantonsV().map(c => h('tr', null, h('td', null, c.name), h('td', { class: 'r num' }, fmt.bn(c.budget.revenue)), h('td', { class: 'r num' }, fmt.bn(c.budget.spending)),
        h('td', { class: 'r num ' + (c.budget.balance >= 0 ? 'up' : 'down') }, fmt.signed(c.budget.balance, 2)), h('td', { class: 'r num' }, fmt.pct(c.budget.debtRatio || 0, 1)))))),
      h('p', { class: 'muted small' }, `Euros al año. De sus ingresos, ${fmt.bn(V.eco.cantonTaxes || 0)} salen de impuestos cantonales y el resto de las transferencias del Estado. Para ver el presupuesto de un cantón, tócalo en el mapa en la vista de cantones.`)), { icon: 'map' }));
}

// ---------- Leyes vigentes ----------
function tabLaws() {
  const lawRow = (f, v, note) => h('tr', null, h('td', null, f.name), h('td', null, h('b', null, note || f.label(v))));
  return h('div', null,
    section('Competencias', h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Materia'), h('th', null, 'Quién la tiene'), h('th', { class: 'r' }, 'Estado'), h('th', { class: 'r' }, 'Cantones (media)'))),
      h('tbody', null, AREAS.map(a => h('tr', null, h('td', null, icon(a.icon, { size: 14 }), ' ', a.name), h('td', null, COMP_LABEL[V.pol.comp[a.id]]),
        h('td', { class: 'r num' }, natApplies(V.pol, a.id) ? num2(V.pol.gasto[a.id] || 0) + ' %' : '—'),
        h('td', { class: 'r num' }, cantApplies(V.pol, a.id) ? num2(avg(V.cantons, c => c.pol.gasto[a.id] || 0)) + ' %' : '—'))))),
      h('p', { class: 'muted small' }, 'Gasto en % del PIB (del país para el Estado; de cada cantón para los cantones).')),
    LAW_PACKS.map(pk => {
      const fids = pk.fields.concat(pk.dynamicTreaties ? V.foreign.map(f => 'tratado_' + f.id) : []);
      const rows = fids.map(fid => {
        const f = fieldById(V, fid);
        const v = getPath(V.pol, f.path);
        if (pk.addable && v == null) return null;
        if (f.competence && !natApplies(V.pol, f.competence)) return lawRow(f, v, 'Transferido a los cantones');
        return lawRow(f, v ?? null);
      }).filter(Boolean);
      const missing = pk.addable && pk.id !== 'comercio' ? fids.filter(fid => FIELDS[fid] && getPath(V.pol, FIELDS[fid].path) == null).map(fid => FIELDS[fid].short || FIELDS[fid].name) : [];
      return group('lv-' + pk.id, pk.name, pk.standalone ? (getPath(V.pol, FIELDS[pk.fields[0]].path) == null ? 'No existe' : 'En vigor') : pk.organic ? 'Ley orgánica' : '',
        h('div', null, h('table', { class: 'tbl' }, h('tbody', null, rows)), missing.length ? h('p', { class: 'muted small' }, 'No existen: ' + missing.join(', ') + '.') : null), { icon: pk.icon });
    }),
    section('Leyes de cada cantón', h('div', { class: 'scroll-x' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, ''), liveCantonsV().map(c => h('th', null, c.name)))),
      h('tbody', null, CANTON_FIELD_LIST.filter(f => !f.requiresComp || cantApplies(V.pol, f.requiresComp)).filter(f => !f.optional || V.cantons.some(c => getPath(c.pol, f.path) != null))
        .map(f => h('tr', null, h('td', null, f.name), liveCantonsV().map(c => h('td', null, f.label(getPath(c.pol, f.path) ?? null))))))))));
}

// ---------- Parlamento ----------
function tabParliament() {
  const log = (V.lawLog || []).slice().reverse();
  return h('div', null,
    section('Parlamento nacional', miniHemicycle(V.parliament.composition, V.parliament.seats, V.players),
      h('div', { class: 'stack' }, V.players.slice().sort((a, b) => seatsV(b.id) - seatsV(a.id)).map(p => h('div', { class: 'row' }, chip(p, { small: true }), h('span', { class: 'spacer' }), h('b', { class: 'num' }, seatsV(p.id))))),
      h('p', { class: 'muted small' }, `Mayoría absoluta: ${absMajority(V.parliament.seats)}.`)),
    governmentCard(),
    section('Calendario electoral', h('dl', { class: 'kv' }, h('dt', null, 'Generales'), h('dd', null, V.elections.nextNational <= V.turn ? 'al final de este trimestre' : shortQuarter(V.elections.nextNational)),
      h('dt', null, 'Cantonales'), h('dd', null, V.elections.nextCantonal <= V.turn ? 'al final de este trimestre' : shortQuarter(V.elections.nextCantonal)))),
    section('Últimas votaciones', log.length ? h('div', { class: 'stack' }, log.slice(0, 14).map(l => h('div', { class: 'vote-log' },
      h('div', { class: 'row' }, h('span', { class: l.passed ? 'up' : 'down' }, l.passed ? '✔' : '✘'), h('b', null, l.kind === 'censura' ? 'Moción de censura' : (packById(l.pack).name + (l.scope === 'cantonal' ? ' · ' + V.cantons[l.canton].name : ''))), h('span', { class: 'spacer' }), h('span', { class: 'faint small' }, shortQuarter(l.turn))),
      l.kind === 'law' ? h('div', { class: 'small muted' }, (l.foreign ? `Propuesta de ${(V.foreign.find(f => f.id === l.foreign) || {}).name || 'otro país'} · ` : '') + Object.keys(l.changes).map(fid => { const f = fieldById(V, fid) || FIELDS[fid]; return f ? `${f.name}: ${f.label(l.changes[fid])}` : fid; }).join('; ')) : null,
      h('div', { class: 'small' }, V.players.filter(p => l.votes[p.id] && l.votes[p.id] !== 'abs').map(p => h('span', { class: 'tag vote-' + l.votes[p.id] }, `${p.short} ${l.votes[p.id] === 'si' ? 'sí' : 'no'}`)))))) : h('p', { class: 'muted' }, 'Todavía no se ha votado nada.')));
}

// ---------- Encuestas ----------
function tabPolls(p) {
  const bars = V.barometers || [];
  const series = V.players.map(q => ({ name: q.short, color: q.color, values: bars.map(b => b.shares[q.id] * 100) }));
  const blocks = [section('Barómetro oficial (público)', lineChart(series, bars.map(b => shortQuarter(b.turn)), { fmt: v => fmt.num(v, 0) + ' %' }), h('div', { class: 'legend small' }, V.players.map(q => h('span', null, h('i', { style: { background: q.color } }), q.short))))];
  if (!p.polls.length) blocks.push(h('p', { class: 'muted' }, 'No has encargado ninguna encuesta privada. Puedes hacerlo desde Acciones.'));
  else {
    const i = clamp(UI.pollView, 0, p.polls.length - 1);
    const poll = p.polls[i];
    const tier = POLL_TIERS.find(t => t.id === poll.tier);
    const sorted = V.players.slice().sort((a, b) => poll.shares[b.id] - poll.shares[a.id]);
    blocks.push(section(null, h('div', { class: 'row' }, h('h3', null, tier.name), h('span', { class: 'spacer' }),
      h('select', { onchange: e => { UI.pollView = +e.target.value; render(); } }, p.polls.map((pl, k) => h('option', { value: k, selected: k === i }, `${POLL_TIERS.find(t => t.id === pl.tier).name}${pl.scope ? ' (' + pl.scope.map(x => V.cantons[x].name).join(', ') + ')' : ''} · ${pl.label}`)))),
      h('p', { class: 'muted small' }, `Ámbito: ${poll.scope ? poll.scope.map(k => V.cantons[k].name).join(', ') : 'todo el país'}. Margen de error ±${fmt.num(tier.error * 100, 1)} puntos. Participación estimada ${fmt.pct(poll.turnout, 0)}.`),
      h('table', { class: 'tbl' }, h('tbody', null, sorted.filter(q => !poll.scope || poll.shares[q.id] > 0).map(q => h('tr', null, h('td', null, chip(q, { small: true })), h('td', { style: { width: '40%' } }, hbar(poll.shares[q.id] / 0.5, q.color)), h('td', { class: 'r num' }, fmt.pct(poll.shares[q.id])), poll.seats ? h('td', { class: 'r num' }, (poll.seats[q.id] || 0) + ' esc.') : null))))));
    if (poll.seats && !poll.scope) blocks.push(section('Proyección del Parlamento', miniHemicycle(poll.seats, V.parliament.seats, V.players)));
    if (poll.seats && poll.scope) blocks.push(h('p', { class: 'small muted' }, `Escaños del Parlamento nacional que se eligen en este ámbito: ${poll.seatsTotal || 0}.`));
    if (poll.cantons) blocks.push(section('Por cantones', h('div', { class: 'scroll-x' }, h('table', { class: 'tbl small' }, h('thead', null, h('tr', null, h('th', null, ''), V.players.map(q => h('th', { class: 'r' }, q.short)))),
      h('tbody', null, V.cantons.map((c, k) => c.merged || !poll.cantons[k] ? null : h('tr', null, h('td', null, c.name), V.players.map(q => h('td', { class: 'r num' }, fmt.pct(poll.cantons[k][q.id] || 0, 0) + (poll.cantonSeats && poll.cantonSeats[k] ? ` (${poll.cantonSeats[k][q.id] || 0})` : ''))))))))));
    if (poll.groups) blocks.push(section('Voto por grupos', Object.entries(poll.groups).map(([cat, gs]) => h('div', null, h('h4', null, cat), h('div', { class: 'scroll-x' }, h('table', { class: 'tbl small' },
      h('thead', null, h('tr', null, h('th', null, 'Grupo'), h('th', { class: 'r' }, 'Peso'), h('th', { class: 'r' }, 'Vota'), V.players.map(q => h('th', { class: 'r' }, q.short)))),
      h('tbody', null, Object.values(gs).sort((a, b) => b.size - a.size).map(g => { const best = Object.entries(g.shares).sort((a, b) => b[1] - a[1])[0][0];
        return h('tr', null, h('td', null, g.label), h('td', { class: 'r num' }, fmt.pct(g.size, 0)), h('td', { class: 'r num' }, fmt.pct(g.turnout, 0)), V.players.map(q => h('td', { class: 'r num', style: q.id === best ? { color: q.color, fontWeight: 700 } : null }, fmt.pct(g.shares[q.id] || 0, 0)))); }))))))));
    if (poll.wishes) blocks.push(section('Lo que la gente quiere cambiar', h('table', { class: 'tbl small' }, h('tbody', null, poll.wishes.map(w => h('tr', null, h('td', null, `${w.pack}: ${w.name} → `, h('b', null, w.label)), h('td', { class: 'r up' }, fmt.pct(w.support, 0)), h('td', { class: 'r down' }, fmt.pct(w.against, 0))))))));
    if (poll.leaderRatings) blocks.push(section('Nota de los partidos (0 a 10)', h('div', { class: 'stack' }, V.players.map(q => h('div', { class: 'row' }, chip(q, { small: true }), h('span', { class: 'spacer' }), h('b', { class: 'num' }, fmt.num(poll.leaderRatings[q.id], 1)))))));
  }
  return h('div', null, blocks);
}

// ---------- Partidos ----------
function tabParties() {
  return h('div', null,
    section('Eje ideológico', ideologyAxes(V.players, { overall: true, trail: true }), h('p', { class: 'muted small' }, 'Cada partido aparece en la media de su posición en todos los ejes. La estela muestra cuánto se ha movido desde el debate.')),
    section('Ejes', ideologyAxes(V.players, { trail: true })),
    h('div', { class: 'stack' }, V.players.map(p => h('div', { class: 'card party-card' }, h('div', { class: 'row' }, portrait(p, 54), h('div', { class: 'grow' }, chip(p), h('div', { class: 'muted small' }, `${p.candidate.name} · juega ${p.player}${p.online ? '' : ' (desconectado)'}`))),
      h('dl', { class: 'kv small' }, h('dt', null, 'Escaños'), h('dd', null, `${seatsV(p.id)} nacionales, ${sum(V.cantons, c => c.parliament.composition[p.id] || 0)} cantonales`),
        h('dt', null, 'Gobierna'), h('dd', null, [V.gov.president === p.id ? 'la nación' : null, ...V.cantons.filter(c => c.gov.president === p.id).map(c => c.name)].filter(Boolean).join(', ') || 'nada'),
        h('dt', null, 'Ministerios'), h('dd', null, Object.entries(V.gov.ministers).filter(([, v]) => v === p.id).map(([k]) => MINISTRIES.find(m => m.id === k).name).join(', ') || 'ninguno'),
        h('dt', null, 'Misiones cumplidas'), h('dd', null, `${p.missions.filter(m => m.done).length} de 3`),
        h('dt', null, 'Escándalos'), h('dd', null, p.stats.scandals + (p.imputado ? ' (imputado)' : '')),
        h('dt', null, 'Ámbito'), h('dd', null, partyScope(p)),
        h('dt', null, 'Ideología'), h('dd', null, AXES.map(a => axisLabel(a.id, p.ideo[a.id])).join(', ')))))));
}

// ---------- Mundo ----------
function tabWorld() {
  return h('div', null, V.foreign.map(f => foreignCard(f)));
}
function foreignCard(f, opts = {}) {
  const partner = (V.eco.partners || []).find(x => x.id === f.id);
  const gp = (f.parties || []).find(p => p.id === (f.gov || {}).party);
  const cul = V.cultures2 && f.cul ? V.cultures2[f.cul] : null;
  const t = V.pol.tratados[f.id];
  const nCant = f.cantons ? f.cantons.filter(c => !c.nominal).length : 0;
  const fsp = k => (f.history || []).map(x => x[k] ?? 0);
  return section(null, h('div', { class: 'row' }, opts.noTitle ? null : h('span', { class: 'flag', style: { background: f.color } }), opts.noTitle ? null : h('h3', null, f.name), h('span', { class: 'spacer' }), t === true ? h('span', { class: 'tag brass' }, 'Libre comercio') : t ? h('span', { class: 'tag brass' }, 'Tratado parcial') : h('span', { class: 'tag' }, 'Sin tratado')),
    h('p', { class: 'muted small' }, `${{ vecino: 'País vecino', continente: 'En otro continente', isla: 'Nación insular' }[f.kind] || 'País'} · ${f.regime}${nCant ? ` con ${nCant} cantones` : ''}${cul ? ` · cultura ${cul}` : ''}. ` + (gp ? `Gobierna ${gp.leader} (${gp.name})${(f.gov.coalition || []).length ? ' en coalición' : ''}.` : '')),
    f.population != null ? h('div', { class: 'grid2' }, stat('Habitantes', fmt.people(f.population), { spark: fsp('population') }), stat('PIB', fmt.bn(f.gdp || 0), { spark: fsp('gdp') }), stat('Renta/hab.', fmt.int(f.gdpPerCapita || 0) + ' €', { spark: fsp('gdpPerCapita') }),
      stat('Crecimiento', fmt.pct(f.growth || 0, 1)), stat('Paro', fmt.pct(f.unemployment || 0, 1), { tone: (f.unemployment || 0) > 0.15 ? 'bad' : null, spark: fsp('unemployment'), sparkColor: '#ff7a7a' }), stat('Inflación', fmt.pct(f.inflation || 0, 1), { spark: fsp('inflation') }),
      stat('Deuda', fmt.pct(f.debtRatio || 0, 0), { spark: fsp('debtRatio'), sparkColor: '#ff7a7a' }), stat((f.deficitRatio || 0) > 0 ? 'Déficit' : 'Superávit', fmt.pct(Math.abs(f.deficitRatio || 0), 1) + ' PIB', { tone: (f.deficitRatio || 0) > 0 ? 'bad' : 'good', sub: fmt.bn(Math.abs((f.deficitRatio || 0) * (f.gdp || 0))) + ' al año', spark: (f.history || []).map(x => -x.deficitRatio) }), stat('Necesidades', fmt.pct(f.needsMet ?? 1, 0)),
      stat('Sociedades', fmt.pct(f.corpTax || 0, 0)), stat('Aranceles', fmt.pct(f.tariff || 0, 0)), stat('Empresas', fmt.int(f.firmsN || 0))) : null,
    h('p', { class: 'small' }, ((f.top || []).length ? 'Produce sobre todo ' + f.top.map(g => GOODS[g].name.split(' (')[0].toLowerCase()).join(', ') + '.' : '') + (partner ? ` Nos compra ${fmt.bn(partner.exports)} y nos vende ${fmt.bn(partner.imports)} al año.` : '') + (t ? ' Tratado: ' + treatyLabel(t).toLowerCase() + '.' : '')),
    f.pol ? h('p', { class: 'small muted' }, `Inmigración: ${['cerrada', 'muy restrictiva', 'restrictiva', 'abierta', 'muy abierta'][f.pol.inmigracion ?? 2] || '—'} · energía ${({ fosil: 'fósil', mixto: 'mixta', renovable: 'renovable', nuclear: 'nuclear' })[f.energia || f.pol.energia] || '—'} · legislaturas de ${f.pol.legislatura || 4} años.`) : null);
}

// ============================================================
//  INSPECTOR (panel derecho): datos del país, de un cantón o de un país extranjero.
//  Se abre tocando el mapa o con el selector de arriba. La información va por pestañas.
// ============================================================
function inspect(sel, tab) {
  if (MapScene.built) {
    MapScene.select(sel && sel.type === 'canton' ? sel.idx : null, !!(sel && sel.type === 'canton'), true);
    if (sel && sel.type === 'hex') MapScene.markHex(sel.q, sel.r); else MapScene.markHex(null, null);
  }
  UI.side = sel; if (tab) UI.insTab = tab;
  render();
}
const CANTON_METRICS = [
  { id: 'gdp', name: 'PIB', f: v => fmt.bn(v) }, { id: 'gdpPc', name: 'PIB por habitante', f: v => fmt.int(v) + ' €', nat: 'gdpPerCapita' },
  { id: 'unemployment', name: 'Paro', f: v => fmt.pct(v, 1), nat: 'unemployment' }, { id: 'pop', name: 'Población', f: v => fmt.people(v) },
  { id: 'health', name: 'Sanidad', f: v => Math.round(v) + '/100', nat: 'health' }, { id: 'education', name: 'Educación', f: v => Math.round(v) + '/100', nat: 'education' },
  { id: 'social', name: 'Servicios sociales', f: v => Math.round(v) + '/100', nat: 'social' }, { id: 'security', name: 'Seguridad', f: v => Math.round(v) + '/100', nat: 'security' },
  { id: 'crime', name: 'Delincuencia (‰)', f: v => fmt.num(v, 1), nat: 'crime' }, { id: 'balance', name: 'Saldo del presupuesto', f: v => fmt.sbn(v), zero: true, strip: false },
  { id: 'debtRatio', name: 'Deuda del cantón (% PIB)', f: v => fmt.pct(v, 1) },
  { id: 'housePrice', name: 'Precio de un piso', f: v => fmt.int(v) + ' mil €', nat: 'housePrice' },
  { id: 'fervCan', name: 'Fervor cantonalista', short: 'Cantonalismo', f: v => Math.round(v * 100) + ' %', nat: 'fervCan' },
  { id: 'fervCen', name: 'Fervor centralista', short: 'Centralismo', f: v => Math.round(v * 100) + ' %', nat: 'fervCen' },
];
// Un terreno (casilla del mapa): relieve, lo que contiene, a quién pertenece y a qué aporta
// Un terreno (casilla del mapa): resumen, recursos naturales y edificios
const NATURAL_FEATS = ['cultivo', 'bosque', 'rio', 'mina', 'carbon', 'pesca'];
const BUILT_FEATS = ['capital', 'ciudad', 'pueblo', 'fabrica', 'puerto', 'carretera'];
const NATURAL_DESC = {
  cultivo: 'Tierra de cultivo: alimenta la agricultura del cantón.', bosque: 'Madera, caza y paisaje.', rio: 'Agua para regar, beber y producir energía.',
  mina: 'Yacimiento de metal: permite una mina de metal.', carbon: 'Yacimiento de carbón: permite una mina de carbón.', pesca: 'Banco de pesca.',
};
// Datos de los edificios: se piden al anfitrión al abrir la casilla (y se refrescan cada trimestre)
function hexData(hx) {
  const key = hx.q + ',' + hx.r + ',' + V.turn + ',' + V.phase;
  const c = UI.hexCache;
  if (c && c.key === key) return c.data;
  if (!c || c.key !== key || !c.loading) {
    UI.hexCache = { key, loading: true, data: c && c.key && c.key.startsWith(hx.q + ',' + hx.r + ',') ? c.data : null };
    act({ type: 'hexInfo', q: hx.q, r: hx.r }, { toast: false }).then(r => { if (UI.hexCache && UI.hexCache.key === key) { UI.hexCache = { key, data: r && r.data }; renderRegion('side'); } });
  }
  return UI.hexCache.data;
}
function hexInspector(hx, tab) {
  const T = TERRAIN3D[hx.t], sea = hx.t === 'mar';
  const feats = (hx.f || []).concat((V.roads || []).includes(hx.q + ',' + hx.r) ? ['carretera'] : [], (V.rails || []).includes(hx.q + ',' + hx.r) ? ['via'] : []).filter(k => HEX_FEATURES[k]);
  const fname = i => i === 0 ? V.country.name : (V.foreign.find(f => f.mapIndex === i) || {}).name || '?';
  const sub = h('p', { class: 'muted small hex-sub' }, sea ? (hx.d === 1 ? 'Aguas costeras' : hx.d === 2 ? 'Aguas cercanas a la costa' : 'Mar abierto') : `${T.desc[0].toUpperCase() + T.desc.slice(1)} · ${RELIEF3D[hx.rel].name.toLowerCase()}${hx.coast ? ' · costa' : ''}`);
  const hasHomes = hx.nh || (hx.bb && hx.bb.length);
  const data = hx.t !== 'mar' ? hexData(hx) : null;
  if (tab === 'recursos') {
    const nat = feats.filter(k => NATURAL_FEATS.includes(k));
    const soil = sea ? null : hx.t === 'hierba' && hx.rel !== 'montana' ? 'Suelo fértil.' : hx.t === 'arena' ? (hx.coast ? 'Playa.' : 'Suelo seco y soleado: bueno para la energía solar.') : hx.t === 'roca' ? 'Suelo rocoso: poco cultivable.' : hx.t === 'asfalto' ? 'Suelo urbanizado.' : null;
    return h('div', null, sub,
      nat.length ? h('div', { class: 'stack' }, nat.map(k => h('div', { class: 'card hex-res' }, h('div', { class: 'row' }, icon(HEX_FEATURES[k].icon, { size: 18 }), h('b', null, HEX_FEATURES[k].name)), h('p', { class: 'small muted' }, NATURAL_DESC[k]))))
        : h('p', { class: 'muted' }, 'No hay recursos naturales destacables.'),
      soil ? h('p', { class: 'small' }, soil) : null,
      hx.rel === 'montana' || hx.rel === 'colinas' || hx.t === 'roca' ? h('p', { class: 'small' }, 'Piedra: aquí se puede abrir una cantera.') : null);
  }
  if (tab === 'edificios') return h('div', null, sub, hexBuildings(hx, data));
  // resumen
  // qué empresas podrían instalarse aquí
  const kindsHere = sea ? (feats.includes('pesca') ? ['pesca'] : []) : Object.keys(FIRM_KINDS).filter(k => k !== 'policia' && slotRule(k, Object.assign({}, hx, { c: 0 })) > 0);
  const yields = [...new Set(kindsHere.map(k => ({ agricultura: 'agricultura', ganaderia: 'ganadería', pesca: 'pesca', silvicultura: 'madera', muebles: 'industria del mueble', textil: 'industria textil', sanidad: 'clínicas', educacion: 'colegios', banco: 'bancos', constructora: 'constructoras', cantera: 'canteras', minaMetal: 'minas de metal', minaCarbon: 'minas de carbón', maquinaria: 'fábricas de máquinas', armamento: 'fábricas de armas', automovilistica: 'fábricas de automóviles', ferroviaria: 'ferrocarriles', electrica: 'centrales eléctricas', telecom: 'telecomunicaciones', medios: 'medios de comunicación', gimnasio: 'gimnasios', alimentacion: 'industria alimentaria', comercio: 'pequeño comercio' })[k]))];
  if (data && data.housingOk) yields.push('viviendas');
  let owner;
  if (sea) owner = hx.dz ? h('div', null, h('p', null, h('b', null, 'Aguas en disputa'), ` entre ${fname(hx.dz[0])} y ${fname(hx.dz[1])}: están a la misma distancia de la costa de los dos países.`))
    : hx.w >= 0 ? h('p', null, 'Aguas territoriales de ', h('b', null, fname(hx.w)), '. Son de un país las aguas que están a 2 terrenos o menos de su costa.')
    : h('p', null, 'Aguas internacionales: no son de ningún país.');
  else {
    const f = hx.c > 0 && V.foreign.find(x => x.mapIndex === hx.c);
    const fc = f && hx.k >= 0 && f.cantons && f.cantons[hx.k] && !f.cantons[hx.k].nominal ? f.cantons[hx.k] : null;
    owner = h('div', { class: 'stack' },
      h('div', { class: 'row small' }, h('span', { class: 'flagchip', style: { background: hx.c === 0 ? OWN_COLOR : f.color } }), 'País: ', h('b', null, fname(hx.c))),
      hx.c === 0 ? h('div', { class: 'row small' }, icon('map-pin', { size: 14 }), 'Cantón: ', h('b', null, V.cantons[hx.k].name))
        : fc ? h('div', { class: 'row small' }, icon('map-pin', { size: 14 }), 'Cantón: ' + fc.name) : null);
  }
  const place = hx.cn && feats.some(k => ['pueblo', 'ciudad', 'capital'].includes(k)) ? (feats.includes('pueblo') ? 'Pueblo de ' : 'Ciudad de ') + hx.cn : null;
  return h('div', null, sub,
    place ? h('h3', { class: 'hex-place' }, icon(feats.includes('pueblo') ? 'house' : 'building-2', { size: 18 }), place) : null,
    data && hasHomes ? h('div', { class: 'grid2' },
      stat('Habitantes', fmt.int(data.pop)),
      stat('Viviendas', `${data.homes}`, { sub: data.empty ? `${data.empty} vacías` : 'todas ocupadas' })) : null,
    data && data.lots && data.lots.cap ? h('div', { class: 'lots' },
      h('div', { class: 'row small' }, icon('layout-grid', { size: 14 }), h('b', null, 'Parcelas'), h('span', { class: 'spacer' }), h('span', null, `${Math.min(data.lots.used, data.lots.cap)} de ${data.lots.cap} ocupadas`)),
      hbar(Math.min(1, data.lots.used / data.lots.cap), data.lots.used >= data.lots.cap ? '#ff7a7a' : data.lots.used >= data.lots.cap * 0.8 ? '#ffc23d' : '#57c48d'),
      h('p', { class: 'small muted' }, data.lots.used >= data.lots.cap ? 'No queda sitio para edificios nuevos (la ley del suelo marca cuánto se puede construir).' : 'Cada edificio ocupa parcelas: una casa 1, un bloque 3, una fábrica 2 o 3, un hospital 4.'),
      data.housingOk ? h('p', { class: 'small' }, `Precio de la vivienda aquí: piso ${fmt.int(data.price.piso)} mil €, casa ${fmt.int(data.price.casa)} mil €.`) : null,
      data.works && data.works.length ? h('p', { class: 'small' }, icon('hard-hat', { size: 13 }), ` ${data.works.length === 1 ? 'Una obra' : data.works.length + ' obras'} en marcha.`) : null) : null,
    section('A quién pertenece', owner),
    yields.length ? section('Puede acoger', h('p', { class: 'small' }, yields[0][0].toUpperCase() + yields.join(', ').slice(1) + '.')) : null,
    data && data.pop ? h('div', { class: 'hex-stats' }, h('h3', null, 'Quién vive aquí'), popStatsView(statsData('hex', [hx.q, hx.r]))) : null);
}
// ---------- Estadísticas de la población (terreno, cantón o país) ----------
// Se piden al anfitrión y se guardan hasta el siguiente cambio de trimestre o de fase
function statsData(scope, idx) {
  const key = scope + ':' + JSON.stringify(idx) + ':' + V.turn + ':' + V.phase;
  UI.statCache = UI.statCache || {};
  const c = UI.statCache[key];
  if (c) return c.data;
  UI.statCache[key] = { data: null };
  act({ type: 'popStats', scope, idx }, { toast: false }).then(r => { UI.statCache[key] = { data: r && r.data }; renderRegion('side'); });
  return null;
}
function statGroup(id, title, ic, body) {
  UI.statOpen = UI.statOpen || { pob: true };
  const d = h('details', { class: 'group stat-group', open: !!UI.statOpen[id] }, h('summary', null, icon(ic, { size: 16 }), h('span', null, title)), h('div', { class: 'body' }, body));
  d.addEventListener('toggle', () => { UI.statOpen[id] = d.open; });
  return d;
}
const PROF_LABEL = { parado: 'En paro', jubilado: 'Jubilados', estudiante: 'Estudiantes', agricultor: 'Agricultores', pescador: 'Pescadores', operario: 'Operarios',
  empresario: 'Empresarios', sanitario: 'Sanitarios', academico: 'Académicos', policia: 'Agentes de la ley', oficinista: 'Oficinistas', comerciante: 'Comerciantes', ingeniero: 'Ingenieros', periodista: 'Periodistas' };
function barList(rows, color, fmtV) {
  const mx = Math.max(1, ...rows.map(r => r[1]));
  return h('div', { class: 'budget-list' }, rows.map(([name, v, col]) => h('div', { class: 'brow' }, h('span', { class: 'bname' }, name), hbar(v / mx, col || color), h('span', { class: 'num' }, fmtV ? fmtV(v) : fmt.int(v)))));
}
// Mercado de la vivienda y banca de un cantón o del país (datos que ya vienen en la vista)
function housingView(H, scopeName) {
  if (!H || !H.price) return null;
  const vacPct = H.vacant / Math.max(1, H.stock);
  const e = V.eco, R = e.housing || {};
  return h('div', null,
    h('div', { class: 'grid2' },
      stat('Precio de un piso', priceK(H.price.piso), { sub: 'casa: ' + priceK(H.price.casa) }),
      stat('Viviendas vacías', fmt.pct(vacPct, 1), { sub: `${fmt.int(H.vacant)} de ${fmt.int(H.stock)}` })),
    h('p', { class: 'small' }, `${H.worksUnits ? `${fmt.int(H.worksUnits)} viviendas en obras. ` : 'Ninguna vivienda en obras. '}${H.buys != null || H.sales != null ? `Este trimestre se han vendido ${fmt.int(H.buys ?? H.sales)}.` : ''}`),
    H.wantHome ? h('p', { class: 'small bad-txt' }, `${fmt.int(H.wantHome)} jóvenes con trabajo quieren independizarse y no pueden pagar la entrada.`) : null,
    h('p', { class: 'small muted' }, `${scopeName}: ${fmt.int(H.mortgages || 0)} hipotecas (${fmt.bn(H.mortDebt || 0)} pendientes) · ahorros de sus habitantes ${fmt.bn(H.savings || 0)}${H.banks != null ? ` · ${H.banks} ${H.banks === 1 ? 'banco' : 'bancos'}` : ''}.`),
    h('h4', null, 'Tipos de interés'),
    (() => { const Hh = e.history || [], sp = k => Hh.map(x => x[k]).filter(v => v != null);
      return h('div', { class: 'grid2' },
        stat('Tipo oficial', fmt.pct(R.policyRate || 0, 2), { sub: 'lo fija el banco central', spark: sp('policyRate') }),
        stat('Hipotecas', fmt.pct(R.mortRate || 0, 2), { sub: 'para comprar vivienda', spark: sp('mortRate') }),
        stat('Préstamos a empresas', fmt.pct(R.firmRate || 0, 2), { sub: 'para invertir y construir', spark: sp('firmRate') }),
        stat('Depósitos', fmt.pct(R.depRate || 0, 2), { sub: 'lo que rinden los ahorros', spark: sp('depRate') })); })());
}
function popStatsView(d, market, scopeName) {
  if (!d) return h('p', { class: 'muted' }, 'Cargando…');
  if (!d.pop) return h('p', { class: 'muted' }, 'Aquí no vive nadie.');
  const mx = Math.max(1, ...d.bands.map(b => Math.max(b.M, b.H)));
  const pyramid = h('div', { class: 'pyramid' },
    h('div', { class: 'pyr-head small muted' }, h('span', null, 'Hombres'), h('span', null, 'Edad'), h('span', null, 'Mujeres')),
    d.bands.slice().reverse().map(b => h('div', { class: 'pyr-row' },
      h('div', { class: 'pyr-l' }, h('i', { style: { width: b.H / mx * 100 + '%' } }), h('span', null, b.H || '')),
      h('div', { class: 'pyr-age' }, b.from >= 90 ? '90+' : `${b.from}-${b.to}`),
      h('div', { class: 'pyr-r' }, h('i', { style: { width: b.M / mx * 100 + '%' } }), h('span', null, b.M || '')))));
  const pct = (n, t) => fmt.pct(n / Math.max(1, t), 0);
  const prof = Object.entries(d.prof).sort((a, b) => b[1] - a[1]).map(([k, v]) => [PROF_LABEL[k] || k, v, k === 'parado' ? '#e06a5a' : k === 'jubilado' || k === 'estudiante' ? '#7f8aa8' : '#e0b84e']);
  const sectors = SECTORS.filter(s0 => d.sectors[s0.id]).map(s0 => [s0.name, d.sectors[s0.id], s0.color]).sort((a, b) => b[1] - a[1]);
  const hist = d.hist.map(x => [x.to ? `${fmt.int(x.from)}–${fmt.int(x.to)} €` : `más de ${fmt.int(x.from)} €`, x.n, '#57c48d']);
  const orig = [['Nacidos aquí', d.origin.nativo || 0, '#4fa3e0'], ['De otros cantones', d.origin.interno || 0, '#b57be0'], ['De otros países', d.origin.extranjero || 0, '#e08f4e']];
  const edu = [['Básicos', d.edu[1] || 0, '#9aa5b1'], ['Medios', d.edu[2] || 0, '#4fd0c7'], ['Superiores', d.edu[3] || 0, '#e0b84e']];
  return h('div', { class: 'stats-view' },
    h('div', { class: 'grid2' }, stat('Habitantes', fmt.int(d.pop), { sub: `${fmt.int(d.kids)} menores de 16` }), stat('Salario mediano', d.workers ? fmt.int(d.medianWage) + ' €/mes' : '—', { sub: d.workers ? `${fmt.int(d.workers)} personas trabajando` : 'nadie trabaja' })),
    statGroup('pob', 'Población por edad y sexo', 'users', pyramid),
    d.work ? statGroup('laboral', 'Situación laboral', 'landmark', workSectorView(d.work, d.adults)) : null,
    statGroup('trab', 'Trabajo y profesiones', 'briefcase', h('div', null,
      h('p', { class: 'small' }, `Paro: ${fmt.pct(d.unemployment, 1)} de quienes pueden trabajar. ${d.publicJobs ? `${fmt.int(d.publicJobs)} trabajan en el sector público.` : ''}`),
      barList(prof),
      sectors.length ? h('h4', null, 'Dónde trabajan') : null, sectors.length ? barList(sectors) : null,
      d.labor ? laborView(d.labor) : null)),
    statGroup('ing', 'Ingresos', 'wallet', h('div', null,
      h('p', { class: 'small' }, `Salario mediano ${fmt.int(d.medianWage)} €/mes (medio ${fmt.int(d.meanWage)} €). Ingreso mediano de todos los adultos, contando pensiones y prestaciones: ${fmt.int(d.medianIncome)} €/mes.`),
      h('h4', null, 'Adultos según sus ingresos netos al mes'), barList(hist))),
    statGroup('orig', 'Origen y estudios', 'globe', h('div', null,
      barList(orig, null, v => `${fmt.int(v)} (${pct(v, d.adults)})`), h('h4', null, 'Estudios de los adultos'), barList(edu, null, v => `${fmt.int(v)} (${pct(v, d.adults)})`))),
    d.money ? statGroup('dinero', 'Ahorro e hipotecas', 'piggy-bank', h('div', null,
      h('p', { class: 'small' }, `Ahorro mediano de los adultos: ${fmt.int(d.money.medianSav * 1000)} € (medio ${fmt.int(d.money.meanSav * 1000)} €). ${d.money.mortgages ? `${fmt.int(d.money.mortgages)} personas pagan una hipoteca (cuota mediana ${fmt.int(d.money.medianPay)} €/mes)${d.money.arrears ? `; ${d.money.arrears} no llegan a pagarla` : ''}.` : 'Nadie paga hipoteca.'}`),
      d.money.wantHome ? h('p', { class: 'small bad-txt' }, `${d.money.wantHome} jóvenes con trabajo quieren independizarse y no pueden pagar la entrada.`) : null,
      h('h4', null, 'Adultos según sus ahorros'),
      barList(d.money.savHist.map(x => [x.to ? `${fmt.int(x.from * 1000)}–${fmt.int(x.to * 1000)} €` : `más de ${fmt.int(x.from * 1000)} €`, x.n, '#4fd0c7'])))) : null,
    d.needs ? statGroup('necesidades', 'Nivel de vida y necesidades', 'shopping-basket', needsView(d.needs)) : null,
    market ? statGroup('vivienda', 'Vivienda y banca', 'house', housingView(market, scopeName)) : null);
}
// Jubilados, desempleados, sector privado y funcionarios: cuántos son y hacia dónde tiran
function workSectorView(W, adults) {
  const ids = WORK_SECTOR_IDS.filter(k => W[k] && (W[k].n || k !== 'estudiante'));
  const pct = n => fmt.pct(n / Math.max(1, adults), 0);
  const ax = AXES[0], ax2 = AXES[1];
  const track = (key, A) => h('div', { class: 'ws-axis' },
    h('div', { class: 'ws-axis-name small muted' }, A.name),
    h('div', { class: 'ws-track' }, [0.25, 0.5, 0.75].map(t => h('span', { class: 'tick', style: { left: t * 100 + '%' } })),
      ids.map(k => h('span', { class: 'ws-dot', title: `${WORK_SECTORS[k].name}: ${axisLabel(A.id, W[k][key])}`, style: { left: clamp((W[k][key] + 2) / 4, 0, 1) * 100 + '%', background: WORK_SECTORS[k].color } }))),
    h('div', { class: 'axis-ends small muted' }, h('span', null, A.labels[0]), h('span', null, A.labels[4])));
  return h('div', null,
    barList(ids.map(k => [WORK_SECTORS[k].name, W[k].n, WORK_SECTORS[k].color]), null, v => `${fmt.int(v)} (${pct(v)})`),
    h('h4', null, 'Hacia dónde tiran'),
    h('div', { class: 'ws-legend small' }, ids.map(k => h('span', null, h('i', { style: { background: WORK_SECTORS[k].color } }), WORK_SECTORS[k].name))),
    track('eco', ax), track('soc', ax2),
    h('p', { class: 'small muted' }, 'Los funcionarios suelen votar más a la izquierda y los que trabajan en la empresa privada, más a favor del liberalismo económico. Quien cambia de situación (entra en la Administración, pasa a la privada, se queda en paro o se jubila) va cambiando de ideas poco a poco. Si se nacionaliza o privatiza un centro, su plantilla cambia de grupo.'));
}
// Mercado de trabajo: ofertas, contrataciones y cualificaciones
function laborView(L) {
  const fl = L.flow;
  const rows = QUALS.map(q => { const x = L.quals[q] || {}; return h('tr', null, h('td', null, QUAL_NAMES[q]), h('td', { class: 'r num' }, fmt.int(x.n || 0)), h('td', { class: 'r num' }, fmt.int(x.work || 0)), h('td', { class: 'r num' }, fmt.int(x.idle || 0)), h('td', { class: 'r num' }, fmt.int(x.study || 0)), h('td', { class: 'r num' }, L.wageQ[q] ? fmt.int(L.wageQ[q] * 1000 / 12) + ' €' : '—')); });
  return h('div', null,
    h('h4', null, 'Mercado de trabajo'),
    h('p', { class: 'small' }, `${fmt.int(L.vacs)} ofertas de empleo sin cubrir.` + (fl ? ` Este trimestre: ${fmt.int(fl.hired || 0)} contrataciones (${fmt.int(fl.moved || 0)} de gente que cambia de empresa${fl.relocated ? `, ${fl.relocated} que se muda de cantón` : ''}), ${fmt.int(fl.fired || 0)} despidos y ${fmt.int(fl.closedW || 0)} empleos perdidos por cierres.` : '')),
    h('p', { class: 'small muted' }, `Cada empresa ofrece primero un 30 % menos de lo que se paga de media en el puesto y sube la oferta si nadie la acepta. Quien busca trabajo mira 5 ofertas; si lleva tiempo en paro, también en los cantones vecinos y, después, en todo el país. Sueldo medio sin cualificar: ${fmt.int(L.wageUnq * 1000 / 12)} €/mes.`),
    h('h4', null, 'Cualificaciones'),
    h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'r' }, 'Tienen'), h('th', { class: 'r' }, 'Trabajan de ello'), h('th', { class: 'r' }, 'En paro'), h('th', { class: 'r' }, 'Estudiándola'), h('th', { class: 'r' }, 'Sueldo medio'))), h('tbody', null, rows)),
    h('p', { class: 'small muted' }, 'Especializarse lleva 4 trimestres. Se elige la que mejor se paga, si alguna se paga mejor que los empleos sin cualificar. Quien tiene una solo trabaja de ella, de académico o en un empleo sin cualificar.'));
}
// La cesta de cada nivel de vida (por adulto y trimestre; los menores cuentan medio)
const NEED_SHORT = { transporte: 'transporte', comida: 'alimentos', lujo: 'de lujo', ropaS: 'ropa sencilla', ropa: 'ropa', enseres: 'enseres', hogar: 'hogar', calor: 'calefacción', ocio: 'ocio', salud: 'salud' };
function basketList() {
  const n = v => fmt.num(v, 2).replace(/,?0+$/, '');
  return h('details', { class: 'basket-list' }, h('summary', { class: 'small' }, icon('shopping-basket', { size: 13 }), ' Qué pide la cesta de cada nivel'),
    h('p', { class: 'small muted' }, 'Unidades por adulto y trimestre (los menores cuentan medio). Niveles por ingresos netos al año por adulto: indigente (menos de 5.000 €), pasando penurias (5.000), pobre (10.000), tirando (15.000), seguro (20.000), próspero (25.000), abundante (30.000), rico (40.000), lujoso (50.000) y opulento (60.000 o más). Alimentos básicos: grano 1, pescado 1,5, carne 2, procesados 3 (ninguno más del 90 %). De lujo: carne (10-75 %) y procesados (2). Ropa sencilla: tejido (hasta la mitad) y ropa. Enseres: madera (hasta la mitad) y muebles. Calefacción: tejido (hasta 25 %), madera (hasta 50 %), carbón (1,5; hasta 80 %) y electricidad. Ocio: conexión (hasta 30 %), entretenimiento, gimnasio y servicios del comercio (2). Salud: la sanidad pública o privada (más con la edad).'),
    h('div', { class: 'stack' }, WEALTH_NAMES.map((nm, l) => h('div', { class: 'small' }, h('b', null, `${l + 1} · ${nm}: `),
      NEEDS.filter(x => x.q[l] > 0).map(x => `${n(x.q[l])} ${NEED_SHORT[x.id] || x.id}`).join(' · ')))));
}
// Nivel de vida (riqueza de los hogares) y cuánto se cubre cada necesidad
function needsView(nd) {
  const wl = nd.wlHist.map((n, i) => [`${i + 1} · ${WEALTH_NAMES[i]}`, n, ['#e06a5a', '#e08f4e', '#e0b84e', '#c9c95a', '#9fc95a', '#57c48d', '#4fd0c7', '#4fa3e0', '#7b8be0', '#b57be0'][i]]).filter(x => x[1] > 0);
  const need = id => NEEDS.find(n => n.id === id);
  return h('div', null,
    h('div', { class: 'row needs-head' }, h('b', { class: 'small' }, `Necesidades cubiertas: ${fmt.pct(nd.F, 0)}`),
      infoTip(`Los hogares cubren de media el ${fmt.pct(nd.F, 0)} de sus necesidades. Cada hogar tiene un nivel de vida según sus ingresos: cuanto más alto, más cosas necesita (comida de calidad, muebles, internet, ocio…). Si no le llega para cubrirlas, su nivel baja.`)),
    h('h4', null, 'Personas según el nivel de vida de su hogar'), barList(wl), basketList(),
    nd.list.length ? h('h4', null, 'Necesidades cubiertas') : null,
    nd.list.length ? barList(nd.list.filter(n => n.v > 0).map(n => [need(n.id).name, Math.round(n.met * 100), n.met >= 0.97 ? '#57c48d' : n.met >= 0.85 ? '#ffc23d' : '#ff7a7a']), null, v => v + ' %') : null);
}
// Pestaña «Edificios»: obras, empresas, casas y bloques (desplegables) y otros edificios
const WORK_NAME = w => w.t === 'casa' ? 'Casa nueva' : w.t === 'bloque' ? `Bloque de ${w.floors} plantas (${w.units} pisos)` : w.what || 'Edificio';
const priceK = v => fmt.int(Math.round(v)) + ' mil €';
function hexBuildings(hx, data) {
  const feats = hx.f || [];
  const others = [];
  if (feats.includes('capital')) others.push(['landmark', 'Sede del Gobierno', 'El Parlamento y los ministerios.']);
  if (feats.includes('fabrica')) others.push(['factory', 'Fábricas', hx.cn || 'Polígono industrial']);
  if (feats.includes('puerto')) others.push(['anchor', 'Puerto', 'Comercio por mar y pesca.']);
  const works = data && data.works && data.works.length ? section(`En obras (${data.works.length})`, h('div', { class: 'stack' }, data.works.map(w => h('div', { class: 'work-row' },
    h('div', { class: 'row small' }, icon('hard-hat', { size: 15 }), h('b', null, WORK_NAME(w)), h('span', { class: 'spacer' }), h('span', { class: 'num' }, w.p + ' %')),
    hbar(w.p / 100, '#e0b84e'), h('div', { class: 'small muted' }, 'La construye ' + w.by))))) : null;
  const firmList = data && data.firms && data.firms.length ? section(`Empresas y servicios (${data.firms.length})`, h('div', { class: 'stack bld-list' }, data.firms.map(f => firmRow(hx, f)))) : null;
  const otherList = h('div', null, others.length ? section('Otros edificios', h('div', { class: 'stack' }, others.map(([ic, n, d]) => h('div', { class: 'row small' }, icon(ic, { size: 16 }), h('b', null, n), h('span', { class: 'muted' }, d))))) : null);
  const nHouses = data ? data.houses : hx.nh || 0, blocks = data ? data.blocks : hx.bb || [];
  if (!nHouses && !blocks.length) return h('div', null, works, firmList, otherList, !firmList && !works && !others.length ? h('p', { class: 'muted' }, 'No hay edificios.') : null);
  if (!data) return h('div', null, h('p', { class: 'muted' }, 'Cargando…'), otherList);
  const open = UI.openBld || (UI.openBld = {});
  const toggle = k => { open[k] = !open[k]; renderRegion('side'); };
  const keyB = b => hx.q + ',' + hx.r + ',' + b.kind + b.idx;
  const saleTxt = fs => `En venta: ${priceK(fs.price)}${fs.seller ? (fs.isNew ? ' · obra nueva de ' : ' · la vende ') + fs.seller : ''}`;
  const rows = data.buildings.map(b => {
    const kB = keyB(b);
    if (b.kind === 'casa') {
      const hm = b.homes[0], fs = (b.forSale || [])[0];
      const head = h('button', { type: 'button', class: 'bld-row' + (open[kB] ? ' open' : ''), onclick: () => hm && toggle(kB), disabled: !hm },
        icon('house', { size: 16 }), h('b', null, `Casa ${b.idx + 1}`), h('span', { class: 'grow muted' }, hm ? homeTitle(hm) : fs ? 'Vacía · ' + saleTxt(fs).toLowerCase() : 'Vacía'),
        hm ? h('span', { class: 'num' }, peopleCount(b.pop)) : null, hm ? icon(open[kB] ? 'chevron-up' : 'chevron-down', { size: 14 }) : null);
      return h('div', { class: 'bld' }, head, open[kB] && hm ? residents(hm) : null);
    }
    const sale = b.forSale || [];
    const head = h('button', { type: 'button', class: 'bld-row' + (open[kB] ? ' open' : ''), onclick: () => toggle(kB) },
      icon('building-2', { size: 16 }), h('b', null, `Bloque ${b.idx + 1}`), h('span', { class: 'grow muted' }, `${b.floors} plantas · ${b.units} pisos${sale.length ? ` (${sale.length} vacíos, desde ${priceK(Math.min(...sale.map(x => x.price)))})` : ''}`),
      h('span', { class: 'num' }, peopleCount(b.pop)), icon(open[kB] ? 'chevron-up' : 'chevron-down', { size: 14 }));
    if (!open[kB]) return h('div', { class: 'bld' }, head);
    const flats = b.homes.map(hm => ({ u: hm.u, hm })).concat(sale.map(fs => ({ u: fs.u, fs }))).sort((x, y) => x.u - y.u);
    return h('div', { class: 'bld' }, head, h('div', { class: 'flats' }, flats.map(({ u, hm, fs }) => {
      if (fs) return h('div', { class: 'flat' }, h('div', { class: 'bld-row sub empty' }, h('b', null, flatLabel(u, b.perFloor)), h('span', { class: 'grow muted' }, 'Vacío · ' + saleTxt(fs).toLowerCase())));
      const kH = kB + ':' + u;
      return h('div', { class: 'flat' },
        h('button', { type: 'button', class: 'bld-row sub' + (open[kH] ? ' open' : ''), onclick: () => toggle(kH) },
          h('b', null, flatLabel(u, b.perFloor)), h('span', { class: 'grow muted' }, homeTitle(hm)), h('span', { class: 'num' }, peopleCount(hm.adults.length + hm.kids.length)), icon(open[kH] ? 'chevron-up' : 'chevron-down', { size: 14 })),
        open[kH] ? residents(hm) : null);
    })));
  });
  const title = nHouses && blocks.length ? `Viviendas (${nHouses} casas y ${blocks.length} bloques)` : nHouses ? `Casas (${nHouses})` : `Bloques de viviendas (${blocks.length})`;
  return h('div', null, works, firmList,
    section(title, h('p', { class: 'muted small' }, `${fmt.int(data.pop)} habitantes en ${data.homes} viviendas${data.empty ? `, ${data.empty} vacías y a la venta` : ''}. No hay alquiler: para vivir aquí hay que comprar. Toca una vivienda para ver quién vive en ella.`),
      h('div', { class: 'stack bld-list' }, rows)),
    otherList);
}
const peopleCount = n => n === 1 ? '1 persona' : n + ' personas';
// Una empresa o un centro público, desplegable con su producción y su plantilla
function firmRow(hx, f) {
  const open = UI.openBld || (UI.openBld = {});
  const key = 'f' + f.id;
  const K = f.ctype ? PUBLIC_CENTERS[f.ctype] : FIRM_KINDS[f.kind];
  const ownerTxt = f.pub == null ? (f.ownerName ? 'Dueño: ' + f.ownerName : 'Empresa privada') : f.pe ? `Empresa pública: es de ${f.peOwner}. Su plantilla es funcionaria.` : f.pub === 'estado' ? 'Pública · Estado' : 'Pública · ' + (V.cantons[f.pub] || {}).name;
  const units = (obj) => Object.entries(obj || {}).map(([g, v]) => `${uTxt(v)} de ${GOODS[g].name.toLowerCase()}`).join(', ');
  const head = h('button', { type: 'button', class: 'bld-row' + (open[key] ? ' open' : ''), onclick: () => { open[key] = !open[key]; renderRegion('side'); } },
    icon(f.obra != null ? 'hard-hat' : K.icon || 'factory', { size: 16 }), h('b', null, f.name), h('span', { class: 'grow muted' }, (f.ctype ? K.name : FIRM_KINDS[f.kind].name) + (f.lvl ? ` · nivel ${f.lvl}` : '') + (f.obra != null ? ` · en obras (${f.obra} %)` : f.upg != null ? ` · ampliándose (${f.upg} %)` : '')), h('span', { class: 'num' }, peopleCount(f.staff.length)), icon(open[key] ? 'chevron-up' : 'chevron-down', { size: 14 }));
  if (!open[key]) return h('div', { class: 'bld' }, head);
  const facts = [h('div', { class: 'small' }, ownerTxt)];
  if (f.obra != null) facts.push(h('div', { class: 'small' }, `El edificio está en obras (${f.obra} %): abrirá cuando la constructora lo termine.`));
  if (f.pe) {
    facts.push(h('div', { class: 'small muted' }, `Plantilla ${f.staff.length} de ${f.cap} plazas (${f.plazas != null ? `su gobierno ha sacado ${f.plazas}` : 'su gobierno quiere todas cubiertas'}). Sueldo medio ${fmt.int(f.wage)} €/mes.`));
    const fx = Object.entries(f.fp || {});
    facts.push(h('div', { class: 'small' }, fx.length ? 'Vende a precio fijado: ' + fx.map(([g, v]) => `${GOODS[g].name.toLowerCase()} a ${fmt.int(v)} € la unidad`).join(', ') + '.' : 'Vende a precio de mercado.'));
  }
  if (f.pub != null && !f.pe) facts.push(h('div', { class: 'small muted' }, `Plantilla ${f.staff.length} de ${f.cap} plazas · ${f.plazas != null ? `su gobierno ha sacado ${f.plazas} plazas` : `el presupuesto permite ${f.target ?? '—'}`}. Sueldo medio ${fmt.int(f.wage)} €/mes.`));
  else {
    if (f.kind === 'banco') facts.push(h('div', { class: 'small' }, `${fmt.int(f.served || 0)} clientes · depósitos ${fmt.bn((f.dep || 0) / 1e6)} · préstamos ${fmt.bn((f.loans || 0) / 1e6)}${f.unsold ? ` · ${f.unsold} viviendas embargadas a la venta` : ''}.`));
    if (f.kind === 'constructora') facts.push(h('div', { class: 'small' }, f.jobs && f.jobs.length ? 'Obras: ' + f.jobs.map(j => `${j.what || (j.t === 'casa' ? 'casa' : `bloque de ${j.units} pisos`)}${j.where ? ' en ' + j.where : ''} (${j.p} %)`).join('; ') + '.' : 'Ahora mismo no tiene obras.'),
      f.unsold ? h('div', { class: 'small muted' }, `${f.unsold} viviendas terminadas sin vender.`) : null);
    if (f.lvl) facts.push(h('div', { class: 'small' }, `Nivel ${f.lvl} (empresa ${f.size}): hasta ${f.cap} trabajadores (${FIRM_KINDS[f.kind].cap} por nivel)${f.lvl > 1 ? `, +${Math.round((f.lvl - 1) * LEVEL_BONUS * 100)} % de productividad` : ''}.${f.upg != null ? ` Ampliándose al nivel ${f.lvl + 1} (${f.upg} %).` : ''}`));
    if (f.perWorker && Object.keys(f.perWorker).length) facts.push(h('div', { class: 'small muted' }, 'Cada trabajador produce por trimestre: ' + units(f.perWorker) + (f.perInp && Object.keys(f.perInp).length ? ' (con ' + units(f.perInp) + ')' : '') + '.'));
    if (Object.keys(f.out || {}).length) facts.push(h('div', { class: 'small' }, 'Este trimestre ha producido ' + units(f.out) + (f.soldPct != null && f.soldPct < 99.5 ? ` y ha vendido el ${fmt.int(f.soldPct)} %` : '') + '.'));
    if (Object.keys(f.inp || {}).length) facts.push(h('div', { class: 'small' }, 'Ha comprado: ' + units(f.inp) + '.'));
    if (f.loss >= 2) facts.push(h('div', { class: 'small down' }, f.pe ? `Lleva ${f.loss} trimestres seguidos perdiendo dinero: lo paga su gobierno.` : `Lleva ${f.loss} trimestres seguidos perdiendo dinero: si sigue así y no ve salida, cerrará.`));
    if (f.served && (f.kind === 'sanidad' || f.kind === 'educacion')) facts.push(h('div', { class: 'small' }, `Atiende a ${fmt.int(f.served)} ${f.kind === 'sanidad' ? 'pacientes' : 'alumnos'} al año.`));
    facts.push(h('div', { class: 'small muted' }, `${f.kind === 'banco' ? 'Ingresos' : f.kind === 'constructora' ? 'Obra hecha' : 'Ventas'} ${fmt.bn(f.revY / 1e6)} al año · valor añadido ${fmt.bn(f.vaY / 1e6)} · ${f.profitY >= 0 ? 'beneficio' : 'pérdidas'} ${fmt.bn(Math.abs(f.profitY) / 1e6)} · sueldo base ${fmt.int(f.wage)} €/mes.`));
    if (f.debt > 0.5) facts.push(h('div', { class: 'small muted' }, `Debe al banco ${fmt.bn(f.debt / 1e6)}.`));
    if (f.boost && f.boost.length) facts.push(h('div', { class: 'small muted' }, 'Compra ' + f.boost.map(g => GOODS[g].name.toLowerCase()).join(' y ') + ' para producir más.'));
    if (f.vac && f.vac.length) facts.push(h('div', { class: 'small' }, `Busca ${f.vac.length === 1 ? 'a una persona' : f.vac.length + ' personas'}: ` + f.vac.map(v => `${v.p.toLowerCase()} (${fmt.int(v.w)} €/mes)`).join(', ') + '.'));
    if (f.obra == null && f.acct) facts.push(h('div', null, btn('Ver ficha completa', () => firmPanel(f), { kind: 'ghost', size: 'sm', icon: 'chart-column' })));
  }
  return h('div', { class: 'bld' }, head, h('div', { class: 'firm-info' }, facts),
    f.staff.length ? h('div', { class: 'residents' }, f.staff.map(p => h('div', { class: 'resident' },
      h('div', { class: 'row' }, icon(p.owner ? 'briefcase' : 'user-round', { size: 15 }), h('b', null, p.n), p.owner ? h('span', { class: 'muted small' }, p.s === 'M' ? 'dueña' : 'dueño') : null),
      h('div', { class: 'small' }, `${p.s === 'M' ? 'Mujer' : 'Hombre'} · ${p.a} años · ${p.p}${qualTxt(p)}`),
      h('div', { class: 'small muted' }, `${p.o === 'extranjero' ? 'De ' + p.f : p.o === 'interno' ? 'De otro cantón' : (p.s === 'M' ? 'Nacida aquí' : 'Nacido aquí')}${culTag(p)} · ${p.owner ? (p.inc > 0 ? 'se lleva ' + fmt.int(p.inc) + ' €/mes netos' : 'sin ingresos') : 'sueldo ' + fmt.int(p.wg || 0) + ' €/mes brutos'}`)))) : h('p', { class: 'muted small firm-info' }, 'Sin plantilla todavía.'));
}
// Cualificación de una persona (si la tiene y no trabaja de ella, también se dice)
const qualTxt = p => !p.q ? '' : ` · cualificación: ${QUAL_NAMES[p.q].toLowerCase()}`;
// Ficha completa de una empresa: situación, productividad, producción, compras, cuentas, plantilla y ofertas
function firmPanel(f) {
  const K = FIRM_KINDS[f.kind], a = f.acct || {};
  const eur = v => fmt.int(v * 1000) + ' €';
  const kY = v => (v < 0 ? '−' : '') + fmt.int(Math.abs(v) * 1000) + ' €';
  const pct = v => (v >= 1 ? '+' : '−') + fmt.int(Math.abs(v - 1) * 100) + ' %';
  const row = (l, v, cls) => h('tr', { class: cls || '' }, h('td', null, l), h('td', { class: 'r num' }, v));
  const blocks = [];
  blocks.push(section('Situación', h('table', { class: 'tbl' }, h('tbody', null,
    row('Tipo', `${K.name} · nivel ${f.lvl} de ${f.maxLvl} (empresa ${f.size})`),
    row('Propiedad', f.partnersNeed > 1 ? `${f.owners} de ${f.partnersNeed} socios` : '1 dueño'),
    f.passive && f.passive.length ? row('Socios que no trabajan aquí', f.passive.map(x => `${x.n} (${x.p.toLowerCase()})`).join(', ')) : null,
    row('Caja', kY(f.cash), f.cash < 0 ? 'down' : ''),
    row('Deuda con el banco', f.debt > 0.05 ? kY(f.debt) + (f.bank ? ` (${f.bank})` : '') : 'ninguna'),
    row('Resultado', `${f.profitY >= 0 ? 'beneficio' : 'pérdidas'} de ${kY(Math.abs(f.profitY))} al año`, f.profitY < 0 ? 'down' : ''),
    f.loss >= 1 ? row('Trimestres seguidos en pérdidas', String(f.loss), 'down') : null,
    f.noPartner ? row('Buscando socio desde hace', f.noPartner + (f.noPartner === 1 ? ' trimestre' : ' trimestres')) : null)),
    f.crisis ? h('p', { class: 'small down' }, 'Está en crisis: recorta sueldos (lo que permita la ley laboral), despide a quien no le sale a cuenta y no contrata. Si se queda sin caja y sin crédito, quebrará.') : null));
  if (f.prod) {
    const P = f.prod, tot = P.level * P.qual * P.boost * P.inputs * P.eq * P.policy * P.idx;
    blocks.push(section('Productividad', h('table', { class: 'tbl' }, h('tbody', null,
      f.perWorker ? row('Cada trabajador, de base', Object.entries(f.perWorker).map(([g, v]) => `${fmt.num(v / P.level, 1)} u de ${GOODS[g].name.toLowerCase()}`).join(', ')) : null,
      row(`Nivel ${f.lvl}`, pct(P.level)),
      f.spec.q ? row(`Cualificados (${f.spec.Q} de ${f.spec.N}; mínimo ${fmt.int(f.spec.min * 100)} %, aprovecha hasta ${fmt.int(f.spec.max * 100)} %)`, pct(P.qual)) : null,
      Math.abs(P.boost - 1) >= 0.005 ? row('Mejoras (electricidad, conexión)', pct(P.boost)) : null,
      Math.abs(P.eq - 1) >= 0.005 ? row('Maquinaria', pct(P.eq)) : null,
      P.inputs < 0.999 ? row('Le faltan insumos', pct(P.inputs), 'down') : null,
      Math.abs(P.policy - 1) >= 0.005 ? row('Protección natural', pct(P.policy)) : null,
      Math.abs(P.idx - 1) >= 0.005 ? row('Mejora técnica del sector', pct(P.idx)) : null,
      row('Total', pct(tot), 'tot')))));
  }
  const outG = Object.keys(f.out || {});
  if (outG.length) blocks.push(section('Producción y ventas (este trimestre)', h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'r' }, 'Producido'), h('th', { class: 'r' }, 'Vendido'), h('th', { class: 'r' }, 'Precio de venta'))),
    h('tbody', null, outG.map(g => h('tr', null, h('td', null, GOODS[g].name), h('td', { class: 'r num' }, uTxt(f.out[g])), h('td', { class: 'r num' }, f.soldPct != null ? fmt.int(f.soldPct) + ' %' : '—'), h('td', { class: 'r num' }, f.pxOut[g] != null ? eur(f.pxOut[g]) : '—')))))));
  const inG = Object.keys(f.inp || {});
  if (inG.length) blocks.push(section('Compras (este trimestre)', h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'r' }, 'Comprado'), h('th', { class: 'r' }, 'Precio pagado'))),
    h('tbody', null, inG.map(g => h('tr', null, h('td', null, GOODS[g].name), h('td', { class: 'r num' }, uTxt(f.inp[g])), h('td', { class: 'r num' }, f.pxIn[g] != null ? eur(f.pxIn[g]) : '—')))))));
  if (f.acct) blocks.push(section('Cuentas (al ritmo de este trimestre, al año)', h('table', { class: 'tbl' }, h('tbody', null,
    row(f.kind === 'banco' ? 'Ingresos' : f.kind === 'constructora' ? 'Obra hecha' : 'Ventas', kY(a.rev)),
    a.inp ? row('− Insumos', kY(-a.inp)) : null, a.other ? row('− Materiales y licencias', kY(-a.other)) : null,
    row('= Valor añadido', kY(f.vaY), 'tot'),
    row('− Sueldos', kY(-a.wages)), row('− Cotizaciones de la empresa', kY(-a.payroll)),
    a.carbon ? row('− Impuesto sobre emisiones', kY(-a.carbon)) : null, a.interest ? row('− Intereses', kY(-a.interest)) : null,
    row('= Beneficio', kY(a.profit), a.profit < 0 ? 'tot down' : 'tot'),
    a.corp ? row('− Impuesto de sociedades', kY(-a.corp)) : null,
    row(f.owners > 1 ? '− Lo que se llevan los socios' : '− Lo que se lleva el dueño', kY(-a.draw)),
    f.owners > 1 ? row('   (cada socio)', kY(a.draw / f.owners)) : null))));
  const ws = f.staff.filter(p => !p.owner);
  blocks.push(section(`Plantilla (${ws.length} de ${f.cap})`,
    h('p', { class: 'small muted' }, f.spec.q ? `Puestos de ${PROFESSIONS[f.spec.base].name.toLowerCase()} y de ${PROFESSIONS[f.spec.q].name.toLowerCase()} (cualificados: mínimo ${fmt.int(f.spec.min * 100)} % de la plantilla).` : `Puestos de ${PROFESSIONS[f.spec.base].name.toLowerCase()} (sin cualificación).`),
    ws.length ? h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, h('th', null, 'Persona'), h('th', null, 'Puesto'), h('th', { class: 'r' }, 'Sueldo bruto'))),
      h('tbody', null, ws.sort((x, y) => y.wg - x.wg).map(p => h('tr', null,
        h('td', null, p.n),
        h('td', null, p.p + (p.q && !isQualJob(Object.keys(PROFESSIONS).find(k => profName(k, p.s) === p.p) || '') ? ` (cualificación: ${QUAL_NAMES[p.q].toLowerCase()})` : '')),
        h('td', { class: 'r num' }, fmt.int(p.wg) + ' €/mes'))))) : null));
  if (f.vac && f.vac.length) blocks.push(section('Ofertas de empleo', h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, h('th', null, 'Puesto'), h('th', { class: 'r' }, 'Sueldo ofrecido'), h('th', { class: 'r' }, 'Sin cubrir'))),
    h('tbody', null, f.vac.map(v => h('tr', null, h('td', null, PROFESSIONS[v.prof].name + (v.k === 'bonus' ? ' (de más: rinde un 30 % más)' : '')), h('td', { class: 'r num' }, fmt.int(v.w) + ' €/mes'), h('td', { class: 'r num' }, v.t ? v.t + (v.t === 1 ? ' trimestre' : ' trimestres') : 'nueva')))))));
  modal(f.name, h('div', { class: 'firm-panel' }, blocks), null, { wide: true });
}
// Cultura de una persona: se indica si es inmigrante o si no es la del país donde vive
const culName = cu => (V.cultures2 && V.cultures2[cu]) || cu;
function culTag(p) {
  if (!p || !p.cu) return '';
  const hc = UI.side && UI.side.type === 'hex' && MapScene.hexAt ? (MapScene.hexAt(UI.side.q, UI.side.r) || {}).c : 0;
  const local = !hc ? V.cul : (V.foreign.find(f => f.mapIndex === hc) || {}).cul;
  return p.o === 'extranjero' || (local && p.cu !== local) ? ` · cultura ${culName(p.cu)}` : '';
}
const flatLabel = (u, perFloor) => `${Math.floor(u / perFloor) + 1}.º ${'ABCDEFG'[u % perFloor]}`;
function homeTitle(hm) {
  if (!hm.sn) return 'Piso compartido';
  if (hm.adults.length + hm.kids.length === 1 && hm.adults[0]) return hm.adults[0].n;
  return 'Familia ' + hm.sn;
}
// Residentes de una vivienda
function residents(hm) {
  const ROLE = { titular: null, pariente: s => s === 'M' ? 'familiar acogida' : 'familiar acogido', pareja: s => s === 'M' ? 'pareja' : 'pareja', hijo: s => s === 'M' ? 'hija' : 'hijo', abuelo: s => s === 'M' ? 'abuela' : 'abuelo', companero: s => s === 'M' ? 'compañera de piso' : 'compañero de piso' };
  const origin = p => (p.o === 'extranjero' ? `De ${p.f}${p.y != null ? `, aquí desde hace ${p.y} ${p.y === 1 ? 'año' : 'años'}` : ''}` : p.o === 'interno' ? 'De otro cantón' : (p.s === 'M' ? 'Nacida aquí' : 'Nacido aquí')) + culTag(p);
  const kidStage = a => a < 3 ? 'Bebé' : a < 6 ? 'Educación infantil' : a < 12 ? 'Primaria' : 'Secundaria';
  return h('div', { class: 'residents' },
    hm.adults.map(p => h('div', { class: 'resident' },
      h('div', { class: 'row' }, icon('user-round', { size: 15 }), h('b', null, p.n), ROLE[p.role] ? h('span', { class: 'muted small' }, ROLE[p.role](p.s)) : null),
      h('div', { class: 'small' }, `${p.s === 'M' ? 'Mujer' : 'Hombre'} · ${p.a} años · ${p.job === 'parado' ? (p.s === 'M' ? 'En paro' : 'En paro') : p.p}${p.ws === 'publico' ? (p.s === 'M' ? ' · funcionaria' : ' · funcionario') : p.ws === 'privado' && p.p !== 'Empresaria' && p.p !== 'Empresario' ? ' · sector privado' : ''}${p.st ? ` (especializándose en ${QUAL_NAMES[p.sq].toLowerCase()}: ${p.st === 1 ? 'le queda 1 trimestre' : `le quedan ${p.st} trimestres`})` : ''}${qualTxt(p)}`),
      h('div', { class: 'small muted' }, `${origin(p)} · ${p.inc > 0 ? fmt.int(p.inc) + ' €/mes' : 'sin ingresos'}`),
      h('div', { class: 'small muted' }, `Ahorros: ${fmt.int(p.sav || 0)} €` + (p.hip ? ` · hipoteca: debe ${fmt.int(p.hip.p)} € (${p.hip.y} ${p.hip.y === 1 ? 'año' : 'años'}, ${fmt.int(p.hip.pay)} €/mes)` : '')),
      p.hip && p.hip.ar ? h('div', { class: 'small bad-txt' }, `No llega a pagar la hipoteca: ${p.hip.ar} ${p.hip.ar === 1 ? 'trimestre' : 'trimestres'} de impago.`) : null,
      p.want ? h('div', { class: 'small bad-txt' }, 'Quiere independizarse, pero no puede pagar la entrada de una vivienda.') : null)),
    hm.wl ? h('div', { class: 'small muted hh-wl' }, icon('shopping-basket', { size: 13 }), ` Nivel de vida del hogar: ${hm.wl} · ${WEALTH_NAMES[hm.wl - 1].toLowerCase()}${hm.F != null && hm.F < 0.97 ? ` · solo cubre el ${fmt.pct(hm.F, 0)} de sus necesidades` : ''}`) : null,
    hm.kids.map(k => h('div', { class: 'resident kid' },
      h('div', { class: 'row' }, icon('baby', { size: 15 }), h('b', null, k.n + (hm.sn ? ' ' + hm.sn : '')), h('span', { class: 'muted small' }, k.s === 'M' ? 'hija' : 'hijo')),
      h('div', { class: 'small' }, `${k.s === 'M' ? 'Niña' : 'Niño'} · ${k.a} ${k.a === 1 ? 'año' : 'años'} · ${kidStage(k.a)}`))));
}
const FOREIGN_METRICS = [{ id: 'growth', name: 'Crecimiento', f: v => fmt.pct(v, 1) }, { id: 'unemployment', name: 'Paro', f: v => fmt.pct(v, 1) },
  { id: 'inflation', name: 'Inflación', f: v => fmt.pct(v, 1) }, { id: 'debtRatio', name: 'Deuda (% PIB)', f: v => fmt.pct(v, 0) }];
const histVals = (hist, k) => (hist || []).filter(x => x.turn > 0).map(x => x[k]);
const histLabels = hist => (hist || []).filter(x => x.turn > 0).map(x => shortQuarter(x.turn));
function metricPicker(list, cur, set) {
  return h('div', { class: 'metric-pick' }, list.map(m => h('button', { type: 'button', class: m.id === cur ? 'on' : '', onclick: () => set(m.id) }, m.short || m.name)));
}
function sidePanel() {
  const hexOk = UI.side && UI.side.type === 'hex' && MapScene.hexAt && MapScene.hexAt(UI.side.q, UI.side.r);
  const sel = UI.side && ((UI.side.type === 'canton' && V.cantons[UI.side.idx]) || (UI.side.type === 'foreign' && V.foreign.some(f => f.id === UI.side.id)) || hexOk) ? UI.side : { type: 'country' };
  const tabsFor = { country: [['resumen', 'Resumen'], ['estadisticas', 'Estadísticas'], ['evolucion', 'Evolución']], canton: [['resumen', 'Resumen'], ['estadisticas', 'Estadísticas'], ['mercado', 'Mercado'], ['presupuesto', 'Presupuesto'], ['evolucion', 'Evolución']], foreign: [['resumen', 'Resumen'], ['politica', 'Política'], ['cantones', 'Cantones'], ['evolucion', 'Evolución']], hex: [['resumen', 'Resumen'], ['recursos', 'Recursos naturales'], ['edificios', 'Edificios']] }[sel.type];
  if (tabsFor.length && !tabsFor.some(t => t[0] === UI.insTab)) UI.insTab = 'resumen';
  const key = sel.type === 'canton' ? 'c' + sel.idx : sel.type === 'foreign' ? 'f' + sel.id : sel.type === 'hex' ? 'h' + sel.q + '_' + sel.r : 'p';
  let body, title, ic;
  if ((sel.type === 'canton' || sel.type === 'country') && UI.insTab === 'estadisticas') { body = popStatsView(statsData(sel.type, sel.type === 'canton' ? sel.idx : null), sel.type === 'canton' ? V.cantons[sel.idx].housing : V.eco.housing, sel.type === 'canton' ? V.cantons[sel.idx].name : V.country.name); title = sel.type === 'canton' ? (V.cantons[sel.idx].capital ? '★ ' : '') + V.cantons[sel.idx].name : 'República de ' + V.country.name; ic = sel.type === 'canton' ? 'map-pin' : 'landmark'; }
  else if (sel.type === 'canton') { const c = V.cantons[sel.idx]; body = cantonInspector(c, UI.insTab); title = (c.capital ? '★ ' : '') + c.name; ic = 'map-pin'; }
  else if (sel.type === 'foreign') { const f = V.foreign.find(x => x.id === sel.id); body = foreignInspector(f, UI.insTab); title = h('span', { class: 'row' }, h('span', { class: 'flagchip', style: { background: f.color } }), f.name); ic = null; }
  else if (sel.type === 'hex') { const hx = MapScene.hexAt(sel.q, sel.r); body = hexInspector(hx, UI.insTab); title = TERRAIN3D[hx.t].name; ic = TERRAIN3D[hx.t].icon; }
  else { body = countryInspector(UI.insTab); title = 'República de ' + V.country.name; ic = 'landmark'; }
  return h('div', { class: 'dock right glass inspector', 'data-sk': 'ins-' + key + UI.insTab },
    h('div', { class: 'row ins-head' }, ic ? icon(ic, { size: 22 }) : null, h('h2', { class: 'ins-title' }, title), h('span', { class: 'spacer' }),
      sel.type !== 'country' ? btn('', () => inspect(null), { kind: 'ghost', size: 'sm', icon: 'x', title: 'Cerrar' }) : null),
    tabsFor.length ? h('div', { class: 'tabs ins-tabs' }, tabsFor.map(([id, name]) => h('button', { type: 'button', class: UI.insTab === id ? 'on' : '', onclick: () => { UI.insTab = id; renderRegion('side'); } }, name))) : null,
    body,
    sel.type === 'country' && UI.insTab === 'resumen' ? h('p', { class: 'muted small hint-map' }, icon('map-pin', { size: 13 }), ' Toca un país en la vista de países, un cantón en la de cantones o un terreno en la de terreno para ver sus datos.') : null);
}
function countryInspector(tab) {
  const e = V.eco, H = e.history || [];
  if (tab === 'evolucion') {
    const cur = INDICATORS.find(i => i.id === UI.insMetric) || INDICATORS[0];
    const { values, labels } = indHistory(cur);
    return h('div', null, metricPicker(INDICATORS, cur.id, id => { UI.insMetric = id; renderRegion('side'); }),
      h('div', { class: 'ins-chart' }, h('div', { class: 'row' }, h('b', null, cur.name), h('span', { class: 'spacer' }), h('b', { class: 'ind-big' }, cur.f(cur.v(e)))),
        lineChart([{ values: values.map(v => isFinite(v) ? v : 0), color: '#e0b84e' }], labels, { w: 340, h: 190, padL: 58, padR: 20, fmt: v => String(cur.f(v)).replace(' mil M€', ' mm'), zero: cur.zero })),
      h('button', { type: 'button', class: 'link-more', onclick: openIndicators }, icon('activity', { size: 14 }), ' Ver todos los gráficos a la vez'));
  }
  const sp = k => H.map(x => x[k]);
  const gov = P(V.gov.president);
  return h('div', null,
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Gobierna:'), chip(gov, { small: true, none: '—' })),
    miniHemicycle(V.parliament.composition, V.parliament.seats, V.players),
    h('div', { class: 'small center muted' }, `Parlamento nacional: ${V.parliament.seats} escaños · mayoría ${absMajority(V.parliament.seats)}`),
    h('div', { class: 'grid2' },
      stat('Habitantes', fmt.people(e.population), { spark: sp('population') }), stat('Renta por habitante', fmt.int(e.gdpPerCapita || 0) + ' €', { spark: sp('gdpPerCapita') }),
      stat('PIB', fmt.bn(e.gdp), { spark: sp('gdp') }), stat('Paro', fmt.pct(e.unemployment, 1), { spark: sp('unemployment'), sparkColor: '#ff7a7a' }),
      stat(e.deficit > 0 ? 'Déficit' : 'Superávit', fmt.pct(Math.abs(e.deficitRatio), 1) + ' PIB', { tone: e.deficit > 0 ? 'bad' : 'good', sub: fmt.bn(Math.abs(e.deficit)) + ' al año', spark: H.map(x => -x.deficitRatio) }),
      stat('Deuda · nota ' + (e.rating || ''), fmt.pct(e.debtRatio, 0) + ' PIB', { spark: sp('debtRatio'), sparkColor: '#ff7a7a' }),
      stat('Inflación', fmt.pct(e.inflation, 1), { spark: sp('inflation') }), stat('IDH', fmt.num(e.hdi || 0, 3), { spark: sp('hdi') })),
    e.housing ? section('Vivienda', h('p', { class: 'small' }, `Un piso cuesta de media ${priceK(e.housing.price.piso)} y una casa ${priceK(e.housing.price.casa)}. ${fmt.pct(e.housing.vacant / Math.max(1, e.housing.stock), 1)} de las viviendas están vacías; ${fmt.int(e.housing.worksUnits)} en obras. Hipotecas al ${fmt.pct(e.mortRate || 0, 2)}.`)) : null,
    section('Servicios públicos', h('div', { class: 'stack' }, [['Sanidad', e.health, 'stethoscope'], ['Educación', e.education, 'graduation-cap'], ['Servicios sociales', e.social, 'heart'], ['Transporte', e.transport, 'train-front'], ['Seguridad', e.security, 'siren']]
      .map(([n, v, ic]) => h('div', { class: 'brow' }, icon(ic, { size: 15 }), h('span', { class: 'bname' }, n), hbar((v || 0) / 100, (v || 0) >= 60 ? '#57c48d' : (v || 0) >= 45 ? '#ffc23d' : '#ff7a7a'), h('span', { class: 'num' }, Math.round(v || 0)))))),
    section('Los cantones', h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'r' }, 'Habitantes'), h('th', { class: 'r' }, 'Paro'), h('th', { class: 'r' }, 'Renta/hab.'))),
      h('tbody', null, liveCantonsV().map(c => h('tr', { class: 'clickable', onclick: () => inspect({ type: 'canton', idx: c.idx }, 'resumen') }, h('td', null, h('b', null, c.name)), h('td', { class: 'r num' }, fmt.people(c.stats.pop || c.pop || 0)), h('td', { class: 'r' }, fmt.pct(c.stats.unemployment, 0)),
        h('td', { class: 'r' }, fmt.int(c.stats.gdp * 1e9 / Math.max(1, c.stats.pop)) + ' €')))))));
}
function cantonInspector(c, tab) {
  const b = c.budget, H = c.history || [];
  if (tab === 'mercado') return cantonMarket(c);
  if (tab === 'presupuesto') {
    const taxes = TAXES.filter(t => c.pol[t.id] != null);
    return h('div', null,
      h('div', { class: 'big3 small' },
        h('div', { class: 'big' }, h('span', null, 'Ingresos'), h('b', null, fmt.bn(b.revenue)), h('small', null, fmt.pct(b.revenue / c.stats.gdp, 1) + ' de su PIB')),
        h('div', { class: 'big' }, h('span', null, 'Gastos'), h('b', null, fmt.bn(b.spending)), h('small', null, fmt.pct(b.spending / c.stats.gdp, 1) + ' de su PIB')),
        h('div', { class: 'big ' + (b.balance >= 0 ? 'good' : 'bad') }, h('span', null, b.balance >= 0 ? 'Superávit' : 'Déficit'), h('b', null, fmt.bn(Math.abs(b.balance))), h('small', null, 'al año'))),
      h('p', { class: 'small' }, `Deuda: ${fmt.bn(b.debt)} (${fmt.pct(b.debtRatio || 0, 1)} de su PIB) · interés ${fmt.pct(c.interestRate || 0, 1)}.`),
      h('h4', null, 'De dónde sale su dinero'), budgetBars(b.rev, REV_NAMES, REV_ICONS, b.revenue, '#57c48d'),
      h('h4', null, 'En qué lo gasta'), budgetBars(b.spend, SPEND_NAMES, SPEND_ICONS, b.spending, '#e0b84e'),
      h('p', { class: 'muted small' }, 'Euros al año.'),
      group('ins-tax-' + c.idx, 'Impuestos propios', taxes.length ? taxes.length + ' en vigor' : 'ninguno', taxes.length ? h('dl', { class: 'kv small' }, taxes.map(t => [h('dt', null, t.name), h('dd', null, pctLbl(c.pol[t.id]))])) : h('p', { class: 'muted small' }, 'Vive de las transferencias del Estado.'), { icon: 'percent' }),
      group('ins-comp-' + c.idx, 'Competencias y partidas', '', h('dl', { class: 'kv small' }, AREAS.map(a => [h('dt', null, a.name), h('dd', null, cantApplies(V.pol, a.id) ? `${COMP_LABEL[V.pol.comp[a.id]]} · ${num2(c.pol.gasto[a.id] || 0)} % de su PIB` : 'Del Estado')]),
        [h('dt', null, 'Ayudas al campo'), h('dd', null, num2(c.pol.gasto.campo || 0) + ' %')],
        [h('dt', null, 'Inmersión lingüística'), h('dd', null, c.pol.lengua ? 'En vigor' : 'No')]), { icon: 'map' }));
  }
  if (tab === 'evolucion') {
    const cur = CANTON_METRICS.find(m => m.id === UI.cMetric) || CANTON_METRICS[2];
    const series = [{ values: histVals(H, cur.id), color: '#e0b84e' }];
    if (cur.nat) series.push({ values: histVals(V.eco.history, cur.nat).slice(-series[0].values.length), color: '#7f8aa8' });
    return h('div', null, metricPicker(CANTON_METRICS, cur.id, id => { UI.cMetric = id; renderRegion('side'); }),
      h('div', { class: 'ins-chart' }, h('div', { class: 'row' }, h('b', null, cur.name), h('span', { class: 'spacer' }), h('b', { class: 'ind-big' }, cur.f((H[H.length - 1] || {})[cur.id] || 0))),
        lineChart(series, histLabels(H), { w: 340, h: 190, padL: 58, padR: 20, fmt: v => String(cur.f(v)), zero: cur.zero }),
        cur.nat ? h('div', { class: 'legend small' }, h('span', null, h('i', { style: { background: '#e0b84e' } }), c.name), h('span', null, h('i', { style: { background: '#7f8aa8' } }), 'Media del país')) : null));
  }
  const gov = P(c.gov.president);
  const sp = k => H.map(x => x[k]);
  return h('div', null,
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Gobierna:'), chip(gov, { small: true }), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, `Fervor cantonalista ${Math.round((c.ferv ? c.ferv.can : 0) * 100)} %`)),
    miniHemicycle(c.parliament.composition, c.parliament.seats, V.players),
    h('div', { class: 'small center muted' }, `Parlamento de ${c.parliament.seats} escaños · mayoría ${absMajority(c.parliament.seats)} · ${c.nationalSeats} diputados en el Parlamento nacional`),
    h('div', { class: 'grid2' }, stat('Habitantes', fmt.people(c.pop), { spark: sp('pop') }), stat('Paro', fmt.pct(c.stats.unemployment, 1), { spark: sp('unemployment'), sparkColor: '#ff7a7a' }),
      stat('PIB', fmt.bn(c.stats.gdp || 0), { sub: `${fmt.pct((c.stats.gdp || 0) / Math.max(1e-12, V.eco.gdp), 0)} del PIB del país`, spark: sp('gdp') }),
      stat('Renta/hab.', fmt.int(c.stats.gdp * 1e9 / c.stats.pop) + ' €', { spark: sp('gdpPc') }), stat(b.balance >= 0 ? 'Superávit' : 'Déficit', fmt.bn(Math.abs(b.balance)), { tone: b.balance >= 0 ? 'good' : 'bad', spark: sp('balance') })),
    cantonIdentity(c),
    section('Servicios', h('div', { class: 'stack' }, [['Sanidad', c.stats.health, 'stethoscope'], ['Educación', c.stats.education, 'graduation-cap'], ['Servicios sociales', c.stats.social, 'heart'], ['Transporte', c.stats.transport, 'train-front'], ['Seguridad', c.stats.security, 'siren']]
      .map(([n, v, ic]) => h('div', { class: 'brow' }, icon(ic, { size: 15 }), h('span', { class: 'bname' }, n), hbar((v || 0) / 100, (v || 0) >= 60 ? '#57c48d' : (v || 0) >= 45 ? '#ffc23d' : '#ff7a7a'), h('span', { class: 'num' }, Math.round(v || 0))))),
      h('p', { class: 'small muted' }, `Delincuencia: ${fmt.num(c.stats.crime || 0, 1)} delitos por cada 1.000 habitantes.`)),
    c.housing && c.housing.price ? section('Vivienda', h('p', { class: 'small' }, `Piso ${priceK(c.housing.price.piso)} · casa ${priceK(c.housing.price.casa)} · ${fmt.pct(c.housing.vacant / Math.max(1, c.housing.stock), 1)} vacías · ${fmt.int(c.housing.worksUnits || 0)} en obras.`)) : null);
}
// Fervor del cantón: cantonalistas, neutrales y centralistas; su cultura y lo que lo está moviendo
function fervorBar(f) {
  const can = f ? f.can : 0, cen = f ? f.cen : 0, neu = Math.max(0, 1 - can - cen);
  return h('div', { class: 'ferv-bar' }, h('i', { class: 'can', style: { width: can * 100 + '%' }, title: `Cantonalistas ${Math.round(can * 100)} %` }),
    h('i', { class: 'neu', style: { width: neu * 100 + '%' }, title: `Neutrales ${Math.round(neu * 100)} %` }), h('i', { class: 'cen', style: { width: cen * 100 + '%' }, title: `Centralistas ${Math.round(cen * 100)} %` }));
}
function cantonIdentity(c) {
  const cu = V.cultures ? V.cultures[c.cul] : null, f = c.ferv || { can: 0, cen: 0 };
  const H = c.history || [], first = H.find(x => x.fervCan != null);
  const pr = fervorPressures(V, c), p0 = c.pr0 || { can: 0, cen: 0 };
  const sign = v => (v > 0 ? '+' : '') + num2(v * 100);
  const why = pr.parts.length ? 'Lo que lo mueve cada trimestre (en puntos, antes de la dificultad de subir cuando ya es alto): ' + pr.parts.map(x => `${x.label}: ${x.can ? sign(x.can) + ' cantonalista' : ''}${x.can && x.cen ? ', ' : ''}${x.cen ? sign(x.cen) + ' centralista' : ''}`).join(' · ') + '. Solo cuenta la diferencia con cómo estaba todo al empezar la partida; sin cambios, el fervor vuelve poco a poco a su nivel de siempre.' : '';
  const dCan = pr.can - p0.can, dCen = pr.cen - p0.cen;
  const trend = Math.abs(dCan) < 0.001 && Math.abs(dCen) < 0.001 ? 'Estable' : [dCan > 0.001 ? '▲ cantonalista' : dCan < -0.001 ? '▼ cantonalista' : null, dCen > 0.001 ? '▲ centralista' : dCen < -0.001 ? '▼ centralista' : null].filter(Boolean).join(' · ');
  const regs = V.players.filter(p => p.regional != null && (p.region || [p.regional]).includes(c.idx));
  return section('Identidad',
    h('div', { class: 'row small' }, icon('flag', { size: 14 }), h('span', null, cu ? (cu.major ? `Cultura mayoritaria del país` : `Cultura de ${cu.name}`) : '—'),
      h('span', { class: 'spacer' }), h('span', { class: 'muted' }, 'Tendencia: ' + trend), infoTip(why || 'Ahora mismo nada lo empuja: el fervor vuelve poco a poco a su nivel de siempre.')),
    fervorBar(f),
    h('div', { class: 'legend small' }, h('span', null, h('i', { style: { background: '#9b6bd6' } }), `Cantonalistas ${Math.round(f.can * 100)} %`),
      h('span', null, h('i', { style: { background: '#56607a' } }), `Neutrales ${Math.round(Math.max(0, 1 - f.can - f.cen) * 100)} %`), h('span', null, h('i', { style: { background: '#d0574a' } }), `Centralistas ${Math.round(f.cen * 100)} %`)),
    first && H.length > 1 ? h('p', { class: 'small muted' }, `Al empezar: ${Math.round(first.fervCan * 100)} % cantonalistas y ${Math.round(first.fervCen * 100)} % centralistas.`) : null,
    regs.length ? h('div', { class: 'row small wrap' }, h('span', null, 'Regionalistas:'), regs.map(p => chip(p, { small: true, short: true }))) : null,
    (V.pol.concierto || []).includes(c.idx) ? h('p', { class: 'small' }, icon('handshake', { size: 13 }), ' Tiene concierto económico.') : null);
}
function foreignInspector(f, tab) {
  if (tab === 'evolucion') {
    const H = f.history || [];
    return h('div', null, FOREIGN_METRICS.map(m => h('div', { class: 'ins-chart' }, h('div', { class: 'row' }, h('b', null, m.name), h('span', { class: 'spacer' }), h('b', null, m.f(f[m.id]))),
      lineChart([{ values: histVals(H, m.id), color: f.color }, { values: histVals(V.eco.history, m.id === 'growth' ? 'growth' : m.id).slice(-histVals(H, m.id).length), color: '#7f8aa8' }], histLabels(H), { w: 340, h: 120, padL: 54, padR: 20, fmt: v => m.f(v), zero: true }))),
      h('div', { class: 'legend small' }, h('span', null, h('i', { style: { background: f.color } }), f.name), h('span', null, h('i', { style: { background: '#7f8aa8' } }), V.country.name)));
  }
  if (tab === 'politica') return foreignPolitics(f);
  if (tab === 'cantones') return foreignCantons(f);
  return foreignCard(f, { noTitle: true });
}
// Partidos, Gobierno, Parlamento, leyes y cantones de un país extranjero
function fpChip(p, extra) {
  if (!p) return h('span', { class: 'muted' }, '—');
  const lg = h('span', { class: 'logo' }); lg.style.width = lg.style.height = '20px'; lg.innerHTML = logoSVG(p.logo, p.color, p.color2, 20);
  return h('span', { class: 'chip sm', title: p.name }, lg, h('span', { class: 'nm' }, p.short), extra ? h('span', { class: 'sub' }, extra) : null);
}
function foreignPolitics(f) {
  if (!f.parties || !f.gov) return h('p', { class: 'muted' }, 'Sin datos políticos.');
  const gp = f.parties.find(p => p.id === f.gov.party);
  const comp = (f.parliament || {}).composition || {}, seats = (f.parliament || {}).seats || 0;
  const parts = f.parties.slice().sort((a, b) => (comp[b.id] || 0) - (comp[a.id] || 0) || b.share - a.share);
  const open = UI.fpOpen || {};
  return h('div', null,
    section('Gobierno', h('div', { class: 'row' }, fpChip(gp), h('span', { class: 'small' }, gp ? `${gp.name} · ${gp.leader}` : '—')),
      (f.gov.coalition || []).length ? h('p', { class: 'small' }, 'En coalición con: ', f.gov.coalition.map(id => fpChip(f.parties.find(p => p.id === id)))) : h('p', { class: 'small muted' }, f.gov.majority ? 'Gobierna en solitario con mayoría.' : 'Gobierna en solitario, en minoría.'),
      h('p', { class: 'small muted' }, `Próximas elecciones: ${shortQuarter(f.nextElection)}${f.lastElection != null ? ` (las últimas, ${shortQuarter(f.lastElection)})` : ''}.`)),
    section('Parlamento', miniHemicycle(comp, seats, f.parties),
      h('div', { class: 'small center muted' }, `${seats} escaños · mayoría ${absMajority(seats)}`),
      h('div', { class: 'stack' }, parts.map(p => h('div', { class: 'row small clickable', onclick: () => { UI.fpOpen = Object.assign({}, open, { [p.id]: !open[p.id] }); renderRegion('side'); } },
        fpChip(p), h('span', { class: 'grow muted' }, p.name + (p.regional != null && f.cantons && f.cantons[p.regional] ? ` · regionalista de ${f.cantons[p.regional].name}` : '')),
        h('b', { class: 'num' }, `${comp[p.id] || 0}`), h('span', { class: 'muted num' }, fmt.pct(p.share || 0, 0)))))),
    section('Brújula política', ideologyAxes(f.parties, { overall: true }), ideologyAxes(f.parties),
      h('div', { class: 'stack small' }, parts.filter(p => open[p.id]).map(p => h('div', { class: 'card' }, h('div', { class: 'row' }, fpChip(p), h('b', null, p.name)), h('div', { class: 'muted' }, `Líder: ${p.leader}`),
        h('div', null, AXES.map(a => h('span', { class: 'tag' }, `${a.name}: ${axisLabel(a.id, p.ideo[a.id])}`)))))),
      h('p', { class: 'muted small' }, 'Toca un partido de la lista del Parlamento para ver su ideología eje por eje.')),
    f.laws && f.laws.length ? section('Leyes recientes', h('ul', { class: 'log' }, f.laws.map(l => { const pp = f.parties.find(p => p.id === l.proposer);
      return h('li', null, h('span', { class: 'faint' }, shortQuarter(l.turn) + ' '), pp ? fpChip(pp) : null, ' ', l.changes.join('; ')); }))) : null);
}
function foreignCantons(f) {
  const live = (f.cantons || []).filter(c => !c.nominal);
  if (!live.length) return h('p', { class: 'muted small' }, 'Es un Estado sin cantones: todo se decide en el Parlamento nacional.');
  const gdpT = Math.max(1e-12, sum(f.cantons, c => c.gdp || 0));
  return h('div', null, h('table', { class: 'tbl small' }, h('thead', null, h('tr', null, h('th', null, 'Cantón'), h('th', { class: 'r' }, 'Habitantes'), h('th', { class: 'r' }, 'PIB'), h('th', { class: 'r' }, 'Paro'), h('th', null, 'Gobierna'))),
    h('tbody', null, live.map(c => { const g = f.parties.find(p => p.id === c.gov);
      return h('tr', null, h('td', null, c.name + (c.island ? ' (isla)' : '')), h('td', { class: 'r num' }, fmt.people(c.pop || 0)), h('td', { class: 'r num' }, fmt.pct((c.gdp || 0) / gdpT, 0)), h('td', { class: 'r num' }, fmt.pct(c.unemployment || 0, 1)), h('td', null, g ? fpChip(g) : '—')); }))),
    h('p', { class: 'muted small' }, 'PIB: parte del PIB del país que produce cada cantón.'));
}
function budgetBars(obj, names, icons, total, color) {
  const rows = Object.entries(obj || {}).filter(([, v]) => v > Math.abs(total || 0) * 0.002).sort((a, b) => b[1] - a[1]);
  const mx = Math.max(1e-9, ...rows.map(r => r[1]));
  return h('div', { class: 'budget-list' }, rows.map(([k, v]) => h('div', { class: 'brow' }, icon(icons[k] || 'coins', { size: 15 }), h('span', { class: 'bname' }, names[k] || k),
    hbar(v / mx, color), h('span', { class: 'num' }, fmt.bn(v)))));
}
function proposalTitleV(pr) { return pr.kind === 'censura' ? 'Moción de censura' : packById(pr.pack).name + (pr.scope === 'cantonal' ? ' · ' + V.cantons[pr.canton].name : '') + (pr.decree ? ' (decreto)' : ''); }
function proposalSummaryV(pr) {
  if (pr.kind === 'censura') return `${P(pr.proposer).candidate.name} como presidente`;
  return Object.keys(pr.changes).map(fid => { const f = fieldById(V, fid) || { name: fid, label: v => String(v) }; return `${f.name}: ${f.label(pr.prev[fid])} → ${f.label(pr.changes[fid])}`; }).join('; ');
}

// ============================================================
//  PLENO
// ============================================================
function billCard(pr) {
  const pp = P(pr.proposer);
  const tag = pr.kind === 'censura' ? h('span', { class: 'tag brass' }, `Mayoría absoluta (${absMajority(V.parliament.seats)})`)
    : pr.decree ? h('span', { class: 'tag brass' }, 'Decreto-ley: decae solo con mayoría absoluta en contra') : pr.organic ? h('span', { class: 'tag brass' }, 'Ley orgánica: mayoría absoluta') : h('span', { class: 'tag' }, 'Mayoría simple');
  const rows = pr.kind === 'censura' ? [h('p', null, `${pp.candidate.name} (${pp.short}) se propone como presidente en lugar de ${P(V.gov.president) ? P(V.gov.president).candidate.name : '—'}.`)]
    : Object.keys(pr.changes).map(fid => { const f = fieldById(V, fid) || { name: fid, label: v => String(v) }; return h('div', { class: 'change-row' }, h('span', { class: 'fn' }, f.name), h('span', { class: 'from' }, f.label(pr.prev[fid])), icon('chevron-right', { size: 14 }), h('b', { class: 'to' }, f.label(pr.changes[fid]))); });
  // (los tratados que nos ofrece otro país no los presenta ningún partido)
  const ff = pr.foreign ? V.foreign.find(f => f.id === pr.foreign) : null;
  const who = pp ? chip(pp, { small: true, short: true }) : ff ? h('span', { class: 'row small' }, h('span', { class: 'flagchip', style: { background: ff.color } }), 'Propuesta de ' + ff.name) : null;
  return h('div', { class: 'doc bill' }, h('div', { class: 'row' }, pr.kind === 'censura' ? icon('gavel', { size: 20 }) : icon(packById(pr.pack).icon, { size: 20 }), h('h3', null, proposalTitleV(pr)), h('span', { class: 'spacer' }), who), tag,
    ff && !pp ? h('p', { class: 'small muted' }, `${ff.name} nos propone este tratado de libre comercio. Solo entra en vigor si lo aprueba el Parlamento.`) : null, h('div', { class: 'changes' }, rows));
}
function phaseBallot() {
  const myVotesNeeded = V.proposals.filter(pr => voterHasSeatsV(pr, V.me));
  return {
    side: h('div', { class: 'dock right wide glass', 'data-sk': 'ballot' }, h('h2', null, 'Pleno: votación del trimestre'),
      h('p', { class: 'muted small' }, 'Tu grupo vota en bloque con todos sus escaños. Los votos se revelan cuando todos hayan votado. Si no votas, cuenta como abstención.'),
      !myVotesNeeded.length ? h('p', { class: 'notice' }, 'No tienes escaños en ninguno de los parlamentos que votan hoy.') : null,
      h('div', { class: 'stack' }, V.proposals.map(pr => {
        const can = voterHasSeatsV(pr, V.me);
        const others = V.players.filter(x => x.id !== V.me && voterHasSeatsV(pr, x.id));
        const voted = others.filter(x => pr.votes[x.id]).length;
        return h('div', { class: 'ballot-item' }, billCard(pr),
          h('div', { class: 'row' }, can ? voteButtons(pr.votes[V.me], v => act({ type: 'vote', id: pr.id, value: v }, { toast: false }), false) : h('span', { class: 'muted small' }, 'No votas aquí'), h('span', { class: 'spacer' }), h('span', { class: 'muted small' }, `${voted}/${others.length} grupos han votado`)),
          can && pr.kind === 'law' ? voteShiftHint(pr) : null);
      }))),
  };
}
// Hacia dónde movería a tu partido votar sí o no (aproximado; abstenerse no mueve nada)
function voteShiftHint(pr) {
  const p = me();
  const words = d => Math.abs(d) < 0.03 ? null : Math.abs(d) < 0.08 ? 'un poco' : Math.abs(d) < 0.2 ? 'bastante' : 'mucho';
  const line = (label, v) => {
    const sh = voteShiftEstimate(V, p, pr, v);
    const items = AXES.filter(a => sh[a.id] !== undefined && words(sh[a.id])).map(a => h('span', { class: 'fx ' + (sh[a.id] < 0 ? 'neg' : 'pos'), title: a.name },
      icon(a.icon, { size: 11 }), FX_POLES[a.id][sh[a.id] < 0 ? 0 : 1], h('i', { class: 'dots' }, words(sh[a.id]))));
    return h('div', { class: 'row small shift-line' }, h('b', null, label), items.length ? h('span', { class: 'fx-row' }, items) : h('span', { class: 'muted' }, 'apenas te mueve'));
  };
  return h('div', { class: 'vote-shift' }, line('Votar sí:', 'si'), line('Votar no:', 'no'), h('div', { class: 'muted small' }, 'Abstenerse no cambia vuestra ideología.'));
}
function voterHasSeatsV(pr, pid) { return pr.scope === 'cantonal' ? (V.cantons[pr.canton].parliament.composition[pid] || 0) > 0 : seatsV(pid) > 0; }
function phaseSessionResult() {
  const list = V.proposals;
  const i = clamp(UI.resultIdx, 0, list.length - 1);
  const pr = list[i], r = pr.result;
  const verdict = pr.kind === 'censura' ? (r.passed ? 'Moción aprobada' : 'Moción rechazada') : pr.decree ? (r.passed ? 'Decreto convalidado' : 'Decreto derogado') : (r.passed ? 'Aprobada' : 'Rechazada');
  return {
    side: h('div', { class: 'dock right wide glass', 'data-sk': 'res' },
      h('div', { class: 'row' }, h('h2', null, `Resultado ${i + 1} de ${list.length}`), h('span', { class: 'spacer' }),
        btn('', () => { UI.resultIdx = Math.max(0, i - 1); render(); }, { size: 'sm', kind: 'ghost', icon: 'chevron-left', disabled: i === 0, title: 'Anterior' }),
        btn('', () => { UI.resultIdx = Math.min(list.length - 1, i + 1); render(); }, { size: 'sm', kind: 'ghost', icon: 'chevron-right', disabled: i >= list.length - 1, title: 'Siguiente' })),
      billCard(pr),
      h('div', { class: 'tally' }, h('span', { class: 'si' }, 'Sí ' + r.yes), h('span', { class: 'no' }, 'No ' + r.no), h('span', { class: 'abs' }, 'Abst. ' + r.abs)),
      h('div', { class: 'verdict ' + (r.passed ? 'ok' : 'ko') }, verdict),
      h('div', { class: 'small' }, V.players.filter(p => voterHasSeatsV(pr, p.id)).map(p => h('span', { class: 'tag vote-' + (pr.votes[p.id] || 'abs') }, `${p.short}: ${{ si: 'sí', no: 'no', abs: 'abstención' }[pr.votes[p.id] || 'abs']}`))),
      pr.publicSupport ? h('p', { class: 'muted small' }, `La apoya el ${fmt.pct(pr.publicSupport.favor, 0)} de la ciudadanía; la rechaza el ${fmt.pct(pr.publicSupport.contra, 0)}.`) : null,
      i < list.length - 1 ? btn('Siguiente resultado', () => { UI.resultIdx = i + 1; render(); }, { icon: 'chevron-right' }) : null),
  };
}

// ============================================================
//  FIN
// ============================================================
function phaseGameover() {
  const ranking = V.ranking.map(id => P(id));
  const champ = ranking[0];
  const won = champ.missions.every(m => m.done);
  return {
    main: h('div', { class: 'center-overlay' }, h('div', { class: 'glass panel-wide', 'data-sk': 'end' },
      h('div', { class: 'winner' }, portrait(champ, 130, 'big'), h('div', null, h('h4', null, won ? 'Agenda cumplida' : 'Se acabó el tiempo'), h('h1', null, `${champ.name} gana`),
        h('p', { class: 'muted' }, won ? `${champ.candidate.name} ha cumplido sus tres misiones secretas.` : `Ha cumplido más misiones que nadie (${champ.missions.filter(m => m.done).length} de 3).`))),
      h('h2', null, 'Las agendas secretas, al descubierto'),
      ranking.map((p, k) => h('div', { class: 'card' }, h('div', { class: 'row' }, h('b', { class: 'rank' }, (k + 1) + '.'), chip(p, { sub: `${p.player} · ${plural(seatsV(p.id), 'escaño', 'escaños')} · ${plural(p.stats.lawsPassed, 'ley aprobada', 'leyes aprobadas')} · ${plural(p.stats.scandals, 'escándalo', 'escándalos')}` })),
        h('div', { class: 'grid3 compact' }, (p.missions || []).map(m => m.title ? missionCard(m) : h('div', { class: 'doc mission' }, m.done ? 'Cumplida' : 'Sin cumplir'))))),
      section('Cómo ha cambiado el país', lineChart([{ name: 'PIB', values: V.eco.history.map(x => x.gdp), color: '#e0b84e' }], V.eco.history.map(x => shortQuarter(x.turn)), { fmt: v => fmt.num(v, 0) })),
      h('div', { class: 'btn-row' }, btn('Volver a la portada', () => location.reload(), { kind: 'primary' })))),
  };
}

// ============================================================
//  INDICADORES DEL PAÍS: barra siempre visible y ventana con gráficos
// ============================================================
const pctF = d => v => fmt.pct(v, d);
const INDICATORS = [
  { id: 'gdp', name: 'PIB', short: 'PIB', icon: 'trending-up', v: e => e.gdp, f: v => fmt.bn(v), good: 1, group: 'Economía' },
  { id: 'gdpPerCapita', name: 'PIB por habitante', short: 'PIB/hab.', icon: 'wallet', v: e => e.gdpPerCapita, f: v => fmt.int(v) + ' €', good: 1, group: 'Economía', strip: false },
  { id: 'growth', name: 'Crecimiento del PIB (interanual)', short: 'Crec.', icon: 'activity', v: e => e.growth, f: pctF(1), good: 1, group: 'Economía', zero: true },
  { id: 'unemployment', name: 'Paro', short: 'Paro', icon: 'users', v: e => e.unemployment, f: pctF(1), good: -1, group: 'Economía' },
  { id: 'inflation', name: 'Inflación', short: 'IPC', icon: 'receipt', v: e => e.inflation, f: pctF(1), good: -1, group: 'Economía', zero: true },
  { id: 'fdi', name: 'Inversión extranjera directa (al año)', short: 'IED', icon: 'globe', v: e => e.fdi, f: v => fmt.bn(v), good: 1, group: 'Economía', zero: true, strip: false },
  { id: 'revenue', name: 'Ingresos públicos del Estado (al año)', short: 'Ingresos', icon: 'piggy-bank', v: e => e.revenue, f: v => fmt.bn(v), good: 1, group: 'Cuentas públicas', strip: false },
  { id: 'spending', name: 'Gasto público del Estado (al año)', short: 'Gasto', icon: 'landmark', v: e => e.spending, f: v => fmt.bn(v), good: 0, group: 'Cuentas públicas', strip: false },
  { id: 'balance', name: 'Superávit (+) o déficit (−), % del PIB', short: 'Saldo', icon: 'scale', v: e => -e.deficitRatio, hv: x => -x.deficitRatio, f: v => (v >= 0 ? '+' : '−') + fmt.pct(Math.abs(v), 1), good: 1, group: 'Cuentas públicas', zero: true },
  { id: 'debtRatio', name: 'Deuda pública, % del PIB', short: 'Deuda', icon: 'coins', v: e => e.debtRatio, f: pctF(0), good: -1, group: 'Cuentas públicas' },
  { id: 'spread', name: 'Prima de riesgo (puntos básicos) y calificación', short: 'Prima', icon: 'triangle-alert', v: e => V.derived.spread, hv: x => x.spread, f: v => Math.round(v) + ' pb', extra: e => e.rating, good: -1, group: 'Cuentas públicas', zero: true },
  { id: 'interestRate', name: 'Interés medio de la deuda', short: 'Interés', icon: 'percent', v: e => e.interestRate, f: pctF(2), good: -1, group: 'Cuentas públicas', strip: false },
  { id: 'housePrice', name: 'Precio medio de un piso', short: 'Vivienda', icon: 'house', v: e => e.housing ? e.housing.price.piso : 0, f: v => fmt.int(v) + ' mil €', good: 0, group: 'Economía', strip: false },
  { id: 'policyRate', name: 'Tipo de interés oficial', short: 'Tipo', icon: 'landmark', v: e => e.policyRate || 0, f: pctF(2), good: 0, group: 'Economía', strip: false },
  { id: 'built', name: 'Viviendas terminadas en el trimestre', short: 'Obra nueva', icon: 'hard-hat', v: e => e.builtQ || 0, f: v => fmt.int(v), good: 0, group: 'Economía', strip: false, zero: true },
  { id: 'population', name: 'Población', short: 'Población', icon: 'users-round', v: e => e.population, f: v => fmt.people(v), good: 0, group: 'Sociedad' },
  { id: 'immigration', name: 'Inmigración (llegadas al año)', short: 'Inmigr.', icon: 'plane-landing', v: e => e.immigration, f: v => fmt.people(v), good: 0, group: 'Sociedad', zero: true, strip: false },
  { id: 'emigration', name: 'Emigración (salidas al año)', short: 'Emigr.', icon: 'plane-takeoff', v: e => e.emigration, f: v => fmt.people(v), good: -1, group: 'Sociedad', zero: true, strip: false },
  { id: 'crime', name: 'Delincuencia (delitos por 1.000 habitantes al año)', short: 'Delitos', icon: 'siren', v: e => e.crime, f: v => fmt.num(v, 1) + ' ‰', good: -1, group: 'Sociedad' },
  { id: 'hdi', name: 'Índice de desarrollo humano (IDH)', short: 'IDH', icon: 'sparkles', v: e => e.hdi, f: v => fmt.num(v, 3), good: 1, group: 'Sociedad' },
  { id: 'lifeExp', name: 'Esperanza de vida', short: 'Esp. vida', icon: 'heart-pulse', v: e => e.lifeExp, f: v => fmt.num(v, 1) + ' años', good: 1, group: 'Sociedad', strip: false },
  { id: 'gini', name: 'Desigualdad (índice de Gini)', short: 'Gini', icon: 'scale', v: e => e.gini, f: v => fmt.num(v, 3), good: -1, group: 'Sociedad', strip: false },
  { id: 'happiness', name: 'Satisfacción ciudadana', short: 'Satisf.', icon: 'heart', v: e => e.happiness, f: v => Math.round(v) + '/100', good: 1, group: 'Sociedad', strip: false },
  { id: 'health', name: 'Calidad sanitaria', short: 'Sanidad', icon: 'stethoscope', v: e => e.health, f: v => Math.round(v) + '/100', good: 1, group: 'Servicios públicos', strip: false },
  { id: 'education', name: 'Calidad educativa', short: 'Educación', icon: 'graduation-cap', v: e => e.education, f: v => Math.round(v) + '/100', good: 1, group: 'Servicios públicos', strip: false },
  { id: 'social', name: 'Servicios sociales', short: 'Social', icon: 'heart', v: e => e.social, f: v => Math.round(v) + '/100', good: 1, group: 'Servicios públicos', strip: false },
  { id: 'transport', name: 'Transporte e infraestructuras', short: 'Transporte', icon: 'train-front', v: e => e.transport, f: v => Math.round(v) + '/100', good: 1, group: 'Servicios públicos', strip: false },
  { id: 'emissions', name: 'Emisiones (100 = inicio)', short: 'Emisiones', icon: 'leaf', v: e => e.emissions, f: v => Math.round(v), good: -1, group: 'Servicios públicos', strip: false },
  { id: 'tradeBalance', name: 'Balanza comercial (al año)', short: 'Balanza', icon: 'ship', v: e => e.tradeBalance, f: v => fmt.sbn(v), good: 1, group: 'Economía', strip: false, zero: true },
  { id: 'fervCan', name: 'Fervor cantonalista (todo el país)', short: 'Cantonalismo', icon: 'flag', v: e => e.ferv ? e.ferv.can : 0, f: v => Math.round(v * 100) + ' %', good: 0, group: 'Sociedad', strip: false },
  { id: 'fervCen', name: 'Fervor centralista (todo el país)', short: 'Centralismo', icon: 'landmark', v: e => e.ferv ? e.ferv.cen : 0, f: v => Math.round(v * 100) + ' %', good: 0, group: 'Sociedad', strip: false },
];
function indHistory(ind) {
  const H = (V.eco.history || []).filter(x => x.turn > 0 || V.eco.history.length === 1);
  return { values: H.map(x => ind.hv ? ind.hv(x) : x[ind.id]).map(v => (v == null || !isFinite(v)) ? NaN : v), labels: H.map(x => x.turn > 0 ? shortQuarter(x.turn) : 'Inicio') };
}
function indTrend(ind) {
  const { values } = indHistory(ind); const v = values.filter(isFinite);
  if (v.length < 2) return 0;
  const a = v[v.length - 1], b = v[Math.max(0, v.length - 5)];
  const d = (a - b) / (Math.abs(b) > 1e-9 ? Math.abs(b) : 1);
  return Math.abs(d) < 0.005 ? 0 : Math.sign(d);
}
function indicatorStrip() {
  if (!V || !V.eco || !V.eco.history) return null;
  const e = V.eco;
  return h('div', { class: 'ind-strip glass', role: 'button', tabindex: 0, title: 'Ver todos los indicadores con su evolución', onclick: openIndicators, onkeydown: ev => { if (ev.key === 'Enter') openIndicators(); } },
    INDICATORS.filter(i => i.strip !== false).map(ind => {
      const t = indTrend(ind), tone = !t || !ind.good ? '' : (t === ind.good ? 'good' : 'bad');
      return h('span', { class: 'ind' }, h('span', { class: 'ind-k' }, ind.short), h('b', null, ind.f(ind.v(e))), ind.extra ? h('span', { class: 'ind-x rating ' + ratingTone(ind.extra(e)) }, ind.extra(e)) : null,
        t ? h('span', { class: 'ind-t ' + tone }, t > 0 ? '▲' : '▼') : null);
    }),
    h('span', { class: 'ind more' }, icon('activity', { size: 14 }), 'Gráficos'));
}
function openIndicators() {
  const e = V.eco;
  const groups = [...new Set(INDICATORS.map(i => i.group))];
  const sel = UI.indSel || 'gdp';
  const card = ind => {
    const { values, labels } = indHistory(ind);
    return h('div', { class: 'ind-card' + (ind.id === sel ? ' on' : '') },
      h('div', { class: 'row' }, icon(ind.icon, { size: 15 }), h('b', null, ind.name), h('span', { class: 'spacer' }), h('b', { class: 'ind-big' }, ind.f(ind.v(e))), ind.extra ? h('span', { class: 'tag brass' }, ind.extra(e)) : null),
      lineChart([{ values: values.map(v => isFinite(v) ? v : 0), color: '#e0b84e' }], labels, { w: 340, h: 150, padL: 58, padR: 20, fmt: v => String(ind.f(v)).replace(' mil M€', ' mm').replace(' años', ''), zero: ind.zero }));
  };
  modal('Indicadores del país', h('div', { class: 'ind-modal' },
    h('p', { class: 'muted small' }, 'Evolución trimestre a trimestre desde el inicio de la partida («mm» = miles de millones de euros). La flecha de la barra superior compara con hace un año: verde si mejora, roja si empeora.'),
    groups.map(g => h('div', null, h('h3', null, g), h('div', { class: 'ind-grid' }, INDICATORS.filter(i => i.group === g).map(card))))), null, { wide: true });
}

function ratingTone(r) { return !r ? '' : /^A/.test(r) ? 'r-good' : r === 'BBB' ? 'r-mid' : 'r-bad'; }
