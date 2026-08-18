'use strict';
/* =================================================================
FORECRAFT 3D - SERRATED IRON BLADE (VOXEL REWORK)
File: js/player/weapons/weapon_sword_iron.js
Konsep unik: baja tempur dengan gerigi "rahang hiu" di satu sisi,
keling pandai besi, dan aura percikan logam yang mengorbit bilah.
================================================================= */

const WeaponSwordIron = {
  id: 'sword_iron',
  name: 'Bilah Besi Bergerigi',
  rarity: 'uncommon',
  colors: { blade: 0xdce2ea, dark: 0x7c848e, trim: 0x9aa2ac, gem: 0x63d471, rune: 0x63d471, emissive: 0x1d2a3c },

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
    sword.name = 'Weapon_sword_iron';

    /* ---------- Pommel baja tempa ---------- */
    sword.add(this.pl(0.05, 0.03, 0.05, W.trim, 0.345));
    sword.add(this.pl(0.08, 0.055, 0.08, W.dark, 0.315));
    sword.add(this.pl(0.03, 0.02, 0.03, W.gem, 0.36, 0, 0, W.gem));

    /* ---------- Grip kulit + cincin ---------- */
    sword.add(this.pl(0.055, 0.15, 0.055, 0x4a3520, 0.235));
    for (let i = 0; i < 4; i++) sword.add(this.pl(0.065, 0.02, 0.065, 0x2f2413, 0.285 - i * 0.04));

    /* ---------- Guard silang + keling ---------- */
    sword.add(this.pl(0.30, 0.05, 0.09, W.trim, 0.14));
    sword.add(this.pl(0.32, 0.022, 0.07, W.dark, 0.115));
    sword.add(this.pl(0.31, 0.02, 0.10, W.blade, 0.17));
    sword.add(this.pl(0.10, 0.09, 0.10, W.trim, 0.14));
    sword.add(this.pl(0.05, 0.08, 0.08, W.dark, 0.125, 0, 0.16));
    sword.add(this.pl(0.05, 0.08, 0.08, W.dark, 0.125, 0, -0.16));
    for (const zz of [0.1, -0.1]) sword.add(this.pl(0.018, 0.055, 0.018, 0x39404a, 0.14, zz));

    /* ---------- Gem zamrud ---------- */
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.055),
      new THREE.MeshPhongMaterial({ color: W.gem, emissive: W.gem, emissiveIntensity: 0.6, transparent: true, opacity: 0.92, shininess: 100 }));
    gem.position.set(0, 0.14, 0.062); gem.rotation.y = Math.PI / 4;
    sword.add(gem);

    /* ---------- Bilah + gerigi rahang hiu ----------
       BUGFIX celah: bilah dulu berhenti di y=-0.06, ricasso mulai y=-0.04
       (terpisah). Bilah diperpanjang ke atas sampai masuk ke ricasso;
       ujung tip tetap di y=-0.90. */
    const bladeG = new THREE.BoxGeometry(0.088, 0.89, 0.03); bladeG.translate(0, -0.455, 0);
    const blade = new THREE.Mesh(bladeG, new THREE.MeshLambertMaterial({ color: W.blade, emissive: W.emissive }));
    blade.castShadow = true; sword.add(blade);
    sword.add(this.pl(0.104, 0.14, 0.04, W.trim, 0.03));                 // ricasso
    sword.add(this.pl(0.016, 0.82, 0.034, W.dark, -0.48, 0, -0.046));    // punggung bilah
    sword.add(this.pl(0.03, 0.66, 0.036, W.dark, -0.42));                // fuller
    sword.add(this.pl(0.012, 0.8, 0.014, 0xffffff, -0.47, 0, 0.041));    // kilau sisi tajam

    // Gerigi rahang hiu (sisi +x), dimiringkan seperti gergaji
    for (let i = 0; i < 9; i++) {
      const big = (i % 2 === 0);
      const tooth = this.pl(big ? 0.026 : 0.02, big ? 0.05 : 0.036, 0.024, W.blade, -0.14 - i * 0.08, 0, 0.052);
      tooth.rotation.z = 0.4;
      sword.add(tooth);
    }

    // Ujung bilah bertingkat
    sword.add(this.pl(0.07, 0.08, 0.028, W.blade, -0.94));
    sword.add(this.pl(0.045, 0.07, 0.024, W.blade, -1.0));
    sword.add(this.pl(0.02, 0.05, 0.018, 0xffffff, -1.05));

    /* ---------- AURA: percikan logam mengorbit ---------- */
    const sparks = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.013, 0.013),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xe8f4ff : 0xbcc7d4, transparent: true, opacity: 0.9 }));
      s.userData = { a0: i * 0.7, r: 0.085 + (i % 3) * 0.022, y0: -0.15 - (i % 5) * 0.17, sp: 1.4 + (i % 3) * 0.6 };
      sparks.add(s);
    }
    sword.add(sparks);

    sword.userData.fx = { sparks, gem };
    this._sword = sword;
    gem.onBeforeRender = () => this.tick(performance.now() * 0.001);

    sword.position.set(0, -0.31, 0.02);
    sword.rotation.x = -Math.PI / 2;
    return sword;
  },

  /* AURA dinamis — fungsi murni terhadap waktu, aman dipanggil berulang */
  tick(t) {
    const s = this._sword; if (!s || !s.userData.fx) return;
    const fx = s.userData.fx;
    fx.sparks.children.forEach((p) => {
      const u = p.userData;
      const a = u.a0 + t * u.sp;
      p.position.set(Math.cos(a) * u.r, u.y0 + Math.sin(t * 1.6 + u.a0) * 0.035, Math.sin(a) * u.r * 0.7);
      p.rotation.set(t * 3 + u.a0, t * 2.2, 0);
      p.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 5 + u.a0 * 2));
    });
    fx.gem.material.emissiveIntensity = 0.5 + 0.35 * Math.sin(t * 2.4);
    fx.gem.rotation.y = Math.PI / 4 + Math.sin(t * 1.2) * 0.15;
  }
};

window.WeaponSwordIron = WeaponSwordIron;