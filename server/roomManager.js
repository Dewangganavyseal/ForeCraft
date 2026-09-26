'use strict';
/**
 * RoomManager - Forecraft Online Server (MMORPG Architecture)
 * Mengelola 10 Persistent Rooms (Maksimal 50 Player per Room)
 * Anti-Cheat & Server-Authoritative Database Isolation
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const WORLDS_DIR = path.join(DATA_DIR, 'worlds');
const PLAYERS_DIR = path.join(DATA_DIR, 'players');

const ROOM_DEFINITIONS = [
  { id: 1, name: 'Lembah Rimba (Starter Valley)', seed: 4829101, desc: 'Dunia rimba damai dengan kekayaan sumber daya pemula.' },
  { id: 2, name: 'Hutan Zamrud (Emerald Forest)', seed: 7391024, desc: 'Hutan lebat dengan pohon raksasa dan monster buas.' },
  { id: 3, name: 'Puncak Naga (Dragon Spire)', seed: 1983042, desc: 'Pegunungan tinggi terjal sarang naga purba.' },
  { id: 4, name: 'Dataran Kabut (Mist Highlands)', seed: 6520193, desc: 'Dataran tinggi berselimut kabut misterius dan reruntuhan batu.' },
  { id: 5, name: 'Gurun Emas (Golden Dunes)', seed: 3810294, desc: 'Padang pasir luas kaya akan mineral tembaga dan emas.' },
  { id: 6, name: 'Pesisir Biru (Ocean Cliffs)', seed: 8492015, desc: 'Tebing pantai curam dengan biota laut dan pulau terpencil.' },
  { id: 7, name: 'Lembah Raksasa (Titan Valley)', seed: 2749106, desc: 'Area pertambangan mineral langka dan batu titan.' },
  { id: 8, name: 'Jurang Bayangan (Shadow Abyss)', seed: 9102837, desc: 'Jurang vulkanik gelap penuh monster bayangan dan lich.' },
  { id: 9, name: 'Kepulauan Kristal (Crystal Isles)', seed: 5629108, desc: 'Kepulauan terapung kaya akan kristal sihir kuno.' },
  { id: 10, name: 'Arena Legenda (Grand Frontier)', seed: 1029384, desc: 'Dunia bebas untuk pertarungan dan pembangunan kastil agung.' }
];

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerSocketMap = new Map(); // ws -> { roomId, netId, name }
    this.nextNetId = 1000;
    this.saveTimer = null;
    this.dirtyWorlds = new Set();
    this.dirtyPlayers = new Set();

    this.initDirectories();
    this.initRooms();
    this.startPeriodicSave();
  }

  initDirectories() {
    [DATA_DIR, WORLDS_DIR, PLAYERS_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  initRooms() {
    for (const def of ROOM_DEFINITIONS) {
      const worldFile = path.join(WORLDS_DIR, `room_${def.id}.json`);
      let worldDiffs = {};
      if (fs.existsSync(worldFile)) {
        try {
          const raw = fs.readFileSync(worldFile, 'utf8');
          worldDiffs = JSON.parse(raw);
        } catch (e) {
          console.error(`[RoomManager] Gagal membaca world file room ${def.id}:`, e.message);
          worldDiffs = {};
        }
      }

      const playersFile = path.join(PLAYERS_DIR, `room_${def.id}_players.json`);
      let playerProfiles = {};
      if (fs.existsSync(playersFile)) {
        try {
          const raw = fs.readFileSync(playersFile, 'utf8');
          playerProfiles = JSON.parse(raw);
        } catch (e) {
          console.error(`[RoomManager] Gagal membaca player file room ${def.id}:`, e.message);
          playerProfiles = {};
        }
      }

      this.rooms.set(def.id, {
        id: def.id,
        name: def.name,
        seed: def.seed,
        desc: def.desc,
        maxPlayers: 50,
        clients: new Map(), // netId -> { ws, netId, name, pos, rot, stats, lastMoveTime, lastAtkTime, lastBlockTime }
        worldDiffs,
        playerProfiles,
        mobs: new Map(),
        drops: new Map()
      });
    }
    console.log(`[RoomManager] Inisialisasi 10 Rooms aktif (Maks 50 player/room).`);
  }

  getRoomsList() {
    const list = [];
    for (const [id, r] of this.rooms.entries()) {
      list.push({
        id: r.id,
        name: r.name,
        seed: r.seed,
        desc: r.desc,
        players: r.clients.size,
        maxPlayers: r.maxPlayers,
        status: r.clients.size >= r.maxPlayers ? 'Full' : 'Online'
      });
    }
    return list;
  }

  handleJoin(ws, msg) {
    const roomId = Number(msg.roomId);
    const room = this.rooms.get(roomId);
    if (!room) {
      this.send(ws, { type: 'join_error', message: 'Room tidak ditemukan!' });
      return;
    }

    if (room.clients.size >= room.maxPlayers) {
      this.send(ws, { type: 'join_error', message: 'Room penuh! Maksimal 50 pemain.' });
      return;
    }

    const rawName = typeof msg.playerName === 'string' ? msg.playerName.trim() : 'Player';
    const cleanName = rawName.substring(0, 16) || 'Ranger';
    const netId = this.nextNetId++;

    // Muat atau buat server profile pemain
    let profile = room.playerProfiles[cleanName];
    if (!profile) {
      profile = {
        name: cleanName,
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
        pos: null, // akan dihitung spawn oleh client
        rot: [0, 0],
        bag: null,
        hotbar: null,
        blockBag: null,
        equip: {},
        coin: 50,
        skills: {},
        prof: {},
        hairStyle: msg.hairStyle || 4,
        hairColor: msg.hairColor || 0x2c1f14,
        created: Date.now()
      };
      room.playerProfiles[cleanName] = profile;
      this.dirtyPlayers.add(roomId);
    }

    const clientState = {
      ws,
      netId,
      name: cleanName,
      pos: profile.pos || null,
      rot: profile.rot || [0, 0],
      level: profile.level || 1,
      hp: profile.hp || 100,
      maxHp: profile.maxHp || 100,
      hairStyle: profile.hairStyle || 4,
      hairColor: profile.hairColor || 0x2c1f14,
      equip: profile.equip || {},
      heldId: null,
      weaponId: null,
      moving: false,
      isFirstSpawn: !profile.pos,
      lastMoveTime: Date.now(),
      lastAtkTime: 0,
      lastBlockTime: 0,
      blockActionCount: 0,
      chatCount: 0,
      chatResetT: Date.now()
    };

    const isHost = (room.clients.size === 0);
    room.clients.set(netId, clientState);
    this.playerSocketMap.set(ws, { roomId, netId, name: cleanName });

    // Daftar pemain yang sedang aktif di dalam room
    const existingPlayers = [];
    for (const [otherNetId, otherClient] of room.clients.entries()) {
      if (otherNetId !== netId) {
        existingPlayers.push({
          netId: otherNetId,
          name: otherClient.name,
          pos: otherClient.pos,
          rot: otherClient.rot,
          level: otherClient.level,
          hp: otherClient.hp,
          maxHp: otherClient.maxHp,
          hairStyle: otherClient.hairStyle,
          hairColor: otherClient.hairColor,
          equip: otherClient.equip,
          heldId: otherClient.heldId || null,
          weaponId: otherClient.weaponId || null,
          moving: otherClient.moving
        });
      }
    }

    // Kirim konfirmasi join sukses ke pemain baru
    this.send(ws, {
      type: 'join_success',
      netId,
      roomId,
      roomName: room.name,
      seed: room.seed,
      isHost,
      profile,
      worldDiffs: room.worldDiffs,
      players: existingPlayers,
      mobs: Array.from(room.mobs.values()),
      drops: Array.from(room.drops.values())
    });

    // Broadcast ke pemain lain di room bahwa pemain baru bergabung
    this.broadcastToRoom(roomId, {
      type: 'player_joined',
      player: {
        netId,
        name: cleanName,
        pos: clientState.pos,
        rot: clientState.rot,
        level: clientState.level,
        hp: clientState.hp,
        maxHp: clientState.maxHp,
        hairStyle: clientState.hairStyle,
        hairColor: clientState.hairColor,
        equip: clientState.equip,
        heldId: null,
        weaponId: null,
        moving: false
      }
    }, netId);

    console.log(`[Room ${roomId}] Player joined: "${cleanName}" (netId: ${netId}). Total: ${room.clients.size}/${room.maxPlayers}`);
  }

  handleMove(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const client = room.clients.get(meta.netId);
    if (!client) return;

    if (!Array.isArray(msg.pos) || msg.pos.length !== 3) return;

    const [nx, ny, nz] = msg.pos;
    const now = Date.now();
    const dt = Math.max((now - client.lastMoveTime) / 1000, 0.001);

    // Anti-Cheat: Validasi batas koordinat dunia
    if (ny < -30 || ny > 256 || Math.abs(nx) > 50000 || Math.abs(nz) > 50000) {
      return; // Abaikan posisi tidak masuk akal
    }

    // Anti-Cheat: Validasi kecepatan pergerakan (Speed Hack / Teleport Check)
    if (client.pos && !client.isFirstSpawn && !msg.teleport) {
      const dx = nx - client.pos[0];
      const dy = ny - client.pos[1];
      const dz = nz - client.pos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Pemain jatuh karena gravitasi atau blok di bawah hancur diizinkan
      const isFalling = (dy < 0 && Math.abs(dx) < 3.0 && Math.abs(dz) < 3.0);
      const maxAllowedSpeed = isFalling ? 60.0 : 35.0;
      if (dist / dt > maxAllowedSpeed && dist > 15.0 && !isFalling) {
        // Diduga speed hack atau teleport liar -> snap kembali ke posisi valid terakhir
        this.send(ws, {
          type: 'snap_pos',
          pos: client.pos
        });
        return;
      }
    }

    client.isFirstSpawn = false;
    client.pos = [nx, ny, nz];
    client.rot = Array.isArray(msg.rot) ? msg.rot : [0, 0];
    client.moving = !!msg.moving;
    client.running = !!msg.running;
    client.inWater = !!msg.inWater;
    if (msg.heldId !== undefined) client.heldId = msg.heldId;
    if (msg.weaponId !== undefined) client.weaponId = msg.weaponId;
    if (msg.equip) client.equip = msg.equip;
    client.lastMoveTime = now;
  }

  handleBlockChange(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const client = room.clients.get(meta.netId);
    if (!client) return;

    const now = Date.now();
    const isHost = (room.clients.keys().next().value === meta.netId);
    const maxBlocksPerSec = isHost ? 200 : 35;
    // Anti-Cheat: Rate limit perubahan blok
    if (now - client.lastBlockTime < 1000) {
      client.blockActionCount++;
      if (client.blockActionCount > maxBlocksPerSec) return;
    } else {
      client.lastBlockTime = now;
      client.blockActionCount = 1;
    }

    const { x, y, z, id, oldId } = msg;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return;
    if (y < 0 || y >= 128) return;

    // Anti-Cheat: Jarak jangkauan pukul/taruh blok (dilewati untuk host respawn pohon/batu)
    if (client.pos && !isHost) {
      const distSq = (x - client.pos[0]) ** 2 + (y - client.pos[1]) ** 2 + (z - client.pos[2]) ** 2;
      if (distSq > 256) return; // Maks 16 blok
    }

    const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    room.worldDiffs[key] = id | 0;
    this.dirtyWorlds.add(meta.roomId);

    // Siarkan ke seluruh pemain di room ini
    this.broadcastToRoom(meta.roomId, {
      type: 'block_update',
      netId: meta.netId,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(z),
      id: id | 0,
      oldId: oldId !== undefined ? (oldId | 0) : null
    });
  }

  handleBlockHit(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    this.broadcastToRoom(meta.roomId, {
      type: 'block_hit',
      netId: meta.netId,
      x: msg.x,
      y: msg.y,
      z: msg.z,
      id: msg.id,
      stage: msg.stage || 0,
      prog: msg.prog || 0
    }, meta.netId);
  }

  handlePlayerSkill(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    this.broadcastToRoom(meta.roomId, {
      type: 'player_skill',
      netId: meta.netId,
      skillId: msg.skillId,
      x: msg.x,
      y: msg.y,
      z: msg.z,
      facing: msg.facing || 0
    }, meta.netId);
  }

  handleEntityFx(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    this.broadcastToRoom(meta.roomId, {
      type: 'entity_fx',
      fx: msg.fx,
      data: msg.data || {}
    }, meta.netId);
  }

  handleAttack(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const client = room.clients.get(meta.netId);
    if (!client) return;

    const now = Date.now();
    // Anti-Cheat: Attack cooldown limiter (minimal 120ms antar serangan)
    if (now - client.lastAtkTime < 120) return;
    client.lastAtkTime = now;

    // Broadcast animasi serangan ke pemain lain di room
    this.broadcastToRoom(meta.roomId, {
      type: 'player_attack',
      netId: meta.netId,
      combo: msg.combo || 1,
      weaponId: msg.weaponId || client.weaponId || null
    }, meta.netId);
  }

  handleChat(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const text = typeof msg.text === 'string' ? msg.text.trim().substring(0, 120) : '';
    if (!text) return;

    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const client = room.clients.get(meta.netId);
    if (!client) return;

    const now = Date.now();
    if (now - client.chatResetT > 3000) {
      client.chatCount = 0;
      client.chatResetT = now;
    }
    client.chatCount++;
    if (client.chatCount > 4) {
      this.send(ws, { type: 'chat', sender: 'SYSTEM', text: 'Tolong jangan spam chat!', color: '#ff5555' });
      return;
    }

    this.broadcastToRoom(meta.roomId, {
      type: 'chat',
      sender: meta.name,
      netId: meta.netId,
      text,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    });
  }

  handlePlayerSync(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;

    const data = msg.data;
    if (!data || typeof data !== 'object') return;

    // Simpan ke profile server
    const profile = room.playerProfiles[meta.name] || {};
    profile.level = Math.max(1, data.level || profile.level || 1);
    profile.xp = Math.max(0, data.xp || profile.xp || 0);
    profile.hp = Math.max(0, data.hp !== undefined ? data.hp : (profile.hp || 100));
    profile.maxHp = Math.max(50, data.maxHp || profile.maxHp || 100);
    if (Array.isArray(data.pos)) profile.pos = data.pos;
    if (Array.isArray(data.rot)) profile.rot = data.rot;
    if (data.bag) profile.bag = data.bag;
    if (data.hotbar) profile.hotbar = data.hotbar;
    if (data.blockBag) profile.blockBag = data.blockBag;
    if (data.furniBag) profile.furniBag = data.furniBag;
    if (data.equip) profile.equip = data.equip;
    if (data.coin !== undefined) profile.coin = data.coin;
    if (data.skills) profile.skills = data.skills;
    if (data.prof) profile.prof = data.prof;
    if (data.hairStyle !== undefined) profile.hairStyle = data.hairStyle;
    if (data.hairColor !== undefined) profile.hairColor = data.hairColor;
    profile.lastUpdated = Date.now();

    room.playerProfiles[meta.name] = profile;
    this.dirtyPlayers.add(meta.roomId);

    // Update state aktif
    const client = room.clients.get(meta.netId);
    if (client) {
      client.level = profile.level;
      client.hp = profile.hp;
      client.maxHp = profile.maxHp;
      client.equip = profile.equip;

      // Siarkan pembaruan profil (level, hp, armor) ke pemain lain
      this.broadcastToRoom(meta.roomId, {
        type: 'player_updated',
        netId: meta.netId,
        level: client.level,
        hp: client.hp,
        maxHp: client.maxHp,
        equip: client.equip
      }, meta.netId);
    }
  }

  handleMobSpawn(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const mob = msg.mob;
    if (!mob || !mob.netId) return;

    room.mobs.set(mob.netId, mob);
    this.broadcastToRoom(meta.roomId, {
      type: 'mob_spawn',
      mob
    }, meta.netId);
  }

  handleMobSync(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    if (!Array.isArray(msg.mobs)) return;

    for (const m of msg.mobs) {
      if (!m.netId) continue;
      const existing = room.mobs.get(m.netId);
      if (existing) {
        if (m.pos) existing.pos = m.pos;
        if (m.rot !== undefined) existing.rot = m.rot;
        if (m.hp !== undefined) existing.hp = m.hp;
        if (m.state) existing.state = m.state;
      } else {
        room.mobs.set(m.netId, m);
      }
    }

    this.broadcastToRoom(meta.roomId, {
      type: 'mob_sync',
      mobs: msg.mobs
    }, meta.netId);
  }

  handleMobDamage(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const { netId, dmg, dir, kb, srcNetId } = msg;
    if (!netId) return;

    const mob = room.mobs.get(netId);
    if (mob && typeof dmg === 'number') {
      mob.hp = Math.max(0, (mob.hp || 100) - dmg);
    }

    this.broadcastToRoom(meta.roomId, {
      type: 'mob_damage',
      netId,
      dmg,
      dir,
      kb,
      srcNetId: srcNetId || meta.netId
    }, meta.netId);
  }

  handleMobDeath(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const { netId, pos, killerNetId } = msg;
    if (!netId) return;

    room.mobs.delete(netId);
    this.broadcastToRoom(meta.roomId, {
      type: 'mob_death',
      netId,
      pos,
      killerNetId: killerNetId || meta.netId
    });
  }

  handleDropSpawn(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const drop = msg.drop;
    if (!drop || !drop.dropId) return;

    room.drops.set(drop.dropId, drop);
    this.broadcastToRoom(meta.roomId, {
      type: 'drop_spawn',
      drop
    }, meta.netId);
  }

  handleDropPickup(ws, msg) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomId);
    if (!room) return;
    const dropId = msg.dropId;
    if (!dropId) return;

    room.drops.delete(dropId);
    this.broadcastToRoom(meta.roomId, {
      type: 'drop_pickup',
      dropId,
      netId: meta.netId
    });
  }

  handleDisconnect(ws) {
    const meta = this.playerSocketMap.get(ws);
    if (!meta) return;

    this.playerSocketMap.delete(ws);
    const room = this.rooms.get(meta.roomId);
    if (!room) return;

    const client = room.clients.get(meta.netId);
    if (client && client.pos) {
      const profile = room.playerProfiles[meta.name];
      if (profile) {
        profile.pos = client.pos;
        profile.rot = client.rot;
        profile.lastSeen = Date.now();
        this.dirtyPlayers.add(meta.roomId);
      }
    }

    room.clients.delete(meta.netId);

    // Beritahu pemain lain bahwa player ini keluar
    this.broadcastToRoom(meta.roomId, {
      type: 'player_left',
      netId: meta.netId,
      name: meta.name
    });

    // Jika room masih ada pemain, periksa apakah host perlu dimigrasikan
    if (room.clients.size > 0) {
      let minNetId = Infinity;
      let newHostClient = null;
      for (const [otherNetId, otherClient] of room.clients.entries()) {
        if (otherNetId < minNetId) {
          minNetId = otherNetId;
          newHostClient = otherClient;
        }
      }
      if (newHostClient) {
        this.send(newHostClient.ws, {
          type: 'host_migrated',
          isHost: true
        });
        console.log(`[Room ${meta.roomId}] Host dimigrasikan ke "${newHostClient.name}" (netId: ${newHostClient.netId})`);
      }
    } else {
      room.mobs.clear();
      room.drops.clear();
    }

    console.log(`[Room ${meta.roomId}] Player left: "${meta.name}" (netId: ${meta.netId}). Sisa: ${room.clients.size}/${room.maxPlayers}`);
  }

  broadcastSnapshot() {
    // Siarkan snapshot posisi seluruh pemain per room (20 Hz)
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.clients.size === 0) continue;

      const playerStates = [];
      for (const [netId, client] of room.clients.entries()) {
        playerStates.push({
          netId,
          pos: client.pos,
          rot: client.rot,
          moving: client.moving,
          running: client.running,
          inWater: client.inWater,
          level: client.level || 1,
          hp: client.hp !== undefined ? client.hp : 100,
          maxHp: client.maxHp || 100,
          heldId: client.heldId || null,
          weaponId: client.weaponId || null,
          equip: client.equip || {}
        });
      }

      const payload = JSON.stringify({
        type: 'snapshot',
        players: playerStates,
        mobs: Array.from(room.mobs.values()),
        drops: Array.from(room.drops.values())
      });

      for (const client of room.clients.values()) {
        if (client.ws.readyState === 1) { // OPEN
          client.ws.send(payload);
        }
      }
    }
  }

  broadcastToRoom(roomId, msgObj, excludeNetId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(msgObj);
    for (const [netId, client] of room.clients.entries()) {
      if (excludeNetId !== null && netId === excludeNetId) continue;
      if (client.ws.readyState === 1) {
        client.ws.send(payload);
      }
    }
  }

  send(ws, msgObj) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(msgObj));
    }
  }

  startPeriodicSave() {
    // Simpan dunia dan profil pemain yang berubah setiap 2 detik
    this.saveTimer = setInterval(() => {
      this.saveDirtyData();
    }, 2000);
  }

  saveDirtyData() {
    if (this.dirtyWorlds.size > 0) {
      for (const roomId of Array.from(this.dirtyWorlds)) {
        const room = this.rooms.get(roomId);
        if (room) {
          const filePath = path.join(WORLDS_DIR, `room_${roomId}.json`);
          try {
            fs.writeFileSync(filePath, JSON.stringify(room.worldDiffs), 'utf8');
          } catch (e) {
            console.error(`[RoomManager] Gagal menyimpan world room ${roomId}:`, e.message);
          }
        }
      }
      this.dirtyWorlds.clear();
    }

    if (this.dirtyPlayers.size > 0) {
      for (const roomId of Array.from(this.dirtyPlayers)) {
        const room = this.rooms.get(roomId);
        if (room) {
          const filePath = path.join(PLAYERS_DIR, `room_${roomId}_players.json`);
          try {
            fs.writeFileSync(filePath, JSON.stringify(room.playerProfiles, null, 2), 'utf8');
          } catch (e) {
            console.error(`[RoomManager] Gagal menyimpan profiles room ${roomId}:`, e.message);
          }
        }
      }
      this.dirtyPlayers.clear();
    }
  }

  shutdown() {
    if (this.saveTimer) clearInterval(this.saveTimer);
    // Simpan semua data sebelum shutdown
    for (const roomId of this.rooms.keys()) {
      this.dirtyWorlds.add(roomId);
      this.dirtyPlayers.add(roomId);
    }
    this.saveDirtyData();
    console.log('[RoomManager] Seluruh world & player database berhasil disimpan.');
  }
}

module.exports = RoomManager;
