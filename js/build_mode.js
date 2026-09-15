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

  init() {
    if (this.initialized || typeof THREE === 'undefined' || !Game.scene) return;

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
        <div class="bh-body">
          <div id="bh-slot" class="bh-slot">
            <div id="bh-block-ico" class="bh-ico">🧱</div>
            <div class="bh-info">
              <div id="bh-block-name" class="bh-name">Memuat...</div>
              <div id="bh-block-cnt" class="bh-cnt">×0</div>
            </div>
          </div>
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

    const bagBtn = document.getElementById('bh-bag-btn');
    if (bagBtn) {
      bagBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof UI !== 'undefined') {
          UI.toggle('bag');
          UI.setBagPage('blocks');
        }
      });
    }
  },

  toggle(force) {
    if (!this.initialized) this.init();

    this.active = (force !== undefined) ? !!force : !this.active;
    this.clearDragSelection();
    this.isDragging = false;

    if (this.ghostGroup) this.ghostGroup.visible = this.active;
    if (this.multiGhostGroup) this.multiGhostGroup.visible = false;

    const mBtn = document.getElementById('m-build');
    if (mBtn) mBtn.classList.toggle('active', this.active);

    const hud = document.getElementById('build-hud');
    if (hud) hud.style.display = this.active ? 'block' : 'none';

    if (this.active) {
      this.ensureSelectedBlock();
      this.updateHUD();
      if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
      if (typeof UI !== 'undefined' && UI.toast) {
        const blk = this.getHeldBlock();
        const bName = blk && ITEMS[blk.id] ? ITEMS[blk.id].n : 'Blok';
        UI.toast(`🏗️ Mode Bangun: ${bName}`);
      }
    } else {
      this.currentTarget = null;
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

  ensureSelectedBlock() {
    const s = this.getHeldBlock();
    if (!s) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('🧱 Belum ada blok di tas! Kumpulkan blok dari biome terlebih dahulu.');
      }
    }
    return s;
  },

  updateHUD() {
    const s = this.getHeldBlock();
    const icoEl = document.getElementById('bh-block-ico');
    const nameEl = document.getElementById('bh-block-name');
    const cntEl = document.getElementById('bh-block-cnt');
    if (!s) {
      if (icoEl) icoEl.textContent = '🧱';
      if (nameEl) nameEl.textContent = 'Tidak ada blok';
      if (cntEl) cntEl.textContent = '×0';
      return;
    }
    const it = ITEMS[s.id];
    if (icoEl) icoEl.innerHTML = (typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(s.id) : (it ? it.e : '🧱');
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

    for (const hit of hits) {
      if (hit.object && hit.object.geometry && hit.face) {
        const pt = hit.point;
        const norm = hit.face.normal;

        const bx = Math.floor(pt.x - norm.x * 0.1);
        const by = Math.floor(pt.y - norm.y * 0.1);
        const bz = Math.floor(pt.z - norm.z * 0.1);

        const hitBid = World.getBlock(bx, by, bz);
        if (hitBid === B.AIR || hitBid === B.WATER) continue;

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
      return;
    }

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
     SISTEM DRAG HORIZONTAL & KONFIRMASI PEMASANGAN BLOK
     ========================================================================= */

  onPointerDown(screenX, screenY) {
    if (!this.active || this.isConfirming) return false;
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

    for (let x = minX; x <= finalMaxX; x++) {
      for (let z = minZ; z <= finalMaxZ; z++) {
        const valid = this.canPlaceBlock(x, py, z);
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
      if (typeof FX !== 'undefined' && FX.debris) {
        FX.debris(new THREE.Vector3(b.px + 0.5, b.py + 0.5, b.pz + 0.5), col, 4, 1.4);
      }
    }

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
