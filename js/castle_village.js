'use strict';
/* =========================================================================
   CASTLE VILLAGE - teritori kastil pemain & desa mandiri
   -------------------------------------------------------------------------
   1. RADIUS TERITORI KASTIL: T1=20 blok, T2=30, T3=40 (kelipatan 10).
      Diukur dari titik tengah kastil (f.x, f.z).
   2. RUMAH LENGKAP = 1 NPC: setiap rumah modular pemain di dalam radius yang
      berisi perabot lengkap (kasur + meja + kursi + chest) mendatangkan 1 NPC
      basic (guard/hunter/miner/farmer/herbal/warrior/guardian, bergiliran).
      NPC menetap: home = rumah itu, patroli HOME_R seperti penduduk desa.
   3. DESA PENUH: bila di dalam radius ada 1 gugus gabungan >= 4 modul yang
      berisi 4 meja + 8 kursi + 1 chest + 1 quest board, wilayah itu menjadi
      desa penuh: NPC berdatangan bertahap, 1 per hari in-game, dengan urutan
      seperti desa biasa (guard, merchant, farmer, lalu undian basic) KECUALI
      dungeon master tidak pernah muncul.
   State persisten di localStorage (settlement per kastil + jejak rumah yang
   sudah memicu NPC), sehingga relog tidak menduplikasi NPC.
   ========================================================================= */

