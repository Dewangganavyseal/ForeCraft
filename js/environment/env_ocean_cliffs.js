'use strict';
/* =============================================================================
   FITUR BIOME LAUT: TEBING BATU RAKSASA, JEMBATAN ALAMI, KAPAL KARAM 4X & PETI DUNGEON
   -----------------------------------------------------------------------------
   Spesifikasi:
   1. Model 3D Peti Harta Karun:
      - Memakai model Peti Dungeon otentik (PortChest.build() / Dungeon.buildChest()).
      - Lubang kunci dan plat gembok emas duduk pas di depan peti (menempel rapi
        di sambungan tutup & badan, tidak melayang di udara).
   2. Bangkai Kapal Karam Raksasa (Shipwreck 4x):
      - Skala 4x lipat dari sebelumnya: panjang 25 blok, lebar 8 blok, tinggi 7 blok!
      - Lengkap dengan lunas kayu tebal, gading-gading kapal melengkung (ribs),
        lambung bergaris, haluan bertingkat dengan jangkar dan tiang cucur,
        buritan quarterdeck tinggi dengan kemudi kapal besar dan kabin kapten,
        tiang layar utama patah melintang dengan palang layar, sarang pengawas,
        dan kain layar sobek.
   3. Collider & Walkability:
      - Kapal memiliki collider nyata (OceanCliffs.topAt & OceanCliffs.solidAt)
        yang terhubung ke World.groundAt & World.blockedAt.
      - Terdapat tanjakan lambung patah di sisi kanan (starboard) yang melandai
        masuk ke air, sehingga pemain yang berenang bisa langsung melangkah/naik
        ke geladak tanpa rintangan.
      - Pemain bisa menjelajah seluruh geladak: geladak utama, geladak haluan,
        dan geladak buritan.
   4. Peti Harta Karun di Geladak Buritan:
      - Peti ditempatkan di geladak buritan (quarterdeck) di samping kemudi kapal.
      - Bisa dibuka dengan mulus via tombol interaksi [F], memicu animasi tutup
        membuka ke belakang, kilau emas permata, koin 100-1000, 20% Log Pass Altar,
        dan berbagai ore berharga (peluang ore tertinggi 10%).
   ============================================================================= */

