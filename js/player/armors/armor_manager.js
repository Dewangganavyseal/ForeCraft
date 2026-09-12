'use strict';
/* =================================================================
   FORECRAFT 3D - ARMOR MANAGER (12 AUTHENTIC SETS)
   File: js/player/armors/armor_manager.js
   Manajer 12 set zirah otentik dari Player Character.html / Armor Sets.html:
   1. Berserker Fur
   2. Elven Ranger
   3. Steampunk Engineer (Copper)
   4. Iron Knight
   5. Gold Paladin
   6. Shadow Assassin (Tungsten)
   7. Tungsten Juggernaut
   8. Crystal Mage
   9. Reaper Cult
   10. Frost Yeti
   11. Samurai (Tungstensteel)
   12. Dragonscale (Tungstensteel)
   ================================================================= */

const ArmorManager = (function() {
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

  const ARMOR_SETS = [
    /* 1. BERSERKER FUR (Tier Leather, Lv 1) */
    {
      id: 'berserker',
      name: 'Berserker Fur',
      tier: 'leather',
      colors: { main: 0x5a422e, trim: 0x3d2a1a, fur: 0x7a6a5a, furLight: 0x9a8a7a, bone: 0xe8e0d0, accent: 0x8a2a1a },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.54, 0.24, 0.50, C.fur, 0.44));
        g.add(M.pl(0.56, 0.10, 0.52, C.trim, 0.34));
        g.add(M.pl(0.50, 0.34, 0.14, C.fur, 0.20, -0.21));
        g.add(M.pl(0.10, 0.28, 0.40, C.fur, 0.22, 0, 0.25));
        g.add(M.pl(0.10, 0.28, 0.40, C.fur, 0.22, 0, -0.25));
        g.add(M.pl(0.46, 0.10, 0.08, C.furLight, 0.34, 0.23));
        g.add(M.pl(0.06, 0.10, 0.10, C.fur, 0.54, 0.02, 0.18));
        g.add(M.pl(0.06, 0.10, 0.10, C.fur, 0.54, 0.02, -0.18));
        for (const s of [1, -1]) {
          g.add(M.pl(0.08, 0.08, 0.18, C.bone, 0.46, -0.05, 0.30 * s));
          g.add(M.pl(0.06, 0.06, 0.15, C.bone, 0.53, -0.14, 0.34 * s));
          g.add(M.pl(0.05, 0.09, 0.06, C.bone, 0.59, -0.17, 0.36 * s));
        }
        for (const x of [-0.14, -0.07, 0, 0.07, 0.14]) g.add(M.pl(0.03, 0.06, 0.03, C.bone, 0.30, 0.25, x));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.58, 0.38, 0.38, C.fur, 0.48));
        g.add(M.pl(0.60, 0.12, 0.40, C.furLight, 0.66));
        g.add(M.pl(0.56, 0.20, 0.36, C.trim, 0.26));
        const s1 = M.pl(0.52, 0.06, 0.03, C.trim, 0.48, 0.20); s1.rotation.z = 0.5; g.add(s1);
        const s2 = M.pl(0.52, 0.06, 0.03, C.trim, 0.48, 0.20); s2.rotation.z = -0.5; g.add(s2);
        g.add(M.pl(0.12, 0.12, 0.05, C.bone, 0.48, 0.215));
        for (const x of [-0.14, -0.07, 0.07, 0.14]) g.add(M.pl(0.035, 0.09, 0.03, C.bone, 0.58, 0.20, x));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.18, 0.34, C.fur, 0.08));
        waist.add(M.pl(0.50, 0.08, 0.35, C.trim, 0.14));
        waist.add(M.pl(0.14, 0.12, 0.06, C.bone, 0.14, 0.19));
        waist.add(M.pl(0.20, 0.20, 0.06, C.furLight, 0.03, 0.19));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.24, 0.30, 0.24, C.main, -0.15));
          g.add(M.pl(0.25, 0.10, 0.25, C.fur, -0.06));
          g.add(M.pl(0.245, 0.035, 0.245, C.trim, -0.18));
          g.add(M.pl(0.08, 0.08, 0.05, C.bone, -0.30, 0.13));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.30, 0.16, 0.30, C.fur, -0.02));
        g.add(M.pl(0.28, 0.06, 0.28, C.furLight, 0.07));
        g.add(M.pl(0.06, 0.14, 0.06, C.bone, 0.11, 0, 0.08));
        g.add(M.pl(0.06, 0.14, 0.06, C.bone, 0.11, 0, -0.08));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.25, 0.28, 0.25, C.fur, -0.15));
        g.add(M.pl(0.26, 0.08, 0.26, C.furLight, -0.02));
        g.add(M.pl(0.26, 0.14, 0.32, C.main, -0.32, 0.03));
        g.add(M.pl(0.21, 0.08, 0.13, C.bone, -0.34, 0.17));
        g.add(M.pl(0.26, 0.05, 0.32, C.trim, -0.38, 0.03));
        return g;
      }
    },

    /* 2. ELVEN RANGER (Tier Leather / Wood, Lv 1) */
    {
      id: 'elven',
      name: 'Elven Ranger',
      tier: 'leather',
      colors: { main: 0x4a7a4a, trim: 0x33582f, leaf: 0x5f9e50, wood: 0x6a4a2a, accent: 0xd9c26a },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.54, 0.22, 0.50, C.main, 0.42, 0.02));
        g.add(M.pl(0.56, 0.08, 0.52, C.trim, 0.32, 0.02));
        g.add(M.pl(0.48, 0.34, 0.12, C.main, 0.18, -0.22));
        g.add(M.pl(0.10, 0.32, 0.42, C.main, 0.20, 0, 0.25));
        g.add(M.pl(0.10, 0.32, 0.42, C.main, 0.20, 0, -0.25));
        g.add(M.pl(0.44, 0.08, 0.12, C.trim, 0.38, 0.24));
        g.add(M.pl(0.38, 0.04, 0.04, C.leaf, 0.36, 0.25));
        g.add(M.pl(0.08, 0.08, 0.06, C.accent, 0.38, 0.26));
        for (const s of [1, -1]) {
          g.add(M.pl(0.04, 0.14, 0.10, C.leaf, 0.42, 0, 0.27 * s));
          g.add(M.pl(0.04, 0.10, 0.14, C.leaf, 0.48, 0, 0.25 * s));
        }
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.56, 0.34, 0.36, C.main, 0.50));
        g.add(M.pl(0.58, 0.08, 0.38, C.trim, 0.66));
        g.add(M.pl(0.54, 0.20, 0.34, C.trim, 0.26));
        g.add(M.pl(0.04, 0.24, 0.03, C.leaf, 0.50, 0.195, 0.08));
        g.add(M.pl(0.04, 0.24, 0.03, C.leaf, 0.50, 0.195, -0.08));
        g.add(M.pl(0.10, 0.04, 0.03, C.leaf, 0.42, 0.195, 0.04));
        g.add(M.pl(0.10, 0.04, 0.03, C.leaf, 0.42, 0.195, -0.04));
        g.add(M.pl(0.06, 0.06, 0.04, C.accent, 0.56, 0.195));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.50, 0.10, 0.32, C.trim, 0.14));
        waist.add(M.pl(0.10, 0.10, 0.05, C.accent, 0.14, 0.17));
        waist.add(M.pl(0.18, 0.18, 0.04, C.leaf, 0.05, 0.17));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.23, 0.30, 0.23, C.main, -0.15));
          g.add(M.pl(0.04, 0.20, 0.07, C.leaf, -0.15, 0, 0.125 * s));
          g.add(M.pl(0.235, 0.03, 0.235, C.wood, -0.20));
          g.add(M.pl(0.08, 0.08, 0.04, C.leaf, -0.30, 0.125));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.26, 0.12, 0.26, C.main, -0.02));
        g.add(M.pl(0.28, 0.04, 0.28, C.leaf, 0.05));
        g.add(M.pl(0.08, 0.08, 0.04, C.accent, 0.08, 0, 0));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.23, 0.26, 0.23, C.main, -0.16));
        g.add(M.pl(0.25, 0.06, 0.25, C.trim, -0.02));
        g.add(M.pl(0.24, 0.12, 0.30, C.wood, -0.32, 0.03));
        g.add(M.pl(0.20, 0.06, 0.10, C.leaf, -0.34, 0.16));
        g.add(M.pl(0.22, 0.04, 0.28, C.trim, -0.38, 0.03));
        return g;
      }
    },

    /* 3. STEAMPUNK ENGINEER (Tier Copper, Lv 7) */
    {
      id: 'copper',
      name: 'Steampunk Engineer',
      tier: 'copper',
      colors: { main: 0x8a6a3a, trim: 0x5a4426, brass: 0xc89a4a, copper: 0xb06a3a, accent: 0x4a6a8a },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.52, 0.20, 0.48, C.main, 0.42, 0.02));
        g.add(M.pl(0.54, 0.08, 0.50, C.trim, 0.32, 0.02));
        g.add(M.pl(0.48, 0.24, 0.10, C.trim, 0.24, -0.20));
        g.add(M.pl(0.08, 0.24, 0.36, C.main, 0.22, 0, 0.24));
        g.add(M.pl(0.08, 0.24, 0.36, C.main, 0.22, 0, -0.24));
        g.add(M.pl(0.44, 0.10, 0.08, C.trim, 0.32, 0.24));
        for (const x of [0.11, -0.11]) {
          g.add(M.pl(0.13, 0.13, 0.05, C.brass, 0.36, 0.27, x));
          g.add(M.pl(0.09, 0.09, 0.04, 0x3a5a6a, 0.36, 0.28, x));
        }
        g.add(M.pl(0.05, 0.05, 0.08, C.brass, 0.36, 0.25));
        g.add(M.pl(0.08, 0.08, 0.04, C.brass, 0.42, 0, 0.25));
        g.add(M.pl(0.08, 0.08, 0.04, C.brass, 0.42, 0, -0.25));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.56, 0.34, 0.36, C.main, 0.50));
        g.add(M.pl(0.58, 0.07, 0.38, C.brass, 0.68));
        g.add(M.pl(0.54, 0.20, 0.34, C.trim, 0.26));
        g.add(M.pl(0.22, 0.22, 0.04, C.brass, 0.52, 0.19));
        g.add(M.pl(0.10, 0.10, 0.03, C.copper, 0.52, 0.21));
        g.add(M.pl(0.05, 0.05, 0.04, C.trim, 0.52, 0.23));
        for (const a of [0, 1, 2, 3, 4, 5]) g.add(M.pl(0.035, 0.035, 0.03, C.trim, 0.52 + Math.sin(a) * 0.09, 0.225, Math.cos(a) * 0.09));
        g.add(M.pl(0.05, 0.05, 0.18, C.copper, 0.62, -0.08, 0.22));
        g.add(M.pl(0.05, 0.05, 0.18, C.copper, 0.62, -0.08, -0.22));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.10, 0.34, C.trim, 0.14));
        waist.add(M.pl(0.14, 0.12, 0.04, C.brass, 0.14, 0.18));
        waist.add(M.pl(0.08, 0.12, 0.10, C.main, 0.09, 0, 0.25));
        waist.add(M.pl(0.06, 0.08, 0.08, C.copper, 0.09, 0, -0.25));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.23, 0.30, 0.23, C.main, -0.15));
          g.add(M.pl(0.04, 0.10, 0.10, C.brass, -0.14, 0, 0.125 * s));
          g.add(M.pl(0.235, 0.035, 0.235, C.trim, -0.10));
          g.add(M.pl(0.235, 0.035, 0.235, C.trim, -0.22));
          g.add(M.pl(0.10, 0.10, 0.05, C.copper, -0.30, 0.125));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.28, 0.12, 0.28, C.brass, -0.02));
        g.add(M.pl(0.30, 0.04, 0.30, C.copper, 0.05));
        g.add(M.pl(0.06, 0.06, 0.06, C.trim, 0.08, 0, 0));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.24, 0.26, 0.24, C.main, -0.16));
        g.add(M.pl(0.26, 0.06, 0.26, C.brass, -0.02));
        g.add(M.pl(0.25, 0.12, 0.32, C.trim, -0.32, 0.03));
        g.add(M.pl(0.22, 0.08, 0.12, C.brass, -0.34, 0.18));
        g.add(M.pl(0.04, 0.10, 0.10, C.copper, -0.20, 0, 0.13));
        g.add(M.pl(0.23, 0.05, 0.30, C.trim, -0.38, 0.03));
        return g;
      }
    },

    /* 4. IRON KNIGHT (Tier Iron, Lv 12) */
    {
      id: 'iron',
      name: 'Iron Knight',
      tier: 'iron',
      colors: { main: 0x9aa2ac, trim: 0x6d747d, metal: 0xd2d9e2, dark: 0x3a3f45 },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.56, 0.24, 0.54, C.main, 0.46));
        g.add(M.pl(0.58, 0.08, 0.56, C.trim, 0.33));
        g.add(M.pl(0.08, 0.12, 0.56, C.metal, 0.60));
        g.add(M.pl(0.48, 0.36, 0.10, C.main, 0.18, 0.24));
        g.add(M.pl(0.44, 0.16, 0.08, C.trim, 0.06, 0.26));
        g.add(M.pl(0.38, 0.035, 0.04, C.dark, 0.24, 0.275));
        g.add(M.pl(0.05, 0.12, 0.04, C.dark, 0.17, 0.275));
        g.add(M.pl(0.40, 0.02, 0.03, C.metal, 0.265, 0.28));
        for (const x of [-0.12, -0.06, 0.06, 0.12]) {
          g.add(M.pl(0.025, 0.04, 0.03, C.dark, 0.10, 0.285, x));
          g.add(M.pl(0.025, 0.03, 0.03, C.dark, 0.04, 0.285, x * 0.7));
        }
        for (const s of [1, -1]) {
          g.add(M.pl(0.04, 0.18, 0.18, C.metal, 0.48, -0.05, 0.30 * s));
          g.add(M.pl(0.04, 0.14, 0.14, C.trim, 0.58, -0.14, 0.32 * s));
          g.add(M.pl(0.03, 0.08, 0.10, C.metal, 0.66, -0.22, 0.34 * s));
        }
        g.add(M.pl(0.10, 0.28, 0.42, C.trim, 0.24, 0, 0.26));
        g.add(M.pl(0.10, 0.28, 0.42, C.trim, 0.24, 0, -0.26));
        g.add(M.pl(0.46, 0.22, 0.10, C.trim, 0.18, -0.24));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.58, 0.36, 0.36, C.main, 0.50));
        g.add(M.pl(0.60, 0.08, 0.38, C.metal, 0.70));
        g.add(M.pl(0.56, 0.20, 0.34, C.trim, 0.26));
        g.add(M.pl(0.12, 0.28, 0.04, C.metal, 0.52, 0.19));
        g.add(M.pl(0.18, 0.18, 0.04, C.metal, 0.55, 0.19, 0.13));
        g.add(M.pl(0.18, 0.18, 0.04, C.metal, 0.55, 0.19, -0.13));
        for (const x of [-0.20, -0.10, 0, 0.10, 0.20]) g.add(M.pl(0.035, 0.035, 0.03, C.metal, 0.66, 0.195, x));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.10, 0.34, C.trim, 0.14));
        waist.add(M.pl(0.14, 0.12, 0.05, C.metal, 0.14, 0.18));
        waist.add(M.pl(0.48, 0.14, 0.32, C.main, 0.06));
        waist.add(M.pl(0.06, 0.16, 0.18, C.metal, 0.04, 0, 0.25));
        waist.add(M.pl(0.06, 0.16, 0.18, C.metal, 0.04, 0, -0.25));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.24, 0.30, 0.24, C.main, -0.15));
          g.add(M.pl(0.08, 0.26, 0.04, C.metal, -0.15, 0.125));
          g.add(M.pl(0.245, 0.04, 0.03, C.dark, -0.20, -0.125));
          g.add(M.pl(0.11, 0.11, 0.06, C.metal, -0.30, 0.13));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.30, 0.14, 0.30, C.main, -0.02));
        g.add(M.pl(0.32, 0.05, 0.32, C.metal, 0.07));
        g.add(M.pl(0.26, 0.06, 0.26, C.trim, -0.12));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.25, 0.26, 0.25, C.main, -0.16));
        g.add(M.pl(0.27, 0.07, 0.27, C.metal, -0.02));
        g.add(M.pl(0.26, 0.13, 0.32, C.trim, -0.32, 0.04));
        g.add(M.pl(0.22, 0.08, 0.12, C.metal, -0.34, 0.17));
        g.add(M.pl(0.24, 0.05, 0.30, C.dark, -0.38, 0.04));
        return g;
      }
    },

    /* 5. GOLD PALADIN (Tier Gold, Lv 22) */
    {
      id: 'gold',
      name: 'Gold Paladin',
      tier: 'gold',
      colors: { main: 0xd9b23a, trim: 0x9c7c1e, metal: 0xffe07a, accent: 0xfff6c4, glow: 0xffd24d },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.56, 0.24, 0.54, C.main, 0.46));
        g.add(M.pl(0.58, 0.08, 0.56, C.metal, 0.33));
        g.add(M.pl(0.48, 0.36, 0.10, C.main, 0.18, 0.24));
        g.add(M.pl(0.44, 0.16, 0.08, C.trim, 0.06, 0.26));
        g.add(M.pl(0.08, 0.32, 0.08, C.metal, 0.18, 0.26));
        for (const s of [1, -1]) {
          g.add(M.pl(0.12, 0.035, 0.04, C.glow, 0.24, 0.27, 0.10 * s, 0, 0xffe07a));
          g.add(M.pl(0.14, 0.02, 0.05, C.metal, 0.27, 0.27, 0.10 * s));
        }
        g.add(M.pl(0.04, 0.14, 0.03, C.trim, 0.10, 0.275));
        g.add(M.pl(0.14, 0.04, 0.03, C.trim, 0.12, 0.275));
        g.add(M.pl(0.04, 0.04, 0.04, C.accent, 0.12, 0.285));
        for (const s of [1, -1]) {
          g.add(M.pl(0.05, 0.26, 0.22, C.metal, 0.50, -0.05, 0.30 * s));
          g.add(M.pl(0.05, 0.18, 0.28, C.accent, 0.58, -0.16, 0.33 * s));
          g.add(M.pl(0.04, 0.12, 0.20, C.metal, 0.68, -0.28, 0.36 * s));
          g.add(M.pl(0.04, 0.08, 0.12, C.accent, 0.76, -0.38, 0.38 * s));
        }
        g.add(M.pl(0.06, 0.14, 0.46, C.accent, 0.62, -0.05, 0, 0, C.glow));
        g.add(M.pl(0.12, 0.28, 0.42, C.main, 0.24, 0, 0.26));
        g.add(M.pl(0.12, 0.28, 0.42, C.main, 0.24, 0, -0.26));
        g.add(M.pl(0.46, 0.22, 0.10, C.trim, 0.18, -0.24));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.58, 0.36, 0.36, C.main, 0.50));
        g.add(M.pl(0.60, 0.08, 0.38, C.metal, 0.70));
        g.add(M.pl(0.56, 0.20, 0.34, C.trim, 0.26));
        g.add(M.pl(0.06, 0.26, 0.04, C.accent, 0.52, 0.19));
        g.add(M.pl(0.20, 0.06, 0.04, C.accent, 0.56, 0.19));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.10, 0.34, C.main, 0.14));
        waist.add(M.pl(0.14, 0.14, 0.05, C.metal, 0.14, 0.18));
        waist.add(M.pl(0.18, 0.20, 0.04, C.accent, 0.04, 0.18));
        waist.add(M.pl(0.48, 0.12, 0.32, C.trim, 0.07));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.24, 0.30, 0.24, C.main, -0.15));
          g.add(M.pl(0.05, 0.22, 0.12, C.metal, -0.15, 0, 0.125 * s));
          g.add(M.pl(0.11, 0.11, 0.06, C.metal, -0.30, 0.13));
          g.add(M.pl(0.05, 0.05, 0.04, C.accent, -0.30, 0.155, 0, 0, C.glow));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.28, 0.14, 0.28, C.main, -0.02));
        g.add(M.pl(0.30, 0.05, 0.30, C.metal, 0.06));
        g.add(M.pl(0.05, 0.10, 0.05, C.accent, 0.10, 0, 0));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.25, 0.26, 0.25, C.main, -0.16));
        g.add(M.pl(0.27, 0.07, 0.27, C.metal, -0.02));
        g.add(M.pl(0.26, 0.13, 0.32, C.trim, -0.32, 0.04));
        g.add(M.pl(0.22, 0.08, 0.12, C.accent, -0.34, 0.17));
        g.add(M.pl(0.24, 0.05, 0.30, C.trim, -0.38, 0.04));
        return g;
      }
    },

    /* 6. SHADOW ASSASSIN (Tier Tungsten, Lv 26) */
    {
      id: 'shadow',
      name: 'Shadow Assassin',
      tier: 'tungsten',
      colors: { main: 0x2e333a, trim: 0x1c1f24, metal: 0x5a606c, accent: 0xb52233, glow: 0xe02a40 },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.52, 0.22, 0.50, C.main, 0.44));
        g.add(M.pl(0.54, 0.08, 0.52, C.trim, 0.33));
        g.add(M.pl(0.48, 0.32, 0.12, C.main, 0.16, -0.21));
        g.add(M.pl(0.12, 0.36, 0.42, C.main, 0.20, 0, 0.24));
        g.add(M.pl(0.12, 0.36, 0.42, C.main, 0.20, 0, -0.24));
        g.add(M.pl(0.38, 0.32, 0.08, C.trim, 0.16, 0.21));
        g.add(M.pl(0.34, 0.14, 0.07, C.metal, 0.07, 0.23));
        g.add(M.pl(0.24, 0.04, 0.04, C.accent, 0.22, 0.245, 0, 0, C.accent));
        g.add(M.pl(0.08, 0.025, 0.04, C.glow, 0.22, 0.25, 0, 0, C.glow));
        g.add(M.pl(0.08, 0.12, 0.44, C.trim, 0.54, 0, 0));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.56, 0.34, 0.36, C.main, 0.50));
        g.add(M.pl(0.58, 0.08, 0.38, C.trim, 0.68));
        g.add(M.pl(0.54, 0.20, 0.34, C.trim, 0.26));
        g.add(M.pl(0.09, 0.24, 0.03, C.accent, 0.52, 0.195));
        for (const x of [-0.15, -0.05, 0.05, 0.15]) g.add(M.pl(0.035, 0.11, 0.03, C.metal, 0.40, 0.205, x));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.50, 0.08, 0.32, C.trim, 0.14));
        waist.add(M.pl(0.08, 0.08, 0.04, C.accent, 0.14, 0.17));
        waist.add(M.pl(0.12, 0.10, 0.04, C.metal, 0.08, 0.17, 0.12));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.23, 0.30, 0.23, C.main, -0.15));
          g.add(M.pl(0.04, 0.18, 0.07, C.metal, -0.15, 0, 0.125 * s));
          g.add(M.pl(0.02, 0.14, 0.02, C.accent, -0.15, 0, 0.135 * s));
          g.add(M.pl(0.235, 0.035, 0.235, C.trim, -0.20));
          g.add(M.pl(0.08, 0.09, 0.05, C.accent, -0.30, 0.125));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.26, 0.10, 0.26, C.main, -0.03));
        g.add(M.pl(0.28, 0.04, 0.28, C.trim, 0.03));
        g.add(M.pl(0.03, 0.08, 0.03, C.metal, -0.14, 0, 0.08));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.22, 0.26, 0.22, C.main, -0.16));
        g.add(M.pl(0.24, 0.05, 0.24, C.trim, -0.02));
        g.add(M.pl(0.23, 0.10, 0.28, C.trim, -0.32, 0.03));
        g.add(M.pl(0.19, 0.05, 0.10, C.metal, -0.34, 0.15));
        g.add(M.pl(0.21, 0.04, 0.26, C.trim, -0.38, 0.03));
        return g;
      }
    },

    /* 7. TUNGSTEN JUGGERNAUT (Tier Tungsten, Lv 26) */
    {
      id: 'tungsten',
      name: 'Tungsten Juggernaut',
      tier: 'tungsten',
      colors: { main: 0x4a4f52, trim: 0x32363a, metal: 0x6a7076, accent: 0x8b9a7e, dark: 0x1e2124 },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.60, 0.26, 0.58, C.main, 0.48));
        g.add(M.pl(0.62, 0.10, 0.60, C.trim, 0.34));
        g.add(M.pl(0.18, 0.08, 0.52, C.metal, 0.63));
        g.add(M.pl(0.48, 0.06, 0.16, C.metal, 0.62, 0.10));
        g.add(M.pl(0.52, 0.38, 0.14, C.main, 0.18, 0.26));
        g.add(M.pl(0.48, 0.16, 0.12, C.metal, 0.34, 0.27));
        for (const s of [1, -1]) {
          g.add(M.pl(0.14, 0.035, 0.05, 0x111612, 0.24, 0.32, 0.11 * s));
          g.add(M.pl(0.10, 0.02, 0.06, 0x98e874, 0.24, 0.325, 0.11 * s, 0, 0x98e874));
          g.add(M.pl(0.16, 0.04, 0.06, C.metal, 0.27, 0.32, 0.11 * s));
        }
        g.add(M.pl(0.36, 0.18, 0.12, C.dark, 0.07, 0.30));
        g.add(M.pl(0.32, 0.05, 0.04, C.metal, 0.13, 0.36));
        g.add(M.pl(0.28, 0.04, 0.04, C.metal, 0.06, 0.36));
        g.add(M.pl(0.24, 0.04, 0.04, C.metal, -0.01, 0.36));
        for (const x of [-0.18, 0.18]) {
          g.add(M.pl(0.04, 0.04, 0.04, C.metal, 0.08, 0.34, x));
          g.add(M.pl(0.04, 0.04, 0.04, C.metal, 0.15, 0.34, x));
        }
        g.add(M.pl(0.14, 0.34, 0.46, C.trim, 0.24, 0, 0.29));
        g.add(M.pl(0.14, 0.34, 0.46, C.trim, 0.24, 0, -0.29));
        g.add(M.pl(0.08, 0.18, 0.22, C.metal, 0.22, 0.02, 0.34));
        g.add(M.pl(0.08, 0.18, 0.22, C.metal, 0.22, 0.02, -0.34));
        g.add(M.pl(0.48, 0.22, 0.12, C.trim, 0.18, -0.26));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.60, 0.38, 0.40, C.main, 0.50));
        g.add(M.pl(0.62, 0.09, 0.42, C.metal, 0.70));
        g.add(M.pl(0.58, 0.22, 0.38, C.trim, 0.24));
        g.add(M.pl(0.18, 0.30, 0.05, C.metal, 0.52, 0.21));
        for (const x of [-0.20, -0.10, 0, 0.10, 0.20]) g.add(M.pl(0.045, 0.045, 0.04, C.metal, 0.64, 0.215, x));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.54, 0.12, 0.36, C.main, 0.14));
        waist.add(M.pl(0.22, 0.16, 0.07, C.metal, 0.06, 0.19));
        waist.add(M.pl(0.08, 0.20, 0.22, C.metal, 0.05, 0, 0.26));
        waist.add(M.pl(0.08, 0.20, 0.22, C.metal, 0.05, 0, -0.26));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.25, 0.30, 0.25, C.main, -0.15));
          g.add(M.pl(0.09, 0.26, 0.05, C.metal, -0.15, 0.135));
          g.add(M.pl(0.05, 0.20, 0.14, C.trim, -0.15, 0, 0.135 * s));
          g.add(M.pl(0.13, 0.13, 0.07, C.metal, -0.30, 0.14));
          g.add(M.pl(0.04, 0.04, 0.04, C.dark, -0.30, 0.18));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.32, 0.16, 0.32, C.main, -0.03));
        g.add(M.pl(0.34, 0.06, 0.34, C.metal, 0.07));
        g.add(M.pl(0.28, 0.06, 0.28, C.trim, -0.13));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.28, 0.28, 0.28, C.main, -0.17));
        g.add(M.pl(0.30, 0.08, 0.30, C.metal, -0.02));
        g.add(M.pl(0.28, 0.14, 0.36, C.trim, -0.33, 0.04));
        g.add(M.pl(0.24, 0.09, 0.13, C.metal, -0.35, 0.19));
        g.add(M.pl(0.27, 0.06, 0.34, C.dark, -0.39, 0.04));
        return g;
      }
    },

    /* 8. CRYSTAL MAGE (Tier Crystal, Lv 32) */
    {
      id: 'crystal',
      name: 'Crystal Mage',
      tier: 'crystal',
      colors: { main: 0x7fd8ff, trim: 0x3f8fbf, metal: 0xd6f4ff, glow: 0x9fe8ff, deep: 0x2a5a80 },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.52, 0.20, 0.48, C.main, 0.44, 0.01));
        g.add(M.pl(0.54, 0.08, 0.50, C.metal, 0.34, 0.01));
        g.add(M.pl(0.34, 0.22, 0.32, C.main, 0.58));
        g.add(M.pl(0.22, 0.18, 0.22, C.trim, 0.72));
        g.add(M.pl(0.12, 0.14, 0.12, C.metal, 0.84, 0, 0, 0, C.glow));
        g.add(M.pl(0.08, 0.24, 0.40, C.main, 0.22, 0, 0.24));
        g.add(M.pl(0.08, 0.24, 0.40, C.main, 0.22, 0, -0.24));
        g.add(M.pl(0.07, 0.11, 0.05, C.glow, 0.36, 0.25, 0, 0, C.glow));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.56, 0.34, 0.36, C.main, 0.50));
        g.add(M.pl(0.58, 0.06, 0.38, C.metal, 0.70));
        g.add(M.pl(0.54, 0.20, 0.34, C.trim, 0.26));
        g.add(M.pl(0.07, 0.11, 0.04, C.glow, 0.54, 0.195, 0, 0, C.glow));
        g.add(M.pl(0.045, 0.045, 0.04, C.glow, 0.50, 0.195, 0.12, 0, C.glow));
        g.add(M.pl(0.045, 0.045, 0.04, C.glow, 0.50, 0.195, -0.12, 0, C.glow));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.50, 0.09, 0.32, C.trim, 0.14));
        waist.add(M.pl(0.10, 0.10, 0.05, C.glow, 0.14, 0.17, 0, 0, C.glow));
        waist.add(M.pl(0.24, 0.20, 0.04, C.main, 0.05, 0.17));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.23, 0.30, 0.23, C.main, -0.15));
          g.add(M.pl(0.04, 0.07, 0.05, C.glow, -0.11, 0, 0.125 * s, 0, C.glow));
          g.add(M.pl(0.04, 0.07, 0.05, C.glow, -0.20, 0, 0.125 * s, 0, C.glow));
          g.add(M.pl(0.09, 0.11, 0.06, C.metal, -0.30, 0.13, 0, 0, C.glow));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.26, 0.11, 0.26, C.main, -0.03));
        g.add(M.pl(0.28, 0.04, 0.28, C.metal, 0.04));
        g.add(M.pl(0.05, 0.10, 0.05, C.glow, 0.08, 0, 0, 0, C.glow));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.22, 0.26, 0.22, C.main, -0.16));
        g.add(M.pl(0.24, 0.05, 0.24, C.metal, -0.02));
        g.add(M.pl(0.23, 0.11, 0.30, C.trim, -0.32, 0.03));
        g.add(M.pl(0.20, 0.06, 0.10, C.glow, -0.34, 0.15));
        g.add(M.pl(0.22, 0.04, 0.28, C.deep, -0.38, 0.03));
        return g;
      }
    },

    /* 9. REAPER CULT (Tier Crystal / Soul, Lv 32) */
    {
      id: 'reaper',
      name: 'Reaper Cult',
      tier: 'crystal',
      colors: { main: 0x241634, trim: 0x160c22, bone: 0xe2dac8, boneDark: 0xb5aa96, glow: 0xb060ff, glowCore: 0xe0a0ff, eyeHole: 0x0a0510 },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.38, 0.09, 0.10, C.bone, 0.30, 0.22));
        g.add(M.pl(0.36, 0.04, 0.05, C.boneDark, 0.255, 0.245));
        g.add(M.pl(0.10, 0.09, 0.05, C.eyeHole, 0.21, 0.23, 0.095));
        g.add(M.pl(0.10, 0.09, 0.05, C.eyeHole, 0.21, 0.23, -0.095));
        g.add(M.pl(0.045, 0.045, 0.03, C.glow, 0.21, 0.24, 0.095, 0, C.glowCore));
        g.add(M.pl(0.045, 0.045, 0.03, C.glow, 0.21, 0.24, -0.095, 0, C.glowCore));
        g.add(M.pl(0.09, 0.08, 0.08, C.bone, 0.16, 0.23, 0.15));
        g.add(M.pl(0.09, 0.08, 0.08, C.bone, 0.16, 0.23, -0.15));
        g.add(M.pl(0.04, 0.06, 0.05, C.boneDark, 0.18, 0.235));
        g.add(M.pl(0.05, 0.07, 0.04, C.eyeHole, 0.14, 0.235));
        g.add(M.pl(0.28, 0.08, 0.08, C.bone, 0.08, 0.24));
        for (const x of [-0.09, -0.03, 0.03, 0.09]) g.add(M.pl(0.03, 0.045, 0.03, C.bone, 0.06, 0.255, x));
        g.add(M.pl(0.26, 0.07, 0.08, C.boneDark, 0.01, 0.235));
        for (const x of [-0.06, 0, 0.06]) g.add(M.pl(0.03, 0.04, 0.03, C.bone, 0.035, 0.245, x));
        g.add(M.pl(0.14, 0.06, 0.07, C.bone, -0.03, 0.23));
        g.add(M.pl(0.03, 0.04, 0.22, C.trim, 0.22, 0.08, 0.205));
        g.add(M.pl(0.03, 0.04, 0.22, C.trim, 0.22, 0.08, -0.205));
        g.add(M.pl(0.40, 0.04, 0.03, C.trim, 0.22, -0.19, 0));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.56, 0.38, 0.36, C.main, 0.48));
        g.add(M.pl(0.58, 0.08, 0.38, C.trim, 0.68));
        g.add(M.pl(0.54, 0.22, 0.34, C.main, 0.24));
        for (const x of [-0.14, -0.07, 0.07, 0.14]) g.add(M.pl(0.035, 0.15, 0.03, C.bone, 0.52, 0.195, x));
        g.add(M.pl(0.07, 0.09, 0.04, C.glow, 0.56, 0.205, 0, 0, C.glowCore));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.10, 0.34, C.trim, 0.14));
        waist.add(M.pl(0.09, 0.09, 0.05, C.glow, 0.14, 0.18, 0, 0, C.glowCore));
        waist.add(M.pl(0.22, 0.22, 0.04, C.main, 0.04, 0.18));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.23, 0.30, 0.23, C.main, -0.15));
          g.add(M.pl(0.04, 0.20, 0.09, C.bone, -0.15, 0, 0.125 * s));
          g.add(M.pl(0.09, 0.09, 0.06, C.bone, -0.30, 0.13));
          g.add(M.pl(0.025, 0.025, 0.025, C.glow, -0.29, 0.16, 0.03, 0, C.glowCore));
          g.add(M.pl(0.025, 0.025, 0.025, C.glow, -0.29, 0.16, -0.03, 0, C.glowCore));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.28, 0.12, 0.28, C.main, -0.03));
        g.add(M.pl(0.14, 0.12, 0.12, C.bone, 0.02, 0.08));
        g.add(M.pl(0.035, 0.04, 0.03, C.trim, 0.05, 0.14, 0.03));
        g.add(M.pl(0.035, 0.04, 0.03, C.trim, 0.05, 0.14, -0.03));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.22, 0.26, 0.22, C.main, -0.16));
        g.add(M.pl(0.24, 0.05, 0.24, C.trim, -0.02));
        g.add(M.pl(0.23, 0.11, 0.30, C.main, -0.32, 0.03));
        g.add(M.pl(0.20, 0.06, 0.10, C.bone, -0.34, 0.15));
        g.add(M.pl(0.22, 0.04, 0.28, C.trim, -0.38, 0.03));
        return g;
      }
    },

    /* 10. FROST YETI (Tier Crystal, Lv 32) */
    {
      id: 'yeti',
      name: 'Frost Yeti',
      tier: 'crystal',
      colors: { main: 0xd8e8f0, trim: 0xa8c0d0, ice: 0x9fd8f0, fur: 0xf0f4f8, accent: 0x5ab0e0, glow: 0x8fdcff },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.54, 0.22, 0.50, C.fur, 0.44, 0.01));
        g.add(M.pl(0.56, 0.09, 0.52, C.trim, 0.34, 0.01));
        for (const s of [1, -1]) {
          g.add(M.pl(0.07, 0.07, 0.16, C.ice, 0.46, 0, 0.32 * s, 0, C.glow));
          g.add(M.pl(0.06, 0.06, 0.14, C.ice, 0.52, 0, 0.36 * s));
        }
        g.add(M.pl(0.46, 0.10, 0.07, C.fur, 0.34, 0.23));
        g.add(M.pl(0.09, 0.22, 0.40, C.fur, 0.22, 0, 0.25));
        g.add(M.pl(0.09, 0.22, 0.40, C.fur, 0.22, 0, -0.25));
        g.add(M.pl(0.07, 0.09, 0.05, C.accent, 0.38, 0.25));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.58, 0.36, 0.38, C.fur, 0.50));
        g.add(M.pl(0.60, 0.09, 0.40, C.trim, 0.68));
        g.add(M.pl(0.56, 0.20, 0.36, C.main, 0.24));
        g.add(M.pl(0.18, 0.22, 0.04, C.ice, 0.52, 0.20));
        g.add(M.pl(0.10, 0.10, 0.03, C.accent, 0.52, 0.22));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.16, 0.34, C.fur, 0.09));
        waist.add(M.pl(0.50, 0.08, 0.34, C.trim, 0.14));
        waist.add(M.pl(0.20, 0.14, 0.05, C.ice, 0.06, 0.18, 0, 0, C.glow));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.24, 0.30, 0.24, C.fur, -0.15));
          g.add(M.pl(0.04, 0.12, 0.07, C.ice, -0.14, 0, 0.13 * s, 0, C.glow));
          g.add(M.pl(0.08, 0.09, 0.09, C.ice, -0.30, 0.15, 0, 0, C.glow));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.30, 0.14, 0.30, C.fur, -0.03));
        g.add(M.pl(0.28, 0.05, 0.28, C.ice, 0.05));
        g.add(M.pl(0.05, 0.10, 0.05, C.ice, 0.10, 0, 0.07));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.25, 0.24, 0.25, C.fur, -0.14));
        g.add(M.pl(0.24, 0.18, 0.24, C.main, -0.24));
        g.add(M.pl(0.25, 0.12, 0.30, C.trim, -0.32, 0.03));
        g.add(M.pl(0.21, 0.08, 0.12, C.ice, -0.34, 0.17));
        g.add(M.pl(0.23, 0.05, 0.29, C.trim, -0.38, 0.03));
        return g;
      }
    },

    /* 11. SAMURAI (Tier Tungstensteel, Lv 38) */
    {
      id: 'samurai',
      name: 'Samurai',
      tier: 'tungstensteel',
      colors: { main: 0x3d4855, trim: 0x1c222b, lac: 0x8a1a1a, metal: 0xd9b23a, accent: 0xffe07a },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.54, 0.20, 0.52, C.main, 0.44));
        g.add(M.pl(0.58, 0.07, 0.56, C.trim, 0.33));
        g.add(M.pl(0.10, 0.18, 0.36, C.trim, 0.26, 0, 0.28));
        g.add(M.pl(0.10, 0.18, 0.36, C.trim, 0.26, 0, -0.28));
        g.add(M.pl(0.04, 0.22, 0.06, C.metal, 0.54, 0.14));
        g.add(M.pl(0.24, 0.05, 0.06, C.metal, 0.62, 0.14));
        g.add(M.pl(0.05, 0.08, 0.04, C.accent, 0.44, 0.26));
        g.add(M.pl(0.40, 0.32, 0.09, C.lac, 0.16, 0.21));
        g.add(M.pl(0.36, 0.15, 0.08, C.trim, 0.07, 0.23));
        g.add(M.pl(0.28, 0.035, 0.04, C.accent, 0.22, 0.24));
        g.add(M.pl(0.20, 0.02, 0.03, 0x111115, 0.22, 0.245));
        g.add(M.pl(0.48, 0.06, 0.44, C.main, 0.20, -0.12));
        g.add(M.pl(0.46, 0.06, 0.42, C.trim, 0.14, -0.12));
        g.add(M.pl(0.44, 0.06, 0.40, C.main, 0.08, -0.12));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.58, 0.32, 0.36, C.main, 0.54));
        for (let i = 0; i < 3; i++) g.add(M.pl(0.56 - i * 0.02, 0.05, 0.38 - i * 0.02, i % 2 ? C.trim : C.lac, 0.42 - i * 0.06, 0.0));
        g.add(M.pl(0.54, 0.18, 0.34, C.trim, 0.26));
        g.add(M.pl(0.09, 0.18, 0.04, C.accent, 0.56, 0.19));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.10, 0.34, C.trim, 0.14));
        waist.add(M.pl(0.12, 0.12, 0.05, C.metal, 0.14, 0.18));
        waist.add(M.pl(0.24, 0.18, 0.05, C.lac, 0.05, 0.18));
        waist.add(M.pl(0.34, 0.16, 0.05, C.trim, 0.05, -0.18));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.24, 0.30, 0.24, C.main, -0.15));
          g.add(M.pl(0.18, 0.05, 0.04, C.lac, -0.09, 0.13));
          g.add(M.pl(0.18, 0.05, 0.04, C.trim, -0.16, 0.13));
          g.add(M.pl(0.18, 0.05, 0.04, C.lac, -0.23, 0.13));
          g.add(M.pl(0.10, 0.10, 0.05, C.metal, -0.30, 0.13));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.32, 0.05, 0.32, C.main, 0.04));
        g.add(M.pl(0.30, 0.05, 0.30, C.lac, -0.03));
        g.add(M.pl(0.28, 0.05, 0.28, C.trim, -0.10));
        g.add(M.pl(0.30, 0.03, 0.04, C.accent, 0.0, 0.14));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.22, 0.24, 0.22, C.trim, -0.16));
        g.add(M.pl(0.24, 0.05, 0.24, C.main, -0.03));
        g.add(M.pl(0.06, 0.20, 0.20, C.lac, -0.16, 0.10));
        g.add(M.pl(0.23, 0.10, 0.28, C.main, -0.32, 0.03));
        g.add(M.pl(0.20, 0.05, 0.28, C.trim, -0.38, 0.03));
        return g;
      }
    },

    /* 12. DRAGONSCALE (Tier Tungstensteel, Lv 38) */
    {
      id: 'dragon',
      name: 'Dragonscale',
      tier: 'tungstensteel',
      colors: { main: 0xC8352A, dark: 0x99251C, belly: 0xE8B274, belly2: 0xD99C5C, bone: 0xEDE0C2, membrane: 0x8F1B12, eye: 0xFFCC33, pupil: 0x141414 },
      buildHelmet() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.54, 0.24, 0.52, C.main, 0.44));
        g.add(M.pl(0.56, 0.08, 0.54, C.dark, 0.33));
        for (let i = 0; i < 4; i++) g.add(M.pl(0.08, 0.12, 0.14, C.dark, 0.56 + i * 0.02, -0.20 + i * 0.09));
        for (const s of [1, -1]) {
          g.add(M.pl(0.10, 0.10, 0.24, C.bone, 0.50, -0.14, 0.24 * s));
          g.add(M.pl(0.08, 0.08, 0.24, C.bone, 0.58, -0.32, 0.28 * s));
          g.add(M.pl(0.06, 0.06, 0.18, C.bone, 0.68, -0.46, 0.32 * s));
          g.add(M.pl(0.06, 0.06, 0.12, C.bone, 0.42, -0.06, 0.30 * s));
        }
        g.add(M.pl(0.46, 0.06, 0.14, C.dark, 0.28, 0.24));
        g.add(M.pl(0.20, 0.06, 0.08, C.bone, 0.30, 0.27, 0.11));
        g.add(M.pl(0.20, 0.06, 0.08, C.bone, 0.30, 0.27, -0.11));
        for (const s of [1, -1]) {
          g.add(M.pl(0.11, 0.045, 0.06, C.eye, 0.23, 0.255, 0.115 * s, 0, 0xFF5500));
          g.add(M.pl(0.035, 0.05, 0.07, 0x1a0505, 0.23, 0.26, 0.115 * s));
        }
        g.add(M.pl(0.34, 0.15, 0.24, C.main, 0.17, 0.28));
        g.add(M.pl(0.28, 0.06, 0.22, C.dark, 0.23, 0.29));
        g.add(M.pl(0.05, 0.03, 0.04, 0x220505, 0.17, 0.39, 0.07));
        g.add(M.pl(0.05, 0.03, 0.04, 0x220505, 0.17, 0.39, -0.07));
        g.add(M.pl(0.32, 0.13, 0.22, C.dark, 0.04, 0.27));
        for (const x of [-0.12, -0.04, 0.04, 0.12]) g.add(M.pl(0.035, 0.08, 0.04, C.bone, 0.11, 0.36, x));
        for (const x of [-0.10, 0.10]) g.add(M.pl(0.04, 0.09, 0.04, C.bone, 0.11, 0.37, x));
        g.add(M.pl(0.03, 0.07, 0.03, C.bone, 0.06, 0.33, 0.15));
        g.add(M.pl(0.03, 0.07, 0.03, C.bone, 0.06, 0.33, -0.15));
        g.add(M.pl(0.12, 0.32, 0.44, C.main, 0.18, 0, 0.24));
        g.add(M.pl(0.12, 0.32, 0.44, C.main, 0.18, 0, -0.24));
        g.add(M.pl(0.48, 0.30, 0.14, C.dark, 0.16, -0.22));
        return g;
      },
      buildChestplate() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.58, 0.38, 0.38, C.main, 0.50));
        g.add(M.pl(0.60, 0.08, 0.40, C.dark, 0.70));
        g.add(M.pl(0.28, 0.10, 0.05, C.belly, 0.62, 0.20));
        g.add(M.pl(0.26, 0.10, 0.05, C.belly2, 0.50, 0.20));
        g.add(M.pl(0.24, 0.10, 0.05, C.belly, 0.38, 0.20));
        g.add(M.pl(0.04, 0.22, 0.12, C.membrane, 0.54, -0.20, 0.16));
        g.add(M.pl(0.04, 0.22, 0.12, C.membrane, 0.54, -0.20, -0.16));
        for (const y of [0.64, 0.50, 0.36, 0.22]) g.add(M.pl(0.05, 0.12, 0.10, C.bone, y, -0.20));
        return g;
      },
      buildPants() {
        const C = this.colors;
        const waist = new THREE.Group();
        waist.add(M.pl(0.52, 0.10, 0.34, C.dark, 0.14));
        waist.add(M.pl(0.16, 0.14, 0.06, C.belly, 0.14, 0.18));
        waist.add(M.pl(0.06, 0.08, 0.05, C.bone, 0.14, 0.20));
        waist.add(M.pl(0.24, 0.20, 0.06, C.belly2, 0.05, 0.18));
        waist.add(M.pl(0.05, 0.09, 0.04, C.bone, -0.05, 0.19));
        waist.add(M.pl(0.44, 0.18, 0.07, C.dark, 0.05, -0.17));
        waist.add(M.pl(0.10, 0.20, 0.15, C.main, -0.02, -0.21));
        waist.add(M.pl(0.06, 0.12, 0.10, C.dark, -0.13, -0.26));
        waist.add(M.pl(0.035, 0.07, 0.05, C.bone, -0.19, -0.30));
        const mkLeg = (s) => {
          const g = new THREE.Group();
          g.add(M.pl(0.24, 0.30, 0.24, C.main, -0.15));
          g.add(M.pl(0.15, 0.20, 0.04, C.dark, -0.14, 0.13));
          g.add(M.pl(0.05, 0.20, 0.16, C.dark, -0.14, 0.01, 0.135 * s));
          g.add(M.pl(0.035, 0.07, 0.05, C.bone, -0.18, 0.01, 0.15 * s));
          g.add(M.pl(0.11, 0.11, 0.06, C.dark, -0.30, 0.13));
          g.add(M.pl(0.04, 0.07, 0.04, C.bone, -0.30, 0.17));
          return g;
        };
        return { waist, legL: mkLeg(1), legR: mkLeg(-1) };
      },
      buildPauldron() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.30, 0.14, 0.30, C.main, -0.02));
        g.add(M.pl(0.32, 0.05, 0.32, C.dark, 0.05));
        g.add(M.pl(0.06, 0.16, 0.06, C.bone, 0.12, 0, 0.04));
        g.add(M.pl(0.04, 0.12, 0.18, C.membrane, 0.05, -0.03, 0.12));
        return g;
      },
      buildBoots() {
        const g = new THREE.Group(); const C = this.colors;
        g.add(M.pl(0.25, 0.26, 0.25, C.main, -0.16));
        g.add(M.pl(0.27, 0.07, 0.27, C.dark, -0.02));
        g.add(M.pl(0.26, 0.12, 0.30, C.dark, -0.32, 0.03));
        for (const x of [-0.07, 0, 0.07]) g.add(M.pl(0.04, 0.05, 0.10, C.bone, -0.36, 0.20, x));
        g.add(M.pl(0.035, 0.05, 0.09, C.bone, -0.34, -0.15));
        return g;
      }
    }
  ];

  // Buat map sets berdasarkan id & alias
  const setsMap = {};
  ARMOR_SETS.forEach(s => {
    setsMap[s.id] = s;
    setsMap[s.name.toLowerCase()] = s;
  });

  return {
    sets: setsMap,
    catalog: ARMOR_SETS,

    getSet(query = 'iron') {
      if (!query) return setsMap.iron;
      if (typeof query === 'object' && query.buildHelmet) return query;
      const q = ('' + query).toLowerCase().trim();
      if (setsMap[q]) return setsMap[q];

      if (q.includes('berserker') || q.includes('fur')) return setsMap.berserker;
      if (q.includes('elven') || q.includes('ranger') || q.includes('wood')) return setsMap.elven;
      if (q.includes('copper') || q.includes('steampunk') || q.includes('pioneer')) return setsMap.copper;
      if (q.includes('iron') || q.includes('knight') || q.includes('guard')) return setsMap.iron;
      if (q.includes('gold') || q.includes('paladin') || q.includes('greed')) return setsMap.gold;
      if (q.includes('shadow') || q.includes('assassin')) return setsMap.shadow;
      if (q.includes('tungsten') || q.includes('juggernaut')) return setsMap.tungsten;
      if (q.includes('crystal') || q.includes('mage') || q.includes('frost_blade') || q.includes('regen')) return setsMap.crystal;
      if (q.includes('reaper') || q.includes('cult') || q.includes('soul')) return setsMap.reaper;
      if (q.includes('yeti') || q.includes('frost')) return setsMap.yeti;
      if (q.includes('samurai')) return setsMap.samurai;
      if (q.includes('dragon') || q.includes('thorns') || q.includes('warlord')) return setsMap.dragon;
      if (q.includes('carapace') || q.includes('bone')) return setsMap.berserker;

      // Tier fallbacks
      if (q === 'leather') return setsMap.elven;
      if (q === 'crystal') return setsMap.crystal;
      if (q === 'tungstensteel') return setsMap.dragon;
      return setsMap.iron;
    },

    buildHelmet(query = 'iron') {
      const s = this.getSet(query);
      return s ? s.buildHelmet() : new THREE.Group();
    },

    buildChestplate(query = 'iron') {
      const s = this.getSet(query);
      return s ? s.buildChestplate() : new THREE.Group();
    },

    buildPants(query = 'iron') {
      const s = this.getSet(query);
      return (s && s.buildPants) ? s.buildPants() : null;
    },

    buildPauldron(query = 'iron') {
      const s = this.getSet(query);
      return s ? s.buildPauldron() : new THREE.Group();
    },

    buildBoots(query = 'iron') {
      const s = this.getSet(query);
      return s ? s.buildBoots() : new THREE.Group();
    },

    attachFullSet(characterParts, query = 'iron') {
      if (!characterParts || !characterParts.armorG) return;
      const s = this.getSet(query);
      if (!s) return;
      const G = characterParts.armorG;

      for (const k in G) {
        if (k === 'shield') continue;
        const g = G[k];
        while (g.children.length) {
          const c = g.children.pop();
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        }
      }

      if (G.helm) G.helm.add(s.buildHelmet());
      if (G.chest) G.chest.add(s.buildChestplate());
      if (G.pauldL) G.pauldL.add(s.buildPauldron());
      if (G.pauldR) G.pauldR.add(s.buildPauldron());
      if (G.bootL) G.bootL.add(s.buildBoots());
      if (G.bootR) G.bootR.add(s.buildBoots());

      if (s.buildPants) {
        const p = s.buildPants();
        if (p.waist && G.pantsWaist) G.pantsWaist.add(p.waist);
        if (p.legL && G.pantsL) G.pantsL.add(p.legL);
        if (p.legR && G.pantsR) G.pantsR.add(p.legR);
      }
    }
  };
})();

window.ArmorManager = ArmorManager;
window.Armor3DModels = ArmorManager;
if (typeof module !== 'undefined') module.exports = ArmorManager;
