'use strict';
/* =================================================================
FORECRAFT 3D - IRON ARMOR SET (BULKY KNIGHT EDITION)
File: js/player/armors/armor_iron.js
================================================================= */
const IronArmorSet = {
  tier: 'iron',
  colors: { main: 0x9aa2ac, trim: 0x6d747d, metal: 0xd2d9e2 },

  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },
  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },

  /* ================= HELMET — FULL HELM + VISOR SLIT ================= */
  buildHelmet(id = '') {
    const g = new THREE.Group();
    g.name = 'Helm_Iron';
    const C = this.colors;
    // Kubah besar
    g.add(this.pl(0.54, 0.22, 0.52, C.main, 0.46));
    // Rim keliling
    g.add(this.pl(0.56, 0.09, 0.54, C.trim, 0.33));
    // Plate dahi (di atas celah mata)
    g.add(this.pl(0.48, 0.14, 0.10, C.metal, 0.37, 0.24));
    // Visor bawah (di bawah celah mata → mata tetap terlihat)
    g.add(this.pl(0.48, 0.16, 0.10, C.main, 0.08, 0.24));
    // Lubang napas di visor
    for (const x of [-0.08, 0, 0.08]) {
      g.add(this.pl(0.03, 0.03, 0.02, 0x3a3f45, 0.10, 0.295, x));
    }
    // Plate pipi kiri-kanan
    g.add(this.pl(0.08, 0.24, 0.40, C.trim, 0.26, 0, 0.25));
    g.add(this.pl(0.08, 0.24, 0.40, C.trim, 0.26, 0, -0.25));
    // Pelindung tengkuk
    g.add(this.pl(0.42, 0.14, 0.08, C.trim, 0.18, -0.24));
    // Jambul tengah
    g.add(this.pl(0.08, 0.08, 0.46, C.metal, 0.59));
    // Rivet samping
    g.add(this.pl(0.04, 0.04, 0.04, C.metal, 0.44, 0, 0.27));
    g.add(this.pl(0.04, 0.04, 0.04, C.metal, 0.44, 0, -0.27));
    // Varian helm_guard: pinggiran lebar
    if (id === 'helm_guard') {
      g.add(this.pl(0.60, 0.05, 0.58, 0xc9d2dc, 0.38));
    }
    return g;
  },

  /* ================= CHESTPLATE — PLATE BAJA + FAULDS ================= */
  buildChestplate() {
    const g = new THREE.Group();
    g.name = 'Chest_Iron';
    const C = this.colors;
    // Dada utama
    g.add(this.pl(0.72, 0.36, 0.42, C.main, 0.50));
    // Rim bahu
    g.add(this.pl(0.76, 0.08, 0.44, C.metal, 0.70));
    // Perut
    g.add(this.pl(0.62, 0.22, 0.38, C.trim, 0.24));
    // Sternum tengah
    g.add(this.pl(0.14, 0.30, 0.04, C.metal, 0.52, 0.22));
    // Plate pektoral
    g.add(this.pl(0.22, 0.20, 0.04, C.metal, 0.55, 0.22, 0.16));
    g.add(this.pl(0.22, 0.20, 0.04, C.metal, 0.55, 0.22, -0.16));
    // Rivet deretan atas
    for (const x of [-0.28, -0.14, 0, 0.14, 0.28]) {
      g.add(this.pl(0.04, 0.04, 0.03, C.metal, 0.66, 0.225, x));
    }
    // Plate samping
    g.add(this.pl(0.06, 0.28, 0.32, C.trim, 0.46, 0, 0.37));
    g.add(this.pl(0.06, 0.28, 0.32, C.trim, 0.46, 0, -0.37));
    // Faulds (rok baja) bertingkat
    g.add(this.pl(0.58, 0.08, 0.36, C.main, 0.12));
    g.add(this.pl(0.54, 0.08, 0.34, C.trim, 0.04));
    g.add(this.pl(0.50, 0.08, 0.32, C.main, -0.04));
    // Punggung
    g.add(this.pl(0.60, 0.32, 0.06, C.trim, 0.48, -0.20));
    return g;
  },

  /* ================= PAULDRON — KUBAH BAJA + LAME BERTINGKAT ================= */
  buildPauldron() {
    const g = new THREE.Group();
    g.name = 'Pauldron_Iron';
    const C = this.colors;
    // Kubah bahu
    g.add(this.pl(0.34, 0.16, 0.34, C.main, -0.02));
    // Plate atas
    g.add(this.pl(0.36, 0.06, 0.36, C.metal, 0.08));
    // Lame bertingkat ke bawah
    g.add(this.pl(0.30, 0.07, 0.30, C.trim, -0.13));
    g.add(this.pl(0.26, 0.07, 0.26, C.main, -0.21));
    // Rivet atas
    g.add(this.pl(0.04, 0.04, 0.04, C.metal, 0.10, 0, 0.14));
    g.add(this.pl(0.04, 0.04, 0.04, C.metal, 0.10, 0, -0.14));
    // Pelindung depan
    g.add(this.pl(0.26, 0.10, 0.05, C.trim, -0.04, 0.17));
    return g;
  },

  /* ================= BOOTS — SABATON BAJA ================= */
  buildBoots() {
    const g = new THREE.Group();
    g.name = 'Boots_Iron';
    const C = this.colors;
    // Greaves
    g.add(this.pl(0.26, 0.26, 0.26, C.main, -0.16));
    // Cuff atas
    g.add(this.pl(0.28, 0.07, 0.28, C.metal, -0.02));
    // Kaki
    g.add(this.pl(0.27, 0.13, 0.34, C.trim, -0.32, 0.04));
    // Toe cap baja
    g.add(this.pl(0.23, 0.08, 0.12, C.metal, -0.34, 0.18));
    // Plate samping
    g.add(this.pl(0.04, 0.18, 0.22, C.trim, -0.18, 0, 0.14));
    g.add(this.pl(0.04, 0.18, 0.22, C.trim, -0.18, 0, -0.14));
    // Tumit
    g.add(this.pl(0.20, 0.09, 0.06, C.trim, -0.30, -0.13));
    // Sol
    g.add(this.pl(0.25, 0.05, 0.32, 0x3d434b, -0.38, 0.04));
    return g;
  }
};
window.IronArmorSet = IronArmorSet;