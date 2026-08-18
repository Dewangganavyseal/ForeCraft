'use strict';
/* =================================================================
   FORECRAFT 3D - ENVIRONMENT: PETI HARTA (CHEST)
   File: js/environment/env_chest.js
   ================================================================= */

const Env_Chest = {
  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },

  build() {
    const g = new THREE.Group(); g.name = 'Treasure_Chest';
    const WOOD = 0x8a552f, METAL = 0x4a4a4a, GOLD = 0xd9a531;

    // Bagian Bawah Peti (Base)
    const base = this.pl(0.86, 0.44, 0.60, WOOD, 0.22);
    // Plat Pengikat Logam
    base.add(this.pl(0.88, 0.46, 0.10, METAL, 0, 0, 0.26));
    base.add(this.pl(0.88, 0.46, 0.10, METAL, 0, 0, -0.26));
    g.add(base);

    // Bagian Tutup Peti (Lid) dengan Pivot Rotasi Buka/Tutup
    const lidG = new THREE.Group();
    lidG.position.set(0, 0.44, -0.28); // Pivot belakang

    const lid = this.pl(0.88, 0.22, 0.62, WOOD, 0.11, 0.28);
    lid.add(this.pl(0.90, 0.24, 0.12, METAL, 0, 0.28, 0.26));
    lid.add(this.pl(0.90, 0.24, 0.12, METAL, 0, 0.28, -0.26));

    // Kunci Gembok Emas
    lid.add(this.pl(0.12, 0.16, 0.06, GOLD, 0.02, 0.60, 0));
    lidG.add(lid);
    g.add(lidG);

    g.userData.lid = lidG;
    return g;
  }
};

window.Env_Chest = Env_Chest;
