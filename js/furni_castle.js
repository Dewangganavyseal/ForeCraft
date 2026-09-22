'use strict';
/* =========================================================================
   FURNI CASTLE — Model 3D Kastil, Pagar Organik, dan Gerbang Animasi
   Porting dari NEW MODEL/Kastil dan Pagar.html ke sistem Furni ForeCraft.
   ========================================================================= */

const FurniCastle = (() => {
  /* ---------- TEXTURES (Pixel-art canvas texture generator) ---------- */
  function generateBlockTexture(type) {
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16;
    const c = cv.getContext('2d');
    let sd = 42;
    const rr = () => { sd ^= sd << 13; sd ^= sd >>> 17; sd ^= sd << 5; return (sd >>> 0) / 4294967296; };
    const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };

    if (type === 'stone') {
      c.fillStyle = '#8a8f98'; c.fillRect(0, 0, 16, 16);
      const vars = ['#7b8089', '#9aa0a8', '#6f747d'];
      for (let k = 0; k < 80; k++) px((rr()*16)|0, (rr()*16)|0, vars[(rr()*vars.length)|0]);
      for (let k = 0; k < 6; k++) {
        const x = (rr()*14)|0, y = (rr()*14)|0;
        px(x, y, '#5c616a'); px(x + 1, y + 1, '#5c616a');
      }
    } else if (type === 'stone_dark') {
      c.fillStyle = '#4c525a'; c.fillRect(0, 0, 16, 16);
      const vars = ['#3e434a', '#585e68', '#34383e'];
      for (let k = 0; k < 80; k++) px((rr()*16)|0, (rr()*16)|0, vars[(rr()*vars.length)|0]);
      for (let k = 0; k < 6; k++) {
        const x = (rr()*14)|0, y = (rr()*14)|0;
        px(x, y, '#282b30'); px(x + 1, y + 1, '#282b30');
      }
    } else if (type === 'wood_log') {
      for (let x = 0; x < 16; x++) {
        const col = x % 4 < 2 ? '#6e4f2f' : '#5d4126';
        for (let y = 0; y < 16; y++) px(x, y, col);
      }
      for (let k = 0; k < 26; k++) px((rr()*16)|0, (rr()*16)|0, '#523719');
    } else if (type === 'plank') {
      for (let y = 0; y < 16; y++) {
        const col = (y % 5 === 0) ? '#8a6236' : (y % 2 ? '#b98a55' : '#c49560');
        for (let x = 0; x < 16; x++) px(x, y, col);
      }
      for (let k = 0; k < 18; k++) px((rr()*16)|0, (rr()*16)|0, '#a37a48');
    } else if (type === 'roof') {
      c.fillStyle = '#9c5a3c'; c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y += 4) {
        c.fillStyle = '#7a3b22'; c.fillRect(0, y, 16, 1);
        for (let x = 0; x < 16; x += 4) {
          const ox = (y % 8 === 0) ? 0 : 2;
          c.fillStyle = '#652a16'; c.fillRect((x + ox) % 16, y, 1, 4);
        }
      }
      for (let k = 0; k < 20; k++) px((rr()*16)|0, (rr()*16)|0, '#b86b4a');
    } else if (type === 'iron') {
      c.fillStyle = '#34383f'; c.fillRect(0, 0, 16, 16);
      const vars = ['#282c32', '#41474f', '#4f5660'];
      for (let k = 0; k < 60; k++) px((rr()*16)|0, (rr()*16)|0, vars[(rr()*vars.length)|0]);
      px(2, 2, '#707a86'); px(13, 2, '#707a86'); px(2, 13, '#707a86'); px(13, 13, '#707a86');
    } else if (type === 'gold') {
      c.fillStyle = '#d9b23a'; c.fillRect(0, 0, 16, 16);
      const vars = ['#c49b25', '#ecc044', '#ffe07a'];
      for (let k = 0; k < 60; k++) px((rr()*16)|0, (rr()*16)|0, vars[(rr()*vars.length)|0]);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  let TEX = null;
  let MATS = null;

  function initMaterials() {
    if (MATS) return;
    TEX = {
      stone:     generateBlockTexture('stone'),
      stoneDark: generateBlockTexture('stone_dark'),
      woodLog:   generateBlockTexture('wood_log'),
      plank:     generateBlockTexture('plank'),
      roof:      generateBlockTexture('roof'),
      iron:      generateBlockTexture('iron'),
      gold:      generateBlockTexture('gold')
    };

    MATS = {
      stone:      new THREE.MeshLambertMaterial({ map: TEX.stone }),
      stoneDark:  new THREE.MeshLambertMaterial({ map: TEX.stoneDark }),
      woodLog:    new THREE.MeshLambertMaterial({ map: TEX.woodLog }),
      plank:      new THREE.MeshLambertMaterial({ map: TEX.plank }),
      roof:       new THREE.MeshLambertMaterial({ map: TEX.roof }),
      iron:       new THREE.MeshLambertMaterial({ map: TEX.iron }),
      gold:       new THREE.MeshLambertMaterial({ map: TEX.gold }),

      bannerRed:  new THREE.MeshLambertMaterial({ color: 0x9e2424 }),
      bannerBlue: new THREE.MeshLambertMaterial({ color: 0x244f9e }),
      carpetRed:  new THREE.MeshLambertMaterial({ color: 0x8b1a1a }),
      throneCloth:new THREE.MeshLambertMaterial({ color: 0x6b1414 }),
      fire:       new THREE.MeshBasicMaterial({ color: 0xff7722 }),
      fireCore:   new THREE.MeshBasicMaterial({ color: 0xffdd77 }),
      crystal:    new THREE.MeshBasicMaterial({ color: 0x5ce1e6 })
    };
  }

  function createBox(w, h, d, mat, x=0, y=0, z=0, rx=0, ry=0, rz=0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (rx) mesh.rotation.x = rx;
    if (ry) mesh.rotation.y = ry;
    if (rz) mesh.rotation.z = rz;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /* =========================================================================
     BUILDER KASTIL (14x14, 17x17, 20x20 — ATAP RAPAT TERTUTUP & INTERIOR WALKABLE)
     ========================================================================= */
  const CastleBuilder = {
    getCastleSize(tier) {
      if (tier === 1) return 14;
      if (tier === 2) return 17;
      return 20;
    },

    buildCastle(tier = 1, doorOpen = 0, openRoof = false) {
      initMaterials();
      const size = this.getCastleSize(tier);
      const group = new THREE.Group();
      group.name = `Castle_Tier_${tier}_${size}x${size}`;
      group.userData = { type: 'castle', tier, size, openRoof };

      const half = size / 2;
      const stoneMat = tier === 3 ? MATS.stoneDark : MATS.stone;

      // Group khusus atap yang dapat disembunyikan saat mode interior aktif
      const roofGroup = new THREE.Group();
      roofGroup.name = "CastleRoofGroup";
      group.add(roofGroup);
      group.userData.roofGroup = roofGroup;

      // 1. PONDASI & LANTAI INTERIOR (B.STONE & B.PLANK)
      group.add(createBox(size + 0.4, 0.4, size + 0.4, MATS.stone, 0, 0.2, 0));
      group.add(createBox(size - 0.4, 0.1, size - 0.4, MATS.plank, 0, 0.45, 0));

      // 2. EMPAT MENARA SUDUT BENTENG
      const towerW = tier === 1 ? 3.0 : (tier === 2 ? 4.0 : 5.0);
      const towerH = tier === 1 ? 9.0 : (tier === 2 ? 12.0 : 15.0);
      const wallH  = tier === 1 ? 6.2 : (tier === 2 ? 8.0 : 10.0);

      const cornerDist = half - towerW / 2;
      const corners = [
        { x: -cornerDist, z: -cornerDist },
        { x:  cornerDist, z: -cornerDist },
        { x: -cornerDist, z:  cornerDist },
        { x:  cornerDist, z:  cornerDist }
      ];

      corners.forEach(pos => {
        const tower = new THREE.Group();
        tower.position.set(pos.x, 0, pos.z);

        tower.add(createBox(towerW, towerH, towerW, stoneMat, 0, towerH / 2, 0));

        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const colX = sx * (towerW / 2 - 0.2);
            const colZ = sz * (towerW / 2 - 0.2);
            tower.add(createBox(0.45, towerH + 0.3, 0.45, MATS.woodLog, colX, (towerH + 0.3) / 2, colZ));
          }
        }

        const bibirW = towerW + 0.8;
        tower.add(createBox(bibirW, 0.7, bibirW, MATS.stone, 0, towerH + 0.35, 0));

        const step = 0.8;
        for (let ox = -bibirW/2 + 0.4; ox <= bibirW/2 - 0.4; ox += step) {
          tower.add(createBox(0.45, 0.9, 0.35, MATS.stone, ox, towerH + 1.1, bibirW/2 - 0.17));
          tower.add(createBox(0.45, 0.9, 0.35, MATS.stone, ox, towerH + 1.1, -bibirW/2 + 0.17));
        }
        for (let oz = -bibirW/2 + 0.4; oz <= bibirW/2 - 0.4; oz += step) {
          tower.add(createBox(0.35, 0.9, 0.45, MATS.stone, bibirW/2 - 0.17, towerH + 1.1, oz));
          tower.add(createBox(0.35, 0.9, 0.45, MATS.stone, -bibirW/2 + 0.17, towerH + 1.1, oz));
        }

        // Atap menara sudut (disatukan ke roofGroup agar tidak bolong)
        if (tier === 1) {
          const tRoof1 = createBox(towerW + 0.2, 0.5, towerW + 0.2, MATS.roof, pos.x, towerH + 1.3, pos.z);
          const tRoof2 = createBox(towerW - 0.8, 0.5, towerW - 0.8, MATS.roof, pos.x, towerH + 1.8, pos.z);
          const tRoof3 = createBox(towerW - 1.8, 0.5, towerW - 1.8, MATS.roof, pos.x, towerH + 2.3, pos.z);
          const tFinial = createBox(0.2, 0.8, 0.2, MATS.gold, pos.x, towerH + 2.8, pos.z);
          roofGroup.add(tRoof1); roofGroup.add(tRoof2); roofGroup.add(tRoof3); roofGroup.add(tFinial);
        } else if (tier === 2) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(towerW * 0.7, 4.2, 4), MATS.roof);
          cone.position.set(pos.x, towerH + 2.8, pos.z);
          cone.rotation.y = Math.PI / 4;
          cone.castShadow = true;
          const cFinial = createBox(0.2, 1.0, 0.2, MATS.gold, pos.x, towerH + 5.2, pos.z);
          roofGroup.add(cone); roofGroup.add(cFinial);
        } else if (tier === 3) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(towerW * 0.75, 5.8, 8), MATS.roof);
          cone.position.set(pos.x, towerH + 3.8, pos.z);
          cone.castShadow = true;
          const cFinial = createBox(0.25, 1.4, 0.25, MATS.gold, pos.x, towerH + 7.0, pos.z);
          roofGroup.add(cone); roofGroup.add(cFinial);
        }

        group.add(tower);
      });

      // 3. DINDING PERIMETER LUAR
      const wallLen = size - towerW * 2;
      const wallThick = tier === 1 ? 1.0 : (tier === 2 ? 1.2 : 1.5);
      const wallOffset = half - wallThick / 2;

      // Dinding Barat
      group.add(createBox(wallThick, wallH, wallLen, stoneMat, -wallOffset, wallH / 2, 0));
      group.add(createBox(0.8, 0.35, wallLen, MATS.plank, -wallOffset + wallThick/2 + 0.4, wallH - 0.2, 0));
      for (let z = -wallLen/2 + 0.5; z <= wallLen/2 - 0.5; z += 0.9) {
        group.add(createBox(0.3, 0.8, 0.45, MATS.stone, -half + 0.2, wallH + 0.4, z));
      }

      // Dinding Timur
      group.add(createBox(wallThick, wallH, wallLen, stoneMat, wallOffset, wallH / 2, 0));
      group.add(createBox(0.8, 0.35, wallLen, MATS.plank, wallOffset - wallThick/2 - 0.4, wallH - 0.2, 0));
      for (let z = -wallLen/2 + 0.5; z <= wallLen/2 - 0.5; z += 0.9) {
        group.add(createBox(0.3, 0.8, 0.45, MATS.stone, half - 0.2, wallH + 0.4, z));
      }

      // Dinding Belakang (Utara)
      group.add(createBox(wallLen, wallH, wallThick, stoneMat, 0, wallH / 2, -wallOffset));
      group.add(createBox(wallLen, 0.35, 0.8, MATS.plank, 0, wallH - 0.2, -wallOffset + wallThick/2 + 0.4));
      for (let x = -wallLen/2 + 0.5; x <= wallLen/2 - 0.5; x += 0.9) {
        group.add(createBox(0.45, 0.8, 0.3, MATS.stone, x, wallH + 0.4, -half + 0.2));
      }

      // 4. PINTU GERBANG UTAMA KASTIL (PINTU GANDA BUKA KANAN & KIRI)
      const gateW = tier === 1 ? 3.6 : (tier === 2 ? 4.6 : 5.8);
      const gateH = tier === 1 ? 4.5 : (tier === 2 ? 5.5 : 6.8);
      const gatehouseH = wallH + (tier === 1 ? 1.5 : (tier === 2 ? 2.5 : 3.5));

      const gateGroup = new THREE.Group();
      gateGroup.position.set(0, 0, wallOffset);

      const sideWallW = (wallLen - gateW) / 2;
      if (sideWallW > 0) {
        gateGroup.add(createBox(sideWallW, gatehouseH, wallThick, stoneMat, -(gateW/2 + sideWallW/2), gatehouseH / 2, 0));
        gateGroup.add(createBox(sideWallW, gatehouseH, wallThick, stoneMat,  (gateW/2 + sideWallW/2), gatehouseH / 2, 0));
      }

      // Lintel lengkung di atas gerbang
      const archH = gatehouseH - gateH;
      gateGroup.add(createBox(gateW + 0.6, archH, wallThick + 0.3, MATS.stone, 0, gateH + archH / 2, 0));
      gateGroup.add(createBox(1.2, 1.2, wallThick + 0.5, tier === 3 ? MATS.gold : MATS.stone, 0, gateH + archH / 2, 0.15));

      // DAUN PINTU GANDA KASTIL
      const doorLeafL = new THREE.Group();
      doorLeafL.name = "CastleDoorLeafL";
      doorLeafL.position.set(-gateW / 2, 0, 0);

      const doorLeafR = new THREE.Group();
      doorLeafR.name = "CastleDoorLeafR";
      doorLeafR.position.set(gateW / 2, 0, 0);

      const halfGateW = gateW / 2;
      const leafActualW = halfGateW - 0.04;
      const leafThick = 0.24;

      if (tier === 1) {
        doorLeafL.add(createBox(leafActualW, gateH - 0.06, leafThick, MATS.plank, leafActualW / 2, (gateH - 0.06) / 2, 0));
        for (const py of [0.22, 0.50, 0.78]) {
          doorLeafL.add(createBox(leafActualW + 0.02, 0.24, leafThick + 0.06, MATS.iron, leafActualW / 2, gateH * py, 0));
        }
        doorLeafL.add(createBox(0.20, 0.36, 0.32, MATS.iron, leafActualW - 0.35, gateH * 0.48, 0));

        doorLeafR.add(createBox(leafActualW, gateH - 0.06, leafThick, MATS.plank, -leafActualW / 2, (gateH - 0.06) / 2, 0));
        for (const py of [0.22, 0.50, 0.78]) {
          doorLeafR.add(createBox(leafActualW + 0.02, 0.24, leafThick + 0.06, MATS.iron, -leafActualW / 2, gateH * py, 0));
        }
        doorLeafR.add(createBox(0.20, 0.36, 0.32, MATS.iron, -(leafActualW - 0.35), gateH * 0.48, 0));
      } else if (tier === 2) {
        doorLeafL.add(createBox(leafActualW, gateH - 0.06, leafThick, MATS.woodLog, leafActualW / 2, (gateH - 0.06) / 2, 0));
        doorLeafL.add(createBox(leafActualW + 0.02, 0.28, leafThick + 0.06, MATS.iron, leafActualW / 2, gateH * 0.20, 0));
        doorLeafL.add(createBox(leafActualW + 0.02, 0.28, leafThick + 0.06, MATS.iron, leafActualW / 2, gateH * 0.80, 0));
        doorLeafL.add(createBox(0.22, gateH - 0.4, leafThick + 0.06, MATS.iron, leafActualW / 2, gateH / 2, 0));
        doorLeafL.add(createBox(0.24, 0.42, 0.34, MATS.gold, leafActualW - 0.38, gateH * 0.48, 0));

        doorLeafR.add(createBox(leafActualW, gateH - 0.06, leafThick, MATS.woodLog, -leafActualW / 2, (gateH - 0.06) / 2, 0));
        doorLeafR.add(createBox(leafActualW + 0.02, 0.28, leafThick + 0.06, MATS.iron, -leafActualW / 2, gateH * 0.20, 0));
        doorLeafR.add(createBox(leafActualW + 0.02, 0.28, leafThick + 0.06, MATS.iron, -leafActualW / 2, gateH * 0.80, 0));
        doorLeafR.add(createBox(0.22, gateH - 0.4, leafThick + 0.06, MATS.iron, -leafActualW / 2, gateH / 2, 0));
        doorLeafR.add(createBox(0.24, 0.42, 0.34, MATS.gold, -(leafActualW - 0.38), gateH * 0.48, 0));
      } else {
        doorLeafL.add(createBox(leafActualW, gateH - 0.06, leafThick, MATS.stoneDark, leafActualW / 2, (gateH - 0.06) / 2, 0));
        doorLeafL.add(createBox(leafActualW + 0.02, 0.32, leafThick + 0.08, MATS.gold, leafActualW / 2, gateH * 0.15, 0));
        doorLeafL.add(createBox(leafActualW + 0.02, 0.32, leafThick + 0.08, MATS.gold, leafActualW / 2, gateH * 0.85, 0));
        doorLeafL.add(createBox(0.28, gateH - 0.2, leafThick + 0.08, MATS.gold, 0.14, gateH / 2, 0));
        doorLeafL.add(createBox(0.28, gateH - 0.2, leafThick + 0.08, MATS.gold, leafActualW - 0.14, gateH / 2, 0));
        doorLeafL.add(createBox(0.65, 0.65, 0.34, MATS.gold, leafActualW / 2, gateH * 0.50, 0));
        doorLeafL.add(createBox(0.26, 0.46, 0.40, MATS.gold, leafActualW - 0.45, gateH * 0.48, 0));

        doorLeafR.add(createBox(leafActualW, gateH - 0.06, leafThick, MATS.stoneDark, -leafActualW / 2, (gateH - 0.06) / 2, 0));
        doorLeafR.add(createBox(leafActualW + 0.02, 0.32, leafThick + 0.08, MATS.gold, -leafActualW / 2, gateH * 0.15, 0));
        doorLeafR.add(createBox(leafActualW + 0.02, 0.32, leafThick + 0.08, MATS.gold, -leafActualW / 2, gateH * 0.85, 0));
        doorLeafR.add(createBox(0.28, gateH - 0.2, leafThick + 0.08, MATS.gold, -0.14, gateH / 2, 0));
        doorLeafR.add(createBox(0.28, gateH - 0.2, leafThick + 0.08, MATS.gold, -(leafActualW - 0.14), gateH / 2, 0));
        doorLeafR.add(createBox(0.65, 0.65, 0.34, MATS.gold, -leafActualW / 2, gateH * 0.50, 0));
        doorLeafR.add(createBox(0.26, 0.46, 0.40, MATS.gold, -(leafActualW - 0.45), gateH * 0.48, 0));
      }

      gateGroup.add(doorLeafL);
      gateGroup.add(doorLeafR);

      // Patung Penjaga Tier 3
      if (tier === 3) {
        gateGroup.add(createBox(0.9, 2.8, 0.9, MATS.stone, -(gateW/2 + 1.1), 1.4, 1.0));
        gateGroup.add(createBox(0.9, 2.8, 0.9, MATS.stone,  (gateW/2 + 1.1), 1.4, 1.0));
        gateGroup.add(createBox(1.0, 0.5, 1.0, MATS.gold, -(gateW/2 + 1.1), 2.9, 1.0));
        gateGroup.add(createBox(1.0, 0.5, 1.0, MATS.gold,  (gateW/2 + 1.1), 2.9, 1.0));
      }

      // Obor luar gerbang
      const torchOffset = gateW / 2 + 0.7;
      [-torchOffset, torchOffset].forEach(ox => {
        gateGroup.add(createBox(0.35, 0.6, 0.35, MATS.iron, ox, gateH * 0.7, wallThick/2 + 0.25));
        gateGroup.add(createBox(0.3, 0.45, 0.3, MATS.fire, ox, gateH * 0.7 + 0.45, wallThick/2 + 0.25));
        gateGroup.add(createBox(0.16, 0.25, 0.16, MATS.fireCore, ox, gateH * 0.7 + 0.45, wallThick/2 + 0.25));
      });

      group.add(gateGroup);

      // Daftarkan bagian pintu kastil
      group.userData.gateParts = {
        type: 'castle',
        leafL: doorLeafL,
        leafR: doorLeafR
      };

      // 5. INTERIOR AULA UTAMA & RUANG TAHTA AKBAR (BERONGGA & WALKABLE!)
      const interiorGroup = new THREE.Group();
      interiorGroup.name = "CastleInterior";

      // A. Karpet Merah Seremonial Panjang
      const carpetLen = size - 3.8;
      const carpetW = tier === 1 ? 2.0 : (tier === 2 ? 2.6 : 3.2);
      interiorGroup.add(createBox(carpetW, 0.05, carpetLen, MATS.carpetRed, 0, 0.52, (wallOffset - carpetLen/2) - 0.3));
      interiorGroup.add(createBox(0.10, 0.06, carpetLen, MATS.gold, -(carpetW/2 + 0.05), 0.52, (wallOffset - carpetLen/2) - 0.3));
      interiorGroup.add(createBox(0.10, 0.06, carpetLen, MATS.gold,  (carpetW/2 + 0.05), 0.52, (wallOffset - carpetLen/2) - 0.3));

      // B. Panggung Undakan Batu & Singgasana Tahta Raja
      const daisZ = -wallOffset + 2.0;
      const daisW = tier === 1 ? 3.6 : (tier === 2 ? 4.8 : 6.0);
      interiorGroup.add(createBox(daisW, 0.25, 2.6, MATS.stone, 0, 0.62, daisZ));
      interiorGroup.add(createBox(daisW - 0.8, 0.25, 2.0, MATS.stone, 0, 0.87, daisZ - 0.2));

      // Kursi Singgasana Tahta
      const throneGroup = new THREE.Group();
      throneGroup.position.set(0, 1.0, daisZ - 0.3);
      throneGroup.add(createBox(1.2, 0.5, 0.9, MATS.throneCloth, 0, 0.25, 0));
      throneGroup.add(createBox(1.2, 1.4, 0.25, MATS.throneCloth, 0, 1.0, -0.35));
      throneGroup.add(createBox(1.3, 0.3, 0.3, MATS.gold, 0, 1.75, -0.35));
      throneGroup.add(createBox(0.25, 0.45, 0.25, MATS.gold, 0, 2.05, -0.35));
      throneGroup.add(createBox(0.22, 0.45, 0.9, MATS.gold, -0.6, 0.6, 0));
      throneGroup.add(createBox(0.22, 0.45, 0.9, MATS.gold,  0.6, 0.6, 0));
      interiorGroup.add(throneGroup);

      // C. Pilar Kolonade Penopang Aula Interior & Obor Dinding
      const colZDist = half * 0.55;
      const colXDist = (half - wallThick) * 0.55;

      for (let z = -colZDist; z <= colZDist; z += 2.8) {
        for (const sx of [-1, 1]) {
          const colH = wallH - 0.4;
          interiorGroup.add(createBox(0.6, colH, 0.6, MATS.stone, sx * colXDist, colH / 2 + 0.45, z));
          interiorGroup.add(createBox(0.85, 0.35, 0.85, MATS.stoneDark, sx * colXDist, colH + 0.45, z));

          interiorGroup.add(createBox(0.22, 0.35, 0.22, MATS.iron, sx * (colXDist - 0.35), 2.8, z));
          interiorGroup.add(createBox(0.2, 0.3, 0.2, MATS.fire, sx * (colXDist - 0.35), 3.2, z));
          interiorGroup.add(createBox(0.12, 0.16, 0.12, MATS.fireCore, sx * (colXDist - 0.35), 3.2, z));
        }
      }

      // D. Meja Jamuan Panjang Kayu & Bangku
      [-1, 1].forEach(side => {
        const tableGroup = new THREE.Group();
        tableGroup.position.set(side * (colXDist + 1.4), 0.45, 0.2);
        tableGroup.add(createBox(1.1, 0.14, 3.6, MATS.plank, 0, 0.75, 0));
        for (let tz = -1.4; tz <= 1.4; tz += 2.8) {
          tableGroup.add(createBox(0.18, 0.7, 0.18, MATS.woodLog, -0.4, 0.35, tz));
          tableGroup.add(createBox(0.18, 0.7, 0.18, MATS.woodLog,  0.4, 0.35, tz));
        }
        tableGroup.add(createBox(0.4, 0.1, 3.6, MATS.plank, side * 0.8, 0.45, 0));
        interiorGroup.add(tableGroup);
      });

      // E. Spanduk Kerajaan Agung di Belakang Tahta
      interiorGroup.add(createBox(1.1, 4.2, 0.08, tier === 3 ? MATS.bannerRed : MATS.bannerBlue, -1.6, 4.2, -wallOffset + 0.6));
      interiorGroup.add(createBox(1.1, 4.2, 0.08, tier === 3 ? MATS.bannerRed : MATS.bannerBlue,  1.6, 4.2, -wallOffset + 0.6));

      group.add(interiorGroup);

      // 6. STRUKTUR ATAP KASTIL — 100% TERTUTUP RAPAT
      const innerSpan = size - wallThick * 2;
      roofGroup.add(createBox(innerSpan + 0.2, 0.4, innerSpan + 0.2, MATS.plank, 0, wallH - 0.15, 0));

      for (let bx = -half + wallThick + 1.2; bx <= half - wallThick - 1.2; bx += 2.4) {
        roofGroup.add(createBox(0.4, 0.45, innerSpan, MATS.woodLog, bx, wallH - 0.18, 0));
      }
      for (let bz = -half + wallThick + 1.2; bz <= half - wallThick - 1.2; bz += 2.4) {
        roofGroup.add(createBox(innerSpan, 0.45, 0.4, MATS.woodLog, 0, wallH - 0.18, bz));
      }

      const roofBaseY = wallH + 0.3;
      const outerSpan = size - wallThick * 2 + 0.6;

      if (tier === 1) {
        roofGroup.add(createBox(outerSpan, 0.55, outerSpan, MATS.roof, 0, roofBaseY, 0));
        roofGroup.add(createBox(outerSpan - 1.6, 0.55, outerSpan - 1.6, MATS.roof, 0, roofBaseY + 0.55, 0));
        roofGroup.add(createBox(outerSpan - 3.2, 0.55, outerSpan - 3.2, MATS.roof, 0, roofBaseY + 1.10, 0));
        roofGroup.add(createBox(outerSpan - 4.8, 0.55, outerSpan - 4.8, MATS.roof, 0, roofBaseY + 1.65, 0));

        const keepW = 5.8;
        roofGroup.add(createBox(keepW, 3.2, keepW, MATS.stone, 0, roofBaseY + 3.2, 0));
        roofGroup.add(createBox(keepW + 0.8, 0.6, keepW + 0.8, MATS.stoneDark, 0, roofBaseY + 5.0, 0));
        roofGroup.add(createBox(keepW + 0.4, 0.5, keepW + 0.4, MATS.roof, 0, roofBaseY + 5.5, 0));
        roofGroup.add(createBox(keepW - 1.4, 0.5, keepW - 1.4, MATS.roof, 0, roofBaseY + 6.0, 0));
        roofGroup.add(createBox(keepW - 3.0, 0.5, keepW - 3.0, MATS.roof, 0, roofBaseY + 6.5, 0));
        roofGroup.add(createBox(1.6, 0.6, 1.6, MATS.roof, 0, roofBaseY + 7.0, 0));
        roofGroup.add(createBox(0.25, 1.4, 0.25, MATS.gold, 0, roofBaseY + 8.0, 0));
      } else if (tier === 2) {
        roofGroup.add(createBox(outerSpan, 0.55, outerSpan, MATS.roof, 0, roofBaseY, 0));
        roofGroup.add(createBox(outerSpan - 1.8, 0.55, outerSpan - 1.8, MATS.roof, 0, roofBaseY + 0.55, 0));
        roofGroup.add(createBox(outerSpan - 3.6, 0.55, outerSpan - 3.6, MATS.roof, 0, roofBaseY + 1.10, 0));
        roofGroup.add(createBox(outerSpan - 5.4, 0.55, outerSpan - 5.4, MATS.roof, 0, roofBaseY + 1.65, 0));
        roofGroup.add(createBox(outerSpan - 7.2, 0.55, outerSpan - 7.2, MATS.roof, 0, roofBaseY + 2.20, 0));

        const keepW = 7.0;
        roofGroup.add(createBox(keepW, 4.5, keepW, MATS.stone, 0, roofBaseY + 4.4, 0));
        roofGroup.add(createBox(keepW + 0.8, 0.65, keepW + 0.8, MATS.stoneDark, 0, roofBaseY + 6.9, 0));
        const centerRoof = new THREE.Mesh(new THREE.ConeGeometry(keepW * 0.65, 5.5, 4), MATS.roof);
        centerRoof.position.set(0, roofBaseY + 9.8, 0);
        centerRoof.rotation.y = Math.PI / 4;
        centerRoof.castShadow = true;
        roofGroup.add(centerRoof);
        roofGroup.add(createBox(0.25, 1.6, 0.25, MATS.gold, 0, roofBaseY + 13.0, 0));
      } else {
        roofGroup.add(createBox(outerSpan, 0.6, outerSpan, MATS.roof, 0, roofBaseY, 0));
        roofGroup.add(createBox(outerSpan - 1.8, 0.6, outerSpan - 1.8, MATS.roof, 0, roofBaseY + 0.60, 0));
        roofGroup.add(createBox(outerSpan - 3.6, 0.6, outerSpan - 3.6, MATS.roof, 0, roofBaseY + 1.20, 0));
        roofGroup.add(createBox(outerSpan - 5.4, 0.6, outerSpan - 5.4, MATS.roof, 0, roofBaseY + 1.80, 0));
        roofGroup.add(createBox(outerSpan - 7.2, 0.6, outerSpan - 7.2, MATS.roof, 0, roofBaseY + 2.40, 0));
        roofGroup.add(createBox(outerSpan - 9.0, 0.6, outerSpan - 9.0, MATS.roof, 0, roofBaseY + 3.00, 0));

        const keepW = 8.6;
        roofGroup.add(createBox(keepW, 6.5, keepW, MATS.stoneDark, 0, roofBaseY + 6.2, 0));
        roofGroup.add(createBox(keepW + 1.0, 0.7, keepW + 1.0, MATS.gold, 0, roofBaseY + 9.8, 0));

        const grandCone = new THREE.Mesh(new THREE.ConeGeometry(keepW * 0.6, 7.8, 8), MATS.roof);
        grandCone.position.set(0, roofBaseY + 14.0, 0);
        grandCone.castShadow = true;
        roofGroup.add(grandCone);

        roofGroup.add(createBox(0.3, 2.2, 0.3, MATS.gold, 0, roofBaseY + 18.5, 0));
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.85), MATS.crystal);
        crystal.position.set(0, roofBaseY + 20.0, 0);
        crystal.name = "ArcaneCrystal";
        roofGroup.add(crystal);
      }

      roofGroup.visible = !openRoof;
      return group;
    }
  };

  /* =========================================================================
     BUILDER PAGAR & GERBANG ORGANIK
     ========================================================================= */
  const CastleFenceBuilder = {
    shouldHavePillar(connections) {
      const { n, s, w, e } = connections || {};
      const count = (n?1:0) + (s?1:0) + (w?1:0) + (e?1:0);
      const isStraight = (count === 2) && ((n && s) || (w && e));
      if (isStraight) return false;
      return true;
    },

    buildFence(tier = 1, connections = { n: false, s: false, w: false, e: false }, touchesCastle = false) {
      initMaterials();
      const group = new THREE.Group();
      group.name = `Fence_Tier_${tier}`;
      group.userData = { type: 'fence', tier, connections, touchesCastle };

      const { n, s, w, e } = connections || {};
      const hasPillar = this.shouldHavePillar(connections);

      let pillarH, wallH, wallThick, postW;
      if (tier === 1) {
        pillarH = 1.5; wallH = 1.2; wallThick = 0.35; postW = 0.45;
      } else if (tier === 2) {
        pillarH = 1.9; wallH = 1.5; wallThick = 0.45; postW = 0.55;
      } else {
        pillarH = 4.80; wallH = 3.80; wallThick = 1.10; postW = 1.30;
      }

      if (hasPillar) {
        const pMat = tier === 3 ? MATS.stoneDark : MATS.stone;
        group.add(createBox(postW, pillarH, postW, pMat, 0, pillarH / 2, 0));

        if (tier === 1) {
          group.add(createBox(postW + 0.08, 0.15, postW + 0.08, MATS.woodLog, 0, pillarH + 0.07, 0));
        } else if (tier === 2) {
          group.add(createBox(postW + 0.1, 0.2, postW + 0.1, MATS.stone, 0, pillarH + 0.1, 0));
          group.add(createBox(0.2, 0.25, 0.2, MATS.fireCore, 0, pillarH + 0.32, 0));
          group.add(createBox(0.26, 0.08, 0.26, MATS.iron, 0, pillarH + 0.48, 0));
        } else {
          group.add(createBox(postW + 0.24, 0.40, postW + 0.24, MATS.gold, 0, pillarH + 0.20, 0));
          group.add(createBox(0.65, 0.45, 0.65, MATS.fire, 0, pillarH + 0.55, 0));
          group.add(createBox(0.35, 0.30, 0.35, MATS.fireCore, 0, pillarH + 0.65, 0));
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
              group.add(createBox(0.12, 0.3, 0.12, MATS.iron, sx * 0.4, pillarH + 0.15, sz * 0.4));
            }
          }
        }
      }

      const count = (n?1:0) + (s?1:0) + (w?1:0) + (e?1:0);
      const isStraight = (count === 2) && ((n && s) || (w && e));

      if (isStraight) {
        if (n && s) {
          const mat = tier === 1 ? MATS.plank : (tier === 3 ? MATS.stoneDark : MATS.stone);
          group.add(createBox(wallThick, wallH, 1.0, mat, 0, wallH / 2, 0));
          if (tier === 1) {
            group.add(createBox(0.12, 0.12, 1.0, MATS.woodLog, 0, wallH * 0.35, 0));
            group.add(createBox(0.12, 0.12, 1.0, MATS.woodLog, 0, wallH * 0.8, 0));
          } else if (tier === 2) {
            group.add(createBox(wallThick + 0.08, 0.12, 1.0, MATS.stone, 0, wallH + 0.06, 0));
          } else {
            group.add(createBox(wallThick + 0.18, 0.30, 1.0, MATS.gold, 0, wallH + 0.15, 0));
            group.add(createBox(wallThick - 0.2, 0.15, 1.0, MATS.plank, 0, wallH + 0.08, 0));
            for (let z = -0.35; z <= 0.35; z += 0.35) {
              group.add(createBox(0.22, 0.90, 0.22, MATS.iron, 0, wallH + 0.70, z));
              group.add(createBox(0.12, 0.35, 0.12, MATS.gold, 0, wallH + 1.20, z));
            }
          }
        } else if (w && e) {
          const mat = tier === 1 ? MATS.plank : (tier === 3 ? MATS.stoneDark : MATS.stone);
          group.add(createBox(1.0, wallH, wallThick, mat, 0, wallH / 2, 0));
          if (tier === 1) {
            group.add(createBox(1.0, 0.12, 0.12, MATS.woodLog, 0, wallH * 0.35, 0));
            group.add(createBox(1.0, 0.12, 0.12, MATS.woodLog, 0, wallH * 0.8, 0));
          } else if (tier === 2) {
            group.add(createBox(1.0, 0.12, wallThick + 0.08, MATS.stone, 0, wallH + 0.06, 0));
          } else {
            group.add(createBox(1.0, 0.30, wallThick + 0.18, MATS.gold, 0, wallH + 0.15, 0));
            group.add(createBox(1.0, 0.15, wallThick - 0.2, MATS.plank, 0, wallH + 0.08, 0));
            for (let x = -0.35; x <= 0.35; x += 0.35) {
              group.add(createBox(0.22, 0.90, 0.22, MATS.iron, x, wallH + 0.70, 0));
              group.add(createBox(0.12, 0.35, 0.12, MATS.gold, x, wallH + 1.20, 0));
            }
          }
        }
      } else {
        const addArm = (dir) => {
          let ax = 0, az = 0, aw = wallThick, ad = wallThick;
          if (dir === 'n') { az = -0.25; ad = 0.5; }
          else if (dir === 's') { az = 0.25; ad = 0.5; }
          else if (dir === 'w') { ax = -0.25; aw = 0.5; }
          else if (dir === 'e') { ax = 0.25; aw = 0.5; }

          const mat = tier === 1 ? MATS.plank : (tier === 3 ? MATS.stoneDark : MATS.stone);
          group.add(createBox(aw, wallH, ad, mat, ax, wallH / 2, az));

          if (tier === 1) {
            if (dir === 'n' || dir === 's') {
              group.add(createBox(0.12, 0.12, 0.5, MATS.woodLog, 0, wallH * 0.35, az));
              group.add(createBox(0.12, 0.12, 0.5, MATS.woodLog, 0, wallH * 0.8, az));
            } else {
              group.add(createBox(0.5, 0.12, 0.12, MATS.woodLog, ax, wallH * 0.35, 0));
              group.add(createBox(0.5, 0.12, 0.12, MATS.woodLog, ax, wallH * 0.8, 0));
            }
          } else if (tier === 2) {
            const capW = (dir === 'n' || dir === 's') ? (wallThick + 0.08) : 0.5;
            const capD = (dir === 'n' || dir === 's') ? 0.5 : (wallThick + 0.08);
            group.add(createBox(capW, 0.12, capD, MATS.stone, ax, wallH + 0.06, az));
          } else {
            const trimW = (dir === 'n' || dir === 's') ? (wallThick + 0.18) : 0.5;
            const trimD = (dir === 'n' || dir === 's') ? 0.5 : (wallThick + 0.18);
            group.add(createBox(trimW, 0.28, trimD, MATS.gold, ax, wallH + 0.14, az));
            group.add(createBox(0.22, 0.90, 0.22, MATS.iron, ax, wallH + 0.70, az));
          }
        };

        if (n) addArm('n');
        if (s) addArm('s');
        if (w) addArm('w');
        if (e) addArm('e');
        if (!n && !s && !w && !e) {
          // Default: sedikit arm lateral agar terlihat seperti segmen tiang
          addArm('w'); addArm('e');
        }
      }

      if (touchesCastle) {
        const anchorSize = tier === 3 ? 1.4 : 0.65;
        group.add(createBox(anchorSize, anchorSize * 0.8, anchorSize, MATS.iron, 0, wallH * 0.5, 0));
      }

      return group;
    },

    buildFenceGate(tier = 1, axis = 'x') {
      initMaterials();
      const group = new THREE.Group();
      group.name = `FenceGate_Tier_${tier}`;
      group.userData = { type: 'fenceGate', tier, axis };

      const pMat = tier === 3 ? MATS.stoneDark : MATS.stone;
      let frameH, wallH, wallThick, postW, postOffset, gateW, liftH, spanHalf;

      if (tier === 1) {
        spanHalf = 1.0; frameH = 3.6; wallH = 1.20; wallThick = 0.35; postW = 0.36;
        postOffset = 0.82; gateW = 1.40; liftH = 2.20;
      } else if (tier === 2) {
        spanHalf = 1.0; frameH = 4.2; wallH = 1.50; wallThick = 0.45; postW = 0.42;
        postOffset = 0.80; gateW = 1.40; liftH = 2.50;
      } else {
        spanHalf = 3.0; frameH = 8.6; wallH = 3.80; wallThick = 1.10; postW = 0.85;
        postOffset = 2.45; gateW = 4.15; liftH = 4.80;
      }

      // 1. DUA TIANG PENUNTUN GERBANG KIRI & KANAN
      group.add(createBox(postW, frameH, tier === 3 ? 1.25 : postW, pMat, -postOffset, frameH / 2, 0));
      group.add(createBox(postW, frameH, tier === 3 ? 1.25 : postW, pMat,  postOffset, frameH / 2, 0));

      // 2. SAMBUNGAN DINDING KE PAGAR
      const connLen = spanHalf - (postOffset - postW / 2);
      if (connLen > 0.01) {
        const connMat = tier === 1 ? MATS.plank : (tier === 3 ? MATS.stoneDark : MATS.stone);
        const connCenterX = (spanHalf + (postOffset - postW / 2)) / 2;

        group.add(createBox(connLen, wallH, wallThick, connMat, -connCenterX, wallH / 2, 0));
        group.add(createBox(connLen, wallH, wallThick, connMat,  connCenterX, wallH / 2, 0));

        if (tier === 1) {
          group.add(createBox(connLen, 0.12, 0.12, MATS.woodLog, -connCenterX, wallH * 0.35, 0));
          group.add(createBox(connLen, 0.12, 0.12, MATS.woodLog, -connCenterX, wallH * 0.80, 0));
          group.add(createBox(connLen, 0.12, 0.12, MATS.woodLog,  connCenterX, wallH * 0.35, 0));
          group.add(createBox(connLen, 0.12, 0.12, MATS.woodLog,  connCenterX, wallH * 0.80, 0));
        } else if (tier === 2) {
          group.add(createBox(connLen, 0.12, wallThick + 0.08, MATS.stone, -connCenterX, wallH + 0.06, 0));
          group.add(createBox(connLen, 0.12, wallThick + 0.08, MATS.stone,  connCenterX, wallH + 0.06, 0));
        } else {
          group.add(createBox(connLen, 0.25, wallThick + 0.18, MATS.gold, -connCenterX, wallH + 0.12, 0));
          group.add(createBox(connLen, 0.25, wallThick + 0.18, MATS.gold,  connCenterX, wallH + 0.12, 0));
        }
      }

      // 3. BALOK LINTEL / ARCHWAY ATAS
      const archThick = tier === 3 ? 1.30 : (wallThick + 0.10);
      const archH = tier === 3 ? 0.90 : 0.35;
      const archW = postOffset * 2 + postW + 0.1;
      group.add(createBox(archW, archH, archThick, tier === 3 ? MATS.stoneDark : MATS.woodLog, 0, frameH - archH / 2, 0));

      if (tier === 1) {
        group.add(createBox(postW + 0.08, 0.18, postW + 0.08, MATS.woodLog, -postOffset, frameH + 0.09, 0));
        group.add(createBox(postW + 0.08, 0.18, postW + 0.08, MATS.woodLog,  postOffset, frameH + 0.09, 0));
        group.add(createBox(0.24, 0.24, 0.24, MATS.iron, 0, frameH - archH - 0.12, 0));
      } else if (tier === 2) {
        [-postOffset, postOffset].forEach(ox => {
          group.add(createBox(postW + 0.10, 0.22, postW + 0.10, MATS.stone, ox, frameH + 0.11, 0));
          group.add(createBox(0.22, 0.28, 0.22, MATS.fireCore, ox, frameH + 0.36, 0));
          group.add(createBox(0.28, 0.08, 0.28, MATS.iron, ox, frameH + 0.54, 0));
        });
        group.add(createBox(0.32, 0.28, 0.30, MATS.iron, 0, frameH - archH - 0.14, 0));
      } else {
        group.add(createBox(archW + 0.20, 0.32, archThick + 0.15, MATS.gold, 0, frameH + 0.16, 0));
        [-postOffset, postOffset].forEach(ox => {
          group.add(createBox(postW + 0.30, 0.45, postW + 0.30, MATS.gold, ox, frameH + 0.22, 0));
          group.add(createBox(0.85, 0.55, 0.85, MATS.fire, ox, frameH + 0.70, 0));
          group.add(createBox(0.48, 0.38, 0.48, MATS.fireCore, ox, frameH + 0.82, 0));
        });
        group.add(createBox(0.90, 0.60, 0.60, MATS.iron, 0, frameH - archH - 0.30, 0));
      }

      // 4. KISI GERBANG LEBAR TERANGKAT KE ATAS
      const gatePanel = new THREE.Group();
      gatePanel.name = "LiftingGatePanel";

      if (tier === 1) {
        gatePanel.add(createBox(gateW, wallH, 0.14, MATS.plank, 0, wallH / 2, 0));
        gatePanel.add(createBox(gateW + 0.04, 0.15, 0.18, MATS.woodLog, 0, wallH * 0.25, 0));
        gatePanel.add(createBox(gateW + 0.04, 0.15, 0.18, MATS.woodLog, 0, wallH * 0.80, 0));
        for (let px = -gateW / 2 + 0.14; px <= gateW / 2 - 0.10; px += 0.24) {
          gatePanel.add(createBox(0.12, 0.28, 0.16, MATS.woodLog, px, wallH + 0.12, 0));
        }
        gatePanel.add(createBox(0.05, 0.7, 0.05, MATS.iron, -0.35, wallH + 0.35, 0));
        gatePanel.add(createBox(0.05, 0.7, 0.05, MATS.iron,  0.35, wallH + 0.35, 0));
      } else if (tier === 2) {
        gatePanel.add(createBox(gateW, wallH, 0.14, MATS.iron, 0, wallH / 2, 0));
        for (let bx = -gateW / 2 + 0.14; bx <= gateW / 2 - 0.10; bx += 0.24) {
          gatePanel.add(createBox(0.08, wallH + 0.40, 0.16, MATS.iron, bx, wallH / 2 + 0.10, 0));
        }
        for (let by = 0.35; by <= wallH - 0.2; by += 0.45) {
          gatePanel.add(createBox(gateW + 0.04, 0.10, 0.16, MATS.iron, 0, by, 0));
        }
        for (let bx = -gateW / 2 + 0.14; bx <= gateW / 2 - 0.10; bx += 0.24) {
          gatePanel.add(createBox(0.08, 0.25, 0.08, MATS.iron, bx, -0.12, 0));
        }
        gatePanel.add(createBox(0.06, 0.8, 0.06, MATS.iron, -0.35, wallH + 0.40, 0));
        gatePanel.add(createBox(0.06, 0.8, 0.06, MATS.iron,  0.35, wallH + 0.40, 0));
      } else {
        gatePanel.add(createBox(gateW, wallH, 0.26, MATS.iron, 0, wallH / 2, 0));
        gatePanel.add(createBox(gateW + 0.08, 0.36, 0.32, MATS.gold, 0, wallH * 0.25, 0));
        gatePanel.add(createBox(gateW + 0.08, 0.36, 0.32, MATS.gold, 0, wallH * 0.55, 0));
        gatePanel.add(createBox(gateW + 0.08, 0.36, 0.32, MATS.gold, 0, wallH * 0.85, 0));
        for (let bx = -gateW / 2 + 0.25; bx <= gateW / 2 - 0.20; bx += 0.38) {
          gatePanel.add(createBox(0.20, wallH + 0.90, 0.28, MATS.iron, bx, wallH / 2 + 0.25, 0));
          gatePanel.add(createBox(0.16, 0.50, 0.16, MATS.gold, bx, wallH + 0.90, 0));
          gatePanel.add(createBox(0.18, 0.55, 0.18, MATS.iron, bx, -0.28, 0));
        }
        gatePanel.add(createBox(0.12, 1.6, 0.12, MATS.iron, -1.2, wallH + 0.80, 0));
        gatePanel.add(createBox(0.12, 1.6, 0.12, MATS.iron,  1.2, wallH + 0.80, 0));
      }

      group.add(gatePanel);

      if (axis === 'z') group.rotation.y = Math.PI / 2;

      group.userData.gateParts = {
        type: 'fenceGate',
        gatePanel: gatePanel,
        liftH: liftH,
        baseY: 0
      };

      return group;
    }
  };

  /* =========================================================================
     PENGELOLA INTERAKSI, ANIMASI & COLLISION
     ========================================================================= */
  let animElapsed = 0;

  return {
    initMaterials,
    buildCastle(tier) { return CastleBuilder.buildCastle(tier); },
    buildFence(tier, connections) { return CastleFenceBuilder.buildFence(tier, connections); },
    buildFenceGate(tier, axis) { return CastleFenceBuilder.buildFenceGate(tier, axis); },
    getCastleSize(tier) { return CastleBuilder.getCastleSize(tier); },

    /* Pengecekan kondisi tanah lokasi kastil: tanah harus rata, bebas pohon, bebas ore, dan bukan air */
    castleSiteCheck(cx, cz, tier) {
      if (typeof World === 'undefined' || !World.getBlock) return { ok: true, y: 1 };
      const size = CastleBuilder.getCastleSize(tier);
      const half = Math.floor(size / 2);
      const minX = Math.round(cx) - half;
      const maxX = minX + size;
      const minZ = Math.round(cz) - half;
      const maxZ = minZ + size;

      const waterLevel = (typeof CFG !== 'undefined' && CFG.WATER_Y) ? CFG.WATER_Y : 4.82;
      let baseY = null;

      for (let x = minX; x < maxX; x++) {
        for (let z = minZ; z < maxZ; z++) {
          let ty = CFG.WORLD_H - 1, base = B.AIR;
          while (ty >= 0) {
            const id = World.getBlock(x, ty, z);
            if (id === B.AIR || id === B.ROOF) { ty--; continue; }
            base = id;
            break;
          }

          // 1. Cek air: hanya jika blok dasar berupa air langsung, atau ketinggian permukaan di bawah level air, atau ada air di atas blok
          if (base === B.AIR || base === B.WATER || (ty + 1) < waterLevel || World.getBlock(x, ty + 1, z) === B.WATER) {
            return { ok: false, reason: '🌊 Tidak bisa membangun kastil di air' };
          }
          // 2. Cek batang pohon (B.WOOD) & daun (B.LEAF)
          if (base === B.WOOD) {
            return { ok: false, reason: '🌳 Terhalang pohon — tebang pohon terlebih dahulu' };
          }
          if (base === B.LEAF) {
            return { ok: false, reason: '🍃 Terhalang dedaunan pohon — bersihkan terlebih dahulu' };
          }
          // 3. Cek ore
          if (typeof ORE_INFO !== 'undefined' && ORE_INFO[base]) {
            return { ok: false, reason: '⛏️ Terhalang bongkahan ore — tambang ore terlebih dahulu' };
          }

          // 4. Cek jenis tanah atau pondasi buatan pemain (batu, tanah, rumput, pasir, salju, tanah merah, ladang, papan kayu)
          const validFoundation = (base === B.GRASS || base === B.DIRT || base === B.SAND ||
                                   base === B.SNOW || base === B.STONE || base === B.RED_SOIL ||
                                   base === B.FARM || base === B.PLANK);
          if (!validFoundation) {
            return { ok: false, reason: '⚠️ Ada rintangan di area petak kastil' };
          }

          const t = ty + 1;
          if (baseY === null) {
            baseY = t;
          } else if (t !== baseY) {
            return { ok: false, reason: `⛰️ Daratan tidak rata — ratakan dulu area ${size}×${size}` };
          }

          // Periksa ruang vertikal di atas tanah agar tidak ada pohon/ore yang menembus bangunan
          for (let cy = t; cy <= t + 10 && cy < CFG.WORLD_H; cy++) {
            const blk = World.getBlock(x, cy, z);
            if (blk === B.WOOD || blk === B.LEAF) {
              return { ok: false, reason: '🌳 Terhalang dahan/pohon di atasnya — tebang terlebih dahulu' };
            }
            if (typeof ORE_INFO !== 'undefined' && ORE_INFO[blk]) {
              return { ok: false, reason: '⛏️ Terhalang bongkahan ore — tambang terlebih dahulu' };
            }
          }
        }
      }

      if (baseY === null) return { ok: false, reason: '⚠️ Area tidak valid' };
      return { ok: true, y: baseY };
    },

    /* Validasi pagar agar tidak menembus pohon atau ore */
    fenceSiteCheck(x, z) {
      if (typeof World === 'undefined' || !World.getBlock) return { ok: true, y: 1 };
      // Larang memasang pagar di dalam interior/area kastil
      if (typeof Furni !== 'undefined' && Furni.list) {
        for (const f of Furni.list) {
          if (!f.def || !f.def.startsWith('castle')) continue;
          const cTier = parseInt(f.def.replace('castle', '')) || 1;
          const cSize = CastleBuilder.getCastleSize(cTier);
          const cHalf = cSize / 2;
          const dx = x - f.x, dz = z - f.z;
          const c = Math.cos(f.yaw || 0), s = Math.sin(f.yaw || 0);
          const lx = dx * c - dz * s;
          const lz = dx * s + dz * c;
          if (Math.abs(lx) <= cHalf && Math.abs(lz) <= cHalf) {
            return { ok: false, reason: '🏰 Tidak bisa memasang pagar di dalam kastil' };
          }
        }
      }

      const bx = Math.floor(x), bz = Math.floor(z);
      const waterLevel = (typeof CFG !== 'undefined' && CFG.WATER_Y) ? CFG.WATER_Y : 4.82;

      let ty = CFG.WORLD_H - 1, base = B.AIR;
      while (ty >= 0) {
        const id = World.getBlock(bx, ty, bz);
        if (id === B.AIR || id === B.ROOF) { ty--; continue; }
        base = id;
        break;
      }

      if (base === B.WATER || base === B.AIR || (ty + 1) < waterLevel || World.getBlock(bx, ty + 1, bz) === B.WATER) {
        return { ok: false, reason: '🌊 Tidak bisa memasang pagar di air' };
      }
      if (base === B.WOOD) {
        return { ok: false, reason: '🌳 Terhalang pohon — tebang pohon terlebih dahulu' };
      }
      if (base === B.LEAF) {
        return { ok: false, reason: '🍃 Terhalang dedaunan pohon — bersihkan terlebih dahulu' };
      }
      if (typeof ORE_INFO !== 'undefined' && ORE_INFO[base]) {
        return { ok: false, reason: '⛏️ Terhalang bongkahan ore — tambang ore terlebih dahulu' };
      }

      for (let cy = ty + 1; cy <= ty + 3 && cy < CFG.WORLD_H; cy++) {
        const blk = World.getBlock(bx, cy, bz);
        if (blk === B.WOOD || blk === B.LEAF) return { ok: false, reason: '🌳 Terhalang pohon/daun' };
        if (typeof ORE_INFO !== 'undefined' && ORE_INFO[blk]) return { ok: false, reason: '⛏️ Terhalang batu ore' };
      }
      return { ok: true, y: ty + 1 };
    },

    /* Validasi gerbang pagar agar tidak menembus pohon atau ore */
    gateSiteCheck(x, z, tier, axis) {
      if (typeof World === 'undefined' || !World.getBlock) return { ok: true, y: 1 };
      // Larang memasang gerbang di dalam interior/area kastil
      if (typeof Furni !== 'undefined' && Furni.list) {
        for (const f of Furni.list) {
          if (!f.def || !f.def.startsWith('castle')) continue;
          const cTier = parseInt(f.def.replace('castle', '')) || 1;
          const cSize = CastleBuilder.getCastleSize(cTier);
          const cHalf = cSize / 2;
          const dx = x - f.x, dz = z - f.z;
          const c = Math.cos(f.yaw || 0), s = Math.sin(f.yaw || 0);
          const lx = dx * c - dz * s;
          const lz = dx * s + dz * c;
          if (Math.abs(lx) <= cHalf + 0.5 && Math.abs(lz) <= cHalf + 0.5) {
            return { ok: false, reason: '🏰 Tidak bisa memasang gerbang di dalam kastil' };
          }
        }
      }

      const isT3 = (tier === 3);
      const span = isT3 ? 6 : 2;
      const halfSpan = span / 2;
      const waterLevel = (typeof CFG !== 'undefined' && CFG.WATER_Y) ? CFG.WATER_Y : 4.82;

      let baseY = null;
      for (let offset = -Math.floor(halfSpan); offset <= Math.floor(halfSpan); offset++) {
        const cx = Math.floor(axis === 'z' ? x : x + offset);
        const cz = Math.floor(axis === 'z' ? z + offset : z);

        let ty = CFG.WORLD_H - 1, base = B.AIR;
        while (ty >= 0) {
          const id = World.getBlock(cx, ty, cz);
          if (id === B.AIR || id === B.ROOF) { ty--; continue; }
          base = id;
          break;
        }

        if (base === B.WATER || base === B.AIR || (ty + 1) < waterLevel || World.getBlock(cx, ty + 1, cz) === B.WATER) {
          return { ok: false, reason: '🌊 Tidak bisa memasang gerbang di air' };
        }
        if (base === B.WOOD) {
          return { ok: false, reason: '🌳 Terhalang pohon — tebang pohon terlebih dahulu' };
        }
        if (base === B.LEAF) {
          return { ok: false, reason: '🍃 Terhalang dedaunan pohon — bersihkan terlebih dahulu' };
        }
        if (typeof ORE_INFO !== 'undefined' && ORE_INFO[base]) {
          return { ok: false, reason: '⛏️ Terhalang bongkahan ore — tambang ore terlebih dahulu' };
        }

        for (let cy = ty + 1; cy <= ty + 4 && cy < CFG.WORLD_H; cy++) {
          const blk = World.getBlock(cx, cy, cz);
          if (blk === B.WOOD || blk === B.LEAF) return { ok: false, reason: '🌳 Terhalang pohon/daun' };
          if (typeof ORE_INFO !== 'undefined' && ORE_INFO[blk]) return { ok: false, reason: '⛏️ Terhalang batu ore' };
        }

        const t = ty + 1;
        if (baseY === null) baseY = t;
        else if (t !== baseY) {
          return { ok: false, reason: '⛰️ Tanah di bawah gerbang tidak rata' };
        }
      }
      return { ok: true, y: baseY };
    },

    /* Deteksi gerbang terdekat (pintu kastil atau gerbang pagar) untuk tombol buka/tutup */
    nearestGate(pos, facing, maxD = 4.5) {
      if (typeof Furni === 'undefined' || !Furni.list) return null;
      let best = null, bd = 1e9;
      for (const f of Furni.list) {
        if (!f.def) continue;
        const isCastle = f.def.startsWith('castle');
        const isGate = f.def.startsWith('gate');
        if (!isCastle && !isGate) continue;

        let gx = f.x, gz = f.z, gy = f.y;
        if (isCastle) {
          const tier = parseInt(f.def.replace('castle', '')) || 1;
          const size = CastleBuilder.getCastleSize(tier);
          const wallThick = tier === 1 ? 1.0 : (tier === 2 ? 1.2 : 1.5);
          const wallOffset = size / 2 - wallThick / 2;
          const c = Math.cos(f.yaw || 0), s = Math.sin(f.yaw || 0);
          // Gerbang depan berada di local z = +wallOffset
          gx = f.x + wallOffset * s;
          gz = f.z + wallOffset * c;
        }

        const dx = gx - pos.x, dz = gz - pos.z;
        const d = Math.hypot(dx, dz);
        const limitD = isCastle ? 5.2 : maxD;
        if (d > limitD) continue;

        if (facing !== undefined) {
          let diff = Math.abs(Math.atan2(dx, dz) - facing);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          // Bila pemain dekat dengan bukaan gerbang (<2.5m), izinkan tombol interaksi baik dari luar maupun dalam
          if (d > 2.5 && diff > 1.45) continue;
        }

        if (d < bd) {
          bd = d;
          best = { furni: f, d, x: gx, y: gy, z: gz };
        }
      }
      return best;
    },

    /* Model pintu ganda rumah kayu Forecraft */
    buildHouseDoor() {
      initMaterials();
      const group = new THREE.Group();
      group.name = "HouseDoubleDoor";

      const doorLeafL = new THREE.Group();
      doorLeafL.name = "HouseDoorLeafL";
      const doorLeafR = new THREE.Group();
      doorLeafR.name = "HouseDoorLeafR";

      // Engsel kiri & kanan (daun pintu ganda 2 blok)
      doorLeafL.position.set(-0.48, 0, 0);
      doorLeafR.position.set(0.48, 0, 0);

      doorLeafL.add(createBox(0.96, 1.95, 0.12, MATS.plank, -0.48, 0.98, 0));
      doorLeafL.add(createBox(0.12, 0.35, 0.18, MATS.iron, -0.15, 0.98, 0));

      doorLeafR.add(createBox(0.96, 1.95, 0.12, MATS.plank, 0.48, 0.98, 0));
      doorLeafR.add(createBox(0.12, 0.35, 0.18, MATS.iron, 0.15, 0.98, 0));

      group.add(doorLeafL);
      group.add(doorLeafR);

      group.userData.gateParts = {
        type: 'house',
        leafL: doorLeafL,
        leafR: doorLeafR
      };
      return group;
    },

    /* Ketinggian puncak struktur kastil (menara, dinding, atap) untuk navigasi naga terbang */
    castleHeightAt(x, z) {
      if (typeof Furni === 'undefined' || !Furni.list) return 0;
      let maxHeight = 0;
      for (const f of Furni.list) {
        if (!f.def || !f.def.startsWith('castle')) continue;
        const tier = parseInt(f.def.replace('castle', '')) || 1;
        const size = CastleBuilder.getCastleSize(tier);
        const half = size / 2;
        const towerW = tier === 1 ? 3.0 : (tier === 2 ? 4.0 : 5.0);
        const towerH = tier === 1 ? 9.0 : (tier === 2 ? 12.0 : 15.0);
        const wallH  = tier === 1 ? 6.2 : (tier === 2 ? 8.0 : 10.0);

        const dx = x - f.x, dz = z - f.z;
        const c = Math.cos(f.yaw || 0), s = Math.sin(f.yaw || 0);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;

        if (Math.abs(lx) > half + 0.3 || Math.abs(lz) > half + 0.3) continue;

        const cornerDist = half - towerW / 2;
        let isCorner = false;
        for (const cx of [-cornerDist, cornerDist]) {
          for (const cz of [-cornerDist, cornerDist]) {
            if (Math.abs(lx - cx) <= towerW / 2 + 0.1 && Math.abs(lz - cz) <= towerW / 2 + 0.1) {
              isCorner = true;
              break;
            }
          }
        }
        if (isCorner) {
          maxHeight = Math.max(maxHeight, f.y + towerH + 1.5);
        } else {
          const roofH = wallH + (tier === 1 ? 7.0 : (tier === 2 ? 10.0 : 16.0));
          maxHeight = Math.max(maxHeight, f.y + roofH);
        }
      }
      return maxHeight;
    },

    /* Permukaan lantai interior, atap benteng, walkway dinding, dan menara agar karakter bisa menapak */
    topAt(x, z, fromY) {
      if (typeof Furni === 'undefined' || !Furni.list) return 0;
      let bestTop = 0;
      for (const f of Furni.list) {
        if (!f.def || !f.def.startsWith('castle')) continue;
        const tier = parseInt(f.def.replace('castle', '')) || 1;
        const size = CastleBuilder.getCastleSize(tier);
        const half = size / 2;
        const wallThick = tier === 1 ? 1.0 : (tier === 2 ? 1.2 : 1.5);
        const wallOffset = half - wallThick / 2;
        const wallH = tier === 1 ? 6.2 : (tier === 2 ? 8.0 : 10.0);
        const towerW = tier === 1 ? 3.0 : (tier === 2 ? 4.0 : 5.0);
        const towerH = tier === 1 ? 9.0 : (tier === 2 ? 12.0 : 15.0);

        const dx = x - f.x, dz = z - f.z;
        const c = Math.cos(f.yaw || 0), s = Math.sin(f.yaw || 0);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;

        // Di luar batas bentangan perimeter kastil (+ toleransi luar)
        if (Math.abs(lx) > half + 0.3 || Math.abs(lz) > half + 0.3) continue;

        // Cek apakah pemain berada di atas ketinggian aula interior (atap / menara / dinding)
        const isAboveHall = (fromY !== undefined) && (fromY >= f.y + wallH - 0.7);

        if (isAboveHall) {
          // 1. Menara Sudut: walkway atas menara
          const cornerDist = half - towerW / 2;
          let inTower = false;
          for (const cx of [-cornerDist, cornerDist]) {
            for (const cz of [-cornerDist, cornerDist]) {
              if (Math.abs(lx - cx) <= towerW / 2 + 0.35 && Math.abs(lz - cz) <= towerW / 2 + 0.35) {
                inTower = true;
                break;
              }
            }
            if (inTower) break;
          }
          if (inTower) {
            const towerTop = f.y + towerH + 0.35;
            if (towerTop <= fromY + 1.8 && towerTop > bestTop) bestTop = towerTop;
            continue;
          }

          // 2. Walkway dinding luar & permukaan atap kastil
          const outerSpan = size - wallThick * 2 + 0.6;
          const outerHalf = outerSpan / 2;
          const roofBaseY = f.y + wallH + 0.3;
          let roofY = f.y + wallH; // Walkway atas dinding kastil

          if (Math.abs(lx) <= outerHalf && Math.abs(lz) <= outerHalf) {
            const maxL = Math.max(Math.abs(lx), Math.abs(lz));
            if (tier === 1) {
              if (maxL <= 2.9) roofY = roofBaseY + 5.0; // Puncak keep tengah
              else if (maxL <= 3.9) roofY = roofBaseY + 2.2;
              else if (maxL <= 4.7) roofY = roofBaseY + 1.65;
              else if (maxL <= 5.5) roofY = roofBaseY + 1.10;
              else roofY = roofBaseY + 0.55;
            } else if (tier === 2) {
              if (maxL <= 3.6) roofY = roofBaseY + 6.9; // Puncak keep tengah
              else if (maxL <= 4.6) roofY = roofBaseY + 2.75;
              else if (maxL <= 5.5) roofY = roofBaseY + 2.20;
              else if (maxL <= 6.4) roofY = roofBaseY + 1.65;
              else if (maxL <= 7.3) roofY = roofBaseY + 1.10;
              else roofY = roofBaseY + 0.55;
            } else {
              if (maxL <= 4.5) roofY = roofBaseY + 9.8; // Puncak keep tengah
              else if (maxL <= 5.5) roofY = roofBaseY + 3.60;
              else if (maxL <= 6.4) roofY = roofBaseY + 3.00;
              else if (maxL <= 7.3) roofY = roofBaseY + 2.40;
              else if (maxL <= 8.2) roofY = roofBaseY + 1.80;
              else if (maxL <= 9.1) roofY = roofBaseY + 1.20;
              else roofY = roofBaseY + 0.60;
            }
          }

          if (roofY <= fromY + 1.8 && roofY > bestTop) {
            bestTop = roofY;
          }
          continue;
        }

        // 3. Lantai Interior Aula Tahta (Jika fromY di dalam aula interior)
        let yLantai = f.y + 0.45;
        const daisZ = -wallOffset + 2.0;
        const daisW = tier === 1 ? 3.6 : (tier === 2 ? 4.8 : 6.0);

        // Undakan 1 Panggung Tahta
        if (Math.abs(lx) <= daisW / 2 + 0.05 && Math.abs(lz - daisZ) <= 1.35) {
          yLantai = Math.max(yLantai, f.y + 0.745);
        }
        // Undakan 2 Panggung Tahta
        if (Math.abs(lx) <= (daisW - 0.8) / 2 + 0.05 && Math.abs(lz - (daisZ - 0.2)) <= 1.05) {
          yLantai = Math.max(yLantai, f.y + 0.995);
        }
        // Tempat Duduk Tahta Raja
        if (Math.abs(lx) <= 0.6 && Math.abs(lz - (daisZ - 0.3)) <= 0.45) {
          yLantai = Math.max(yLantai, f.y + 1.25);
        }

        if (fromY === undefined || yLantai <= fromY + 0.6) {
          if (yLantai > bestTop) bestTop = yLantai;
        }
      }
      return bestTop;
    },

    toggleGate(f) {
      if (!f) return;
      f.doorOpen = !f.doorOpen;
      f.targetDoorProgress = f.doorOpen ? 1.0 : 0.0;
      if (typeof Sfx !== 'undefined' && Sfx.craft) Sfx.craft();
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast(f.doorOpen ? "🚪 Gerbang dibuka" : "🔒 Gerbang ditutup");
      }
      if (typeof Furni !== 'undefined' && Furni.save) Furni.save();
    },

    applyDoorState(f, progress) {
      if (!f || !f.mesh) return;
      const parts = f.mesh.userData.gateParts;
      if (!parts) return;
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      if (parts.type === 'castle') {
        if (parts.leafL) parts.leafL.rotation.y = -ease * (Math.PI * 0.55);
        if (parts.leafR) parts.leafR.rotation.y = ease * (Math.PI * 0.55);
      } else if (parts.type === 'fenceGate') {
        if (parts.gatePanel) parts.gatePanel.position.y = (parts.baseY || 0) + ease * parts.liftH;
      }
    },

    rebuildFences() {
      if (typeof Furni === 'undefined' || !Furni.list || !Furni.scene) return;
      const fences = Furni.list.filter(f => f.def && f.def.startsWith('fence'));
      if (!fences.length) return;

      const isConnectedAt = (x, z) => {
        for (const f of Furni.list) {
          if (!f.def) continue;
          if (f.def.startsWith('fence') || f.def.startsWith('gate') || f.def.startsWith('castle')) {
            if (Math.hypot(f.x - x, f.z - z) < 0.75) return true;
          }
        }
        return false;
      };

      for (const f of fences) {
        const tier = parseInt(f.def.replace('fence', '')) || 1;
        const cN = isConnectedAt(f.x, f.z - 1.0);
        const cS = isConnectedAt(f.x, f.z + 1.0);
        const cW = isConnectedAt(f.x - 1.0, f.z);
        const cE = isConnectedAt(f.x + 1.0, f.z);
        const conn = { n: cN, s: cS, w: cW, e: cE };

        if (f.mesh) {
          Furni.scene.remove(f.mesh);
          f.mesh.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
        }
        const newMesh = CastleFenceBuilder.buildFence(tier, conn);
        newMesh.position.set(f.x, f.y, f.z);
        newMesh.rotation.y = f.yaw || 0;
        Furni.scene.add(newMesh);
        f.mesh = newMesh;
      }
    },

    update(dt) {
      animElapsed += dt;
      if (typeof Furni === 'undefined' || !Furni.list) return;

      // Api obor flicker
      if (MATS && MATS.fire) {
        const flicker = 0.9 + Math.sin(animElapsed * 12) * 0.08 + Math.cos(animElapsed * 7) * 0.05;
        MATS.fire.color.setRGB(1.0, 0.48 * flicker, 0.14 * flicker);
      }

      const pp = (typeof Player !== 'undefined' && Player.pos) ? Player.pos : null;

      for (const f of Furni.list) {
        if (!f.def) continue;

        // 1. Update animasi buka/tutup gerbang
        if (f.def.startsWith('castle') || f.def.startsWith('gate')) {
          if (f.doorProgress === undefined) f.doorProgress = f.doorOpen ? 1.0 : 0.0;
          if (f.targetDoorProgress === undefined) f.targetDoorProgress = f.doorOpen ? 1.0 : 0.0;

          if (f.doorProgress !== f.targetDoorProgress) {
            const speed = 2.6;
            if (f.doorProgress < f.targetDoorProgress) {
              f.doorProgress = Math.min(f.targetDoorProgress, f.doorProgress + dt * speed);
            } else {
              f.doorProgress = Math.max(f.targetDoorProgress, f.doorProgress - dt * speed);
            }
            this.applyDoorState(f, f.doorProgress);
          }
        }

        // 2. Cutaway atap kastil bila pemain masuk interior aula
        if (f.def.startsWith('castle') && pp && f.mesh && f.mesh.userData && f.mesh.userData.roofGroup) {
          const tier = parseInt(f.def.replace('castle', '')) || 1;
          const size = CastleBuilder.getCastleSize(tier);
          const half = size / 2;
          const wallH = tier === 1 ? 6.2 : (tier === 2 ? 8.0 : 10.0);
          const dx = Math.abs(pp.x - f.x);
          const dz = Math.abs(pp.z - f.z);
          const inside = dx < (half - 0.6) && dz < (half - 0.6) && (pp.y >= f.y - 0.5 && pp.y <= f.y + wallH - 0.3);
          f.mesh.userData.roofGroup.visible = !inside;
        }
      }
    },

    solidAt(f, x, y, z) {
      if (!f || !f.def) return false;
      const dx = x - f.x, dz = z - f.z;
      const c = Math.cos(f.yaw || 0), s = Math.sin(f.yaw || 0);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const ly = y - f.y;

      if (f.def.startsWith('fence')) {
        const tier = parseInt(f.def.replace('fence', '')) || 1;
        const wallH = tier === 3 ? 3.8 : (tier === 2 ? 1.5 : 1.2);
        const wallThick = tier === 3 ? 1.1 : (tier === 2 ? 0.45 : 0.35);
        if (ly < 0 || ly >= wallH) return false;
        return Math.abs(lx) <= 0.55 && Math.abs(lz) <= (wallThick / 2 + 0.15);
      }

      if (f.def.startsWith('gate')) {
        const tier = parseInt(f.def.replace('gate', '')) || 1;
        const liftH = tier === 3 ? 4.8 : (tier === 2 ? 2.5 : 2.2);
        const gateW = tier === 3 ? 4.15 : 1.40;
        const wallThick = tier === 3 ? 1.10 : (tier === 2 ? 0.45 : 0.35);
        const postOffset = tier === 3 ? 2.45 : 0.82;
        const postW = tier === 3 ? 0.85 : 0.40;

        if (ly < 0 || ly >= liftH) return false;

        // Tiang penuntun kiri/kanan selalu solid
        if (Math.abs(Math.abs(lx) - postOffset) <= postW / 2 + 0.1 && Math.abs(lz) <= wallThick / 2 + 0.1) {
          return true;
        }

        // Kisi gerbang tengah: HANYA solid saat tertutup
        if (!f.doorOpen) {
          if (Math.abs(lx) <= gateW / 2 && Math.abs(lz) <= wallThick / 2 + 0.15) {
            return true;
          }
        }
        return false;
      }

      if (f.def.startsWith('castle')) {
        const tier = parseInt(f.def.replace('castle', '')) || 1;
        const size = CastleBuilder.getCastleSize(tier);
        const half = size / 2;
        const towerW = tier === 1 ? 3.0 : (tier === 2 ? 4.0 : 5.0);
        const towerH = tier === 1 ? 9.0 : (tier === 2 ? 12.0 : 15.0);
        const wallH  = tier === 1 ? 6.2 : (tier === 2 ? 8.0 : 10.0);
        const wallThick = tier === 1 ? 1.0 : (tier === 2 ? 1.2 : 1.5);
        const gateW = tier === 1 ? 3.6 : (tier === 2 ? 4.6 : 5.8);
        const gateH = tier === 1 ? 4.5 : (tier === 2 ? 5.5 : 6.8);

        // BATAS KETAT: Jika di luar bentangan perimeter kastil, bukan tabrakan kastil (cegah tembok hantu tak terbatas)
        if (Math.abs(lx) > half + 0.35 || Math.abs(lz) > half + 0.35) return false;
        if (ly < 0 || ly > towerH + 2) return false;

        // 4 Menara Sudut (Badan menara padat sampai walkway atas)
        const cornerDist = half - towerW / 2;
        for (const cx of [-cornerDist, cornerDist]) {
          for (const cz of [-cornerDist, cornerDist]) {
            if (Math.abs(lx - cx) <= towerW / 2 + 0.1 && Math.abs(lz - cz) <= towerW / 2 + 0.1) {
              if (ly <= towerH + 0.35) return true;
            }
          }
        }

        // Dinding Barat, Timur, Utara
        const wallOffset = half - wallThick / 2;
        if (ly <= wallH) {
          // Barat (Dibatasi panjang sisi dalam antar menara)
          if (Math.abs(lx - (-wallOffset)) <= wallThick / 2 + 0.15 && Math.abs(lz) <= half) return true;
          // Timur (Dibatasi panjang sisi dalam antar menara)
          if (Math.abs(lx - wallOffset) <= wallThick / 2 + 0.15 && Math.abs(lz) <= half) return true;
          // Utara / Belakang
          if (Math.abs(lz - (-wallOffset)) <= wallThick / 2 + 0.15 && Math.abs(lx) <= half) return true;

          // Selatan (Gerbang Depan)
          if (Math.abs(lz - wallOffset) <= wallThick / 2 + 0.15) {
            // Tembok samping gerbang (DIBATASI tepat sampai batas dinding 'half' — TIDAK menembus ke luar)
            if (Math.abs(lx) >= gateW / 2 && Math.abs(lx) <= half) return true;
            // Daun pintu gerbang tengah (HANYA solid saat gerbang TERTUTUP)
            if (!f.doorOpen && ly <= gateH && Math.abs(lx) < gateW / 2) return true;
          }
        }

        // Tahta dan perabot interior
        const daisZ = -wallOffset + 2.0;
        // Sandaran Belakang Tahta Raja (Backrest) & Mahkota Emas — TIDAK BISA DITEMBUS
        if (Math.abs(lx) <= 0.75 && (lz >= daisZ - 0.85 && lz <= daisZ - 0.35)) {
          if (ly >= 0.95 && ly <= 2.8) return true;
        }
        // Sandaran Sisi Tahta (Lengan Tahta)
        if (Math.abs(Math.abs(lx) - 0.6) <= 0.22 && Math.abs(lz - (daisZ - 0.3)) <= 0.5) {
          if (ly >= 0.95 && ly <= 1.8) return true;
        }
        // Pilar kolonade penopang aula tahta
        const colZDist = half * 0.55;
        const colXDist = (half - wallThick) * 0.55;
        for (let pz = -colZDist; pz <= colZDist; pz += 2.8) {
          for (const sx of [-1, 1]) {
            if (Math.abs(lx - sx * colXDist) <= 0.45 && Math.abs(lz - pz) <= 0.45) {
              if (ly >= 0.45 && ly <= wallH) return true;
            }
          }
        }
        // Meja jamuan makan panjang
        for (const side of [-1, 1]) {
          const tx = side * (colXDist + 1.4), tz = 0.2;
          if (Math.abs(lx - tx) <= 0.65 && Math.abs(lz - tz) <= 1.9) {
            if (ly >= 0.45 && ly <= 1.2) return true;
          }
        }

        return false;
      }

      return false;
    }
  };
})();

if (typeof window !== 'undefined') {
  window.FurniCastle = FurniCastle;
}
