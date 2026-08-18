'use strict';
/* =================================================================
FORECRAFT 3D - GOLD ARMOR SET (BULKY EDITION)
File: js/player/armors/armor_gold.js
================================================================= */
const GoldArmorSet = {
  tier: 'gold',
  colors: { main: 0xd9b23a, trim: 0x9c7c1e, metal: 0xffe07a },

  box(w, h, d, color) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z);
    return m;
  },

  /* ================= HELMET — BULKY ================= */
  buildHelmet() {
    const g = new THREE.Group();
    g.name = 'Helm_Gold';
    const C = this.colors;

    // Kubah utama lebih besar & tinggi
    g.add(this.pl(0.54, 0.22, 0.52, C.main, 0.46));
    // Rim bawah tebal
    g.add(this.pl(0.58, 0.10, 0.56, C.trim, 0.34));
    // Brow ridge / alis pelindung
    g.add(this.pl(0.50, 0.08, 0.12, C.metal, 0.38, 0.22));
    // Face guard tengah
    g.add(this.pl(0.08, 0.24, 0.12, C.metal, 0.28, 0.22));
    // Cheek guard kiri-kanan lebih tebal
    g.add(this.pl(0.10, 0.28, 0.38, C.trim, 0.22, 0, 0.24));
    g.add(this.pl(0.10, 0.28, 0.38, C.trim, 0.22, 0, -0.24));
    // Neck guard belakang
    g.add(this.pl(0.44, 0.14, 0.10, C.trim, 0.20, -0.24));
    // Puncak helm / crest
    g.add(this.pl(0.08, 0.20, 0.44, C.metal, 0.60));
    // Tanduk kiri-kanan lebih besar
    g.add(this.pl(0.07, 0.20, 0.07, C.metal, 0.62, 0, 0.20));
    g.add(this.pl(0.07, 0.20, 0.07, C.metal, 0.62, 0, -0.20));
    // Ujung tanduk lebih kecil di atas
    g.add(this.pl(0.05, 0.12, 0.05, C.metal, 0.76, 0, 0.22));
    g.add(this.pl(0.05, 0.12, 0.05, C.metal, 0.76, 0, -0.22));
    // Side plate tambahan untuk kesan layered
    g.add(this.pl(0.12, 0.10, 0.20, C.main, 0.42, 0, 0.28));
    g.add(this.pl(0.12, 0.10, 0.20, C.main, 0.42, 0, -0.28));

    return g;
  },

  /* ================= CHESTPLATE — BULKY ================= */
  buildChestplate() {
    const g = new THREE.Group();
    g.name = 'Chest_Gold';
    const C = this.colors;

    // Plate dada utama lebih lebar & tebal
    g.add(this.pl(0.72, 0.34, 0.42, C.main, 0.50));
    // Plate perut bawah
    g.add(this.pl(0.64, 0.24, 0.38, C.trim, 0.24));
    // Rim atas bahu
    g.add(this.pl(0.76, 0.08, 0.44, C.metal, 0.68));
    // Rim tengah pinggang
    g.add(this.pl(0.68, 0.06, 0.40, C.metal, 0.34));
    // Rim bawah
    g.add(this.pl(0.60, 0.06, 0.36, C.metal, 0.10));
    // Sternum / plate tengah dada
    g.add(this.pl(0.16, 0.30, 0.04, C.metal, 0.52, 0.22));
    // Pec plate kiri-kanan lebih menonjol
    g.add(this.pl(0.24, 0.22, 0.04, C.metal, 0.54, 0.22, 0.14));
    g.add(this.pl(0.24, 0.22, 0.04, C.metal, 0.54, 0.22, -0.14));
    // Side rib plates
    g.add(this.pl(0.06, 0.26, 0.30, C.trim, 0.44, 0, 0.36));
    g.add(this.pl(0.06, 0.26, 0.30, C.trim, 0.44, 0, -0.36));
    // Belly segmented plates
    g.add(this.pl(0.40, 0.08, 0.04, C.metal, 0.22, 0.20));
    g.add(this.pl(0.36, 0.08, 0.04, C.metal, 0.14, 0.20));
    // Back plate
    g.add(this.pl(0.60, 0.30, 0.06, C.trim, 0.48, -0.20));
    // Collar guard
    g.add(this.pl(0.30, 0.10, 0.10, C.metal, 0.72, 0.10));
    g.add(this.pl(0.30, 0.10, 0.10, C.metal, 0.72, -0.10));

    return g;
  },

  /* ================= PAULDRON — BULKY ================= */
  buildPauldron() {
    const g = new THREE.Group();
    g.name = 'Pauldron_Gold';
    const C = this.colors;

    // Main shoulder dome lebih besar
    g.add(this.pl(0.34, 0.16, 0.34, C.main, -0.02));
    // Top ridge
    g.add(this.pl(0.28, 0.08, 0.28, C.metal, 0.08));
    // Rim bawah
    g.add(this.pl(0.30, 0.06, 0.30, C.trim, -0.12));
    // Side flare kiri-kanan
    g.add(this.pl(0.08, 0.14, 0.24, C.metal, 0.0, 0, 0.18));
    g.add(this.pl(0.08, 0.14, 0.24, C.metal, 0.0, 0, -0.18));
    // Front lip
    g.add(this.pl(0.26, 0.08, 0.06, C.trim, -0.04, 0.16));
    // Spike kecil di atas
    g.add(this.pl(0.06, 0.10, 0.06, C.metal, 0.14));

    return g;
  },

  /* ================= BOOTS — BULKY ================= */
  buildBoots(id = '') {
    const g = new THREE.Group();
    g.name = 'Boots_Gold';
    const C = this.colors;

    // Shin guard lebih besar
    g.add(this.pl(0.26, 0.26, 0.26, C.main, -0.16));
    // Foot plate lebih lebar
    g.add(this.pl(0.28, 0.14, 0.34, C.trim, -0.32, 0.04));
    // Toe cap
    g.add(this.pl(0.22, 0.08, 0.12, C.metal, -0.34, 0.16));
    // Ankle guard
    g.add(this.pl(0.24, 0.08, 0.24, C.metal, -0.04));
    // Side plates
    g.add(this.pl(0.04, 0.18, 0.20, C.trim, -0.18, 0, 0.14));
    g.add(this.pl(0.04, 0.18, 0.20, C.trim, -0.18, 0, -0.14));
    // Heel guard
    g.add(this.pl(0.20, 0.10, 0.06, C.trim, -0.30, -0.12));
    // Sole lebih tebal
    g.add(this.pl(0.26, 0.05, 0.32, C.metal, -0.38, 0.04));

    // Varian boots_greed dengan glow plate
    if (id === 'boots_greed') {
      g.add(this.pl(0.30, 0.05, 0.36, 0xffd24d, -0.40, 0.04));
    }

    return g;
  }
};

window.GoldArmorSet = GoldArmorSet;