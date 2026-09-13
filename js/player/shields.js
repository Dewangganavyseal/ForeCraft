'use strict';
/* =============================================================================
   SHIELD MODELS v2 (12 Tameng Otentik Sesuai 12 Set Armor & Pedang Forecraft)
   -----------------------------------------------------------------------------
   12 Tameng Voxel 3D Otentik:
     1. Berserker Pelt Shield      (shield_berserker / shield_wood)    — Set Berserker Fur (Leather Lv 1)
     2. Elven Leaf Shield          (shield_elven)                      — Set Elven Ranger (Leather Lv 1)
     3. Steam Cog Shield           (shield_steampunk)                  — Set Steampunk Engineer (Copper Lv 7)
     4. Knight's Iron Pavise       (shield_iron)                       — Set Iron Knight (Iron Lv 12)
     5. Paladin Sunshield          (shield_paladin / shield_flame)     — Set Gold Paladin (Gold Lv 22)
     6. Shadow Tungsten Buckler    (shield_shadow / shield_venom)      — Set Shadow Assassin (Tungsten Lv 26)
     7. Colossus Tower Bulwark     (shield_juggernaut / shield_storm)  — Set Tungsten Juggernaut (Tungsten Lv 26)
     8. Glacial Spellshield        (shield_crystal / shield_frost)     — Set Crystal Mage (Crystal Lv 32)
     9. Soul Harvester Gate        (shield_reaper / shield_dark)       — Set Reaper Cult (Soul/Crystal Lv 32)
    10. Yeti Glacier Barricade     (shield_yeti)                       — Set Frost Yeti (Ice/Crystal Lv 32)
    11. Samurai O-Tate             (shield_samurai)                    — Set Samurai (Tungsten Steel Lv 38)
    12. Dragonscale Greatshield    (shield_dragon / shield_carapace)   — Set Dragonscale (Mythic Lv 38)

   Tiap tameng memiliki siluet voxel 3D unik, lapisan material bertekstur,
   pelat inti (plate) untuk highlight blok/aura Royal Guard, dan gagang penahan
   lengan kiri di sisi belakang (-Z).
   ============================================================================= */

