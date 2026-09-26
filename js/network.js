'use strict';
/**
 * =============================================================================
 * FORECRAFT ONLINE - CLIENT MULTIPLAYER NETWORK MODULE (MMORPG ENGINE)
 * File: js/network.js
 * 
 * Mengelola koneksi WebSocket realtime ke Dedicated Local Server:
 *  - Sinkronisasi pergerakan 20Hz (posisi, rotasi, animasi kaki/tangan)
 *  - Rendering avatar 3D pemain lain (Remote Player) lengkap dengan Nameplate & HP Bar
 *  - Sinkronisasi modifikasi blok dunia (World Diffs) realtime antar pemain
 *  - Sinkronisasi chat multiplayer & bubble chat di atas kepala
 *  - Database Server-Authoritative: Simpan ke server (terpisah 100% dari Single Player)
 * =============================================================================
 */

class RemotePlayer {
  constructor(data) {
    this.netId = data.netId;
    this.name = data.name || 'Player';
    this.level = data.level || 1;
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || 100;
    this.hairStyle = data.hairStyle || 4;
    this.hairColor = data.hairColor || 0x2c1f14;

    this.pos = new THREE.Vector3(data.pos ? data.pos[0] : 0, data.pos ? data.pos[1] : 20, data.pos ? data.pos[2] : 0);
    this.targetPos = this.pos.clone();
    this.yaw = data.rot ? data.rot[0] : 0;
    this.targetYaw = this.yaw;

    this.moving = false;
    this.running = false;
    this.inWater = false;
    this.walkT = 0;

    this.mesh = null;
    this.parts = {};
    this.animator = null;
    this.nameplate = null;

    this.buildModel();
    this.buildNameplate();

    if (this.mesh && typeof Game !== 'undefined' && Game.scene) {
      Game.scene.add(this.mesh);
    }
  }

  buildModel() {
    try {
      if (typeof PlayerModelBuilder !== 'undefined' && PlayerModelBuilder.build) {
        // Buat instance model Ranger
        this.mesh = PlayerModelBuilder.build();
        this.parts = this.mesh.userData.parts || {};
        if (PlayerModelBuilder.setHair && this.parts.hairG) {
          PlayerModelBuilder.setHair(this.hairStyle, this.hairColor, this.parts);
        }
      } else {
        // Fallback model voxel jika builder belum siap
        this.mesh = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(0.5, 1.2, 0.3);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a6073 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.6;
        this.mesh.add(bodyMesh);

        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xe8bd92 });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.y = 1.4;
        this.mesh.add(headMesh);
      }

      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = this.yaw;

