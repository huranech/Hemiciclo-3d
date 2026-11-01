// ============================================================
//  ESCENA 3D: MAPA
//  Cada hexágono es un terreno (hierba, arena, roca, asfalto o mar) y puede contener
//  cosas: bosque, río, cultivos, ciudad, pueblo, fábrica, puerto, mina, pesca.
//  Tres niveles según la distancia de la cámara: países, cantones y hexágonos.
// ============================================================
'use strict';

const TERRAIN3D = {
  hierba: { name: 'Hierba', desc: 'tierra fértil', color: '#86b35c', icon: 'sprout' },
  arena: { name: 'Arena', desc: 'suelo arenoso', color: '#e0cb98', icon: 'sun' },
  roca: { name: 'Roca', desc: 'suelo rocoso', color: '#958b7f', icon: 'mountain' },
  asfalto: { name: 'Asfalto', desc: 'suelo urbanizado', color: '#83878f', icon: 'building-2' },
  mar: { name: 'Mar', desc: 'aguas', color: '#2f739d', icon: 'waves' },
};
const SEA_COLORS = ['#3f90b3', '#2f739d', '#245a83'];
const RELIEF3D = { llano: { name: 'Llanura', h: 0.34 }, colinas: { name: 'Colinas', h: 0.62 }, montana: { name: 'Montaña', h: 0.95 } };
const HEX_FEATURES = {
  capital: { name: 'Capital del país', icon: 'landmark' }, ciudad: { name: 'Ciudad', icon: 'building-2' }, pueblo: { name: 'Pueblo', icon: 'house' },
  fabrica: { name: 'Fábricas', icon: 'factory' }, puerto: { name: 'Puerto', icon: 'anchor' }, cultivo: { name: 'Campos de cultivo', icon: 'wheat' },
  bosque: { name: 'Bosque', icon: 'trees' }, rio: { name: 'Río', icon: 'waves' }, mina: { name: 'Yacimiento de metal', icon: 'pickaxe' }, carbon: { name: 'Yacimiento de carbón', icon: 'flame' },
  pesca: { name: 'Banco de pesca', icon: 'fish' },
};
// A qué sector de la economía aporta cada cosa
const HEX_YIELDS = {
  cultivo: 'agricultura', bosque: 'madera y caza', rio: 'regadío y agua', mina: 'metal', carbon: 'carbón', pesca: 'pesca',
  ciudad: 'servicios y comercio', capital: 'servicios, finanzas y administración', fabrica: 'industria', puerto: 'comercio exterior y pesca', pueblo: 'agricultura y servicios',
};
const LODS = {
  paises: { name: 'Países', icon: 'earth', dist: 92 },
  cantones: { name: 'Cantones', icon: 'map', dist: 40 },
  hex: { name: 'Terreno', icon: 'hexagon', dist: 17 },
};
const MAP_MODES = {
  geo: { name: 'Relieve', icon: 'mountain' },
  paises: { name: 'Países', icon: 'earth' },
  gobierno: { name: 'Gobiernos', icon: 'landmark' },
  paro: { name: 'Paro', icon: 'users', value: c => c.stats.unemployment, fmt: v => fmt.pct(v, 1), lo: '#eef3fb', hi: '#d1453b', bad: true },
  renta: { name: 'Renta', icon: 'wallet', value: c => c.stats.gdp * 1e9 / c.stats.pop, fmt: v => fmt.int(v / 1000) + ' k€', lo: '#f5edd6', hi: '#2f6db5' },
  cuentas: { name: 'Cuentas cantonales', icon: 'scale', value: c => c.budget && c.stats.gdp ? c.budget.balance / c.stats.gdp : 0, fmt: v => (v > 0 ? '+' : '') + fmt.pct(v, 1), diverging: true, divAbs: 0.03,
    label: c => `<b class="val"><span style="color:${(c.budget.balance || 0) >= 0 ? '#7fe0a8' : '#ff8a7a'}">${(c.budget.balance || 0) >= 0 ? '+' : ''}${fmt.pct((c.budget.balance || 0) / Math.max(1e-9, c.stats.gdp), 1)}</span> · deuda ${fmt.pct(c.budget.debtRatio || 0, 0)}</b>` },
  sanidad: { name: 'Sanidad', icon: 'stethoscope', value: c => c.stats.health, fmt: v => Math.round(v) + '/100', lo: '#f6e5e3', hi: '#2f8f6b' },
  educacion: { name: 'Educación', icon: 'graduation-cap', value: c => c.stats.education, fmt: v => Math.round(v) + '/100', lo: '#f6e5e3', hi: '#2f6db5' },
  seguridad: { name: 'Seguridad', icon: 'siren', value: c => c.stats.security, fmt: v => Math.round(v) + '/100', lo: '#f6e5e3', hi: '#5b5fc7' },
  vivienda: { name: 'Precio de la vivienda', icon: 'house', value: c => c.housing && c.housing.price ? c.housing.price.piso : 0, fmt: v => fmt.int(v) + ' mil €', lo: '#f5edd6', hi: '#b5523b', bad: true },
  identidad: { name: 'Fervor identitario', icon: 'flag', value: c => c.ferv ? c.ferv.can - c.ferv.cen : 0, fmt: v => fmt.pct(v, 0), diverging: true, divAbs: 0.6, colors: ['#c0392b', '#7b3fa0'],
    label: c => `<b class="val"><span style="color:#c9a4ff" title="Cantonalistas">${Math.round((c.ferv ? c.ferv.can : 0) * 100)} %</span> · <span style="color:#ff8a7a" title="Centralistas">${Math.round((c.ferv ? c.ferv.cen : 0) * 100)} %</span></b>` },
};
const OWN_COLOR = '#e8b93c';
const HEX_BOTTOM = -0.6;

// Une dos geometrías sencillas en una (sin depender de utilidades externas)
function mergeTwo(a, b) {
  const pa = a.toNonIndexed().attributes.position.array, pb = b.toNonIndexed().attributes.position.array;
  const na = a.toNonIndexed().attributes.normal.array, nb = b.toNonIndexed().attributes.normal.array;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(pa).concat(Array.from(pb)), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from(na).concat(Array.from(nb)), 3));
  return g;
}
// Reparte n puntos dentro de un círculo de radio R, separados al menos d (y fuera de un hueco central)
function placeSpots(seed, n, R, d, hole) {
  const rnd = k => { const x = Math.sin(seed * 91.7 + k * 13.13) * 43758.5453; return x - Math.floor(x); };
  const pts = [];
  for (let tries = 0, k = 0; pts.length < n && tries < 400; tries++, k++) {
    const minD = d * (1 - Math.min(0.45, tries / 600));
    const a = rnd(k) * Math.PI * 2, r = hole + Math.sqrt(rnd(k + 500)) * (R - hole);
    const p = [Math.cos(a) * r, Math.sin(a) * r];
    if (pts.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) >= minD)) pts.push(p);
  }
  while (pts.length < n) { const a = pts.length * 2.4; pts.push([Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6]); }
  return pts;
}

