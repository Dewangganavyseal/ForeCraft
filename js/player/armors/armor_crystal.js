'use strict';
/* =================================================================
FORECRAFT 3D - CRYSTAL ARMOR SET (BULKY SHARD EDITION)
File: js/player/armors/armor_crystal.js
================================================================= */
const CrystalArmorSet = {
  tier: 'crystal',
  colors: { main: 0x7fd8ff, trim: 0x3f8fbf, metal: 0xd6f4ff },

  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },
  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },
  // Pecahan kristal: phong + emissive + transparan
  shard(w, h, d, color, emissive = 0x2b6f8f, opacity = 0.9) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial({
      color, emissive, transparent: opacity < 1, opacity, shininess: 110
    }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },

  /* ================= HELMET — MAHKOTA KRISTAL ================= */
  buildHelmet(id = '') {
    const g = new THREE.Group();
    g.name = 'Helm_Crystal';
    const C = this.colors;
    const glow = id === 'helm_thorns' ? 0xff6bd6 : 0x2b6f8f;
    // Kubah
    g.add(this.pl(0.52, 0.20, 0.50, C.main, 0.46));
    // Rim
    g.add(this.pl(0.56, 0.08, 0.54, C.metal, 0.34));
    // Band dahi
    g.add(this.pl(0.50, 0.07, 0.06, C.trim, 0.36, 0.25));
    // Kristal utama tengah (tanduk kristal)
    const horn = this.shard(0.10, 0.34, 0.10, C.metal, glow);
    horn.position.set(0, 0.64, 0.06); horn.rotation.x = -0.1; g.add(horn);
    // Kristal samping kiri-kanan
    const sL = this.shard(0.07, 0.22, 0.07, C.main, glow);
    sL.position.set(0.18, 0.58, 0); sL.rotation.z = -0.3; g.add(sL);
    const sR = this.shard(0.07, 0.22, 0.07, C.main, glow);
    sR.position.set(-0.18, 0.58, 0); sR.rotation.z = 0.3; g.add(sR);
    // Kristal belakang
    const sB = this.shard(0.08, 0.20, 0.08, C.main, glow);
    sB.position.set(0, 0.54, -0.18); sB.rotation.x = 0.35; g.add(sB);
    // Pipi
    g.add(this.pl(0.08, 0.22, 0.34, C.trim, 0.24, 0, 0.24));
    g.add(this.pl(0.08, 0.22, 0.34, C.trim, 0.24, 0, -0.24));
    // Selubung visor transparan (mata tetap terlihat samar)
    const veil = this.shard(0.44, 0.10, 0.03, C.metal, glow, 0.35);
    veil.position.set(0, 0.22, 0.25); g.add(veil);
    // Varian helm_thorns: duri ekstra
    if (id === 'helm_thorns') {
      for (const x of [-0.24, 0.24]) {
        const t = this.shard(0.05, 0.16, 0.05, C.metal, glow);
        t.position.set(x, 0.50, 0.16); t.rotation.z = x > 0 ? -0.5 : 0.5; g.add(t);
      }
    }
    return g;
  },

  /* ================= CHESTPLATE — FACET + INTI CAHAYA ================= */
  buildChestplate(id = '') {
    const g = new THREE.Group();
    g.name = 'Chest_Crystal';
    const C = this.colors;
    const glow = 0x2b6f8f;
    // Dada utama
    g.add(this.pl(0.70, 0.34, 0.40, C.main, 0.50));
    // Kerah
    g.add(this.pl(0.72, 0.07, 0.42, C.metal, 0.68));
    // Perut
    g.add(this.pl(0.60, 0.22, 0.36, C.trim, 0.24));
    // Garis cahaya tengah (seam)
    const seam = this.shard(0.06, 0.30, 0.03, C.metal, 0x7dffb0);
    seam.position.set(0, 0.50, 0.215); g.add(seam);
    // Plate facet diagonal
    const fL = this.pl(0.24, 0.22, 0.04, C.metal, 0.54, 0.215, 0.16);
    fL.rotation.z = 0.12; g.add(fL);
    const fR = this.pl(0.24, 0.22, 0.04, C.metal, 0.54, 0.215, -0.16);
    fR.rotation.z = -0.12; g.add(fR);
    // Kristal samping menonjol
    const cL = this.shard(0.08, 0.18, 0.08, C.main, glow);
    cL.position.set(0.38, 0.54, 0); cL.rotation.z = -0.2; g.add(cL);
    const cR = this.shard(0.08, 0.18, 0.08, C.main, glow);
    cR.position.set(-0.38, 0.54, 0); cR.rotation.z = 0.2; g.add(cR);
    // Shard rok depan
    for (const x of [-0.14, 0, 0.14]) {
      const s = this.pl(0.14, 0.16, 0.04, C.trim, 0.08, 0.20, x);
      s.rotation.x = 0.15; g.add(s);
    }
    // Kristal punggung
    const back = this.shard(0.10, 0.24, 0.10, C.main, glow);
    back.position.set(0, 0.52, -0.22); back.rotation.x = 0.25; g.add(back);
    // Varian plate_regen: inti kristal hijau
    if (id === 'plate_regen') {
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x7dffb0 }));
      core.position.set(0, 0.52, 0.235);
      g.add(core);
    }
    return g;
  },

  /* ================= PAULDRON — GUGUSAN KRISTAL ================= */
  buildPauldron() {
    const g = new THREE.Group();
    g.name = 'Pauldron_Crystal';
    const C = this.colors;
    const glow = 0x2b6f8f;
    // Basis
    g.add(this.pl(0.32, 0.14, 0.32, C.main, -0.02));
    g.add(this.pl(0.28, 0.06, 0.28, C.trim, -0.11));
    // Gugusan pecahan kristal
    const a = this.shard(0.09, 0.26, 0.09, C.metal, glow);
    a.position.set(0, 0.10, 0); a.rotation.x = 0.15; g.add(a);
    const b = this.shard(0.07, 0.18, 0.07, C.main, glow);
    b.position.set(0.10, 0.05, 0.08); b.rotation.z = -0.25; b.rotation.x = 0.2; g.add(b);
    const c = this.shard(0.07, 0.18, 0.07, C.main, glow);
    c.position.set(-0.10, 0.05, -0.08); c.rotation.z = 0.25; c.rotation.x = -0.2; g.add(c);
    return g;
  },

  /* ================= BOOTS — KRISTAL GREAVES ================= */
  buildBoots() {
    const g = new THREE.Group();
    g.name = 'Boots_Crystal';
    const C = this.colors;
    const glow = 0x2b6f8f;
    // Greaves kristal
    g.add(this.pl(0.25, 0.24, 0.25, C.main, -0.16));
    // Garis cahaya depan
    const seam = this.shard(0.05, 0.18, 0.03, C.metal, 0x7dffb0);
    seam.position.set(0, -0.16, 0.135); g.add(seam);
    // Cuff
    g.add(this.pl(0.27, 0.06, 0.27, C.metal, -0.03));
    // Kaki
    g.add(this.pl(0.26, 0.12, 0.32, C.trim, -0.32, 0.04));
    // Kristal ujung kaki
    const toe = this.shard(0.08, 0.10, 0.08, C.metal, glow);
    toe.position.set(0, -0.30, 0.17); toe.rotation.x = -0.4; g.add(toe);
    // Sol
    g.add(this.pl(0.24, 0.04, 0.30, 0x2a5a70, -0.37, 0.04));
    return g;
  }
};
window.CrystalArmorSet = CrystalArmorSet;