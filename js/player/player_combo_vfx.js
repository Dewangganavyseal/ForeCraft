'use strict';
/* =================================================================
FORECRAFT 3D - COMBO VFX (trail, slash arc, spark, shockwave, flash, shake)
File: js/player/player_combo_vfx.js
================================================================= */
class ComboVFX {
  constructor(scene, camera = null) {
    this.scene = scene;
    this.camera = camera;
    this._items = [];
    this.trail = null;
    this.shakeMag = 0; this.shakeDur = 0; this.shakeT = 0;
    this._shakeOff = new THREE.Vector3();
    this._tA = new THREE.Vector3();
    this._tB = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this._camFallback = new THREE.Vector3(0, 2.2, 6);
  }
  setCamera(c) { this.camera = c; }
  _add(it) { if (it.root) this.scene.add(it.root); this._items.push(it); }

  /* ---------------- WEAPON TRAIL (ribbon mengikuti ujung pedang) ---------------- */
  beginTrail(color = 0xffffff, width = 0.15, max = 30) {
    this.killTrail();
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 2 * 3);
    const col = new Float32Array(max * 2 * 3);
    const idx = [];
    for (let i = 0; i < max - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    this.trail = { mesh, pts: [], max, width, color: new THREE.Color(color), active: true, fade: 1 };
    this.scene.add(mesh);
  }
  get trailActive() { return !!this.trail && this.trail.active; }
  sampleTrail(worldPos) {
    const tr = this.trail;
    if (!tr || !tr.active) return;
    tr.pts.unshift(worldPos.clone());
    if (tr.pts.length > tr.max) tr.pts.pop();
  }
  endTrail() { if (this.trail) this.trail.active = false; }
  killTrail() {
    if (!this.trail) return;
    this.scene.remove(this.trail.mesh);
    this.trail.mesh.geometry.dispose();
    this.trail.mesh.material.dispose();
    this.trail = null;
  }
  _updateTrail(dt) {
    const tr = this.trail;
    if (!tr) return;
    if (!tr.active) {
      tr.fade -= dt * 4;
      tr.pts.pop(); tr.pts.pop();
      if (tr.fade <= 0 || tr.pts.length < 2) { this.killTrail(); return; }
    }
    const n = tr.pts.length;
    const geo = tr.mesh.geometry;
    if (n < 2) { geo.setDrawRange(0, 0); return; }
    const posA = geo.attributes.position.array;
    const colA = geo.attributes.color.array;
    const camP = this.camera ? this.camera.position : this._camFallback;
    const fade = tr.active ? 1 : Math.max(tr.fade, 0);
    for (let i = 0; i < n; i++) {
      const p = tr.pts[i];
      const q = tr.pts[Math.min(i + 1, n - 1)];
      const r = tr.pts[Math.max(i - 1, 0)];
      this._tA.copy(q).sub(r);
      if (this._tA.lengthSq() < 1e-10) this._tA.set(0, 1, 0);
      this._tB.copy(p).sub(camP);
      if (this._tB.lengthSq() < 1e-10) this._tB.set(0, 0, 1);
      this._side.crossVectors(this._tA, this._tB).normalize();
      const taper = Math.pow(1 - i / Math.max(n - 1, 1), 0.7);
      const w = tr.width * (0.3 + 0.7 * taper) * fade;
      const i6 = i * 6;
      posA[i6 + 0] = p.x + this._side.x * w;
      posA[i6 + 1] = p.y + this._side.y * w;
      posA[i6 + 2] = p.z + this._side.z * w;
      posA[i6 + 3] = p.x - this._side.x * w;
      posA[i6 + 4] = p.y - this._side.y * w;
      posA[i6 + 5] = p.z - this._side.z * w;
      const g = taper * fade * 1.15;
      colA[i6 + 0] = tr.color.r * g; colA[i6 + 1] = tr.color.g * g; colA[i6 + 2] = tr.color.b * g;
      colA[i6 + 3] = tr.color.r * g; colA[i6 + 4] = tr.color.g * g; colA[i6 + 5] = tr.color.b * g;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, (n - 1) * 6);
  }

