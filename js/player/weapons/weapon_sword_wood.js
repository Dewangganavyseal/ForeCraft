'use strict';
/* =================================================================
   FORECRAFT 3D - WOODEN SWORD
   File: js/player/weapons/weapon_sword_wood.js
   ================================================================= */

const WeaponSwordWood = {
  id: 'sword_wood',
  name: 'Pedang Kayu',
  rarity: 'common',
  colors: { blade: 0xc2a06a, trim: 0x8a6a3f, gem: 0x8a6a3f, rune: 0x5c4228, emissive: 0x000000 },

  box(w, h, d, color, emissive = 0x000000) {
    const mat = new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true; return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0, emissive = 0x000000) {
    const m = this.box(w, h, d, color, emissive);
    m.position.set(x, y, z); return m;
  },

  build() {
    const W = this.colors;
    const sword = new THREE.Group();
    sword.name = 'Weapon_sword_wood';

    // Pommel & Gagang Kayu
    sword.add(this.pl(0.07, 0.05, 0.07, 0x2f2413, 0.30));
    sword.add(this.pl(0.06, 0.04, 0.06, W.trim, 0.27));
    sword.add(this.pl(0.055, 0.16, 0.055, 0x4a3520, 0.22));
    for (let i = 0; i < 4; i++) {
      sword.add(this.pl(0.065, 0.022, 0.065, 0x2f2413, 0.29 - i * 0.045));
    }

    // Guard Kayu
    sword.add(this.pl(0.28, 0.045, 0.09, W.trim, 0.14));
    sword.add(this.pl(0.10, 0.07, 0.10, W.trim, 0.14));

    // Bilah Kayu Terpoles
    // BUGFIX celah: bilah dulu berhenti di y=-0.06 padahal ricasso mulai y=0.04
    // (terpisah 0.10). Bilah kini diperpanjang ke atas sampai masuk ke ricasso;
    // ujung tip tetap di y=-0.94.
    const bladeG = new THREE.BoxGeometry(0.09, 1.01, 0.03);
    bladeG.translate(0, -0.435, 0);
    const blade = new THREE.Mesh(bladeG, new THREE.MeshLambertMaterial({ color: W.blade }));
    blade.castShadow = true;
    sword.add(blade);

    // Ricasso & Tip
    sword.add(this.pl(0.105, 0.08, 0.038, W.trim, 0.08));
    sword.add(this.pl(0.07, 0.06, 0.026, W.blade, -0.96));
    sword.add(this.pl(0.04, 0.05, 0.02, 0xdcc090, -1.01));

    sword.position.set(0, -0.31, 0.02);
    sword.rotation.x = -Math.PI / 2;
    return sword;
  }
};

window.WeaponSwordWood = WeaponSwordWood;
