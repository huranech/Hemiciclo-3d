// ============================================================
//  ESCENA 3D: HEMICICLO
// ============================================================
'use strict';

const ChamberScene = {
  scene: null, camera: null, controls: null, labels: [], seats: [], total: 0, seatOwner: [], votes: null, revealT: 1,
  build() {
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color('#120f14');
    sc.fog = new THREE.Fog('#120f14', 30, 70);
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
    this.camera.position.set(0, 15.5, 23.5);
    const ctl = this.controls = new THREE.OrbitControls(this.camera, S3.canvas);
    ctl.target.set(0, 2.0, -4); ctl.enableDamping = true; ctl.enablePan = false;
    ctl.minDistance = 10; ctl.maxDistance = 40; ctl.maxPolarAngle = 1.35; ctl.minPolarAngle = 0.35;
    ctl.minAzimuthAngle = -1.1; ctl.maxAzimuthAngle = 1.1;
    sc.add(new THREE.HemisphereLight('#ffe9d0', '#2a1d18', 0.8));
    const key = new THREE.SpotLight('#fff3e0', 900, 80, 0.75, 0.5, 1.6);
    key.position.set(0, 26, 10); key.target.position.set(0, 0, -4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    sc.add(key, key.target);
    const fill = new THREE.PointLight('#9fb6ff', 120, 50); fill.position.set(-14, 8, 6); sc.add(fill);
    // suelo y moqueta
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), std('#3a2418', { roughness: 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    const carpet = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48, Math.PI, Math.PI), std('#7a1e24', { roughness: 0.95 }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.y = 0.01; carpet.position.z = -0.2; sc.add(carpet);
    // muro curvo con columnas
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 11, 64, 1, true, Math.PI / 2 + 0.05, Math.PI - 0.1), std('#e8dcc4', { side: THREE.BackSide, roughness: 0.9 }));
    wall.position.set(0, 5.5, -1); wall.receiveShadow = true; sc.add(wall);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * i / 12;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 11, 16), std('#f3ead8'));
      col.position.set(Math.cos(a) * 18.4, 5.5, -1 - Math.sin(a) * 18.4); col.castShadow = true; sc.add(col);
    }
    const cornice = new THREE.Mesh(new THREE.TorusGeometry(18.6, 0.35, 8, 64, Math.PI), std('#c9a24a', { metalness: 0.6, roughness: 0.35 }));
    cornice.rotation.x = -Math.PI / 2; cornice.position.set(0, 11, -1); sc.add(cornice);
    // tribuna de oradores y mesa de la presidencia
    const dais = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.85, 1.7), std('#4b2e1f', { roughness: 0.5 }));
    dais.position.set(0, 0.425, 3.7); dais.castShadow = true; dais.receiveShadow = true; sc.add(dais);
    const lectern = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 0.8), std('#5a3624', { roughness: 0.45 }));
    lectern.position.set(0, 0.65, 1.8); lectern.castShadow = true; sc.add(lectern);
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), std('#c9a24a', { metalness: 0.7, roughness: 0.3 }));
    crest.position.set(0, 0.85, 2.21); sc.add(crest);
    // marcador
    this.boardTex = canvasTexture(1024, 384, (g, w, h) => { g.fillStyle = '#0b0d14'; g.fillRect(0, 0, w, h); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.375), new THREE.MeshBasicMaterial({ map: this.boardTex }));
    board.position.set(0, 6.1, -17.3); sc.add(board);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.8, 0.2), std('#1c1c22', { metalness: 0.5 }));
    frame.position.set(0, 6.1, -17.45); sc.add(frame);
    this.board = board;
    this.seatGroup = new THREE.Group(); sc.add(this.seatGroup);
    this.setBoard('Parlamento', ['']);
  },
  enter(params) { this.refresh(params); },
  refresh(params) {
    if (!params) return;
    if (params.view) this.view = params.view;
    const comp = params.comp || (this.view && this.view.parliament.composition) || {};
    const total = params.total || (this.view && this.view.parliament.seats) || 120;
    const key = JSON.stringify(comp) + total + (this.view ? this.view.players.map(p => p.color + seatKey(p).toFixed(1)).join() : '');
    if (key !== this.compKey) { this.compKey = key; this.buildSeats(comp, total, params.players || (this.view && this.view.players) || []); }
    this.setVotes(params.votes || null, params.reveal);
    if (params.board) this.setBoard(params.board.title, params.board.lines || [], params.board.color);
  },
  // Disposición de escaños en gradas
  layout(n) {
    let best = null;
    for (let rows = 4; rows <= 12; rows++) {
      const radii = range(rows).map(i => 5.6 + i * 1.05);
      const rs = sum(radii);
      const counts = radii.map(r => Math.max(1, Math.round(n * r / rs)));
      let diff = n - sum(counts), k = rows - 1;
      while (diff !== 0) { if (counts[k] + Math.sign(diff) >= 1) { counts[k] += Math.sign(diff); diff -= Math.sign(diff); } k = (k - 1 + rows) % rows; }
      const gap = Math.min(...radii.map((r, i) => Math.PI * r / Math.max(1, counts[i] - 1)));
      if (gap >= 0.62 || rows === 12) { best = { radii, counts }; break; }
    }
    const pts = [];
    best.radii.forEach((r, i) => {
      const c = best.counts[i];
      for (let j = 0; j < c; j++) {
        const a = c === 1 ? Math.PI / 2 : Math.PI - Math.PI * j / (c - 1);
        pts.push({ x: Math.cos(a) * r, z: -Math.sin(a) * r - 0.2, y: 0.25 + i * 0.42, a, row: i });
      }
    });
    pts.sort((p, q) => q.a - p.a || p.row - q.row);
    return pts;
  },
  buildSeats(comp, total, players) {
    this.seatGroup.clear(); this.labels = []; S3.labelsEl.innerHTML = '';
    const pts = this.layout(total);
    const parties = players.filter(p => (comp[p.id] || 0) > 0).sort((a, b) => seatKey(a) - seatKey(b));
    const owner = [];
    parties.forEach(p => { for (let i = 0; i < comp[p.id]; i++) owner.push(p); });
    this.seatOwner = owner; this.total = total; this.pts = pts;
    const q = new THREE.Quaternion(), m = new THREE.Matrix4();
    const n = pts.length;
    // gradas (escalones)
    const rows = Math.max(...pts.map(p => p.row)) + 1;
    for (let i = 0; i < rows; i++) {
      const r = pts.find(p => p.row === i);
      const rad = Math.hypot(r.x, r.z + 0.2);
      const shape = new THREE.Shape();
      shape.absarc(0, 0, rad + 0.5, 0, Math.PI, false);
      shape.absarc(0, 0, rad - 0.55, Math.PI, 0, true);
      const step = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: r.y, bevelEnabled: false, curveSegments: 48 }), std(i % 2 ? '#5b3a28' : '#4e3122', { roughness: 0.7 }));
      step.rotation.x = -Math.PI / 2; step.position.set(0, 0, -0.2); step.receiveShadow = true; step.castShadow = true;
      this.seatGroup.add(step);
    }
    const desk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.36, 0.3), std('#6b4430', { roughness: 0.5 }), n);
    const chair = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.55, 0.12), std('#8c1f2b', { roughness: 0.8 }), n);
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.15, 0.26, 4, 10), std('#ffffff', { roughness: 0.75 }), n);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 12, 10), std('#ffffff', { roughness: 0.7 }), n);
    const light = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.05, 0.1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
    const skins = FACE_OPTIONS.skin.values;
    pts.forEach((p, i) => {
      const rotY = Math.atan2(-p.x, -(p.z + 0.2));
      q.setFromEuler(new THREE.Euler(0, rotY, 0));
      const fwd = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
      m.compose(new THREE.Vector3(p.x, p.y + 0.18, p.z).addScaledVector(fwd, 0.28), q, new THREE.Vector3(1, 1, 1)); desk.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, p.y + 0.3, p.z).addScaledVector(fwd, -0.22), q, new THREE.Vector3(1, 1, 1)); chair.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, p.y + 0.36, p.z), q, new THREE.Vector3(1, 1, 1)); body.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, p.y + 0.7, p.z), q, new THREE.Vector3(1, 1, 1)); head.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, p.y + 0.385, p.z).addScaledVector(fwd, 0.36), q, new THREE.Vector3(1, 1, 1)); light.setMatrixAt(i, m);
      const o = owner[i];
      body.setColorAt(i, C3(o ? o.color : '#59617a'));
      head.setColorAt(i, C3(o ? skins[(i * 7) % skins.length] : '#3b3f4d'));
      light.setColorAt(i, C3('#2a2f3a'));
      if (!o) { m.makeScale(0, 0, 0); body.setMatrixAt(i, m); head.setMatrixAt(i, m); }
    });
    [desk, chair, body, head].forEach(x => { x.castShadow = true; x.receiveShadow = true; this.seatGroup.add(x); });
    this.seatGroup.add(light);
    this.lightMesh = light; this.bodyMesh = body;
    // etiquetas de grupo parlamentario
    parties.forEach(p => {
      const idxs = owner.map((o, i) => o === p ? i : -1).filter(i => i >= 0);
      const back = idxs.map(i => pts[i]).sort((a, b) => b.row - a.row)[0];
      const mid = pts[idxs[Math.floor(idxs.length / 2)]];
      const el = S3.makeLabel(`<span class="mini-logo">${logoSVG(p.logo, p.color, p.color2, 18)}</span><span class="nm">${p.short}</span><b class="val">${comp[p.id]}</b>`, 'group');
      this.labels.push({ el, pos: new THREE.Vector3(mid.x * 1.12, back.y + 1.3, (mid.z + 0.2) * 1.12 - 0.2) });
    });
  },
  setVotes(votes, reveal) {
    this.votes = votes;
    this.revealT = reveal ? 0 : 1;
    this.paintLights();
  },
  paintLights() {
    if (!this.lightMesh) return;
    const col = { si: '#3fd07e', no: '#ff5a52', abs: '#ffc23d', oculto: '#8fa0c8' };
    const n = this.pts.length;
    this.pts.forEach((p, i) => {
      const o = this.seatOwner[i];
      const v = o && this.votes ? this.votes[o.id] : null;
      // revelado en ola de izquierda a derecha
      const shown = this.revealT >= (i / n);
      this.lightMesh.setColorAt(i, C3(v && shown ? (col[v] || '#2a2f3a') : '#2a2f3a'));
    });
    this.lightMesh.instanceColor.needsUpdate = true;
  },
  setBoard(title, lines, color) {
    const tex = this.boardTex, c = tex.userData.canvas, g = c.getContext('2d');
    g.fillStyle = '#0b0d14'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = color || '#c9a24a'; g.fillRect(0, 0, c.width, 10);
    g.fillStyle = '#f2efe6'; g.font = '600 64px "Barlow Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center';
    g.fillText(String(title).slice(0, 42), c.width / 2, 100);
    g.font = '600 72px "Barlow Condensed", "Arial Narrow", sans-serif';
    (lines || []).slice(0, 3).forEach((ln, i) => {
      if (typeof ln === 'string') { g.fillStyle = '#c8cee0'; g.font = '500 46px "Barlow Condensed", sans-serif'; g.fillText(ln, c.width / 2, 180 + i * 64); return; }
      // ln: [{text, color}] en fila
      const parts = ln; const tot = parts.length;
      parts.forEach((pt, k) => { g.fillStyle = pt.color; g.font = '700 84px "Barlow Condensed", sans-serif'; g.fillText(pt.text, c.width * (k + 0.5) / tot, 230 + i * 80); });
    });
    tex.needsUpdate = true;
  },
  update(dt, t) {
    if (this.revealT < 1) { this.revealT = Math.min(1, this.revealT + dt * 0.7); this.paintLights(); }
    if (this.autoOrbit) { const a = Math.sin(t * 0.08) * 0.5; this.camera.position.x = Math.sin(a) * 27; this.camera.position.z = Math.cos(a) * 27 - 4; }
  },
};
S3.register('chamber', ChamberScene);
