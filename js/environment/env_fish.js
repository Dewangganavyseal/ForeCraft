'use strict';
/* =================================================================
   FORECRAFT 3D - ENVIRONMENT: IKAN (FISH)
   File: js/environment/env_fish.js
   ================================================================= */

const Env_Fish = {
  box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true; return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color);
    m.position.set(x, y, z); return m;
  },

  build() {
    const g = new THREE.Group(); g.name = 'Fish';
    const BLUE = 0x4a9fd9, BLUE_L = 0x8fe0ff, FIN = 0xffa040;

    // Badan Ikan
    const body = this.pl(0.12, 0.22, 0.48, BLUE, 0);
    body.add(this.pl(0.13, 0.10, 0.44, BLUE_L, -0.06, 0, 0)); // Perut ikan terang
    g.add(body);

    // Mata Ikan
    g.add(this.pl(0.14, 0.04, 0.04, 0x111111, 0.04, 0.16, 0));

    // Sirip Punggung
    g.add(this.pl(0.02, 0.12, 0.18, FIN, 0.16, -0.04, 0));

    // Sirip Samping Kiri & Kanan
    const finL = this.pl(0.12, 0.02, 0.10, FIN, -0.04, 0.06, 0.10); finL.rotation.z = 0.3; g.add(finL);
    const finR = this.pl(0.12, 0.02, 0.10, FIN, -0.04, 0.06, -0.10); finR.rotation.z = -0.3; g.add(finR);

    // Ekor Ikan (Tail Fin) dengan Pivot Animasi Kibasan
    const tailG = new THREE.Group();
    tailG.position.set(0, 0, -0.24);
    const tailFin = this.pl(0.02, 0.24, 0.20, FIN, 0, -0.10, 0);
    tailG.add(tailFin);
    g.add(tailG);

    g.userData.tail = tailG;
    return g;
  }
};

window.Env_Fish = Env_Fish;
