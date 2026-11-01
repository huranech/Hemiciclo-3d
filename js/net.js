// ============================================================
//  RED: sala con código, anfitrión autoritativo y jugadores remotos.
//  Transporte en línea: PeerJS (WebRTC, navegador a navegador).
//  Transporte local: BroadcastChannel (varias pestañas del mismo navegador).
// ============================================================
'use strict';

const PEER_PREFIX = 'hemiciclo-v37-';
const URLP = new URLSearchParams(location.search);
const DEV = URLP.get('dev') === '1';

function randomToken() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function randomCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function myToken() {
  try {
    let t = sessionStorage.getItem('hemiciclo-token');
    if (!t) { t = randomToken(); sessionStorage.setItem('hemiciclo-token', t); }
    return t;
  } catch (e) { return (window.__tok = window.__tok || randomToken()); }
}
// El anfitrión puede asignarnos otra identidad (p. ej. si esta ventana es copia de otra)
function setMyToken(t) {
  window.__tok = t;
  try { sessionStorage.setItem('hemiciclo-token', t); } catch (e) { }
}
function peerOptions() {
  const o = { debug: 1 };
  if (URLP.get('peerhost')) {
    o.host = URLP.get('peerhost'); o.port = +(URLP.get('peerport') || 9000); o.path = URLP.get('peerpath') || '/'; o.secure = URLP.get('peersecure') === '1';
  }
  return o;
}

// ---------- Transportes ----------
// Interfaz común: host: start(code, onConn) ; client: connect(code, onMsg, onOpen, onClose) ; conexión: {id, send(obj), close()}
const Transports = {
  online: {
    host(code, h) {
      if (typeof Peer === 'undefined') { h.error('No se ha podido cargar la librería de red.'); return; }
      const peer = new Peer(PEER_PREFIX + code, peerOptions());
      peer.on('open', () => h.open());
      peer.on('error', err => h.error(err.type === 'unavailable-id' ? 'Ese código de sala ya está en uso.' : err.type === 'network' || err.type === 'server-error' ? 'No hay conexión con el servidor de salas. Revisa tu conexión a internet.' : 'Error de red: ' + err.type));
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
      peer.on('connection', conn => {
        const c = { id: conn.connectionId || randomToken(), send: m => { try { conn.send(m); } catch (e) { } }, close: () => conn.close() };
        conn.on('open', () => h.conn(c));
        conn.on('data', m => h.msg(c, m));
        conn.on('close', () => h.close(c));
        conn.on('error', () => h.close(c));
      });
      return { destroy: () => peer.destroy() };
    },
    client(code, h) {
      if (typeof Peer === 'undefined') { h.error('No se ha podido cargar la librería de red.'); return; }
      const peer = new Peer(undefined, peerOptions());
      let conn = null, closed = false;
      const connect = () => {
        conn = peer.connect(PEER_PREFIX + code, { reliable: true });
        conn.on('open', () => h.open({ send: m => { try { conn.send(m); } catch (e) { } } }));
        conn.on('data', m => h.msg(m));
        conn.on('close', () => { if (!closed) { h.close(); setTimeout(() => { if (!closed) connect(); }, 2500); } });
      };
      peer.on('open', connect);
      peer.on('error', err => {
        if (err.type === 'peer-unavailable') { h.error('No existe ninguna sala con ese código (o el anfitrión aún no la ha abierto).'); setTimeout(() => { if (!closed) connect(); }, 4000); }
        else if (err.type === 'network' || err.type === 'server-error') h.error('No hay conexión con el servidor de salas.');
      });
      return { destroy: () => { closed = true; peer.destroy(); } };
    },
  },
  local: {
    host(code, h) {
      const bc = new BroadcastChannel('hemiciclo-' + code);
      const conns = {};
      bc.onmessage = ev => {
        const { from, to, data } = ev.data || {};
        if (to !== 'host') return;
        if (!conns[from]) { conns[from] = { id: from, send: m => bc.postMessage({ from: 'host', to: from, data: m }), close: () => { } }; h.conn(conns[from]); }
        if (data && data.t === 'bye') { h.close(conns[from]); delete conns[from]; return; }
        h.msg(conns[from], data);
      };
      setTimeout(() => h.open(), 10);
      window.addEventListener('beforeunload', () => bc.postMessage({ from: 'host', to: '*', data: { t: 'hostgone' } }));
      return { destroy: () => bc.close() };
    },
    client(code, h) {
      const bc = new BroadcastChannel('hemiciclo-' + code);
      const id = randomToken();
      let opened = false;
      bc.onmessage = ev => {
        const { to, data } = ev.data || {};
        if (to !== id && to !== '*') return;
        if (data && data.t === 'hostgone') { h.close(); return; }
        h.msg(data);
      };
      const link = { send: m => bc.postMessage({ from: id, to: 'host', data: m }) };
      setTimeout(() => { opened = true; h.open(link); }, 10);
      window.addEventListener('beforeunload', () => link.send({ t: 'bye' }));
      return { destroy: () => bc.close() };
    },
  },
};