      if (typeof PlayerAnimator !== 'undefined') {
        this.animator = new PlayerAnimator(this.parts);
        this.animator.setAnimation('idle');
      }
    } catch (e) {
      console.error('[RemotePlayer] Gagal membangun model 3D:', e);
    }
  }

  buildNameplate() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    this.nameplateCanvas = canvas;
    this.nameplateCtx = ctx;

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.6, 1);
    sprite.position.set(0, 2.2, 0);

    this.nameplate = sprite;
    this.nameplateTexture = texture;
    this.updateNameplateVisual();

    if (this.mesh) {
      this.mesh.add(sprite);
    }
  }

  updateNameplateVisual() {
    if (!this.nameplateCtx) return;
    const ctx = this.nameplateCtx;
    const w = this.nameplateCanvas.width;
    const h = this.nameplateCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background semi transparan rounded
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(10, 6, w - 20, h - 12, 10);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Teks Nama & Level
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[Lv.${this.level}] ${this.name}`, w / 2, 24);

    // HP Bar
    const hpRatio = Math.max(0, Math.min(1, this.hp / (this.maxHp || 100)));
    const barW = w - 40;
    const barH = 10;
    const barX = 20;
    const barY = 42;

    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : (hpRatio > 0.25 ? '#ff9800' : '#f44336');
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    if (this.nameplateTexture) {
      this.nameplateTexture.needsUpdate = true;
    }
  }

  setTargetPos(pos, rot, moving, running, inWater) {
    if (Array.isArray(pos) && pos.length === 3) {
      // Jika jarak terlalu jauh (teleport/respawn), langsung snap tanpa lerp
      const distSq = (pos[0] - this.pos.x) ** 2 + (pos[1] - this.pos.y) ** 2 + (pos[2] - this.pos.z) ** 2;
      if (distSq > 100) {
        this.pos.set(pos[0], pos[1], pos[2]);
      }
      this.targetPos.set(pos[0], pos[1], pos[2]);
    }
    if (Array.isArray(rot)) {
      this.targetYaw = rot[0];
    }
    this.setMoving(!!moving);
    this.running = !!running;
    this.inWater = !!inWater;
  }

  setMoving(moving) {
    this.moving = !!moving;
    if (!this.moving) {
      this.walkT = 0;
      if (this.parts && this.parts.legL) {
        this.parts.legL.rotation.set(0, 0, 0);
        if (this.parts.legL.userData && this.parts.legL.userData.shin) this.parts.legL.userData.shin.rotation.set(0, 0, 0);
      }
      if (this.parts && this.parts.legR) {
        this.parts.legR.rotation.set(0, 0, 0);
        if (this.parts.legR.userData && this.parts.legR.userData.shin) this.parts.legR.userData.shin.rotation.set(0, 0, 0);
      }
      if (this.parts && this.parts.armL) this.parts.armL.rotation.x = 0;
      if (this.parts && this.parts.armR) this.parts.armR.rotation.x = 0;
      if (this.animator && !(this.animator.currentAnim || '').startsWith('combo')) {
        this.animator.setAnimation('idle');
      }
    }
  }

  setEquip(heldId, weaponId) {
    const key = (weaponId || '') + '|' + (heldId || '');
    if (key === this._equipKey) return;
    this._equipKey = key;
    this._heldId = heldId;
    this._weaponId = weaponId;

    try {
      if (!this.parts || !this.parts.armR) return;
      const fore = this.parts.armR.userData ? this.parts.armR.userData.fore : null;
      if (!fore) return;

      // Bersihkan model senjata & held item lama dari tangan kanan
      for (let i = fore.children.length - 1; i >= 0; i--) {
        const c = fore.children[i];
        if (c.name && (c.name.startsWith('Weapon_') || c.name.startsWith('Sword_') || c.name.startsWith('Held_'))) {
          fore.remove(c);
          c.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material && !(o.material.userData && o.material.userData.heldShared)) o.material.dispose();
          });
        }
      }

      this.parts.sword = null;
      if (this.animator) this.animator.sword = null;

      const effectiveWeapon = weaponId || (heldId && (heldId.startsWith('sword_') || (typeof ITEMS !== 'undefined' && ITEMS[heldId] && ITEMS[heldId].weapon)) ? heldId : null);

      let mesh = null;
      if (effectiveWeapon && typeof WeaponManager !== 'undefined' && WeaponManager.buildWeapon) {
        mesh = WeaponManager.buildWeapon(effectiveWeapon);
        // Normalisasi orientasi pedang di tangan agar bilah menghadap ke depan
        mesh.position.set(0, -0.29, 0.02);
        mesh.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      } else if (heldId && typeof HeldModels !== 'undefined' && HeldModels.build) {
        mesh = HeldModels.build(heldId);
        const hold = mesh.userData.hold || {};
        const hp = hold.pos || [0, -0.29, 0.02];
        const hr = hold.rot || [Math.PI / 2, 0, 0];
        mesh.position.set(hp[0], hp[1], hp[2]);
        mesh.rotation.set(hr[0], hr[1], hr[2]);
        if (hold.scale) mesh.scale.setScalar(hold.scale);
      }

      if (mesh) {
        fore.add(mesh);
        this.parts.sword = mesh;
        if (this.animator) this.animator.sword = mesh;
      }
    } catch (e) {
      console.warn('[RemotePlayer] Gagal pasang equip:', e);
    }
  }

  playAttack(combo) {
    const c = combo || 1;
    if (this.animator) {
      const animName = 'combo' + Math.min(5, Math.max(1, c));
      this.animator.playOnce(animName, 1.0, () => {
        if (this.animator) {
          const nextAnim = this.moving ? (this.running ? 'sprint' : 'walk') : 'idle';
          this.animator.setAnimation(nextAnim);
        }
      });
    }

    // Audio ayunan senjata
    if (typeof Sfx !== 'undefined') {
      if (this.parts && this.parts.sword && Sfx.swing) {
        Sfx.swing(Math.max(0, c - 1));
      } else if (Sfx.punch) {
        Sfx.punch(Math.max(0, c - 1));
      }
    }

    // Efek visual tebasan (slash trail VFX)
    try {
      if (typeof FX !== 'undefined' && typeof THREE !== 'undefined') {
        const fxPos = new THREE.Vector3();
        if (this.parts && this.parts.sword) {
          this.parts.sword.getWorldPosition(fxPos);
        } else {
          fxPos.copy(this.pos).add(new THREE.Vector3(0, 1.1, 0));
        }

        if (this.parts && this.parts.sword && FX.trail) {
          const vert = (typeof COMBOS !== 'undefined' && COMBOS[c - 1]) ? COMBOS[c - 1].vert : false;
          FX.trail(fxPos, this.yaw, vert, Math.max(0, c - 1));
        } else if (FX.punch) {
          FX.punch(fxPos, this.yaw, Math.max(0, c - 1));
        }
      }
    } catch (e) {}
  }

  update(dt) {
    if (!this.mesh) return;

    // Deteksi jika blok di bawah hancur, turunkan posisi tanah remote player
    if (typeof World !== 'undefined' && World.groundAt) {
      const groundH = World.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6);
      if (this.targetPos.y > groundH && !this.inWater && !this.moving) {
        this.targetPos.y = groundH;
      }
    }

    // Smooth position interpolation (lerp)
    this.pos.lerp(this.targetPos, Math.min(dt * 14, 1.0));
    this.mesh.position.copy(this.pos);

    // Smooth rotation interpolation
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(dt * 12, 1.0);
    this.mesh.rotation.y = this.yaw;

    // Deteksi apakah remote player benar-benar sedang melangkah
    const distToTarget = Math.hypot(this.targetPos.x - this.pos.x, this.targetPos.z - this.pos.z);
    const isMovingActual = this.moving && distToTarget > 0.03;

    // Animasi gerak tungkai (kaki & tangan)
    if (this.animator) {
      const isAttacking = this.animator.currentAnim && this.animator.currentAnim.startsWith('combo');
      if (!isAttacking) {
        const nextAnim = isMovingActual ? (this.running ? 'sprint' : 'walk') : 'idle';
        if (this.animator.currentAnim !== nextAnim) {
          this.animator.setAnimation(nextAnim);
        }
      }
      this.animator.moveSpeed = isMovingActual ? (this.running ? 8.0 : 4.5) : 0;
      this.animator.update(dt);
    } else if (this.parts && this.parts.legL && this.parts.legR) {
      // Manual limb swing jika animator tidak aktif
      if (isMovingActual) {
        this.walkT += dt * (this.running ? 14 : 9);
        const swing = Math.sin(this.walkT) * 0.55;
        this.parts.legL.rotation.x = swing;
        this.parts.legR.rotation.x = -swing;
        if (this.parts.armL) this.parts.armL.rotation.x = -swing * 0.7;
        if (this.parts.armR) this.parts.armR.rotation.x = swing * 0.7;
      } else {
        this.parts.legL.rotation.x *= 0.6;
        this.parts.legR.rotation.x *= 0.6;
        if (Math.abs(this.parts.legL.rotation.x) < 0.01) this.parts.legL.rotation.x = 0;
        if (Math.abs(this.parts.legR.rotation.x) < 0.01) this.parts.legR.rotation.x = 0;
        if (this.parts.armL) this.parts.armL.rotation.x *= 0.6;
        if (this.parts.armR) this.parts.armR.rotation.x *= 0.6;
      }
    }
  }

  destroy() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    if (this.nameplateTexture) {
      this.nameplateTexture.dispose();
    }
    this.mesh = null;
    this.parts = {};
  }
}

const Network = {
  ws: null,
  active: false,
  isConnected: false,
  roomId: null,
  roomName: '',
  netId: null,
  isHost: false,
  remotePlayers: new Map(), // netId -> RemotePlayer
  lastSendTime: 0,
  sendInterval: 50, // 20Hz update rate
  lastSyncedPos: null,
  lastSyncedYaw: null,
  lastMovingSent: false,
  discoveredHost: null,
  isDiscovering: false,

  isSecureHost(host) {
    if (!host) return false;
    return host.includes('trycloudflare.com') || host.includes('.ngrok') || host.includes('.loca.lt') || host.startsWith('https://') || host.startsWith('wss://') || (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:');
  },

  getServerHost() {
    let saved = localStorage.getItem('forecraft_server_host');
    if (saved) {
      saved = saved.trim();
      if (saved.startsWith('{') || saved.includes('"') || saved === '10.247.243.121:3000' || saved === '192.168.0.103:3000') {
        localStorage.removeItem('forecraft_server_host');
        saved = null;
      }
    }
    if (saved) return saved;
    if (this.discoveredHost) return this.discoveredHost;
    const loc = (typeof window !== 'undefined') ? window.location : null;
    if (loc && loc.host && loc.host !== 'localhost' && !loc.host.startsWith('127.0.0.1') && !loc.protocol.startsWith('capacitor') && !loc.protocol.startsWith('file')) {
      return loc.host;
    }
    return '10.247.243.121:3000';
  },

  setServerHost(host) {
    if (!host) return;
    let clean = host.trim();
    const match = clean.match(/([a-zA-Z0-9-]+\.trycloudflare\.com)/) || clean.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(?::[0-9]+)?)/);
    if (match) {
      clean = match[1];
    } else {
      clean = clean.replace(/^https?:\/\//i, '').replace(/^wss?:\/\//i, '').replace(/\/.*$/, '');
    }
    localStorage.setItem('forecraft_server_host', clean);
    this.discoveredHost = clean;
  },

  async discoverServer() {
    let manual = localStorage.getItem('forecraft_server_host');
    if (manual) {
      manual = manual.trim();
      if (manual.startsWith('{') || manual.includes('"') || manual === '10.247.243.121:3000' || manual === '192.168.0.103:3000') {
        localStorage.removeItem('forecraft_server_host');
        manual = null;
      } else {
        return manual;
      }
    }

    const loc = (typeof window !== 'undefined') ? window.location : null;
    if (loc && loc.host && loc.host !== 'localhost' && !loc.host.startsWith('127.0.0.1') && !loc.protocol.startsWith('capacitor') && !loc.protocol.startsWith('file')) {
      return loc.host;
    }
    if (this.discoveredHost) return this.discoveredHost;
    if (this.isDiscovering) return this.getServerHost();
    this.isDiscovering = true;

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ntfy.sh/forecraft_online_dewan_v1/raw?poll=1', {
        signal: controller.signal
      });
      clearTimeout(tid);
      if (res.ok) {
        const text = await res.text();
        const matches = text.match(/([a-zA-Z0-9-]+\.trycloudflare\.com)/g);
        if (matches && matches.length > 0) {
          const latestDomain = matches[matches.length - 1];
          this.discoveredHost = latestDomain;
          console.log('[Network] Server publik online ditemukan:', this.discoveredHost);
          return this.discoveredHost;
        }
      }
    } catch (e) {
      console.warn('[Network] Discovery publik tidak merespon:', e.message);
    } finally {
      this.isDiscovering = false;
    }
    return this.getServerHost();
  },

  getServerHttpUrl() {
    const host = this.getServerHost();
    const proto = this.isSecureHost(host) ? 'https' : 'http';
    return `${proto}://${host}`;
  },

  getServerUrl() {
    const host = this.getServerHost();
    const proto = this.isSecureHost(host) ? 'wss' : 'ws';
    return `${proto}://${host}`;
  },

  async fetchRooms() {
    await this.discoverServer();
    const httpUrl = this.getServerHttpUrl();
    try {
      const res = await fetch(`${httpUrl}/api/rooms`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.rooms || [];
    } catch (e) {
      console.warn('[Network] fetchRooms HTTP fallback via WS:', e.message);
      return new Promise((resolve) => {
        let tempWs;
        let timer;
        try {
          tempWs = new WebSocket(this.getServerUrl());
          timer = setTimeout(() => {
            try { tempWs.close(); } catch (err) {}
            resolve([]);
          }, 4500);
          tempWs.onopen = () => {
            tempWs.send(JSON.stringify({ type: 'get_rooms' }));
          };
          tempWs.onmessage = (evt) => {
            try {
              const msg = JSON.parse(evt.data);
              if (msg.type === 'rooms_list') {
                clearTimeout(timer);
                tempWs.close();
                resolve(msg.rooms || []);
              }
            } catch (err) {}
          };
          tempWs.onerror = () => {
            clearTimeout(timer);
            resolve([]);
          };
        } catch (wsErr) {
          clearTimeout(timer);
          resolve([]);
        }
      });
    }
  },

  connectAndJoin(roomId, playerName, onSuccess, onError) {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }

    const url = this.getServerUrl();
    console.log(`[Network] Menghubungkan ke ${url}...`);

    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      if (onError) onError('Gagal membuka koneksi WebSocket. Pastikan server sudah berjalan.');
      return;
    }

    this.ws = ws;

    ws.onopen = () => {
      console.log('[Network] Terhubung ke server, mengirim join request...');
      this.isConnected = true;
      ws.send(JSON.stringify({
        type: 'join',
        roomId: Number(roomId),
        playerName: playerName || 'Ranger',
        hairStyle: typeof Player !== 'undefined' ? Player.hairStyle : 4,
        hairColor: typeof Player !== 'undefined' ? Player.hairColor : 0x2c1f14
      }));
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      this.handleMessage(msg, onSuccess, onError);
    };

    ws.onclose = () => {
      console.log('[Network] Koneksi terputus dari server.');
      this.isConnected = false;
      if (this.active) {
        this.active = false;
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast('⚠️ Terputus dari Server Forecraft Online');
        }
      }
    };

    ws.onerror = (err) => {
      console.error('[Network Error]', err);
      if (onError) onError('Tidak dapat terhubung ke server Forecraft Online di ' + url);
    };
  },

  handleMessage(msg, onJoinSuccess, onJoinError) {
    switch (msg.type) {
      case 'join_success':
        this.active = true;
        this.roomId = msg.roomId;
        this.roomName = msg.roomName;
        this.netId = msg.netId;
        this.isHost = !!msg.isHost;
        console.log(`[Network] Berhasil bergabung ke [Room ${msg.roomId}] ${msg.roomName}. NetId: ${this.netId} Host: ${this.isHost}`);

        // Bersihkan pemain lama jika ada
        this.clearRemotePlayers();

        // Inisialisasi pemain lain yang sudah ada di room
        if (Array.isArray(msg.players)) {
          for (const p of msg.players) {
            this.addRemotePlayer(p);
          }
        }

        // Mob & drop yang sudah ada di room (sinkron awal host-authoritative)
        if (typeof MobNet !== 'undefined' && MobNet.onJoinSnapshot) {
          MobNet.onJoinSnapshot(msg.mobs, msg.drops);
        }

        if (onJoinSuccess) {
          onJoinSuccess(msg);
        }
        break;

      case 'host_migrated':
        this.isHost = true;
        console.log('[Network] Kamu sekarang host room (migrasi host).');
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('👑 Kamu menjadi Host room');
        break;

      case 'join_error':
        if (onJoinError) onJoinError(msg.message || 'Gagal masuk ke room.');
        break;

      case 'player_joined':
        if (msg.player && msg.player.netId !== this.netId) {
          this.addRemotePlayer(msg.player);
          const rp = this.remotePlayers.get(msg.player.netId);
          if (rp && (msg.player.heldId || msg.player.weaponId)) rp.setEquip(msg.player.heldId, msg.player.weaponId);
          if (typeof UI !== 'undefined' && UI.toast) {
            UI.toast(`👋 ${msg.player.name} bergabung ke dunia!`);
          }
        }
        break;

      case 'player_left':
        if (msg.netId) {
          const rp = this.remotePlayers.get(msg.netId);
          if (rp) {
            if (typeof UI !== 'undefined' && UI.toast) {
              UI.toast(`🚪 ${rp.name} keluar dari dunia.`);
            }
            rp.destroy();
            this.remotePlayers.delete(msg.netId);
          }
        }
        break;

      case 'snapshot':
        if (Array.isArray(msg.players)) {
          for (const sp of msg.players) {
            if (sp.netId === this.netId) continue;
            const rp = this.remotePlayers.get(sp.netId);
            if (rp) {
              rp.setTargetPos(sp.pos, sp.rot, sp.moving, sp.running, sp.inWater);
              if (sp.heldId !== undefined || sp.weaponId !== undefined) rp.setEquip(sp.heldId, sp.weaponId);
              let changed = false;
              if (sp.level !== undefined && sp.level !== rp.level) {
                rp.level = sp.level;
                changed = true;
              }
              if (sp.hp !== undefined && sp.hp !== rp.hp) {
                rp.hp = sp.hp;
                changed = true;
              }
              if (sp.maxHp !== undefined && sp.maxHp !== rp.maxHp) {
                rp.maxHp = sp.maxHp;
                changed = true;
              }
              if (changed) rp.updateNameplateVisual();
            }
          }
        }
        // Sinkron mob & drop dari host (dirender sebagai entitas remote)
        if (Array.isArray(msg.mobs) && typeof MobNet !== 'undefined' && MobNet.onHostSnapshot) {
          MobNet.onHostSnapshot(msg.mobs);
        }
        if (Array.isArray(msg.drops) && typeof MobNet !== 'undefined' && MobNet.onHostDropsSnapshot) {
          MobNet.onHostDropsSnapshot(msg.drops);
        }
        break;

      case 'player_updated':
        if (msg.netId !== this.netId) {
          const rp = this.remotePlayers.get(msg.netId);
          if (rp) {
            if (msg.level !== undefined) rp.level = msg.level;
            if (msg.hp !== undefined) rp.hp = msg.hp;
            if (msg.maxHp !== undefined) rp.maxHp = msg.maxHp;
            rp.updateNameplateVisual();
          }
        }
        break;

      case 'block_update':
        if (typeof World !== 'undefined' && World.setBlock) {
          const { x, y, z, id } = msg;
          World._fromNetwork = true;
          World.setBlock(x, y, z, id);
          if (World.networkOverrides) {
            World.networkOverrides[`${x},${y},${z}`] = id;
          }
          World._fromNetwork = false;
        }
        break;

      case 'player_attack':
        if (msg.netId !== this.netId) {
          const rp = this.remotePlayers.get(msg.netId);
          if (rp) {
            if (msg.weaponId) rp.setEquip(rp._heldId || null, msg.weaponId);
            rp.playAttack(msg.combo);
          }
        }
        break;

      case 'chat':
        if (typeof Chat !== 'undefined') {
          const isMe = (msg.netId === this.netId);
          Chat.pushLog(msg.text, isMe ? 'me' : 'other', msg.sender);

          // Gelembung chat 3D di atas kepala karakter
          if (isMe) {
            if (typeof Player !== 'undefined' && Player.mesh) {
              this.showSpeechBubble(Player.mesh, msg.text, msg.sender);
            }
          } else if (msg.netId) {
            const rp = this.remotePlayers.get(msg.netId);
            if (rp && rp.mesh) {
              this.showSpeechBubble(rp.mesh, msg.text, msg.sender);
            }
          }
        }
        break;

      case 'mob_spawn':
        if (typeof MobNet !== 'undefined' && MobNet.onSpawn) MobNet.onSpawn(msg.mob);
        break;

      case 'mob_sync':
        if (typeof MobNet !== 'undefined' && MobNet.onSync) MobNet.onSync(msg.mobs);
        break;

      case 'mob_damage':
        if (typeof MobNet !== 'undefined' && MobNet.onDamage) MobNet.onDamage(msg);
        break;

      case 'mob_death':
        if (typeof MobNet !== 'undefined' && MobNet.onDeath) MobNet.onDeath(msg);
        break;

      case 'drop_spawn':
        if (typeof MobNet !== 'undefined' && MobNet.onDropSpawn) MobNet.onDropSpawn(msg.drop);
        break;

      case 'drop_pickup':
        if (typeof MobNet !== 'undefined' && MobNet.onDropPickup) MobNet.onDropPickup(msg);
        break;

      case 'snap_pos':
        // Server anti-cheat snap back
        if (Array.isArray(msg.pos) && typeof Player !== 'undefined' && Player.pos) {
          Player.pos.set(msg.pos[0], msg.pos[1], msg.pos[2]);
        }
        break;
    }
  },

  showSpeechBubble(parentMesh, text, senderName) {
    if (!parentMesh) return;
    try {
      // Hapus bubble lama jika masih ada
      if (parentMesh.userData && parentMesh.userData.speechBubble) {
        const old = parentMesh.userData.speechBubble;
        parentMesh.remove(old);
        if (old.material) {
          if (old.material.map) old.material.map.dispose();
          old.material.dispose();
        }
        parentMesh.userData.speechBubble = null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const fullText = (senderName ? `[${senderName}]: ` : '') + String(text).trim();
      const cleanText = fullText.length > 36 ? fullText.substring(0, 36) + '…' : fullText;

      // Background Speech Bubble Putih Rounded
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(14, 10, w - 28, h - 34, 16);
      ctx.fill();

      // Border luar
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Segitiga ekor bubble di bawah tengah
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 14, h - 25);
      ctx.lineTo(w / 2, h - 8);
      ctx.lineTo(w / 2 + 14, h - 25);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Teks chat tebal & jelas
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cleanText, w / 2, 37);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3.2, 0.8, 1);
      sprite.position.set(0, 2.85, 0);
      sprite.renderOrder = 30;

      parentMesh.add(sprite);
      parentMesh.userData.speechBubble = sprite;

      // Hapus setelah 4.5 detik
      setTimeout(() => {
        if (parentMesh.userData && parentMesh.userData.speechBubble === sprite) {
          parentMesh.remove(sprite);
          try {
            if (sprite.material) {
              if (sprite.material.map) sprite.material.map.dispose();
              sprite.material.dispose();
            }
          } catch (err) {}
          parentMesh.userData.speechBubble = null;
        }
      }, 4500);
    } catch (e) {
      console.warn('[Network] Gagal membuat bubble chat:', e);
    }
  },

  addRemotePlayer(data) {
    if (!data || !data.netId || this.remotePlayers.has(data.netId)) return;
    const rp = new RemotePlayer(data);
    if (data.heldId || data.weaponId) rp.setEquip(data.heldId, data.weaponId);
    this.remotePlayers.set(data.netId, rp);
  },

  clearRemotePlayers() {
    for (const rp of this.remotePlayers.values()) {
      rp.destroy();
    }
    this.remotePlayers.clear();
  },

  sendMove(x, y, z, yaw, pitch, moving) {
    if (!this.active || !this.ws || this.ws.readyState !== 1) return;
    this.lastSyncedPos = [x, y, z];
    this.lastSyncedYaw = yaw || 0;
    this.lastMovingSent = !!moving;
    const heldId = (typeof RPG !== 'undefined' && RPG.heldId) ? RPG.heldId() : null;
    const weaponId = (typeof RPG !== 'undefined' && RPG.weaponId) ? RPG.weaponId() : null;
    this.ws.send(JSON.stringify({
      type: 'move',
      pos: [x, y, z],
      rot: [yaw || 0, pitch || 0],
      moving: !!moving,
      running: !!(typeof Input !== 'undefined' && Input.sprintHeld && Input.sprintHeld()),
      inWater: !!(typeof Player !== 'undefined' && Player.inWater),
      heldId: heldId,
      weaponId: weaponId
    }));
  },

  sendTeleport(x, y, z) {
    if (!this.active || !this.ws || this.ws.readyState !== 1) return;
    this.lastSyncedPos = [x, y, z];
    const heldId = (typeof RPG !== 'undefined' && RPG.heldId) ? RPG.heldId() : null;
    const weaponId = (typeof RPG !== 'undefined' && RPG.weaponId) ? RPG.weaponId() : null;
    this.ws.send(JSON.stringify({
      type: 'move',
      pos: [x, y, z],
      rot: [typeof Player !== 'undefined' ? (Player.facing || 0) : 0, 0],
      moving: false,
      teleport: true,
      heldId: heldId,
      weaponId: weaponId
    }));
  },

  sendBlockChange(x, y, z, id) {
    if (!this.active || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({
      type: 'block_change',
      x, y, z, id
    }));
  },

  sendAttack(combo, weaponId) {
    if (!this.active || !this.ws || this.ws.readyState !== 1) return;
    const wid = weaponId || (typeof RPG !== 'undefined' && RPG.weaponId ? RPG.weaponId() : null);
    this.ws.send(JSON.stringify({
      type: 'attack',
      combo: combo || 1,
      weaponId: wid
    }));
  },

  sendChat(text) {
    if (!this.active || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({
      type: 'chat',
      text
    }));
  },

  sendPlayerSync() {
    if (!this.active || !this.ws || this.ws.readyState !== 1) return;
    if (typeof Player === 'undefined' || typeof RPG === 'undefined') return;

    const payload = {
      level: Player.level,
      xp: Player.xp,
      hp: Player.hp,
      maxHp: typeof Player.maxHp === 'function' ? Player.maxHp() : 100,
      pos: [Player.pos.x, Player.pos.y, Player.pos.z],
      rot: [Player.facing || 0, 0],
      bag: RPG.bag,
      hotbar: RPG.hotbar,
      blockBag: RPG.blockBag,
      furniBag: RPG.furniBag,
      equip: RPG.equip,
      heldId: RPG.heldId ? RPG.heldId() : null,
      weaponId: RPG.weaponId ? RPG.weaponId() : null,
      coin: RPG.coin,
      skills: RPG.skills,
      prof: typeof Prof !== 'undefined' ? Prof.serialize() : {},
      hairStyle: Player.hairStyle,
      hairColor: Player.hairColor
    };

    this.ws.send(JSON.stringify({
      type: 'sync_player',
      data: payload
    }));
  },

  resolvePlayerCollisions() {
    if (typeof Player === 'undefined' || !Player.pos || !this.active) return;
    const px = Player.pos.x, py = Player.pos.y, pz = Player.pos.z;
    const R = 0.82; // radius tabrakan gabungan (~0.41 tiap pemain)
    const R2 = R * R;

    // 1. Tabrakan antara Pemain Lokal dan Pemain Remote
    for (const rp of this.remotePlayers.values()) {
      if (!rp || !rp.pos) continue;
      if (Math.abs(py - rp.pos.y) > 1.8) continue;

      const dx = px - rp.pos.x;
      const dz = pz - rp.pos.z;
      const d2 = dx * dx + dz * dz;

      if (d2 < R2) {
        const d = Math.sqrt(d2);
        const ux = d < 1e-4 ? 1 : dx / d;
        const uz = d < 1e-4 ? 0 : dz / d;
        const push = (R - d) * 0.55;

        const nx = Player.pos.x + ux * push;
        const nz = Player.pos.z + uz * push;
        if (typeof World !== 'undefined' && World.blockedAt) {
          if (!World.blockedAt(nx, py, Player.pos.z, 0.28)) Player.pos.x = nx;
          if (!World.blockedAt(Player.pos.x, py, nz, 0.28)) Player.pos.z = nz;
        } else {
          Player.pos.x = nx;
          Player.pos.z = nz;
        }

        rp.pos.x -= ux * push * 0.5;
        rp.pos.z -= uz * push * 0.5;
        if (rp.mesh) rp.mesh.position.copy(rp.pos);
      }
    }

    // 2. Tabrakan antar Pemain Remote
    const rps = Array.from(this.remotePlayers.values());
    for (let i = 0; i < rps.length; i++) {
      for (let j = i + 1; j < rps.length; j++) {
        const a = rps[i], b = rps[j];
        if (!a || !b || !a.pos || !b.pos) continue;
        if (Math.abs(a.pos.y - b.pos.y) > 1.8) continue;
        const dx = a.pos.x - b.pos.x;
        const dz = a.pos.z - b.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < R2) {
          const d = Math.sqrt(d2);
          const ux = d < 1e-4 ? 1 : dx / d;
          const uz = d < 1e-4 ? 0 : dz / d;
          const push = (R - d) * 0.5;
          a.pos.x += ux * push; a.pos.z += uz * push;
          b.pos.x -= ux * push; b.pos.z -= uz * push;
          if (a.mesh) a.mesh.position.copy(a.pos);
          if (b.mesh) b.mesh.position.copy(b.pos);
        }
      }
    }
  },

  update(dt) {
    if (!this.active) return;

    // Update semua pemain lain (lerp pergerakan & animasi tungkai)
    for (const rp of this.remotePlayers.values()) {
      rp.update(dt);
    }

    // Resolusi tabrakan (collision) fisik antar pemain
    this.resolvePlayerCollisions();

    // Sinkron mob & drop host-authoritative
    if (typeof MobNet !== 'undefined' && MobNet.update) MobNet.update(dt);

    const now = performance.now();

    // Sinkronisasi status lengkap (Level, HP, XP, Inventory) tiap 3.5 detik
    if (!this._lastFullSyncTime || now - this._lastFullSyncTime > 3500) {
      this._lastFullSyncTime = now;
      this.sendPlayerSync();
    }

    // Kirim posisi lokal ke server (20Hz rate limit)
    if (now - this.lastSendTime >= this.sendInterval) {
      this.lastSendTime = now;

      if (this.ws && this.ws.readyState === 1 && typeof Player !== 'undefined' && Player.pos) {
        const px = Player.pos.x, py = Player.pos.y, pz = Player.pos.z;
        const yaw = Player.facing || 0;

        // Cek jika ada pergerakan atau rotasi — moving:false WAJIB dikirim
        // sekali saat pemain berhenti agar kaki remote ikut berhenti.
        const moved = !this.lastSyncedPos ||
          Math.abs(px - this.lastSyncedPos[0]) > 0.01 ||
          Math.abs(py - this.lastSyncedPos[1]) > 0.01 ||
          Math.abs(pz - this.lastSyncedPos[2]) > 0.01 ||
          Math.abs(yaw - (this.lastSyncedYaw || 0)) > 0.02;

        const mv = (typeof Input !== 'undefined' && Input.moveVec) ? Input.moveVec() : { x: 0, z: 0 };
        const inputActive = (Math.abs(mv.x) > 0.05 || Math.abs(mv.z) > 0.05);
        const velActive = !!(Player.vel && Math.hypot(Player.vel.x, Player.vel.z) > 0.35);
        const isMoving = inputActive || velActive;
        const stopped = !isMoving && this.lastMovingSent;
        const heldId = (typeof RPG !== 'undefined' && RPG.heldId) ? RPG.heldId() : null;
        const weaponId = (typeof RPG !== 'undefined' && RPG.weaponId) ? RPG.weaponId() : null;
        const equipChanged = heldId !== this._lastHeldId || weaponId !== this._lastWeaponId;

        if (moved || stopped || equipChanged) {
          this.lastSyncedPos = [px, py, pz];
          this.lastSyncedYaw = yaw;
          this.lastMovingSent = isMoving;
          this._lastHeldId = heldId;
          this._lastWeaponId = weaponId;

          this.ws.send(JSON.stringify({
            type: 'move',
            pos: [px, py, pz],
            rot: [yaw, 0],
            moving: isMoving,
            running: !!(typeof Input !== 'undefined' && Input.sprintHeld && Input.sprintHeld()),
            inWater: !!Player.inWater,
            heldId: heldId,
            weaponId: weaponId
          }));
        }
      }
    }
  },

  leave() {
    if (this.active && this.ws && this.ws.readyState === 1) {
      try {
        this.sendPlayerSync();
        this.ws.send(JSON.stringify({ type: 'leave' }));
      } catch (e) {}
    }

    this.active = false;
    this.clearRemotePlayers();
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    console.log('[Network] Meninggalkan sesi multiplayer.');
  }
};

window.Network = Network;
window.RemotePlayer = RemotePlayer;
