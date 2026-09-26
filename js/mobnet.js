'use strict';
/* =============================================================================
   MOBNET — sinkronisasi mob & drop host-authoritative untuk multiplayer
   - Host (netId terkecil / flag isHost): satu-satunya yang spawn mob liar,
     menjalankan AI, dan menyiarkan posisi/HP berkala.
   - Non-host: mob liar lokal dimatikan; mob tampil sebagai boneka remote
     (m.netMob) yang hanya di-lerp, tetap bisa dipukul (damage diteruskan host).
   - Drop item dunia ikut sinkron (spawn/pickup) agar jarahan terlihat sama.
   ============================================================================= */
const MobNet = {
  mobs: new Map(), // netId -> mob (boneka remote)
  drops: new Map(), // dropId -> info
  _wrapped: false,
  _lastSync: 0,
  _knownDrops: new Set(),

  isMp() {
    return (typeof Game !== 'undefined' && Game.isMultiplayer &&
      typeof Network !== 'undefined' && Network.active);
  },
  isHost() {
    return this.isMp() && !!Network.isHost;
  },
  send(msg) {
    if (!this.isMp() || !Network.ws || Network.ws.readyState !== 1) return;
    try { Network.ws.send(JSON.stringify(msg)); } catch (e) {}
  },

  /* ---- dipanggil sekali saat game MP mulai (dan aman dipanggil ulang) ---- */
  wrap() {
    if (this._wrapped) return;
    this._wrapped = true;
    if (typeof Monsters === 'undefined') return;

    // Non-host: matikan spawner liar lokal (spawn/livestock/lizard)
    const spawners = ['spawn', 'spawnLizard', 'spawnLivestock'];
    for (const k of spawners) {
      if (typeof Monsters[k] === 'function' && !Monsters[k]._mobnetWrapped) {
        const orig = Monsters[k].bind(Monsters);
        const fn = (...a) => { if (this.isMp() && !this.isHost()) return; return orig(...a); };
        fn._mobnetWrapped = true;
        Monsters[k] = fn;
      }
    }

    // Tiap mob lokal baru yang dibuat host langsung disiarkan + diberi netId
    if (typeof Monsters.make === 'function' && !Monsters.make._mobnetWrapped) {
      const origMake = Monsters.make.bind(Monsters);
      const fn = (type, pos, boss, opts) => {
        const m = origMake(type, pos, boss, opts);
        if (m && this.isMp() && this.isHost() && !m.pet && !m.isFish && !m.netMob) {
          m.netId = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
          this.send({ type: 'mob_spawn', mob: this.serialize(m) });
        }
        return m;
      };
      fn._mobnetWrapped = true;
      Monsters.make = fn;
    }

    // Damage lokal diteruskan ke room; kill lokal disiarkan
    if (typeof Monsters.hurt === 'function' && !Monsters.hurt._mobnetWrapped) {
      const origHurt = Monsters.hurt.bind(Monsters);
      const fn = (m, dmg, dir, knock, src) => {
        const r = origHurt(m, dmg, dir, knock, src);
        if (m && m.netId && this.isMp() && (!src || src === Player)) {
          this.send({ type: 'mob_damage', netId: m.netId, dmg: dmg,
            dir: dir ? [dir.x, dir.y, dir.z] : null, kb: knock || 0, srcNetId: Network.netId });
        }
        return r;
      };
      fn._mobnetWrapped = true;
      Monsters.hurt = fn;
    }
    if (typeof Monsters.kill === 'function' && !Monsters.kill._mobnetWrapped) {
      const origKill = Monsters.kill.bind(Monsters);
      const fn = (m) => {
        const hadNet = !!(m && m.netId);
        const pos = m ? [m.pos.x, m.pos.y, m.pos.z] : null;
        const r = origKill(m);
        if (hadNet && this.isMp() && this.isHost()) {
          this.send({ type: 'mob_death', netId: m.netId, pos: pos, killerNetId: Network.netId });
          if (m.netId) this.mobs.delete(m.netId);
        }
        return r;
      };
      fn._mobnetWrapped = true;
      Monsters.kill = fn;
    }

    // Drop lokal disiarkan host; beri dropId unik
    if (typeof FX !== 'undefined' && typeof FX.spawnDrop === 'function' && !FX.spawnDrop._mobnetWrapped) {
      const origDrop = FX.spawnDrop.bind(FX);
      const fn = (pos, id, n, opts) => {
        const r = origDrop(pos, id, n, opts);
        if (this.isMp() && this.isHost() && Array.isArray(FX.drops) && FX.drops.length) {
          const d = FX.drops[FX.drops.length - 1];
          if (d && !d.dropId) {
            d.dropId = 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
            this._knownDrops.add(d.dropId);
            this.send({ type: 'drop_spawn', drop: { dropId: d.dropId, id: d.id, n: d.n,
              pos: [d.mesh.position.x, d.mesh.position.y, d.mesh.position.z] } });
          }
        }
        return r;
      };
      fn._mobnetWrapped = true;
      FX.spawnDrop = fn;
    }
  },

  serialize(m) {
    return { netId: m.netId, type: m.type, boss: !!m.boss,
      pos: [m.pos.x, m.pos.y, m.pos.z], rot: m.mesh ? m.mesh.rotation.y : 0,
      hp: m.hp, maxhp: m.maxhp, lvl: m.lvl || 1, state: m.dead ? 'dead' : 'chase' };
  },

  /* ---- snapshot awal saat join ---- */
  onJoinSnapshot(mobs, drops) {
    this.wrap();
    // Hapus mob liar lokal: dunia MP memakai mob milik host
    if (typeof Monsters !== 'undefined' && Array.isArray(Monsters.list)) {
      for (let i = Monsters.list.length - 1; i >= 0; i--) {
        const m = Monsters.list[i];
        if (m && !m.pet && !m.isFish && !m.netMob && Game.scene && m.mesh) {
          Game.scene.remove(m.mesh);
          Monsters.list.splice(i, 1);
        }
      }
    }
    if (Array.isArray(mobs)) for (const s of mobs) this.onSpawn(s);
    if (Array.isArray(drops)) for (const d of drops) this.onDropSpawn(d);
  },
  onHostSnapshot(mobs) {
    if (!Array.isArray(mobs)) return;
    const seen = new Set();
    for (const s of mobs) {
      if (!s || !s.netId) continue;
      seen.add(s.netId);
      const m = this.mobs.get(s.netId);
      if (m && !m.dead) {
        if (s.pos) m._targetPos = { x: s.pos[0], y: s.pos[1], z: s.pos[2] };
        if (s.rot !== undefined && m.mesh) m._targetYaw = s.rot;
        if (s.hp !== undefined) { m.hp = s.hp; m.hpT = 6; }
      } else if (!m) {
        this.onSpawn(s);
      }
    }
    // Mob yang hilang dari snapshot host = sudah mati/despawn
    for (const [id, m] of this.mobs) {
      if (!seen.has(id)) this.removeRemote(id);
    }
  },

  /* ---- handler pesan server ---- */
  onSpawn(s) {
    if (!s || !s.netId || typeof Monsters === 'undefined') return;
    if (this.mobs.has(s.netId)) return;
    if (this.isHost()) return; // host sudah punya yang asli
    try {
      const pos = new THREE.Vector3(s.pos ? s.pos[0] : 0, s.pos ? s.pos[1] : 20, s.pos ? s.pos[2] : 0);
      const m = Monsters.make(s.type || 'slime', pos, !!s.boss);
      if (!m) return;
      m.netId = s.netId;
      m.netMob = true; // boneka remote: AI lokal dimatikan
      if (s.hp !== undefined) { m.hp = s.hp; m.maxhp = s.maxhp || s.hp; }
      if (s.lvl) m.lvl = s.lvl;
      if (s.rot !== undefined && m.mesh) { m.mesh.rotation.y = s.rot; m._targetYaw = s.rot; }
      m._targetPos = { x: pos.x, y: pos.y, z: pos.z };
      this.mobs.set(s.netId, m);
    } catch (e) {}
  },
  onSync(list) {
    if (!Array.isArray(list)) return;
    for (const s of list) {
      if (!s || !s.netId) continue;
      const m = this.mobs.get(s.netId);
      if (!m || m.dead) continue;
      if (s.pos) m._targetPos = { x: s.pos[0], y: s.pos[1], z: s.pos[2] };
      if (s.rot !== undefined) m._targetYaw = s.rot;
      if (s.hp !== undefined) { m.hp = s.hp; m.hpT = 6; }
      if (s.state) m.state = s.state;
    }
  },
  onDamage(msg) {
    if (!msg || !msg.netId) return;
    // Host mengabaikan gema sendiri; non-host menerapkan damage visual
    const m = this.isHost()
      ? (typeof Monsters !== 'undefined' ? Monsters.list.find(o => o && o.netId === msg.netId) : null)
      : this.mobs.get(msg.netId);
    if (!m || m.dead || m.netApplied === msg.dmg + '|' + msg.srcNetId) return;
    if (!this.isHost()) {
      m.netApplied = msg.dmg + '|' + msg.srcNetId;
      const dir = (msg.dir && typeof THREE !== 'undefined')
        ? new THREE.Vector3(msg.dir[0], msg.dir[1], msg.dir[2]) : new THREE.Vector3(0, 0.1, 0);
      Monsters.hurt(m, msg.dmg || 0, dir, msg.kb || 0, { remote: true, netId: msg.srcNetId });
    }
  },
  onDeath(msg) {
    if (!msg || !msg.netId) return;
    if (this.isHost()) {
      // Pemain lain yang membunuh: hapus mob lokal, beri XP bila ikut kontribusi
      if (typeof Monsters !== 'undefined') {
        const m = Monsters.list.find(o => o && o.netId === msg.netId);
        if (m && !m.dead) Monsters.kill(m);
      }
      return;
    }
    const m = this.mobs.get(msg.netId);
    if (m && !m.dead && typeof Monsters !== 'undefined') {
      // Jangan panggil kill() (akan ganda XP/loot): animasi mati lokal saja
      m.dead = true; m.deathT = 0;
      this.mobs.delete(msg.netId);
    }
  },
  onDropSpawn(d) {
    if (!d || !d.dropId || typeof FX === 'undefined') return;
    if (this.isHost()) return;
    if (this._knownDrops.has(d.dropId)) return;
    for (const e of (FX.drops || [])) if (e && e.dropId === d.dropId) return;
    const pos = new THREE.Vector3(d.pos ? d.pos[0] : 0, d.pos ? d.pos[1] : 20, d.pos ? d.pos[2] : 0);
    FX.spawnDrop(pos, d.id, d.n);
    if (Array.isArray(FX.drops) && FX.drops.length) {
      FX.drops[FX.drops.length - 1].dropId = d.dropId;
      this._knownDrops.add(d.dropId);
    }
  },
  onDropPickup(msg) {
    if (!msg || !msg.dropId || typeof FX === 'undefined' || !Array.isArray(FX.drops)) return;
    if (msg.netId === Network.netId) return;
    for (let i = FX.drops.length - 1; i >= 0; i--) {
      if (FX.drops[i] && FX.drops[i].dropId === msg.dropId) {
        FX.disposeDrop(FX.drops[i].mesh, FX.drops[i].isModel);
        FX.drops.splice(i, 1);
        break;
      }
    }
    this._knownDrops.delete(msg.dropId);
  },
  removeRemote(netId) {
    const m = this.mobs.get(netId);
    if (!m) return;
    this.mobs.delete(netId);
    if (typeof Monsters !== 'undefined') {
      const i = Monsters.list.indexOf(m);
      if (i >= 0) Monsters.list.splice(i, 1);
    }
    if (m.mesh && Game.scene) {
      Game.scene.remove(m.mesh);
      try { m.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } catch (e) {}
    }
  },

  /* ---- dipanggil tiap frame dari Network.update ---- */
  update(dt) {
    if (!this.isMp()) return;
    this.wrap();
    const now = performance.now();
    if (this.isHost()) {
      // Siaran posisi/HP mob milik host 5Hz
      if (now - this._lastSync > 200 && typeof Monsters !== 'undefined') {
        this._lastSync = now;
        const arr = [];
        for (const m of Monsters.list) {
          if (!m || m.dead || m.pet || m.isFish || m.netMob || !m.netId) continue;
          arr.push(this.serialize(m));
        }
        if (arr.length) this.send({ type: 'mob_sync', mobs: arr });
      }
      // Deteksi drop lokal yang dipungut -> siarkan drop_pickup
      if (typeof FX !== 'undefined' && Array.isArray(FX.drops)) {
        const alive = new Set();
        for (const d of FX.drops) if (d && d.dropId) alive.add(d.dropId);
        for (const id of Array.from(this._knownDrops)) {
          if (!alive.has(id) && !this.drops.has(id)) {
            this.send({ type: 'drop_pickup', dropId: id });
          }
        }
        this._knownDrops = alive;
      }
      return;
    }
    // Non-host: lerp boneka remote, lewati AI lokal
    for (const m of this.mobs.values()) {
      if (!m || m.dead || !m.mesh) continue;
      if (m._targetPos) {
        const k = Math.min(1, dt * 10);
        m.pos.x += (m._targetPos.x - m.pos.x) * k;
        m.pos.y += (m._targetPos.y - m.pos.y) * k;
        m.pos.z += (m._targetPos.z - m.pos.z) * k;
        m.mesh.position.copy(m.pos);
      }
      if (m._targetYaw !== undefined) {
        let dy = m._targetYaw - m.mesh.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        m.mesh.rotation.y += dy * Math.min(1, dt * 8);
      }
      if (m.flash > 0) m.flash -= dt;
      if (m.hpT > 0) m.hpT -= dt;
    }
  }
};
window.MobNet = MobNet;
