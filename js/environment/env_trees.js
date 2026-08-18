'use strict';
/* =================================================================
   FORECRAFT 3D - ENVIRONMENT: POHON (TREES)
   File: js/environment/env_trees.js
   ================================================================= */

const Env_Trees = {
  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },

  buildOakTree() {
    const g = new THREE.Group(); g.name = 'Tree_Oak';
    const WOOD = 0x5a3d28, LEAF = 0x3d782e, LEAF_D = 0x2b5920;
    // Batang
    g.add(this.pl(0.8, 4.0, 0.8, WOOD, 2.0));
    // Dedaunan Berlapis
    g.add(this.pl(3.2, 1.4, 3.2, LEAF, 4.2));
    g.add(this.pl(2.6, 1.4, 2.6, LEAF_D, 5.2));
    g.add(this.pl(1.6, 1.2, 1.6, LEAF, 6.2));
    return g;
  },

  buildPineTree() {
    const g = new THREE.Group(); g.name = 'Tree_Pine';
    const WOOD = 0x3e2b1c, LEAF = 0x1f4d33, LEAF_D = 0x153624;
    // Batang
    g.add(this.pl(0.6, 5.0, 0.6, WOOD, 2.5));
    // Kerucut Daun Pinus
    g.add(this.pl(3.6, 1.0, 3.6, LEAF, 3.5));
    g.add(this.pl(2.8, 1.0, 2.8, LEAF_D, 4.4));
    g.add(this.pl(2.0, 1.0, 2.0, LEAF, 5.3));
    g.add(this.pl(1.2, 1.2, 1.2, LEAF_D, 6.2));
    return g;
  },

  buildBirchTree() {
    const g = new THREE.Group(); g.name = 'Tree_Birch';
    const WOOD = 0xdcd6cd, LEAF = 0x76a33e;
    // Batang Putih dengan Bercak Hitam
    const trunk = this.pl(0.6, 4.5, 0.6, WOOD, 2.25);
    trunk.add(this.pl(0.64, 0.2, 0.64, 0x222222, -0.8));
    trunk.add(this.pl(0.64, 0.2, 0.64, 0x222222, 0.4));
    g.add(trunk);
    // Daun Birch Hijau Cerah
    g.add(this.pl(2.8, 1.6, 2.8, LEAF, 4.6));
    g.add(this.pl(1.8, 1.4, 1.8, LEAF, 5.8));
    return g;
  },

  buildPalmTree() {
    const g = new THREE.Group(); g.name = 'Tree_Palm';
    const WOOD = 0x7a5a3a, LEAF = 0x4f8a28;
    // Batang Melengkung
    for (let i = 0; i < 5; i++) {
      const seg = this.pl(0.7 - i * 0.06, 1.0, 0.7 - i * 0.06, WOOD, i * 0.9 + 0.5, i * 0.12, 0);
      seg.rotation.z = -0.05 * i;
      g.add(seg);
    }
    // Daun Palem Menjuntai
    const topY = 4.8;
    for (let a = 0; a < 6; a++) {
      const leaf = this.pl(0.5, 0.1, 2.2, LEAF, topY, 1.0, 0);
      leaf.rotation.y = (a * Math.PI) / 3;
      leaf.rotation.x = 0.35;
      g.add(leaf);
    }
    return g;
  }
};

window.Env_Trees = Env_Trees;
