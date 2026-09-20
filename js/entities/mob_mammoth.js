'use strict';
/* =============================================================================
   ENTITAS MOB: MAMMOTH PURBA (RAJAGADING) 🦣
   -----------------------------------------------------------------------------
   Diporting otentik dari "NEW MODEL/Mammoth 2.html".
   Predator/behemoth puncak biome Pegunungan (Mountain), berukuran & berkekuatan
   raksasa setara Naga Merah.

   Model Voxel Anatomi Lengkap (Mammoth 2.html):
     - Tubuh bongsor berbulu lebat (woolly coat) dengan punuk pundak tinggi
     - Rok bulu menggantung tebal & otot pundak/pinggul kokoh
     - 4 KAKI ANATOMI 2-SENDI LUTUT (Thigh legT + Knee/Shin legS)
       * Tempurung lutut bulat menonjol (patella) di ujung bawah paha
       * Mangkok sendi lutut membungkus fleksibel
       * Kaki bawah tebal & telapak gajah padat (elephantine padded foot)
       * Kuku belah hitam keras + kuku tanduk depan menapak tanah
       * Kinematika langkah quadruped trot: lutut menekuk fleksibel saat mengangkat
         kaki dan melurus kokoh saat menapak tanah (tidak kaku seperti kayu lurus).
     - Kepala raksasa bermahkota bulu, rahang bawah artikulatif, dan mata amber
     - Dua gading purba raksasa melengkung keluar & ke atas (dense curved ivory)
     - Belalai 5-segmen lentur (articulated trunk)
     - Telinga berbulu dan ekor berumbai

   ANIMASI & 4 AKSI JURUS:
     - idle  : Makan rumput (idleGraze) menunduk dengan liukan belalai alami,
               napas perut, telinga berkedut, ekor bergoyang, dan kedipan mata.
     - walk  : Siklus jalan 4 kaki berlutut 2-sendi (trot gait) dengan tekukan lutut
               fleksibel, ayunan belalai dan gelombang badan berbobot.
     - run   : Derap lari kencang gallop dengan lutut melipat elastis & debu tanah.
     - upper : 'Seruduk Langit' (Uppercut Tusk Slash) — menunduk ancang-ancang lalu
               meledak menyabetkan gading tajam ke atas, melontarkan musuh ke udara.
     - slam  : 'Hantaman Seismik' (Rearing Seismic Slam) — mengangkat kedua kaki depan
               tinggi-tinggi ke udara (rearing up 45°), lalu menghantam bumi sekuat
               tenaga melepaskan gelombang kejut seismik (AoE luas + screen shake).
     - swipe : 'Sapuan Belalai' (Trunk Sweep) — belalai meliuk menyapu horizontal
               merusak musuh di depannya.
     - taunt : 'Auman Sang Raja' (King Roar) — mengangkat belalai tegak ke langit,
               mendongak membuka rahang, melepaskan 3 cincin gelombang auman keras.
   ============================================================================= */