  /* ---------------- SLASH ARC (lengkungan tebasan) ---------------- */
  slashArc(o = {}) {
    const pos = o.pos || [0, 1.2, 0.4];
    const rot = o.rot || [0, 0, 0];
    const inner = o.inner !== undefined ? o.inner : 0.5;
    const outer = o.outer !== undefined ? o.outer : 1.1;
    const arc = o.arc !== undefined ? o.arc : 2.2;
    const color = o.color !== undefined ? o.color : 0x9fd8ff;
    const dur = o.dur || 0.28;
    const spin = o.spin !== undefined ? o.spin : 3;
    const scale = o.scale || 1;
    const baseZ = rot[2] || 0;
    const geo = new THREE.RingGeometry(inner, outer, 48, 1, 0, arc);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], baseZ);
    m.scale.setScalar(scale * 0.7);
    let t = 0, acc = 0;
    const it = { root: m, dur };
    it.update = (dt) => {
      t += dt; const k = t / dur;
      if (k >= 1) return false;
      const e = 1 - Math.pow(1 - k, 3);
      m.scale.setScalar(scale * (0.7 + 0.5 * e));
      const fin = k < 0.12 ? k / 0.12 : 1;
      mat.opacity = 0.9 * (1 - k) * fin;
      acc += spin * dt;
      m.rotation.z = baseZ + acc;
      return true;
    };
    it.kill = () => { geo.dispose(); mat.dispose(); };
    this._add(it);
    return it;
  }

  /* ---------------- STREAK (kilatan tusukan) ---------------- */
  streak(o = {}) {
    const pos = o.pos || [0, 1.26, 1.0];
    const len = o.len || 1.8;
    const width = o.width || 0.3;
    const color = o.color !== undefined ? o.color : 0xfff3b0;
    const dur = o.dur || 0.22;
    const geo = new THREE.PlaneGeometry(width, len);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI / 2; // arah memanjang ke +Z (depan karakter)
    m.position.set(pos[0], pos[1], pos[2]);
    let t = 0;
    const it = { root: m, dur };
    it.update = (dt) => {
      t += dt; const k = t / dur;
      if (k >= 1) return false;
      const grow = k < 0.4 ? k / 0.4 : 1;
      m.scale.y = 0.3 + grow;
      mat.opacity = (k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6) * 0.9;
      return true;
    };
    it.kill = () => { geo.dispose(); mat.dispose(); };
    this._add(it);
    return it;
  }

  /* ---------------- SPARKS (percikan) ---------------- */
  sparks(o = {}) {
    const pos = o.pos || [0, 1, 0];
    const count = o.count || 20;
    const color = o.color !== undefined ? o.color : 0xffd27a;
    const speed = o.speed || 3.2;
    const dir = o.dir || null;
    const spread = o.spread !== undefined ? o.spread : 1;
    const size = o.size || 0.055;
    const dur = o.dur || 0.55;
    const gravity = o.gravity !== undefined ? o.gravity : 7;
    const pA = new Float32Array(count * 3);
    const vA = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pA[i * 3] = pos[0]; pA[i * 3 + 1] = pos[1]; pA[i * 3 + 2] = pos[2];
      let dx = (Math.random() * 2 - 1) * spread;
      let dy = (Math.random() * 2 - 1) * spread;
      let dz = (Math.random() * 2 - 1) * spread;
      const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const sp = speed * (0.35 + Math.random() * 0.85);
      vA[i * 3] = dx / l * sp + (dir ? dir[0] * speed * 0.55 : 0);
      vA[i * 3 + 1] = dy / l * sp + (dir ? dir[1] * speed * 0.55 : 0);
      vA[i * 3 + 2] = dz / l * sp + (dir ? dir[2] * speed * 0.55 : 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pA, 3));
    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    let t = 0;
    const it = { root: pts, dur };
    it.update = (dt) => {
      t += dt; const k = t / dur;
      if (k >= 1) return false;
      for (let i = 0; i < count; i++) {
        vA[i * 3 + 1] -= gravity * dt;
        pA[i * 3] += vA[i * 3] * dt;
        pA[i * 3 + 1] += vA[i * 3 + 1] * dt;
        pA[i * 3 + 2] += vA[i * 3 + 2] * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 1 - k;
      mat.size = size * (1 - k * 0.45);
      return true;
    };
    it.kill = () => { geo.dispose(); mat.dispose(); };
    this._add(it);
    return it;
  }

  /* ---------------- SHOCKWAVE (gelombang tanah) ---------------- */
  shockwave(o = {}) {
    const pos = o.pos || [0, 0.04, 0.8];
    const radius = o.radius || 2.2;
    const color = o.color !== undefined ? o.color : 0xffb066;
    const dur = o.dur || 0.5;
    const width = o.width || 0.16;
    const geo = new THREE.RingGeometry(1 - width, 1, 56);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos[0], pos[1], pos[2]);
    m.scale.setScalar(0.12);
    let t = 0;
    const it = { root: m, dur };
    it.update = (dt) => {
      t += dt; const k = t / dur;
      if (k >= 1) return false;
      const e = 1 - Math.pow(1 - k, 3);
      const s = 0.12 + e * radius;
      m.scale.set(s, s, s);
      const fin = k < 0.1 ? k / 0.1 : 1;
      mat.opacity = 0.85 * (1 - k) * fin;
      return true;
    };
    it.kill = () => { geo.dispose(); mat.dispose(); };
    this._add(it);
    return it;
  }

  /* ---------------- FLASH (denyut cahaya) ---------------- */
  flash(pos = [0, 1, 0], color = 0xfff0c0, intensity = 3, dur = 0.22, distance = 7) {
    const L = new THREE.PointLight(color, 0, distance, 2);
    L.position.set(pos[0], pos[1], pos[2]);
    let t = 0;
    const it = { root: L, dur };
    it.update = (dt) => {
      t += dt; const k = t / dur;
      if (k >= 1) { L.intensity = 0; return false; }
      L.intensity = intensity * Math.pow(Math.sin(k * Math.PI), 0.7);
      return true;
    };
    it.kill = () => { if (L.dispose) L.dispose(); };
    this._add(it);
    return it;
  }

  /* ---------------- SWORD GLOW (emissive pulse) ---------------- */
  swordGlow(sword, color = 0xffffff, dur = 0.3) {
    if (!sword) return;
    const mats = [];
    sword.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive) {
        if (o.material.userData._gb === undefined) {
          o.material.userData._gb = o.material.emissive.getHex();
          o.material.userData._gbi = (typeof o.material.emissiveIntensity === 'number') ? o.material.emissiveIntensity : 1;
        }
        mats.push(o.material);
      }
    });
    if (!mats.length) return;
    const c = new THREE.Color(color);
    mats.forEach(m => { m.emissive.copy(c); m.emissiveIntensity = 1.6; });
    const restore = () => mats.forEach(m => {
      m.emissive.setHex(m.userData._gb);
      m.emissiveIntensity = m.userData._gbi;
    });
    let t = 0;
    const it = { root: null, dur };
    it.update = (dt) => {
      t += dt; const k = t / dur;
      if (k >= 1) { restore(); return false; }
      mats.forEach(m => { m.emissiveIntensity = 1.6 * (1 - k) + m.userData._gbi * k; });
      return true;
    };
    it.kill = restore;
    this._add(it);
  }

  /* ---------------- SCREEN SHAKE ---------------- */
  shake(mag = 0.1, dur = 0.25) {
    if (mag >= this.shakeMag) {
      this.shakeMag = mag; this.shakeDur = dur; this.shakeT = 0;
    }
  }
  _applyShake(dt) {
    if (!this.camera) return;
    if (this.shakeT >= this.shakeDur) {
      if (this._shakeOff.lengthSq() > 0) {
        this.camera.position.sub(this._shakeOff);
        this._shakeOff.set(0, 0, 0);
      }
      return;
    }
    this.shakeT += dt;
    const k = Math.max(0, 1 - this.shakeT / this.shakeDur);
    const m = this.shakeMag * k * k;
    this.camera.position.sub(this._shakeOff);
    this._shakeOff.set(
      (Math.random() * 2 - 1) * m,
      (Math.random() * 2 - 1) * m * 0.7,
      (Math.random() * 2 - 1) * m
    );
    this.camera.position.add(this._shakeOff);
    if (this.shakeT >= this.shakeDur) this.shakeMag = 0;
  }

  /* ---------------- UPDATE ----------------
     Catatan integrasi Forecraft: SHAKE dipisah ke updateShake(dt) dan HARUS
     dipanggil SETELAH Cam.update() di game loop — kalau ikut update() biasa,
     offset shake akan langsung tertimpa reposisi kamera. */
  updateShake(dt) { this._applyShake(dt); }
  update(dt) {
    this._updateTrail(dt);
    for (let i = this._items.length - 1; i >= 0; i--) {
      const it = this._items[i];
      if (!it.update(dt)) {
        if (it.root) this.scene.remove(it.root);
        if (it.kill) it.kill();
        this._items.splice(i, 1);
      }
    }
  }
  dispose() {
    this.killTrail();
    for (const it of this._items) {
      if (it.root) this.scene.remove(it.root);
      if (it.kill) it.kill();
    }
    this._items = [];
  }
}
window.ComboVFX = ComboVFX;
if (typeof module !== 'undefined') module.exports = ComboVFX;