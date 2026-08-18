'use strict';
/* =================================================================
   FORECRAFT 3D - ENVIRONMENT: API UNGGUN (CAMPFIRE)
   File: js/environment/env_campfire.js
   ================================================================= */

const Env_Campfire = {
  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; m.receiveShadow = true; return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },

  build() {
    const g = new THREE.Group(); g.name = 'Campfire';
    const STONE = 0x6e737a, WOOD = 0x4a2e19, ASH = 0x222222;

    // Abu & Arang Dasar
    g.add(this.pl(1.2, 0.08, 1.2, ASH, 0.04));

    // Lingkaran Batu Pelindung Api
    const count = 8;
    for (let i = 0; i < count; i++) {
      const ang = (i * Math.PI * 2) / count;
      const rock = this.pl(0.32, 0.22, 0.32, STONE, 0.11, Math.cos(ang) * 0.55, Math.sin(ang) * 0.55);
      rock.rotation.y = ang;
      g.add(rock);
    }

    // Kayu Bakar Bersilang
    for (let i = 0; i < 4; i++) {
      const log = this.pl(0.85, 0.16, 0.16, WOOD, 0.18, 0, 0);
      log.rotation.y = (i * Math.PI) / 4;
      log.rotation.z = 0.15 * (i % 2 === 0 ? 1 : -1);
      g.add(log);
    }

    // Api & Bara Bercahaya
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a18, transparent: true, opacity: 0.9 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffe640, transparent: true, opacity: 0.95 });

    const flame1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.32), fireMat);
    flame1.position.set(0, 0.38, 0); flame1.rotation.y = Math.PI / 4;
    g.add(flame1);

    const flame2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), coreMat);
    flame2.position.set(0, 0.30, 0);
    g.add(flame2);

    return g;
  }
};

window.Env_Campfire = Env_Campfire;
