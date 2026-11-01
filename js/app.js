// ============================================================
//  ARRANQUE: portada, sala, render de la interfaz y escenas 3D
// ============================================================
'use strict';

function logoMark() {
  const svg = s('svg', { viewBox: '-1.05 -1.05 2.1 1.12', class: 'brand-mark' });
  const cols = ['#d62839', '#e8702a', '#f2c230', '#3aa655', '#2b7bd6', '#7b3fa0'];
  const rows = [[0.45, 7], [0.72, 11], [0.98, 15]];
  let k = 0, tot = 33;
  rows.forEach(([r, n]) => { for (let j = 0; j < n; j++) { const a = Math.PI - Math.PI * j / (n - 1); svg.appendChild(s('circle', { cx: r * Math.cos(a), cy: -r * Math.sin(a), r: 0.085, fill: cols[Math.floor((1 - (a / Math.PI)) * cols.length * 0.999)] })); k++; } });
  return svg;
}

// ---------- render por regiones (conserva foco y scroll) ----------
function setRegion(id, node) {
  const el = document.getElementById('hud-' + id);
  if (!el) return;
  const active = document.activeElement;
  const aid = active && el.contains(active) && active.id ? active.id : null;
  const sel = aid && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
  const scrolls = {};
  el.querySelectorAll('[data-sk]').forEach(x => scrolls[x.dataset.sk] = x.scrollTop);
  el.innerHTML = '';
  if (node) (Array.isArray(node) ? node : [node]).forEach(n => n && el.appendChild(n));
  el.querySelectorAll('[data-sk]').forEach(x => { if (scrolls[x.dataset.sk] !== undefined) x.scrollTop = scrolls[x.dataset.sk]; });
  if (aid) { const n = document.getElementById(aid); if (n) { n.focus(); if (sel && n.setSelectionRange) try { n.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
}
let lastPhaseKey = null;
function render() {
  { const ip = document.getElementById('info-pop'); if (ip && ip._a) setTimeout(() => { if (!ip._a.isConnected) hideInfoPop(); }, 0); }
  document.body.classList.toggle('in-game', !!V);
  if (!V) { renderPre(); syncScene(); return; }
  document.getElementById('pre').innerHTML = '';
  const key = V.phase + '|' + V.turn;
  if (key !== lastPhaseKey) {
    // al cambiar de fase, limpiamos estados locales que ya no aplican
    if (lastPhaseKey) { UI.viewOverride = null; UI.resultIdx = 0; if (V.phase !== 'actions') UI.side = null; }
    if (V.phase === 'news') UI.paperOutlet = Math.floor(Math.random() * 3);
    lastPhaseKey = key;
  }
  const c = phaseContent();
  setRegion('top', topBar());
  setRegion('main', c.main || null);
  setRegion('side', c.side || null);
  setRegion('bottom', bottomBar());
  renderChat();
  syncScene();
}
function renderRegion(which) {
  if (!V) return;
  const c = phaseContent();
  if (which === 'side') setRegion('side', c.side || null);
  if (which === 'main') setRegion('main', c.main || null);
}

// ---------- escena 3D según la fase ----------
function sceneForPhase(ph) {
  if (['parties', 'debate', 'ideology'].includes(ph)) return 'studio';
  if (['election', 'invDeclare', 'invVote', 'invResult', 'ministries', 'ballot', 'sessionResult'].includes(ph)) return 'chamber';
  return 'map';
}
function currentSceneName() { return V ? (UI.viewOverride || sceneForPhase(V.phase)) : 'chamber'; }
function syncScene() {
  if (S3.failed) return;
  if (!V) {
    // portada: hemiciclo decorativo
    const demo = [{ id: 'a', color: '#d62839', ideo: { eco: -1.5, soc: 0 }, logo: { shape: 'circle', icon: 'rosa' }, short: 'A' }, { id: 'b', color: '#3aa655', ideo: { eco: -0.5, soc: 0 }, logo: { shape: 'rounded', icon: 'olivo' }, short: 'B' },
      { id: 'c', color: '#f2c230', ideo: { eco: 0.2, soc: 0 }, logo: { shape: 'rays', icon: 'girasol' }, short: 'C' }, { id: 'd', color: '#2b7bd6', ideo: { eco: 1, soc: 0 }, logo: { shape: 'shield', icon: 'columna' }, short: 'D' }, { id: 'e', color: '#7b3fa0', ideo: { eco: 1.6, soc: 0 }, logo: { shape: 'wreath', icon: 'tresEstrellas' }, short: 'E' }];
    S3.show('chamber', { comp: { a: 34, b: 22, c: 28, d: 40, e: 16 }, total: 140, players: demo, board: { title: 'Hemiciclo', lines: ['Estrategia parlamentaria'] } });
    ChamberScene.labels = []; S3.labelsEl.innerHTML = '';
    ChamberScene.autoOrbit = true;
    return;
  }
  if (ChamberScene.autoOrbit) { ChamberScene.autoOrbit = false; ChamberScene.camera.position.set(0, 15.5, 23.5); ChamberScene.controls.target.set(0, 2.0, -4); }
  const name = currentSceneName();
  if (name === 'map') {
    if (!Client.map) return;
    S3.show('map', { map: Client.map, view: V, mode: UI.mapMode });
  } else if (name === 'chamber') {
    let comp = V.parliament.composition, total = V.parliament.seats, votes = null, reveal = false, board = null;
    if (V.phase === 'invResult' && V.inv.result) {
      const t = V.inv.result.tallies.find(x => x.cand === V.inv.result.winner) || V.inv.result.tallies[0];
      votes = {}; V.players.forEach(p => votes[p.id] = V.inv.result.votes[p.id][t.cand] || 'abs');
      board = { title: 'Investidura de ' + P(t.cand).candidate.name, lines: [[{ text: 'SÍ ' + t.yes, color: '#3fd07e' }, { text: 'NO ' + t.no, color: '#ff5a52' }, { text: 'ABS ' + t.abs, color: '#ffc23d' }]] };
      reveal = UI.revealKey !== 'inv' + V.turn + V.inv.round; UI.revealKey = 'inv' + V.turn + V.inv.round;
    } else if (V.phase === 'sessionResult' && V.proposals.length) {
      const pr = V.proposals[clamp(UI.resultIdx, 0, V.proposals.length - 1)];
      if (pr.scope === 'cantonal') { comp = V.cantons[pr.canton].parliament.composition; total = V.cantons[pr.canton].parliament.seats; }
      votes = pr.votes;
      board = { title: proposalTitleV(pr).slice(0, 40), lines: [[{ text: 'SÍ ' + pr.result.yes, color: '#3fd07e' }, { text: 'NO ' + pr.result.no, color: '#ff5a52' }, { text: 'ABS ' + pr.result.abs, color: '#ffc23d' }]] };
      reveal = UI.revealKey !== pr.id; UI.revealKey = pr.id;
    } else if (V.phase === 'ballot') {
      board = { title: 'Pleno del Parlamento', lines: [`${V.proposals.length} asuntos en el orden del día`] };
    } else if (V.phase === 'election') {
      const r = V.parliament.lastElection; const best = V.players.slice().sort((a, b) => (r.seats[b.id] || 0) - (r.seats[a.id] || 0))[0];
      board = { title: 'Elecciones generales', lines: [`${best.short} gana con ${r.seats[best.id]} escaños`, `Mayoría absoluta: ${absMajority(total)}`] };
    } else board = { title: 'Parlamento de ' + V.country.name, lines: [`${total} escaños · mayoría ${absMajority(total)}`] };
    S3.show('chamber', { view: V, comp, total, votes, reveal, board, players: V.players });
  } else if (name === 'studio') {
    const preview = V.phase === 'parties' && UI.partyDraft ? Object.assign({ id: V.me }, UI.partyDraft) : null;
    const d = V.derived.debateCurrent;
    S3.show('studio', { players: V.players, preview, speaker: d ? d.speaker : null, screen: d ? { title: d.blockTitle, sub: `Turno de ${P(d.speaker).candidate.name}` } : { title: V.phase === 'parties' ? 'Presentación de candidaturas' : 'Mapa ideológico', sub: 'República de ' + V.country.name } });
  }
  // barra de modos del mapa
  const tb = document.getElementById('map-modes');
  if (name === 'map') {
    tb.style.display = '';
    tb.innerHTML = '';
    Object.entries(MAP_MODES).forEach(([k, m]) => {
      const b = h('button', { type: 'button', class: UI.mapMode === k ? 'on' : '', title: m.name, onclick: () => { UI.mapMode = k; MapScene.setMode(k); syncScene(); } }, icon(m.icon, { size: 16 }), UI.mapMode === k ? h('span', null, m.name) : null);
      tb.appendChild(b);
    });
    tb.appendChild(h('button', { type: 'button', title: 'Volver a la vista general', onclick: () => MapScene.resetView() }, icon('refresh-cw', { size: 16 })));
    // niveles de zoom: países, cantones y hexágonos
    const lb = document.getElementById('map-lod');
    lb.style.display = ''; lb.innerHTML = '';
    lb.appendChild(h('span', { class: 'lod-tag' }, 'Vista'));
    Object.entries(LODS).forEach(([k, l]) => lb.appendChild(h('button', { type: 'button', class: 'lod-btn' + (MapScene.lod === k ? ' on' : ''), 'data-lod': k, title: 'Vista de ' + l.name.toLowerCase() + ' (también puedes acercar o alejar la cámara)', onclick: () => MapScene.goLod(k) }, icon(l.icon, { size: 15 }), h('span', null, l.name))));
  } else { tb.style.display = 'none'; document.getElementById('map-lod').style.display = 'none'; }
}

// ---------- chat ----------
function renderChat() {
  const el = document.getElementById('chat');
  if (!V) { el.style.display = 'none'; return; }
  el.style.display = UI.chatOpen ? '' : 'none';
  if (!UI.chatOpen) return;
  if (!el.dataset.built) {
    el.dataset.built = '1';
    el.innerHTML = '';
    const list = h('div', { class: 'chat-list', id: 'chat-list' });
    const to = h('select', { id: 'chat-to', onchange: e => UI.chatTo = e.target.value });
    const input = h('input', { type: 'text', id: 'chat-input', maxlength: 400, placeholder: 'Escribe y pulsa Intro' });
    const send = () => { const t = input.value.trim(); if (!t) return; act({ type: 'chat', text: t, to: UI.chatTo || null }, { toast: false }); input.value = ''; };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    el.append(h('div', { class: 'row' }, h('b', null, 'Chat'), h('span', { class: 'spacer' }), btn('', () => { UI.chatOpen = false; renderChat(); }, { kind: 'ghost', size: 'sm', icon: 'x' })), list,
      h('div', { class: 'row' }, to, input, btn('', send, { size: 'sm', icon: 'chevron-right', title: 'Enviar' })));
  }
  const to = document.getElementById('chat-to');
  const opts = [['', 'A todos']].concat(V.players.filter(p => p.id !== V.me).map(p => [p.id, 'Privado: ' + (p.short || p.player)]));
  if (to.options.length !== opts.length) { to.innerHTML = ''; opts.forEach(([v, l]) => to.appendChild(h('option', { value: v, selected: v === UI.chatTo }, l))); }
  const list = document.getElementById('chat-list');
  const last = V.chat.length ? V.chat[V.chat.length - 1].id : 0;
  if (list.dataset.last !== String(last)) {
    list.innerHTML = '';
    V.chat.slice(-80).forEach(m => {
      const p = P(m.from);
      list.appendChild(h('div', { class: 'msg' + (m.to ? ' dm' : '') + (m.from === V.me ? ' mine' : '') }, h('span', { class: 'who', style: { color: p.color || '#ccc' } }, (p.short || p.player) + (m.to ? ' → ' + (P(m.to).short || P(m.to).player) : '')), ' ', m.text));
    });
    list.scrollTop = list.scrollHeight;
    list.dataset.last = String(last);
  }
  UI.chatSeen = last;
}

// ---------- menú y ayuda ----------
function openMenu() {
  modal('Menú', h('div', { class: 'stack' },
    h('p', { class: 'muted' }, Client.isHost ? `Eres el anfitrión de la sala ${Host.code}. La partida se guarda en este navegador: si se corta, podrás reanudarla desde la portada y los demás volverán a entrar con el mismo código.` : `Estás conectado a la sala ${Client.code}.`),
    h('div', { class: 'btn-row' }, btn('Cómo se juega', () => { document.querySelector('.modal-back').remove(); openHelp(); }, { icon: 'info' }),
      btn('Salir a la portada', () => askConfirm(Client.isHost ? 'Si sales, la partida se detiene para todos hasta que la reanudes.' : '¿Salir de la partida? Podrás volver a entrar con el mismo código y nombre.', 'Salir', () => location.reload()), { kind: 'danger', icon: 'log-out' }))));
}
function openHelp() {
  modal('Cómo se juega', h('div', { class: 'help' },
    h('p', null, 'Cada jugador dirige un partido político desde su propio dispositivo. Gana quien cumpla primero sus tres misiones secretas; si nadie lo consigue a tiempo, gana quien haya cumplido más.'),
    h('h3', null, 'Preparación'),
    h('ul', null, h('li', null, 'Misiones secretas, con dos descartes.'), h('li', null, 'Fundación del partido: nombre, colores, logotipo y candidato con su cara.'),
      h('li', null, 'Debate inaugural: en cada pregunta hay tres respuestas; quien habla después solo puede elegir entre las que quedan. Las respuestas fijan tu ideología en cinco ejes.'),
      h('li', null, 'Elecciones fundacionales, investidura y gobiernos cantonales.')),
    h('h3', null, 'Cada trimestre'),
    h('ul', null, h('li', null, 'La prensa resume lo que ha pasado. Dos periódicos con línea editorial opuesta cuentan los mismos hechos a su manera.'),
      h('li', null, 'Acciones: todos a la vez. Propones leyes marco (puedes cambiar varios apartados de una misma ley), haces campaña, encargas encuestas, usas tus ministerios… o las cloacas.'),
      h('li', null, 'Pleno: votas todas las propuestas. Cada grupo vota con todos sus escaños. Leyes ordinarias: más síes que noes. Orgánicas: mayoría absoluta. Decretos: valen salvo que los tumbe la mayoría absoluta.'),
      h('li', null, 'La economía reacciona: empleo, inversión, deuda, comercio, servicios públicos y población. Cada pocos años hay elecciones.')),
    h('h3', null, 'Tu ideología se mueve'),
    h('p', null, 'Lo que votas va cambiando cómo te ve la ciudadanía. Un voto suelto apenas cuenta, pero si votas una y otra vez leyes de otra corriente, tu partido acabará cambiando de etiqueta.'),
    h('h3', null, 'Corrupción'),
    h('p', null, 'Las acciones turbias dan dinero o votos, pero dejan pruebas que pueden estallar en un escándalo: multa, caída de popularidad e imputación.'),
    h('h3', null, 'Controles del mapa'),
    h('p', null, 'Arrastra para moverte, rueda para acercarte, botón derecho (o dos dedos) para girar. El mapa tiene tres vistas según lo cerca que estés: de lejos, los países (tócalos para ver sus datos); a media distancia, los cantones (tócalos para ver los suyos); y muy de cerca, el terreno: cada casilla es un terreno (hierba, arena, roca, asfalto o mar) y puede tener ríos, bosques, ciudades, minas… También puedes cambiar de vista con los botones «Vista» de abajo.')), null, { wide: true });
}

// ---------- tooltip del mapa ----------
function mapTooltip(hov) {
  const el = document.getElementById('tooltip');
  if (!hov || !V) { el.style.display = 'none'; return; }
  let html = '';
  const fOf = mi => V.foreign.find(x => x.mapIndex === mi);
  if (hov.type === 'country') {
    if (hov.mapIndex === 0) html = `<span class="tt-tag">Nuestro país</span><br><b>${V.country.name}</b><br>${V.cantons.filter(c => !c.merged).length} cantones · ${fmt.people(sum(V.cantons, c => c.pop))} hab.`;
    else { const f = fOf(hov.mapIndex); if (f) { const gp = f.parties && f.gov ? f.parties.find(p => p.id === f.gov.party) : null; html = `<span class="tt-tag">País extranjero</span><br><b>${f.name}</b><br>${f.regime}${gp ? '<br>Gobierna ' + gp.name : ''}`; } }
  } else if (hov.type === 'canton') { const c = V.cantons[hov.idx]; const g = P(c.gov.president); html = `<b>${c.name}</b><br>Paro ${fmt.pct(c.stats.unemployment, 1)} · ${fmt.people(c.pop)} hab.${g ? '<br>Gobierna ' + g.short : ''}`; }
  else if (hov.type === 'sea') html = waterLine(hov.hex);
  else if (hov.type === 'hex') {
    const hx = hov.hex, T = TERRAIN3D[hx.t];
    const feats = (hx.f || []).map(k => HEX_FEATURES[k] ? HEX_FEATURES[k].name : k);
    const where = hx.t === 'mar' ? waterLine(hx) : hexPlace(hx);
    html = `<b>${T.name}</b>${hx.rel ? ' · ' + RELIEF3D[hx.rel].name.toLowerCase() : ''}${feats.length ? '<br>' + feats.join(', ') : ''}${hx.cn && (hx.f || []).some(k => k === 'pueblo' || k === 'ciudad' || k === 'capital') ? '<br><b>' + hx.cn + '</b>' : ''}<br><span class="muted">${where}</span>`;
  } else {
    const f = fOf(hov.mapIndex);
    if (f) {
      const fc = hov.k >= 0 && f.cantons && f.cantons[hov.k] && !f.cantons[hov.k].nominal ? f.cantons[hov.k] : null;
      const gp = f.parties && f.gov ? f.parties.find(p => p.id === (fc ? fc.gov : f.gov.party)) : null;
      html = `<span class="tt-tag">País extranjero</span><br><b>${fc ? fc.name + ' · ' : ''}${f.name}</b><br>${gp ? 'Gobierna ' + gp.name + ' (' + gp.short + ')' : ''}<br>Crece ${fmt.pct(f.growth, 1)} · paro ${fmt.pct(f.unemployment, 1)}`;
    }
  }
  el.innerHTML = html; el.style.display = html ? '' : 'none';
}
// A quién pertenecen unas aguas
function waterLine(hx) {
  const name = i => i === 0 ? V.country.name : (V.foreign.find(f => f.mapIndex === i) || {}).name || '?';
  if (hx.dz) return `Aguas en disputa entre ${name(hx.dz[0])} y ${name(hx.dz[1])}`;
  if (hx.w >= 0) return `Aguas territoriales de ${name(hx.w)}`;
  return 'Aguas internacionales';
}
// Cantón y país de un hexágono de tierra
function hexPlace(hx) {
  if (hx.c === 0) return `${V.cantons[hx.k].name} · ${V.country.name}`;
  const f = V.foreign.find(x => x.mapIndex === hx.c); if (!f) return '';
  const fc = hx.k >= 0 && f.cantons && f.cantons[hx.k] && !f.cantons[hx.k].nominal ? f.cantons[hx.k] : null;
  return (fc ? fc.name + ' · ' : '') + f.name;
}
document.addEventListener('pointermove', e => { const el = document.getElementById('tooltip'); if (el) { el.style.left = (e.clientX + 14) + 'px'; el.style.top = (e.clientY + 14) + 'px'; } });

// ============================================================
//  PORTADA Y SALA DE ESPERA
// ============================================================
function renderPre() {
  const el = document.getElementById('pre');
  ['top', 'main', 'side', 'bottom'].forEach(r => setRegion(r, null));
  el.innerHTML = '';
  el.appendChild(UI.screen === 'lobby' ? lobbyScreen() : titleScreen());
}
function titleScreen() {
  if (!UI.name) { try { UI.name = localStorage.getItem('hemiciclo-nombre') || ''; } catch (e) { } }
  if (!UI.joinCode && !UI.codeTried) {
    UI.codeTried = true;
    const fromUrl = (URLP.get('sala') || '').toUpperCase();
    let last = null; try { last = JSON.parse(localStorage.getItem('hemiciclo-ultima-sala') || 'null'); } catch (e) { }
    if (fromUrl) UI.joinCode = fromUrl;
    else if (last && Date.now() - last.t < 24 * 3600e3) { UI.joinCode = last.code; UI.lastRoom = last; if (last.mode) UI.mode = last.mode; }
  }
  const saved = savedSummary();
  const setName = v => { UI.name = v; try { localStorage.setItem('hemiciclo-nombre', v); } catch (e) { } };
  const need = () => { if (!UI.name.trim()) { toast('Escribe tu nombre primero.', 'bad'); document.getElementById('nm').focus(); return false; } return true; };
  return h('div', { class: 'title-wrap' }, h('div', { class: 'title-card glass' },
    h('div', { class: 'title-word' }, 'Hemiciclo'),
    h('p', { class: 'title-sub' }, 'Funda tu partido, gana el debate, forma gobierno y cumple tu agenda secreta. De 3 a 7 jugadores, cada uno desde su casa.'),
    UI.error ? h('div', { class: 'notice bad' }, UI.error) : null,
    h('div', { class: 'field' }, h('label', { for: 'nm' }, 'Tu nombre'), h('input', { id: 'nm', type: 'text', maxlength: 24, value: UI.name, placeholder: 'Cómo te verán los demás', oninput: e => setName(e.target.value) })),
    h('div', { class: 'field' }, h('label', null, 'Conexión'), h('div', { class: 'seg' },
      h('button', { type: 'button', class: UI.mode === 'online' ? 'on' : '', onclick: () => { UI.mode = 'online'; render(); } }, icon('wifi', { size: 16 }), 'En línea'),
      h('button', { type: 'button', class: UI.mode === 'local' ? 'on' : '', onclick: () => { UI.mode = 'local'; render(); } }, icon('layers', { size: 16 }), 'Pestañas de este navegador')),
      h('small', { class: 'muted' }, UI.mode === 'online' ? 'Cada jugador en su casa. Hace falta internet.' : 'Para probar solo: abre varias pestañas y únete con el mismo código.')),
    h('div', { class: 'title-actions' },
      h('div', { class: 'col' }, h('h3', null, 'Crear una sala'), h('p', { class: 'muted small' }, 'Serás el anfitrión: la partida se calcula en tu ordenador.'),
        btn('Crear sala', () => { if (need()) startHosting(); }, { kind: 'primary', icon: 'crown' })),
      h('div', { class: 'col' }, h('h3', null, 'Unirse a una sala'), h('div', { class: 'row' }, h('input', { id: 'code', type: 'text', maxlength: 5, value: UI.joinCode, placeholder: 'CÓDIGO', style: { width: '8em', textTransform: 'uppercase', letterSpacing: '0.2em' }, oninput: e => UI.joinCode = e.target.value.toUpperCase() }),
        btn('Unirse', () => { if (need() && UI.joinCode.length >= 4) startJoining(); else if (UI.joinCode.length < 4) toast('Escribe el código de la sala.', 'bad'); }, { kind: 'primary', icon: 'door-open' })))),
    saved ? h('div', { class: 'resume' }, icon('refresh-cw', { size: 16 }), h('span', null, `Partida guardada en ${saved.country} (sala ${saved.code}, trimestre ${saved.turn}, con ${saved.players.join(', ')}).`),
      btn('Reanudar como anfitrión', () => resumeHosting(), { size: 'sm' })) : null,
    UI.lastRoom && UI.joinCode === UI.lastRoom.code ? h('p', { class: 'muted small' }, `Hemos rellenado el código de tu última sala (${UI.lastRoom.code}). Entra con el mismo nombre para recuperar tu partido.`) : null,
    h('div', { class: 'btn-row' }, btn('Cómo se juega', openHelp, { kind: 'ghost', icon: 'info' }))));
}
function startHosting() {
  UI.error = null;
  const code = randomCode();
  Client.isHost = true;
  Host.start(UI.mode, code, UI.name.trim(), () => { UI.screen = 'lobby'; render(); }, msg => { UI.error = msg; UI.screen = 'title'; render(); });
  UI.screen = 'lobby'; render();
}
function resumeHosting() {
  const g = loadSaved();
  if (!g) { toast('No se pudo cargar la partida guardada.', 'bad'); return; }
  Client.isHost = true;
  Host.resume(UI.mode, g, () => { toast(`Sala ${g.code} abierta de nuevo. Los demás pueden volver a entrar con ese código.`, 'good'); }, msg => { UI.error = msg; render(); });
}
function startJoining() {
  UI.error = null;
  Client.isHost = false;
  UI.screen = 'lobby';
  try { localStorage.setItem('hemiciclo-ultima-sala', JSON.stringify({ code: UI.joinCode.trim().toUpperCase(), mode: UI.mode, t: Date.now() })); } catch (e) { }
  Client.join(UI.mode, UI.joinCode.trim().toUpperCase(), UI.name.trim(), {
    open: () => render(),
    status: st => { if (st === 'reconnecting') toast('Conexión perdida con el anfitrión. Reintentando…', 'bad'); render(); },
    error: msg => { UI.error = msg; render(); },
    kick: msg => { UI.error = msg; UI.screen = 'title'; Client.transport && Client.transport.destroy(); render(); },
  });
  render();
}
function lobbyScreen() {
  const lb = Client.lobby;
  const isHost = Client.isHost;
  const code = isHost ? Host.code : Client.code;
  const n = lb ? lb.players.length : 0;
  const cfg = isHost ? Host.lobby.config : (lb ? lb.config : {});
  const seg = (vals, cur, set, lbl) => h('div', { class: 'seg' }, vals.map(v => h('button', { type: 'button', class: v === cur ? 'on' : '', disabled: !isHost, onclick: () => { set(v); Host.setConfig({}); render(); } }, lbl ? lbl(v) : String(v))));
  const minPlayers = DEV ? 1 : 3;
  return h('div', { class: 'title-wrap' }, h('div', { class: 'title-card glass lobby' },
    h('div', { class: 'row' }, h('h1', null, 'Sala de espera'), h('span', { class: 'spacer' }), btn('Salir', () => location.reload(), { kind: 'ghost', size: 'sm', icon: 'log-out' })),
    UI.error ? h('div', { class: 'notice bad' }, UI.error) : null,
    h('div', { class: 'code-box' }, h('span', { class: 'muted' }, 'Código de la sala'), h('div', { class: 'code' }, code || '·····'),
      code ? h('div', { class: 'btn-row' }, btn('Copiar código', () => { try { navigator.clipboard.writeText(code); toast('Código copiado.', 'good'); } catch (e) { } }, { size: 'sm', icon: 'copy' }),
        isHost && UI.mode === 'online' && /^https?:/.test(location.protocol) ? btn('Copiar enlace de invitación', () => { try { navigator.clipboard.writeText(location.origin + location.pathname + '?sala=' + code); toast('Enlace copiado: quien lo abra tendrá el código ya puesto.', 'good'); } catch (e) { } }, { size: 'sm', icon: 'link' }) : null) : null,
      h('p', { class: 'muted small' }, isHost ? 'Pásales este código a los demás jugadores para que se unan desde su dispositivo.' : (lb ? 'Conectado. Esperando a que el anfitrión empiece.' : 'Conectando con el anfitrión…'))),
    h('h3', null, `Jugadores (${n}/7)`),
    h('div', { class: 'stack' }, (lb ? lb.players : []).map((p, i) => h('div', { class: 'lobby-player' }, icon(p.host ? 'crown' : 'user', { size: 18 }), h('b', null, p.name), p.host ? h('span', { class: 'tag brass' }, 'Anfitrión') : null,
      h('span', { class: 'spacer' }), isHost && !p.host ? btn('', () => Host.kick(i), { kind: 'ghost', size: 'sm', icon: 'x', title: 'Sacar de la sala' }) : null))),
    h('h3', null, 'Partida'),
    h('div', { class: 'stack' },
      h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'Duración máxima'), seg([4, 6, 8], cfg.years, v => cfg.years = v, v => v + ' años')),
      h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'Cantones'), seg([0, 3, 4, 5, 6], cfg.nCantons, v => cfg.nCantons = v, v => v ? String(v) : 'Al azar')),
      h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'Países'), seg([0, 4, 5, 6, 7], cfg.nCountries, v => cfg.nCountries = v, v => v ? String(v) : 'Al azar')),
      isHost ? h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'Semilla'), h('input', { type: 'text', id: 'seed', value: cfg.seed || '', placeholder: 'Opcional', style: { width: '10em' }, oninput: e => { cfg.seed = e.target.value; } })) : null),
    isHost ? h('div', { class: 'btn-row' }, btn(n < minPlayers ? `Faltan jugadores (mínimo ${minPlayers})` : 'Empezar la partida', () => { Host.startGame(); }, { kind: 'primary', icon: 'play', disabled: n < minPlayers })) : null));
}

// ============================================================
//  INICIO
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  const ok = S3.init(document.getElementById('scene'), document.getElementById('labels'));
  if (!ok) document.body.classList.add('no-webgl');
  MapScene.onSelect = sel => { UI.side = sel; if (V) renderRegion('side'); };
  MapScene.onHover = mapTooltip;
  MapScene.onLod = lod => { document.querySelectorAll('#map-lod .lod-btn').forEach(b => b.classList.toggle('on', b.dataset.lod === lod)); mapTooltip(null); };
  Client.on(kind => {
    if (kind === 'view') { V = Client.view; render(); }
    else if (kind === 'lobby' && !V) render();
    else if (kind === 'static' && V) syncScene();
  });
  render();
});
window.addEventListener('error', e => { console.error(e.error || e.message); });