const CastleVillage = (() => {
  /* radius teritori per tier kastil (mulai 40, kelipatan 20: T1=40, T2=60, T3=80) */
  const TIER_RADIUS = { 1: 40, 2: 60, 3: 80 };

  /* urutan kedatangan desa penuh ala desa biasa (tanpa dungeon master) */
  const VILLAGE_QUEUE = ['guard', 'merchant', 'farmer',
    'hunter', 'miner', 'warrior', 'herbal', 'guardian'];

  const SAVE_KEY = 'forecraft_castle_village_v1';

  /* state: { castles: { ckey: { tier, day: <hari terakhir diproses>,
     arrivals: [roleId...], houseClaimed: { hkey: roleId } } } } */
  let S = { castles: {} };

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.castles) S = o;
      }
    } catch (e) {}
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  }

  function castleTier(f) {
    const m = /castle(\d)/.exec(f.def || '');
    return m ? (+m[1]) : 1;
  }

  function castleRadius(f) {
    return TIER_RADIUS[castleTier(f)] || 20;
  }

  function castleKey(f) {
    return 'c' + Math.round(f.x) + ',' + Math.round(f.z);
  }

  function houseKey(h) {
    const cs = (h.cells || []).map(c => c.bx + ',' + c.bz).sort().join(';');
    return 'h' + cs;
  }

  function dist2(ax, az, bx, bz) {
    return Math.hypot(ax - bx, az - bz);
  }

  /* semua kastil pemain yang terpasang (def castle1/2/3) */
  function playerCastles() {
    if (typeof Furni === 'undefined' || !Furni.list) return [];
    return Furni.list.filter(f => f.def && f.def.indexOf('castle') === 0);
  }

  /* titik tengah sebuah record rumah (rata-rata footprint) */
  function houseCenter(h) {
    if (typeof Furni === 'undefined') return null;
    const fp = Furni.recFp(h);
    let sx = 0, sz = 0, n = 0;
    for (const k of fp) {
      const p = k.split(',');
      sx += +p[0]; sz += +p[1]; n++;
    }
    if (!n) return null;
    return { x: sx / n, z: sz / n, y: h.y };
  }

  /* hitung perabot di dalam footprint rumah (berdasar posisi furnitur) */
  function furnInHouse(h) {
    const out = { bed: 0, table: 0, chair: 0, chest: 0, board: 0 };
    if (typeof Furni === 'undefined' || !Furni.list) return out;
    for (const f of Furni.list) {
      if (!f || !f.def) continue;
      let kind = null;
      if (f.def === 'bed') kind = 'bed';
      else if (f.def === 'table' || f.def === 'workbench' || f.def === 'stove' || f.def === 'smelter' || f.def === 'anvil') kind = 'table';
      else if (f.def === 'chair' || f.def === 'stool' || f.def === 'bench') kind = 'chair';
      else if (f.def === 'chest' || f.def === 'bchest' || f.def === 'dchest' || f.def === 'wreck_chest' || f.def === 'barrel') kind = 'chest';
      else if (f.def === 'board') kind = 'board';
      if (!kind) continue;
      if (Furni.recHasBlock(h, Math.floor(f.x), Math.floor(f.z))) out[kind]++;
    }
    return out;
  }

  /* rumah lengkap: kasur + meja (atau meja kerja/tungku) + kursi (masing-masing >= 1, chest opsional) */
  function isCompleteHouse(counts) {
    return counts.bed >= 1 && (counts.table >= 1 || counts.chest >= 1) && counts.chair >= 1;
  }

  /* syarat aula desa: gugus >= 4 modul + 4 meja + 8 kursi + 1 chest + 1 board */
  function isVillageHall(h, counts) {
    const mods = (h.cells || []).length;
    return mods >= 4 && counts.table >= 4 && counts.chair >= 8 &&
           counts.chest >= 1 && counts.board >= 1;
  }

  /* cari titik spawn tanah kosong di dekat rumah */
  function groundNearHouse(c, minD = 2.8, maxD = 6.0) {
    for (let t = 0; t < 24; t++) {
      const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD);
      const x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      // Pastikan titik spawn di luar dinding rumah
      if (typeof Furni !== 'undefined' && Furni.houses) {
        let inside = false;
        for (const h of Furni.houses) {
          if (Furni.recHasBlock(h, Math.floor(x), Math.floor(z))) { inside = true; break; }
        }
        if (inside) continue;
      }
      const y = (typeof World !== 'undefined' && World.groundAt) ? World.groundAt(x, z, (c.y || 5) + 3) : (c.y || 5);
      const waterY = (typeof CFG !== 'undefined' && CFG.WATER_Y) ? CFG.WATER_Y : 4.82;
      if (y >= waterY + 0.2) return { x, y, z };
    }
    // Fallback aman di samping rumah
    return { x: c.x + 3.2, y: (c.y || 5), z: c.z };
  }

  /* buat 1 NPC penduduk tetap di sekitar rumah */
  function spawnSettler(roleId, c, castlePos, houseKey = null, castleKey = null) {
    const role = (typeof NPC_ROLES !== 'undefined') ? NPC_ROLES.find(r => r.id === roleId) : null;
    if (!role) return null;
    const p = groundNearHouse(c, 2.8, 6.0);
    if (!p) return null;
    const home = { x: Math.round(c.x), z: Math.round(c.z) };
    const npc = NPCS.make(role, p.x, p.y, p.z, home, null, null);
    npc.settleCastle = castlePos ? { x: Math.round(castlePos.x), z: Math.round(castlePos.z) } : null;
    npc.settleHouseKey = houseKey;
    npc.settleCastleKey = castleKey;
    NPCS.list.push(npc);
    if (typeof FX !== 'undefined' && FX.debris) {
      FX.debris(npc.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xffe066, 8, 2);
    }
    return npc;
  }

  /* role basic berikutnya yang belum diklaim kastil ini (bergiliran, maks 1 farmer per ladang) */
  function nextBasicRole(claimedIds) {
    const farmerCount = claimedIds.filter(id => id === 'farmer').length;
    const pool = ['guard', 'hunter', 'miner', (farmerCount < 1 ? 'farmer' : null), 'herbal', 'warrior', 'guardian'].filter(Boolean);
    const used = {};
    for (const id of claimedIds) used[id] = (used[id] || 0) + 1;
    let best = pool[0], bestN = 1e9;
    for (const id of pool) {
      const n = used[id] || 0;
      if (n < bestN) { bestN = n; best = id; }
    }
    return best;
  }

  /* proses satu kastil: scan rumah dalam radius, picu kedatangan */
  function processCastle(f) {
    const key = castleKey(f);
    const R = castleRadius(f);
    let st = S.castles[key];
    if (!st) {
      st = S.castles[key] = {
        tier: castleTier(f), x: Math.round(f.x), z: Math.round(f.z),
        day: -1, arrivals: [], houseClaimed: {}, village: false,
      };
    }
    st.tier = castleTier(f);
    st.x = Math.round(f.x); st.z = Math.round(f.z);

    const day = (typeof Weather !== 'undefined') ? Weather.day : 0;
    const houses = (typeof Furni !== 'undefined' && Furni.houses) ? Furni.houses : [];

    /* --- AULA DESA: gugus >= 4 modul + perabot desa dalam radius --- */
    let hall = null, hallCounts = null, hallCenter = null;
    for (const h of houses) {
      const c = houseCenter(h);
      if (!c) continue;
      if (dist2(c.x, c.z, f.x, f.z) > R) continue;
      const counts = furnInHouse(h);
      if (isVillageHall(h, counts)) { hall = h; hallCounts = counts; hallCenter = c; break; }
    }
    if (hall && !st.village) {
      st.village = true;
      st.villageDay = day;
      st.villageIdx = 0;
      save();
      if (typeof RPG !== 'undefined' && RPG.unlockBadge) RPG.unlockBadge('village_founder');
      if (typeof UI !== 'undefined' && UI.toast)
        UI.toast('Desa kastil berdiri! Penduduk akan berdatangan hari demi hari');
    }

    /* desa penuh: 1 NPC per hari in-game, urutan ala desa (tanpa DM) */
    if (st.village) {
      const lastDay = (st.villageDay === undefined) ? day : st.villageDay;
      const daysPassed = day - lastDay;
      let idx = st.villageIdx || 0;
      /* kejar ketertinggalan bila pemain skip hari, maks 1 per tick update */
      if (daysPassed > 0 && idx < VILLAGE_QUEUE.length) {
        const roleId = VILLAGE_QUEUE[idx % VILLAGE_QUEUE.length];
        const c = hallCenter || { x: f.x, z: f.z, y: f.y };
        const npc = spawnSettler(roleId, c, f);
        if (npc) {
          idx++;
          st.villageIdx = idx;
          st.villageDay = day;
          save();
          if (typeof UI !== 'undefined' && UI.toast) {
            const role = NPC_ROLES.find(r => r.id === roleId);
            UI.toast((role ? role.e + ' ' + role.name : roleId) + ' menetap di desa kastilmu!');
          }
        } else {
          /* gagal spawn (tidak ada tanah): coba lagi besok */
          st.villageDay = day;
          save();
        }
      }
      /* desa penuh: rumah lengkap di sekitarnya tidak memicu NPC satuan lagi
         (populasi diatur antrean desa), tapi tetap dihitung klaim visual */
    }

    /* --- RUMAH SATUAN: 1 rumah lengkap = 1 NPC basic --- */
    if (!st.village) {
      const claimedIds = Object.values(st.houseClaimed);
      for (const h of houses) {
        const hk = houseKey(h);
        const c = houseCenter(h);
        if (!c) continue;
        if (dist2(c.x, c.z, f.x, f.z) > R) continue;
        const counts = furnInHouse(h);
        if (!isCompleteHouse(counts)) continue;

        // Cek apakah NPC untuk rumah ini sudah hidup dan hadir di dunia
        const existingNpc = (typeof NPCS !== 'undefined' && NPCS.list)
          ? NPCS.list.find(n => !n.dead && (n.settleHouseKey === hk || (n.home && n.home.x === Math.round(c.x) && n.home.z === Math.round(c.z))))
          : null;

        if (existingNpc) continue;

        // Belum ada NPC di dunia (baru memenuhi syarat atau baru load/relog): spawn sekarang!
        const roleId = st.houseClaimed[hk] || nextBasicRole(claimedIds);
        const npc = spawnSettler(roleId, c, f, hk, key);
        if (npc) {
          const wasNew = !st.houseClaimed[hk];
          st.houseClaimed[hk] = roleId;
          if (wasNew) claimedIds.push(roleId);
          save();
          if (wasNew && typeof UI !== 'undefined' && UI.toast) {
            const role = (typeof NPC_ROLES !== 'undefined') ? NPC_ROLES.find(r => r.id === roleId) : null;
            UI.toast((role ? role.e + ' ' + role.name : roleId) + ' datang dan menetap di rumahmu!');
          }
        }
      }
    }
  }

  /* proses rumah mandiri pemain di luar radius kastil atau saat belum ada kastil */
  function processStandaloneHouses(castles) {
    const houses = (typeof Furni !== 'undefined' && Furni.houses) ? Furni.houses : [];
    if (!houses.length) return;
    if (!S.standalone) S.standalone = {};

    // Bersihkan klaim rumah yang sudah dihapus/dihancurkan
    const validHouseKeys = new Set(houses.map(h => houseKey(h)));
    for (const hk in S.standalone) {
      if (!validHouseKeys.has(hk)) delete S.standalone[hk];
    }

    const claimedIds = Object.values(S.standalone);
    for (const h of houses) {
      const hk = houseKey(h);
      const c = houseCenter(h);
      if (!c) continue;

      // Jika sudah berada di dalam radius kastil aktif mana pun, biarkan dikelola oleh kastil itu
      const nearCastle = castles.some(f => dist2(c.x, c.z, f.x, f.z) <= castleRadius(f));
      if (nearCastle) continue;

      const counts = furnInHouse(h);
      if (!isCompleteHouse(counts)) continue;

      // Cek apakah NPC untuk rumah ini sudah hidup dan hadir di dunia
      const existingNpc = (typeof NPCS !== 'undefined' && NPCS.list)
        ? NPCS.list.find(n => !n.dead && !NPCS.isTeam(n) && (n.settleHouseKey === hk || (n.home && n.home.x === Math.round(c.x) && n.home.z === Math.round(c.z))))
        : null;

      if (existingNpc) continue;

      // Belum ada NPC di dunia (baru memenuhi syarat atau baru load/relog): spawn sekarang!
      const roleId = S.standalone[hk] || nextBasicRole(claimedIds);
      const npc = spawnSettler(roleId, c, null, hk, null);
      if (npc) {
        const wasNew = !S.standalone[hk];
        S.standalone[hk] = roleId;
        if (wasNew) claimedIds.push(roleId);
        save();
        if (wasNew && typeof UI !== 'undefined' && UI.toast) {
          const role = (typeof NPC_ROLES !== 'undefined') ? NPC_ROLES.find(r => r.id === roleId) : null;
          UI.toast((role ? role.e + ' ' + role.name : roleId) + ' datang dan menetap di rumahmu!');
        }
      }
    }
  }

  return {
    /* radius teritori kastil (T1=40, T2=60, T3=80) */
    radiusOf(f) { return castleRadius(f); },
    tierOf(f) { return castleTier(f); },

    /* dipanggil tiap frame dari main loop (guarded, dipercepat tiap 2 dtk agar responsif) */
    _tick: 0,
    update(dt) {
      if (typeof Game !== 'undefined' && !Game.started) return;
      this._tick -= dt;
      if (this._tick > 0) return;
      this._tick = 2.0;
      load();
      const castles = playerCastles();
      /* bersihkan state kastil yang sudah tidak ada (dibongkar pemain) */
      const alive = {};
      for (const f of castles) alive[castleKey(f)] = 1;
      for (const k in S.castles) if (!alive[k]) delete S.castles[k];
      for (const f of castles) {
        try { processCastle(f); } catch (e) { console.error('[CastleVillage error]', e); }
      }
      /* Proses rumah mandiri yang di luar radius kastil atau belum punya kastil */
      try { processStandaloneHouses(castles); } catch (e) { console.error('[StandaloneHouse error]', e); }
    },
  };
})();

if (typeof window !== 'undefined') window.CastleVillage = CastleVillage;