// ============================================================
//  Lado del anfitrión
// ============================================================
const Host = {
  active: false, code: null, mode: 'online', lobby: null, conns: {}, connPid: {}, transport: null, timer: null, myPid: null,
  start(mode, code, hostName, onReady, onError) {
    this.active = true; this.mode = mode; this.code = code;
    this.lobby = { code, started: false, config: { years: 6, nCantons: 0, nCountries: 0, seed: '' }, players: [{ name: hostName, token: myToken(), online: true, host: true }] };
    this.transport = Transports[mode].host(code, {
      open: () => onReady && onReady(),
      error: msg => onError && onError(msg),
      conn: c => { this.conns[c.id] = c; },
      msg: (c, m) => this.receive(c, m),
      close: c => this.disconnect(c),
    });
    this.scheduleBroadcast();
  },
  resume(mode, g, onReady, onError) {
    G = g; RNG.state = g.rngState || 1;
    G.players.forEach((p, i) => p.online = i === 0);
    G.players[0].token = myToken();
    this.active = true; this.mode = mode; this.code = g.code;
    this.lobby = { code: g.code, started: true, config: {}, players: [] };
    this.myPid = G.players[0].id;
    this.transport = Transports[mode].host(g.code, {
      open: () => { onReady && onReady(); this.broadcast(); },
      error: msg => onError && onError(msg),
      conn: c => { this.conns[c.id] = c; },
      msg: (c, m) => this.receive(c, m),
      close: c => this.disconnect(c),
    });
  },
  receive(c, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') return this.hello(c, m);
    if (m.t === 'act') {
      const pid = this.connPid[c.id];
      let r;
      if (!this.lobby.started) r = this.lobbyAction(c, m.a);
      else if (!pid) r = { ok: false, msg: 'No estás en esta partida.' };
      else { try { r = hostHandleAction(pid, m.a); } catch (e) { console.error(e); r = { ok: false, msg: 'Error interno: ' + e.message }; } }
      c.send({ t: 'res', id: m.id, r: r || { ok: true } });
      this.scheduleBroadcast();
    }
  },
  hello(c, m) {
    const name = String(m.name || 'Jugador').slice(0, 24).trim() || 'Jugador';
    if (!this.lobby.started) {
      let pl = this.lobby.players.find(p => p.token === m.token);
      // Ventana duplicada: el token ya es del anfitrión o de otra conexión viva → identidad nueva
      if (pl && (pl.host || (pl.conn && pl.conn !== c.id && this.conns[pl.conn]))) {
        m.token = randomToken(); pl = null;
        c.send({ t: 'token', token: m.token });
      }
      if (!pl) {
        if (this.lobby.players.length >= 7) { c.send({ t: 'kick', msg: 'La sala está llena (máximo 7 jugadores).' }); return; }
        pl = { name, token: m.token, online: true };
        this.lobby.players.push(pl);
      }
      pl.online = true; pl.name = name; pl.conn = c.id;
      this.connPid[c.id] = m.token;
      c.send({ t: 'welcome', lobby: this.lobbyView() });
      this.scheduleBroadcast();
      return;
    }
    // partida empezada: reconexión por token o por nombre de un jugador desconectado
    let p = G.players.find(x => x.token === m.token && x.idx !== 0);
    if (!p) p = G.players.find(x => !x.online && x.player.toLowerCase() === name.toLowerCase());
    if (!p || p.idx === 0) { c.send({ t: 'kick', msg: 'La partida ya ha empezado y no hay ningún hueco libre con ese nombre.' }); return; }
    p.token = m.token; p.online = true;
    this.connPid[c.id] = p.id;
    c.send({ t: 'welcome', pid: p.id, started: true });
    c.send({ t: 'static', map: G.map });
    logEvent(G, { kind: 'reconexion', importance: 0, party: p.id });
    this.scheduleBroadcast();
  },
  disconnect(c) {
    const key = this.connPid[c.id];
    delete this.conns[c.id]; delete this.connPid[c.id];
    if (!this.lobby.started) {
      const pl = this.lobby.players.find(p => p.token === key);
      if (pl) this.lobby.players = this.lobby.players.filter(p => p !== pl);
    } else {
      const p = G.players.find(x => x.id === key);
      if (p) { p.online = false; checkAdvance(); }
    }
    this.scheduleBroadcast();
  },
  lobbyAction(c, a) {
    return { ok: false, msg: 'Espera a que el anfitrión empiece la partida.' };
  },
  lobbyView() {
    return { code: this.lobby.code, started: this.lobby.started, config: this.lobby.config, players: this.lobby.players.map(p => ({ name: p.name, online: p.online, host: !!p.host })) };
  },
  // Acciones del propio anfitrión
  act(a) {
    let r;
    if (!this.lobby.started) r = { ok: false, msg: 'La partida no ha empezado.' };
    else { try { r = hostHandleAction(this.myPid, a); } catch (e) { console.error(e); r = { ok: false, msg: 'Error interno: ' + e.message }; } }
    this.scheduleBroadcast();
    return Promise.resolve(r || { ok: true });
  },
  setConfig(cfg) { Object.assign(this.lobby.config, cfg); this.scheduleBroadcast(); },
  kick(index) {
    const pl = this.lobby.players[index];
    if (!pl || pl.host) return;
    const conn = Object.values(this.conns).find(c => c.id === pl.conn);
    if (conn) conn.send({ t: 'kick', msg: 'El anfitrión te ha sacado de la sala.' });
    this.lobby.players.splice(index, 1);
    this.scheduleBroadcast();
  },
  startGame() {
    const players = this.lobby.players.map(p => ({ name: p.name, token: p.token }));
    const cfg = this.lobby.config;
    hostNewGame({ code: this.code, years: cfg.years, nCantons: cfg.nCantons || null, nCountries: cfg.nCountries || null, seed: parseInt(cfg.seed, 10) || null }, players);
    this.lobby.started = true;
    this.myPid = G.players[0].id;
    // vincular conexiones con partidos
    for (const cid in this.connPid) {
      const tok = this.connPid[cid];
      const p = G.players.find(x => x.token === tok);
      if (p) { this.connPid[cid] = p.id; this.conns[cid].send({ t: 'welcome', pid: p.id, started: true }); this.conns[cid].send({ t: 'static', map: G.map }); }
    }
    G.players.forEach(p => p.online = p.idx === 0 || Object.values(this.connPid).includes(p.id));
    this.scheduleBroadcast();
  },
  scheduleBroadcast() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.broadcast(); }, 40);
  },
  broadcast() {
    if (!this.lobby.started) {
      const lv = this.lobbyView();
      for (const cid in this.conns) this.conns[cid].send({ t: 'lobby', lobby: lv });
      Client.onLobby(lv, true);
      return;
    }
    // el mapa cambia si se fusionan cantones: primero la vista nueva y luego el mapa
    if (this.mapVerSent === undefined) this.mapVerSent = G.mapVer || 0;
    const mapChanged = (G.mapVer || 0) !== this.mapVerSent;
    this.mapVerSent = G.mapVer || 0;
    for (const cid in this.conns) {
      const pid = this.connPid[cid];
      if (pid && G.players.some(p => p.id === pid)) { this.conns[cid].send({ t: 'view', v: viewFor(pid) }); if (mapChanged) this.conns[cid].send({ t: 'static', map: G.map }); }
    }
    Client.onView(viewFor(this.myPid));
    Client.onStatic(G.map);
  },
};