const Mob_Mammoth = (() => {

  const SCALE = 1.85; // Ukuran raksasa setara Naga Merah (tinggi ~4.2 blok di dunia game)
  const V = 0.155;    // Skala grid voxel per unit lokal (otentik Mammoth 2.html)
  const TAU = Math.PI * 2;

  const C = {
    FUR_MAIN:  0x74451f,
    FUR_MID:   0x8a5628,
    FUR_DARK:  0x5e3617,
    FUR_LIGHT: 0x9c6631,
    BELLY:     0x4f2e14,
    HOOF:      0x27190f,
    HOOF_L:    0xd9d0b0,
    TUSK_BASE: 0xe8dcc0,
    TUSK_TIP:  0xf4ecd8,
    JAW:       0x4f2e14,
    EYE:       0xffa82e,
    TRUNK_END: 0x3a2210
  };

  const FUR = [0x74451f, 0x74451f, 0x8a5628, 0x5e3617, 0x9c6631];
  const furC = () => FUR[(Math.random() * FUR.length) | 0];

  const clampVal = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerpVal  = (a, b, t) => a + (b - a) * t;
  const ssVal    = (a, b, x) => { const t = clampVal((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eocVal   = t => 1 - Math.pow(1 - clampVal(t, 0, 1), 3);
  const eoqVal   = t => 1 - Math.pow(1 - clampVal(t, 0, 1), 4);
  const rnd      = (a, b) => a + Math.random() * (b - a);

  const KEYS = [
    'rootY', 'rootPitch', 'rootRoll', 'rootYawOff', 'surge', 'bodyPitch', 'breath',
    'neckPitch', 'neckYaw', 'jaw', 'earL', 'earR', 'tailYaw', 'tailPitch', 'tuskF',
    'legT0', 'legT1', 'legT2', 'legT3', 'legS0', 'legS1', 'legS2', 'legS3',
    'trunkP0', 'trunkP1', 'trunkP2', 'trunkP3', 'trunkP4',
    'trunkY0', 'trunkY1', 'trunkY2', 'trunkY3', 'trunkY4'
  ];

  const REST_P = [-0.10, -0.16, -0.24, -0.30, -0.26];
  const segLen = [3, 3, 3, 2, 2];
  const segW   = [1.8, 1.6, 1.4, 1.15, 0.95];

  const TRUNK_UP_UPPER = [0.62, 0.62, 0.58, 0.55, 0.55];
  const TRUNK_RAISE    = [-0.102, -0.222, -0.358, -0.49, -0.61];

  let _boxGeo = null;
  function getBoxGeo() {
    if (!_boxGeo) _boxGeo = new THREE.BoxGeometry(V, V, V);
    return _boxGeo;
  }

  // Builder InstancedMesh efisien per bagian tubuh (otentik Mammoth 2.html)
  function buildPart(voxList, boxGeo, voxelMat) {
    if (!voxList || !voxList.length) return new THREE.Group();
    const m = new THREE.InstancedMesh(boxGeo, voxelMat, voxList.length);
    const dummy = new THREE.Object3D();
    const tmpC = new THREE.Color();
    for (let i = 0; i < voxList.length; i++) {
      const v = voxList[i];
      dummy.position.set(v.x * V, v.y * V, v.z * V);
      if (v.j) {
        dummy.rotation.set(rnd(-0.18, 0.18), rnd(-0.3, 0.3), rnd(-0.18, 0.18));
      } else {
        dummy.rotation.set(0, 0, 0);
      }
      const s = v.s || 1;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);

      tmpC.setHex(v.c);
      if (v.jv) tmpC.offsetHSL(0, 0, rnd(-0.05, 0.05));
      m.setColorAt(i, tmpC);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = !IS_MOBILE;
    m.frustumCulled = false;
    return m;
  }

  const Mob_Mammoth = {
    SCALE,
    DUR: {
      upper: 1.5,
      slam: 2.5,
      swipe: 1.45,
      taunt: 2.9,
      graze: 4.0
    },
    HIT: {
      upper: 0.50,
      slam: 1.40,
      swipe: 0.46,
      taunt: [0.70, 1.05, 1.45]
    },

    /* ---------- BUILD MODEL 3D ---------- */
    build(boss) {
      const g = new THREE.Group();
      g.scale.setScalar(SCALE);

      const boxGeo = getBoxGeo();
      const voxelMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const parts = {};

      const P = {};
      const add = (p, x, y, z, c, o = {}) => {
        (P[p] = P[p] || []).push({ x, y, z, c, j: o.j || false, s: o.s || 1, jv: o.jv !== false });
      };

      /* ================= 1. TORSO & ROK BULU LEBAT (Mammoth 2.html) ================= */
      for (let z = -8; z <= 3; z++) {
        const hw = (z <= -7 || z >= 3) ? 2 : 3;
        const top = 11 + (z >= -1 ? 2 : z >= -3 ? 1 : 0) - (z <= -7 ? 1 : 0);
        const bot = z >= 2 ? 5 : z <= -7 ? 7 : 6;
        for (let x = -hw; x <= hw; x++) {
          for (let y = bot; y <= top; y++) {
            let c = furC();
            if (y >= top - 1 && Math.random() < 0.6) c = 0x9c6631;
            if (y <= bot && Math.random() < 0.6) c = 0x5e3617;
            add('body', x, y, z, c);
          }
        }
        if (z >= -2 && z <= 2 && Math.random() < 0.6) {
          add('body', ((Math.random() * 5) | 0) - 2, top + 1, z, 0xa5713a, { j: true, s: 0.9 });
        }
        if (z === -8 && Math.random() < 0.8) {
          add('body', ((Math.random() * 5) | 0) - 2, 8 + ((Math.random() * 4) | 0), z - 0.4, 0x5e3617, { j: true });
        }
      }

      // Rok bulu lebat menggantung
      for (let z = -7; z <= 2; z++) {
        const hw = (z <= -7 || z >= 3) ? 2 : 3;
        const bot = z >= 2 ? 5 : z <= -7 ? 7 : 6;
        for (const sx of [-1, 1]) {
          if (hw < 3) continue;
          const n = 2 + ((Math.random() * 2) | 0);
          for (let i = 1; i <= n; i++) {
            add('body', sx * 3, bot - i, z, 0x4f2e14, { j: true, s: 0.95 });
          }
        }
        if (Math.random() < 0.35) {
          add('body', ((Math.random() * 3) | 0) - 1, bot - 1, z, 0x4f2e14, { j: true });
        }
      }

      // Otot bahu & pinggul
      for (const zz of [0, 1, 2]) {
        for (const yy of [8, 9]) {
          for (const sx of [-1, 1]) add('body', sx * 3, yy, zz, 0x8a5628);
        }
      }
      for (const zz of [-6, -5]) {
        for (const yy of [8, 9]) {
          for (const sx of [-1, 1]) add('body', sx * 3, yy, zz, 0x8a5628);
        }
      }

      /* ================= 2. KAKI ANATOMI 2-SENDI BERLUTUT (4 KAKI) ================= */
      // Kaki depan (i=0 kiri, i=1 kanan) & Kaki belakang (i=2 kiri, i=3 kanan)
      for (let i = 0; i < 4; i++) {
        const isFront = (i < 2);

        // A. Paha Atas (legT): dari y=0 down to y=-2.5
        for (const dx of [-1, 0]) {
          for (let y = 0; y > -3; y--) {
            add('legT' + i, dx, y, 0, furC());
          }
          // Otot paha luar tebal
          add('legT' + i, dx, -0.6, isFront ? 0.35 : -0.35, 0x8a5628, { s: 1.28 });
          add('legT' + i, dx, -1.6, isFront ? 0.25 : -0.25, 0x74451f, { s: 1.20 });
          // Tempurung lutut bulat menonjol di ujung depan/belakang paha (Knee joint)
          add('legT' + i, dx, -2.5, isFront ? 0.85 : -0.75, 0x4f2e14, { s: 1.35, j: true });
        }

        // B. Betis & Telapak Bawah (legS): pivot di lutut (y=-2.5), memanjang ke bawah
        for (const dx of [-1, 0]) {
          // Mangkok sendi lutut atas membungkus lutut paha
          add('legS' + i, dx, 0.3, isFront ? 0.40 : -0.35, 0x5e3617, { s: 1.20 });
          for (let y = 0; y > -3; y--) {
            add('legS' + i, dx, y, isFront ? -0.15 : 0.15, Math.random() < 0.5 ? 0x5e3617 : 0x4f2e14);
          }
          // Telapak gajah padat & kuku
          for (const dz of [-1, 0, 1]) {
            add('legS' + i, dx, -3, dz, 0x27190f, { s: 1.15 });
          }
          // Kuku tanduk depan
          add('legS' + i, dx, -3, 1.8, 0xd9d0b0, { s: 0.75 });
          // Taji belakang
          add('legS' + i, dx, -2.2, isFront ? 1.0 : -0.9, 0x9c6631, { j: true, s: 0.85 });
        }
      }

      /* ================= 3. KEPALA + LEHER ================= */
      for (let z = -1; z <= 0; z++) {
        for (let x = -2; x <= 2; x++) {
          for (let y = -2; y <= 3; y++) add('head', x, y, z, furC());
        }
      }
      for (let z = 1; z <= 3; z++) {
        for (let x = -2; x <= 2; x++) {
          for (let y = -1; y <= 3; y++) {
            if (y === 3 && Math.abs(x) > 1) continue;
            let c = furC();
            if (y === 2 && z === 3) c = 0x3a2210;
            add('head', x, y, z, c);
          }
        }
      }
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 2; y++) add('head', x, y, 4, Math.random() < 0.5 ? 0x74451f : 0x5e3617);
      }
      for (let i = 0; i < 5; i++) {
        add('head', ((Math.random() * 5) | 0) - 2, 4, ((Math.random() * 3) | 0) + 1, 0xa5713a, { j: true, s: 0.85 });
      }

      /* Rahang Bawah */
      for (let z = 0; z <= 3; z++) {
        for (let x = -1; x <= 1; x++) {
          add('jaw', x, -1, z, 0x4f2e14);
          add('jaw', x,  0, z, 0x5e3617);
        }
      }

      /* ================= 4. GADING GANDA PADAT MENYAMBUNG ================= */
      for (const sx of [-1, 1]) {
        const mainPts = [];
        const N = 12;
        for (let i = 0; i < N; i++) {
          const t = i / (N - 1);
          const z = 0 + 7.8 * t;
          let y;
          if (t < 0.28) y = -0.25 - 1.65 * (t / 0.28);
          else y = -1.9 + 4.7 * Math.pow((t - 0.28) / 0.72, 1.45);
          const x = sx * (0.25 + 2.3 * Math.pow(t, 0.72));
          const s = t < 0.12 ? 1.75 : t < 0.4 ? 1.4 : t < 0.7 ? 1.15 : t < 0.9 ? 0.92 : 0.68;
          mainPts.push({ x, y, z, s, t });
        }
        const dense = [];
        for (let i = 0; i < mainPts.length - 1; i++) {
          dense.push(mainPts[i]);
          const p0 = mainPts[i], p1 = mainPts[i + 1];
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
          const steps = Math.max(1, Math.ceil(dist / (V * 0.85)));
          for (let k = 1; k < steps; k++) {
            const u = k / steps;
            dense.push({
              x: lerpVal(p0.x, p1.x, u),
              y: lerpVal(p0.y, p1.y, u),
              z: lerpVal(p0.z, p1.z, u),
              s: lerpVal(p0.s, p1.s, u),
              t: lerpVal(p0.t, p1.t, u)
            });
          }
        }
        dense.push(mainPts[mainPts.length - 1]);
        dense.forEach(p => {
          const col = p.t > 0.88 ? 0xf4ecd8 : 0xe8dcc0;
          add('tusk' + (sx > 0 ? 'R' : 'L'), p.x, p.y, p.z, col, { j: false, s: p.s, jv: false });
        });
      }

      /* ================= 5. BELALAI 5-SEGMEN ================= */
      for (let s = 0; s < 5; s++) {
        for (let k = 0; k < segLen[s]; k++) {
          add('trunk' + s, 0, -k, 0, (k % 2 ? 0x5e3617 : 0x74451f), { s: segW[s] });
        }
      }
      add('trunk4', 0, -segLen[4], 0, 0x3a2210, { s: 0.8, j: true });

      /* Telinga & Ekor */
      add('earL', 0, -1, 0, 0x5e3617, { s: 1.1 });
      add('earL', 0,  0, 0, 0x74451f, { s: 1.1 });
      add('earL', 0, -2, 0, 0x3a2210, { s: 0.8 });
      add('earR', 0, -1, 0, 0x5e3617, { s: 1.1 });
      add('earR', 0,  0, 0, 0x74451f, { s: 1.1 });
      add('earR', 0, -2, 0, 0x3a2210, { s: 0.8 });

      add('tail', 0,  0,   0, 0x74451f);
      add('tail', 0, -1, 0.4, 0x5e3617);
      add('tail', 0, -2, 0.8, 0x3a2210, { s: 1.3, j: true });

      /* ================= 6. HIERARKI RIG SOLID (Mammoth 2.html) ================= */
      const rig = new THREE.Group();
      g.add(rig);
      parts.rig = rig;

      const grp = (name, parent, x, y, z) => {
        const gr = new THREE.Group();
        gr.position.set(x * V, y * V, z * V);
        parent.add(gr);
        parts[name] = gr;
        return gr;
      };

      const bodyG = grp('body', rig, 0, 0, 0);
      bodyG.add(buildPart(P.body, boxGeo, voxelMat));

      const headG = grp('head', bodyG, 0, 10, 3);
      headG.add(buildPart(P.head, boxGeo, voxelMat));

      const jawG  = grp('jaw', headG, 0, -2, 1);
      jawG.add(buildPart(P.jaw, boxGeo, voxelMat));

      const earL  = grp('earL', headG, -2, 3, 0.5);
      earL.add(buildPart(P.earL, boxGeo, voxelMat));
      const earR  = grp('earR', headG,  2, 3, 0.5);
      earR.add(buildPart(P.earR, boxGeo, voxelMat));

      const tuskL = grp('tuskL', headG, -1.2, -1.2, 2.5);
      tuskL.add(buildPart(P.tuskL, boxGeo, voxelMat));
      const tuskR = grp('tuskR', headG,  1.2, -1.2, 2.5);
      tuskR.add(buildPart(P.tuskR, boxGeo, voxelMat));

      let parentT = headG;
      parts.trunk = [];
      for (let s = 0; s < 5; s++) {
        parentT = grp('trunk' + s, parentT, 0, s === 0 ? 1 : -segLen[s - 1], s === 0 ? 4 : 0);
        parentT.add(buildPart(P['trunk' + s], boxGeo, voxelMat));
        parts.trunk.push(parentT);
      }

      const tailG = grp('tail', bodyG, 0, 11, -8.4);
      tailG.add(buildPart(P.tail, boxGeo, voxelMat));

      // Rig Kaki 2-Sendi Berlutut
      const legPos = [[2, 6, 1], [-2, 6, 1], [2, 6, -6], [-2, 6, -6]];
      parts.legsT = [];
      parts.legsS = [];
      for (let i = 0; i < 4; i++) {
        const th = grp('legT' + i, bodyG, legPos[i][0], legPos[i][1], legPos[i][2]);
        th.add(buildPart(P['legT' + i], boxGeo, voxelMat));
        parts.legsT.push(th);

        // Sendi lutut fleksibel di y = -2.5 (otentik 2-sendi)
        const sh = grp('legS' + i, th, 0, -2.5, 0.2);
        sh.add(buildPart(P['legS' + i], boxGeo, voxelMat));
        parts.legsS.push(sh);
      }

      // Mata Amber
      const eyeMat = new THREE.MeshBasicMaterial({ color: C.EYE });
      const eyeL = new THREE.Mesh(boxGeo, eyeMat);
      eyeL.scale.set(0.62 * V, 0.62 * V, 0.2 * V);
      eyeL.position.set(-2.55 * V, 1.5 * V, 2.6 * V);
      const eyeR = eyeL.clone();
      eyeR.position.x = 2.55 * V;
      headG.add(eyeL, eyeR);
      parts.eyeL = eyeL;
      parts.eyeR = eyeR;

      // Marker
      const mouth = new THREE.Object3D();
      mouth.position.set(0, -1.2 * V, 3.6 * V);
      jawG.add(mouth);
      parts.mouth = mouth;

      const trunkTip = new THREE.Object3D();
      trunkTip.position.set(0, -(segLen[4] + 1) * V, 0);
      parts.trunk[4].add(trunkTip);
      parts.trunkTip = trunkTip;

      const crown = new THREE.Object3D();
      crown.position.set(0, 4.5 * V, 1 * V);
      headG.add(crown);
      parts.crown = crown;

      // State pose data
      parts.targetPose = {};
      parts.currentPose = {};
      for (const k of KEYS) {
        parts.targetPose[k] = 0;
        parts.currentPose[k] = 0;
      }

      return { mesh: g, parts };
    },

    /* ================= KINEMATIKA 2-SENDI LUTUT (QUADRUPED TROTTING GAIT) ================= */
    stepCycle(phase, isFront) {
      const p = ((phase % 1) + 1) % 1;
      let thigh, knee;
      if (p < 0.48) {
        // Mengangkat kaki dan melangkah maju ke depan
        const u = p / 0.48;
        // Paha mengayun ke depan
        thigh = 0.38 - 0.76 * ssVal(0, 1, u);
        // LUTUT MENEKUK SECARA FLEKSIBEL (mengangkat telapak kuku melewati tanah)
        knee = (isFront ? 0.68 : 0.58) * Math.sin(u * Math.PI);
      } else {
        // Menapak dan mendorong tanah ke belakang menopang bobot tubuh
        const u = (p - 0.48) / 0.52;
        thigh = -0.38 + 0.76 * ssVal(0, 1, u);
        // Lutut hampir lurus dengan peredam pegas lembut saat menapak
        knee = 0.08 * Math.sin(u * Math.PI);
      }
      return { thigh, knee };
    },

    /* Derap Lari Gallop 2-Sendi Lutut */
    gallopCycle(phase, isFront) {
      const p = ((phase % 1) + 1) % 1;
      let thigh, knee;
      if (p < 0.50) {
        const u = p / 0.50;
        thigh = (isFront ? 0.55 : -0.40) - (isFront ? 1.15 : -1.05) * ssVal(0, 1, u);
        // Lutut menekuk dalam saat kaki melipat di bawah dada
        knee = (isFront ? 0.88 : 0.78) * Math.sin(u * Math.PI);
      } else {
        const u = (p - 0.50) / 0.50;
        thigh = (isFront ? -0.60 : 0.65) + (isFront ? 1.15 : -1.05) * ssVal(0, 1, u);
        // Mendorong lurus penuh
        knee = 0.12 * Math.sin(u * Math.PI);
      }
      return { thigh, knee };
    },

    /* ---------- ANIMATE FRAME UPDATE (Mammoth 2.html) ---------- */
    animate(m, dt) {
      if (!m || !m.parts) return;

      m._mAnimT = (m._mAnimT || 0) + dt;
      const animTime = m._mAnimT;
      const parts = m.parts;
      const T = parts.targetPose;
      const C = parts.currentPose;

      // Reset target pose ke 0
      for (const k of KEYS) T[k] = 0;

      // Pernapasan, kibasan ekor & kedutan telinga lembut (Mammoth 2.html)
      T.breath = 0.012 * Math.sin(animTime * 1.9);
      T.tailYaw = 0.45 * Math.sin(animTime * 1.25) + 0.20 * Math.sin(animTime * 2.6);
      T.earL = 0.35 * Math.pow(Math.max(0, Math.sin(animTime * 0.8)), 8);
      T.earR = 0.35 * Math.pow(Math.max(0, Math.sin(animTime * 0.8 + 2.2)), 8);

      for (let j = 0; j < 4; j++) {
        const rest = j < 2 ? 0.08 : 0.12;
        T['legS' + j] += rest;
        T['legT' + j] -= rest * 0.45;
      }

      const sp = Math.hypot(m.vel.x, m.vel.z);
      const isMoving = sp > 0.15;

      /* Bila pet mammoth sedang ditunggangi pemain, hapus aksi tarung yang tertinggal
         sehingga animasi jalan / lari (trot/gallop) dan idle langsung aktif tanpa macet */
      const isRidden = (typeof Capture !== 'undefined' && Capture.riding && Capture.pet === m);
      if (isRidden && m.mAct) {
        m.mAct = null;
        m.mActT = 0;
      }

      const act = m.mAct;
      const tA = m.mActT || 0;

      /* ================= ACTION / ATTACK POSES (Mammoth 2.html) ================= */
      if (act === 'upper') {
        // Tandukan Langit (Uppercut Tusk Slash)
        const ant = ssVal(0, 0.30, tA);
        const st  = eoqVal((tA - 0.38) / 0.14);
        const rec = 1 - ssVal(0.95, 1.45, tA);
        T.neckPitch = (0.55 * ant * (1 - st) - 1.05 * st) * rec;
        T.jaw = 0.35 * st * rec;
        T.rootY += (-0.12 * ant * (1 - st) + 0.16 * st * (1 - ssVal(0.75, 1.3, tA))) * rec;
        T.bodyPitch = (0.16 * ant * (1 - st) - 0.20 * st) * rec;
        for (let i = 0; i < 4; i++) T['legS' + i] += 0.45 * ant * (1 - st) * rec;
        T.legT0 = T.legT1 = -0.30 * st * rec;
        T.legT2 = T.legT3 =  0.15 * st * rec;
        for (let i = 0; i < 5; i++) {
          T['trunkP' + i] += (-0.35 - i * 0.12) * st * rec + TRUNK_UP_UPPER[i] * st * rec * 0.4;
        }
        T.tuskF = 0.40 * st * rec;
      }
      else if (act === 'slam') {
        // Hantaman Seismik (Rearing Seismic Slam - SKILL 50%)
        const ant2 = ssVal(0.05, 0.42, tA);
        const rear = eocVal((tA - 0.45) / 0.62);
        const slam = Math.pow(clampVal((tA - 1.24) / 0.16, 0, 1), 2.4);
        const settle = Math.max(0, tA - 1.4);
        const a = 0.95 * rear * (1 - slam) + (-0.06) * slam;
        T.rootY += -0.10 * ant2 * (1 - rear);
        for (let i = 0; i < 4; i++) T['legS' + i] += 0.35 * ant2 * (1 - rear);

        if (rear > 0) {
          T.rootPitch = -a;
          T.rootY += 1.05 * Math.sin(a);
          T.surge += 1.05 * (Math.cos(a) - 1);
          T.legT0 = T.legT1 = lerpVal(-1.25 * rear, 0.15, slam);
          T.legS0 = T.legS1 = lerpVal(0.95 * rear, 0.05, slam);
          T.legS2 += 0.15 * rear;
          T.legS3 += 0.15 * rear;
          for (let i = 0; i < 5; i++) {
            T['trunkP' + i] += TRUNK_RAISE[i] * 0.45 * rear * (1 - slam * 0.9);
            if (settle > 0 && i >= 2) T['trunkP' + i] += 0.25 * Math.sin(16 * settle) * Math.exp(-4 * settle);
          }
          const apex = ssVal(1.0, 1.12, tA) * (1 - ssVal(1.2, 1.32, tA));
          for (let i = 0; i < 5; i++) T['trunkY' + i] += 0.35 * Math.sin(animTime * 11 + i * 1.7) * apex;
          T.rootRoll += 0.04 * Math.sin(animTime * 9) * apex;
          T.neckPitch += -0.85 * rear * (1 - slam);
          T.jaw += 0.70 * rear * (1 - slam * 0.7);
        }
        if (settle > 0) {
          T.rootY += 0.09 * Math.sin(17 * settle) * Math.exp(-5 * settle);
          T.neckYaw += 0.18 * Math.sin(21 * settle) * Math.exp(-4 * settle);
          T.neckPitch += 0.35 * ssVal(1.4, 1.6, tA) * (1 - ssVal(2.0, 2.45, tA));
        }
      }
      else if (act === 'swipe') {
        // Sapuan Belalai (Trunk Sweep)
        const wind = ssVal(0, 0.30, tA);
        const sw   = eoqVal((tA - 0.34) / 0.15);
        const rec2 = 1 - ssVal(1.0, 1.4, tA);
        const over = tA > 0.49 ? -0.35 * Math.sin(13 * (tA - 0.49)) * Math.exp(-5 * (tA - 0.49)) : 0;
        const WY = [0.18, 0.24, 0.28, 0.28, 0.26];
        const SY = [-0.22, -0.30, -0.36, -0.38, -0.34];
        for (let i = 0; i < 5; i++) {
          T['trunkY' + i] += (WY[i] * wind + SY[i] * sw + over * (0.5 + i * 0.12)) * rec2;
          T['trunkP' + i] += (-0.12 * sw + 0.10 * wind) * rec2;
        }
        T.neckYaw += (0.30 * wind - 0.50 * sw) * rec2;
        T.rootYawOff += (0.12 * wind - 0.26 * sw) * rec2;
        T.bodyPitch += (-0.06 * sw + 0.05 * wind) * rec2;
        T.jaw += 0.20 * sw * rec2;
        T.legT0 = T.legT1 = -0.10 * sw * rec2;
      }
      else if (act === 'taunt') {
        // Auman Sang Raja / Teriakan (King Roar - SKILL 50%)
        const rise = ssVal(0.10, 0.62, tA);
        const hold = 1 - ssVal(2.25, 2.8, tA);
        const k = rise * hold;
        T.neckPitch += -0.92 * k;
        T.jaw += (0.85 + 0.08 * Math.sin(animTime * 30)) * k;
        T.neckYaw += 0.04 * Math.sin(animTime * 40) * k;
        for (let i = 0; i < 5; i++) {
          T['trunkP' + i] += TRUNK_RAISE[i] * k + 0.05 * Math.sin(animTime * 26 + i * 2) * k;
          T['trunkY' + i] += (i % 2 ? 0.12 : -0.12) * k;
        }
        T.rootY += 0.05 * k;
        T.bodyPitch += -0.10 * k;
        T.breath += 0.02 * k * Math.sin(animTime * 6);
        T.legT0 = T.legT1 = -0.14 * k;
        T.legT2 = T.legT3 =  0.10 * k;
        T.legS0 = T.legS1 =  0.10 * k;
      }
      /* ================= LOCOMOTION 2-SENDI LUTUT (WALK / RUN / IDLE) ================= */
      else if (isMoving) {
        const run = sp > 3.2;
        const freq = run ? 2.5 : 1.45;
        const gaitPhase = (animTime * freq) % 1;

        // Trot diagonal pairs: Front Left (0) + Back Right (3) seirama, Front Right (1) + Back Left (2) berlawanan
        const fl = run ? this.gallopCycle(gaitPhase, true) : this.stepCycle(gaitPhase, true);
        const fr = run ? this.gallopCycle(gaitPhase + 0.50, true) : this.stepCycle(gaitPhase + 0.50, true);
        const bl = run ? this.gallopCycle(gaitPhase + 0.50, false) : this.stepCycle(gaitPhase + 0.50, false);
        const br = run ? this.gallopCycle(gaitPhase, false) : this.stepCycle(gaitPhase, false);

        T.legT0 = fl.thigh; T.legS0 = fl.knee;
        T.legT1 = fr.thigh; T.legS1 = fr.knee;
        T.legT2 = bl.thigh; T.legS2 = bl.knee;
        T.legT3 = br.thigh; T.legS3 = br.knee;

        const f = gaitPhase * TAU;
        T.rootY += (run ? 0.10 : 0.055) * Math.abs(Math.cos(f));
        T.rootRoll = (run ? 0.055 : 0.035) * Math.sin(f);
        T.rootPitch = -(run ? 0.10 : 0.04) + 0.03 * Math.sin(2 * f);
        T.neckPitch = 0.05 * Math.sin(f + 1.5);
        for (let i = 0; i < 5; i++) {
          T['trunkY' + i] = 0.10 * Math.sin(f - 0.5 - i * 0.4);
        }
      }
      else {
        // IDLE MAMMOTH:
        // 1. Idle Baru : Diam Sambil Menoleh Kanan Kiri (idleLook)
        // 2. Idle Lama : Makan Rumput Menunduk (idleGraze)
        const cycle = animTime % 22.0;
        const isEating = (act === 'graze' || m.idleMode === 'eat' || (!m.idleMode && cycle >= 13.0));

        if (isEating) {
          // Idle Graze (makan rumput santai menunduk)
          const t = (act === 'graze' ? tA : (cycle >= 13.0 ? cycle - 13.0 : animTime)) % 9.0;
          const down = clampVal(1 - ssVal(1.0, 2.2, t) + ssVal(6.5, 7.8, t), 0, 1);
          T.neckPitch = lerpVal(-0.05, 0.95, down) + 0.03 * Math.sin(animTime * 14) * down;
          T.jaw = down * (0.22 + 0.16 * Math.sin(animTime * 13));
          T.rootY = -0.03 * down;
          T.neckYaw = 0.4 * Math.sin((t - 2.2) * 1.4) * ssVal(1.0, 2.2, t) * (1 - ssVal(6.5, 7.8, t));
          T.legT0 = T.legT1 = -0.06 * down;
          const wig = 0.14 * Math.sin(animTime * 9) * down;
          T.trunkP3 += wig;
          T.trunkP4 += wig * 1.4;
          T.trunkP0 += 0.10 * down;
          T.trunkP1 += 0.12 * down;
          T.trunkP2 += 0.12 * down;
        } else {
          // Idle Baru: Diam Sambil Menoleh Kanan Kiri (idleLook)
          const t = (cycle < 13.0 ? cycle : animTime) % 13.0;
          let yaw = 0, pitch = -0.04;
          if (t < 2.0) {
            // Menatap lurus ke depan, napas tenang
            yaw = 0;
          } else if (t < 4.0) {
            // Menoleh ke kiri
            const u = ssVal(2.0, 4.0, t);
            yaw = 0.44 * u;
            pitch = -0.04 - 0.05 * Math.sin(u * Math.PI);
            T.earL += 0.4 * Math.sin(u * Math.PI);
          } else if (t < 6.5) {
            // Tahan memandang ke kiri
            yaw = 0.44 + 0.025 * Math.sin((t - 4.0) * 2.8);
            pitch = -0.04;
          } else if (t < 8.8) {
            // Menoleh dari kiri ke kanan melintasi tengah
            const u2 = ssVal(6.5, 8.8, t);
            yaw = lerpVal(0.44, -0.44, u2);
            pitch = -0.04 - 0.05 * Math.sin(u2 * Math.PI);
            if (u2 > 0.45) T.earR += 0.4 * Math.sin((u2 - 0.45) / 0.55 * Math.PI);
          } else if (t < 11.2) {
            // Tahan memandang ke kanan
            yaw = -0.44 - 0.025 * Math.sin((t - 8.8) * 2.8);
            pitch = -0.04;
          } else {
            // Kembali dari kanan ke tengah
            const u3 = ssVal(11.2, 13.0, t);
            yaw = lerpVal(-0.44, 0, u3);
            pitch = -0.04;
          }

          T.neckYaw = yaw;
          T.neckPitch = pitch;

          // Belalai meliuk luwes mengikuti arah tolehan kepala dengan inersia alami
          for (let j = 0; j < 5; j++) {
            T['trunkY' + j] += yaw * (0.35 + j * 0.14) + 0.05 * Math.sin(animTime * 1.6 - j * 0.3);
            T['trunkP' + j] += 0.03 * Math.sin(animTime * 1.4 + j * 0.2);
          }
        }
      }

      /* ================= SMOOTH EXPONENTIAL DAMPING ================= */
      const dampRate = act ? 26 : (isMoving ? 20 : 9);
      for (const k of KEYS) {
        C[k] += (T[k] - C[k]) * (1 - Math.exp(-dt * dampRate));
      }

      parts.rig.position.y = C.rootY;
      parts.rig.rotation.order = 'YXZ';
      parts.rig.rotation.set(C.rootPitch, C.rootYawOff, C.rootRoll);
      parts.body.rotation.x = C.bodyPitch;

      const brScale = 1 + (C.breath || 0);
      parts.body.scale.set(brScale, brScale, brScale);

      parts.head.rotation.set(C.neckPitch, C.neckYaw, 0);
      parts.jaw.rotation.x = C.jaw * 0.55;
      parts.earL.rotation.z = -C.earL;
      parts.earR.rotation.z =  C.earR;
      parts.tail.rotation.set(C.tailPitch, C.tailYaw, 0);
      parts.tuskL.rotation.x = -C.tuskF;
      parts.tuskR.rotation.x = -C.tuskF;

      for (let i = 0; i < 5; i++) {
        if (parts.trunk[i]) {
          parts.trunk[i].rotation.x = REST_P[i] + C['trunkP' + i];
          parts.trunk[i].rotation.y = C['trunkY' + i];
        }
      }

      for (let j = 0; j < 4; j++) {
        if (parts.legsT[j]) parts.legsT[j].rotation.x = C['legT' + j];
        if (parts.legsS[j]) parts.legsS[j].rotation.x = C['legS' + j];
      }

      // Kedipan mata amber
      const blink = Math.max(0, 1 - Math.abs(((animTime % 3.7) - 0.12)) * 14);
      const eyeScaleY = 1 - 0.9 * clampVal(blink, 0, 1);
      if (parts.eyeL) parts.eyeL.scale.y = eyeScaleY;
      if (parts.eyeR) parts.eyeR.scale.y = eyeScaleY;
    },

    /* ---------- EFEK KHUSUS JURUS MAMMOTH ---------- */
    upperFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const hx = m.pos.x + Math.sin(yaw) * 2.8;
      const hz = m.pos.z + Math.cos(yaw) * 2.8;
      FX.ring(hx, m.pos.y + 0.1, hz, 0xffd489, 1.0, 5.2);
      FX.debris(new THREE.Vector3(hx, m.pos.y + 1.8, hz), 0xf4ecd8, 22, 5.0);
      FX.addShake(0.55);
      if (typeof Sfx !== 'undefined' && Sfx.swing) Sfx.swing(1);
    },

    slamFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const cx = m.pos.x + fx * 2.2;
      const cz = m.pos.z + fz * 2.2;
      const cy = m.pos.y + 0.1;
      FX.ring(cx, cy + 0.1, cz, 0xff9a3c, 1.2, 8.5);
      FX.ring(cx, cy + 0.1, cz, 0xffffff, 0.8, 5.5);
      FX.debris(new THREE.Vector3(cx, cy + 0.6, cz), 0x74451f, 32, 6.0);
      FX.addShake(1.0);
      if (typeof FX.groundWave === 'function') {
        FX.groundWave(cx, cy, cz, { mode: 'radial', radius: 5.5, color: 0x8a5628, amp: 1.4 });
      }
      if (typeof Sfx !== 'undefined' && Sfx.smash) Sfx.smash();
    },

    swipeFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const hx = m.pos.x + Math.sin(yaw) * 3.2;
      const hz = m.pos.z + Math.cos(yaw) * 3.2;
      FX.debris(new THREE.Vector3(hx, m.pos.y + 1.2, hz), 0x8a5628, 18, 4.5);
      FX.ring(hx, m.pos.y + 0.1, hz, 0xffd489, 0.8, 4.5);
      FX.addShake(0.45);
      if (typeof Sfx !== 'undefined' && Sfx.swing) Sfx.swing(0);
    },

    tauntFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const hx = m.pos.x + Math.sin(yaw) * 1.5;
      const hz = m.pos.z + Math.cos(yaw) * 1.5;
      const hy = m.pos.y + 4.2;
      FX.ring(hx, hy, hz, 0xffa82e, 1.2, 7.0);
      FX.ring(hx, hy, hz, 0xffd489, 0.8, 5.2);
      FX.addShake(0.65);
      if (typeof Sfx !== 'undefined' && Sfx.roar) Sfx.roar();
      else if (typeof Sfx !== 'undefined' && Sfx.shout) Sfx.shout();
    }
  };

  return Mob_Mammoth;
})();

window.Mob_Mammoth = Mob_Mammoth;
