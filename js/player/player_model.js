'use strict';
/* =================================================================
FORECRAFT 3D - PLAYER MODEL BUILDER
File: js/player/player_model.js
================================================================= */
const PlayerModelBuilder = {
  mesh: null,
  parts: {},
  box(w, h, d, color, yOff = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, yOff, 0);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  },
  pl(w, h, d, color, y = 0, z = 0, x = 0) {
    const m = this.box(w, h, d, color, 0);
    m.position.set(x, y, z);
    return m;
  },
  build() {
    const SKIN = 0xe8bd92, SKIN_D = 0xd2a279, SKIN_L = 0xf0cda2,
      TUNIC = 0x40704a, TUNIC_D = 0x33593b, TUNIC_L = 0x4d8459,
      PANTS = 0x4a3b2a, PANTS_D = 0x3b2f21, BELT = 0x2c2419,
      HAIR = 0x4a3222, HAIR_D = 0x372417, BOOT = 0x3b2c1d,
      LEATHER = 0x6b4a2a, LEATHER_D = 0x4a3118;

    this.mesh = new THREE.Group();
    this.mesh.name = "PlayerCharacter";
    const rollG = new THREE.Group();
    this.mesh.add(rollG);
    const body = new THREE.Group();
    rollG.add(body);
    this.parts.body = body;

    /* ---------------- KAKI ---------------- */
    const mkLeg = (side) => {
      const g = new THREE.Group();
      g.position.set(0.13 * side, 0.66, 0);
      g.add(this.pl(0.20, 0.16, 0.22, PANTS, -0.08));
      g.add(this.pl(0.185, 0.20, 0.205, PANTS_D, -0.24));
      g.add(this.pl(0.035, 0.26, 0.06, PANTS_D, -0.18, 0.09, 0.10 * side));
      g.add(this.pl(0.02, 0.28, 0.02, PANTS_D, -0.18, 0.0, -0.10 * side));
      const shin = new THREE.Group();
      shin.position.y = -0.34;
      shin.add(this.pl(0.165, 0.3, 0.19, PANTS, -0.15));
      shin.add(this.pl(0.185, 0.08, 0.20, 0x53401f, -0.02, 0.01));
      shin.add(this.pl(0.19, 0.03, 0.21, LEATHER_D, -0.06, 0.015));
      shin.add(this.pl(0.175, 0.05, 0.20, 0x6a5230, -0.14));
      shin.add(this.pl(0.175, 0.04, 0.20, 0x6a5230, -0.21));
      shin.add(this.pl(0.195, 0.09, 0.22, BOOT, -0.26, 0.01));
      shin.add(this.pl(0.2, 0.1, 0.26, BOOT, -0.31, 0.03));
      shin.add(this.pl(0.21, 0.035, 0.29, 0x241a10, -0.37, 0.05));
      shin.add(this.pl(0.14, 0.06, 0.08, BOOT, -0.33, 0.14));
      shin.add(this.pl(0.16, 0.02, 0.02, LEATHER_D, -0.28, 0.10));
      g.add(shin);
      g.userData.shin = shin;
      body.add(g);
      return g;
    };
    const legL = mkLeg(1), legR = mkLeg(-1);

    /* ---------------- TORSO ---------------- */
    const torso = new THREE.Group();
    torso.position.y = 0.66;
    body.add(torso);
    torso.add(this.pl(0.42, 0.14, 0.28, TUNIC_D, 0.07));
    torso.add(this.pl(0.46, 0.22, 0.28, TUNIC, 0.25));
    torso.add(this.pl(0.54, 0.26, 0.31, TUNIC, 0.49));
    torso.add(this.pl(0.58, 0.08, 0.33, TUNIC_D, 0.66));
    torso.add(this.pl(0.50, 0.10, 0.30, TUNIC_D, 0.02));
    torso.add(this.pl(0.16, 0.09, 0.05, TUNIC_D, -0.05, 0.15));
    torso.add(this.pl(0.16, 0.09, 0.05, TUNIC_D, -0.05, -0.15));
    torso.add(this.pl(0.48, 0.07, 0.30, BELT, 0.14));
    torso.add(this.pl(0.1, 0.09, 0.32, 0xc9a227, 0.14));
    torso.add(this.pl(0.05, 0.05, 0.02, 0xffe9a0, 0.14, 0.17));
    torso.add(this.pl(0.10, 0.11, 0.09, LEATHER, 0.10, 0.02, 0.24));
    torso.add(this.pl(0.11, 0.03, 0.10, 0x3f2c17, 0.16, 0.02, 0.24));
    torso.add(this.pl(0.03, 0.08, 0.02, LEATHER_D, 0.12, 0.02, 0.29));
    torso.add(this.pl(0.08, 0.09, 0.07, LEATHER_D, 0.08, 0.02, -0.24));
    const strap = this.pl(0.5, 0.07, 0.02, 0x5c3f24, 0.42, 0.165);
    strap.rotation.z = 0.55; torso.add(strap);
    const strap2 = this.pl(0.46, 0.05, 0.02, 0x4a3319, 0.44, -0.17);
    strap2.rotation.z = -0.5; torso.add(strap2);
    torso.add(this.pl(0.06, 0.06, 0.03, 0xc9a227, 0.38, 0.165, 0.10));
    torso.add(this.pl(0.40, 0.06, 0.34, TUNIC_L, 0.63, 0.01));
    torso.add(this.pl(0.03, 0.30, 0.02, TUNIC_D, 0.47, 0.158));
    torso.add(this.pl(0.20, 0.16, 0.02, TUNIC_L, 0.52, 0.16, 0.12));
    torso.add(this.pl(0.20, 0.16, 0.02, TUNIC_L, 0.52, 0.16, -0.12));
    torso.add(this.pl(0.03, 0.03, 0.02, 0xc9a227, 0.56, 0.165, 0.0));
    torso.add(this.pl(0.03, 0.03, 0.02, 0xc9a227, 0.48, 0.165, 0.0));
    // ★ PERBAIKAN: leher lebih tebal & tinggi agar menyatu dengan
    // dagu kepala di atas dan bahu di bawah (sebelumnya 0.16,0.1,0.16 @ 0.72)
    torso.add(this.pl(0.18, 0.30, 0.18, SKIN_D, 0.80));
    torso.add(this.pl(0.02, 0.12, 0.02, 0x8f6d1c, 0.62, 0.14));
    torso.add(this.pl(0.05, 0.05, 0.02, 0x4a9fd9, 0.56, 0.15));

    /* ---------------- LENGAN ---------------- */
    const mkArm = (side) => {
      const g = new THREE.Group();
      g.position.set(0.35 * side, 1.29, 0);
      g.add(this.pl(0.19, 0.09, 0.20, TUNIC_D, 0.01));
      g.add(this.pl(0.20, 0.05, 0.21, TUNIC_D, 0.04));
      g.add(this.pl(0.17, 0.26, 0.18, TUNIC, -0.13));
      g.add(this.pl(0.155, 0.06, 0.17, TUNIC_D, -0.24));
      g.add(this.pl(0.02, 0.22, 0.02, TUNIC_D, -0.13, 0.0, 0.09 * side));
      const fore = new THREE.Group();
      fore.position.y = -0.26;
      fore.add(this.pl(0.145, 0.25, 0.16, SKIN, -0.13));
      fore.add(this.pl(0.17, 0.10, 0.18, LEATHER, -0.05));
      fore.add(this.pl(0.18, 0.025, 0.19, 0x3f2c17, -0.02));
      fore.add(this.pl(0.18, 0.025, 0.19, 0x3f2c17, -0.09));
      fore.add(this.pl(0.04, 0.04, 0.02, 0xc9a227, -0.05, 0.0, 0.10 * side));
      fore.add(this.pl(0.13, 0.05, 0.14, SKIN, -0.24));
      const fist = this.pl(0.15, 0.12, 0.15, SKIN_D, -0.31);
      fore.add(fist);
      const knuckle = this.pl(0.155, 0.04, 0.15, SKIN, -0.28);
      fore.add(knuckle);
      fore.add(this.pl(0.035, 0.06, 0.13, SKIN_D, -0.31, 0.0, 0.06));
      fore.add(this.pl(0.035, 0.06, 0.13, SKIN_D, -0.31, 0.0, -0.06));
      fore.add(this.pl(0.035, 0.07, 0.13, SKIN_D, -0.31, 0.0, 0.0));
      fore.add(this.pl(0.04, 0.05, 0.06, SKIN_D, -0.29, 0.05, 0.09 * side));
      fore.userData.fist = fist;
      fore.userData.knuckle = knuckle;
      g.add(fore);
      g.userData.fore = fore;
      body.add(g);
      return g;
    };
    const armL = mkArm(1), armR = mkArm(-1);

    /* ---------------- KEPALA ---------------- */
    const head = new THREE.Group();
    head.position.set(0, 1.46, 0); // diturunkan 0.04 agar menyatu leher (sinkron js/player.js)
    body.add(head);
    head.add(this.pl(0.4, 0.4, 0.38, SKIN, 0.2));
    head.add(this.pl(0.34, 0.10, 0.34, SKIN_D, 0.04));
    head.add(this.pl(0.26, 0.12, 0.05, SKIN_D, 0.12, 0.19));
    head.add(this.pl(0.08, 0.06, 0.04, SKIN_L, 0.16, 0.17, 0.14));
    head.add(this.pl(0.08, 0.06, 0.04, SKIN_L, 0.16, 0.17, -0.14));
    head.add(this.pl(0.44, 0.13, 0.42, HAIR, 0.42));
    head.add(this.pl(0.42, 0.09, 0.10, HAIR, 0.36, 0.17));
    head.add(this.pl(0.30, 0.07, 0.08, HAIR_D, 0.40, 0.20));
    head.add(this.pl(0.44, 0.16, 0.08, HAIR_D, 0.3, -0.18));
    head.add(this.pl(0.06, 0.20, 0.30, HAIR, 0.32, -0.02, 0.20));
    head.add(this.pl(0.06, 0.20, 0.30, HAIR, 0.32, -0.02, -0.20));
    head.add(this.pl(0.08, 0.12, 0.06, HAIR_D, 0.38, 0.14, 0.10));
    head.add(this.pl(0.08, 0.12, 0.06, HAIR_D, 0.38, 0.14, -0.10));
    head.add(this.pl(0.05, 0.12, 0.09, SKIN_D, 0.2, 0, 0.21));
    head.add(this.pl(0.05, 0.12, 0.09, SKIN_D, 0.2, 0, -0.21));
    head.add(this.pl(0.02, 0.06, 0.05, 0xb98a68, 0.2, 0, 0.235));
    head.add(this.pl(0.02, 0.06, 0.05, 0xb98a68, 0.2, 0, -0.235));
    const eyeM = new THREE.MeshLambertMaterial({ color: 0x2a2118 });
    const scleraM = new THREE.MeshLambertMaterial({ color: 0xf6f1e6 });
    for (const x of [0.095, -0.095]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.02), scleraM);
      s.position.set(x, 0.22, 0.19); head.add(s);
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.02), eyeM);
      e.position.set(x, 0.22, 0.195); head.add(e);
      const iris = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.02), new THREE.MeshLambertMaterial({ color: 0x4a7a5a }));
      iris.position.set(x, 0.22, 0.198); head.add(iris);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      gl.position.set(x + 0.015, 0.245, 0.205); head.add(gl);
      head.add(this.pl(0.09, 0.035, 0.02, HAIR_D, 0.30, 0.196, x));
      head.add(this.pl(0.085, 0.02, 0.02, SKIN_D, 0.185, 0.198, x));
    }
    head.add(this.pl(0.05, 0.05, 0.04, SKIN_D, 0.155, 0.2));
    head.add(this.pl(0.04, 0.02, 0.02, 0xb98a68, 0.135, 0.205));
    head.add(this.pl(0.1, 0.02, 0.02, 0xb07a6a, 0.09, 0.196));
    head.add(this.pl(0.12, 0.05, 0.03, SKIN_D, 0.045, 0.185));
    head.add(this.pl(0.015, 0.06, 0.01, 0xc9856a, 0.14, 0.19, 0.12));

    /* ---------------- ANCHORS ARMOR ---------------- */
    const armorG = {
      helm: new THREE.Group(),
      chest: new THREE.Group(),
      bootL: new THREE.Group(),
      bootR: new THREE.Group(),
      pauldL: new THREE.Group(),
      pauldR: new THREE.Group()
    };
    head.add(armorG.helm);
    torso.add(armorG.chest);
    legL.userData.shin.add(armorG.bootL);
    legR.userData.shin.add(armorG.bootR);
    armL.add(armorG.pauldL);
    armR.add(armorG.pauldR);

    this.parts = { legL, legR, armL, armR, head, torso, armorG };
    return this.mesh;
  }
};
window.PlayerModelBuilder = PlayerModelBuilder;
window.MainCharacterModel = PlayerModelBuilder; // Alias backwards compatibility
if (typeof module !== 'undefined') module.exports = PlayerModelBuilder;