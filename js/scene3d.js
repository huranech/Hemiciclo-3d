// ============================================================
//  MOTOR 3D: renderizador común, cambio de escena, etiquetas y ratón
// ============================================================
'use strict';

const S3 = {
  renderer: null, canvas: null, labelsEl: null, scenes: {}, current: null, currentName: null, last: 0, mouse: { x: 0, y: 0, inside: false },
  raycaster: null, quality: 'alta', failed: false,
  init(canvas, labelsEl) {
    this.canvas = canvas; this.labelsEl = labelsEl;
    const qp = new URLSearchParams(location.search);
    if (qp.get('no3d') === '1') { this.failed = true; return false; }
    this.fpsCap = qp.get('fps') ? +qp.get('fps') : 0;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { this.failed = true; console.error(e); return false; }
    const r = this.renderer;
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.raycaster = new THREE.Raycaster();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointermove', e => { this.setMouse(e); this.current && this.current.hover && this.current.hover(this.pick()); });
    canvas.addEventListener('pointerleave', () => { this.mouse.inside = false; this.current && this.current.hover && this.current.hover(null); });
    let down = null;
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved < 6) { this.setMouse(e); this.current && this.current.click && this.current.click(this.pick()); }
    });
    this.resize();
    requestAnimationFrame(t => this.loop(t));
    return true;
  },
  setMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.mouse.inside = true;
  },
  pick() {
    const c = this.current; if (!c || !c.pickables) return null;
    this.raycaster.setFromCamera(new THREE.Vector2(this.mouse.x, this.mouse.y), c.camera);
    const hits = this.raycaster.intersectObjects(c.pickables(), false);
    return hits[0] || null;
  },
  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    Object.values(this.scenes).forEach(s => { if (s.camera) { s.camera._shiftKey = null; s.camera.clearViewOffset(); s.camera.aspect = w / h; s.camera.updateProjectionMatrix(); } });
  },
  register(name, ctrl) { this.scenes[name] = ctrl; },
  show(name, params) {
    if (this.failed) return;
    const next = this.scenes[name];
    if (!next) return;
    if (this.current !== next) {
      if (this.current && this.current.leave) this.current.leave();
      this.labelsEl.innerHTML = '';
      this.current = next; this.currentName = name;
      if (!next.built) { next.build(); next.built = true; }
      if (next.camera) { next.camera._shiftKey = null; next.camera.clearViewOffset(); next.camera.aspect = window.innerWidth / window.innerHeight; next.camera.updateProjectionMatrix(); }
      next.enter && next.enter(params);
      if (next.controls) next.controls.enabled = true;
    } else if (next.refresh) next.refresh(params);
    document.body.dataset.scene = name;
  },
  // Desplaza el centro óptico para que la escena quede centrada en el hueco libre entre paneles
  measureShift() {
    const w = window.innerWidth;
    if (w < 900) return 0;
    let left = 0, right = w;
    document.querySelectorAll('#hud .dock').forEach(d => {
      const r = d.getBoundingClientRect();
      if (!r.width || d.offsetParent === null) return;
      if (r.left > w / 2) right = Math.min(right, r.left); else left = Math.max(left, r.right);
    });
    return w / 2 - (left + right) / 2;   // positivo: contenido hacia la izquierda
  },
  applyShift(c, dt) {
    const target = this.shiftTarget || 0;
    this.shift = this.shift == null ? target : this.shift + (target - this.shift) * Math.min(1, dt * 5);
    const w = window.innerWidth, h = window.innerHeight, sft = Math.round(this.shift);
    const key = sft + 'x' + w + 'x' + h;
    if (c.camera._shiftKey === key) return;
    c.camera._shiftKey = key;
    if (sft === 0) { c.camera.clearViewOffset(); c.camera.aspect = w / h; c.camera.updateProjectionMatrix(); }
    else if (sft > 0) c.camera.setViewOffset(w + 2 * sft, h, 2 * sft, 0, w, h);
    else c.camera.setViewOffset(w - 2 * sft, h, 0, 0, w, h);
  },
  loop(t) {
    if (this.fpsCap && t - this.last < 1000 / this.fpsCap) { requestAnimationFrame(tt => this.loop(tt)); return; }
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0.016);
    this.last = t;
    const c = this.current;
    if (c && c.scene && c.camera && !document.hidden) {
      if (!this._shiftTick || t - this._shiftTick > 150) { this._shiftTick = t; this.shiftTarget = this.measureShift(); }
      this.applyShift(c, dt);
      c.update && c.update(dt, t / 1000);
      if (c.controls) c.controls.update();
      this.renderer.render(c.scene, c.camera);
      if (c.labels) this.updateLabels(c);
    }
    requestAnimationFrame(tt => this.loop(tt));
  },
  // Etiquetas HTML ancladas a puntos 3D
  makeLabel(html, cls) {
    const el = document.createElement('div');
    el.className = 'label3d ' + (cls || '');
    if (html instanceof Node) el.appendChild(html); else el.innerHTML = html;
    this.labelsEl.appendChild(el);
    return el;
  },
  updateLabels(c) {
    const w = window.innerWidth, h = window.innerHeight;
    const v = new THREE.Vector3();
    for (const l of c.labels) {
      if (!l.el.isConnected) this.labelsEl.appendChild(l.el);
      v.copy(l.pos).project(c.camera);
      const vis = v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.2 && v.y < 1.2 && !l.hidden;
      l.el.style.display = vis ? '' : 'none';
      if (vis) l.el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
    }
  },
};

// ---------- utilidades de geometría ----------
const C3 = hex => new THREE.Color(hex);
function std(color, opts = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.02 }, opts)); }
// Textura a partir de un SVG (asíncrona: se rellena cuando la imagen carga)
function svgTexture(svg, w, h) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  svgToCanvas(svg, w, h).then(c => { canvas.getContext('2d').drawImage(c, 0, 0); tex.needsUpdate = true; });
  return tex;
}
function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.canvas = canvas;
  return tex;
}
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
