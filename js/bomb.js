'use strict';
/* =============================================================================
   BOM HITAM VOXEL (VOXEL BLACK BOMB) — bahan peledak lempar taktis
   -----------------------------------------------------------------------------
   - Model 3D: Voxel chunky berlapis (gaya voxel Forecraft yang solid & berkarakter,
     bukan bola biasa dan bukan balok TNT polos).
   - Jarak lempar: 2 blok di depan pemain.
   - Animasi lempar: Parabola terbang melambung halus (smooth trajectory) dengan
     putaran tumbling di udara, lalu menempel erat di blok sasaran.
   - Sumbu menyala terbakar bertahap (animasi bara api & percikan partikel).
   - Ledakan radius 4 blok (bola 3D):
     * Menghancurkan blok dan menjatuhkan blok bangunan (mode build).
     * HORMATI LEVEL ORE: Ore yang level Mining-nya di atas pemain tidak akan
       hancur, dan blok fondasi tepat di bawah ore terlindungi agar tidak melayang.
     * Melukai monster liar (80 damage + knockback kuat).
     * Pemain, rekan tim NPC, pet, dan bangunan pemain sepenuhnya aman.
   ============================================================================= */

const BombSys = {
  list: [],
  MAX_RANGE: 2.0,   // Tepat 2 blok di depan pemain sesuai permintaan
  BLAST_R: 4,       // Radius ledakan 4 blok
  FUSE_T: 2.2,      // Sumbu menyala 2.2 detik setelah menempel
  FLY_DUR: 0.36,    // Durasi terbang parabola melambung (0.36 detik)
  MOB_DMG: 80,      // Damage ke mob liar

  /* Material palette cache untuk model voxel bom */
  _mats: null,
  getMats() {
    if (!this._mats) {
      const M = c => new THREE.MeshLambertMaterial({ color: c });
      this._mats = {
        ironCore: M(0x181a1d),
        ironDark: M(0x101114),
        ironLight: M(0x2d3238),
        brassCap: M(0xb38634),
        fuseRope: M(0x735738),
        spark: new THREE.MeshBasicMaterial({ color: 0xffaa33 }),
        sparkCore: new THREE.MeshBasicMaterial({ color: 0xffffff })
      };
    }
    return this._mats;
  },

  /* Membangun model bom voxel 3D utuh */
  buildVoxelBomb() {
    const g = new THREE.Group();
    const M = this.getMats();
    const box = (w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      if (rx || ry || rz) m.rotation.set(rx, ry, rz);
      m.castShadow = !IS_MOBILE;
      g.add(m);
      return m;
    };

    // 1. Badan Utama Voxel (Kombinasi balok berundak membentuk siluet bom voxel padat)
    box(0.34, 0.34, 0.34, M.ironCore, 0, 0, 0);
    box(0.38, 0.26, 0.26, M.ironDark, 0, 0, 0);
    box(0.26, 0.38, 0.26, M.ironDark, 0, 0, 0);
    box(0.26, 0.26, 0.38, M.ironDark, 0, 0, 0);
    // Plat sudut penguat besi
    box(0.32, 0.32, 0.32, M.ironLight, 0, 0, 0);

    // 2. Leher & Kerah Kuningan (Brass Collar)
    box(0.14, 0.08, 0.14, M.brassCap, 0, 0.20, 0);
    box(0.18, 0.03, 0.18, M.brassCap, 0, 0.23, 0);

    // 3. Sumbu Voxel Bertingkat (Curved Voxel Fuse)
    const fuseG = new THREE.Group();
    fuseG.position.set(0, 0.24, 0);
    g.add(fuseG);
    box(0.04, 0.08, 0.04, M.fuseRope, 0, 0.04, 0);
    box(0.04, 0.06, 0.04, M.fuseRope, 0.02, 0.09, 0.02, 0.2, 0, 0.3);
    box(0.035, 0.06, 0.035, M.fuseRope, 0.05, 0.13, 0.05, 0.3, 0, 0.5);

    // 4. Bara Api Sumbu (Spark / Ember)
    const sparkG = new THREE.Group();
    sparkG.position.set(0.07, 0.16, 0.06);
    fuseG.add(sparkG);
    const sparkMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), M.spark);
    const sparkCore = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), M.sparkCore);
    sparkG.add(sparkMesh);
    sparkG.add(sparkCore);

    // 5. Cahaya Bara Api Berkedip (Point Light)
    const light = new THREE.PointLight(0xff7722, 0.8, 4, 2);
    light.position.set(0.07, 0.40, 0.06);
    g.add(light);

    g.userData.sparkG = sparkG;
    g.userData.light = light;
    return g;
  },

  /* ---------- LEMPAR BOM DARI HOTBAR ---------- */
  throwBomb() {
    const s = RPG.hotbar[RPG.sel];
    if (!s || s.id !== 'bomb') return false;
    if (Player.dead) return false;
    if (typeof Capture !== 'undefined' && (Capture.riding || Capture.active)) return false;

    // Arah hadap pemain
    const yaw = Player.facing;
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    const sx = Player.pos.x, sy = Player.pos.y + 1.1, sz = Player.pos.z;

    // Target lempar tepat 2 blok di depan
    const range = this.MAX_RANGE;
    let hx = null, hy = null, hz = null;

    // Raycast pendek mendeteksi dinding/blok penghalang dalam radius 2 blok
    for (let step = 0.3; step <= range; step += 0.2) {
      const tx = sx + dx * step;
      const ty = sy - 0.1 * step;
      const tz = sz + dz * step;
      const bx = Math.floor(tx), by = Math.floor(ty), bz = Math.floor(tz);
      const blk = World.getBlock(bx, by, bz);
      if (blk !== B.AIR && blk !== B.WATER) {
        hx = tx; hy = ty; hz = tz;
        break;
      }
    }

    // Jika tidak ada dinding penghalang di depan, mendarat di permukaan lantai tepat 2 blok di depan
    if (hx === null) {
      hx = sx + dx * range;
      hz = sz + dz * range;
      let gy = Player.pos.y;
      if (typeof World !== 'undefined' && World.groundAt) {
        const inCave = (typeof World.inDungeonCave === 'function')
          ? World.inDungeonCave(Math.floor(hx), Math.floor(Player.pos.y) + 1, Math.floor(hz)) : null;
        if (inCave && typeof Dungeon !== 'undefined' && Dungeon.innerFloorY) {
          gy = Dungeon.innerFloorY(hx, hz, Player.pos.y + 2);
        } else {
          gy = World.groundAt(hx, hz, Player.pos.y + 2) || World.groundAt(hx, hz) || Player.pos.y;
        }
      }
      hy = gy;
    }

    // Konsumsi 1 item dari hotbar
    s.n--;
    if (s.n <= 0) RPG.hotbar[RPG.sel] = null;
    UI.renderHotbar();
    if (typeof UI.markInvDirty === 'function') UI.markInvDirty();

    // Buat objek bom voxel
    const mesh = this.buildVoxelBomb();
    mesh.position.set(sx, sy, sz);
    Game.scene.add(mesh);

    // Data lemparan
    const bombEntry = {
      mesh,
      state: 'flying', // 'flying' -> 'stuck' -> 'exploded'
      t: 0,
      flyDur: this.FLY_DUR,
      fuseT: this.FUSE_T,
      sx, sy, sz,
      tx: hx, ty: hy + 0.18, tz: hz,
      rotSpeedX: 9.0 + Math.random() * 4,
      rotSpeedY: 6.0 + Math.random() * 3
    };

    this.list.push(bombEntry);

    // Efek suara ayunan lempar
    if (typeof Sfx !== 'undefined' && Sfx.swing) Sfx.swing(0);
    UI.toast('💣 Melempar Bom!');
    return true;
  },

  /* ---------- UPDATE LOOP TIAP FRAME ---------- */
  update(dt) {
    if (!this.list.length) return;

    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.t += dt;

      // 1. FASE TERBANG PARABOLA HALUS
      if (b.state === 'flying') {
        const p = Math.min(1, b.t / b.flyDur);
        const smoothP = p * p * (3 - 2 * p); // Smoothstep curve

        // Posisi X, Z lerp linear halus
        const curX = b.sx + (b.tx - b.sx) * p;
        const curZ = b.sz + (b.tz - b.sz) * p;

        // Lengkungan parabola vertikal (busur lemparan 0.65 blok)
        const arc = Math.sin(p * Math.PI) * 0.65;
        const curY = b.sy + (b.ty - b.sy) * smoothP + arc;

        b.mesh.position.set(curX, curY, curZ);

        // Putaran tumbling melayang di udara
        b.mesh.rotation.x += b.rotSpeedX * dt;
        b.mesh.rotation.y += b.rotSpeedY * dt;

        // Tiba di titik sasaran -> menempel
        if (p >= 1) {
          b.state = 'stuck';
          b.t = 0; // Reset waktu untuk hitung mundur sumbu
          b.mesh.position.set(b.tx, b.ty, b.tz);
          b.mesh.rotation.set(0, 0, 0); // Tegak menempel

          // Partikel debu kecil saat menempel
          if (typeof FX !== 'undefined' && FX.debris) {
            FX.debris(new THREE.Vector3(b.tx, b.ty, b.tz), 0x8a7f72, 4, 1.2);
          }
          if (typeof Sfx !== 'undefined' && Sfx.rock) Sfx.rock();
        }
      }
      // 2. FASE MENEMPEL & SUMBU TERBAKAR
      else if (b.state === 'stuck') {
        const k = Math.min(1, b.t / b.fuseT);

        // Animasi bara api membesar dan berkedip tegang
        const spark = b.mesh.userData.sparkG;
        const light = b.mesh.userData.light;
        const flick = 1 + Math.sin(b.t * 36) * 0.35 + k * 1.8;

        if (spark) {
          spark.scale.setScalar(flick);
          // Bergeser dari oranye ke merah menyala
          const coreMesh = spark.children[0];
          if (coreMesh && coreMesh.material) {
            coreMesh.material.color.setHSL(0.09 - k * 0.07, 1.0, 0.55 + k * 0.15);
          }
        }
        if (light) {
          light.intensity = 0.8 + k * 2.5 + Math.sin(b.t * 45) * 0.6;
        }

        // Percikan bara melompat sesekali
        if (Math.random() < dt * (10 + k * 24) && typeof FX !== 'undefined') {
          const sPos = b.mesh.position.clone().add(new THREE.Vector3(0, 0.25, 0));
          FX.debris(sPos, Math.random() < 0.5 ? 0xffaa22 : 0xff4411, 1, 1.4);
        }

        // Waktu sumbu habis -> MELEDAK
        if (b.t >= b.fuseT) {
          this.explode(b);
          Game.scene.remove(b.mesh);
          b.mesh.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
          });
          this.list.splice(i, 1);
        }
      }
    }
  },

  /* ---------- EKSEKUSI LEDAKAN ---------- */
  explode(b) {
    const cx = b.tx, cy = b.ty, cz = b.tz;

    // 1. Suara ledakan & getar layar
    if (typeof Sfx !== 'undefined' && Sfx.smash) Sfx.smash();
    if (typeof FX !== 'undefined') {
      FX.addShake(1.0);
      FX.ring(cx, cy + 0.1, cz, 0xff5a2e, 0.8, 7.5);
      FX.ring(cx, cy + 0.1, cz, 0xffd24d, 0.5, 5.0);
      FX.impact(new THREE.Vector3(cx, cy + 0.5, cz), 0xff7a2e, 3.2);
      FX.debris(new THREE.Vector3(cx, cy + 0.5, cz), 0x222226, 26, 5.2);
      FX.debris(new THREE.Vector3(cx, cy + 0.8, cz), 0xffb33c, 22, 4.5);
      FX.debris(new THREE.Vector3(cx, cy + 0.3, cz), 0x8a8f98, 18, 4.0);
      if (typeof FX.groundWave === 'function') {
        FX.groundWave(cx, cy, cz, { mode: 'radial', radius: 3.5, color: 0xff5a35 });
      }
      if (typeof PortFX !== 'undefined' && PortFX.spark) {
        PortFX.spark(cx, cy + 0.6, cz, 28, 0xffd24d, 12);
      }
    }

    // 2. HORMATI LEVEL ORE & LINDUNGI BLOK DI BAWAH ORE
    const mLv = (typeof Prof !== 'undefined') ? Prof.level('mining') : 1;
    const locked = new Set();
    let lockedCount = 0, lockedReq = 0;
    const R = this.BLAST_R;
    const bx = Math.floor(cx), by = Math.floor(cy), bz = Math.floor(cz);
    const inBall = (dx, dy, dz) => Math.sqrt(dx * dx + dy * dy + dz * dz) <= R + 0.4;

    for (let dy = -R; dy <= R; dy++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          if (!inBall(dx, dy, dz)) continue;
          const wx = bx + dx, wy = by + dy, wz = bz + dz;
          if (wy < 1) continue;
          const id = World.getBlock(wx, wy, wz);
          const oreDef = (typeof ORE_INFO !== 'undefined') ? ORE_INFO[id] : null;
          if (oreDef && mLv < oreDef.req) {
            locked.add(wx + ',' + wy + ',' + wz);
            locked.add(wx + ',' + (wy - 1) + ',' + wz); // Fondasi tepat di bawah ore kebal!
            lockedCount++;
            lockedReq = Math.max(lockedReq, oreDef.req);
          }
        }
      }
    }

    if (lockedCount > 0) {
      if (typeof Sfx !== 'undefined' && Sfx.noStamina) Sfx.noStamina();
      if (typeof FX !== 'undefined' && FX.text) {
        FX.text(new THREE.Vector3(cx, cy + 1.6, cz),
          `🔒 ${lockedCount} bongkahan terlalu keras (Mining Lv ${lockedReq})`, '#ff9d8a');
      }
    }

    // 3. HANCURKAN BLOK RADIUS 4 (BOLA 3D) & JATUHKAN DROP MODE BUILD
    for (let dy = -R; dy <= R; dy++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          if (!inBall(dx, dy, dz)) continue;
          const wx = bx + dx, wy = by + dy, wz = bz + dz;
          if (wy < 1) continue;
          if (locked.has(wx + ',' + wy + ',' + wz)) continue; // Ore & fondasinya terlindungi
          const id = World.getBlock(wx, wy, wz);
          if (id === B.AIR || id === B.WATER) continue;

          // Rumah pemain, blok bangunan pemain & furnitur kebal ledakan
          if (typeof Furni !== 'undefined' && Furni.houses && Furni.houses.length
            && Furni.houseNear && Furni.houseNear({ x: wx, z: wz })) continue;
          if (typeof BuildSys !== 'undefined' && BuildSys.customBlocks
            && BuildSys.customBlocks[wx + ',' + wy + ',' + wz]) continue;

          World.breakBlock(wx, wy, wz);
        }
      }
    }

    // 4. DAMAGE KE MONSTER LIAR DI RADIUS LEDAKAN (80 DAMAGE)
    if (typeof Monsters !== 'undefined') {
      for (const m of Monsters.list) {
        if (m.dead || m.pet || m.catchActive) continue;
        if (Monsters.isAnimal && Monsters.isAnimal(m)) continue;
        const d = Math.hypot(m.pos.x - cx, m.pos.z - cz);
        if (d > R + (m.r || 0.5)) continue;
        if (Math.abs((m.pos.y + 0.9) - cy) > 2.5) continue;
        const dir = new THREE.Vector3(m.pos.x - cx, 0.5, m.pos.z - cz).normalize();
        Monsters.hurt(m, this.MOB_DMG, dir, 9, Player);
      }
    }

    UI.toast('💥 DUAR! Radius 4 blok meledak.');
  }
};

window.BombSys = BombSys;