const MapScene = {
  scene: null, camera: null, controls: null, labels: [], mode: 'geo', lod: 'cantones', selected: null, hovered: null, hoverCountry: null, selHex: null,
  onSelect: null, onHover: null, onLod: null,
  mapRef: null, view: null, hexInfo: [], byKey: null, cantonHexes: {}, countryHexes: {}, bars: [], cloudGroup: null,
  build() {
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color('#0b1424');
    sc.fog = new THREE.Fog('#0b1424', 70, 170);
    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 500);
    this.camera.position.set(0, 34, 30);
    const ctl = this.controls = new THREE.MapControls(this.camera, S3.canvas);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.screenSpacePanning = false;
    ctl.minDistance = 8; ctl.maxDistance = 120; ctl.maxPolarAngle = 1.2; ctl.minPolarAngle = 0.25;
    sc.add(new THREE.HemisphereLight('#d6e6ff', '#3b2f22', 0.95));
    const sun = new THREE.DirectionalLight('#fff1d9', 2.3);
    sun.position.set(-22, 40, 18); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 1, far: 160 });
    sun.shadow.bias = -0.0008;
    sc.add(sun);
    // fondo: el mar lejano no existe, solo una sombra azul muy oscura
    const abyss = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ color: '#0d1a2c' }));
    abyss.rotation.x = -Math.PI / 2; abyss.position.y = HEX_BOTTOM - 0.05;
    sc.add(abyss);
    // nubes
    this.cloudGroup = new THREE.Group();
    const cm = std('#ffffff', { transparent: true, opacity: 0.5, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), cm); m.position.set(k * 1.1 - 1.6, Math.random() * 0.3, Math.random() * 0.8); m.scale.set(1.3, 0.55, 0.9); g.add(m); }
      g.position.set(Math.random() * 90 - 45, 8 + Math.random() * 2, Math.random() * 56 - 28);
      g.userData.v = 0.3 + Math.random() * 0.4;
      this.cloudGroup.add(g);
    }
    sc.add(this.cloudGroup);
    this.world = new THREE.Group(); sc.add(this.world);
    // anillos de hexágono para pasar el ratón y para la selección
    const ring = new THREE.RingGeometry(0.8, 0.98, 6, 1, Math.PI / 6); ring.rotateX(-Math.PI / 2);
    this.hoverRing = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthTest: false }));
    this.selRing = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: '#f2c14e', depthTest: false }));
    this.hoverRing.renderOrder = this.selRing.renderOrder = 5;
    this.hoverRing.visible = this.selRing.visible = false;
    sc.add(this.hoverRing, this.selRing);
  },
  enter(params) { this.refresh(params); },
  refresh(params) {
    if (params && params.map && params.map !== this.mapRef) this.buildWorld(params.map);
    if (params && params.view) this.setData(params.view);
    if (params && params.mode) this.setMode(params.mode);
  },
  hexPos(h) { const [x, y] = HEX.center(h.q, h.r, 1); return [x - this.cx, y - this.cz]; },
  foreignOf(mapIndex) { return (this.view && this.view.foreign || []).find(f => f.mapIndex === mapIndex); },
  countryColor(ci) { if (ci === 0) return OWN_COLOR; const f = this.foreignOf(ci); return f ? f.color : '#9aa3b5'; },
  countryName(ci) { if (ci === 0) return this.view ? this.view.country.name : ''; const f = this.foreignOf(ci); return f ? f.name : ''; },
  // país al que pertenece un hexágono (tierra o aguas), -1 si no es de nadie
  ownerOf(h) { return h.t === 'mar' ? (h.w >= 0 ? h.w : -1) : h.c; },

  buildWorld(map) {
    this.mapRef = map;
    this.world.clear();
    this.labels = []; S3.labelsEl && (S3.labelsEl.innerHTML = '');
    const land = map.hexes.filter(h => h.t !== 'mar');
    const pos = land.map(h => HEX.center(h.q, h.r, 1));
    this.cx = avg(pos, p => p[0]); this.cz = avg(pos, p => p[1]);
    const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    this.rnd = rnd;
    // --- hexágonos (tierra y mar cercano) ---
    const all = map.hexes;
    const geo = new THREE.CylinderGeometry(0.97, 1.0, 1, 6);
    const mesh = new THREE.InstancedMesh(geo, std('#ffffff', { roughness: 0.9 }), all.length);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.hexInfo = []; this.cantonHexes = {}; this.countryHexes = {}; this.byKey = new Map();
    all.forEach((h, i) => {
      const [x, z] = this.hexPos(h);
      let top, base;
      if (h.t === 'mar') {
        top = 0.06 - (h.d - 1) * 0.03;
        base = C3(SEA_COLORS[clamp((h.d || 1) - 1, 0, 2)]).offsetHSL(0, 0, (rnd(i, 2) - 0.5) * 0.025);
      } else {
        // el color depende solo del terreno: un prado es igual en todos los países
        top = (RELIEF3D[h.rel] || RELIEF3D.llano).h * (h.coast ? 0.85 : 1) + rnd(i, 1) * 0.1 + 0.14;
        if (h.t === 'asfalto') top = Math.min(top, 0.5);
        base = C3((TERRAIN3D[h.t] || TERRAIN3D.hierba).color).offsetHSL(0, 0, (rnd(i, 2) - 0.5) * 0.05);
        (this.countryHexes[h.c] = this.countryHexes[h.c] || []).push(i);
        if (h.c === 0) (this.cantonHexes[h.k] = this.cantonHexes[h.k] || []).push(i);
      }
      const info = { i, hex: h, x, z, h: top, base, land: h.t !== 'mar', f: h.f || [] };
      this.setHexMatrix(mesh, info);
      mesh.setColorAt(i, base);
      this.hexInfo.push(info);
      this.byKey.set(h.q + ',' + h.r, info);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    this.hexMesh = mesh; this.world.add(mesh);
    this.buildDecor();
    this.buildRivers();
    // --- ciudades con nombre (capitales cantonales) ---
    this.cityAnchors = {};
    this.buildCities();
    this.buildCountryLabels();
    this.buildBorders();
    this.fitCamera();
    this.firmGroup = null; this.firmSig = null; this.syncFirms();
    this.lod = null; this.updateLod(true);
  },
  setHexMatrix(mesh, info) {
    const hgt = info.h - HEX_BOTTOM;
    const m4 = new THREE.Matrix4().compose(new THREE.Vector3(info.x, HEX_BOTTOM + hgt / 2, info.z), new THREE.Quaternion(), new THREE.Vector3(1, hgt, 1));
    mesh.setMatrixAt(info.i, m4);
  },
  // Contenido de los hexágonos: árboles, montañas, cultivos, pueblos, fábricas, puertos, minas y pesca
  buildDecor() {
    const rnd = this.rnd;
    const L = { trees: [], peaks: [], snow: [], crystals: [], coal: [], boats: [], factories: [], chimneys: [], piers: [], cropsA: [], cropsB: [], flags: [] };
    const has = (info, k) => info.f.includes(k);
    this.hexInfo.forEach(info => {
      const i = info.i, top = info.h, x = info.x, z = info.z, h = info.hex;
      const jitter = (k, s = 1.1) => [(rnd(i, k) - 0.5) * s, (rnd(i, k + 50) - 0.5) * s];
      if (!info.land) {
        if (has(info, 'pesca')) for (let k = 0; k < 2; k++) { const [dx, dz] = jitter(k + 3, 1.2); L.boats.push([x + dx, top, z + dz, rnd(i, k + 7) * Math.PI]); }
        return;
      }
      if (has(info, 'bosque')) for (let k = 0; k < 5; k++) { const [dx, dz] = jitter(k + 3); L.trees.push([x + dx, top, z + dz, 0.7 + rnd(i, k) * 0.5]); }
      else if (h.t === 'hierba' && !has(info, 'cultivo') && !has(info, 'pueblo') && rnd(i, 4) < 0.22) { const [dx, dz] = jitter(5, 1); L.trees.push([x + dx, top, z + dz, 0.6]); }
      if (h.rel === 'montana' && h.t !== 'asfalto') { const s = 0.72 + rnd(i, 7) * 0.42; L.peaks.push([x, top, z, s]); if (s > 0.95) L.snow.push([x, top + 1.05 * s * 0.72, z, s]); }
      if (has(info, 'cultivo')) for (let k = 0; k < 4; k++) (k % 2 ? L.cropsB : L.cropsA).push([x - 0.06 + (rnd(i, 60) - 0.5) * 0.2, top, z + (k - 1.5) * 0.3, rnd(i, 61) * 0.5]);
      if (has(info, 'mina')) L.crystals.push([x + 0.35, top, z - 0.2]);
      if (has(info, 'carbon')) { L.coal.push([x + 0.32, top, z - 0.18]); L.coal.push([x + 0.42, top, z - 0.05]); }
      // (las casas y los bloques de pisos se dibujan aparte: cambian durante la partida)
      if (has(info, 'fabrica')) { L.factories.push([x - 0.15, top, z, 0.75, 0.32, 0.5]); L.chimneys.push([x + 0.35, top, z - 0.15]); L.chimneys.push([x + 0.35, top, z + 0.2]); }
      if (has(info, 'puerto')) {
        // muelle hacia el primer lado que da al mar
        const nb = HEX.neighbors(h.q, h.r).map(([q, r]) => this.byKey.get(q + ',' + r));
        const k = nb.findIndex(n => !n || !n.land);
        if (k >= 0) { const a = Math.PI / 180 * (60 * k); L.piers.push([x + Math.cos(a) * 0.9, top - 0.12, z + Math.sin(a) * 0.9, -a]); }
      }
    });
    const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), V = (a, b, c) => new THREE.Vector3(a, b, c);
    const inst = (geometry, material, list, setter, shadow = true) => {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach((d, i) => { setter(m4, d); im.setMatrixAt(i, m4); });
      im.castShadow = shadow; im.receiveShadow = true; this.world.add(im); return im;
    };
    const rotY = a => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0));
    inst(new THREE.ConeGeometry(0.22, 0.75, 7), std('#2f6b3a'), L.trees, (m, d) => m.compose(V(d[0], d[1] + 0.37 * d[3], d[2]), q0, V(d[3], d[3], d[3])));
    inst(new THREE.ConeGeometry(0.85, 1.4, 6), std('#7b7064', { flatShading: true }), L.peaks, (m, d) => m.compose(V(d[0], d[1] + 0.7 * d[3] - 0.05, d[2]), q0, V(d[3], d[3], d[3])));
    inst(new THREE.ConeGeometry(0.85 * 0.3, 1.4 * 0.3, 6), std('#f4f6f8', { flatShading: true }), L.snow, (m, d) => m.compose(V(d[0], d[1], d[2]), q0, V(d[3], d[3], d[3])));
    inst(new THREE.BoxGeometry(0.16, 0.025, 0.2), std('#d8c368'), L.cropsA, (m, d) => m.compose(V(d[0], d[1] + 0.012, d[2]), rotY(d[3]), V(5, 1, 1)), false);
    inst(new THREE.BoxGeometry(0.16, 0.025, 0.2), std('#9fbd52'), L.cropsB, (m, d) => m.compose(V(d[0], d[1] + 0.012, d[2]), rotY(d[3]), V(5, 1, 1)), false);
    inst(new THREE.OctahedronGeometry(0.12), std('#23252b', { roughness: 0.6, metalness: 0.2 }), L.coal, (m, d) => m.compose(V(d[0], d[1] + 0.08, d[2]), q0, V(1.2, 0.8, 1)));
    inst(new THREE.OctahedronGeometry(0.17), std('#8fb4e6', { metalness: 0.5, roughness: 0.3, emissive: '#1d3a66' }), L.crystals, (m, d) => m.compose(V(d[0], d[1] + 0.15, d[2]), q0, V(1, 1.6, 1)));
    inst(new THREE.BoxGeometry(0.34, 0.08, 0.13), std('#f1ece2'), L.boats, (m, d) => m.compose(V(d[0], d[1] + 0.05, d[2]), rotY(d[3]), V(1, 1, 1)));
    inst(new THREE.ConeGeometry(0.08, 0.22, 3), std('#ffffff'), L.boats, (m, d) => m.compose(V(d[0], d[1] + 0.2, d[2]), rotY(d[3]), V(1, 1, 0.3)));
    inst(new THREE.BoxGeometry(1, 1, 1), std('#a9aeb6', { roughness: 0.6 }), L.factories, (m, d) => m.compose(V(d[0], d[1] + d[4] / 2, d[2]), q0, V(d[3], d[4], d[5])));
    inst(new THREE.CylinderGeometry(0.06, 0.08, 0.75, 8), std('#8a4b3a'), L.chimneys, (m, d) => m.compose(V(d[0], d[1] + 0.37, d[2]), q0, V(1, 1, 1)));
    inst(new THREE.BoxGeometry(0.9, 0.06, 0.22), std('#8a6a4a'), L.piers, (m, d) => m.compose(V(d[0], d[1], d[2]), rotY(d[3]), V(1, 1, 1)));
  },
  // Ríos: cintas azules del centro del hexágono a los lados por los que entra y sale el agua
  buildRivers() {
    const pos = [];
    const W = 0.11;
    this.hexInfo.forEach(info => {
      const rv = info.hex.rv; if (!rv || !rv.length) return;
      const y = info.h + 0.02;
      const cs = HEX.corners(info.x, info.z, 1);
      const quad = (ax, az, bx, bz, w) => { const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w, nz = dx / l * w; pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz); };
      rv.forEach(k => { const a = cs[k], b = cs[(k + 1) % 6]; quad(info.x, info.z, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, W); });
      // remanso en el centro para que las curvas no tengan huecos
      for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k, b = Math.PI / 3 * (k + 1); pos.push(info.x, y, info.z, info.x + Math.cos(b) * W * 1.15, y, info.z + Math.sin(b) * W * 1.15, info.x + Math.cos(a) * W * 1.15, y, info.z + Math.sin(a) * W * 1.15); }
    });
    if (!pos.length) return;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#3d8fd0', side: THREE.DoubleSide }));
    this.world.add(m);
  },
  buildCities() {
    const cs = (this.view && this.view.cantons) || [];
    this.cantonLabelEls = {};
    cs.forEach(c => {
      if (c.merged) return;
      const info = this.byKey.get(c.cityHex[0] + ',' + c.cityHex[1]);
      if (!info) return;
      if (c.capital) {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std('#d9bf6f', { metalness: 0.5, roughness: 0.35 }));
        dome.position.set(info.x, info.h + 0.3, info.z); dome.castShadow = true;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.3, 20), std('#f1ece2'));
        base.position.set(info.x, info.h + 0.15, info.z); base.castShadow = true;
        this.world.add(dome, base);
      }
      this.cityAnchors[c.idx] = new THREE.Vector3(info.x, info.h, info.z);
      const el = S3.makeLabel('', 'canton');
      el.addEventListener('click', () => { if (this.lod === 'cantones') this.select(c.idx, true); });
      this.cantonLabelEls[c.idx] = el;
      this.labels.push({ el, pos: new THREE.Vector3(info.x, info.h + (c.capital ? 2.0 : 1.5), info.z), kind: 'canton', canton: c.idx });
    });
  },
  // Nombres de los países (también el nuestro), de los cantones extranjeros y de los pueblos
  buildCountryLabels() {
    Object.entries(this.countryHexes).forEach(([ci, list]) => {
      ci = +ci;
      const xs = list.map(i => this.hexInfo[i]);
      // sobre la masa de tierra más grande del país: la casilla más rodeada de casillas propias cerca del centro
      const mx = avg(xs, o => o.x), mz = avg(xs, o => o.z);
      const anchor = xs.slice().sort((a, b) => Math.hypot(a.x - mx, a.z - mz) - Math.hypot(b.x - mx, b.z - mz))[0];
      const el = S3.makeLabel('', 'country' + (ci === 0 ? ' own' : ''));
      el.addEventListener('click', () => { if (this.lod !== 'paises') return; if (ci === 0) { this.select(null); this.onSelect && this.onSelect(null); } else { const f = this.foreignOf(ci); this.select(null); f && this.onSelect && this.onSelect({ type: 'foreign', id: f.id }); } });
      this.labels.push({ el, pos: new THREE.Vector3(anchor.x, 2.2, anchor.z), kind: 'country', country: ci, foreign: ci > 0 ? (this.foreignOf(ci) || {}).id : undefined });
      const f = ci > 0 && this.foreignOf(ci);
      (f && f.cantons || []).filter(fc => !fc.nominal).forEach(fc => {
        const hi = this.byKey.get(fc.cityHex[0] + ',' + fc.cityHex[1]);
        if (!hi) return;
        const cel = S3.makeLabel('', 'fcanton');
        this.labels.push({ el: cel, pos: new THREE.Vector3(hi.x, hi.h + 0.9, hi.z), kind: 'fcanton', foreign: f.id, fcanton: fc.idx });
      });
    });
    // pueblos y capitales de países sin cantones: solo se ven de cerca
    this.hexInfo.forEach(info => {
      const h = info.hex;
      const isTown = info.f.includes('pueblo');
      const isForeignCapital = h.c > 0 && h.cs && !((this.foreignOf(h.c) || {}).cantons || []).filter(c => !c.nominal).length;
      if (!isTown && !isForeignCapital) return;
      const el = S3.makeLabel(`<span>${h.cn}</span>`, 'place' + (isTown ? '' : ' city'));
      el.addEventListener('click', () => { if (this.lod === 'hex') this.selectHex(info); });
      this.labels.push({ el, pos: new THREE.Vector3(info.x, info.h + (isTown ? 0.75 : 1.3), info.z), kind: 'place' });
    });
  },
  // Fronteras. Se reconstruyen al cambiar de nivel para ajustar el grosor
  buildBorders() {
    (this.borderMeshes || []).forEach(m => { this.world.remove(m); m.geometry.dispose(); });
    this.borderMeshes = [];
    if (!this.hexInfo.length) return;
    const lod = this.lod || 'cantones';
    const W = {
      paises: { band: 0.42, sep: 0.08, canton: 0.0, fcanton: 0.0, sea: 0.1, grid: 0 },
      cantones: { band: 0.14, sep: 0.035, canton: 0.085, fcanton: 0.05, sea: 0.06, grid: 0 },
      hex: { band: 0.09, sep: 0.03, canton: 0.05, fcanton: 0.035, sea: 0.045, grid: 0.02 },
    }[lod];
    const G = { band: { p: [], c: [] }, sep: { p: [] }, canton: { p: [] }, fcanton: { p: [] }, sea: { p: [], c: [] }, grid: { p: [] } };
    const col = {}; const colorOf = ci => col[ci] || (col[ci] = C3(this.countryColor(ci)).offsetHSL(0, 0.22, 0.03));
    // banda por dentro del lado k del hexágono (de grosor w), opcionalmente solo la parte central (discontinua)
    const inner = (info, k, w, y, out, color, dash) => {
      const cs = HEX.corners(info.x, info.z, 1), r = 1 - w / 0.866;
      let a = cs[k], b = cs[(k + 1) % 6];
      const ai = [info.x + (a[0] - info.x) * r, info.z + (a[1] - info.z) * r], bi = [info.x + (b[0] - info.x) * r, info.z + (b[1] - info.z) * r];
      let A = a, B = b, AI = ai, BI = bi;
      if (dash) { const L = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; A = L(a, b, 0.22); B = L(a, b, 0.78); AI = L(ai, bi, 0.22); BI = L(ai, bi, 0.78); }
      out.p.push(A[0], y, A[1], B[0], y, B[1], BI[0], y, BI[1], A[0], y, A[1], BI[0], y, BI[1], AI[0], y, AI[1]);
      if (out.c) for (let v = 0; v < 6; v++) out.c.push(color.r, color.g, color.b);
    };
    // línea centrada en el lado k
    const line = (info, n, k, w, out) => {
      const cs = HEX.corners(info.x, info.z, 1), a = cs[k], b = cs[(k + 1) % 6];
      const y = Math.max(info.h, n ? n.h : info.h) + 0.035;
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), nx = -dz / len * w, nz = dx / len * w;
      out.p.push(a[0] + nx, y, a[1] + nz, b[0] + nx, y, b[1] + nz, b[0] - nx, y, b[1] - nz, a[0] + nx, y, a[1] + nz, b[0] - nx, y, b[1] - nz, a[0] - nx, y, a[1] - nz);
    };
    for (const info of this.hexInfo) {
      const h = info.hex;
      const nbs = HEX.neighbors(h.q, h.r).map(([q, r]) => this.byKey.get(q + ',' + r));
      nbs.forEach((n, k) => {
        if (info.land) {
          const nLand = n && n.land;
          // banda del color del país por dentro de su frontera y de su costa
          if (!nLand || n.hex.c !== h.c) inner(info, k, W.band, info.h + 0.025, G.band, colorOf(h.c));
          if (nLand && n.hex.c !== h.c && h.c < n.hex.c) line(info, n, k, W.sep, G.sep);
          if (nLand && n.hex.c === h.c && n.hex.k !== h.k && h.k < n.hex.k) { if (h.c === 0 && W.canton) line(info, n, k, W.canton, G.canton); else if (h.c !== 0 && W.fcanton) line(info, n, k, W.fcanton, G.fcanton); }
          if (W.grid) inner(info, k, W.grid, info.h + 0.02, G.grid);
        } else {
          // frontera marítima: discontinua, por dentro de las aguas de cada país
          // las aguas en disputa no se distinguen: no se dibuja nada alrededor
          const o = h.w >= 0 && !h.dz ? h.w : -1;
          if (o < 0 || (n && n.land) || (n && n.hex.dz)) return;
          const no = n && n.hex.w >= 0 && !n.hex.dz ? n.hex.w : -1;
          if (no !== o) inner(info, k, W.sea, info.h + 0.02, G.sea, colorOf(o), true);
        }
      });
    }
    const mk = (g, opts) => {
      if (!g.p.length) return;
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
      if (g.c) geo.setAttribute('color', new THREE.Float32BufferAttribute(g.c, 3));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(Object.assign({ side: THREE.DoubleSide, transparent: true, vertexColors: !!g.c }, opts)));
      this.world.add(m); this.borderMeshes.push(m); return m;
    };
    mk(G.band, { opacity: lod === 'paises' ? 1 : 0.9 });
    mk(G.sep, { color: '#141b2b', opacity: 0.9 });
    mk(G.canton, { color: '#fbf6ea', opacity: lod === 'cantones' ? 1 : 0.75 });
    mk(G.fcanton, { color: '#ffffff', opacity: 0.55 });
    mk(G.sea, { opacity: 0.85 });
    mk(G.grid, { color: '#0d1424', opacity: 0.22 });
    this.selOutline();
  },
  // contorno dorado del cantón seleccionado
  selOutline() {
    if (this.selMesh) { this.world.remove(this.selMesh); this.selMesh.geometry.dispose(); this.selMesh = null; }
    const k = this.selected; if (k === null || k === undefined || this.lod !== 'cantones') return;
    const pos = [], w = 0.09;
    (this.cantonHexes[k] || []).forEach(i => {
      const info = this.hexInfo[i], h = info.hex, cs = HEX.corners(info.x, info.z, 1), r = 1 - w / 0.866;
      HEX.neighbors(h.q, h.r).forEach(([q, rr], e) => {
        const n = this.byKey.get(q + ',' + rr);
        if (n && n.land && n.hex.c === 0 && n.hex.k === k) return;
        const a = cs[e], b = cs[(e + 1) % 6], y = info.h + 0.04;
        const ai = [info.x + (a[0] - info.x) * r, info.z + (a[1] - info.z) * r], bi = [info.x + (b[0] - info.x) * r, info.z + (b[1] - info.z) * r];
        pos.push(a[0], y, a[1], b[0], y, b[1], bi[0], y, bi[1], a[0], y, a[1], bi[0], y, bi[1], ai[0], y, ai[1]);
      });
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.selMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#f2c14e', side: THREE.DoubleSide }));
    this.world.add(this.selMesh);
  },
  fitCamera() {
    const own = Object.values(this.cantonHexes).flat().map(i => this.hexInfo[i]);
    const x = avg(own, o => o.x), z = avg(own, o => o.z);
    const span = Math.max(...own.map(o => Math.hypot(o.x - x, o.z - z)));
    this.home = { target: new THREE.Vector3(x, 0, z), dist: clamp(span * 3.4, 38, 50) };
    this.controls.target.copy(this.home.target);
    this.camera.position.set(x, this.home.dist * 0.82, z + this.home.dist * 0.62);
    this.controls.update();
  },
  resetView() { this.flyTo(this.home.target, this.home.dist); },
  flyTo(target, dist) {
    const from = { t: this.controls.target.clone(), p: this.camera.position.clone() };
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const to = { t: target.clone(), p: target.clone().add(dir.multiplyScalar(dist || this.camera.position.distanceTo(this.controls.target))) };
    this.anim = { from, to, t: 0 };
  },
  // Ir a un nivel concreto (botones del mapa)
  goLod(level) {
    const t = level === 'paises' ? new THREE.Vector3(0, 0, 0) : this.controls.target.clone();
    this.flyTo(t, LODS[level].dist);
  },
  // Nivel según la distancia de la cámara (con margen para que no parpadee en el límite)
  updateLod(force) {
    const d = this.camera.position.distanceTo(this.controls.target);
    let lod = this.lod || 'cantones';
    if (force || !this.lod) lod = d >= 54 ? 'paises' : d >= 25 ? 'cantones' : 'hex';
    else if (lod === 'paises' && d < 51) lod = 'cantones';
    else if (lod === 'cantones' && d >= 57) lod = 'paises';
    else if (lod === 'cantones' && d < 23.5) lod = 'hex';
    else if (lod === 'hex' && d >= 26.5) lod = 'cantones';
    if (lod === this.lod && !force) return;
    this.lod = lod;
    document.body.dataset.lod = lod;
    this.hoverRing.visible = false;
    if (lod !== 'hex') { this.selHex = null; this.selRing.visible = false; }
    this.hovered = null; this.hoverCountry = null;
    this.buildBorders();
    this.applyMode();
    this.onLod && this.onLod(lod);
  },
  setData(view) {
    const first = !this.view && this.mapRef;
    this.view = view;
    // viviendas construidas durante la partida: se apuntan en el mapa
    if (this.byKey && view.bld) view.bld.forEach(b => { const info = this.byKey.get(b.q + ',' + b.r); if (info) { info.hex.nh = b.nh || undefined; info.hex.bb = b.bb && b.bb.length ? b.bb : undefined; } });
    if (first || (this.mapRef && !this.cityAnchors)) this.buildWorld(this.mapRef);
    this.syncFirms();
    this.applyMode();
  },
  // Edificios que cambian durante la partida: casas, bloques, obras, empresas y centros públicos
  syncFirms() {
    if (!this.byKey || !this.view || !this.view.firms) return;
    const V0 = this.view;
    const list = V0.firms.filter(f => f.q != null);
    const sig = list.map(f => f.id + ':' + f.q + ',' + f.r + (f.ob != null ? 'o' : '')).join('|') + '#' + JSON.stringify(V0.bld || []) + '#' + (V0.works || []).map(w => w.q + ',' + w.r + w.t + Math.floor(w.p / 20)).join('|');
    if (sig === this.firmSig) return;
    this.firmSig = sig;
    if (this.firmGroup) { this.world.remove(this.firmGroup); this.firmGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const grp = this.firmGroup = new THREE.Group(); this.world.add(grp);
    const parts = {};   // tipo de pieza -> lista de [x, y, z, sx, sy, sz, rotY]
    const add = (k, d) => (parts[k] = parts[k] || []).push(d);
    const firmsAt = {}; list.forEach(f => { (firmsAt[f.q + ',' + f.r] = firmsAt[f.q + ',' + f.r] || []).push(f); });
    const worksAt = {}; (V0.works || []).forEach(w => { (worksAt[w.q + ',' + w.r] = worksAt[w.q + ',' + w.r] || []).push(w); });
    // --- viviendas: casas en los pueblos y bloques de pisos (y las que están en obras) ---
    this.hexInfo.forEach(info => {
      if (!info.land) return;
      const hx = info.hex, key = hx.q + ',' + hx.r, x = info.x, z = info.z, y = info.h, i = info.i;
      const ws = worksAt[key] || [];
      const nf = (firmsAt[key] || []).length;
      const houseW = ws.filter(w => w.t === 'casa'), blockW = ws.filter(w => w.t === 'bloque');
      const nh = (hx.nh || 0) + houseW.length;
      if (nh) {
        const R = nf ? 0.6 : 0.8, d = nh > 14 ? 0.2 : 0.27;
        placeSpots(i, nh, R, d, 0).forEach(([dx, dz], k) => {
          const hx0 = x + dx, hz = z + dz;
          if (k < (hx.nh || 0)) { add('house', [hx0, y, hz, 0.2, 0.18, 0.2, 0]); add('houseRoof', [hx0, y + 0.18, hz, 1, 1, 1, Math.PI / 4]); }
          else { const w = houseW[k - (hx.nh || 0)]; add('frame', [hx0, y, hz, 0.2, 0.18 * Math.max(0.25, w.p / 100), 0.2, 0]); }
        });
      }
      const blocks = (hx.bb || []).map(b => ({ fl: b[0], pf: b[1] })).concat(blockW.map(w => ({ fl: w.fl, pf: w.pf, work: w })));
      if (blocks.length) {
        const city = info.f.includes('ciudad') || info.f.includes('capital');
        const spots = placeSpots(i + 0.5, blocks.length, city ? 0.78 : 0.62, blocks.length > 9 ? 0.24 : 0.3, info.f.includes('capital') ? 0.4 : 0);
        blocks.forEach((b, k) => {
          const sp = spots[k]; if (!sp) return;
          const w = 0.16 + b.pf * 0.025, hh = 0.1 + b.fl * 0.085;
          if (!b.work) add('block', [x + sp[0], y, z + sp[1], w, hh, w, 0]);
          else {
            const p = Math.max(0.12, b.work.p / 100);
            add('frame', [x + sp[0], y, z + sp[1], w, hh * p, w, 0]);
            add('crane', [x + sp[0] + w * 0.7, y, z + sp[1], 1, hh + 0.25, 1, 0]);
            add('craneArm', [x + sp[0] + w * 0.4, y + hh + 0.23, z + sp[1], 0.5, 0.025, 0.025, 0]);
          }
        });
      }
    });
    // --- empresas y centros públicos ---
    const perHex = {};
    list.forEach(f => {
      const info = this.byKey.get(f.q + ',' + f.r); if (!info) return;
      const k = (perHex[f.q + ',' + f.r] = (perHex[f.q + ',' + f.r] || 0) + 1) - 1;
      // en un anillo alrededor del centro, para no tapar el pueblo o la ciudad
      const busy = info.hex.nh || (info.hex.bb && info.hex.bb.length) || (worksAt[f.q + ',' + f.r] || []).length;
      const a = (f.id * 2.399) % (Math.PI * 2) + k * 1.3, r = busy ? 0.72 : 0.15 + k * 0.32;
      const x = info.x + Math.cos(a) * r, z = info.z + Math.sin(a) * r, y = info.h, ry = -a;
      const kind = f.ct || f.k;
      if (f.ob != null) {
        // en obras: estructura a medio levantar y una grúa
        const p = Math.max(0.15, f.ob / 100);
        add('frame', [x, y, z, 0.3, 0.24 * p, 0.24, ry]);
        add('crane', [x + 0.18, y, z, 1, 0.5, 1, 0]); add('craneArm', [x + 0.08, y + 0.48, z, 0.36, 0.022, 0.022, 0]);
        return;
      }
      switch (kind) {
        case 'agricultura': add('barn', [x, y, z, 0.26, 0.18, 0.2, ry]); add('roofRed', [x, y + 0.18, z, 0.28, 0.1, 0.22, ry]); add('silo', [x + Math.cos(a + 1.6) * 0.2, y, z + Math.sin(a + 1.6) * 0.2, 1, 1, 1, 0]); break;
        case 'ganaderia': add('barnBrown', [x, y, z, 0.3, 0.16, 0.2, ry]); add('roofDark', [x, y + 0.16, z, 0.32, 0.09, 0.22, ry]); break;
        case 'pesca': add('shed', [x, y, z, 0.24, 0.14, 0.18, ry]); add('roofBlue', [x, y + 0.14, z, 0.26, 0.08, 0.2, ry]); break;
        case 'silvicultura': add('shed', [x, y, z, 0.2, 0.14, 0.16, ry]); for (let i = 0; i < 3; i++) add('log', [x + Math.cos(a + 1.5) * 0.18, y + 0.04 + (i === 2 ? 0.07 : 0), z + Math.sin(a + 1.5) * 0.18 + (i - 1) * 0.04, 1, 1, 1, ry]); break;
        case 'muebles': add('workshop', [x, y, z, 0.34, 0.2, 0.26, ry]); add('roofDark', [x, y + 0.2, z, 0.36, 0.08, 0.28, ry]); break;
        case 'textil': add('factory', [x, y, z, 0.46, 0.22, 0.26, ry]); add('chimney', [x + Math.cos(a + 1.6) * 0.16, y, z + Math.sin(a + 1.6) * 0.16, 1, 1, 1, 0]); break;
        case 'sanidad': case 'centroSalud': add('clinic', [x, y, z, 0.26, 0.2, 0.22, ry]); add(kind === 'sanidad' ? 'crossRed' : 'crossGreen', [x, y + 0.24, z, 1, 1, 1, ry]); break;
        case 'hospital': add('hospital', [x, y, z, 0.42, 0.42, 0.32, ry]); add('crossRed', [x, y + 0.46, z, 1.4, 1.4, 1.4, ry]); break;
        case 'educacion': case 'colegio': add(kind === 'colegio' ? 'school' : 'schoolPriv', [x, y, z, 0.32, 0.2, 0.24, ry]); add('roofRed', [x, y + 0.2, z, 0.34, 0.08, 0.26, ry]); add('flag', [x + Math.cos(a + 1.6) * 0.2, y, z + Math.sin(a + 1.6) * 0.2, 1, 1, 1, 0]); break;
        case 'universidad': add('uni', [x, y, z, 0.46, 0.3, 0.3, ry]); add('uniRoof', [x, y + 0.3, z, 0.5, 0.1, 0.34, ry]); break;
        case 'banco': add('bank', [x, y, z, 0.28, 0.24, 0.22, ry]); add('bankRoof', [x, y + 0.24, z, 0.3, 0.08, 0.24, ry]); add('bankSign', [x, y + 0.17, z, 0.3, 0.04, 0.235, ry]); break;
        case 'constructora': add('yard', [x, y, z, 0.24, 0.12, 0.18, ry]); add('crane', [x + Math.cos(a + 1.6) * 0.16, y, z + Math.sin(a + 1.6) * 0.16, 1, 0.55, 1, 0]);
          add('craneArm', [x + Math.cos(a + 1.6) * 0.16 - 0.1, y + 0.53, z + Math.sin(a + 1.6) * 0.16, 0.36, 0.022, 0.022, 0]); add('bricks', [x - Math.cos(a + 1.6) * 0.15, y, z - Math.sin(a + 1.6) * 0.15, 0.1, 0.06, 0.1, ry]); break;
        case 'cantera': add('rock', [x, y, z, 0.3, 0.12, 0.24, ry]); add('rock', [x + Math.cos(a + 1.6) * 0.14, y, z + Math.sin(a + 1.6) * 0.14, 0.14, 0.07, 0.12, ry + 0.6]); add('shed', [x - Math.cos(a + 1.6) * 0.16, y, z - Math.sin(a + 1.6) * 0.16, 0.12, 0.09, 0.1, ry]); break;
        case 'minaMetal': case 'minaCarbon': add('shed', [x, y, z, 0.2, 0.12, 0.16, ry]); add('headframe', [x + Math.cos(a + 1.6) * 0.14, y, z + Math.sin(a + 1.6) * 0.14, 0.06, 0.4, 0.06, ry]);
          add(kind === 'minaCarbon' ? 'coalPile' : 'orePile', [x - Math.cos(a + 1.6) * 0.15, y, z - Math.sin(a + 1.6) * 0.15, 0.12, 0.07, 0.12, ry]); break;
        case 'maquinaria': add('machineWorks', [x, y, z, 0.44, 0.22, 0.28, ry]); add('roofDark', [x, y + 0.22, z, 0.46, 0.08, 0.3, ry]); add('chimney', [x + Math.cos(a + 1.6) * 0.18, y, z + Math.sin(a + 1.6) * 0.18, 1, 1, 1, 0]); break;
        case 'armamento': add('arms', [x, y, z, 0.42, 0.18, 0.28, ry]); add('roofDark', [x, y + 0.18, z, 0.44, 0.07, 0.3, ry]); break;
        case 'electrica': add('plant', [x, y, z, 0.3, 0.18, 0.22, ry]);
          for (let t = 0; t < 2; t++) add('tower', [x + Math.cos(a + 1.6) * (0.16 + t * 0.13), y, z + Math.sin(a + 1.6) * (0.16 + t * 0.13), 1, 1, 1, 0]); break;
        case 'gimnasio': add('gym', [x, y, z, 0.3, 0.14, 0.22, ry]); add('roofBlue', [x, y + 0.14, z, 0.32, 0.07, 0.24, ry]); break;
        case 'alimentacion': add('foodPlant', [x, y, z, 0.36, 0.18, 0.24, ry]); add('roofRed', [x, y + 0.18, z, 0.38, 0.08, 0.26, ry]); add('silo', [x + Math.cos(a + 1.6) * 0.2, y, z + Math.sin(a + 1.6) * 0.2, 1, 0.8, 1, 0]); break;
        case 'comercio': add('shopBody', [x, y, z, 0.22, 0.13, 0.17, ry]); add('awning', [x, y + 0.1, z, 0.24, 0.035, 0.19, ry]); break;
        case 'telecom': add('clinic', [x, y, z, 0.16, 0.12, 0.14, ry]); add('antenna', [x + Math.cos(a + 1.6) * 0.12, y, z + Math.sin(a + 1.6) * 0.12, 1, 1, 1, 0]); break;
        case 'medios': add('media', [x, y, z, 0.24, 0.2, 0.2, ry]); add('dish', [x, y + 0.22, z, 1, 1, 1, 0]); break;
        case 'comisaria': add('police', [x, y, z, 0.24, 0.16, 0.2, ry]); add('beacon', [x, y + 0.18, z, 1, 1, 1, 0]); break;
        case 'cuartel': add('barracks', [x, y, z, 0.5, 0.12, 0.36, ry]); add('flag', [x + Math.cos(a + 1.6) * 0.22, y, z + Math.sin(a + 1.6) * 0.22, 1, 1, 1, 0]); break;
      }
    });
    const G3 = {
      box: new THREE.BoxGeometry(1, 1, 1), roof: (() => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1); g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2); g.scale(1, 1, 1); return g; })(),
      silo: new THREE.CylinderGeometry(0.06, 0.06, 0.34, 10), log: (() => { const g = new THREE.CylinderGeometry(0.03, 0.03, 0.26, 7); g.rotateZ(Math.PI / 2); return g; })(),
      chimney: new THREE.CylinderGeometry(0.04, 0.055, 0.5, 8), cross: (() => { const a = new THREE.BoxGeometry(0.14, 0.04, 0.04), b = new THREE.BoxGeometry(0.04, 0.14, 0.04); return mergeTwo(a, b); })(),
      flag: new THREE.CylinderGeometry(0.008, 0.008, 0.4, 5), houseRoof: new THREE.ConeGeometry(0.2, 0.16, 4), crane: new THREE.CylinderGeometry(0.012, 0.012, 1, 4),
      tower: new THREE.CylinderGeometry(0.055, 0.075, 0.32, 12), antenna: new THREE.CylinderGeometry(0.008, 0.02, 0.6, 5), dish: new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      beacon: new THREE.SphereGeometry(0.03, 8, 6), rock: new THREE.DodecahedronGeometry(0.5),
    };
    const M = c => std(c, { roughness: 0.8 });
    const spec = {
      barn: [G3.box, M('#b5432f')], barnBrown: [G3.box, M('#8a5a3a')], roofRed: [G3.roof, M('#7a2a22')], roofDark: [G3.roof, M('#4a3a30')], roofBlue: [G3.roof, M('#3f5f7a')],
      silo: [G3.silo, M('#d9d4c7')], shed: [G3.box, M('#9a8a72')], log: [G3.log, M('#7a5232')], workshop: [G3.box, M('#c8a074')], factory: [G3.box, M('#b9a6c9')],
      chimney: [G3.chimney, M('#8a4b3a')], clinic: [G3.box, M('#f4f4f2')], hospital: [G3.box, M('#eef2f6')], crossRed: [G3.cross, std('#d23b3b', { emissive: '#7a1010', emissiveIntensity: 0.4 })],
      crossGreen: [G3.cross, std('#2f9a5a', { emissive: '#104a28', emissiveIntensity: 0.4 })], school: [G3.box, M('#e8c46a')], schoolPriv: [G3.box, M('#d8b0d8')], flag: [G3.flag, M('#dddddd')],
      uni: [G3.box, M('#e9dfc8')], uniRoof: [G3.roof, M('#6a5a4a')],
      house: [G3.box, std('#efe6d6')], houseRoof: [G3.houseRoof, std('#b5523b')], block: [G3.box, std('#e9e4da', { roughness: 0.7 })],
      frame: [G3.box, std('#c9b48a', { roughness: 0.9, transparent: true, opacity: 0.75 })], crane: [G3.crane, M('#e3b23c')], craneArm: [G3.box, M('#e3b23c')],
      bank: [G3.box, M('#dfe7ec')], bankRoof: [G3.roof, M('#2e6f73')], bankSign: [G3.box, std('#2e8b8b', { emissive: '#0f3a3a', emissiveIntensity: 0.4 })],
      yard: [G3.box, M('#d1a94e')], bricks: [G3.box, M('#a5523a')],
      rock: [G3.rock, std('#9b958c', { flatShading: true, roughness: 0.95 })], headframe: [G3.box, M('#4a4f58')], coalPile: [G3.box, M('#1f2024')], orePile: [G3.box, M('#9a5a3a')],
      machineWorks: [G3.box, M('#8fa0b8')], arms: [G3.box, M('#6b6b3a')], plant: [G3.box, M('#c9ccd2')], tower: [G3.tower, M('#e8e8ea')],
      gym: [G3.box, M('#7fb0c9')], foodPlant: [G3.box, M('#e3b87a')], shopBody: [G3.box, M('#efe2b4')], awning: [G3.box, M('#c94f6d')],
      antenna: [G3.antenna, M('#d04a3a')], media: [G3.box, M('#c86fd0')], dish: [G3.dish, M('#f2f2f2')],
      police: [G3.box, M('#3f5f9a')], beacon: [G3.beacon, std('#5aa0ff', { emissive: '#2a5aff', emissiveIntensity: 0.8 })], barracks: [G3.box, M('#8a8458')],
    };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler();
    for (const k in parts) {
      const [geo, mat] = spec[k];
      const im = new THREE.InstancedMesh(geo, mat, parts[k].length);
      parts[k].forEach((d, i) => {
        const tall = ['silo', 'chimney', 'flag', 'tower', 'antenna'].includes(k);
        const yy = d[1] + (tall ? geo.parameters.height / 2 : k === 'log' || k === 'craneArm' || k === 'bankSign' || k === 'dish' || k === 'beacon' ? 0 : k === 'houseRoof' ? 0.08 : k === 'rock' ? d[4] * 0.3 : k.startsWith('cross') ? 0 : d[4] / 2);
        q.setFromEuler(e3.set(0, d[6], 0));
        m4.compose(new THREE.Vector3(d[0], yy, d[2]), q, new THREE.Vector3(d[3], d[4], d[5]));
        im.setMatrixAt(i, m4);
      });
      im.castShadow = true; im.receiveShadow = true;
      grp.add(im);
    }
  },
  setMode(mode) { if (MAP_MODES[mode]) { this.mode = mode; this.applyMode(); } },
  cantonColor(c) {
    const v = this.view; const M = MAP_MODES[this.mode];
    if (this.mode === 'gobierno') { const p = v.players.find(x => x.id === c.gov.president); return p ? C3(p.color) : C3('#6a7598'); }
    if (this.mode === 'voto') {
      const le = v.parliament.lastElection; if (!le) return C3('#6a7598');
      const best = Object.entries(le.byCanton[c.idx].votes).sort((a, b) => b[1] - a[1])[0];
      const p = best && v.players.find(x => x.id === best[0]); return p ? C3(p.color) : C3('#6a7598');
    }
    if (M.value) {
      const vals = v.cantons.filter(x => !x.merged).map(M.value); const val = M.value(c);
      if (M.diverging) { const m = Math.max(M.divAbs || 1e-6, ...vals.map(Math.abs)); const t = clamp(val / m, -1, 1); const [cn, cp] = M.colors || ['#c0392b', '#2f8f6b']; return t >= 0 ? C3('#f2f2ee').lerp(C3(cp), t) : C3('#f2f2ee').lerp(C3(cn), -t); }
      const lo = M.abs ? M.abs[0] : Math.min(...vals), hi = M.abs ? Math.max(M.abs[1], ...vals) : Math.max(...vals);
      const t = hi - lo < 1e-9 ? 0.5 : (val - lo) / (hi - lo);
      return C3(M.lo).lerp(C3(M.hi), 0.15 + t * 0.85);
    }
    return null;
  },
  applyMode() {
    if (!this.hexMesh || !this.view) return;
    const v = this.view, M = MAP_MODES[this.mode];
    const cc = {};
    v.cantons.forEach(c => cc[c.idx] = this.cantonColor(c));
    const fgov = {};
    if (this.mode === 'gobierno') v.foreign.forEach(f => {
      if (!f.parties) return;
      const pc = id => { const p = f.parties.find(x => x.id === id); return p ? C3(p.color) : null; };
      fgov[f.mapIndex] = { nat: pc(f.gov && f.gov.party), cant: (f.cantons || []).map(c => pc(c.gov)) };
    });
    const ccol = {}; const cOf = ci => ccol[ci] || (ccol[ci] = C3(this.countryColor(ci)));
    const dim = C3('#2a3550');
    this.hexInfo.forEach(info => {
      const h = info.hex;
      let col = info.base.clone();
      if (this.mode === 'paises') {
        // mapa político: cada país con su color (y sus aguas, más suave)
        const o = this.ownerOf(h);
        if (info.land) col.lerp(cOf(h.c), 0.6);
        else if (o >= 0) col.lerp(cOf(o), 0.22);
      } else if (info.land) {
        const fg = h.c > 0 && fgov[h.c];
        if (fg) { const gc = (h.k >= 0 && fg.cant[h.k]) || fg.nat; if (gc) col = gc.clone().lerp(info.base, 0.35).offsetHSL(0, -0.1, -0.05); }
        if (h.c === 0 && cc[h.k]) col = cc[h.k].clone().lerp(info.base, this.mode === 'gobierno' || this.mode === 'voto' ? 0.22 : 0.12);
      }
      if (this.lod === 'cantones' && h.c === 0 && info.land) {
        if (this.selected === h.k) col.offsetHSL(0, 0, 0.07);
        else if (this.hovered === h.k) col.offsetHSL(0, 0, 0.05);
        if (this.selected !== null && this.selected !== undefined && h.k !== this.selected) col.lerp(dim, 0.25);
      }
      if (this.lod === 'paises' && this.hoverCountry !== null && this.ownerOf(h) === this.hoverCountry) col.offsetHSL(0, 0, 0.07);
      this.hexMesh.setColorAt(info.i, col);
    });
    this.hexMesh.instanceColor.needsUpdate = true;
    // columnas de datos sobre las capitales
    this.bars.forEach(b => this.world.remove(b)); this.bars = [];
    if (M.value && this.lod !== 'paises') {
      const vals = v.cantons.filter(x => !x.merged).map(M.value);
      const mx = Math.max(1e-9, ...vals.map(Math.abs));
      v.cantons.forEach(c => {
        const a = this.cityAnchors[c.idx]; if (!a || c.merged) return;
        const val = M.value(c), hgt = 0.3 + Math.abs(val) / mx * 4;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, hgt, 16), std('#' + cc[c.idx].getHexString(), { roughness: 0.4, emissive: cc[c.idx], emissiveIntensity: 0.15 }));
        bar.position.set(a.x + 0.9, a.y + hgt / 2, a.z - 0.4); bar.castShadow = true;
        this.world.add(bar); this.bars.push(bar);
      });
    }
    // etiquetas de cantón
    v.cantons.forEach(c => {
      const el = this.cantonLabelEls && this.cantonLabelEls[c.idx]; if (!el) return;
      if (c.merged) { el.style.display = 'none'; return; }
      const gov = v.players.find(x => x.id === c.gov.president);
      let extra = '';
      if (M.label) extra = M.label(c);
      else if (M.value) extra = `<b class="val">${M.fmt(M.value(c))}</b>`;
      else if (this.mode === 'gobierno' && gov) extra = `<span class="mini-logo">${logoSVG(gov.logo, gov.color, gov.color2, 18)}</span>`;
      el.innerHTML = `<span class="nm">${c.capital ? '★ ' : ''}${c.name}</span>${extra}`;
      el.classList.toggle('sel', this.selected === c.idx);
      const lbl = this.labels.find(l => l.canton === c.idx);
      if (lbl && M.value && this.lod !== 'paises') lbl.pos.y = this.cityAnchors[c.idx].y + 0.5 + Math.abs(M.value(c)) / Math.max(1e-9, ...v.cantons.filter(x => !x.merged).map(x => Math.abs(M.value(x)))) * 4 + 0.6;
      else if (lbl) lbl.pos.y = this.cityAnchors[c.idx].y + (c.capital ? 2.0 : 1.5);
    });
    // etiquetas de países y cantones extranjeros
    this.labels.forEach(l => {
      if (l.kind === 'country') {
        if (l.country === 0) { l.el.innerHTML = `<span class="flagchip" style="background:${OWN_COLOR}"></span><span>${v.country.name}</span>`; return; }
        const f = this.foreignOf(l.country); if (!f) return;
        const gp = f.parties && f.gov ? f.parties.find(p => p.id === f.gov.party) : null;
        const logo = gp && this.mode === 'gobierno' ? `<span class="mini-logo" title="${gp.name}">${logoSVG(gp.logo, gp.color, gp.color2, 18)}</span>` : '';
        l.el.innerHTML = `<span class="flagchip" style="background:${f.color}"></span><span>${f.name}</span>${logo}`;
      } else if (l.kind === 'fcanton') {
        const f = v.foreign.find(x => x.id === l.foreign); if (!f) return;
        const fc = f.cantons[l.fcanton];
        const gp = f.parties ? f.parties.find(p => p.id === fc.gov) : null;
        const logo = gp && this.mode === 'gobierno' ? `<span class="mini-logo" title="${gp.name}">${logoSVG(gp.logo, gp.color, gp.color2, 14)}</span>` : '';
        l.el.innerHTML = `${logo}<span>${fc.name}</span>`;
      }
    });
    this.labelVisibility();
  },
  // Qué nombres se ven en cada nivel
  labelVisibility() {
    const lod = this.lod;
    this.labels.forEach(l => {
      if (l.kind === 'country') { l.hidden = lod === 'hex'; l.el.classList.toggle('dim', lod !== 'paises'); }
      else if (l.kind === 'canton') { const cc = this.view && this.view.cantons[l.canton]; l.hidden = lod === 'paises' || !!(cc && cc.merged); l.el.classList.toggle('dim', lod === 'hex'); }
      else if (l.kind === 'fcanton') l.hidden = lod === 'paises' || !['geo', 'gobierno', 'paises'].includes(this.mode);
      else if (l.kind === 'place') l.hidden = lod !== 'hex';
    });
  },
  pickables() { return this.hexMesh ? [this.hexMesh] : []; },
  hitInfo(hit) { if (!hit || hit.instanceId === undefined) return null; return this.hexInfo[hit.instanceId]; },
  placeRing(ring, info) { ring.visible = !!info; if (info) ring.position.set(info.x, info.h + 0.03, info.z); },
  hover(hit) {
    const info = this.hitInfo(hit);
    let out = null;
    if (this.lod === 'paises') {
      const o = info ? this.ownerOf(info.hex) : -1;
      const hc = o >= 0 ? o : null;
      if (hc !== this.hoverCountry) { this.hoverCountry = hc; this.applyMode(); }
      out = hc === null ? (info && info.hex.dz ? { type: 'sea', hex: info.hex } : null) : { type: 'country', mapIndex: hc };
    } else if (this.lod === 'cantones') {
      const k = info && info.land && info.hex.c === 0 ? info.hex.k : null;
      if (k !== this.hovered) { this.hovered = k; this.applyMode(); }
      if (info) out = !info.land ? { type: 'sea', hex: info.hex } : info.hex.c === 0 ? { type: 'canton', idx: info.hex.k } : { type: 'foreign', mapIndex: info.hex.c, k: info.hex.k };
    } else {
      this.placeRing(this.hoverRing, info);
      if (info) out = { type: 'hex', hex: info.hex };
    }
    S3.canvas.style.cursor = info ? 'pointer' : '';
    this.onHover && this.onHover(out);
  },
  click(hit) {
    const info = this.hitInfo(hit);
    if (this.lod === 'hex') { if (info) this.selectHex(info); else { this.selectHex(null); this.onSelect && this.onSelect(null); } return; }
    if (!info) { this.select(null); return; }
    if (this.lod === 'paises') {
      const o = this.ownerOf(info.hex);
      this.select(null, false, true);
      if (o === 0 || o < 0) this.onSelect && this.onSelect(null);
      else { const f = this.foreignOf(o); this.onSelect && f && this.onSelect({ type: 'foreign', id: f.id }); }
      return;
    }
    if (!info.land) { this.select(null); return; }
    // en la vista de cantones solo se eligen nuestros cantones (los países, en la vista de países)
    if (info.hex.c === 0) this.select(info.hex.k, true);
  },
  select(k, fly, silent) {
    this.selected = k;
    this.selOutline();
    this.applyMode();
    if (k !== null && fly && this.cityAnchors[k]) this.flyTo(new THREE.Vector3(this.cityAnchors[k].x, 0, this.cityAnchors[k].z), 36);
    if (!silent) this.onSelect && this.onSelect(k === null ? null : { type: 'canton', idx: k });
  },
  // Marcar un hexágono (sin avisar al panel) y avisar al panel
  markHex(q, r) { const info = this.byKey && this.byKey.get(q + ',' + r); this.selHex = info || null; this.placeRing(this.selRing, this.selHex); },
  selectHex(info) {
    this.selHex = info; this.placeRing(this.selRing, info);
    if (info) this.onSelect && this.onSelect({ type: 'hex', q: info.hex.q, r: info.hex.r });
  },
  hexAt(q, r) { const info = this.byKey && this.byKey.get(q + ',' + r); return info ? info.hex : null; },
  update(dt, t) {
    if (this.anim) {
      const a = this.anim; a.t = Math.min(1, a.t + dt * 1.4); const e = easeInOut(a.t);
      this.controls.target.lerpVectors(a.from.t, a.to.t, e);
      this.camera.position.lerpVectors(a.from.p, a.to.p, e);
      if (a.t >= 1) this.anim = null;
    }
    const d = this.camera.position.distanceTo(this.controls.target);
    this.scene.fog.near = d * 0.95; this.scene.fog.far = d * 2.6 + 30;
    if (this.hexMesh) this.updateLod();
    this.cloudGroup.visible = this.lod !== 'hex';
    this.cloudGroup.children.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 48) c.position.x = -48; });
  },
  leave() { this.onHover && this.onHover(null); S3.canvas.style.cursor = ''; },
};
S3.register('map', MapScene);
