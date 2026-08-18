'use strict';
/* =================================================================
FORECRAFT 3D - LEATHER ARMOR SET (BULKY RANGER EDITION)
File: js/player/armors/armor_leather.js
================================================================= */
const LeatherArmorSet = {
  tier: 'leather',
  colors: { main: 0x8a5f35, trim: 0x5d3f20, metal: 0xb08a52 },

  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },
  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },

  /* ================= HELMET — TOPI KULIT + FLAP ================= */
  buildHelmet() {
    const g = new THREE.Group();
    g.name = 'Helm_Leather';
    const C = this.colors;
    // Kubah topi kulit membulat
    g.add(this.pl(0.52, 0.20, 0.50, C.main, 0.46));
    // Pinggiran topi lebar
    g.add(this.pl(0.58, 0.07, 0.56, C.trim, 0.35));
    // Band dahi
    g.add(this.pl(0.50, 0.08, 0.08, C.trim, 0.37, 0.24));
    // Flap pelindung tengkuk
    g.add(this.pl(0.44, 0.18, 0.08, C.trim, 0.24, -0.24));
    // Flap pipi kiri-kanan
    g.add(this.pl(0.08, 0.22, 0.30, C.main, 0.26, 0, 0.24));
    g.add(this.pl(0.08, 0.22, 0.30, C.main, 0.26, 0, -0.24));
    // Tali dagu
    g.add(this.pl(0.04, 0.14, 0.04, C.trim, 0.16, 0.20, 0.14));
    g.add(this.pl(0.04, 0.14, 0.04, C.trim, 0.16, 0.20, -0.14));
    // Studs logam di pinggiran depan
    g.add(this.pl(0.05, 0.05, 0.05, C.metal, 0.36, 0.24, 0.20));
    g.add(this.pl(0.05, 0.05, 0.05, C.metal, 0.36, 0.24, -0.20));
    g.add(this.pl(0.05, 0.05, 0.05, C.metal, 0.36, 0.24, 0));
    // Puncak topi + boss logam
    g.add(this.pl(0.20, 0.08, 0.20, C.trim, 0.58));
    g.add(this.pl(0.08, 0.06, 0.08, C.metal, 0.64));
    return g;
  },

  /* ================= CHESTPLATE — ROMPI + STRAP SILANG ================= */
  buildChestplate(id = '') {
    const g = new THREE.Group();
    g.name = 'Chest_Leather';
    const C = this.colors;
    // Rompi kulit utama tebal
    g.add(this.pl(0.68, 0.34, 0.40, C.main, 0.50));
    // Lapisan perut
    g.add(this.pl(0.60, 0.22, 0.36, C.trim, 0.24));
    // Kerah leather tebal
    g.add(this.pl(0.70, 0.09, 0.42, C.trim, 0.68));
    // Strap dada menyilang
    const s1 = this.pl(0.55, 0.08, 0.03, C.trim, 0.50, 0.22); s1.rotation.z = 0.5; g.add(s1);
    const s2 = this.pl(0.55, 0.08, 0.03, C.trim, 0.50, 0.22); s2.rotation.z = -0.5; g.add(s2);
    // Gesper tengah
    g.add(this.pl(0.10, 0.10, 0.04, C.metal, 0.50, 0.225));
    // Studs berderet di perut
    for (const x of [-0.24, -0.12, 0, 0.12, 0.24]) {
      g.add(this.pl(0.04, 0.04, 0.03, C.metal, 0.30, 0.19, x));
    }
    // Tasset (jumbai rok kulit) depan
    g.add(this.pl(0.18, 0.16, 0.04, C.main, 0.10, 0.20, 0.13));
    g.add(this.pl(0.18, 0.16, 0.04, C.main, 0.10, 0.20, -0.13));
    g.add(this.pl(0.16, 0.14, 0.04, C.trim, 0.06, 0.20, 0));
    // Tasset samping
    g.add(this.pl(0.04, 0.16, 0.22, C.main, 0.14, 0, 0.32));
    g.add(this.pl(0.04, 0.16, 0.22, C.main, 0.14, 0, -0.32));
    // Panel punggung
    g.add(this.pl(0.56, 0.28, 0.05, C.trim, 0.46, -0.19));
    // Sabuk pinggang besar
    g.add(this.pl(0.62, 0.08, 0.38, C.trim, 0.12));
    g.add(this.pl(0.09, 0.09, 0.04, C.metal, 0.12, 0.20));
    // Varian cloak_swift: jubah
    if (id === 'cloak_swift') {
      const cape = this.pl(0.70, 0.60, 0.04, 0x8fe0ff, 0.30, -0.24);
      cape.rotation.x = 0.12;
      g.add(cape);
    }
    return g;
  },

  /* ================= PAULDRON — BANTALAN KULIT + STRAP ================= */
  buildPauldron() {
    const g = new THREE.Group();
    g.name = 'Pauldron_Leather';
    const C = this.colors;
    // Bantalan bahu membulat
    g.add(this.pl(0.30, 0.14, 0.30, C.main, -0.02));
    g.add(this.pl(0.26, 0.07, 0.26, C.trim, -0.10));
    // Lilitan strap
    g.add(this.pl(0.32, 0.05, 0.06, C.trim, -0.02, 0, 0.12));
    g.add(this.pl(0.32, 0.05, 0.06, C.trim, -0.02, 0, -0.12));
    // Studs
    g.add(this.pl(0.05, 0.05, 0.05, C.metal, 0.06, 0, 0.12));
    g.add(this.pl(0.05, 0.05, 0.05, C.metal, 0.06, 0, -0.12));
    g.add(this.pl(0.05, 0.05, 0.05, C.metal, 0.06, 0.12, 0));
    return g;
  },

  /* ================= BOOTS — BOT LEMBUT + CUFF LIPAT ================= */
  buildBoots() {
    const g = new THREE.Group();
    g.name = 'Boots_Leather';
    const C = this.colors;
    // Batang bot
    g.add(this.pl(0.25, 0.24, 0.25, C.main, -0.16));
    // Cuff terlipat di atas
    g.add(this.pl(0.27, 0.08, 0.27, C.trim, -0.04));
    // Kaki
    g.add(this.pl(0.26, 0.12, 0.32, C.trim, -0.32, 0.04));
    // Ujung kaki membulat
    g.add(this.pl(0.20, 0.07, 0.10, C.main, -0.33, 0.15));
    // Lilitan pergelangan
    g.add(this.pl(0.23, 0.05, 0.23, C.trim, -0.14));
    g.add(this.pl(0.23, 0.05, 0.23, C.trim, -0.22));
    // Sol
    g.add(this.pl(0.24, 0.04, 0.30, 0x241a10, -0.37, 0.04));
    return g;
  }
};
window.LeatherArmorSet = LeatherArmorSet;