const ShieldModels = {
  /* tinggi akhir tameng saat dipakai pemain & NPC (diperbesar +30% dari 0.85 ke 1.105) */
  TARGET_H: 1.105,

  /* Helper pembangun voxel */
  _box(w, h, d, color, emissive, yOff = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (yOff) g.translate(0, yOff, 0);
    const mat = new THREE.MeshLambertMaterial({ color });
    if (emissive) {
      mat.emissive = new THREE.Color(emissive);
      mat.emissiveIntensity = 0.65;
    }
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  },

  _pl(w, h, d, color, y = 0, z = 0, x = 0, arg8, arg9) {
    const emissive = arg9 !== undefined ? arg9 : (typeof arg8 === 'number' && arg8 > 1 ? arg8 : undefined);
    const yOff = (typeof arg8 === 'number' && Math.abs(arg8) < 1) ? arg8 : 0;
    const m = this._box(w, h, d, color, emissive, yOff);
    m.position.set(x, y, z);
    return m;
  },

  /* Helper gagang di belakang perisai (sisi penahan lengan kiri) */
  _addBackGrip(g, primaryColor = 0x3a2e24, metalColor = 0x666e78) {
    g.add(this._pl(0.18, 0.04, 0.08, primaryColor, 0.08, -0.06));
    g.add(this._pl(0.18, 0.04, 0.08, primaryColor, -0.08, -0.06));
    g.add(this._pl(0.04, 0.18, 0.04, primaryColor, 0.0, -0.08, 0.06));
    g.add(this._pl(0.03, 0.03, 0.02, metalColor, 0.08, -0.04, 0.09));
    g.add(this._pl(0.03, 0.03, 0.02, metalColor, 0.08, -0.04, -0.09));
    g.add(this._pl(0.03, 0.03, 0.02, metalColor, -0.08, -0.04, 0.09));
    g.add(this._pl(0.03, 0.03, 0.02, metalColor, -0.08, -0.04, -0.09));
  },

  /* ---------- 1. BERSERKER PELT SHIELD (Tier Leather, Lv 1) ---------- */
  buildBerserker() {
    const g = new THREE.Group(); g.name = 'Shield_berserker';
    const C = { wood: 0x5a3c22, woodLight: 0x6e4a2c, fur: 0x7a6a5a, furLight: 0x9a8a7a, bone: 0xe8e0d0, iron: 0x4a4f56 };
    const plate = this._pl(0.48, 0.52, 0.04, C.wood, 0, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.54, 0.44, 0.04, C.wood, 0, 0));
    g.add(this._pl(0.44, 0.56, 0.04, C.woodLight, 0, 0));
    // Lapisan bulu serigala lebat di lingkar luar
    g.add(this._pl(0.58, 0.48, 0.05, C.fur, 0, 0.01));
    g.add(this._pl(0.48, 0.60, 0.05, C.fur, 0, 0.01));
    g.add(this._pl(0.54, 0.54, 0.045, C.furLight, 0, 0.01));
    // Palang silang besi tempa kasar
    g.add(this._pl(0.08, 0.50, 0.05, C.iron, 0, 0.025));
    g.add(this._pl(0.50, 0.08, 0.05, C.iron, 0, 0.025));
    // Bos tengah tulang pemangsa bundar menonjol
    g.add(this._pl(0.16, 0.16, 0.07, C.bone, 0, 0.04));
    g.add(this._pl(0.08, 0.08, 0.10, C.bone, 0, 0.06));
    // Paku-paku taring di lingkar tengah
    for (const [x, y] of [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]]) {
      g.add(this._pl(0.04, 0.04, 0.06, C.bone, y, 0.03, x));
    }
    // Sepasang tanduk binatang purba melengkung di sisi kiri-kanan atas
    for (const s of [1, -1]) {
      g.add(this._pl(0.06, 0.10, 0.06, C.bone, 0.28, 0.01, 0.24 * s));
      g.add(this._pl(0.05, 0.10, 0.05, C.bone, 0.36, -0.02, 0.28 * s));
      g.add(this._pl(0.04, 0.08, 0.04, C.bone, 0.42, -0.05, 0.31 * s));
    }
    this._addBackGrip(g, C.wood, C.iron);
    g.userData.rawH = 0.88;
    return g;
  },

  /* ---------- 2. ELVEN LEAF SHIELD (Tier Leather / Wood, Lv 1) ---------- */
  buildElven() {
    const g = new THREE.Group(); g.name = 'Shield_elven';
    const C = { wood: 0x1f3c24, leaf: 0x2e6138, leafLight: 0x489454, gold: 0xd9c26a, gem: 0x38e878, trim: 0x4a321a };
    const plate = this._pl(0.44, 0.36, 0.04, C.leaf, 0.08, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.38, 0.24, 0.04, C.leaf, -0.16, 0));
    g.add(this._pl(0.24, 0.22, 0.04, C.leaf, -0.32, 0));
    g.add(this._pl(0.12, 0.14, 0.04, C.leaf, -0.44, 0));
    g.add(this._pl(0.40, 0.58, 0.03, C.wood, -0.04, -0.015));
    // Ujung atas bertakik daun
    g.add(this._pl(0.16, 0.12, 0.04, C.leaf, 0.30, 0, 0.14));
    g.add(this._pl(0.16, 0.12, 0.04, C.leaf, 0.30, 0, -0.14));
    // Bingkai emas & urat daun
    g.add(this._pl(0.04, 0.64, 0.045, C.gold, 0, 0.015));
    g.add(this._pl(0.18, 0.03, 0.042, C.gold, 0.14, 0.015, 0.10));
    g.add(this._pl(0.18, 0.03, 0.042, C.gold, 0.14, 0.015, -0.10));
    g.add(this._pl(0.14, 0.03, 0.042, C.gold, -0.06, 0.015, 0.08));
    g.add(this._pl(0.14, 0.03, 0.042, C.gold, -0.06, 0.015, -0.08));
    // Inti zamrud bercahaya
    g.add(this._pl(0.12, 0.16, 0.06, C.gold, 0.04, 0.025));
    g.add(this._pl(0.08, 0.10, 0.08, C.gem, 0.04, 0.035, 0, C.gem));
    this._addBackGrip(g, C.trim, C.gold);
    g.userData.rawH = 0.94;
    return g;
  },

  /* ---------- 3. STEAM COG SHIELD (Tier Copper, Lv 7) ---------- */
  buildSteampunk() {
    const g = new THREE.Group(); g.name = 'Shield_steampunk';
    const C = { dark: 0x242830, copper: 0xc86a3b, copperLight: 0xdb8454, brass: 0xd4a038, meter: 0xf4f0e6, needle: 0xd9382a, pipe: 0xa8782a };
    const plate = this._pl(0.50, 0.50, 0.04, C.dark, 0, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.58, 0.36, 0.04, C.copper, 0, 0.01));
    g.add(this._pl(0.36, 0.58, 0.04, C.copper, 0, 0.01));
    g.add(this._pl(0.48, 0.48, 0.045, C.copperLight, 0, 0.015));
    // Roda gigi kuningan di 4 sudut
    for (const [x, y] of [[-0.20, 0.20], [0.20, 0.20], [-0.20, -0.20], [0.20, -0.20]]) {
      g.add(this._pl(0.12, 0.12, 0.05, C.brass, y, 0.025, x));
      g.add(this._pl(0.14, 0.04, 0.055, C.dark, y, 0.026, x));
      g.add(this._pl(0.04, 0.14, 0.055, C.dark, y, 0.026, x));
    }
    // Pipa uap kuningan & katup
    g.add(this._pl(0.04, 0.46, 0.05, C.pipe, 0, 0.025, 0.14));
    g.add(this._pl(0.04, 0.46, 0.05, C.pipe, 0, 0.025, -0.14));
    g.add(this._pl(0.10, 0.06, 0.06, C.brass, 0.28, 0.028));
    g.add(this._pl(0.10, 0.06, 0.06, C.brass, -0.28, 0.028));
    // Manometer tekanan uap
    g.add(this._pl(0.22, 0.22, 0.06, C.brass, 0, 0.03));
    g.add(this._pl(0.16, 0.16, 0.07, C.meter, 0, 0.04));
    const needle = this._pl(0.02, 0.08, 0.075, C.needle, 0.02, 0.045);
    needle.rotation.z = 0.6; g.add(needle);
    this._addBackGrip(g, C.dark, C.brass);
    g.userData.rawH = 0.86;
    return g;
  },

  /* ---------- 4. KNIGHT'S IRON PAVISE (Tier Iron, Lv 12) ---------- */
  buildIron() {
    const g = new THREE.Group(); g.name = 'Shield_iron';
    const C = { iron: 0x9aa6b4, ironLight: 0xc8d2de, darkIron: 0x383e46, gold: 0xd4a438, boss: 0x4e5762 };
    const plate = this._pl(0.50, 0.40, 0.04, C.iron, 0.10, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.44, 0.30, 0.04, C.iron, -0.12, 0));
    g.add(this._pl(0.28, 0.22, 0.04, C.iron, -0.30, 0));
    g.add(this._pl(0.12, 0.12, 0.04, C.iron, -0.42, 0));
    g.add(this._pl(0.52, 0.10, 0.042, C.darkIron, 0.26, 0.005));
    g.add(this._pl(0.22, 0.56, 0.042, C.ironLight, -0.04, 0.005, -0.10));
    // Salib heraldis emas ksatria
    g.add(this._pl(0.09, 0.54, 0.05, C.gold, -0.02, 0.02));
    g.add(this._pl(0.38, 0.09, 0.05, C.gold, 0.12, 0.02));
    // Bos pelindung hantaman piramidal
    g.add(this._pl(0.15, 0.15, 0.07, C.boss, 0.12, 0.035));
    g.add(this._pl(0.07, 0.07, 0.09, C.ironLight, 0.12, 0.05));
    // Rivet tempa
    for (const y of [0.24, 0.08, -0.08, -0.22, -0.34]) {
      g.add(this._pl(0.03, 0.03, 0.045, C.darkIron, y, 0.022, 0.21 - (0.24 - y) * 0.25));
      g.add(this._pl(0.03, 0.03, 0.045, C.darkIron, y, 0.022, -(0.21 - (0.24 - y) * 0.25)));
    }
    this._addBackGrip(g, C.darkIron, C.iron);
    g.userData.rawH = 0.96;
    return g;
  },

  /* ---------- 5. PALADIN SUNSHIELD (Tier Gold, Lv 22) ---------- */
  buildPaladin() {
    const g = new THREE.Group(); g.name = 'Shield_paladin';
    const C = { gold: 0xd4a028, goldBright: 0xf5c842, white: 0xfffae6, gem: 0xffa020, ruby: 0xd93824, dark: 0x5a3e14 };
    const plate = this._pl(0.52, 0.36, 0.04, C.gold, 0.14, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.44, 0.30, 0.04, C.gold, -0.12, 0));
    g.add(this._pl(0.30, 0.26, 0.04, C.gold, -0.32, 0));
    g.add(this._pl(0.14, 0.16, 0.04, C.gold, -0.48, 0));
    // Sayap emas pelindung
    for (const s of [1, -1]) {
      g.add(this._pl(0.10, 0.26, 0.045, C.goldBright, 0.22, 0.01, 0.24 * s));
      g.add(this._pl(0.08, 0.18, 0.045, C.white, 0.26, 0.012, 0.28 * s));
      g.add(this._pl(0.06, 0.12, 0.045, C.goldBright, 0.34, 0.014, 0.30 * s));
    }
    // Piringan matahari fajar & 8 berkas sinar
    g.add(this._pl(0.28, 0.28, 0.05, C.goldBright, 0.06, 0.02));
    g.add(this._pl(0.06, 0.44, 0.055, C.white, 0.06, 0.025));
    g.add(this._pl(0.44, 0.06, 0.055, C.white, 0.06, 0.025));
    const r1 = this._pl(0.32, 0.05, 0.052, C.goldBright, 0.06, 0.024); r1.rotation.z = 0.785; g.add(r1);
    const r2 = this._pl(0.32, 0.05, 0.052, C.goldBright, 0.06, 0.024); r2.rotation.z = -0.785; g.add(r2);
    // Inti surya bercahaya
    g.add(this._pl(0.14, 0.14, 0.07, C.ruby, 0.06, 0.035));
    g.add(this._pl(0.08, 0.08, 0.09, C.gem, 0.06, 0.048, 0, C.gem));
    this._addBackGrip(g, C.dark, C.gold);
    g.userData.rawH = 1.02;
    return g;
  },

  /* ---------- 6. SHADOW TUNGSTEN BUCKLER (Tier Tungsten, Lv 26) ---------- */
  buildShadow() {
    const g = new THREE.Group(); g.name = 'Shield_shadow';
    const C = { dark: 0x1a1e24, tungsten: 0x2e343e, blade: 0x5a6674, bladeEdge: 0xa0b0c2, crimson: 0xb52233, redGlow: 0xe8283a };
    const plate = this._pl(0.44, 0.44, 0.04, C.dark, 0, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.52, 0.30, 0.04, C.tungsten, 0, 0.01));
    g.add(this._pl(0.30, 0.52, 0.04, C.tungsten, 0, 0.01));
    // Bilah parry tajam di tepi kiri-kanan
    for (const s of [1, -1]) {
      g.add(this._pl(0.08, 0.36, 0.03, C.blade, 0, 0.012, 0.28 * s));
      g.add(this._pl(0.04, 0.44, 0.025, C.bladeEdge, 0, 0.015, 0.32 * s));
      g.add(this._pl(0.05, 0.12, 0.03, C.bladeEdge, 0.26, 0.015, 0.22 * s));
      g.add(this._pl(0.05, 0.12, 0.03, C.bladeEdge, -0.26, 0.015, 0.22 * s));
    }
    // Garis pola runik merah darah
    g.add(this._pl(0.24, 0.03, 0.045, C.crimson, 0.12, 0.02));
    g.add(this._pl(0.24, 0.03, 0.045, C.crimson, -0.12, 0.02));
    g.add(this._pl(0.03, 0.24, 0.045, C.crimson, 0, 0.02, 0.12));
    g.add(this._pl(0.03, 0.24, 0.045, C.crimson, 0, 0.02, -0.12));
    // Inti bayangan bersinar merah
    g.add(this._pl(0.14, 0.14, 0.06, C.dark, 0, 0.03));
    g.add(this._pl(0.08, 0.08, 0.075, C.redGlow, 0, 0.04, 0, C.redGlow));
    this._addBackGrip(g, C.dark, C.tungsten);
    g.userData.rawH = 0.84;
    return g;
  },

  /* ---------- 7. COLOSSUS TOWER BULWARK (Tier Tungsten, Lv 26) ---------- */
  buildJuggernaut() {
    const g = new THREE.Group(); g.name = 'Shield_juggernaut';
    const C = { dark: 0x22262c, tungsten: 0x3e4650, tungstenLight: 0x586474, iron: 0x728090, rivet: 0x9aa8b8 };
    const plate = this._pl(0.54, 0.76, 0.06, C.tungsten, 0, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.60, 0.56, 0.06, C.tungsten, 0, 0));
    // 3 Balok melintang penahan benturan
    g.add(this._pl(0.58, 0.10, 0.075, C.tungstenLight, 0.26, 0.015));
    g.add(this._pl(0.58, 0.10, 0.075, C.tungstenLight, 0.0, 0.015));
    g.add(this._pl(0.58, 0.10, 0.075, C.tungstenLight, -0.26, 0.015));
    // Celah pengintai (vision slit)
    g.add(this._pl(0.24, 0.05, 0.08, C.dark, 0.14, 0.02));
    g.add(this._pl(0.02, 0.05, 0.085, C.rivet, 0.14, 0.022, -0.06));
    g.add(this._pl(0.02, 0.05, 0.085, C.rivet, 0.14, 0.022, 0.06));
    // Paku benteng raksasa
    for (const y of [0.26, 0.0, -0.26]) {
      for (const x of [-0.25, -0.12, 0.12, 0.25]) {
        if (y === 0.0 && Math.abs(x) < 0.15) continue;
        g.add(this._pl(0.04, 0.04, 0.085, C.rivet, y, 0.025, x));
      }
    }
    // Duri penancap tanah bawah
    g.add(this._pl(0.12, 0.08, 0.06, C.dark, -0.42, 0, 0.16));
    g.add(this._pl(0.12, 0.08, 0.06, C.dark, -0.42, 0, -0.16));
    this._addBackGrip(g, C.dark, C.tungstenLight);
    g.userData.rawH = 1.05;
    return g;
  },

  /* ---------- 8. GLACIAL SPELLSHIELD (Tier Crystal, Lv 32) ---------- */
  buildCrystal() {
    const g = new THREE.Group(); g.name = 'Shield_crystal';
    const C = { iceDeep: 0x3b82f6, ice: 0x60a5fa, iceLight: 0xbfdbfe, rune: 0x38bdf8, core: 0x00f0ff, silver: 0xdbeafe };
    const plate = this._pl(0.48, 0.48, 0.04, C.iceDeep, 0, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.56, 0.32, 0.04, C.ice, 0, 0.01));
    g.add(this._pl(0.32, 0.56, 0.04, C.ice, 0, 0.01));
    // Prisma kristal es di 6 sudut
    for (const [x, y, rz] of [
      [0, 0.36, 0], [0, -0.36, Math.PI], [0.32, 0.18, -0.52], [-0.32, 0.18, 0.52], [0.32, -0.18, -2.62], [-0.32, -0.18, 2.62]
    ]) {
      const spike = this._pl(0.09, 0.16, 0.045, C.iceLight, y, 0.015, x, C.core);
      spike.rotation.z = rz; g.add(spike);
    }
    // Garis rune es perak
    g.add(this._pl(0.04, 0.48, 0.048, C.silver, 0, 0.02));
    g.add(this._pl(0.48, 0.04, 0.048, C.silver, 0, 0.02));
    const rx1 = this._pl(0.34, 0.035, 0.048, C.rune, 0, 0.022); rx1.rotation.z = 0.785; g.add(rx1);
    const rx2 = this._pl(0.34, 0.035, 0.048, C.rune, 0, 0.022); rx2.rotation.z = -0.785; g.add(rx2);
    // Inti oktahedron mana es
    g.add(this._pl(0.16, 0.16, 0.065, C.iceDeep, 0, 0.035));
    g.add(this._pl(0.10, 0.10, 0.09, C.core, 0, 0.05, 0, C.core));
    this._addBackGrip(g, C.iceDeep, C.silver);
    g.userData.rawH = 0.96;
    return g;
  },

  /* ---------- 9. SOUL HARVESTER GATE (Tier Crystal / Soul, Lv 32) ---------- */
  buildReaper() {
    const g = new THREE.Group(); g.name = 'Shield_reaper';
    const C = { dark: 0x14101b, obsidian: 0x22182e, purple: 0x4a2a68, bone: 0xd8cfe2, soulGlow: 0xa855f7, eyeGlow: 0xd946ef };
    const plate = this._pl(0.50, 0.64, 0.04, C.dark, 0, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.44, 0.72, 0.04, C.obsidian, 0.04, 0.005));
    g.add(this._pl(0.32, 0.14, 0.045, C.purple, 0.40, 0.01));
    // Cakar jiwa samping
    for (const s of [1, -1]) {
      g.add(this._pl(0.08, 0.22, 0.04, C.bone, 0.24, 0.012, 0.26 * s));
      g.add(this._pl(0.06, 0.22, 0.04, C.bone, -0.06, 0.012, 0.26 * s));
      g.add(this._pl(0.06, 0.18, 0.04, C.bone, -0.30, 0.012, 0.22 * s));
    }
    // Tengkorak maut timbul
    g.add(this._pl(0.24, 0.26, 0.055, C.bone, 0.08, 0.025));
    g.add(this._pl(0.18, 0.10, 0.06, C.bone, -0.08, 0.025));
    g.add(this._pl(0.04, 0.05, 0.065, C.dark, 0.05, 0.035));
    // Mata api jiwa ungu
    g.add(this._pl(0.05, 0.06, 0.065, C.eyeGlow, 0.12, 0.035, 0.055, C.eyeGlow));
    g.add(this._pl(0.05, 0.06, 0.065, C.eyeGlow, 0.12, 0.035, -0.055, C.eyeGlow));
    g.add(this._pl(0.04, 0.10, 0.05, C.soulGlow, 0.24, 0.02, 0, C.soulGlow));
    this._addBackGrip(g, C.dark, C.purple);
    g.userData.rawH = 0.98;
    return g;
  },

  /* ---------- 10. YETI GLACIER BARRICADE (Tier Crystal / Ice, Lv 32) ---------- */
  buildYeti() {
    const g = new THREE.Group(); g.name = 'Shield_yeti';
    const C = { iceDeep: 0x476a8a, ice: 0x769ebc, snow: 0xf0f6fc, fur: 0xccd9e6, horn: 0x8aa6be, hornDark: 0x5a768e };
    const plate = this._pl(0.52, 0.58, 0.05, C.iceDeep, 0, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.46, 0.52, 0.06, C.ice, 0, 0.01));
    g.add(this._pl(0.56, 0.14, 0.07, C.snow, 0.30, 0.015));
    g.add(this._pl(0.48, 0.08, 0.075, C.snow, 0.22, 0.02));
    g.add(this._pl(0.54, 0.12, 0.065, C.fur, -0.30, 0.015));
    // Sepasang tanduk domba beku raksasa di kiri-kanan
    for (const s of [1, -1]) {
      g.add(this._pl(0.12, 0.18, 0.09, C.hornDark, 0.18, 0.02, 0.26 * s));
      g.add(this._pl(0.10, 0.18, 0.08, C.horn, 0.04, 0.025, 0.30 * s));
      g.add(this._pl(0.08, 0.16, 0.07, C.horn, -0.10, 0.03, 0.26 * s));
      g.add(this._pl(0.06, 0.12, 0.06, C.snow, -0.18, 0.035, 0.18 * s));
    }
    g.add(this._pl(0.08, 0.14, 0.05, C.ice, -0.36, 0.01, -0.12));
    g.add(this._pl(0.08, 0.14, 0.05, C.ice, -0.36, 0.01, 0.12));
    this._addBackGrip(g, C.iceDeep, C.snow);
    g.userData.rawH = 0.94;
    return g;
  },

  /* ---------- 11. SAMURAI O-TATE (Tier Tungstensteel, Lv 38) ---------- */
  buildSamurai() {
    const g = new THREE.Group(); g.name = 'Shield_samurai';
    const C = { urushi: 0x181a1e, lamelar: 0x242830, cordRed: 0xba1e2b, cordLight: 0xd92e3c, gold: 0xdfa832, brass: 0xb58424 };
    const plate = this._pl(0.48, 0.80, 0.04, C.urushi, 0, 0);
    g.add(plate); g.userData.plate = plate;
    // Lamelar horizontal
    for (let i = -3; i <= 3; i++) {
      g.add(this._pl(0.44, 0.09, 0.045, C.lamelar, i * 0.105, 0.005));
    }
    // Anyaman tali sutra merah kirmizi (odoshi)
    for (const x of [-0.14, -0.05, 0.05, 0.14]) {
      g.add(this._pl(0.025, 0.74, 0.05, C.cordRed, 0, 0.012, x));
      for (let i = -3; i <= 3; i++) {
        g.add(this._pl(0.035, 0.03, 0.055, C.cordLight, i * 0.105, 0.015, x));
      }
    }
    // Mahkota emas Kuwagata
    g.add(this._pl(0.12, 0.08, 0.05, C.gold, 0.44, 0.015));
    const k1 = this._pl(0.04, 0.16, 0.045, C.gold, 0.50, 0.015, 0.08); k1.rotation.z = -0.4; g.add(k1);
    const k2 = this._pl(0.04, 0.16, 0.045, C.gold, 0.50, 0.015, -0.08); k2.rotation.z = 0.4; g.add(k2);
    // Mon klan bunga krisan emas
    g.add(this._pl(0.16, 0.16, 0.06, C.gold, 0.05, 0.022));
    g.add(this._pl(0.12, 0.12, 0.07, C.cordRed, 0.05, 0.026));
    g.add(this._pl(0.06, 0.06, 0.08, C.gold, 0.05, 0.032));
    this._addBackGrip(g, C.urushi, C.brass);
    g.userData.rawH = 1.08;
    return g;
  },

  /* ---------- 12. DRAGONSCALE GREATSHIELD (Tier Tungstensteel, Lv 38) ---------- */
  buildDragon() {
    const g = new THREE.Group(); g.name = 'Shield_dragon';
    const C = { scaleDark: 0x3d1210, scaleRed: 0x8a1c14, scaleBright: 0xb52216, lava: 0xff4500, horn: 0x2a0c0a, bone: 0xe5dac0, ember: 0xff7a18 };
    const plate = this._pl(0.54, 0.50, 0.05, C.scaleDark, 0.10, 0);
    g.add(plate); g.userData.plate = plate;
    g.add(this._pl(0.44, 0.38, 0.05, C.scaleRed, -0.12, 0));
    g.add(this._pl(0.26, 0.22, 0.05, C.scaleDark, -0.32, 0));
    // Urat lava pijar membara
    g.add(this._pl(0.04, 0.64, 0.055, C.lava, -0.02, 0.015, 0, C.lava));
    g.add(this._pl(0.36, 0.04, 0.055, C.lava, 0.14, 0.015, 0, C.lava));
    for (const [x, y] of [[-0.16, 0.22], [0.16, 0.22], [-0.14, -0.04], [0.14, -0.04], [0, 0.08]]) {
      g.add(this._pl(0.12, 0.12, 0.06, C.scaleBright, y, 0.018, x));
    }
    // Tanduk naga merah
    for (const s of [1, -1]) {
      g.add(this._pl(0.08, 0.20, 0.07, C.horn, 0.36, 0.01, 0.26 * s));
      g.add(this._pl(0.06, 0.18, 0.06, C.scaleRed, 0.48, -0.02, 0.30 * s));
      g.add(this._pl(0.04, 0.14, 0.05, C.lava, 0.58, -0.06, 0.33 * s, C.lava));
    }
    // Taring naga
    g.add(this._pl(0.05, 0.10, 0.05, C.bone, -0.40, 0.02, 0.10));
    g.add(this._pl(0.05, 0.10, 0.05, C.bone, -0.40, 0.02, -0.10));
    g.add(this._pl(0.06, 0.08, 0.05, C.bone, -0.42, 0.02, 0));
    // Inti bara naga menyala
    g.add(this._pl(0.18, 0.18, 0.07, C.scaleDark, 0.20, 0.025));
    g.add(this._pl(0.10, 0.10, 0.09, C.ember, 0.20, 0.045, 0, C.ember));
    this._addBackGrip(g, C.scaleDark, C.scaleBright);
    g.userData.rawH = 1.15;
    return g;
  },

  /* Peta id item -> builder */
  MAP: {
    // 12 Tameng Otentik Baru
    shield_berserker:  'buildBerserker',
    shield_elven:      'buildElven',
    shield_steampunk:  'buildSteampunk',
    shield_iron:       'buildIron',
    shield_paladin:    'buildPaladin',
    shield_shadow:     'buildShadow',
    shield_juggernaut: 'buildJuggernaut',
    shield_crystal:    'buildCrystal',
    shield_reaper:     'buildReaper',
    shield_yeti:       'buildYeti',
    shield_samurai:    'buildSamurai',
    shield_dragon:     'buildDragon',

    // Alias kompatibilitas mundur untuk save/drop/inventory lama
    shield_wood:       'buildBerserker',
    shield_flame:      'buildPaladin',
    shield_venom:      'buildShadow',
    shield_storm:      'buildJuggernaut',
    shield_frost:      'buildCrystal',
    shield_dark:       'buildReaper',
    shield_carapace:   'buildDragon'
  },

  /* Bangun tameng untuk itemId dan skalakan ke TARGET_H */
  buildFor(itemId) {
    const fn = this.MAP[itemId];
    if (!fn || typeof this[fn] !== 'function') return null;
    const g = this[fn]();
    const raw = g.userData.rawH || 1.0;
    g.scale.multiplyScalar(this.TARGET_H / raw);
    return g;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShieldModels;
}
