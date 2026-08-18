'use strict';
/* =================================================================
FORECRAFT 3D - STORM SWORD (VOXEL REWORK)
File: js/player/weapons/weapon_sword_storm.js
Konsep unik: bilah berbentuk SAMBARAN PETIR zig-zag (5 segmen offset),
guard sayap emas, aura kilat menyambar & partikel muatan listrik.
================================================================= */

const WeaponSwordStorm = {
  id: 'storm_storm_id_placeholder',
  name: 'Pedang Badai',
  rarity: 'rare',
  colors: { blade: 0xbfe6ff, trim: 0xffe066, gem: 0x4da3ff, rune: 0xffe066, emissive: 0x1c4f8f },

  box(w, h, d, color, emissive = 0x000000) {
    const mat = new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true; return m;
  },
  pl(w, h, d, color, y = 0, z = 0, x = 0, emissive = 0x000000) {
    const m = this.box(w, h, d, color, emissive);
    m.position.set(x, y, z); return m;
  },

  /* Pembuat garis kilat zig-zag dari voxel kecil */
  bolt(len, color) {
    const g = new THREE.Group();
    const n = 5, step = len / n;
    let x = 0;
    for (let i = 0; i < n; i++) {
      const nx = (i % 2 === 0 ? 1 : -1) * 0.022;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, step * 1.18, 0.01),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
      m.position.set((x + nx) / 2, -step * (i + 0.5), 0);
      m.rotation.z = (i % 2 === 0 ? 0.16 : -0.16);
      g.add(m);
      x = nx;
    }
    return g;
  },

  build() {
    this.id = 'sword_storm';
    const W = this.colors;
    const sword = new THREE.Group();
    sword.name = 'Weapon_sword_storm';

    /* ---------- Pommel orb emas + inti listrik ---------- */
    sword.add(this.pl(0.07, 0.06, 0.07, W.trim, 0.31));
    const orb = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035),
      new THREE.MeshBasicMaterial({ color: W.gem, transparent: true, opacity: 0.95 }));
    orb.position.set(0, 0.31, 0); orb.rotation.set(Math.PI / 4, Math.PI / 4, 0);
    sword.add(orb);

    /* ---------- Grip biru dongker + kawat emas ---------- */
    sword.add(this.pl(0.055, 0.15, 0.055, 0x24344f, 0.225));
    for (let i = 0; i < 5; i++) sword.add(this.pl(0.064, 0.014, 0.064, i % 2 ? W.trim : 0x3b5a86, 0.285 - i * 0.032));

    /* ---------- Guard sayap emas ---------- */
    sword.add(this.pl(0.30, 0.045, 0.09, W.trim, 0.14));
    sword.add(this.pl(0.10, 0.075, 0.10, W.trim, 0.14));
    sword.add(this.pl(0.31, 0.02, 0.10, 0xfff2a8, 0.165));
    for (const sx of [1, -1]) {
      sword.add(this.pl(0.05, 0.06, 0.06, W.trim, 0.16, 0, sx * 0.15));
      sword.add(this.pl(0.035, 0.06, 0.045, W.trim, 0.19, 0, sx * 0.165));
      sword.add(this.pl(0.022, 0.05, 0.03, 0xfff2a8, 0.215, 0, sx * 0.175));
    }

    /* ---------- Gem badai ---------- */
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05),
      new THREE.MeshPhongMaterial({ color: W.gem, emissive: W.gem, emissiveIntensity: 0.7, transparent: true, opacity: 0.9, shininess: 100 }));
    gem.position.set(0, 0.14, 0.055); gem.rotation.y = Math.PI / 4;
    sword.add(gem);

    /* ---------- Bilah petir zig-zag (5 segmen offset) ----------
       BUGFIX celah: segmen teratas dulu berhenti di y=-0.045, ricasso mulai
       y=-0.03 (terpisah). Segmen[0] diperpanjang ke atas (h:0.235) sampai
       masuk ke ricasso; dasar segmen & ujung tip tidak bergeser. */
    sword.add(this.pl(0.10, 0.12, 0.04, W.trim, 0.03)); // ricasso
    const SEG = [
      { y: -0.1175, x: 0.0,    w: 0.088, h: 0.235 },
      { y: -0.31, x: 0.022,  w: 0.084 },
      { y: -0.48, x: -0.02,  w: 0.08  },
      { y: -0.65, x: 0.02,   w: 0.072 },
      { y: -0.82, x: -0.014, w: 0.06  },
    ];
    const segs = [], edges = [];
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    SEG.forEach((g) => {
      const gh = g.h !== undefined ? g.h : 0.19;
      const mat = new THREE.MeshLambertMaterial({ color: W.blade, emissive: W.emissive });
      const m = new THREE.Mesh(new THREE.BoxGeometry(g.w, gh, 0.03), mat);
      m.position.set(g.x, g.y, 0); m.castShadow = true;
      sword.add(m); segs.push(mat);
      for (const sx of [1, -1]) {
        const em = edgeMat.clone();
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.011, gh, 0.016), em);
        e.position.set(g.x + sx * (g.w / 2 - 0.004), g.y, 0);
        sword.add(e); edges.push(em);
      }
      const j = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03),
        new THREE.MeshBasicMaterial({ color: W.rune, transparent: true, opacity: 0.85 }));
      j.position.set(g.x, g.y + gh / 2, 0); j.rotation.z = Math.PI / 4;
      sword.add(j);
    });
    sword.add(this.pl(0.04, 0.09, 0.024, W.blade, -0.95, 0, -0.02, W.emissive));
    sword.add(this.pl(0.022, 0.08, 0.018, 0xffffff, -1.02, 0, -0.03));

    /* ---------- Rune petir kuning ---------- */
    const runes = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.036),
        new THREE.MeshBasicMaterial({ color: W.rune, transparent: true, opacity: 0.9 }));
      r.position.set(SEG[i + 1].x, -0.31 - i * 0.17, 0); r.rotation.z = Math.PI / 4;
      runes.push(r); sword.add(r);
    }

    /* ---------- AURA: kilat menyambar + partikel muatan ---------- */
    const bolts = [];
    const b1 = this.bolt(0.8, 0xfff7ae);  b1.position.set(0, -0.12, 0.05);  bolts.push(b1); sword.add(b1);
    const b2 = this.bolt(0.7, 0xbfe6ff);  b2.position.set(0, -0.15, -0.05); bolts.push(b2); sword.add(b2);
    const b3 = this.bolt(0.34, 0xfff7ae); b3.position.set(0.17, 0.16, 0);  b3.rotation.z = -0.9; bolts.push(b3); sword.add(b3);
    const b4 = this.bolt(0.34, 0xfff7ae); b4.position.set(-0.17, 0.16, 0); b4.rotation.z = 0.9;  bolts.push(b4); sword.add(b4);

    const charge = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe066 : 0x9fd4ff, transparent: true, opacity: 0.9 }));
      c.userData = { a0: i * 0.9, r: 0.1 + (i % 2) * 0.03, sp: 3.5 + (i % 3), y0: -0.12 - (i % 4) * 0.22 };
      charge.add(c);
    }
    sword.add(charge);

    sword.userData.fx = { bolts, charge, edges, segs, gem, runes, orb };
    this._sword = sword;
    gem.onBeforeRender = () => this.tick(performance.now() * 0.001);

    sword.position.set(0, -0.31, 0.02);
    sword.rotation.x = -Math.PI / 2;
    return sword;
  },

  tick(t) {
    const s = this._sword; if (!s || !s.userData.fx) return;
    const fx = s.userData.fx;
    // Kilat menyambar secara acak (flash)
    fx.bolts.forEach((b, i) => {
      const flash = Math.sin(t * 13.7 + i * 5.1) > 0.72 || Math.sin(t * 7.3 + i * 2.7) > 0.93;
      b.visible = flash;
      if (flash) {
        b.scale.set(0.8 + 0.5 * Math.abs(Math.sin(t * 41 + i)), 1, 1);
        b.children.forEach((m) => { m.material.opacity = 0.55 + 0.45 * Math.random(); });
      }
    });
    // Tepi bilah berkedip berurutan (arus listrik mengalir)
    const hot = Math.floor(t * 9) % fx.edges.length;
    fx.edges.forEach((e, i) => { e.opacity = i === hot ? 1 : 0.55 + 0.2 * Math.sin(t * 6 + i); });
    const hotSeg = Math.floor(t * 6) % fx.segs.length;
    fx.segs.forEach((m, i) => { m.emissiveIntensity = i === hotSeg ? 1 : 0.45; });
    // Partikel muatan spiral cepat
    fx.charge.children.forEach((c) => {
      const u = c.userData;
      const a = u.a0 + t * u.sp;
      c.position.set(Math.cos(a) * u.r, u.y0 + Math.sin(t * 3 + u.a0) * 0.03, Math.sin(a) * u.r * 0.6);
      c.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 8 + u.a0));
    });
    fx.orb.rotation.y = t * 3;
    fx.gem.material.emissiveIntensity = 0.6 + 0.4 * Math.abs(Math.sin(t * 5));
    fx.runes.forEach((r, i) => { r.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(t * 4 + i * 1.3)); });
  }
};

window.WeaponSwordStorm = WeaponSwordStorm;