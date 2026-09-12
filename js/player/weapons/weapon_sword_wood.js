'use strict';
/* =================================================================
   FORECRAFT 3D - WOODEN / ELVEN LEAFBLADE (VOXEL REWORK)
   File: js/player/weapons/weapon_sword_wood.js
   Pedang kayu ukir elf dengan bilah lentur berbentuk daun berurat emas.
   ================================================================= */

const WeaponSwordWood = {
  id: 'sword_wood',
  name: 'Pedang Kayu Elf',
  rarity: 'common',
  colors: { blade: 0xc2a06a, edge: 0xdcc090, wood: 0x5a3d24, gold: 0xb89248, leaf: 0x5f9e50 },

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

    // Pommel kuncup daun kayu
    sword.add(this.pl(0.065, 0.05, 0.065, W.wood, 0.32));
    sword.add(this.pl(0.04, 0.04, 0.04, W.leaf, 0.35));

    // Grip kayu berbalut serat
    sword.add(this.pl(0.05, 0.18, 0.05, W.wood, 0.22));
    for (let i = 0; i < 4; i++) {
      sword.add(this.pl(0.06, 0.02, 0.06, W.gold, 0.28 - i * 0.04));
    }

    // Guard sulur dahan melengkung
    sword.add(this.pl(0.26, 0.045, 0.08, W.wood, 0.12));
    sword.add(this.pl(0.05, 0.10, 0.04, W.leaf, 0.15, 0, 0.11));
    sword.add(this.pl(0.05, 0.10, 0.04, W.leaf, 0.15, 0, -0.11));
    sword.add(this.pl(0.04, 0.04, 0.04, W.gold, 0.12, 0, 0));

    // Bilah daun kayu keras berurat emas
    const bladeG = new THREE.BoxGeometry(0.08, 0.96, 0.028);
    bladeG.translate(0, -0.42, 0);
    const blade = new THREE.Mesh(bladeG, new THREE.MeshLambertMaterial({ color: W.blade }));
    blade.castShadow = true;
    sword.add(blade);

    // Punggung bilah & urat daun
    sword.add(this.pl(0.02, 0.65, 0.034, W.gold, -0.28));
    sword.add(this.pl(0.015, 0.86, 0.030, W.edge, -0.40, 0, 0.038));
    sword.add(this.pl(0.09, 0.08, 0.034, W.wood, 0.06));

    // Ujung bilah daun meruncing
    sword.add(this.pl(0.06, 0.08, 0.024, W.blade, -0.94));
    sword.add(this.pl(0.035, 0.06, 0.02, W.edge, -1.00));
    sword.add(this.pl(0.015, 0.04, 0.016, W.gold, -1.04));

    sword.position.set(0, -0.31, 0.02);
    sword.rotation.x = -Math.PI / 2;
    return sword;
  }
};

window.WeaponSwordWood = WeaponSwordWood;
if (typeof module !== 'undefined') module.exports = WeaponSwordWood;
