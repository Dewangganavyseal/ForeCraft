'use strict';
/* =========================================================================
   BUILD MODE SYSTEM (Voxel Block Placement & Horizontal Drag)
   - Preview visual kotak (ghost mesh & kawat tepi)
   - Raycast presisi (100% selaras di mode Isometrik, TPP, & FPP)
   - Fitur seret (drag) horizontal untuk memilih area blok sekaligus
   - Modal dialog konfirmasi sebelum memasang blok hasil drag
   - Sinkronisasi tas blok (RPG.blockBag) & kontrol mobile tap/drag
   ========================================================================= */

const BuildSys = {
  active: false,
  mode: 'block',       // 'block' atau 'furniture'
  furniYaw: 0,
  furniGhost: null,
  furniGhostMats: [],
  furniTarget: null,
  furniInvalidReason: '',

  ghostGroup: null,
  ghostMesh: null,
  ghostLines: null,
  multiGhostGroup: null,
  currentTarget: null,
  initialized: false,

  // State drag area
  isDragging: false,
  dragStart: null,     // { bx, by, bz, px, py, pz, norm }
  dragCurrent: null,   // { bx, by, bz, px, py, pz, norm }
  dragSelection: [],   // Array of { px, py, pz, valid }
  isConfirming: false, // Flag saat modal konfirmasi sedang terbuka

  SAVE_KEY: 'forecraft_custom_blocks_v1',
  customBlocks: {},

  saveBlocks() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(this.customBlocks));
      }
    } catch (e) {}
  },
  loadBlocks() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.SAVE_KEY);
        if (raw) this.customBlocks = JSON.parse(raw) || {};
      }
    } catch (e) {}
  },
  restoreBlocks() {
    this.loadBlocks();
    if (!this.customBlocks) return;
    for (const key in this.customBlocks) {
      const p = key.split(',').map(Number);
      if (p.length === 3 && typeof World !== 'undefined' && World.setBlock) {
        World.setBlock(p[0], p[1], p[2], this.customBlocks[key]);
      }
    }
  },

  init() {
    if (this.initialized || typeof THREE === 'undefined' || !Game.scene) return;
    this.loadBlocks();

    // 1. Single ghost group
    this.ghostGroup = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x58b868,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.ghostMesh = new THREE.Mesh(geo, mat);
    this.ghostGroup.add(this.ghostMesh);

    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    this.ghostLines = new THREE.LineSegments(edges, lineMat);
    this.ghostGroup.add(this.ghostLines);

    this.ghostGroup.visible = false;
    Game.scene.add(this.ghostGroup);

    // 2. Multi-ghost group (untuk visualisasi drag seleksi)
    this.multiGhostGroup = new THREE.Group();
    this.multiGhostGroup.visible = false;
    Game.scene.add(this.multiGhostGroup);

    this.sharedBoxGeo = geo;
    this.sharedEdgesGeo = edges;
    this.sharedLineMat = lineMat;
    this.sharedValidMat = mat;
    this.sharedInvalidMat = new THREE.MeshBasicMaterial({
      color: 0xdd3333,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.createHUD();
    this.initialized = true;
  },

  createHUD() {
    if (document.getElementById('build-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'build-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="bh-container">
        <div class="bh-header">
          <span class="bh-title">🏗️ MODE BANGUN</span>
          <button id="bh-close-btn" type="button" class="bh-btn-x" title="Keluar Mode Bangun">✕</button>
        </div>
        <div class="bh-tabs">
          <button id="bh-tab-block" type="button" class="bh-tab active" data-bmode="block">🧱 Blok</button>
          <button id="bh-tab-furni" type="button" class="bh-tab" data-bmode="furniture">🪑 Furnitur</button>
        </div>
        <div class="bh-body">
          <div id="bh-slot" class="bh-slot">
            <div id="bh-block-ico" class="bh-ico">🧱</div>
            <div class="bh-info">
              <div id="bh-block-name" class="bh-name">Memuat...</div>
              <div id="bh-block-cnt" class="bh-cnt">×0</div>
            </div>
          </div>
          <button id="bh-rot-btn" type="button" class="bh-rot-btn" style="display:none;" title="Putar Arah (Tekan R)">🔄 Putar</button>
          <button id="bh-bag-btn" type="button" class="bh-bag-btn">🎒 Ganti Blok</button>
        </div>
        <div class="bh-tip" id="bh-tip-text">Klik atau seret (drag) di permukaan dunia untuk menata blok</div>
      </div>
    `;
    document.body.appendChild(hud);

    const closeBtn = document.getElementById('bh-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        BuildSys.toggle(false);
      });
    }

    const tabBlk = document.getElementById('bh-tab-block');
    if (tabBlk) {
      tabBlk.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        BuildSys.setMode('block');
      });
    }

    const tabFur = document.getElementById('bh-tab-furni');
    if (tabFur) {
      tabFur.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        BuildSys.setMode('furniture');
      });
    }

    const rotBtn = document.getElementById('bh-rot-btn');
    if (rotBtn) {
      rotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        BuildSys.rotateFurni();
      });
    }

    const bagBtn = document.getElementById('bh-bag-btn');
    if (bagBtn) {
      bagBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof UI !== 'undefined') {
          UI.toggle('bag');
          UI.setBagPage(BuildSys.mode === 'furniture' ? 'furniture' : 'blocks');
        }
      });
    }
  },

  setMode(mode) {
    this.mode = (mode === 'furniture') ? 'furniture' : 'block';
    this.clearDragSelection();
    this.isDragging = false;

    const tabBlk = document.getElementById('bh-tab-block');
    const tabFur = document.getElementById('bh-tab-furni');
    if (tabBlk) tabBlk.classList.toggle('active', this.mode === 'block');
    if (tabFur) tabFur.classList.toggle('active', this.mode === 'furniture');

    const rotBtn = document.getElementById('bh-rot-btn');
    if (rotBtn) rotBtn.style.display = (this.mode === 'furniture') ? 'block' : 'none';

    const bagBtn = document.getElementById('bh-bag-btn');
    if (bagBtn) bagBtn.textContent = (this.mode === 'furniture') ? '🎒 Ganti Furnitur' : '🎒 Ganti Blok';

    const tipEl = document.getElementById('bh-tip-text');
    if (tipEl) {
      tipEl.textContent = (this.mode === 'furniture')
        ? 'Klik tanah untuk meletakkan furnitur · Putar dengan tombol 🔄 / tekan R'
        : 'Klik atau seret (drag) di permukaan dunia untuk menata blok';
    }

    if (this.mode === 'furniture') {
      if (this.ghostGroup) this.ghostGroup.visible = false;
      if (this.multiGhostGroup) this.multiGhostGroup.visible = false;
      this.ensureSelectedFurni();
      this.updateFurniGhostModel();
    } else {
      this.clearFurniGhost();
      if (this.ghostGroup) this.ghostGroup.visible = this.active;
      this.ensureSelectedBlock();
    }
    this.updateHUD();
  },

  rotateFurni() {
    this.furniYaw = (this.furniYaw + Math.PI / 2) % (Math.PI * 2);
    if (this.furniGhost) this.furniGhost.rotation.y = this.furniYaw;
    if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
    if (typeof UI !== 'undefined' && UI.toast) UI.toast('🔄 Arah furnitur diputar 90°');
  },

  updateFurniGhostModel() {
    if (!Game.scene || typeof THREE === 'undefined') return;
    this.clearFurniGhost();
    const held = this.getHeldFurni();
    if (!held || !ITEMS[held.id] || !ITEMS[held.id].place) return;
    const defId = ITEMS[held.id].place;
    const def = (typeof Furni !== 'undefined') ? Furni.DEFS[defId] : null;
    if (!def) return;

    const g = def.build();
    this.furniGhostMats = [];
    g.traverse(o => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        if (o.material) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.material.opacity = 0.55;
          o.material.depthWrite = false;
          this.furniGhostMats.push(o.material);
        }
      }
    });
    this.furniGhost = g;
    this.furniGhost.rotation.y = this.furniYaw;
    this.furniGhost.visible = this.active && this.mode === 'furniture';
    Game.scene.add(this.furniGhost);
  },

  clearFurniGhost() {
    if (this.furniGhost && Game.scene) {
      Game.scene.remove(this.furniGhost);
      this.furniGhost.traverse(o => {
        if (o.isMesh) {
          if (o.geometry) o.geometry.dispose();
          if (o.material && o.material.dispose) o.material.dispose();
        }
      });
      this.furniGhost = null;
    }
    this.furniGhostMats = [];
  },

  toggle(force, targetMode) {
    if (!this.initialized) this.init();

    this.active = (force !== undefined) ? !!force : !this.active;
    this.clearDragSelection();
    this.isDragging = false;

    if (targetMode) this.setMode(targetMode);

    if (this.ghostGroup) this.ghostGroup.visible = this.active && this.mode === 'block';
    if (this.multiGhostGroup) this.multiGhostGroup.visible = false;
    if (this.furniGhost) this.furniGhost.visible = this.active && this.mode === 'furniture';

    const mBtn = document.getElementById('m-build');
    if (mBtn) mBtn.classList.toggle('active', this.active);

    const hud = document.getElementById('build-hud');
    if (hud) hud.style.display = this.active ? 'block' : 'none';

    if (this.active) {
      if (this.mode === 'furniture') {
        this.ensureSelectedFurni();
        this.updateFurniGhostModel();
      } else {
        this.ensureSelectedBlock();
      }
      this.updateHUD();
      if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
      if (typeof UI !== 'undefined' && UI.toast) {
        if (this.mode === 'furniture') {
          const fn = this.getHeldFurni();
          const fName = fn && ITEMS[fn.id] ? ITEMS[fn.id].n : 'Furnitur';
          UI.toast(`🏗️ Mode Bangun (Furnitur): ${fName}`);
        } else {
          const blk = this.getHeldBlock();
          const bName = blk && ITEMS[blk.id] ? ITEMS[blk.id].n : 'Blok';
          UI.toast(`🏗️ Mode Bangun (Blok): ${bName}`);
        }
      }
    } else {
      this.currentTarget = null;
      this.furniTarget = null;
      this.clearFurniGhost();
      if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
    }
  },

  getHeldBlock() {
    if (!RPG.blockBag) return null;
    if (RPG.selectedBlockSlot >= 0 && RPG.selectedBlockSlot < RPG.blockBag.length) {
      const s = RPG.blockBag[RPG.selectedBlockSlot];
      if (s && s.n > 0) return s;
    }
    for (let i = 0; i < RPG.blockBag.length; i++) {
      const s = RPG.blockBag[i];
      if (s && s.n > 0) {
        RPG.selectedBlockSlot = i;
        return s;
      }
    }
    return null;
  },

  getHeldFurni() {
    if (!RPG.furniBag) return null;
    if (RPG.selectedFurniSlot >= 0 && RPG.selectedFurniSlot < RPG.furniBag.length) {
      const s = RPG.furniBag[RPG.selectedFurniSlot];
      if (s && s.n > 0) return s;
    }
    for (let i = 0; i < RPG.furniBag.length; i++) {
      const s = RPG.furniBag[i];
      if (s && s.n > 0) {
        RPG.selectedFurniSlot = i;
        return s;
      }
    }
    return null;
  },

  ensureSelectedBlock() {
    const s = this.getHeldBlock();
    if (!s) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('🧱 Belum ada blok di tas! Kumpulkan blok dari biome terlebih dahulu.');
      }
    }
    return s;
  },

  ensureSelectedFurni() {
    const s = this.getHeldFurni();
    if (!s) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('🪑 Belum ada furnitur di tas! Buat furnitur di panel Craft terlebih dahulu.');
      }
    }
    return s;
  },

  updateHUD() {
    const isFurni = this.mode === 'furniture';
    const s = isFurni ? this.getHeldFurni() : this.getHeldBlock();
    const icoEl = document.getElementById('bh-block-ico');
    const nameEl = document.getElementById('bh-block-name');
    const cntEl = document.getElementById('bh-block-cnt');
    const rotBtn = document.getElementById('bh-rot-btn');
    const bagBtn = document.getElementById('bh-bag-btn');

    if (rotBtn) rotBtn.style.display = isFurni ? 'block' : 'none';
    if (bagBtn) bagBtn.textContent = isFurni ? '🎒 Ganti Furnitur' : '🎒 Ganti Blok';

    if (!s) {
      if (icoEl) icoEl.textContent = isFurni ? '🪑' : '🧱';
      if (nameEl) nameEl.textContent = isFurni ? 'Tidak ada furnitur' : 'Tidak ada blok';
      if (cntEl) cntEl.textContent = '×0';
      return;
    }
    const it = ITEMS[s.id];
    if (icoEl) icoEl.innerHTML = (typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(s.id) : (it ? it.e : (isFurni ? '🪑' : '🧱'));
    if (nameEl) nameEl.textContent = it ? it.n : s.id;
    if (cntEl) cntEl.textContent = `×${s.n}`;
    if (typeof UI !== 'undefined' && UI.applyItemIcons) UI.applyItemIcons(document.getElementById('build-hud'));
  },

  /* Raycasting dari koordinat layar ke geometri voxel di dunia.
     DIJAMIN 100% tepat: Pada mode pointer locked (FPP/TPP dekat), selalu tembak dari tengah layar (0,0) */
  raycastTarget(screenX, screenY) {
    if (!Game.scene || !Cam.cam || typeof THREE === 'undefined') return null;

    let nx, ny;
    const isLockedMode = !!(Input.pointerLocked || (typeof Cam !== 'undefined' && Cam.tppWeight > 0.4 && Input.pointerLocked));

    if (isLockedMode) {
      nx = 0;
      ny = 0;
    } else if (screenX !== undefined && screenY !== undefined) {
      nx = (screenX / window.innerWidth) * 2 - 1;
      ny = -(screenY / window.innerHeight) * 2 + 1;
    } else {
      nx = (Input.mouseX / window.innerWidth) * 2 - 1;
      ny = -(Input.mouseY / window.innerHeight) * 2 + 1;
    }

    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), Cam.cam);

    const groups = [];
    for (const c of World.chunks.values()) {
      if (c.group) groups.push(c.group);
    }
    const hits = ray.intersectObjects(groups, true);
    if (!hits || !hits.length) return null;

    const pPos = (typeof Player !== 'undefined' && Player.pos) ? Player.pos : { x: 0, y: 5, z: 0 };
    const inside = !!(typeof World !== 'undefined' && World.insideHouse) ||
                   !!(typeof Furni !== 'undefined' && Furni.houseNear && Furni.houseNear(pPos));

    for (const hit of hits) {
      if (hit.object && hit.object.geometry && hit.face) {
        const pt = hit.point;
        const norm = hit.face.normal;

        const bx = Math.floor(pt.x - norm.x * 0.1);
        const by = Math.floor(pt.y - norm.y * 0.1);
        const bz = Math.floor(pt.z - norm.z * 0.1);

        const hitBid = World.getBlock(bx, by, bz);
        if (hitBid === B.AIR || hitBid === B.WATER) continue;

        // 1. Lewati atap genteng (B.ROOF) agar tidak menutupi lantai interior di bawah kursor
        if (hitBid === B.ROOF) continue;

        // 2. Saat berada di dalam ruangan / rumah atau memasang furnitur di dalam rumah:
        // lewati dinding atas, balok atas, atau langit-langit yang tingginya di atas tubuh pemain
        // (bagian yang dibuat transparan oleh shader oklusi) agar raycast menembus langsung ke lantai
        if (inside || this.mode === 'furniture') {
          const inHouse = (typeof Furni !== 'undefined' && Furni.houseNear) ? Furni.houseNear({ x: bx, z: bz }, 2) : null;
          if (inHouse || inside) {
            if (by > pPos.y + 1.25 || pt.y > pPos.y + 1.35) continue;
          }
        }

        const px = bx + Math.round(norm.x);
        const py = by + Math.round(norm.y);
        const pz = bz + Math.round(norm.z);

        return { bx, by, bz, px, py, pz, norm, point: pt };
      }
    }
    return null;
  },

  canPlaceBlock(px, py, pz) {
    if (py < 0 || py >= CFG.WORLD_H) return false;

    // Batas jarak maksimum jangkauan pemain
    const distXZ = Math.hypot(px + 0.5 - Player.pos.x, pz + 0.5 - Player.pos.z);
    if (distXZ > 7.5) return false;
    if (Math.abs(py + 0.5 - Player.pos.y) > 6.0) return false;

    // Blok tujuan harus berupa udara atau air
    const cur = World.getBlock(px, py, pz);
    if (cur !== B.AIR && cur !== B.WATER) return false;

    // Jangan menimpa badan pemain
    const dx = Math.abs(Player.pos.x - (px + 0.5));
    const dz = Math.abs(Player.pos.z - (pz + 0.5));
    if (dx < 0.65 && dz < 0.65 && Player.pos.y < py + 1.0 && Player.pos.y + 1.8 > py) {
      return false;
    }

    return true;
  },

  // Perbarui preview tiap frame
  update(dt) {
    if (!this.active) return;
    if (!this.initialized) this.init();
    if (this.isConfirming) return; // Jangan ubah ghost saat dialog konfirmasi sedang aktif

    if (typeof UI !== 'undefined' && UI.open) {
      if (this.ghostGroup) this.ghostGroup.visible = false;
      if (this.multiGhostGroup) this.multiGhostGroup.visible = false;
      if (this.furniGhost) this.furniGhost.visible = false;
      return;
    }

    if (this.isDragging) {
      if (this.mode === 'furniture') {
        const target = this.raycastTarget();
        if (target) {
          this.dragCurrent = { ...target };
          this.updateFenceDragSelection();
        }
      }
      return;
    }

    if (this.mode === 'furniture') {
      if (this.ghostGroup) this.ghostGroup.visible = false;
      if (this.multiGhostGroup) this.multiGhostGroup.visible = false;

      const target = this.raycastTarget();
      const held = this.getHeldFurni();
      if (!target || !held || !ITEMS[held.id] || !ITEMS[held.id].place) {
        if (this.furniGhost) this.furniGhost.visible = false;
        this.furniTarget = null;
        return;
      }

      const it = ITEMS[held.id];
      const defId = it.place;
      const pt = target.point;
      let tx = Math.floor(pt.x) + 0.5;
      let tz = Math.floor(pt.z) + 0.5;
      let ty = (typeof World !== 'undefined' && World.groundAt)
        ? World.groundAt(tx, tz, Math.floor(Player.pos.y) + 2) : pt.y;

      let valid = true;
      let reason = '';
      const isCastle = defId.startsWith('castle');
      const maxDist = isCastle ? 28 : 11;
      const dp = Math.hypot(tx - Player.pos.x, tz - Player.pos.z);

      if (dp > maxDist) {
        valid = false;
        reason = `Terlalu jauh (maks ${Math.round(maxDist)} blok)`;
      } else if (!isCastle && ty >= 0 && Math.abs(ty - Player.pos.y) > 2.8) {
        valid = false;
        reason = 'Terlalu tinggi/rendah dari karakter';
      } else if (isCastle) {
        const tier = parseInt(defId.replace('castle', '')) || 1;
        const snapX = Math.round(pt.x);
        const snapZ = Math.round(pt.z);
        tx = snapX;
        tz = snapZ;
        if (typeof FurniCastle !== 'undefined' && FurniCastle.castleSiteCheck) {
          const site = FurniCastle.castleSiteCheck(snapX, snapZ, tier);
          if (!site.ok) {
            valid = false;
            reason = site.reason;
          } else {
            ty = site.y;
          }
        }
      } else if (defId === 'house') {
        const { bx, bz } = (typeof Furni !== 'undefined') ? Furni.cellAt(tx, tz) : { bx: Math.floor(tx), bz: Math.floor(tz) };
        const c = (typeof Furni !== 'undefined') ? Furni.cellCenter(bx, bz) : { x: tx, z: tz };
        tx = c.x;
        tz = c.z;
        if (typeof Furni !== 'undefined') {
          const site = Furni.houseSiteCheck(bx, bz);
          if (!site.ok) {
            valid = false;
            reason = site.reason;
          } else {
            ty = site.y;
          }
        }
      } else if (defId.startsWith('fence')) {
        if (typeof FurniCastle !== 'undefined' && FurniCastle.fenceSiteCheck) {
          const site = FurniCastle.fenceSiteCheck(tx, tz);
          if (!site.ok) {
            valid = false;
            reason = site.reason;
          } else {
            ty = site.y;
          }
        }
      } else if (defId.startsWith('gate')) {
        const tier = parseInt(defId.replace('gate', '')) || 1;
        const axis = (Math.abs(Math.cos(this.furniYaw)) > 0.7) ? 'x' : 'z';
        if (typeof FurniCastle !== 'undefined' && FurniCastle.gateSiteCheck) {
          const site = FurniCastle.gateSiteCheck(tx, tz, tier, axis);
          if (!site.ok) {
            valid = false;
            reason = site.reason;
          } else if (site.y !== undefined) {
            ty = site.y;
          }
        }
      } else if (defId === 'boat') {
        if (typeof World !== 'undefined' && !World.inWaterAt(tx, (CFG.WATER_Y || 4.82) - 0.2, tz)) {
          valid = false;
          reason = '🛶 Perahu hanya bisa diletakkan di air';
        }
      } else if (!isCastle && defId !== 'house' && defId !== 'boat' && ty < (CFG.WATER_Y || 4.82)) {
        valid = false;
        reason = '🌊 Tidak bisa memasang di air';
      }

      if (valid && typeof Furni !== 'undefined' && Furni.list) {
        for (const f of Furni.list) {
          if (isCastle && f.def && f.def.startsWith('castle')) {
            if (Math.hypot(f.x - tx, f.z - tz) < 12) {
              valid = false;
              reason = 'Terlalu dekat dengan kastil lain';
              break;
            }
          } else if (!isCastle && Math.hypot(f.x - tx, f.z - tz) < 0.9) {
            valid = false;
            reason = 'Sudah ada perabot di situ';
            break;
          }
        }
      }

      this.furniTarget = { x: tx, y: ty, z: tz, defId, valid, reason };
      this.furniInvalidReason = reason;

      if (!this.furniGhost) this.updateFurniGhostModel();
      if (this.furniGhost) {
        this.furniGhost.visible = true;
        this.furniGhost.position.set(tx, ty, tz);
        this.furniGhost.rotation.y = this.furniYaw;
        const em = valid ? 0x245c24 : 0x6b1a12;
        for (const m of this.furniGhostMats) {
          if (m && m.emissive) m.emissive.setHex(em);
        }
      }
      return;
    }

    if (this.furniGhost) this.furniGhost.visible = false;

    if (this.isDragging) {
      // Saat drag sedang berjalan, posisi area diperbarui di onPointerMove
      return;
    }

    // Single block preview saat hover normal
    const target = this.raycastTarget();
    if (!target) {
      this.currentTarget = null;
      if (this.ghostGroup) this.ghostGroup.visible = false;
      return;
    }

    this.currentTarget = target;
    const { px, py, pz } = target;
    const held = this.getHeldBlock();
    const canPlace = !!held && this.canPlaceBlock(px, py, pz);

    this.ghostGroup.visible = true;
    if (this.multiGhostGroup) this.multiGhostGroup.visible = false;
    this.ghostGroup.position.set(px + 0.5, py + 0.5, pz + 0.5);

    if (canPlace) {
      const it = ITEMS[held.id];
      const bColor = (it && BLOCK_INFO[it.blockId]) ? BLOCK_INFO[it.blockId].color : 0x58b868;
      this.ghostMesh.material.color.setHex(bColor);
      this.ghostMesh.material.opacity = 0.55;
      this.ghostLines.material.color.setHex(0xffffff);
    } else {
      this.ghostMesh.material.color.setHex(0xdd3333);
      this.ghostMesh.material.opacity = 0.45;
      this.ghostLines.material.color.setHex(0xff5555);
    }
  },

  /* =========================================================================
     SISTEM DRAG HORIZONTAL & KONFIRMASI PEMASANGAN BLOK / FURNITUR
     ========================================================================= */

  onPointerDown(screenX, screenY) {
    if (!this.active || this.isConfirming) return false;

    if (this.mode === 'furniture') {
      const held = this.getHeldFurni();
      if (!held || held.n <= 0) {
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast('🪑 Pilih furnitur di tab Furnitur terlebih dahulu!');
        }
        return false;
      }

      // Drag khusus pagar menyambung panjang
      if (held.id.startsWith('f_fence')) {
        const t = this.raycastTarget(screenX, screenY);
        if (!t) return false;
        this.isDragging = true;
        this.dragStart = { ...t };
        this.dragCurrent = { ...t };
        this.updateFenceDragSelection();
        return true;
      }

      if (!this.furniTarget) return false;
      if (!this.furniTarget.valid) {
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast('❌ ' + (this.furniInvalidReason || 'Tidak bisa meletakkan di sini'));
        }
        if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
        return false;
      }

      const { x, y, z, defId } = this.furniTarget;
      if (typeof Furni !== 'undefined' && Furni.place) {
        const placed = Furni.place(defId, x, y, z, this.furniYaw, false);
        if (!placed) return false;
      }

      // Potong 1 item dari furniBag
      held.n--;
      if (held.n <= 0) {
        if (RPG.selectedFurniSlot >= 0 && RPG.furniBag) {
          RPG.furniBag[RPG.selectedFurniSlot] = null;
        }
      }

      if (typeof Sfx !== 'undefined' && Sfx.craft) Sfx.craft();
      if (typeof FX !== 'undefined' && FX.debris) {
        FX.debris(new THREE.Vector3(x, y + 0.4, z), 0xd6b06a, 8, 1.6);
      }
      const def = (typeof Furni !== 'undefined') ? Furni.DEFS[defId] : null;
      if (typeof UI !== 'undefined' && UI.toast && def) {
        UI.toast(`${def.e || '📦'} ${def.n || 'Furnitur'} diletakkan`);
      }

      this.updateHUD();
      if (typeof UI !== 'undefined' && UI.renderFurniBag) UI.renderFurniBag();

      if (held.n > 0) {
        this.updateFurniGhostModel();
      } else {
        this.ensureSelectedFurni();
        this.updateFurniGhostModel();
      }
      return true;
    }

    const held = this.getHeldBlock();
    if (!held || held.n <= 0) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('🧱 Pilih blok di tab Block tas terlebih dahulu!');
      }
      return false;
    }

    const t = this.raycastTarget(screenX, screenY);
    if (!t) return false;

    this.isDragging = true;
    this.dragStart = { ...t };
    this.dragCurrent = { ...t };
    this.updateDragSelection();
    return true;
  },

  onPointerMove(screenX, screenY) {
    if (!this.active || !this.isDragging || this.isConfirming) return;
    const t = this.raycastTarget(screenX, screenY);
    if (!t) return;

    if (this.mode === 'furniture') {
      this.dragCurrent = { ...t };
      this.updateFenceDragSelection();
      return;
    }

    // KUNCI HORIZONTAL: Ketinggian py dikunci sama persis dengan dragStart.py
    this.dragCurrent = {
      px: t.px,
      py: this.dragStart.py,
      pz: t.pz,
      bx: t.bx,
      by: t.by,
      bz: t.bz,
    };
    this.updateDragSelection();
  },

  updateFenceDragSelection() {
    if (!this.dragStart || !this.dragCurrent) return;
    const held = this.getHeldFurni();
    if (!held || !held.id.startsWith('f_fence')) return;
    const defId = ITEMS[held.id].place;
    const tier = parseInt(defId.replace('fence', '')) || 1;

    const x0 = Math.floor(this.dragStart.px);
    const z0 = Math.floor(this.dragStart.pz);
    const x1 = Math.floor(this.dragCurrent.px);
    const z1 = Math.floor(this.dragCurrent.pz);

    const dx = x1 - x0;
    const dz = z1 - z0;
    const isXMajor = Math.abs(dx) >= Math.abs(dz);

    const available = (typeof RPG !== 'undefined' && RPG.countFurni) ? RPG.countFurni(held.id) : (held.n || 1);
    const points = [];

    if (isXMajor) {
      const stepX = dx >= 0 ? 1 : -1;
      const span = Math.min(Math.abs(dx), Math.min(available - 1, 30));
      for (let i = 0; i <= span; i++) {
        points.push({ x: x0 + i * stepX, z: z0 });
      }
    } else {
      const stepZ = dz >= 0 ? 1 : -1;
      const span = Math.min(Math.abs(dz), Math.min(available - 1, 30));
      for (let i = 0; i <= span; i++) {
        points.push({ x: x0, z: z0 + i * stepZ });
      }
    }

    this.dragSelection = [];
    if (this.furniGhost) this.furniGhost.visible = false;
    if (this.ghostGroup) this.ghostGroup.visible = false;
    this.multiGhostGroup.visible = true;

    while (this.multiGhostGroup.children.length > 0) {
      this.multiGhostGroup.remove(this.multiGhostGroup.children[0]);
    }

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      let site = { ok: true, y: World.groundAt(pt.x + 0.5, pt.z + 0.5, Math.floor(Player.pos.y) + 2) };
      if (typeof FurniCastle !== 'undefined' && FurniCastle.fenceSiteCheck) {
        site = FurniCastle.fenceSiteCheck(pt.x + 0.5, pt.z + 0.5);
      }
      const valid = site.ok;
      const py = site.y || 1;
      this.dragSelection.push({ px: pt.x + 0.5, py, pz: pt.z + 0.5, valid, defId });

      const conn = {
        n: (i > 0 && !isXMajor && dz < 0) || (i < points.length - 1 && !isXMajor && dz > 0),
        s: (i > 0 && !isXMajor && dz > 0) || (i < points.length - 1 && !isXMajor && dz < 0),
        w: (i > 0 && isXMajor && dx > 0) || (i < points.length - 1 && isXMajor && dx < 0),
        e: (i > 0 && isXMajor && dx < 0) || (i < points.length - 1 && isXMajor && dx > 0)
      };

      const g = new THREE.Group();
      g.position.set(pt.x + 0.5, py, pt.z + 0.5);

      // Kotak panduan voxel dinamis + garis tepi kawat (persis seperti mode block drag)
      const bColor = valid ? 0x58b868 : 0xdd3333;
      const boxMesh = new THREE.Mesh(this.sharedBoxGeo, valid ? this.sharedValidMat : this.sharedInvalidMat);
      boxMesh.position.set(0, 0.5, 0);
      if (valid) boxMesh.material.color.setHex(bColor);
      g.add(boxMesh);

      const lines = new THREE.LineSegments(this.sharedEdgesGeo, this.sharedLineMat);
      lines.position.set(0, 0.5, 0);
      g.add(lines);

      // Model 3D pagar bersambung di dalam kotak
      if (typeof FurniCastle !== 'undefined' && FurniCastle.buildFence) {
        const previewMesh = FurniCastle.buildFence(tier, conn);
        previewMesh.traverse(o => {
          if (o.isMesh && o.material) {
            o.material = o.material.clone();
            o.material.transparent = true;
            o.material.opacity = 0.7;
            if (o.material.emissive) o.material.emissive.setHex(valid ? 0x245c24 : 0x6b1a12);
          }
        });
        g.add(previewMesh);
      }

      this.multiGhostGroup.add(g);
    }
  },

  updateDragSelection() {
    if (!this.dragStart || !this.dragCurrent) return;

    const minX = Math.min(this.dragStart.px, this.dragCurrent.px);
    const maxX = Math.max(this.dragStart.px, this.dragCurrent.px);
    const minZ = Math.min(this.dragStart.pz, this.dragCurrent.pz);
    const maxZ = Math.max(this.dragStart.pz, this.dragCurrent.pz);
    const py = this.dragStart.py;

    // Batas bentang horizontal maksimum (12x12 = 144 blok) agar performa tetap ringan
    const spanX = Math.min(11, maxX - minX);
    const spanZ = Math.min(11, maxZ - minZ);
    const finalMaxX = minX + spanX;
    const finalMaxZ = minZ + spanZ;

    this.dragSelection = [];
    const held = this.getHeldBlock();
    const it = held ? ITEMS[held.id] : null;
    const bColor = (it && BLOCK_INFO[it.blockId]) ? BLOCK_INFO[it.blockId].color : 0x58b868;
    /* Ghost hanya boleh menampilkan sejumlah blok yang benar-benar tersedia di tas.
       Bila drag lebih luas dari sisa blok, sel sisanya ditandai invalid (abu-abu)
       sehingga tidak ikut dipasang & tidak menambah ghost valid. */
    const available = (typeof RPG !== 'undefined' && RPG.countBlock && held)
      ? RPG.countBlock(held.id) : (held ? held.n : 0);
    let validLeft = available;

    for (let x = minX; x <= finalMaxX; x++) {
      for (let z = minZ; z <= finalMaxZ; z++) {
        let valid = this.canPlaceBlock(x, py, z);
        if (valid && validLeft <= 0) valid = false; // habiskan jatah blok
        if (valid) validLeft--;
        this.dragSelection.push({ px: x, py, pz: z, valid });
      }
    }

    // Jika hanya 1 blok, gunakan single ghost biasa
    if (this.dragSelection.length <= 1) {
      if (this.multiGhostGroup) this.multiGhostGroup.visible = false;
      if (this.ghostGroup) {
        this.ghostGroup.visible = true;
        this.ghostGroup.position.set(minX + 0.5, py + 0.5, minZ + 0.5);
      }
      return;
    }

    // Jika lebih dari 1 blok, bangun multi-ghost visual
    if (this.ghostGroup) this.ghostGroup.visible = false;
    this.multiGhostGroup.visible = true;

    // Bersihkan objek multi ghost lama
    while (this.multiGhostGroup.children.length > 0) {
      this.multiGhostGroup.remove(this.multiGhostGroup.children[0]);
    }

    for (const item of this.dragSelection) {
      const g = new THREE.Group();
      g.position.set(item.px + 0.5, item.py + 0.5, item.pz + 0.5);

      const m = new THREE.Mesh(this.sharedBoxGeo, item.valid ? this.sharedValidMat : this.sharedInvalidMat);
      if (item.valid) m.material.color.setHex(bColor);
      g.add(m);

      const l = new THREE.LineSegments(this.sharedEdgesGeo, this.sharedLineMat);
      g.add(l);

      this.multiGhostGroup.add(g);
    }
  },

  onPointerUp(screenX, screenY) {
    if (!this.active || !this.isDragging) return;
    this.isDragging = false;

    if (this.mode === 'furniture') {
      if (this.dragSelection && this.dragSelection.length > 0) {
        const held = this.getHeldFurni();
        if (held && held.id.startsWith('f_fence')) {
          let placed = 0;
          for (const item of this.dragSelection) {
            if (!item.valid) continue;
            if (held.n <= 0) break;
            const res = (typeof Furni !== 'undefined' && Furni.place)
              ? Furni.place(item.defId, item.px, item.py, item.pz, 0, false) : null;
            if (res) {
              held.n--;
              placed++;
            }
          }
          if (placed > 0) {
            if (held.n <= 0 && RPG.selectedFurniSlot >= 0 && RPG.furniBag) {
              RPG.furniBag[RPG.selectedFurniSlot] = null;
            }
            if (typeof Sfx !== 'undefined' && Sfx.craft) Sfx.craft();
            if (typeof UI !== 'undefined') {
              UI.toast(`🛡️ ${placed} pagar terpasang menyambung rapi`);
              if (UI.renderFurniBag) UI.renderFurniBag();
            }
            if (typeof FurniCastle !== 'undefined' && FurniCastle.rebuildFences) {
              FurniCastle.rebuildFences();
            }
            this.updateHUD();
          }
        }
      }
      this.clearDragSelection();
      if (this.multiGhostGroup) this.multiGhostGroup.visible = false;
      if (this.furniGhost) this.furniGhost.visible = true;
      return;
    }

    if (!this.dragSelection || this.dragSelection.length === 0) {
      this.clearDragSelection();
      return;
    }

    const held = this.getHeldBlock();
    if (!held || held.n <= 0) {
      this.clearDragSelection();
      return;
    }

    // Kasus 1: Klik tunggal (single click/tap tanpa drag luas)
    if (this.dragSelection.length === 1) {
      const b = this.dragSelection[0];
      this.placeSingleBlock(b.px, b.py, b.pz);
      this.clearDragSelection();
      return;
    }

    // Kasus 2: Drag horizontal multi-blok (> 1 blok)
    const validBlocks = this.dragSelection.filter(b => b.valid);
    const available = (typeof RPG !== 'undefined' && RPG.countBlock) ? RPG.countBlock(held.id) : held.n;
    const countToPlace = Math.min(validBlocks.length, available);

    if (countToPlace <= 0) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('❌ Tidak ada posisi yang valid atau blok di tas tidak cukup!');
      }
      this.clearDragSelection();
      return;
    }

    // Tampilkan modal konfirmasi di tengah layar
    this.isConfirming = true;
    const it = ITEMS[held.id];
    const bName = it ? it.n : 'Blok';
    const minX = Math.min(this.dragStart.px, this.dragCurrent.px);
    const maxX = Math.max(this.dragStart.px, this.dragCurrent.px);
    const minZ = Math.min(this.dragStart.pz, this.dragCurrent.pz);
    const maxZ = Math.max(this.dragStart.pz, this.dragCurrent.pz);
    const w = (maxX - minX + 1);
    const d = (maxZ - minZ + 1);

    if (typeof UI !== 'undefined' && UI.modal) {
      UI.modal({
        icon: UI.itemIcon ? UI.itemIcon(held.id) : (it ? it.e : '🧱'),
        text: `Apakah kamu yakin ingin memasang <b>${countToPlace}</b> ${bName}?<br><span class="m-sub">Area seleksi: ${w}×${d} blok (Tersedia di tas: ${available})</span>`,
        okLabel: `✔ Ya, Pasang (${countToPlace})`,
        cancelLabel: '✖ Batal',
        onOk: () => {
          this.isConfirming = false;
          this.executeMultiPlace(validBlocks.slice(0, countToPlace), held.id);
          this.clearDragSelection();
        },
        onCancel: () => {
          this.isConfirming = false;
          this.clearDragSelection();
        }
      });
    } else {
      this.isConfirming = false;
      this.executeMultiPlace(validBlocks.slice(0, countToPlace), held.id);
      this.clearDragSelection();
    }
  },

  clearDragSelection() {
    this.dragStart = null;
    this.dragCurrent = null;
    this.dragSelection = [];
    if (this.multiGhostGroup) {
      while (this.multiGhostGroup.children.length > 0) {
        this.multiGhostGroup.remove(this.multiGhostGroup.children[0]);
      }
      this.multiGhostGroup.visible = false;
    }
    if (this.ghostGroup && this.active) {
      this.ghostGroup.visible = true;
    }
  },

  placeSingleBlock(px, py, pz) {
    const held = this.getHeldBlock();
    if (!held || held.n <= 0) return false;

    if (!this.canPlaceBlock(px, py, pz)) {
      if (Math.hypot(px + 0.5 - Player.pos.x, pz + 0.5 - Player.pos.z) > 7.5) {
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('📏 Terlalu jauh! Mendekatlah.');
      } else {
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('❌ Tidak bisa memasang blok di sini!');
      }
      return false;
    }

    const it = ITEMS[held.id];
    const blockId = (it && it.blockId !== undefined) ? it.blockId : B.DIRT;

    World.setBlock(px, py, pz, blockId);
    this.customBlocks[px + ',' + py + ',' + pz] = blockId;
    this.saveBlocks();

    held.n--;
    if (held.n <= 0) {
      if (RPG.selectedBlockSlot >= 0 && RPG.blockBag[RPG.selectedBlockSlot] === held) {
        RPG.blockBag[RPG.selectedBlockSlot] = null;
      }
      this.ensureSelectedBlock();
    }

    const col = (BLOCK_INFO[blockId] && BLOCK_INFO[blockId].color) || 0x888888;
    if (typeof FX !== 'undefined' && FX.debris) {
      FX.debris(new THREE.Vector3(px + 0.5, py + 0.5, pz + 0.5), col, 6, 1.8);
    }
    if (typeof Sfx !== 'undefined' && Sfx.chop) Sfx.chop();

    this.updateHUD();
    if (typeof UI !== 'undefined') {
      if (UI.open === 'bag' && UI.renderBlockBag) UI.renderBlockBag();
      if (UI.markInvDirty) UI.markInvDirty();
    }
    return true;
  },

  executeMultiPlace(blocks, itemId) {
    if (!blocks || !blocks.length) return;
    const it = ITEMS[itemId];
    const blockId = (it && it.blockId !== undefined) ? it.blockId : B.DIRT;
    const col = (BLOCK_INFO[blockId] && BLOCK_INFO[blockId].color) || 0x888888;

    for (const b of blocks) {
      World.setBlock(b.px, b.py, b.pz, blockId);
      this.customBlocks[b.px + ',' + b.py + ',' + b.pz] = blockId;
      if (typeof FX !== 'undefined' && FX.debris) {
        FX.debris(new THREE.Vector3(b.px + 0.5, b.py + 0.5, b.pz + 0.5), col, 4, 1.4);
      }
    }
    this.saveBlocks();

    if (typeof RPG !== 'undefined' && RPG.removeBlock) {
      RPG.removeBlock(itemId, blocks.length);
    }
    this.ensureSelectedBlock();

    if (typeof Sfx !== 'undefined' && Sfx.craft) Sfx.craft();
    if (typeof UI !== 'undefined') {
      if (UI.toast) UI.toast(`🏗️ Berhasil memasang ${blocks.length} ${it ? it.n : 'Blok'}!`);
      if (UI.open === 'bag' && UI.renderBlockBag) UI.renderBlockBag();
      if (UI.markInvDirty) UI.markInvDirty();
    }
    this.updateHUD();
  },

  // Kompatibilitas panggilan langsung placeAt
  placeAt(screenX, screenY) {
    return this.placeSingleBlock(
      this.currentTarget ? this.currentTarget.px : 0,
      this.currentTarget ? this.currentTarget.py : 0,
      this.currentTarget ? this.currentTarget.pz : 0
    );
  }
};

window.BuildSys = BuildSys;