// ============================================================
//  Lado del jugador (también lo usa el anfitrión para su propia pantalla)
// ============================================================
const Client = {
  isHost: false, link: null, transport: null, pending: {}, reqId: 1, code: null, name: null, status: 'idle',
  view: null, map: null, lobby: null, listeners: [],
  join(mode, code, name, cbs) {
    this.isHost = false; this.code = code; this.name = name; this.status = 'connecting';
    this.transport = Transports[mode].client(code, {
      open: link => { this.link = link; this.status = 'connected'; link.send({ t: 'hello', token: myToken(), name }); cbs.open && cbs.open(); },
      msg: m => this.receive(m, cbs),
      close: () => { this.status = 'reconnecting'; cbs.status && cbs.status('reconnecting'); },
      error: msg => { cbs.error && cbs.error(msg); },
    });
  },
  receive(m, cbs) {
    if (!m) return;
    if (m.t === 'token') setMyToken(m.token);
    else if (m.t === 'welcome') { if (m.lobby) this.onLobby(m.lobby); this.status = 'in'; cbs.status && cbs.status('in'); }
    else if (m.t === 'lobby') this.onLobby(m.lobby);
    else if (m.t === 'static') this.onStatic(m.map);
    else if (m.t === 'view') this.onView(m.v);
    else if (m.t === 'res') { const f = this.pending[m.id]; if (f) { delete this.pending[m.id]; f(m.r); } }
    else if (m.t === 'kick') { cbs.kick && cbs.kick(m.msg); }
  },
  act(a) {
    if (this.isHost) return Host.act(a);
    return new Promise(resolve => {
      const id = this.reqId++;
      this.pending[id] = resolve;
      if (!this.link) { resolve({ ok: false, msg: 'Sin conexión con el anfitrión.' }); return; }
      this.link.send({ t: 'act', id, a });
      setTimeout(() => { if (this.pending[id]) { delete this.pending[id]; resolve({ ok: false, msg: 'El anfitrión no responde.' }); } }, 15000);
    });
  },
  onLobby(lv) { this.lobby = lv; this.emit('lobby'); },
  onStatic(map) { if (!this.map || this.map !== map) { this.map = map; this.emit('static'); } },
  onView(v) {
    const prev = this.view;
    this.view = v;
    // guardamos los periódicos de trimestres anteriores en el navegador
    if (v.paper) { this.papers = this.papers || {}; this.papers[v.paper.turn] = v.paper; }
    this.emit('view', prev);
  },
  on(fn) { this.listeners.push(fn); },
  emit(kind, data) { this.listeners.forEach(fn => { try { fn(kind, data); } catch (e) { console.error(e); } }); },
};