const OceanCliffs = {
  CELL: 42,               // unit pindai fitur (bukan unit undian spawn)
  CHANCE: 0.40,           // peluang satu WILAYAH LAUT berkapal karam/tebing: 40%
  SAVE_KEY: 'forecraft_ocean_wrecks_v1',
  opened: {},
  spawnedChests: {},
  spawnedWrecks: {},
  _cache: {},

  init(scene) {
    this.scene = scene;
    this.load();

    /* 1. Daftarkan model 3D Bangkai Kapal Karam 4x ke Furni */
    if (typeof Furni !== 'undefined' && Furni.DEFS) {
      Furni.DEFS.shipwreck = {
        n: 'Bangkai Kapal Karam',
        e: '⛵',
        item: null,
        decor: true,
        build() {
          return OceanCliffs.buildShipwreckMesh();
        }
      };

      /* 2. Peti Harta Karam = peti inventory ala desa (buka → panel, ambil sesuka hati) */
      Furni.DEFS.wreck_chest = {
        n: 'Peti Harta Karam',
        e: '🧰',
        item: null,
        r: 3.5,
        label: '🧰 Buka Peti Harta',
        panelTitle: 'Peti Harta Karam',
        build() {
          if (typeof PortChest !== 'undefined') return PortChest.build();
          if (typeof Dungeon !== 'undefined' && Dungeon.buildChest) return Dungeon.buildChest();
          if (typeof Env_Chest !== 'undefined') return Env_Chest.build();
          const g = new THREE.Group();
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.65), new THREE.MeshLambertMaterial({ color: 0x8a552f }));
          m.position.y = 0.28;
          g.add(m);
          return g;
        },
        use(f) {
          OceanCliffs.openChest(f);
        }
      };
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.opened) this.opened = d.opened;
      }
    } catch (e) {}
  },

  save() {
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify({ opened: this.opened }));
    } catch (e) {}
  },

  /* =========================================================================
     BUILDER MODEL 3D BANGKAI KAPAL KARAM RAKSASA (4X LIPAT LEBIH BESAR)
     -------------------------------------------------------------------------
     Ukuran: Panjang 25 blok, Lebar 8 blok, Tinggi 7 blok.
     ========================================================================= */
  /* =========================================================================
     DAFTAR BALOK & KOMPONEN MODEL BANGKAI KAPAL (4X LIPAT LEBIH BESAR)
     -------------------------------------------------------------------------
     Setiap piece dirender ke 3D Mesh DAN sekaligus dikompilasi menjadi
     Mesh Collider Heightfield 3D presisi (metode Ore topGrid & botGrid).
     Ukuran total: Panjang 25 blok, Lebar 8 blok, Tinggi 7 blok.
     ========================================================================= */
  PIECES: [
    // 1. Lunas & Rangka Dasar Bawah (Keel & Submerged Hull — padat, bukan pijakan utama)
    // walkable:true agar TIDAK PERNAH ada kolom mesh tanpa permukaan (anti-tembus),
    // tapi geladak di atasnya selalu menang karena lebih tinggi.
    { w:0.9, h:0.8, d:24.8, x:0, y:-0.4, z:0, mat:'darkHull', walkable:true },
    { w:4.8, h:0.6, d:22.5, x:0, y:0.15, z:0, mat:'darkHull', walkable:true },
    { w:6.8, h:0.6, d:18.0, x:0, y:0.65, z:0, mat:'weathered', walkable:true },

    // 2. Dinding Lambung Kiri Utuh & Railing (Solid Wall)
    { w:0.6, h:2.4, d:18.5, x:-3.7, y:1.9, z:0, mat:'weathered', isWall:true },
    { w:0.6, h:2.4, d:5.5,  x:-2.8, y:2.2, z:8.5, ry:-0.22, mat:'weathered', isWall:true },
    { w:0.6, h:2.6, d:5.5,  x:-3.1, y:2.4, z:-8.5, ry:0.16, mat:'weathered', isWall:true },
    { w:0.8, h:0.4, d:19.2, x:-3.75, y:3.2, z:0, mat:'darkHull', isWall:true },
    { w:0.8, h:0.4, d:5.8,  x:-2.85, y:3.5, z:8.5, ry:-0.22, mat:'darkHull', isWall:true },
    { w:0.8, h:0.4, d:5.8,  x:-3.15, y:3.8, z:-8.5, ry:0.16, mat:'darkHull', isWall:true },

    // 3. Sisi Kanan Lambung Pecah & Tanjakan Masuk Air (Starboard Ramp)
    { w:0.6, h:2.4, d:5.5, x:2.8, y:2.2, z:8.5, ry:0.22, mat:'weathered', isWall:true },
    { w:0.6, h:2.6, d:5.5, x:3.1, y:2.4, z:-8.5, ry:-0.16, mat:'weathered', isWall:true },
    { w:3.4, h:0.35, d:7.5, x:3.1, y:0.65, z:0.5, rz:0.34, mat:'bleached', walkable:true },
    { w:2.8, h:0.25, d:6.5, x:3.6, y:0.25, z:0.5, rx:0.05, ry:0.08, rz:0.38, mat:'brokenWood', walkable:true },
    { w:1.4, h:0.30, d:5.5, x:4.3, y:0.12, z:0.5, rz:0.25, mat:'brokenWood', walkable:true },
    { w:0.5, h:0.8,  d:1.8, x:3.4, y:1.4, z:4.8, rx:0.2, ry:-0.15, rz:0.25, mat:'brokenWood', walkable:true },
    { w:0.5, h:0.8,  d:1.8, x:3.4, y:1.4, z:-3.8, rx:-0.2, ry:0.15, rz:0.25, mat:'brokenWood', walkable:true },

    // 4. Balok Geladak Melintang & Gading-gading (Ribs)
    ...[-9.5, -6.8, -4.2, -1.6, 1.2, 4.0, 6.8, 9.5].map(rz => ({
      w:6.8, h:0.4, d:0.45, x:0, y:1.1, z:rz, mat:'ribs', walkable:true
    })),
    ...[-9.5, -6.8, -4.2, -1.6, 1.2, 4.0, 6.8, 9.5].map(rz => ({
      w:0.45, h:2.8, d:0.45, x:-3.5, y:1.8, z:rz, rz:0.18, mat:'ribs'
    })),
    ...[-9.5, -6.8, -4.2, -1.6, 1.2, 4.0, 6.8, 9.5].map((rz, i) => ({
      w:0.45, h:(i>=2&&i<=5)?1.8:2.8, d:0.45, x:3.3, y:1.2+((i>=2&&i<=5)?1.8:2.8)*0.3, z:rz, rz:-0.35, mat:'ribs'
    })),

    // 5. Geladak Utama (Main Deck)
    { w:6.8, h:0.35, d:12.4, x:0, y:1.25, z:0, mat:'bleached', walkable:true },
    { w:0.08, h:0.06, d:11.8, x:-2.8, y:1.41, z:0, mat:'darkHull' },
    { w:0.08, h:0.06, d:11.8, x:-1.4, y:1.41, z:0, mat:'darkHull' },
    { w:0.08, h:0.06, d:11.8, x:0.0,  y:1.41, z:0, mat:'darkHull' },
    { w:0.08, h:0.06, d:11.8, x:1.4,  y:1.41, z:0, mat:'darkHull' },
    { w:0.08, h:0.06, d:11.8, x:2.8,  y:1.41, z:0, mat:'darkHull' },
    { w:2.8, h:0.4, d:3.6, x:-0.5, y:1.45, z:0.5, mat:'darkHull', walkable:true },
    { w:2.4, h:0.1, d:3.2, x:-0.5, y:1.55, z:0.5, mat:'weathered', walkable:true },

    // 6. Geladak Haluan Depan & Tangga (Forecastle Deck)
    { w:3.8, h:0.9, d:1.6, x:0, y:1.65, z:5.8, rx:-0.52, mat:'weathered', walkable:true },
    { w:5.8, h:0.35, d:5.8, x:0, y:2.15, z:8.5, mat:'bleached', walkable:true },
    { w:3.2, h:0.35, d:2.8, x:0, y:2.25, z:11.2, mat:'bleached', walkable:true },
    { w:0.4, h:0.8, d:5.2, x:-2.6, y:2.7, z:8.5, mat:'weathered', isWall:true },
    { w:0.4, h:0.8, d:5.2, x: 2.6, y:2.7, z:8.5, mat:'weathered', isWall:true },
    { w:1.2, h:3.5, d:1.2, x:0, y:2.5, z:11.5, rx:0.38, mat:'darkHull' },
    { w:0.65, h:0.65, d:6.5, x:0, y:3.8, z:14.5, rx:0.26, mat:'weathered', walkable:true },
    { w:0.2, h:2.4, d:0.2, x:-2.8, y:1.8, z:10.5, rx:0.25, rz:0.2, mat:'iron' },
    { w:0.2, h:2.4, d:0.2, x: 2.8, y:1.8, z:10.5, rx:0.25, rz:-0.2, mat:'iron' },
    { w:1.6, h:0.3, d:0.35, x:-2.8, y:0.8, z:10.8, mat:'iron' },
    { w:1.6, h:0.3, d:0.35, x: 2.8, y:0.8, z:10.8, mat:'iron' },
    { w:1.3, h:0.25, d:0.25, x:-2.8, y:2.8, z:10.2, mat:'darkHull' },
    { w:1.3, h:0.25, d:0.25, x: 2.8, y:2.8, z:10.2, mat:'darkHull' },

    // 7. Geladak Buritan Belakang & Tangga (Quarterdeck — Tempat Peti Harta!)
    { w:2.2, h:1.3, d:1.8, x:-2.2, y:1.85, z:-5.8, rx:0.68, mat:'weathered', walkable:true },
    { w:2.2, h:1.3, d:1.8, x: 2.2, y:1.85, z:-5.8, rx:0.68, mat:'weathered', walkable:true },
    { w:2.4, h:0.5, d:1.8, x: 0.0, y:1.45, z:-5.8, mat:'weathered', walkable:true },
    { w:6.5, h:0.35, d:6.5, x:0, y:2.55, z:-8.8, mat:'bleached', walkable:true },
    { w:5.8, h:0.35, d:2.8, x:0, y:2.75, z:-11.0, mat:'bleached', walkable:true },
    { w:0.4, h:0.9, d:6.0, x:-3.0, y:3.1, z:-8.8, mat:'weathered', isWall:true },
    { w:0.4, h:0.9, d:6.0, x: 3.0, y:3.1, z:-8.8, mat:'weathered', isWall:true },
    { w:6.2, h:1.2, d:0.5, x:0, y:3.2, z:-11.9, mat:'darkHull', isWall:true },
    { w:0.4, h:1.4, d:0.4, x:0, y:3.2, z:-7.5, mat:'darkHull' },
    { w:1.6, h:1.6, d:0.12, x:0, y:3.9, z:-7.3, rz:0.78, mat:'gold' },
    { w:1.6, h:1.6, d:0.12, x:0, y:3.9, z:-7.3, mat:'gold' },
    { w:0.4, h:0.4, d:0.2,  x:0, y:3.9, z:-7.3, mat:'darkHull' },

    // 8. Tiang Layar Utama Patah (Fallen Mast)
    { w:0.85, h:3.8, d:0.85, x:0, y:2.9, z:0.8, rx:0.05, rz:0.15, mat:'darkHull' },
    { w:0.75, h:0.8, d:0.75, x:0.1, y:4.9, z:0.9, rx:0.15, ry:0.1, rz:0.4, mat:'brokenWood' },
    { w:0.75, h:10.5, d:0.75, x:2.8, y:2.6, z:1.5, rx:0.35, ry:0.25, rz:0.82, mat:'weathered', walkable:true },
    { w:2.2, h:1.2, d:2.2, x:4.8, y:2.1, z:2.2, rx:0.35, ry:0.25, rz:0.82, mat:'darkHull', walkable:true },
    { w:8.5, h:0.45, d:0.45, x:2.6, y:3.6, z:1.3, rx:0.22, ry:0.55, rz:0.65, mat:'weathered' },
    { w:5.2, h:2.6, d:0.08, x:3.2, y:2.8, z:1.4, rx:0.2, ry:0.52, rz:0.6, mat:'cloth' },
    { w:0.12, h:6.5, d:0.12, x:1.4, y:2.6, z:0.9, rx:-0.4, ry:0.2, rz:0.45, mat:'rope' },
    { w:0.12, h:5.5, d:0.12, x:-1.2, y:2.4, z:0.5, rx:0.35, ry:-0.15, rz:-0.35, mat:'rope' },

    // 9. Peti-Peti Kargo & Drum di Geladak
    { w:1.3, h:1.3, d:1.3, x:-1.6, y:1.9, z:-3.2, rx:0.05, ry:0.35, rz:0.08, mat:'crate', walkable:true },
    { w:1.1, h:1.1, d:1.1, x:-1.4, y:2.0, z:-1.6, rx:-0.06, ry:-0.22, rz:0.04, mat:'crate', walkable:true },
    { w:0.9, h:1.5, d:0.9, x:-2.1, y:1.95, z:-2.2, mat:'barrel', walkable:true },
    { w:0.9, h:1.5, d:0.9, x:-2.2, y:1.95, z:3.2, mat:'barrel', walkable:true },
    { w:0.6, h:0.6, d:2.2, x:-3.1, y:2.1, z:2.5, ry:-0.2, mat:'iron' },
    { w:0.6, h:0.6, d:2.2, x:-3.1, y:2.1, z:-1.5, ry:-0.2, mat:'iron' }
  ],

  buildShipwreckMesh() {
    const g = new THREE.Group();
    g.name = 'Shipwreck_3D_Galleon';

    const isMob = (typeof IS_MOBILE !== 'undefined') && IS_MOBILE;
    const M = {
      darkHull:   new THREE.MeshLambertMaterial({ color: 0x27170c }),
      weathered:  new THREE.MeshLambertMaterial({ color: 0x48321e }),
      bleached:   new THREE.MeshLambertMaterial({ color: 0x6e4e32 }),
      brokenWood: new THREE.MeshLambertMaterial({ color: 0x221308 }),
      ribs:       new THREE.MeshLambertMaterial({ color: 0x362112 }),
      iron:       new THREE.MeshLambertMaterial({ color: 0x2d3036 }),
      gold:       new THREE.MeshLambertMaterial({ color: 0xc89c3a }),
      rope:       new THREE.MeshLambertMaterial({ color: 0x756242 }),
      cloth:      new THREE.MeshLambertMaterial({ color: 0xb5a992 }),
      crate:      new THREE.MeshLambertMaterial({ color: 0x583b22 }),
      barrel:     new THREE.MeshLambertMaterial({ color: 0x3b2413 })
    };

    const addBox = (w, h, d, mat, x=0, y=0, z=0, rx=0, ry=0, rz=0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      if (rx || ry || rz) m.rotation.set(rx, ry, rz);
      m.castShadow = !isMob;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };

    // Render setiap piece yang terdaftar ke dalam 3D Mesh
    for (const p of this.PIECES) {
      addBox(p.w, p.h, p.d, M[p.mat] || M.weathered, p.x, p.y, p.z, p.rx, p.ry, p.rz);
    }

    return g;
  },

  /* =========================================================================
     GENERASI PROSEDURAL DETERMINISTIK PER SEL LAUT
     ========================================================================= */
  /* =========================================================================
     GENERASI PROSEDURAL DETERMINISTIK PER SEL LAUT
     -------------------------------------------------------------------------
     TEBING: spawn padat per sel 42-blok (CHANCE 40%) — satu biome laut bisa
     memuat BANYAK tebing yang terpencar (mis. 5 tebing), seperti sebelumnya.

     KAPAL KARAM: diundi 40% per WILAYAH BIOME Voronoi (±264 blok, pola desa).
     Wilayah laut yang lolos menempelkan TEPAT SATU kapal karam (+1 arch kecil
     penyangga) di SALAH SATU tebing dalam wilayah itu. Dua biome laut
     bersebelahan diundi masing-masing.
     ========================================================================= */
  OCEAN_SCAN: 6,          // radius sapuan sel saat mencari sel milik wilayah
  _orMemo: {},
  _orN: 0,
  /* Wilayah Voronoi (indeks regionAt WGEN) yang menaungi titik dunia (wx,wz). */
  oceanRegionAt(wx, wz) {
    if (typeof WGEN === 'undefined' || !WGEN.regionAt) return null;
    return WGEN.regionAt(wx, wz);
  },
  /* Apakah wilayah ini dapat kapal karam (undi 40%)? Deterministik indeks. */
  oceanRegionOK(rgx, rgz) {
    const k = rgx + ',' + rgz;
    if (Object.prototype.hasOwnProperty.call(this._orMemo, k)) return this._orMemo[k];
    if (this._orN > 4000) { this._orMemo = {}; this._orN = 0; }
    const ok = WGEN.hash(rgx, rgz, 7101) < this.CHANCE;
    this._orMemo[k] = ok; this._orN++;
    return ok;
  },
  /* Apakah (wx,wz) berada di dalam wilayah (rgx,rgz)? */
  inOceanRegion(wx, wz, rgx, rgz) {
    const r = this.oceanRegionAt(wx, wz);
    return !!r && r.gx === rgx && r.gz === rgz;
  },
  /* Titik pusat tebing sel ini bila selnya berair — dipakai tebing & kapal. */
  cliffSpot(gx, gz) {
    const C = this.CELL;
    for (let k = 0; k < 12; k++) {
      const tx = Math.floor(gx * C + 6 + WGEN.hash(gx, gz, 7102 + k * 13) * (C - 12));
      const tz = Math.floor(gz * C + 6 + WGEN.hash(gx, gz, 7103 + k * 17) * (C - 12));
      if (WGEN.biomeAt(tx, tz) !== BIOME.OCEAN || WGEN.isLand(tx, tz)) continue;
      let bad = false;
      if (WGEN.villagesNear) {
        for (const v of WGEN.villagesNear(tx, tz)) {
          if (Math.hypot(tx - v.x, tz - v.z) < v.r + 20) { bad = true; break; }
        }
      }
      if (bad) continue;
      return { x: tx, z: tz };
    }
    return null;
  },
  featureInCell(gx, gz) {
    const key = gx + ',' + gz;
    if (this._cache[key] !== undefined) return this._cache[key];
    if (typeof WGEN === 'undefined') return null;

    /* TEBING per sel: undi 40% per sel laut (seperti semula). */
    if (WGEN.hash(gx, gz, 7101) >= this.CHANCE) {
      this._cache[key] = null;
      return null;
    }
    const spot = this.cliffSpot(gx, gz);
    if (!spot) {
      this._cache[key] = null;
      return null;
    }
    const cx = spot.x, cz = spot.z;

    const isArch = WGEN.hash(gx, gz, 7104) < 0.45;
    let feat = null;

    if (isArch) {
      /* JEMBATAN TEBING BATU (SEA ARCH) — Ketinggian 16-20 Blok.
         Arch murni TANPA kapal: kapal dipasang terpisah per-wilayah di bawah. */
      const axis = WGEN.hash(gx, gz, 7105) < 0.5 ? 'x' : 'z';
      const p1 = (axis === 'x') ? { x: cx - 7.5, z: cz, r: 3.8 } : { x: cx, z: cz - 7.5, r: 3.8 };
      const p2 = (axis === 'x') ? { x: cx + 7.5, z: cz, r: 3.8 } : { x: cx, z: cz + 7.5, r: 3.8 };
      const height = 16 + Math.floor(WGEN.hash(gx, gz, 7106) * 5);

      feat = {
        key,
        type: 'arch',
        axis,
        cx, cz,
        p1, p2,
        height,
        seed: WGEN.hash(gx, gz, 7107),
        wreck: null,
        chest: null
      };
    } else {
      // 1-2 TEBING BATU TEGAK MANDIRI (SEA STACKS) — Ketinggian 15-20 Blok, Lebar 5-8 Blok
      const numCliffs = (WGEN.hash(gx, gz, 7108) < 0.5) ? 1 : 2;
      const cliffs = [];
      for (let k = 0; k < numCliffs; k++) {
        const ox = (k === 0) ? 0 : Math.round((WGEN.hash(gx, gz, 7109 + k * 3) - 0.5) * 18);
        const oz = (k === 0) ? 0 : Math.round((WGEN.hash(gx, gz, 7110 + k * 3) - 0.5) * 18);
        const width = 5.2 + WGEN.hash(gx, gz, 7111 + k * 3) * 3.2; // skala lebar 5..8 blok
        const peakH = 15 + Math.floor(WGEN.hash(gx, gz, 7112 + k * 3) * 6); // tinggi 15..20 blok
        cliffs.push({
          x: cx + ox,
          z: cz + oz,
          r: width / 2.0,
          peakH,
          seed: WGEN.hash(gx, gz, 7113 + k * 3)
        });
      }

      feat = {
        key,
        type: 'cliffs',
        cx, cz,
        cliffs,
        wreck: null,
        chest: null
      };
    }

    /* KAPAL KARAM per wilayah 40%: wilayah laut pemilik titik ini diundi;
       bila lolos, SATU kapal (+arch kecil penyangga) ditempel di SALAH SATU
       tebing fitur ini (tebing pertama bila grup berisi 2). */
    const reg = this.oceanRegionAt(cx, cz);
    if (reg && this.oceanRegionOK(reg.gx, reg.gz)) {
      /* Hanya fitur yang urutannya paling awal di wilayah ini yang ditempeli
         kapal — jadi 1 wilayah = tepat 1 kapal karam. */
      const anchor = this.cliffAnchor(feat);
      if (anchor && this.inOceanRegion(anchor.x, anchor.z, reg.gx, reg.gz) &&
          this.isFirstFeatureInRegion(gx, gz, reg)) {
        this.attachWreck(feat, anchor, gx, gz, reg);
      }
    }

    this._cache[key] = feat;
    return feat;
  },
  /* Titik jangkar tebing untuk menempel kapal: puncak tebing pertama. */
  cliffAnchor(feat) {
    if (!feat) return null;
    if (feat.type === 'arch') return { x: feat.cx, z: feat.cz };
    if (feat.type === 'cliffs' && feat.cliffs && feat.cliffs.length) {
      return { x: feat.cliffs[0].x, z: feat.cliffs[0].z };
    }
    return null;
  },
  /* True bila sel (gx,gz) adalah fitur ber-tebing paling awal di wilayah reg.
     Wilayah yang dibandingkan adalah wilayah JANGKAR tebing (titik cliffSpot),
     bukan titik tengah sel — karena jangkar bisa jatuh ke wilayah tetangga. */
  isFirstFeatureInRegion(gx, gz, reg) {
    const S = this.OCEAN_SCAN;
    for (let dz = -S; dz <= S; dz++) {
      for (let dx = -S; dx <= S; dx++) {
        if (dx === 0 && dz === 0) continue;
        const nx = gx + dx, nz = gz + dz;
        if (nx > gx || (nx === gx && nz >= gz)) continue;
        if (WGEN.hash(nx, nz, 7101) >= this.CHANCE) continue;
        const spot = this.cliffSpot(nx, nz);
        if (!spot) continue;
        const r2 = this.oceanRegionAt(spot.x, spot.z);
        if (!r2 || r2.gx !== reg.gx || r2.gz !== reg.gz) continue;
        return false;
      }
    }
    return true;
  },
  /* Tempel 1 kapal karam (+arch kecil penyangga) di titik jangkar tebing.
     Kapal dipilih sisi yang tetap di wilayah & berair; bila kedua sisi gagal,
     kapal dibatalkan (tebingnya tetap ada). */
  attachWreck(feat, anchor, gx, gz, reg) {
    const ax = anchor.x, az = anchor.z;
    const axis = WGEN.hash(gx, gz, 7205) < 0.5 ? 'x' : 'z';
    const wreckYaw = (axis === 'x') ? 0.42 : Math.PI * 0.5 + 0.42;
    /* Kapal disandarkan di sisi tebing (offset 13.5 blok) yang tetap
       se-wilayah & berair; coba sisi + dulu, lalu sisi −. */
    const sides = (axis === 'x') ? [[ax, az + 13.5], [ax, az - 13.5]]
                                 : [[ax + 13.5, az], [ax - 13.5, az]];
    let wreckX = -1, wreckZ = -1;
    for (const s of sides) {
      if (!this.inOceanRegion(s[0], s[1], reg.gx, reg.gz)) continue;
      if (WGEN.biomeAt(s[0], s[1]) !== BIOME.OCEAN || WGEN.isLand(s[0], s[1])) continue;
      wreckX = s[0]; wreckZ = s[1];
      break;
    }
    if (wreckX < 0) return;
    const chestX = wreckX + Math.sin(wreckYaw) * (-9.2);
    const chestZ = wreckZ + Math.cos(wreckYaw) * (-9.2);
    const chestY = CFG.WATER_Y + 2.55;
    feat.wreck = { x: wreckX, z: wreckZ, yaw: wreckYaw };
    feat.chest = {
      x: chestX,
      y: chestY,
      z: chestZ,
      yaw: wreckYaw + Math.PI
    };
    /* Arch kecil penyangga di samping kapal (opsional visual jembatan). */
    if (feat.type === 'cliffs') {
      feat.archSide = {
        axis,
        p1: (axis === 'x') ? { x: ax - 7.5, z: az, r: 3.8 } : { x: ax, z: az - 7.5, r: 3.8 },
        p2: (axis === 'x') ? { x: ax + 7.5, z: az, r: 3.8 } : { x: ax, z: az + 7.5, r: 3.8 },
        height: 16 + Math.floor(WGEN.hash(gx, gz, 7206) * 5),
        seed: WGEN.hash(gx, gz, 7207)
      };
    }
  },

  /* Cache daftar fitur per sel laut: featuresNear dipanggil ratusan kali per
     frame (groundAt/blockedAt × banyak sampel), jadi hasilnya di-cache per sel. */
  _nearCache: {},
  _nearN: 0,
  featuresNear(wx, wz) {
    const C = this.CELL;
    const gx = Math.floor(wx / C), gz = Math.floor(wz / C);
    const key = gx + ',' + gz;
    const hit = this._nearCache[key];
    if (hit !== undefined) return hit;
    if (this._nearN > 900) { this._nearCache = {}; this._nearN = 0; }
    const list = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const f = this.featureInCell(gx + dx, gz + dz);
        if (f) list.push(f);
      }
    }
    this._nearCache[key] = list; this._nearN++;
    return list;
  },
  /* Satu-satunya kapal yang relevan: yang titiknya dekat (radius 40 blok).
     Shortcut ini menggantikan featuresNear di jalur panas (topAt/solidAt)
     sehingga tidak perlu memindai 9 sel laut + hash tiap panggilan. */
  shipNear(x, z) {
    const list = this.featuresNear(x, z);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (!f.wreck) continue;
      if (Math.abs(x - f.wreck.x) > 40 || Math.abs(z - f.wreck.z) > 40) continue;
      return f;
    }
    return null;
  },
  /* Gambar satu span arch (utama maupun archSide penyangga kapal). */
  archSpanAt(f, arch, wx, wz) {
    const d1 = Math.hypot(wx - arch.p1.x, wz - arch.p1.z);
    const d2 = Math.hypot(wx - arch.p2.x, wz - arch.p2.z);
    const ang1 = Math.atan2(wz - arch.p1.z, wx - arch.p1.x);
    const ang2 = Math.atan2(wz - arch.p2.z, wx - arch.p2.x);
    const w1 = 1.0 + Math.sin(ang1 * 3 + arch.seed * 9.1) * 0.25 + Math.cos(ang1 * 5) * 0.12;
    const w2 = 1.0 + Math.sin(ang2 * 3 + arch.seed * 6.3) * 0.25 + Math.cos(ang2 * 5) * 0.12;
    if (d1 <= arch.p1.r * w1) {
      const u = d1 / (arch.p1.r * w1);
      const h = Math.max(CFG.SEA + 3, Math.min(arch.height, Math.round(arch.height - Math.pow(u, 2.0) * 2.8)));
      return { type: 'solid', h };
    }
    if (d2 <= arch.p2.r * w2) {
      const u = d2 / (arch.p2.r * w2);
      const h = Math.max(CFG.SEA + 3, Math.min(arch.height, Math.round(arch.height - Math.pow(u, 2.0) * 2.8)));
      return { type: 'solid', h };
    }
    let inSpan = false, tSpan = 0;
    const halfW = 2.4;
    if (arch.axis === 'x') {
      const minX = Math.min(arch.p1.x, arch.p2.x), maxX = Math.max(arch.p1.x, arch.p2.x);
      if (wx >= minX - 0.5 && wx <= maxX + 0.5 && Math.abs(wz - arch.cz) <= halfW) {
        inSpan = true; tSpan = (wx - minX) / Math.max(1, maxX - minX);
      }
    } else {
      const minZ = Math.min(arch.p1.z, arch.p2.z), maxZ = Math.max(arch.p1.z, arch.p2.z);
      if (wz >= minZ - 0.5 && wz <= maxZ + 0.5 && Math.abs(wx - arch.cx) <= halfW) {
        inSpan = true; tSpan = (wz - minZ) / Math.max(1, maxZ - minZ);
      }
    }
    if (inSpan) {
      const archSin = Math.sin(clamp(tSpan, 0, 1) * Math.PI);
      return {
        type: 'arch',
        h: Math.round(arch.height - 1 + archSin * 1.5),
        archBottom: 6 + Math.round(archSin * 5.5)
      };
    }
    return null;
  },

  /* =========================================================================
     KOLOM VOXEL TEBING BATU LAUT (KETINGGIAN 15-20 BLOK)
     ========================================================================= */
  columnAt(wx, wz) {
    const list = this.featuresNear(wx, wz);
    if (!list.length) return null;

    for (const f of list) {
      if (f.type === 'cliffs') {
        for (const cl of f.cliffs) {
          const dx = wx - cl.x, dz = wz - cl.z;
          const d = Math.hypot(dx, dz);
          const ang = Math.atan2(dz, dx);

          // Kontur batuan organik (fissures, crags & shelves)
          const w1 = Math.sin(ang * 3 + cl.seed * 11.3) * 0.28;
          const w2 = Math.cos(ang * 5 + cl.seed * 7.1) * 0.16;
          const w3 = Math.sin(ang * 8 + cl.seed * 3.7) * 0.08;
          const rEff = cl.r * (1.0 + w1 + w2 + w3);

          if (d <= rEff) {
            const u = d / rEff;
            const drop = Math.pow(u, 2.2) * 3.4;
            const crag = (WGEN.hash(wx, wz, 7120) - 0.5) * 1.5;
            const h = Math.max(CFG.SEA + 3, Math.min(cl.peakH, Math.round(cl.peakH - drop + crag)));
            return {
              type: 'solid',
              h
            };
          }
        }
      } else if (f.type === 'arch') {
        const hit = this.archSpanAt(f, f, wx, wz);
        if (hit) return hit;
      }
      /* Arch kecil penyangga kapal (menempel di salah satu tebing grup). */
      if (f.archSide) {
        const side = {
          axis: f.archSide.axis, cx: f.cx, cz: f.cz,
          p1: f.archSide.p1, p2: f.archSide.p2,
          height: f.archSide.height, seed: f.archSide.seed
        };
        const hit = this.archSpanAt(f, side, wx, wz);
        if (hit) return hit;
      }
    }

    return null;
  },

  /* =========================================================================
     COLLIDER MESH PERAHU KARAM 4X — TIRU PERSIS METODE ORE (PER-BOX OBB)
     -------------------------------------------------------------------------
     Prinsip Env_Ore: collider dihitung dari VOXEL/BALOK penyusun mesh itu
     sendiri (bukan zona kasar), topAt = permukaan tertinggi kolom itu,
     solidAt = padat HANYA bila titik di dalam volume balok & di bawah
     permukaan kolom itu.

     Di sini tiap PIECES (= tiap Box3D mesh kapal) diuji sebagai OBB
     (oriented bounding box) EKSak dengan matriks rotasi XYZ yang SAMA PERSIS
     dengan `m.rotation.set(rx,ry,rz)` di Three.js — jadi collider 100%
     mengikuti bentuk mesh, termasuk balok miring (tangga, tanjakan, tiang
     patah 3-sumbu). Tidak ada grid aproksimasi, tidak ada rumus slope.
     ========================================================================= */
  shipLocal(f, x, z) {
    const dx = x - f.wreck.x, dz = z - f.wreck.z;
    const c = Math.cos(f.wreck.yaw), s = Math.sin(f.wreck.yaw);
    return { lx: dx * c - dz * s, lz: dx * s + dz * c };
  },
  /* Inverse-rotasi XYZ Three.js (R = Rx*Ry*Rz → invers = Rz⁻¹*Ry⁻¹*Rx⁻¹).
     Dipakai bersama boxTopAt & boxContains supaya 100% sama dengan mesh. */
  invRotXYZ(rx, ry, rz, dx, dy, dz) {
    if (rx) {
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const y1 = cx * dy + sx * dz, z1 = -sx * dy + cx * dz;
      dy = y1; dz = z1;
    }
    if (ry) {
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const x2 = cy * dx - sy * dz, z2 = sy * dx + cy * dz;
      dx = x2; dz = z2;
    }
    if (rz) {
      const cz = Math.cos(rz), sz = Math.sin(rz);
      const x3 = cz * dx + sz * dy, y3 = -sz * dx + cz * dy;
      dx = x3; dy = y3;
    }
    return [dx, dy, dz];
  },
  /* Permukaan atas balok b pada kolom lokal (lx,lz): ray vertikal vs OBB.
     Mengembalikan tinggi lokal kapal, atau -Infinity bila kolom tak menyentuh. */
  boxTopAt(b, lx, lz) {
    const rx = b.rx || 0, ry = b.ry || 0, rz = b.rz || 0;
    const RAY_Y = 50;
    let ox = lx - b.x, oy = RAY_Y - b.y, oz = lz - b.z;
    let dxl = 0, dyl = -1, dzl = 0;
    if (rx || ry || rz) {
      const o = this.invRotXYZ(rx, ry, rz, ox, oy, oz);
      ox = o[0]; oy = o[1]; oz = o[2];
      const d = this.invRotXYZ(rx, ry, rz, dxl, dyl, dzl);
      dxl = d[0]; dyl = d[1]; dzl = d[2];
    }
    const ex = b.w / 2, ey = b.h / 2, ez = b.d / 2;
    const EPS = 1e-4;
    let tmin = -Infinity, tmax = Infinity;
    const axes = [[ox, dxl, ex], [oy, dyl, ey], [oz, dzl, ez]];
    for (let i = 0; i < 3; i++) {
      const o = axes[i][0], d = axes[i][1], e = axes[i][2];
      if (Math.abs(d) < 1e-9) {
        if (Math.abs(o) > e + EPS) return -Infinity;
      } else {
        let t1 = (-e - o) / d, t2 = (e - o) / d;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return -Infinity;
      }
    }
    if (tmax < 0) return -Infinity;
    return RAY_Y - Math.max(tmin, 0);
  },
  /* Uji titik lokal (lx,ly,lz) di dalam OBB balok b (pad = toleransi). */
  boxContains(b, lx, ly, lz, pad) {
    pad = pad || 0;
    const rx = b.rx || 0, ry = b.ry || 0, rz = b.rz || 0;
    let dx = lx - b.x, dy = ly - b.y, dz = lz - b.z;
    if (rx || ry || rz) {
      const r = this.invRotXYZ(rx, ry, rz, dx, dy, dz);
      dx = r[0]; dy = r[1]; dz = r[2];
    }
    return Math.abs(dx) <= b.w / 2 + pad &&
           Math.abs(dy) <= b.h / 2 + pad &&
           Math.abs(dz) <= b.d / 2 + pad;
  },

  /* AABB tiap piece (ruang lokal kapal) dihitung SEKALI — pantulan awal murah
     sebelum uji ray-OBB mahal. walkTop juga di-cache per kolom (0.25 blok)
     supaya kolom yang sama tidak di-ray ulang tiap frame. */
  _shipAABB: null,
  _walkCache: {},
  _walkN: 0,
  shipAABB() {
    if (this._shipAABB) return this._shipAABB;
    const out = [];
    for (let p = 0; p < this.PIECES.length; p++) {
      const b = this.PIECES[p];
      const ex = b.w / 2, ey = b.h / 2, ez = b.d / 2;
      const rx = b.rx || 0, ry = b.ry || 0, rz = b.rz || 0;
      let minX = -ex, maxX = ex, minZ = -ez, maxZ = ez;
      if (rx || ry || rz) {
        /* AABB eksak: transformasi 8 sudut OBB (R = Rx*Ry*Rz ala Three.js). */
        const cx = Math.cos(rx), sx = Math.sin(rx);
        const cy = Math.cos(ry), sy = Math.sin(ry);
        const cz = Math.cos(rz), sz = Math.sin(rz);
        minX = Infinity; maxX = -Infinity; minZ = Infinity; maxZ = -Infinity;
        for (let sxn = -1; sxn <= 1; sxn += 2) {
          for (let syn = -1; syn <= 1; syn += 2) {
            for (let szn = -1; szn <= 1; szn += 2) {
              const y1 = cx * syn * ey + sx * szn * ez;
              const z1 = -sx * syn * ey + cx * szn * ez;
              const x2 = cy * sxn * ex - sy * z1;
              const z2 = sy * sxn * ex + cy * z1;
              const x3 = cz * x2 + sz * y1;
              const z3 = z2;
              if (x3 < minX) minX = x3;
              if (x3 > maxX) maxX = x3;
              if (z3 < minZ) minZ = z3;
              if (z3 > maxZ) maxZ = z3;
            }
          }
        }
        minX += b.x; maxX += b.x; minZ += b.z; maxZ += b.z;
      } else {
        minX = b.x - ex; maxX = b.x + ex; minZ = b.z - ez; maxZ = b.z + ez;
      }
      out.push({ b, minX, maxX, minZ, maxZ });
    }
    this._shipAABB = out;
    return out;
  },
  walkTopAt(lx, lz) {
    const key = lx.toFixed(3) + ',' + lz.toFixed(3);
    const hit = this._walkCache[key];
    if (hit !== undefined) return hit;
    if (this._walkN > 2000) { this._walkCache = {}; this._walkN = 0; }
    let best = -Infinity;
    const boxes = this.shipAABB();
    const EPSB = 1e-3;
    const probe = (walls) => {
      for (let p = 0; p < boxes.length; p++) {
        const b = boxes[p].b;
        if (b.ghost) continue;
        const ok = walls ? b.isWall : b.walkable;
        if (!ok) continue;
        if (lx < boxes[p].minX - EPSB || lx > boxes[p].maxX + EPSB ||
            lz < boxes[p].minZ - EPSB || lz > boxes[p].maxZ + EPSB) continue;
        const t = this.boxTopAt(b, lx, lz);
        if (t > best) best = t;
      }
    };
    /* Dinding ikut memberi permukaan (puncak railing) supaya tidak ada kolom
       mesh tanpa pijakan — kecuali kolom itu SUDAH punya pijakan walkable. */
    probe(false);
    if (best === -Infinity) probe(true);
    /* Fallback terakhir: kolom mana pun yang disentuh mesh memberi permukaan,
       supaya tidak pernah ada lubang tembus. */
    if (best === -Infinity) {
      for (let p = 0; p < boxes.length; p++) {
        const b = boxes[p].b;
        if (b.ghost) continue;
        if (lx < boxes[p].minX - EPSB || lx > boxes[p].maxX + EPSB ||
            lz < boxes[p].minZ - EPSB || lz > boxes[p].maxZ + EPSB) continue;
        const t = this.boxTopAt(b, lx, lz);
        if (t > best) best = t;
      }
    }
    this._walkCache[key] = best; this._walkN++;
    return best;
  },

  /* Uji titik lokal di dalam OBB balok apa pun (AABB dulu, OBB bila lolos). */
  shipContains(lx, ly, lz, wallsOnly) {
    const boxes = this.shipAABB();
    for (let p = 0; p < boxes.length; p++) {
      const b = boxes[p].b;
      if (b.ghost) continue;
      if (wallsOnly && !b.isWall) continue;
      if (lx < boxes[p].minX - 0.02 || lx > boxes[p].maxX + 0.02 ||
          lz < boxes[p].minZ - 0.02 || lz > boxes[p].maxZ + 0.02) continue;
      if (this.boxContains(b, lx, ly, lz, 0.02)) return true;
    }
    return false;
  },

  topAt(x, z) {
    const f = this.shipNear(x, z);
    if (!f) return 0;
    const l = this.shipLocal(f, x, z);
    if (l.lx < -7 || l.lx > 8 || l.lz < -15 || l.lz > 19.5) return 0;
    const h = this.walkTopAt(l.lx, l.lz);
    if (h === -Infinity) return 0;
    const y0 = (typeof CFG !== 'undefined' && CFG.WATER_Y) ? CFG.WATER_Y : 4.82;
    return y0 + h;
  },

  solidAt(x, y, z) {
    const f = this.shipNear(x, z);
    if (!f) return false;
    const l = this.shipLocal(f, x, z);
    if (l.lx < -7 || l.lx > 8 || l.lz < -15 || l.lz > 19.5) return false;
    const y0 = (typeof CFG !== 'undefined' && CFG.WATER_Y) ? CFG.WATER_Y : 4.82;
    const ly = y - y0;
    const top = this.walkTopAt(l.lx, l.lz);
    if (top === -Infinity) return this.shipContains(l.lx, ly, l.lz, false);
    if (y >= y0 + top - 0.12) return this.shipContains(l.lx, ly, l.lz, true);
    return this.shipContains(l.lx, ly, l.lz, false);
  },

  /* =========================================================================
     UPDATE & SPAWNING KAPAL KARAM 4X & PETI DUNGEON DI LAUT
     ========================================================================= */
  _updT: 0,
  update(dt) {
    if (typeof Player === 'undefined' || !Player.pos) return;
    /* Spawn/despawn kapal & peti cukup dicek 4x per detik — bukan tiap frame. */
    this._updT -= dt;
    const px = Player.pos.x, pz = Player.pos.z;
    if (this._updT > 0) {
      const key = Math.floor(px / this.CELL) + ',' + Math.floor(pz / this.CELL);
      if (key === this._updKey) return;
      this._updKey = key;
    } else {
      this._updT = 0.25;
      this._updKey = Math.floor(px / this.CELL) + ',' + Math.floor(pz / this.CELL);
    }
    const list = this.featuresNear(px, pz);

    for (const f of list) {
      if (!f.wreck || !f.chest) continue;
      const d = Math.hypot(f.wreck.x - px, f.wreck.z - pz);

      // Pasang Bangkai Kapal 3D 4x & Peti Harta saat pemain mendekat (< 85 blok)
      if (d < 85) {
        // 1. Spawning 3D Shipwreck 4x
        if (!this.spawnedWrecks[f.key] && typeof Furni !== 'undefined' && Furni.place) {
          const wreckObj = Furni.place('shipwreck', f.wreck.x, CFG.WATER_Y, f.wreck.z, f.wreck.yaw, true);
          if (wreckObj) {
            wreckObj.wkey = f.key;
            this.spawnedWrecks[f.key] = wreckObj;
          }
        }

        // 2. Spawning Peti Harta Karun Dungeon
        if (!this.spawnedChests[f.key] && typeof Furni !== 'undefined' && Furni.place) {
          const chestObj = Furni.place('wreck_chest', f.chest.x, f.chest.y, f.chest.z, f.chest.yaw, true);
          if (chestObj) {
            chestObj.ckey = f.key;
            this.spawnedChests[f.key] = chestObj;
            if (this.opened[f.key]) {
              chestObj.lidOpen = true;
              chestObj.chestOpen = true;
              if (chestObj.mesh && chestObj.mesh.userData && chestObj.mesh.userData.lid) {
                chestObj.mesh.userData.lid.rotation.x = (typeof PortChest !== 'undefined') ? PortChest.OPEN_ANGLE : -1.92;
              }
            }
          }
        }
      }
    }

    // Bersihkan objek yang sudah jauh (> 120 blok) untuk menghemat memori
    for (const k in this.spawnedChests) {
      const c = this.spawnedChests[k];
      if (c && Math.hypot(c.x - px, c.z - pz) > 120) {
        if (typeof Furni !== 'undefined' && Furni.remove) Furni.remove(c, false);
        delete this.spawnedChests[k];
      }
    }
    for (const k in this.spawnedWrecks) {
      const w = this.spawnedWrecks[k];
      if (w && Math.hypot(w.x - px, w.z - pz) > 120) {
        if (typeof Furni !== 'undefined' && Furni.remove) Furni.remove(w, false);
        delete this.spawnedWrecks[k];
      }
    }
  },

  /* =========================================================================
     INTERAKSI BUKA PETI HARTA KARUN DUNGEON & SISTEM HADIAH
     ========================================================================= */
  /* Isi peti ke dalam inventory peti (f.inv): Log Pass berkoordinat altar,
     ore & perbekalan kapal. Koin (100-1000) langsung masuk dompet + XP 45
     karena koin adalah angka (RPG.coin), bukan item. Dipanggil sekali saat
     peti pertama kali dibuka. */
  fillChestInv(f) {
    if (!f.inv) f.inv = new Array(CHEST_SLOTS).fill(null);
    const put = (id, n, inst) => {
      if (typeof Furni !== 'undefined' && Furni.chestAdd) Furni.chestAdd(f, id, n, inst);
      else f.inv.push({ id, n });
    };
    const coins = 100 + Math.floor(Math.random() * 901);
    if (typeof RPG !== 'undefined' && RPG.addCoin) RPG.addCoin(coins);
    if (typeof Player !== 'undefined' && Player.addXP) Player.addXP(45);
    /* Peluang 20%: Log Pass berkoordinat Altar Kuno terdekat */
    if (Math.random() < 0.20 && typeof Altar !== 'undefined' && Altar.findNearestAltar) {
      const altarPos = Altar.findNearestAltar(f.x, f.z);
      if (altarPos) {
        put('log_pass', 1, {
          mark: {
            name: 'Altar Kuno',
            x: Math.round(altarPos.x),
            y: Math.round(altarPos.y || CFG.SEA),
            z: Math.round(altarPos.z)
          }
        });
      }
    }
    const rollOre = () => {
      const r = Math.random();
      if (r < 0.10) return { id: 'tungstensteel_ore', n: 1 + (Math.random() < 0.5 ? 1 : 0) };
      else if (r < 0.22) return { id: 'tungsten_ore', n: 1 + Math.floor(Math.random() * 2) };
      else if (r < 0.38) return { id: 'gold_ore', n: 2 + Math.floor(Math.random() * 2) };
      else if (r < 0.56) return { id: 'steel_ore', n: 2 + Math.floor(Math.random() * 3) };
      else if (r < 0.76) return { id: 'iron_ore', n: 3 + Math.floor(Math.random() * 4) };
      else return { id: 'copper_ore', n: 4 + Math.floor(Math.random() * 5) };
    };
    const SHIPWRECK_GOODS = [
      ['potion_hp', 2, 3], ['bread', 3, 5], ['cmeat', 3, 5],
      ['resin', 2, 4], ['fiber', 4, 8], ['iron_ingot', 2, 3], ['gold_ingot', 1, 2]
    ];
    for (let s = 0; s < 3; s++) {
      let item = null;
      if (s < 2 || Math.random() < 0.65) item = rollOre();
      else {
        const g = SHIPWRECK_GOODS[Math.floor(Math.random() * SHIPWRECK_GOODS.length)];
        item = { id: g[0], n: g[1] + Math.floor(Math.random() * (g[2] - g[1] + 1)) };
      }
      if (item && typeof ITEMS !== 'undefined' && ITEMS[item.id]) put(item.id, item.n);
    }
  },
  openChest(f) {
    const key = f.ckey;
    /* Buka pertama kali: isi inventory peti sekali, lalu buka panel inventory
       ala desa — pemain mengambil isinya sesuka hati dari panel. */
    if (!this.opened[key]) {
      this.opened[key] = true;
      this.save();
      if (Math.random() >= 0.20) this.fillChestInv(f);
      /* Efek partikel & suara pembuka pertama */
      if (typeof FX !== 'undefined') {
        if (typeof THREE !== 'undefined') {
          FX.debris(new THREE.Vector3(f.x, f.y + 0.7, f.z), 0xffd76b, 20, 3.8);
        }
        FX.ring(f.x, f.y + 0.1, f.z, 0xffd76b, 1.2, 3.5);
      }
      if (typeof Sfx !== 'undefined') {
        if (Sfx.pickup) Sfx.pickup();
        if (Sfx.levelup) Sfx.levelup();
      }
      if (typeof Player !== 'undefined' && Player.addXP) Player.addXP(45);
    }

    /* Buka tutup peti (animasi engsel belakang ala PortChest) */
    f.lidOpen = true;
    f.chestOpen = true;
    if (f.mesh && f.mesh.userData && f.mesh.userData.lid) {
      f.mesh.userData.lid.rotation.x = (typeof PortChest !== 'undefined') ? PortChest.OPEN_ANGLE : -1.92;
    }

    /* Buka panel inventory peti ala desa */
    if (typeof Furni !== 'undefined' && Furni.openChest) Furni.openChest(f);
  }
};

window.OceanCliffs = OceanCliffs;
