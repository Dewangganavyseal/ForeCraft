'use strict';
/* =================================================================
   FORECRAFT 3D - PLAYER MODEL BUILDER (RANGER PENJELAJAH EDITION)
   File: js/player/player_model.js
   Model voxel karakter Ranger Penjelajah dengan layer pakaian
   adaptif (anti z-fighting), rambut Undercut, wajah ekspresif,
   dan hierarki sendi harmonis untuk PlayerAnimator & ComboSystem.
   ================================================================= */

const PlayerModelBuilder = {
  mesh: null,
  rollG: null,
  parts: {},

  box(w, h, d, color, yOff = 0, emissive = 0x000000) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (yOff !== 0) g.translate(0, yOff, 0);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
      color,
      emissive: emissive || 0x000000
    }));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  },

  pl(w, h, d, color, y = 0, z = 0, x = 0, emissive = 0x000000) {
    const m = this.box(w, h, d, color, 0, emissive);
    m.position.set(x, y, z);
    return m;
  },

  /* ---------- GENERATOR GAYA RAMBUT (Default: Undercut #4) ---------- */
  buildHair(style = 4, color = 0x2c1f14) {
    const g = new THREE.Group();
    g.name = 'HairGroup';
    const H = (w, h, d, y, z, x, c) => {
      const m = this.pl(w, h, d, (c === undefined ? color : c), y, z, x);
      g.add(m);
      return m;
    };
    const dark = new THREE.Color(color).multiplyScalar(0.7).getHex();
    const s = style | 0;

    const fringe = (dp) => { H(0.36, 0.10, 0.06, 0.40, 0.20); H(0.30, 0.06, 0.05, 0.36, 0.215, 0, dp); };
    const sides = (len) => { H(0.06, len, 0.34, 0.30, -0.02, 0.21); H(0.06, len, 0.34, 0.30, -0.02, -0.21); };
    const back = (len, wd) => { H(wd || 0.44, len, 0.10, 0.30, -0.20); };
    const topCap = (hh) => { H(0.44, hh || 0.13, 0.42, 0.44); };

    switch (s) {
      case 0: break; /* Plontos */
      case 1: topCap(0.10); break; /* Cepak */
      case 2: topCap(0.16); H(0.40, 0.06, 0.38, 0.52); break; /* Cepak Tinggi */
      case 3: topCap(); H(0.36, 0.08, 0.06, 0.40, 0.20); H(0.05, 0.14, 0.40, 0.46, 0.0, 0.10); sides(0.16); back(0.18); break; /* Belah Samping */
      case 4: /* Undercut (Default) */
        H(0.40, 0.12, 0.38, 0.46);
        H(0.36, 0.08, 0.06, 0.40, 0.20);
        H(0.30, 0.10, 0.30, 0.50);
        break;
      case 5: topCap(); fringe(); sides(0.18); back(0.20); break; /* Poni Lurus */
      case 6: topCap(); H(0.36, 0.10, 0.06, 0.40, 0.20); H(0.22, 0.07, 0.05, 0.35, 0.215, 0.08); H(0.12, 0.05, 0.05, 0.33, 0.215, -0.12); sides(0.18); back(0.20); break; /* Poni Miring */
      case 7: topCap(); H(0.20, 0.16, 0.30, 0.52, 0.02, 0); H(0.16, 0.10, 0.24, 0.58, 0.04); fringe(); sides(0.14); break; /* Jambul */
      case 8: topCap(0.10); for (let i = -2; i <= 2; i++) H(0.07, 0.16 + (i % 2 ? 0.05 : 0), 0.10, 0.52, -0.05 - i * 0.07, i * 0.09); fringe(); sides(0.12); break; /* Spiky */
      case 11: H(0.12, 0.22, 0.40, 0.50); H(0.10, 0.16, 0.36, 0.58); break; /* Mohawk */
      case 14: topCap(); fringe(); sides(0.30); back(0.30); H(0.06, 0.34, 0.30, 0.12, -0.02, 0.22); H(0.06, 0.34, 0.30, 0.12, -0.02, -0.22); break; /* Gondrong */
      case 17: topCap(); fringe(); sides(0.18); back(0.20); H(0.12, 0.30, 0.12, 0.20, -0.26); H(0.10, 0.18, 0.10, 0.02, -0.28); break; /* Ekor Kuda */
      case 27: topCap(); H(0.40, 0.10, 0.34, 0.42, -0.04); H(0.16, 0.14, 0.16, 0.48, -0.16); sides(0.16); fringe(); break; /* Man Bun */
      default:
        topCap(0.12);
        H(0.38, 0.10, 0.36, 0.48);
        fringe();
        break;
    }

    if (s !== 0) H(0.42, 0.03, 0.40, 0.395, 0, 0, dark);
    return g;
  },

  /* ---------- BUILD KARAKTER UTAMA LENGKAP ---------- */
  build() {
    const SKIN = 0xe8bd92, SKIN_D = 0xd2a279, SKIN_L = 0xf0cda2,
      HOOD = 0x4a5a68, HOOD_D = 0x39454f, HOOD_L = 0x5b6e7d,
      JACKET = 0x6a4a2e, JACKET_D = 0x53381f, JACKET_L = 0x7d5a3a,
      PANTS = 0x3a4149, PANTS_D = 0x2c323a,
      BELT = 0x241a12, BOOT = 0x2c2018, BOOT_D = 0x20160f,
      STRAP = 0x8a6a3a, GLOVE = 0x4a3319, ACCENT = 0xd9a63a,
      GEAR = 0xb08a4a;

    this.mesh = new THREE.Group();
    this.mesh.name = 'PlayerCharacter';

    const rollG = new THREE.Group();
    rollG.name = 'RollGroup';
    this.mesh.add(rollG);
    this.rollG = rollG;

    const body = new THREE.Group();
    body.name = 'Body';
    rollG.add(body);

    const parts = { body };

    /* ---------------- KAKI ---------------- */
    const mkLeg = (side) => {
      const g = new THREE.Group();
      g.name = side > 0 ? 'LegL' : 'LegR';
      g.position.set(0.13 * side, 0.66, 0);

      // Celana dalam pas badan (aktif saat pakai armor celana/greaves)
      const innerLegCloth = new THREE.Group();
      innerLegCloth.name = 'InnerLegCloth';
      innerLegCloth.add(this.pl(0.18, 0.34, 0.20, PANTS_D, -0.16));
      innerLegCloth.visible = false;
      g.add(innerLegCloth);

      // Celana kargo default Ranger dengan kantong samping
      const defaultLegCloth = new THREE.Group();
      defaultLegCloth.name = 'DefaultLegCloth';
      defaultLegCloth.add(this.pl(0.21, 0.15, 0.23, PANTS, -0.07));
      defaultLegCloth.add(this.pl(0.19, 0.20, 0.21, PANTS_D, -0.24));
      defaultLegCloth.add(this.pl(0.06, 0.13, 0.15, PANTS_D, -0.16, 0.0, 0.12 * side));
      defaultLegCloth.add(this.pl(0.065, 0.03, 0.16, PANTS, -0.11, 0.0, 0.12 * side));
      defaultLegCloth.add(this.pl(0.02, 0.26, 0.02, PANTS_D, -0.18, 0.10, -0.10 * side));
      g.add(defaultLegCloth);

      const shin = new THREE.Group();
      shin.name = 'Shin';
      shin.position.y = -0.34;
      shin.add(this.pl(0.17, 0.30, 0.19, PANTS, -0.15));
      shin.add(this.pl(0.05, 0.20, 0.05, PANTS_D, -0.14, 0.10, 0.07 * side));

      // Boot luar tebal Ranger
      const bootOuter = new THREE.Group();
      bootOuter.name = 'BootOuter';
      bootOuter.add(this.pl(0.20, 0.10, 0.22, BOOT_D, -0.04, 0.01));
      bootOuter.add(this.pl(0.185, 0.16, 0.21, BOOT, -0.16, 0.005));
      bootOuter.add(this.pl(0.20, 0.04, 0.24, GEAR, -0.23, 0.02));
      bootOuter.add(this.pl(0.21, 0.09, 0.27, BOOT, -0.29, 0.03));
      bootOuter.add(this.pl(0.22, 0.035, 0.30, BOOT_D, -0.35, 0.05));
      bootOuter.add(this.pl(0.15, 0.05, 0.10, BOOT_D, -0.30, 0.15));
      bootOuter.add(this.pl(0.03, 0.05, 0.16, ACCENT, -0.16, 0.0, 0.10 * side));
      shin.add(bootOuter);

      // Boot inner ramping
      const bootInner = new THREE.Group();
      bootInner.name = 'BootInner';
      bootInner.add(this.pl(0.16, 0.32, 0.18, BOOT_D, -0.15));
      bootInner.visible = false;
      shin.add(bootInner);

      g.add(shin);
      g.userData.shin = shin;
      g.userData.bootOuter = bootOuter;
      g.userData.bootInner = bootInner;
      g.userData.defaultLegCloth = defaultLegCloth;
      g.userData.innerLegCloth = innerLegCloth;
      body.add(g);
      return g;
    };
    const legL = mkLeg(1), legR = mkLeg(-1);

    /* ---------------- TORSO ---------------- */
    const torso = new THREE.Group();
    torso.name = 'Torso';
    torso.position.y = 0.66;
    body.add(torso);

    // Baju inner pas badan (aktif saat memakai chestplate zirah)
    const innerTorsoCloth = new THREE.Group();
    innerTorsoCloth.name = 'InnerTorsoCloth';
    innerTorsoCloth.add(this.pl(0.44, 0.50, 0.26, PANTS_D, 0.38));
    innerTorsoCloth.visible = false;
    torso.add(innerTorsoCloth);

    // Jaket tebal Ranger Penjelajah
    const defaultTorsoCloth = new THREE.Group();
    defaultTorsoCloth.name = 'DefaultTorsoCloth';
    defaultTorsoCloth.add(this.pl(0.44, 0.16, 0.30, JACKET_D, 0.08));
    defaultTorsoCloth.add(this.pl(0.48, 0.24, 0.30, JACKET, 0.26));
    defaultTorsoCloth.add(this.pl(0.56, 0.26, 0.33, JACKET, 0.50));
    defaultTorsoCloth.add(this.pl(0.60, 0.10, 0.35, JACKET_D, 0.68));
    defaultTorsoCloth.add(this.pl(0.50, 0.10, 0.31, JACKET_D, 0.02));
    // Coat tails / jubah bawah
    defaultTorsoCloth.add(this.pl(0.16, 0.20, 0.06, JACKET_D, -0.10, 0.02, 0.20));
    defaultTorsoCloth.add(this.pl(0.16, 0.20, 0.06, JACKET_D, -0.10, 0.02, -0.20));
    defaultTorsoCloth.add(this.pl(0.06, 0.22, 0.30, JACKET_D, -0.06, 0.0, 0.27));
    defaultTorsoCloth.add(this.pl(0.06, 0.22, 0.30, JACKET_D, -0.06, 0.0, -0.27));
    // Kerah tinggi pelindung
    defaultTorsoCloth.add(this.pl(0.34, 0.14, 0.30, HOOD_D, 0.72));
    defaultTorsoCloth.add(this.pl(0.30, 0.06, 0.28, HOOD, 0.78));
    // Detail resleting & aksen
    defaultTorsoCloth.add(this.pl(0.04, 0.34, 0.02, JACKET_D, 0.46, 0.165));
    defaultTorsoCloth.add(this.pl(0.22, 0.04, 0.02, JACKET_L, 0.56, 0.165, 0.13));
    defaultTorsoCloth.add(this.pl(0.22, 0.04, 0.02, JACKET_L, 0.56, 0.165, -0.13));
    defaultTorsoCloth.add(this.pl(0.04, 0.04, 0.02, ACCENT, 0.50, 0.17, 0));
    defaultTorsoCloth.add(this.pl(0.035, 0.035, 0.02, ACCENT, 0.40, 0.17, 0));
    // Sabuk utilitas, tas pinggang, gesper
    defaultTorsoCloth.add(this.pl(0.50, 0.08, 0.32, BELT, 0.14));
    defaultTorsoCloth.add(this.pl(0.12, 0.10, 0.34, ACCENT, 0.14));
    defaultTorsoCloth.add(this.pl(0.05, 0.05, 0.02, 0xfff0b8, 0.14, 0.18));
    defaultTorsoCloth.add(this.pl(0.11, 0.12, 0.10, JACKET_L, 0.10, 0.0, 0.25));
    defaultTorsoCloth.add(this.pl(0.12, 0.03, 0.11, JACKET_D, 0.17, 0.0, 0.25));
    defaultTorsoCloth.add(this.pl(0.03, 0.09, 0.02, BELT, 0.11, 0.0, 0.30));
    defaultTorsoCloth.add(this.pl(0.09, 0.10, 0.08, JACKET_D, 0.08, 0.0, -0.25));
    // Tali selempang belakang
    defaultTorsoCloth.add(this.pl(0.05, 0.16, 0.02, STRAP, 0.04, -0.16, 0.10));
    defaultTorsoCloth.add(this.pl(0.05, 0.14, 0.02, STRAP, 0.05, -0.16, 0.02));
    defaultTorsoCloth.add(this.pl(0.05, 0.15, 0.02, STRAP, 0.045, -0.16, -0.08));
    // Liontin kompas petualang
    defaultTorsoCloth.add(this.pl(0.02, 0.14, 0.02, STRAP, 0.60, 0.15));
    defaultTorsoCloth.add(this.pl(0.06, 0.06, 0.02, GEAR, 0.53, 0.16));
    defaultTorsoCloth.add(this.pl(0.03, 0.03, 0.01, 0x9adfff, 0.53, 0.17));
    torso.add(defaultTorsoCloth);

    // Leher kokoh menyatu dengan kepala & bahu
    torso.add(this.pl(0.18, 0.30, 0.18, SKIN_D, 0.80));

    /* ---------------- LENGAN ---------------- */
    const mkArm = (side) => {
      const g = new THREE.Group();
      g.name = side > 0 ? 'ArmL' : 'ArmR';
      g.position.set(0.35 * side, 0.63, 0);

      const defaultUpperArm = new THREE.Group();
      defaultUpperArm.name = 'DefaultUpperArm';
      defaultUpperArm.add(this.pl(0.21, 0.10, 0.22, JACKET_D, 0.01));
      defaultUpperArm.add(this.pl(0.22, 0.05, 0.23, JACKET_D, 0.05));
      defaultUpperArm.add(this.pl(0.04, 0.03, 0.23, ACCENT, 0.06, 0.0, 0.0));
      defaultUpperArm.add(this.pl(0.18, 0.26, 0.19, JACKET, -0.13));
      defaultUpperArm.add(this.pl(0.16, 0.06, 0.18, JACKET_D, -0.24));
      defaultUpperArm.add(this.pl(0.02, 0.22, 0.02, JACKET_D, -0.13, 0.0, 0.09 * side));
      g.add(defaultUpperArm);

      const innerUpperArm = new THREE.Group();
      innerUpperArm.name = 'InnerUpperArm';
      innerUpperArm.add(this.pl(0.15, 0.26, 0.16, PANTS_D, -0.13));
      innerUpperArm.visible = false;
      g.add(innerUpperArm);

      const fore = new THREE.Group();
      fore.name = 'ForeArm';
      fore.position.y = -0.26;
      fore.add(this.pl(0.15, 0.25, 0.17, JACKET, -0.13));
      fore.add(this.pl(0.16, 0.05, 0.18, JACKET_D, -0.05));
      fore.add(this.pl(0.16, 0.11, 0.18, GLOVE, -0.22));
      fore.add(this.pl(0.17, 0.03, 0.19, BELT, -0.16));

      const fist = this.pl(0.16, 0.12, 0.17, GLOVE, -0.30);
      fore.add(fist);
      const knuckle = this.pl(0.165, 0.045, 0.17, JACKET_D, -0.27);
      fore.add(knuckle);

      fore.add(this.pl(0.04, 0.06, 0.14, JACKET_D, -0.30, 0.0, 0.06));
      fore.add(this.pl(0.04, 0.06, 0.14, JACKET_D, -0.30, 0.0, -0.06));
      fore.add(this.pl(0.04, 0.07, 0.14, JACKET_D, -0.30, 0.0, 0.0));
      fore.add(this.pl(0.045, 0.05, 0.07, GLOVE, -0.28, 0.06, 0.10 * side));
      fore.add(this.pl(0.03, 0.03, 0.03, ACCENT, -0.16, 0.0, 0.10 * side));

      fore.userData.fist = fist;
      fore.userData.knuckle = knuckle;

      const swordG = new THREE.Group();
      swordG.name = 'SwordG';
      swordG.position.set(0, -0.29, 0.02);
      fore.add(swordG);
      fore.userData.swordG = swordG;

      g.add(fore);
      g.userData.fore = fore;
      g.userData.defaultUpperArm = defaultUpperArm;
      g.userData.innerUpperArm = innerUpperArm;
      torso.add(g);
      return g;
    };
    const armL = mkArm(1), armR = mkArm(-1);

    /* ---------------- KEPALA & WAJAH RANGER ---------------- */
    const head = new THREE.Group();
    head.name = 'Head';
    head.position.set(0, 0.80, 0);
    torso.add(head);

    // Bentuk tengkorak & rahang
    head.add(this.pl(0.40, 0.40, 0.38, SKIN, 0.2));
    head.add(this.pl(0.34, 0.10, 0.34, SKIN_D, 0.04));
    head.add(this.pl(0.07, 0.08, 0.03, SKIN_L, 0.17, 0.185, 0.13));
    head.add(this.pl(0.07, 0.08, 0.03, SKIN_L, 0.17, 0.185, -0.13));
    // Telinga
    head.add(this.pl(0.05, 0.12, 0.09, SKIN_D, 0.2, 0, 0.21));
    head.add(this.pl(0.05, 0.12, 0.09, SKIN_D, 0.2, 0, -0.21));
    head.add(this.pl(0.02, 0.06, 0.05, 0xb98a68, 0.2, 0, 0.235));
    head.add(this.pl(0.02, 0.06, 0.05, 0xb98a68, 0.2, 0, -0.235));

    // Mata detail dengan iris, pupil & kilau
    const eyeM = new THREE.MeshLambertMaterial({ color: 0x241d14 });
    const scleraM = new THREE.MeshLambertMaterial({ color: 0xf6f1e6 });
    for (const x of [0.095, -0.095]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.02), scleraM);
      s.position.set(x, 0.22, 0.19); head.add(s);
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.02), eyeM);
      e.position.set(x, 0.22, 0.195); head.add(e);
      const iris = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.02),
        new THREE.MeshLambertMaterial({ color: 0x4a8ab0 }));
      iris.position.set(x, 0.22, 0.198); head.add(iris);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      gl.position.set(x + 0.015, 0.245, 0.205); head.add(gl);
      head.add(this.pl(0.09, 0.035, 0.02, 0x2c1f14, 0.30, 0.196, x)); // Alis
      head.add(this.pl(0.085, 0.02, 0.02, SKIN_D, 0.185, 0.198, x)); // Kelopak
    }

    // Hidung & bibir
    head.add(this.pl(0.05, 0.07, 0.03, SKIN_D, 0.205, 0.195));
    head.add(this.pl(0.045, 0.06, 0.05, SKIN_D, 0.16, 0.21));
    head.add(this.pl(0.06, 0.04, 0.06, SKIN_L, 0.115, 0.215));
    head.add(this.pl(0.018, 0.02, 0.02, 0x8a5f46, 0.095, 0.235, 0.02));
    head.add(this.pl(0.018, 0.02, 0.02, 0x8a5f46, 0.095, 0.235, -0.02));
    head.add(this.pl(0.05, 0.02, 0.04, SKIN, 0.10, 0.19));
    head.add(this.pl(0.02, 0.035, 0.02, SKIN_D, 0.075, 0.195));

    // Mulut (dengan rongga dalam untuk warcry/roar)
    head.add(this.pl(0.11, 0.022, 0.02, 0xc9826f, 0.055, 0.20));
    const mouth = this.pl(0.13, 0.018, 0.018, 0x9a5a4a, 0.038, 0.20);
    head.add(mouth);
    const mouthIn = this.pl(0.11, 0.02, 0.015, 0x3a1c1c, 0.038, 0.19);
    mouthIn.visible = false;
    head.add(mouthIn);
    mouth.userData.baseY = 0.038;
    mouth.userData.inner = mouthIn;

    head.add(this.pl(0.10, 0.03, 0.022, 0xd99a86, 0.02, 0.20));
    head.add(this.pl(0.02, 0.03, 0.02, 0xa06850, 0.045, 0.205, 0.075));
    head.add(this.pl(0.02, 0.03, 0.02, 0xa06850, 0.045, 0.205, -0.075));
    head.add(this.pl(0.06, 0.025, 0.02, SKIN_D, 0.005, 0.19));

    /* ---------------- RAMBUT (Undercut default) ---------------- */
    const hairG = new THREE.Group();
    hairG.name = 'Hair';
    head.add(hairG);
    hairG.add(this.buildHair(4, 0x2c1f14)); // Model Undercut #4

    /* ---------------- ANCHORS ARMOR (armorG) ---------------- */
    const armorG = {
      helm: new THREE.Group(),
      chest: new THREE.Group(),
      pantsWaist: new THREE.Group(),
      pantsL: new THREE.Group(),
      pantsR: new THREE.Group(),
      bootL: new THREE.Group(),
      bootR: new THREE.Group(),
      pauldL: new THREE.Group(),
      pauldR: new THREE.Group(),
      shield: new THREE.Group()
    };
    armorG.helm.name = 'Armor_Helm';
    armorG.chest.name = 'Armor_Chest';
    armorG.pantsWaist.name = 'Armor_PantsWaist';
    armorG.pantsL.name = 'Armor_PantsL';
    armorG.pantsR.name = 'Armor_PantsR';
    armorG.bootL.name = 'Armor_BootL';
    armorG.bootR.name = 'Armor_BootR';
    armorG.pauldL.name = 'Armor_PauldL';
    armorG.pauldR.name = 'Armor_PauldR';
    armorG.shield.name = 'Armor_Shield';

    head.add(armorG.helm);
    torso.add(armorG.chest);
    torso.add(armorG.pantsWaist);
    legL.add(armorG.pantsL);
    legR.add(armorG.pantsR);
    legL.userData.shin.add(armorG.bootL);
    legR.userData.shin.add(armorG.bootR);
    armL.add(armorG.pauldL);
    armR.add(armorG.pauldR);
    armL.add(armorG.shield);

    Object.assign(parts, {
      legL, legR, armL, armR, head, torso, body, mouth, sword: null,
      armorG, hairG, defaultTorsoCloth, innerTorsoCloth
    });

    this.parts = parts;
    this.mesh.userData.parts = parts;
    return this.mesh;
  },

  /* ---------- HELPER TOGGLE LAYER PAKAIAN ADAPTIF ---------- */
  updateClothVisibility(parts, options = {}) {
    if (!parts) return;
    const { hasChest = false, hasPants = false, hasPauld = false, hasBoots = false, hasHelm = false, isFullFace = false } = options;

    if (parts.defaultTorsoCloth && parts.innerTorsoCloth) {
      parts.defaultTorsoCloth.visible = !hasChest;
      parts.innerTorsoCloth.visible = !!hasChest;
    }

    for (const leg of [parts.legL, parts.legR]) {
      if (leg && leg.userData) {
        if (leg.userData.defaultLegCloth && leg.userData.innerLegCloth) {
          leg.userData.defaultLegCloth.visible = !hasPants;
          leg.userData.innerLegCloth.visible = !!hasPants;
        }
        if (leg.userData.bootOuter && leg.userData.bootInner) {
          leg.userData.bootOuter.visible = !hasBoots;
          leg.userData.bootInner.visible = !!hasBoots;
        }
      }
    }

    for (const a of [parts.armL, parts.armR]) {
      if (a && a.userData && a.userData.defaultUpperArm && a.userData.innerUpperArm) {
        a.userData.defaultUpperArm.visible = !hasPauld;
        a.userData.innerUpperArm.visible = !!hasPauld;
      }
    }

    if (parts.hairG) {
      if (!hasHelm) {
        parts.hairG.visible = true;
      } else {
        parts.hairG.visible = !isFullFace;
      }
    }
  }
};

window.PlayerModelBuilder = PlayerModelBuilder;
window.MainCharacterModel = PlayerModelBuilder; // Alias backwards compatibility
if (typeof module !== 'undefined') module.exports = PlayerModelBuilder;
