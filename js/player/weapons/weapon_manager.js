'use strict';
/* =================================================================
   FORECRAFT 3D - WEAPON MANAGER (12 AUTHENTIC SWORDS)
   File: js/player/weapons/weapon_manager.js
   Manajer 12 pedang otentik Forecraft dari Player Character.html / Swords.html:
   1. Berserker Bonecleaver (sword_berserker)
   2. Elven Leafblade (sword_elven / sword_wood)
   3. Steam Cogblade (sword_steampunk / sword_copper)
   4. Knight's Iron Greatsword (sword_iron)
   5. Paladin Sunblade (sword_paladin / sword_gold / sword_storm)
   6. Shadow Tungsten Ninjato (sword_shadow / sword_venom)
   7. Colossus Siege Greatsword (sword_juggernaut / sword_tungsten)
   8. Glacial Spellblade (sword_crystal / sword_obsidian)
   9. Soul Reaper Scythe (sword_reaper)
   10. Yeti Glacier Claymore (sword_yeti / sword_frost)
   11. Muramasa Baja Tungsten (sword_samurai)
   12. Dragonfang Greatsword (sword_dragon / sword_titan)
   ================================================================= */

const WeaponManager = (function() {
  const M = {
    box(w, h, d, color, yOff = 0, emissive = 0) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (yOff !== 0) g.translate(0, yOff, 0);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
        color,
        emissive: emissive || 0
      }));
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    },
    pl(w, h, d, color, y = 0, z = 0, x = 0, yOff = 0, emissive = 0) {
      const m = this.box(w, h, d, color, yOff, emissive);
      m.position.set(x, y, z);
      return m;
    }
  };

  const SWORDS_DATA = [
    /* 1. BERSERKER BONECLEAVER */
    {
      id: 'sword_berserker',
      name: 'Berserker Bonecleaver',
      tier: 'leather',
      colors: { blade: 0xe8e0d0, dark: 0x5a422e, trim: 0x3d2a1a, fur: 0x7a6a5a, bone: 0xd8d0c0, blood: 0x8a2a1a },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_berserker'; const C = this.colors;
        g.add(M.pl(0.06, 0.05, 0.06, C.trim, -0.12));
        g.add(M.pl(0.04, 0.08, 0.04, C.bone, -0.16, -0.02));
        g.add(M.pl(0.05, 0.20, 0.05, C.dark, 0.0));
        g.add(M.pl(0.07, 0.06, 0.07, C.fur, 0.06));
        g.add(M.pl(0.07, 0.05, 0.07, C.fur, -0.06));
        g.add(M.pl(0.24, 0.06, 0.08, C.bone, 0.12));
        g.add(M.pl(0.28, 0.03, 0.06, C.trim, 0.13));
        g.add(M.pl(0.05, 0.08, 0.05, C.bone, 0.16, 0, 0.12));
        g.add(M.pl(0.05, 0.08, 0.05, C.bone, 0.16, 0, -0.12));
        g.add(M.pl(0.12, 0.65, 0.035, C.blade, 0.48));
        g.add(M.pl(0.04, 0.60, 0.045, C.trim, 0.46, 0, -0.05));
        for (let i = 0; i < 5; i++) g.add(M.pl(0.04, 0.06, 0.03, C.blood, 0.28 + i * 0.11, 0, 0.07));
        g.add(M.pl(0.16, 0.14, 0.035, C.blade, 0.84, 0, 0.02));
        g.add(M.pl(0.08, 0.08, 0.03, C.bone, 0.92, 0, 0.04));
        return g;
      }
    },

    /* 2. ELVEN LEAFBLADE */
    {
      id: 'sword_elven',
      name: 'Elven Leafblade',
      tier: 'leather',
      colors: { blade: 0x5f9e50, edge: 0x8fe07a, wood: 0x6a4a2a, gold: 0xd9c26a, glow: 0xa8f590 },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_elven'; const C = this.colors;
        g.add(M.pl(0.06, 0.07, 0.06, C.gold, -0.13));
        g.add(M.pl(0.05, 0.20, 0.05, C.wood, 0.0));
        for (let i = 0; i < 3; i++) g.add(M.pl(0.06, 0.02, 0.06, C.gold, -0.06 + i * 0.06));
        g.add(M.pl(0.26, 0.05, 0.07, C.wood, 0.12));
        g.add(M.pl(0.04, 0.14, 0.06, C.gold, 0.17, 0, 0.14));
        g.add(M.pl(0.04, 0.14, 0.06, C.gold, 0.17, 0, -0.14));
        g.add(M.pl(0.06, 0.06, 0.06, C.edge, 0.12, 0, 0, 0, C.glow));
        g.add(M.pl(0.08, 0.72, 0.025, C.blade, 0.50));
        g.add(M.pl(0.02, 0.68, 0.030, C.gold, 0.49));
        g.add(M.pl(0.015, 0.70, 0.028, C.edge, 0.50, 0, 0.038, 0, C.glow));
        g.add(M.pl(0.015, 0.70, 0.028, C.edge, 0.50, 0, -0.038, 0, C.glow));
        g.add(M.pl(0.06, 0.12, 0.022, C.edge, 0.88, 0, 0, 0, C.glow));
        g.add(M.pl(0.03, 0.08, 0.018, C.gold, 0.94));
        return g;
      }
    },

    /* 3. STEAM COGBLADE (Copper) */
    {
      id: 'sword_steampunk',
      name: 'Steam Cogblade',
      tier: 'copper',
      colors: { copper: 0xb06a3a, brass: 0xc89a4a, dark: 0x4a3520, pipe: 0x3a5a6a, blade: 0xd98a4a },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_steampunk'; const C = this.colors;
        g.add(M.pl(0.07, 0.04, 0.07, C.brass, -0.13));
        g.add(M.pl(0.05, 0.20, 0.05, C.dark, 0.0));
        for (let i = 0; i < 3; i++) g.add(M.pl(0.06, 0.02, 0.06, C.brass, -0.06 + i * 0.06));
        g.add(M.pl(0.24, 0.06, 0.08, C.copper, 0.12));
        g.add(M.pl(0.12, 0.12, 0.09, C.brass, 0.13));
        for (let a = 0; a < 4; a++) {
          g.add(M.pl(0.03, 0.03, 0.08, C.dark, 0.13 + Math.sin(a * 1.5) * 0.06, 0, Math.cos(a * 1.5) * 0.06));
        }
        g.add(M.pl(0.03, 0.14, 0.03, C.pipe, 0.19, 0.04, 0.10));
        g.add(M.pl(0.09, 0.70, 0.03, C.copper, 0.51));
        g.add(M.pl(0.03, 0.65, 0.035, C.brass, 0.51, 0, -0.04));
        for (let i = 0; i < 7; i++) g.add(M.pl(0.03, 0.05, 0.025, C.blade, 0.25 + i * 0.09, 0, 0.055));
        g.add(M.pl(0.07, 0.10, 0.028, C.blade, 0.89, 0, 0.01));
        g.add(M.pl(0.03, 0.06, 0.02, C.brass, 0.95, 0, 0.02));
        return g;
      }
    },

    /* 4. KNIGHT'S IRON GREATSWORD */
    {
      id: 'sword_iron',
      name: "Knight's Iron Greatsword",
      tier: 'iron',
      colors: { blade: 0xdce2ea, metal: 0x9aa2ac, dark: 0x3a3f45, gem: 0x44cc77, gold: 0xc8a040 },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_iron'; const C = this.colors;
        g.add(M.pl(0.08, 0.06, 0.08, C.metal, -0.15));
        g.add(M.pl(0.04, 0.04, 0.04, C.gem, -0.15, 0, 0, 0, C.gem));
        g.add(M.pl(0.05, 0.22, 0.05, C.dark, 0.0));
        g.add(M.pl(0.06, 0.02, 0.06, C.metal, 0.0));
        g.add(M.pl(0.32, 0.06, 0.09, C.metal, 0.13));
        g.add(M.pl(0.34, 0.03, 0.07, C.dark, 0.15));
        g.add(M.pl(0.06, 0.08, 0.08, C.metal, 0.14, 0, 0.15));
        g.add(M.pl(0.06, 0.08, 0.08, C.metal, 0.14, 0, -0.15));
        g.add(M.pl(0.06, 0.06, 0.06, C.gem, 0.13, 0, 0, 0, C.gem));
        g.add(M.pl(0.10, 0.78, 0.03, C.blade, 0.55));
        g.add(M.pl(0.03, 0.65, 0.035, C.dark, 0.53));
        g.add(M.pl(0.015, 0.72, 0.032, 0xffffff, 0.55, 0, 0.045));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.03, 0.04, 0.025, C.blade, 0.24 + i * 0.07, 0, 0.06));
        g.add(M.pl(0.08, 0.10, 0.028, C.blade, 0.98));
        g.add(M.pl(0.05, 0.08, 0.024, C.blade, 1.05));
        g.add(M.pl(0.02, 0.06, 0.018, 0xffffff, 1.10));
        return g;
      }
    },

    /* 5. PALADIN SUNBLADE (Gold) */
    {
      id: 'sword_paladin',
      name: 'Paladin Sunblade',
      tier: 'gold',
      colors: { gold: 0xd9b23a, bright: 0xffe07a, white: 0xfff8e0, glow: 0xffd24d, ruby: 0xff3344 },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_paladin'; const C = this.colors;
        g.add(M.pl(0.08, 0.06, 0.08, C.gold, -0.14));
        g.add(M.pl(0.04, 0.04, 0.04, C.glow, -0.14, 0, 0, 0, C.glow));
        g.add(M.pl(0.05, 0.20, 0.05, C.bright, 0.0));
        for (let i = 0; i < 3; i++) g.add(M.pl(0.06, 0.02, 0.06, C.white, -0.06 + i * 0.06));
        g.add(M.pl(0.34, 0.06, 0.08, C.gold, 0.12));
        for (const s of [1, -1]) {
          g.add(M.pl(0.05, 0.16, 0.06, C.bright, 0.17, 0, 0.17 * s));
          g.add(M.pl(0.04, 0.12, 0.05, C.white, 0.25, 0, 0.19 * s));
        }
        g.add(M.pl(0.07, 0.07, 0.07, C.ruby, 0.12, 0, 0, 0, 0xff2233));
        g.add(M.pl(0.09, 0.80, 0.03, C.bright, 0.56, 0, 0, 0, C.glow));
        g.add(M.pl(0.03, 0.70, 0.035, C.white, 0.55));
        g.add(M.pl(0.015, 0.75, 0.032, 0xffffff, 0.56, 0, 0.042));
        g.add(M.pl(0.07, 0.10, 0.028, C.bright, 1.00));
        g.add(M.pl(0.04, 0.08, 0.022, C.white, 1.07, 0, 0, 0, C.glow));
        g.add(M.pl(0.02, 0.05, 0.018, 0xffffff, 1.12));
        return g;
      }
    },

    /* 6. SHADOW TUNGSTEN NINJATO */
    {
      id: 'sword_shadow',
      name: 'Shadow Tungsten Ninjato',
      tier: 'tungsten',
      colors: { tungsten: 0x2e333a, dark: 0x181a1e, ruby: 0xb52233, glow: 0xff2244, silver: 0x6e7682 },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_shadow'; const C = this.colors;
        g.add(M.pl(0.06, 0.04, 0.06, C.tungsten, -0.13));
        g.add(M.pl(0.03, 0.02, 0.03, C.ruby, -0.15, 0, 0, 0, C.glow));
        g.add(M.pl(0.045, 0.20, 0.045, C.dark, 0.0));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.05, 0.02, 0.05, C.tungsten, -0.07 + i * 0.05));
        g.add(M.pl(0.16, 0.025, 0.16, C.tungsten, 0.12));
        g.add(M.pl(0.14, 0.03, 0.14, C.dark, 0.12));
        g.add(M.pl(0.065, 0.78, 0.022, C.tungsten, 0.53));
        g.add(M.pl(0.018, 0.76, 0.024, C.ruby, 0.53, 0, 0, 0, C.glow));
        g.add(M.pl(0.012, 0.74, 0.025, C.silver, 0.53, 0, 0.032));
        g.add(M.pl(0.05, 0.10, 0.022, C.tungsten, 0.95, 0, -0.01));
        g.add(M.pl(0.03, 0.08, 0.020, C.ruby, 1.01, 0, -0.015, 0, C.glow));
        return g;
      }
    },

    /* 7. COLOSSUS SIEGE GREATSWORD (Tungsten) */
    {
      id: 'sword_juggernaut',
      name: 'Colossus Siege Greatsword',
      tier: 'tungsten',
      colors: { main: 0x4a4f52, metal: 0x6a7076, dark: 0x22262a, green: 0x98e874 },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_juggernaut'; const C = this.colors;
        g.add(M.pl(0.10, 0.08, 0.10, C.dark, -0.17));
        g.add(M.pl(0.06, 0.06, 0.06, C.metal, -0.17));
        g.add(M.pl(0.065, 0.24, 0.065, C.main, 0.0));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.08, 0.025, 0.08, C.dark, -0.09 + i * 0.06));
        g.add(M.pl(0.36, 0.09, 0.12, C.main, 0.15));
        g.add(M.pl(0.38, 0.04, 0.10, C.metal, 0.17));
        g.add(M.pl(0.08, 0.12, 0.10, C.dark, 0.16, 0, 0.18));
        g.add(M.pl(0.08, 0.12, 0.10, C.dark, 0.16, 0, -0.18));
        g.add(M.pl(0.16, 0.84, 0.045, C.main, 0.59));
        g.add(M.pl(0.06, 0.76, 0.055, C.metal, 0.59));
        for (let i = 0; i < 3; i++) g.add(M.pl(0.03, 0.08, 0.06, C.green, 0.36 + i * 0.22, 0, 0, 0, C.green));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.04, 0.06, 0.04, C.dark, 0.31 + i * 0.16, 0, -0.09));
        g.add(M.pl(0.14, 0.12, 0.042, C.metal, 1.05));
        g.add(M.pl(0.08, 0.08, 0.035, C.main, 1.13));
        return g;
      }
    },

    /* 8. GLACIAL SPELLBLADE (Crystal / Obsidian) */
    {
      id: 'sword_crystal',
      name: 'Glacial Spellblade',
      tier: 'crystal',
      colors: { crystal: 0x7fd8ff, core: 0xd6f4ff, dark: 0x2a5a80, glow: 0x9fe8ff },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_crystal'; const C = this.colors;
        g.add(M.pl(0.06, 0.08, 0.06, C.crystal, -0.14, 0, 0, 0, C.glow));
        g.add(M.pl(0.045, 0.20, 0.045, C.dark, 0.0));
        g.add(M.pl(0.055, 0.03, 0.055, C.crystal, 0.0, 0, 0, 0, C.glow));
        g.add(M.pl(0.28, 0.04, 0.07, C.crystal, 0.12, 0, 0, 0, C.glow));
        for (const s of [1, -1]) {
          g.add(M.pl(0.04, 0.12, 0.05, C.core, 0.17, 0, 0.13 * s, 0, C.glow));
          g.add(M.pl(0.03, 0.08, 0.04, C.crystal, 0.24, 0, 0.16 * s));
        }
        g.add(M.pl(0.08, 0.82, 0.03, C.crystal, 0.56, 0, 0, 0, C.glow));
        g.add(M.pl(0.04, 0.74, 0.036, C.core, 0.56, 0, 0, 0, 0xffffff));
        for (let i = 0; i < 4; i++) {
          g.add(M.pl(0.025, 0.05, 0.025, C.core, 0.32 + i * 0.16, 0, 0.045, 0, C.glow));
          g.add(M.pl(0.025, 0.05, 0.025, C.core, 0.32 + i * 0.16, 0, -0.045, 0, C.glow));
        }
        g.add(M.pl(0.06, 0.10, 0.026, C.crystal, 1.00, 0, 0, 0, C.glow));
        g.add(M.pl(0.03, 0.08, 0.020, C.core, 1.07, 0, 0, 0, 0xffffff));
        return g;
      }
    },

    /* 9. SOUL REAPER SCYTHE */
    {
      id: 'sword_reaper',
      name: 'Soul Reaper Scythe',
      tier: 'crystal',
      colors: { shaft: 0x160c22, skull: 0xe2dac8, blade: 0x42265e, edge: 0xe8d0ff, glow: 0xb060ff, glowCore: 0xe0a0ff },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_reaper'; const C = this.colors;
        g.add(M.pl(0.045, 1.15, 0.045, C.shaft, 0.05));
        g.add(M.pl(0.04, 0.07, 0.04, C.skull, -0.52));
        g.add(M.pl(0.065, 0.08, 0.12, C.shaft, 0.60, 0.05));
        g.add(M.pl(0.12, 0.12, 0.12, C.skull, 0.60, 0.02));
        g.add(M.pl(0.035, 0.035, 0.035, C.glow, 0.62, 0.07, 0.035, 0, C.glowCore));
        g.add(M.pl(0.035, 0.035, 0.035, C.glow, 0.62, 0.07, -0.035, 0, C.glowCore));
        g.add(M.pl(0.065, 0.05, 0.075, 0x221830, 0.66, 0.14));
        g.add(M.pl(0.065, 0.05, 0.075, 0x221830, 0.66, 0.21));
        g.add(M.pl(0.065, 0.05, 0.075, 0x221830, 0.61, 0.28));
        const bladeSegments = [
          [0, 0.60, 0.14], [0, 0.60, 0.21], [0.027, 0.56, 0.28], [0.054, 0.52, 0.35],
          [0.075, 0.48, 0.35], [0.102, 0.44, 0.42], [0.116, 0.39, 0.42], [0.143, 0.35, 0.49]
        ];
        bladeSegments.forEach(p => g.add(M.pl(0.065, 0.075, 0.075, C.blade, p[1], p[2], p[0])));
        const edgeSegments = [
          [0.014, 0.50, 0.21], [0.041, 0.46, 0.28], [0.068, 0.41, 0.35], [0.095, 0.35, 0.42]
        ];
        edgeSegments.forEach(p => g.add(M.pl(0.032, 0.048, 0.072, C.edge, p[1], p[2], p[0], 0, C.glow)));
        g.add(M.pl(0.032, 0.072, 0.055, C.edge, 0.29, 0.49, 0.143, 0, C.glowCore));
        return g;
      }
    },

    /* 10. YETI GLACIER CLAYMORE */
    {
      id: 'sword_yeti',
      name: 'Yeti Glacier Claymore',
      tier: 'crystal',
      colors: { ice: 0x9fd8f0, fur: 0xf0f4f8, trim: 0xa8c0d0, glow: 0x8fdcff, dark: 0x4a6a80 },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_yeti'; const C = this.colors;
        g.add(M.pl(0.09, 0.07, 0.09, C.ice, -0.15, 0, 0, 0, C.glow));
        g.add(M.pl(0.055, 0.22, 0.055, C.dark, 0.0));
        g.add(M.pl(0.075, 0.16, 0.075, C.fur, 0.0));
        g.add(M.pl(0.32, 0.08, 0.10, C.ice, 0.15, 0, 0, 0, C.glow));
        for (const s of [1, -1]) {
          g.add(M.pl(0.06, 0.12, 0.06, C.ice, 0.19, 0, 0.18 * s, 0, C.glow));
          g.add(M.pl(0.05, 0.08, 0.05, C.fur, 0.25, 0, 0.22 * s));
        }
        g.add(M.pl(0.13, 0.82, 0.04, C.ice, 0.59, 0, 0, 0, C.glow));
        g.add(M.pl(0.05, 0.74, 0.046, C.fur, 0.59));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.035, 0.06, 0.03, C.ice, 0.33 + i * 0.18, 0, 0.08, 0, C.glow));
        g.add(M.pl(0.10, 0.12, 0.036, C.ice, 1.03, 0, 0, 0, C.glow));
        g.add(M.pl(0.05, 0.08, 0.030, C.glow, 1.11, 0, 0, 0, 0xffffff));
        return g;
      }
    },

    /* 11. MURAMASA BAJA TUNGSTEN (Samurai) */
    {
      id: 'sword_samurai',
      name: 'Muramasa Baja Tungsten',
      tier: 'tungstensteel',
      colors: { steel: 0x3d4855, lac: 0x8a1a1a, gold: 0xd9b23a, dark: 0x181c22, silver: 0x9aa2ac },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_samurai'; const C = this.colors;
        g.add(M.pl(0.055, 0.04, 0.055, C.gold, -0.14));
        g.add(M.pl(0.045, 0.22, 0.045, C.dark, 0.0));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.052, 0.025, 0.052, C.lac, -0.08 + i * 0.055));
        g.add(M.pl(0.14, 0.025, 0.14, C.gold, 0.14));
        g.add(M.pl(0.12, 0.03, 0.12, C.dark, 0.14));
        g.add(M.pl(0.06, 0.05, 0.03, C.gold, 0.17));
        g.add(M.pl(0.055, 0.82, 0.022, C.steel, 0.58, 0, 0.005));
        g.add(M.pl(0.02, 0.80, 0.025, C.lac, 0.58, 0, -0.015));
        g.add(M.pl(0.012, 0.80, 0.025, 0xffffff, 0.58, 0, 0.028));
        g.add(M.pl(0.04, 0.10, 0.020, C.steel, 1.02, 0, 0.012));
        g.add(M.pl(0.02, 0.06, 0.016, 0xffffff, 1.08, 0, 0.02));
        return g;
      }
    },

    /* 12. DRAGONFANG GREATSWORD (Dragonscale) */
    {
      id: 'sword_dragon',
      name: 'Dragonfang Greatsword',
      tier: 'tungstensteel',
      colors: { red: 0xC8352A, dark: 0x99251C, belly: 0xE8B274, bone: 0xEDE0C2, membrane: 0x8F1B12, flame: 0xFF5500, core: 0xFFCC33 },
      build() {
        const g = new THREE.Group(); g.name = 'Weapon_sword_dragon'; const C = this.colors;
        g.add(M.pl(0.09, 0.07, 0.09, C.dark, -0.17));
        g.add(M.pl(0.04, 0.08, 0.04, C.bone, -0.21, 0, 0));
        g.add(M.pl(0.06, 0.24, 0.06, C.dark, 0.0));
        for (let i = 0; i < 3; i++) g.add(M.pl(0.07, 0.025, 0.07, C.belly, -0.09 + i * 0.08));
        g.add(M.pl(0.36, 0.08, 0.10, C.red, 0.15));
        for (const s of [1, -1]) {
          g.add(M.pl(0.05, 0.20, 0.12, C.membrane, 0.23, 0, 0.20 * s));
          g.add(M.pl(0.04, 0.14, 0.05, C.bone, 0.29, 0, 0.24 * s));
        }
        g.add(M.pl(0.08, 0.08, 0.08, C.belly, 0.15, 0, 0));
        g.add(M.pl(0.04, 0.04, 0.04, C.core, 0.15, 0.04, 0, 0, C.flame));
        g.add(M.pl(0.14, 0.88, 0.04, C.red, 0.61));
        g.add(M.pl(0.06, 0.80, 0.048, C.belly, 0.61));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.03, 0.09, 0.055, C.flame, 0.33 + i * 0.18, 0, 0, 0, C.core));
        for (let i = 0; i < 5; i++) g.add(M.pl(0.04, 0.06, 0.03, C.bone, 0.29 + i * 0.15, 0, -0.08));
        g.add(M.pl(0.11, 0.14, 0.038, C.red, 1.07));
        g.add(M.pl(0.06, 0.10, 0.030, C.bone, 1.15, 0, 0.01));
        g.add(M.pl(0.03, 0.06, 0.020, C.core, 1.21, 0, 0.02, 0, C.flame));
        return g;
      }
    }
  ];

  const swordMap = {};
  SWORDS_DATA.forEach(s => {
    swordMap[s.id] = s;
  });

  return {
    catalog: SWORDS_DATA,
    weapons: swordMap,

    resolveId(id = 'sword_iron') {
      if (!id) return 'sword_iron';
      const k = ('' + id).toLowerCase().trim();
      if (swordMap[k]) return k;

      // Pemetaan item lama ke pedang otentik baru
      if (k === 'sword_wood' || k.includes('elven') || k.includes('leaf')) return 'sword_elven';
      if (k === 'sword_iron' || k.includes('knight')) return 'sword_iron';
      if (k === 'sword_storm' || k === 'sword_gold' || k.includes('paladin') || k.includes('sun')) return 'sword_paladin';
      if (k === 'sword_venom' || k.includes('shadow') || k.includes('ninja')) return 'sword_shadow';
      if (k === 'sword_frost' || k.includes('yeti') || k.includes('glacial')) return 'sword_yeti';
      if (k === 'sword_titan' || k.includes('dragon') || k.includes('dragonfang')) return 'sword_dragon';
      if (k.includes('berserker') || k.includes('bone')) return 'sword_berserker';
      if (k.includes('copper') || k.includes('steam')) return 'sword_steampunk';
      if (k.includes('juggernaut') || k.includes('tungsten') || k.includes('siege')) return 'sword_juggernaut';
      if (k.includes('crystal') || k.includes('obsidian') || k.includes('spellblade')) return 'sword_crystal';
      if (k.includes('reaper') || k.includes('scythe')) return 'sword_reaper';
      if (k.includes('samurai') || k.includes('katana') || k.includes('muramasa')) return 'sword_samurai';

      return 'sword_iron';
    },

    getWeapon(id = 'sword_iron') {
      const realId = this.resolveId(id);
      return swordMap[realId] || swordMap.sword_iron;
    },

    buildWeapon(weaponId = 'sword_iron') {
      const s = this.getWeapon(weaponId);
      const g = s ? s.build() : new THREE.Group();

      // Normalisasi posisi grip di tangan karakter: (0, -0.29, 0.02)
      // dan orientasi rotasi X = 90 derajat menghadap ke depan
      g.position.set(0, -0.29, 0.02);
      g.rotation.x = Math.PI / 2;
      return g;
    },

    attachToCharacterHand(characterParts, weaponId = 'sword_iron') {
      if (!characterParts || !characterParts.armR) return;
      const fore = characterParts.armR.userData ? characterParts.armR.userData.fore : null;
      if (!fore) return;

      // Bersihkan senjata lama dari tangan
      for (let i = fore.children.length - 1; i >= 0; i--) {
        const c = fore.children[i];
        if (c.name && (c.name.startsWith('Weapon_') || c.name.startsWith('Sword_') || c.name.startsWith('Held_'))) {
          fore.remove(c);
          if (c.traverse) {
            c.traverse(o => {
              if (o.geometry) o.geometry.dispose();
              if (o.material) o.material.dispose();
            });
          }
        }
      }

      // Bangun senjata baru dan tempelkan
      const weaponMesh = this.buildWeapon(weaponId);
      fore.add(weaponMesh);
      characterParts.sword = weaponMesh;
    }
  };
})();

window.WeaponManager = WeaponManager;
window.Weapon3DModels = WeaponManager;
if (typeof module !== 'undefined') module.exports = WeaponManager;
