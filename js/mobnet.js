'use strict';
/* =============================================================================
   MOBNET — SINKRONISASI MOB & DROP MULTIPLAYER (HOST-AUTHORITATIVE ENGINE)
   - Host (isHost: true): Menjalankan AI mob liar, spawner, kalkulasi damage/kill.
     Menyiarkan mob_spawn, mob_sync (posisi, HP, rotasi), dan mob_death.
   - Non-Host (klien lain): Spawner lokal dimatikan. Menerima mob dari host
     sebagai entitas tersinkron (m.netMob) yang terdaftar di Monsters.list
     sehingga dapat dilihat, memiliki HP bar, dan dapat diserang.
     Damage non-host diteruskan ke Host lewat mob_damage.
   - Drop item tersinkron: spawn dan pickup diselaraskan di seluruh pemain.
   ============================================================================= */

const MobNet = {
  mobs: new Map(), // netId -> mob instance
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

  sendEntityFx(fx, data) {
    this.send({ type: 'entity_fx', fx, data: data || {} });
  },

  onEntityFx(fx, data) {
    if (!fx || !data) return;
    try {
      if (fx === 'golem_smash') {
        if (typeof FX !== 'undefined') {
          FX.ring(data.x, data.y + 0.05, data.z, 0xff5a35, 0.55, 5.5);
          FX.ring(data.x, data.y + 0.05, data.z, 0xdddddd, 0.4, 3.5);
          if (typeof FX.groundWave === 'function') FX.groundWave(data.x, data.y, data.z, { mode: 'radial', radius: 3.4, color: 0xff5a35 });
          FX.debris(new THREE.Vector3(data.x, data.y + 0.4, data.z), 0x8a8a8a, 22, 4);
          if (FX.addShake) FX.addShake(0.75);
        }
        if (typeof Sfx !== 'undefined' && Sfx.smash) Sfx.smash();
      } else if (fx === 'dragon_fire') {
        if (typeof FX !== 'undefined') {
          FX.ring(data.x, data.y + 0.05, data.z, 0xff5a2a, 0.5, 1.8);
          FX.debris(new THREE.Vector3(data.x, data.y, data.z), 0xff6a30, 8, 2.4);
          if (FX.text) FX.text(new THREE.Vector3(data.x, data.y + 2.2, data.z), '🔥', '#ff7a2e');
        }
      } else if (fx === 'trex_charge') {
        if (typeof FX !== 'undefined' && FX.groundWave) {
          FX.groundWave(data.leftX, data.groundY, data.leftZ, { mode: 'line', dir: data.yaw, radius: 3.4, amp: 0.85, width: 1.2, speed: 7.0, smooth: true });
          FX.groundWave(data.rightSideX, data.groundY, data.rightSideZ, { mode: 'line', dir: data.yaw, radius: 3.4, amp: 0.85, width: 1.2, speed: 7.0, smooth: true });
        }
      } else if (fx === 'kelabang_split') {
        if (typeof FX !== 'undefined') {
          FX.ring(data.x, data.y + 0.1, data.z, 0x8dff3a, 1.2, 5);
          FX.debris(new THREE.Vector3(data.x, data.y + 1, data.z), 0x96332c, 18, 3.5);
        }
        if (typeof Sfx !== 'undefined' && Sfx.hit) Sfx.hit();
      } else if (fx === 'npc_quake') {
        if (typeof FX !== 'undefined') {
          if (typeof FX.groundWave === 'function') FX.groundWave(data.x, data.y, data.z, { mode: 'radial', radius: 3.8, color: 0xb08a5a });
          FX.debris(new THREE.Vector3(data.x, data.y + 0.4, data.z), 0x8a8a8a, 16, 3.2);
        }
        if (typeof Sfx !== 'undefined' && Sfx.smash) Sfx.smash();
      } else if (fx === 'npc_roar') {
        if (typeof FX !== 'undefined') {
          if (FX.shockwave) FX.shockwave(data.x, data.y + 1.45, data.z, 0xffd08a, 6);
          FX.ring(data.x, data.y + 0.05, data.z, 0xffa23c, 0.8, 6);
        }
        if (typeof Sfx !== 'undefined' && Sfx.shout) Sfx.shout();
      } else if (fx === 'npc_spell') {
        if (typeof PortFX !== 'undefined') {
          if (data.type === 'meteor' && PortFX.meteor) PortFX.meteor(data.x, data.y, data.z);
          else if (PortFX.shard) PortFX.shard(data.x, data.y, data.z);
        }
      } else if (fx === 'npc_lich') {
        if (typeof FX !== 'undefined') {
          FX.ring(data.x, data.y + 0.1, data.z, 0xa855f7, 1.2, 4.5);
          FX.debris(new THREE.Vector3(data.x, data.y + 0.5, data.z), 0x7c3aed, 14, 2.5);
        }
      }
    } catch (e) {
      console.warn('[MobNet] onEntityFx error:', e);
    }
  },

  /* Bungkus spawner & handler damage saat sesi MP aktif */
  wrap() {
    if (this._wrapped) return;
    this._wrapped = true;
    if (typeof Monsters === 'undefined') return;

    // 1. Matikan spawner liar lokal pada non-host
    const spawners = ['spawn', 'spawnLizard', 'spawnLivestock'];
    for (const k of spawners) {
      if (typeof Monsters[k] === 'function' && !Monsters[k]._mobnetWrapped) {
        const orig = Monsters[k].bind(Monsters);
        const fn = (...a) => {
          if (this.isMp() && !this.isHost()) return;
          return orig(...a);
        };
        fn._mobnetWrapped = true;
        Monsters[k] = fn;
      }
    }

    // 2. Setiap mob baru yang dibuat host diberi netId & disiarkan
    if (typeof Monsters.make === 'function' && !Monsters.make._mobnetWrapped) {
      const origMake = Monsters.make.bind(Monsters);
      const fn = (type, pos, boss, opts) => {
        const m = origMake(type, pos, boss, opts);
        if (m && this.isMp() && this.isHost() && !m.pet && !m.isFish && !m.netMob && !m.netId) {
          m.netId = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
          this.send({ type: 'mob_spawn', mob: this.serialize(m) });
        }
        return m;
      };
      fn._mobnetWrapped = true;
      Monsters.make = fn;
    }

    // 3. Pukulan pemain lokal pada mob diteruskan ke room
    if (typeof Monsters.hurt === 'function' && !Monsters.hurt._mobnetWrapped) {
      const origHurt = Monsters.hurt.bind(Monsters);
      const fn = (m, dmg, dir, knock, src) => {
        const r = origHurt(m, dmg, dir, knock, src);
        if (m && m.netId && this.isMp() && (!src || src === Player)) {
          this.send({
            type: 'mob_damage',
            netId: m.netId,
            dmg: dmg,
            dir: (dir && dir.x !== undefined) ? [dir.x, dir.y, dir.z] : null,
            kb: knock || 0,
            srcNetId: Network.netId
          });
        }
        return r;
      };
      fn._mobnetWrapped = true;
      Monsters.hurt = fn;
    }

    // 4. Kematian mob liar disiarkan host ke seluruh pemain
    if (typeof Monsters.kill === 'function' && !Monsters.kill._mobnetWrapped) {
      const origKill = Monsters.kill.bind(Monsters);
      const fn = (m) => {
        const hadNet = !!(m && m.netId);
        const pos = m ? [m.pos.x, m.pos.y, m.pos.z] : null;
        const r = origKill(m);
        if (hadNet && this.isMp() && this.isHost()) {
          const rewards = {};
          const tot = m.maxhp || 100;
          if (m.dmgContrib) {
            for (const [pId, d] of Object.entries(m.dmgContrib)) {
              const ratio = Math.min(1, d / tot);
              if (ratio > 0.01) {
                const xp = Math.max(1, Math.round(m.xp * ratio * 0.80));
                rewards[pId] = { xp, ratio };
              }
            }
          }
          this.send({
            type: 'mob_death',
            netId: m.netId,
            pos: pos,
            killerNetId: Network.netId,
            rewards,
            mobType: m.type,
            boss: !!m.boss
          });
          if (m.netId) this.mobs.delete(m.netId);
        }
        return r;
      };
      fn._mobnetWrapped = true;
      Monsters.kill = fn;
    }

    // 5. Drop item disiarkan host dengan dropId unik
    if (typeof FX !== 'undefined' && typeof FX.spawnDrop === 'function' && !FX.spawnDrop._mobnetWrapped) {
      const origDrop = FX.spawnDrop.bind(FX);
      const fn = (pos, id, n, opts) => {
        const r = origDrop(pos, id, n, opts);
        if (this.isMp() && this.isHost() && Array.isArray(FX.drops) && FX.drops.length) {
          const d = FX.drops[FX.drops.length - 1];
          if (d && !d.dropId) {
            d.dropId = 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
            this._knownDrops.add(d.dropId);
            this.send({
              type: 'drop_spawn',
              drop: {
                dropId: d.dropId,
                id: d.id,
                n: d.n,
                pos: [d.mesh.position.x, d.mesh.position.y, d.mesh.position.z]
              }
            });
          }
        }
        return r;
      };
      fn._mobnetWrapped = true;
      FX.spawnDrop = fn;
    }
  },

  serialize(m) {
    return {
      netId: m.netId,
      type: m.type,
      boss: !!m.boss,
      pos: [m.pos.x, m.pos.y, m.pos.z],
      rot: m.mesh ? m.mesh.rotation.y : 0,
      hp: m.hp,
      maxhp: m.maxhp,
      lvl: m.lvl || 1,
      state: m.dead ? 'dead' : (m.state || 'wander')
    };
  },

  /* Snapshot awal saat bergabung ke room */
  onJoinSnapshot(mobs, drops) {
    this.wrap();
    if (!this.isHost()) {
      // Non-host: bersihkan semua mob liar lokal lama, gunakan mob dari host
      if (typeof Monsters !== 'undefined' && Array.isArray(Monsters.list)) {
        for (let i = Monsters.list.length - 1; i >= 0; i--) {
          const m = Monsters.list[i];
          if (m && !m.pet && m.mesh && m.mesh.parent) {
            m.mesh.parent.remove(m.mesh);
          }
        }
        Monsters.list = Monsters.list.filter(m => m && m.pet);
      }
    }
    if (Array.isArray(mobs)) {
      for (const s of mobs) this.onSpawn(s);
    }
    if (Array.isArray(drops)) {
      for (const d of drops) this.onDropSpawn(d);
    }
  },

  /* Sinkronisasi snapshot mob berkala (20Hz dari server) */
  onHostSnapshot(mobs) {
    if (!Array.isArray(mobs) || this.isHost()) return;
    const seen = new Set();
    for (const s of mobs) {
      if (!s || !s.netId) continue;
      seen.add(s.netId);
      let m = this.mobs.get(s.netId);
      if (!m) {
        this.onSpawn(s);
        m = this.mobs.get(s.netId);
      }
      if (m && !m.dead) {
        if (s.pos) m._targetPos = { x: s.pos[0], y: s.pos[1], z: s.pos[2] };
        if (s.rot !== undefined && m.mesh) m._targetYaw = s.rot;
        if (s.hp !== undefined) {
          m.hp = s.hp;
          m.hpT = 6;
        }
        if (s.state) m.state = s.state;
      }
    }

    // Hapus mob remote yang sudah tidak ada di snapshot host
    for (const [id, m] of this.mobs.entries()) {
      if (!seen.has(id)) {
        this.removeRemote(id);
      }
    }
  },

  onHostDropsSnapshot(drops) {
    if (!Array.isArray(drops) || this.isHost()) return;
    for (const d of drops) this.onDropSpawn(d);
  },

  /* Spawn mob remote pada klien non-host */
  onSpawn(s) {
    if (!s || !s.netId || typeof Monsters === 'undefined') return;
    if (this.mobs.has(s.netId)) return;
    if (this.isHost()) return; // Host sudah memiliki entitas aslinya

    try {
      const pos = new THREE.Vector3(s.pos ? s.pos[0] : 0, s.pos ? s.pos[1] : 20, s.pos ? s.pos[2] : 0);
      const m = Monsters.make(s.type || 'slime', pos, !!s.boss);
      if (!m) return;

      m.netId = s.netId;
      m.netMob = true; // Ditandai agar AI lokal dimatikan
      if (s.hp !== undefined) {
        m.hp = s.hp;
        m.maxhp = s.maxhp || s.hp;
      }
      if (s.lvl) m.lvl = s.lvl;
      if (s.rot !== undefined && m.mesh) {
        m.mesh.rotation.y = s.rot;
        m._targetYaw = s.rot;
      }
      m._targetPos = { x: pos.x, y: pos.y, z: pos.z };

      this.mobs.set(s.netId, m);
      // WAJIB: Masukkan ke Monsters.list agar terdeteksi HP bar, auto-aim, dan render
      if (Array.isArray(Monsters.list) && !Monsters.list.includes(m)) {
        Monsters.list.push(m);
      }
    } catch (e) {
      console.warn('[MobNet] onSpawn gagal:', e);
    }
  },

  onSync(list) {
    if (!Array.isArray(list) || this.isHost()) return;
    for (const s of list) {
      if (!s || !s.netId) continue;
      let m = this.mobs.get(s.netId);
      if (!m) {
        this.onSpawn(s);
        m = this.mobs.get(s.netId);
      }
      if (!m || m.dead) continue;
      if (s.pos) m._targetPos = { x: s.pos[0], y: s.pos[1], z: s.pos[2] };
      if (s.rot !== undefined && m.mesh) m._targetYaw = s.rot;
      if (s.hp !== undefined) {
        m.hp = s.hp;
        m.hpT = 6;
      }
      if (s.state) m.state = s.state;
    }
  },

  onDamage(msg) {
    if (!msg || !msg.netId) return;
    const m = this.isHost()
      ? (typeof Monsters !== 'undefined' ? Monsters.list.find(o => o && o.netId === msg.netId) : null)
      : this.mobs.get(msg.netId);

    if (!m || m.dead || m.netApplied === msg.dmg + '|' + msg.srcNetId) return;

    if (this.isHost()) {
      // Host menerapkan damage sungguhan ke mob AI
      const dir = (msg.dir && typeof THREE !== 'undefined')
        ? new THREE.Vector3(msg.dir[0], msg.dir[1], msg.dir[2]) : new THREE.Vector3(0, 0.1, 0);
      Monsters.hurt(m, msg.dmg || 0, dir, msg.kb || 0, { remote: true, netId: msg.srcNetId });
    } else {
      // Non-host: visual efek & audio pukulan lokal
      m.netApplied = msg.dmg + '|' + msg.srcNetId;
      const dir = (msg.dir && typeof THREE !== 'undefined')
        ? new THREE.Vector3(msg.dir[0], msg.dir[1], msg.dir[2]) : new THREE.Vector3(0, 0.1, 0);
      Monsters.hurt(m, msg.dmg || 0, dir, msg.kb || 0, { remote: true, netId: msg.srcNetId });
    }
  },

  onDeath(msg) {
    if (!msg || !msg.netId) return;

    // Bagikan reward EXP proporsional kepada semua pemain yang berkontribusi damage
    if (msg.rewards && typeof Network !== 'undefined' && Network.netId && typeof Player !== 'undefined') {
      const myReward = msg.rewards[Network.netId];
      if (myReward && myReward.xp) {
        Player.addXP(myReward.xp);
        Player.kills = (Player.kills || 0) + 1;
        const pct = Math.round((myReward.ratio || 1) * 100);
        if (typeof FX !== 'undefined' && FX.text && Player.pos) {
          FX.text(Player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${myReward.xp} XP (${pct}% Kontribusi)`, '#8fd4ff');
        }
        if (typeof RPG !== 'undefined' && RPG.onMobKilled) {
          RPG.onMobKilled(msg.mobType || 'monster', !!msg.boss);
        }
        if (typeof Prof !== 'undefined' && Prof.gain) {
          Prof.gain('combat', Math.max(1, Math.round(8 * (myReward.ratio || 1))), 1);
        }
      }
    }

    if (this.isHost()) {
      if (typeof Monsters !== 'undefined') {
        const m = Monsters.list.find(o => o && o.netId === msg.netId);
        if (m && !m.dead) Monsters.kill(m);
      }
      return;
    }

    const m = this.mobs.get(msg.netId);
    if (m && !m.dead) {
      m.dead = true;
      m.deathT = 0;
      this.mobs.delete(msg.netId);
    }
  },

  onDropSpawn(d) {
    if (!d || !d.dropId || typeof FX === 'undefined') return;
    if (this.isHost()) return;
    if (this._knownDrops.has(d.dropId)) return;
    for (const e of (FX.drops || [])) {
      if (e && e.dropId === d.dropId) return;
    }

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

    if (typeof Monsters !== 'undefined' && Array.isArray(Monsters.list)) {
      const i = Monsters.list.indexOf(m);
      if (i >= 0) Monsters.list.splice(i, 1);
    }

    if (m.mesh && Game.scene) {
      Game.scene.remove(m.mesh);
      try {
        m.mesh.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
      } catch (e) {}
    }
  },

  /* Update per frame */
  update(dt) {
    if (!this.isMp()) return;
    this.wrap();
    const now = performance.now();

    if (this.isHost()) {
      // Pastikan semua mob liar lokal memiliki netId & disiarkan
      if (typeof Monsters !== 'undefined' && Array.isArray(Monsters.list)) {
        for (const m of Monsters.list) {
          if (!m || m.dead || m.pet || m.isFish || m.netMob) continue;
          if (!m.netId) {
            m.netId = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
            this.send({ type: 'mob_spawn', mob: this.serialize(m) });
          }
        }
      }

      // Siaran posisi/rotasi/HP mob host 10Hz (tiap 100ms)
      if (now - this._lastSync > 100 && typeof Monsters !== 'undefined') {
        this._lastSync = now;
        const arr = [];
        for (const m of Monsters.list) {
          if (!m || m.dead || m.pet || m.isFish || m.netMob || !m.netId) continue;
          arr.push(this.serialize(m));
        }
        if (arr.length) {
          this.send({ type: 'mob_sync', mobs: arr });
        }
      }

      // Deteksi drop lokal yang dipungut -> siarkan drop_pickup
      if (typeof FX !== 'undefined' && Array.isArray(FX.drops)) {
        const alive = new Set();
        for (const d of FX.drops) {
          if (d && d.dropId) alive.add(d.dropId);
        }
        for (const id of Array.from(this._knownDrops)) {
          if (!alive.has(id) && !this.drops.has(id)) {
            this.send({ type: 'drop_pickup', dropId: id });
          }
        }
        this._knownDrops = alive;
      }
      return;
    }

    // Non-host: lerp boneka remote dengan halus
    for (const m of this.mobs.values()) {
      if (!m || m.dead || !m.mesh) continue;
      if (m._targetPos) {
        const k = Math.min(1, dt * 14);
        m.pos.x += (m._targetPos.x - m.pos.x) * k;
        m.pos.y += (m._targetPos.y - m.pos.y) * k;
        m.pos.z += (m._targetPos.z - m.pos.z) * k;
        m.mesh.position.copy(m.pos);
      }
      if (m._targetYaw !== undefined) {
        let dy = m._targetYaw - m.mesh.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        m.mesh.rotation.y += dy * Math.min(1, dt * 12);
      }
      if (m.flash > 0) m.flash -= dt;
      if (m.hpT > 0) m.hpT -= dt;
    }
  }
};

window.MobNet = MobNet;
