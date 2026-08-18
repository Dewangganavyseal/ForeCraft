'use strict';
/* =================================================================
   FORECRAFT 3D - ENVIRONMENT: BANGUNAN (STRUCTURES)
   File: js/environment/env_structures.js
   ================================================================= */

const Env_Structures = {
  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },

  buildVillageHouse() {
    const g = new THREE.Group(); g.name = 'Village_House';
    const WOOD = 0x6e4a2d, PLANK = 0x8a633f, ROOF = 0x4a2a1a, STONE = 0x6e737a;

    // Pondasi Batu
    g.add(this.pl(4.6, 0.4, 4.6, STONE, 0.2));

    // Dinding Kayu
    g.add(this.pl(4.2, 2.8, 4.2, PLANK, 1.8));

    // Pilar Sudut Kayu Solid
    for (const x of [2.0, -2.0]) {
      for (const z of [2.0, -2.0]) {
        g.add(this.pl(0.6, 3.2, 0.6, WOOD, 1.8, z, x));
      }
    }

    // Pintu & Jendela
    g.add(this.pl(1.0, 1.8, 0.1, 0x3b2413, 1.3, 2.12, 0)); // Pintu
    g.add(this.pl(0.8, 0.8, 0.1, 0x8fe0ff, 2.0, 2.12, 1.2)); // Jendela kaca

    // Atap Segitiga Piramida
    g.add(this.pl(4.8, 0.6, 4.8, ROOF, 3.4));
    g.add(this.pl(3.8, 0.6, 3.8, ROOF, 3.9));
    g.add(this.pl(2.6, 0.6, 2.6, ROOF, 4.4));
    g.add(this.pl(1.4, 0.6, 1.4, ROOF, 4.9));

    return g;
  },

  buildWatchTower() {
    const g = new THREE.Group(); g.name = 'Watch_Tower';
    const WOOD = 0x5a3b22, PLANK = 0x7c5432, ROOF = 0x3d2012;

    // 4 Tiang Tinggi
    for (const x of [1.4, -1.4]) {
      for (const z of [1.4, -1.4]) {
        g.add(this.pl(0.4, 7.0, 0.4, WOOD, 3.5, z, x));
      }
    }

    // Tangga & Palang Penguat
    for (let y = 1.5; y <= 5.5; y += 1.5) {
      g.add(this.pl(3.2, 0.2, 0.2, WOOD, y, 1.4, 0));
      g.add(this.pl(3.2, 0.2, 0.2, WOOD, y, -1.4, 0));
    }

    // Platform Pengawas Atas
    g.add(this.pl(3.6, 0.4, 3.6, PLANK, 6.8));
    // Pagar Pembatas
    g.add(this.pl(3.6, 0.8, 0.1, WOOD, 7.3, 1.7, 0));
    g.add(this.pl(3.6, 0.8, 0.1, WOOD, 7.3, -1.7, 0));
    g.add(this.pl(0.1, 0.8, 3.6, WOOD, 7.3, 0, 1.7));
    g.add(this.pl(0.1, 0.8, 3.6, WOOD, 7.3, 0, -1.7));

    // Atap Menara
    g.add(this.pl(4.2, 0.5, 4.2, ROOF, 8.8));
    g.add(this.pl(2.8, 0.5, 2.8, ROOF, 9.3));
    g.add(this.pl(1.4, 0.6, 1.4, ROOF, 9.8));

    return g;
  }
};

window.Env_Structures = Env_Structures;
