// ============================================================
//  ESCENA 3D: PLATÓ DEL DEBATE (también muestra los partidos)
// ============================================================
'use strict';

const StudioScene = {
  scene: null, camera: null, labels: [], podiums: {}, speaker: null, camTarget: null, camLook: null,
  build() {
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color('#07090f');
    sc.fog = new THREE.Fog('#07090f', 18, 45);
    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.set(0, 4.2, 15);
    this.camLook = new THREE.Vector3(0, 2, 0);
    this.camTarget = { pos: this.camera.position.clone(), look: this.camLook.clone() };
    sc.add(new THREE.HemisphereLight('#bcd2ff', '#1a1020', 0.55));
    const amb = new THREE.PointLight('#5f7bff', 80, 40); amb.position.set(-8, 6, 4); sc.add(amb);
    const amb2 = new THREE.PointLight('#ff6a8a', 60, 40); amb2.position.set(8, 6, 4); sc.add(amb2);
    this.spot = new THREE.SpotLight('#fff6e6', 0, 30, 0.32, 0.45, 1.2);
    this.spot.position.set(0, 12, 6); this.spot.castShadow = true; this.spot.shadow.mapSize.set(1024, 1024);
    sc.add(this.spot, this.spot.target);
    const key = new THREE.DirectionalLight('#ffffff', 0.9); key.position.set(0, 10, 12); sc.add(key);
    // suelo brillante con anillos de luz
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), std('#10131c', { roughness: 0.25, metalness: 0.4 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(5 + i * 2.2, 5.08 + i * 2.2, 96), new THREE.MeshBasicMaterial({ color: i === 1 ? '#c9a24a' : '#3b4a7a', transparent: true, opacity: 0.7 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; sc.add(ring);
    }
    // fondo: pantallas y tiras de luz
    const back = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 10, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76), std('#141a2b', { side: THREE.BackSide, roughness: 0.6 }));
    back.position.set(0, 5, 2); sc.add(back);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.66 + i * 0.68 / 6);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 8, 0.12), new THREE.MeshBasicMaterial({ color: i % 2 ? '#3a5bd9' : '#c9a24a' }));
      strip.position.set(Math.sin(a) * 13.6, 4.5, 2 + Math.cos(a) * 13.6); sc.add(strip);
    }
    this.screenTex = canvasTexture(1024, 256, (g, w, h) => { g.fillStyle = '#0c1020'; g.fillRect(0, 0, w, h); });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: this.screenTex }));
    screen.position.set(0, 5.1, -11); sc.add(screen);
    this.podiumGroup = new THREE.Group(); sc.add(this.podiumGroup);
    // mesa de moderación
    const mod = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.8), std('#d8dce6', { roughness: 0.3, metalness: 0.2 }));
    mod.position.set(-6.2, 0.5, 4.2); mod.rotation.y = 0.9; mod.castShadow = true; sc.add(mod);
    this.setScreen('Debate inaugural', '');
  },
  enter(params) { this.refresh(params); },
  refresh(params) {
    if (!params) return;
    if (params.players) this.setParticipants(params.players, params.preview);
    this.setSpeaker(params.speaker || null);
    if (params.screen) this.setScreen(params.screen.title, params.screen.sub);
  },
  setParticipants(players, preview) {
    const list = players.filter(p => p.configured || (preview && p.id === preview.id)).map(p => (preview && p.id === preview.id) ? Object.assign({}, p, preview, { configured: true }) : p);
    const key = JSON.stringify(list.map(p => [p.id, p.color, p.color2, p.logo, p.candidate, p.short]));
    if (key === this.key) return;
    this.key = key;
    this.podiumGroup.clear(); this.podiums = {}; this.labels = []; S3.labelsEl.innerHTML = '';
    const n = list.length;
    list.forEach((p, i) => {
      const a = n === 1 ? 0 : (-0.62 + 1.24 * i / (n - 1));
      const R = 7;
      const x = Math.sin(a) * R, z = -Math.cos(a) * R + 3;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -a;
      const pod = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.7), std(p.color || '#555', { roughness: 0.35, metalness: 0.15 }));
      pod.position.y = 0.6; pod.castShadow = true; g.add(pod);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.8), std('#e8e8ee', { roughness: 0.3 }));
      top.position.y = 1.24; g.add(top);
      const logoTex = svgTexture(logoSVG(p.logo, p.color, p.color2, 256), 256, 256);
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true }));
      logo.position.set(0, 0.65, 0.36); g.add(logo);
      const faceTex = svgTexture(faceSVG(p.candidate.face, { accent: p.color }), 400, 440);
      const person = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.87), new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, alphaTest: 0.05, roughness: 0.8 }));
      person.position.set(0, 1.95, -0.25); g.add(person);
      this.podiumGroup.add(g);
      this.podiums[p.id] = g;
      const el = S3.makeLabel(`<span class="nm">${p.candidate.name}</span><span class="sub">${p.short || ''}</span>`, 'podium');
      this.labels.push({ el, pos: new THREE.Vector3(x, 3.15, z), pid: p.id });
    });
  },
  setSpeaker(pid) {
    this.speaker = pid;
    const g = pid && this.podiums[pid];
    this.labels.forEach(l => l.el.classList.toggle('on', l.pid === pid));
    if (g) {
      this.spot.intensity = 260;
      this.spot.target.position.copy(g.position).setY(1.5);
      const p = g.position;
      this.camTarget = { pos: new THREE.Vector3(p.x * 0.55, 3.2, p.z + 7.5), look: new THREE.Vector3(p.x, 1.9, p.z) };
    } else {
      this.spot.intensity = 0;
      this.camTarget = { pos: new THREE.Vector3(0, 4.4, 15.5), look: new THREE.Vector3(0, 2.6, 0) };
    }
  },
  setScreen(title, sub) {
    const c = this.screenTex.userData.canvas, g = c.getContext('2d');
    g.fillStyle = '#0c1020'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#c9a24a'; g.fillRect(0, c.height - 8, c.width, 8);
    g.fillStyle = '#f2efe6'; g.textAlign = 'center';
    const fit = (txt, weight, size, max) => { let sz = size; do { g.font = `${weight} ${sz}px "Barlow Condensed", "Arial Narrow", sans-serif`; sz -= 4; } while (g.measureText(txt).width > max && sz > 24); };
    const T = String(title), S = String(sub || '');
    fit(T, 700, 92, c.width - 80); g.fillText(T, c.width / 2, 110);
    g.fillStyle = '#9fb0d8'; fit(S, 500, 52, c.width - 80); g.fillText(S, c.width / 2, 190);
    this.screenTex.needsUpdate = true;
  },
  update(dt, t) {
    const k = 1 - Math.pow(0.02, dt);
    this.camera.position.lerp(this.camTarget.pos, k);
    this.camLook.lerp(this.camTarget.look, k);
    this.camera.position.y += Math.sin(t * 0.6) * 0.002;
    this.camera.lookAt(this.camLook);
  },
};
S3.register('studio', StudioScene);
