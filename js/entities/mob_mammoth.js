'use strict';
/* =============================================================================
   ENTITAS MOB: MAMMOTH PURBA (RAJAGADING) 🦣
   -----------------------------------------------------------------------------
   Diporting otentik dari "NEW MODEL/mammoth.html".
   Predator/behemoth puncak biome Pegunungan (Mountain), kekuatan & ukuran setara
   T-Rex purba.

   Model Voxel Anatomi Lengkap:
     - Tubuh bongsor berbulu lebat (woolly coat) dengan punuk pundak tinggi
     - 4 Kaki berlutut fleksibel (Thigh legT + Shin legS) dengan kuku purba
     - Kepala raksasa bermahkota bulu, rahang bawah artikulatif, dan mata amber
     - Dua gading purba raksasa melengkung keluar & ke atas (dense curved ivory)
     - Belalai 5-segmen lentur (articulated trunk)
     - Telinga berbulu dan ekor berumbai

   ANIMASI & 4 AKSI JURUS:
     - idle  : Makan rumput (idleGraze) menunduk dengan liukan belalai alami,
               napas perut, telinga berkedut, ekor bergoyang, dan kedipan mata.
     - walk  : Siklus jalan 4 kaki berlutut (quadruped gait trot) dengan ayunan
               belalai dan gelombang badan.
     - run   : Derap lari kencang gallop dengan getaran hentakan tanah berdebu.
     - upper : 'Seruduk Langit' (Uppercut Tusk Slash) — menunduk ancang-ancang lalu
               meledak menyabetkan gading tajam ke atas, melontarkan musuh ke udara.
     - slam  : 'Hantaman Seismik' (Rearing Seismic Slam) — mengangkat kedua kaki depan
               tinggi-tinggi ke udara, lalu menghantam bumi sekuat tenaga melepaskan
               gelombang kejut seismik (AoE luas + retakan tanah + screen shake).
     - swipe : 'Sapuan Belalai' (Trunk Sweep) — belalai meliuk menyapu horizontal
               merusak musuh di depannya.
     - taunt : 'Auman Sang Raja' (King Roar) — mengangkat belalai tegak ke langit,
               mendongak membuka rahang, melepaskan 3 cincin gelombang auman keras.
   ============================================================================= */

const Mob_Mammoth = (() => {

  const SCALE = 0.58; // Ukuran setara T-Rex (tinggi ~3.8 blok di dunia game)
  const V = 0.155;    // Skala grid voxel per unit lokal
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

  const clampVal = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerpVal  = (a, b, t) => a + (b - a) * t;
  const ssVal    = (a, b, x) => { const t = clampVal((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eocVal   = t => 1 - Math.pow(1 - clampVal(t, 0, 1), 3);
  const eoqVal   = t => 1 - Math.pow(1 - clampVal(t, 0, 1), 4);

  const KEYS = [
    'rootY', 'rootPitch', 'rootRoll', 'rootYawOff', 'surge', 'bodyPitch', 'breath',
    'neckPitch', 'neckYaw', 'jaw', 'earL', 'earR', 'tailYaw', 'tailPitch', 'tuskF',
    'legT0', 'legT1', 'legT2', 'legT3', 'legS0', 'legS1', 'legS2', 'legS3',
    'trunkP0', 'trunkP1', 'trunkP2', 'trunkP3', 'trunkP4',
    'trunkY0', 'trunkY1', 'trunkY2', 'trunkY3', 'trunkY4'
  ];

  const REST_P = [-0.10, -0.16, -0.24, -0.30, -0.26];
  const segLen = [3, 3, 3, 2, 2];

  let _sharedBox = null;
  function getBoxGeo() {
    if (!_sharedBox) _sharedBox = new THREE.BoxGeometry(1, 1, 1);
    return _sharedBox;
  }

  function makeMats() {
    const cache = {};
    return c => {
      if (!cache[c]) {
        cache[c] = new THREE.MeshLambertMaterial({ color: c });
      }
      return cache[c];
    };
  }

  const Mob_Mammoth = {
    SCALE,
    DUR: {
      upper: 1.5,
      slam: 2.5,
      swipe: 1.45,
      taunt: 2.9
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

      const M = makeMats();
      const parts = {};
      const boxGeo = getBoxGeo();

      const vox = (parent, w, h, d, x, y, z, col, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(boxGeo, M(col));
        m.scale.set(w * V, h * V, d * V);
        m.position.set(x * V, y * V, z * V);
        if (rx || ry || rz) m.rotation.set(rx, ry, rz);
        m.castShadow = !IS_MOBILE;
        parent.add(m);
        return m;
      };

      const rig = new THREE.Group();
      g.add(rig);
      parts.rig = rig;

      // Body Group
      const bodyG = new THREE.Group();
      rig.add(bodyG);
      parts.body = bodyG;

      /* ================= 1. TORSO & PUNUK BULU LEBAT ================= */
      // Badan inti besar
      vox(bodyG, 6.8, 6.0, 12.0, 0, 8.5, -2.5, C.FUR_MAIN);
      // Pundak & punuk tinggi
      vox(bodyG, 6.2, 3.2, 7.0,  0, 11.5, 0.2, C.FUR_MID);
      vox(bodyG, 5.0, 1.8, 5.2,  0, 13.0, 0.4, C.FUR_LIGHT);
      // Dada depan tebal
      vox(bodyG, 6.0, 5.0, 4.0,  0, 8.5,  2.6, C.FUR_DARK);
      // Perut bawah & rumbai bulu menggantung
      vox(bodyG, 6.4, 2.0, 10.5, 0, 5.2, -2.5, C.BELLY);
      vox(bodyG, 6.8, 1.4, 8.0,  0, 4.2, -2.0, C.FUR_DARK);
      // Pinggul belakang
      vox(bodyG, 6.0, 5.2, 4.0,  0, 8.0, -7.0, C.FUR_DARK);

      /* ================= 2. KEPALA, TENGKORAK & RAHANG ================= */
      const headG = new THREE.Group();
      headG.position.set(0, 10 * V, 3 * V);
      bodyG.add(headG);
      parts.head = headG;

      // Tengkorak kepala berbulu tebal
      vox(headG, 5.0, 5.2, 4.5, 0, 1.2, 1.2, C.FUR_MAIN);
      vox(headG, 4.2, 2.2, 3.8, 0, 3.8, 1.4, C.FUR_LIGHT);
      vox(headG, 3.6, 3.4, 2.4, 0, 0.4, 4.0, C.FUR_DARK);

      // Rahang Bawah
      const jawG = new THREE.Group();
      jawG.position.set(0, -2 * V, 1 * V);
      headG.add(jawG);
      parts.jaw = jawG;
      vox(jawG, 3.0, 1.4, 4.0, 0, 0, 1.8, C.JAW);

      // Mata Amber Menyala
      const eyeMat = new THREE.MeshBasicMaterial({ color: C.EYE });
      const eyeL = new THREE.Mesh(boxGeo, eyeMat);
      eyeL.scale.set(0.65 * V, 0.65 * V, 0.2 * V);
      eyeL.position.set(-2.55 * V, 1.5 * V, 2.6 * V);
      const eyeR = eyeL.clone();
      eyeR.position.x = 2.55 * V;
      headG.add(eyeL, eyeR);
      parts.eyeL = eyeL; parts.eyeR = eyeR;

      // Telinga Berbulu
      const mkEar = (sx) => {
        const eg = new THREE.Group();
        eg.position.set(sx * 2.2 * V, 3 * V, 0.5 * V);
        vox(eg, 1.2, 3.2, 0.6, 0, -1.2, 0, C.FUR_DARK, 0, 0, sx * 0.18);
        headG.add(eg);
        return eg;
      };
      parts.earL = mkEar(-1);
      parts.earR = mkEar(1);

      /* ================= 3. BELALAI 5-SEGMEN (TRUNK) ================= */
      parts.trunk = [];
      let parentTrunk = headG;
      const segW = [1.8, 1.6, 1.4, 1.15, 0.95];
      for (let s = 0; s < 5; s++) {
        const tg = new THREE.Group();
        tg.position.set(0, (s === 0 ? 1 : -segLen[s - 1]) * V, (s === 0 ? 4 : 0) * V);
        parentTrunk.add(tg);
        parts.trunk.push(tg);
        for (let k = 0; k < segLen[s]; k++) {
          vox(tg, segW[s], 1.05, segW[s], 0, -k, 0, (k % 2 ? C.FUR_DARK : C.FUR_MAIN));
        }
        parentTrunk = tg;
      }
      // Ujung belalai
      vox(parts.trunk[4], 0.75, 0.85, 0.75, 0, -segLen[4], 0, C.TRUNK_END);

      /* ================= 4. GADING GANDA RAKSASA (MAMMOTH TUSKS) ================= */
      const buildTuskGroup = (sgn) => {
        const tg = new THREE.Group();
        tg.position.set(sgn * 1.3 * V, -1.2 * V, 2.5 * V);
        const mainPts = [];
        const N = 12;
        for (let i = 0; i < N; i++) {
          const t = i / (N - 1);
          const z = 0 + 7.8 * t;
          const y = (t < 0.28) ? (-0.25 - 1.65 * (t / 0.28)) : (-1.9 + 4.7 * Math.pow((t - 0.28) / 0.72, 1.45));
          const x = sgn * (0.25 + 2.3 * Math.pow(t, 0.72));
          const s = (t < 0.12) ? 1.75 : (t < 0.4) ? 1.4 : (t < 0.7) ? 1.15 : (t < 0.9) ? 0.92 : 0.68;
          mainPts.push({ x, y, z, s, t });
        }
        for (let j = 0; j < mainPts.length - 1; j++) {
          const p0 = mainPts[j], p1 = mainPts[j + 1];
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
          const steps = Math.max(1, Math.ceil(dist / (V * 0.85)));
          for (let k = 0; k < steps; k++) {
            const u = k / steps;
            const px = lerpVal(p0.x, p1.x, u);
            const py = lerpVal(p0.y, p1.y, u);
            const pz = lerpVal(p0.z, p1.z, u);
            const ps = lerpVal(p0.s, p1.s, u);
            const pt = lerpVal(p0.t, p1.t, u);
            const col = (pt > 0.85) ? C.TUSK_TIP : C.TUSK_BASE;
            vox(tg, ps, ps, ps, px, py, pz, col);
          }
        }
        headG.add(tg);
        return tg;
      };
      parts.tuskL = buildTuskGroup(-1);
      parts.tuskR = buildTuskGroup(1);

      /* ================= 5. EKOR ================= */
      const tailG = new THREE.Group();
      tailG.position.set(0, 11 * V, -8.4 * V);
      bodyG.add(tailG);
      parts.tail = tailG;
      vox(tailG, 0.8, 2.0, 0.8, 0, -1.0, 0.2, C.FUR_DARK, -0.3, 0, 0);
      vox(tailG, 1.1, 1.4, 1.1, 0, -2.4, 0.6, C.TRUNK_END, -0.3, 0, 0);

      /* ================= 6. KAKI DENGAN LUTUT (4 LEGS) ================= */
      parts.legsT = [];
      parts.legsS = [];
      const legCoords = [[2.2, 6, 1.2], [-2.2, 6, 1.2], [2.2, 6, -6.0], [-2.2, 6, -6.0]];
      for (let i = 0; i < 4; i++) {
        const th = new THREE.Group();
        th.position.set(legCoords[i][0] * V, legCoords[i][1] * V, legCoords[i][2] * V);
        bodyG.add(th);
        parts.legsT.push(th);

        // Paha atas tebal berbulu
        vox(th, 2.2, 3.4, 2.2, -0.2, -1.4, 0, C.FUR_MAIN);
        // Tempurung lutut keras di depan
        vox(th, 1.8, 1.4, 1.0, -0.2, -2.6, 0.8, C.BELLY);

        // Betis & Kaki Bawah
        const sh = new THREE.Group();
        sh.position.set(0, -3.0 * V, 0.5 * V);
        th.add(sh);
        parts.legsS.push(sh);

        vox(sh, 2.0, 3.2, 2.0, -0.2, -1.4, -0.2, C.FUR_DARK);
        // Telapak & Kuku Keras
        vox(sh, 2.2, 1.0, 2.4, -0.2, -2.8, -0.2, C.HOOF);
        vox(sh, 1.4, 0.5, 0.8, -0.2, -2.8, 1.1, C.HOOF_L);
      }

      // Inisialisasi parameter pose
      parts.targetPose = {};
      parts.currentPose = {};
      for (const k of KEYS) {
        parts.targetPose[k] = 0;
        parts.currentPose[k] = 0;
      }

      return { mesh: g, parts };
    },

    /* ---------- SIKLUS GAIT & POSE DASAR ---------- */
    gaitCycle(phase, isFront) {
      const p = ((phase % 1) + 1) % 1;
      let thigh, knee;
      if (p < 0.48) {
        const u = p / 0.48;
        thigh = 0.35 - 0.70 * ssVal(0, 1, u);
        knee = (isFront ? 0.65 : 0.55) * Math.sin(u * Math.PI);
      } else {
        const u = (p - 0.48) / 0.52;
        thigh = -0.35 + 0.70 * ssVal(0, 1, u);
        knee = 0.08 * Math.sin(u * Math.PI);
      }
      return { thigh, knee };
    },

    /* ---------- ANIMATE FRAME UPDATE ---------- */
    animate(m, dt) {
      if (!m || !m.parts) return;

      m._mAnimT = (m._mAnimT || 0) + dt;
      const animTime = m._mAnimT;
      const parts = m.parts;
      const T = parts.targetPose;
      const C = parts.currentPose;

      // Reset target pose ke 0
      for (const k of KEYS) T[k] = 0;

      // Pernapasan, kibasan ekor & kedutan telinga lembut
      T.breath = 0.012 * Math.sin(animTime * 1.8);
      T.tailYaw = 0.35 * Math.sin(animTime * 1.25) + 0.15 * Math.sin(animTime * 2.5);
      T.earL = 0.25 * Math.pow(Math.max(0, Math.sin(animTime * 0.8)), 8);
      T.earR = 0.25 * Math.pow(Math.max(0, Math.sin(animTime * 0.8 + 2.2)), 8);

      for (let j = 0; j < 4; j++) {
        const rest = j < 2 ? 0.08 : 0.12;
        T['legS' + j] += rest;
        T['legT' + j] -= rest * 0.45;
      }

      const sp = Math.hypot(m.vel.x, m.vel.z);
      const isMoving = sp > 0.15;
      const act = m.mAct;
      const tA = m.mActT || 0;

      /* ================= ACTION / ATTACK POSES ================= */
      if (act === 'upper') {
        // Seruduk Langit (Uppercut Tusk Slash)
        const ant = ssVal(0, 0.30, tA);
        const st  = eoqVal((tA - 0.38) / 0.14);
        const rec = 1 - ssVal(0.95, 1.45, tA);
        T.neckPitch = (0.55 * ant * (1 - st) - 1.05 * st) * rec;
        T.jaw = 0.45 * st * rec;
        T.rootY += (-0.12 * ant * (1 - st) + 0.18 * st * (1 - ssVal(0.75, 1.3, tA))) * rec;
        T.bodyPitch = (0.16 * ant * (1 - st) - 0.22 * st) * rec;
        for (let i = 0; i < 4; i++) T['legS' + i] += 0.45 * ant * (1 - st) * rec;
        T.legT0 = T.legT1 = -0.32 * st * rec;
        T.legT2 = T.legT3 =  0.18 * st * rec;
        for (let j = 0; j < 5; j++) T['trunkP' + j] += (-0.35 - j * 0.12) * st * rec;
        T.tuskF = 0.45 * st * rec;
      }
      else if (act === 'slam') {
        // Hantaman Seismik (Rearing Seismic Slam)
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
          T.legS2 += 0.18 * rear;
          T.legS3 += 0.18 * rear;
          for (let j = 0; j < 5; j++) {
            T['trunkP' + j] += (-0.22 * j) * 0.45 * rear * (1 - slam * 0.9);
          }
          T.neckPitch += -0.85 * rear * (1 - slam);
          T.jaw += 0.70 * rear * (1 - slam * 0.7);
        }
        if (settle > 0) {
          T.rootY += 0.09 * Math.sin(17 * settle) * Math.exp(-5 * settle);
          T.neckYaw += 0.18 * Math.sin(21 * settle) * Math.exp(-4 * settle);
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
        T.neckYaw += (0.35 * wind - 0.55 * sw) * rec2;
        T.rootYawOff += (0.14 * wind - 0.28 * sw) * rec2;
        T.jaw += 0.25 * sw * rec2;
      }
      else if (act === 'taunt') {
        // Auman Sang Raja (King Roar)
        const rise = ssVal(0.1, 0.62, tA);
        const hold = 1 - ssVal(2.25, 2.8, tA);
        const k = rise * hold;
        T.neckPitch += -0.92 * k;
        T.jaw += (0.85 + 0.08 * Math.sin(animTime * 30)) * k;
        for (let i = 0; i < 5; i++) {
          T['trunkP' + i] += (-0.35 * (i + 1)) * k + 0.05 * Math.sin(animTime * 26 + i * 2) * k;
          T['trunkY' + i] += (i % 2 ? 0.12 : -0.12) * k;
        }
        T.rootY += 0.06 * k;
        T.bodyPitch += -0.10 * k;
      }
      /* ================= LOCOMOTION (WALK / RUN / IDLE) ================= */
      else if (isMoving) {
        const run = sp > 3.2;
        const freq = run ? 2.3 : 1.35;
        const gaitPhase = (animTime * freq) % 1;

        const fl = this.gaitCycle(gaitPhase, true);
        const fr = this.gaitCycle(gaitPhase + 0.50, true);
        const bl = this.gaitCycle(gaitPhase + 0.55, false);
        const br = this.gaitCycle(gaitPhase + 0.05, false);

        T.legT0 = fl.thigh; T.legS0 = fl.knee;
        T.legT1 = fr.thigh; T.legS1 = fr.knee;
        T.legT2 = bl.thigh; T.legS2 = bl.knee;
        T.legT3 = br.thigh; T.legS3 = br.knee;

        const f = gaitPhase * TAU;
        T.rootY += (run ? 0.10 : 0.05) * Math.abs(Math.sin(f));
        T.rootRoll += (run ? 0.05 : 0.025) * Math.sin(f);
        T.rootPitch += (run ? 0.10 : 0.04) + Math.sin(f) * 0.03;
        T.neckPitch += 0.05 * Math.sin(f + 1.5);
        for (let j = 0; j < 5; j++) {
          T['trunkY' + j] += 0.12 * Math.sin(f - 0.5 - j * 0.4);
        }
      }
      else {
        // Idle Graze (makan rumput santai menunduk)
        const t = animTime % 10;
        const down = clampVal(1 - ssVal(3.8, 4.6, t) + ssVal(6.6, 7.4, t), 0, 1);
        T.neckPitch = lerpVal(-0.05, 0.95, down) + 0.03 * Math.sin(animTime * 14) * down;
        T.jaw = down * (0.22 + 0.16 * Math.sin(animTime * 13));
        T.rootY = -0.03 * down;
        T.neckYaw = 0.4 * Math.sin((t - 4.6) * 1.4) * ssVal(3.8, 4.6, t) * (1 - ssVal(6.6, 7.4, t));
        const wig = 0.14 * Math.sin(animTime * 9) * down;
        T.trunkP3 += wig;
        T.trunkP4 += wig * 1.4;
      }

      /* ================= SMOOTH DAMPING & POSE APPLICATION ================= */
      const dampRate = act ? 24 : (isMoving ? 18 : 9);
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
      const hx = m.pos.x + Math.sin(yaw) * 1.8;
      const hz = m.pos.z + Math.cos(yaw) * 1.8;
      FX.ring(hx, m.pos.y + 0.1, hz, 0xffd489, 0.6, 3.2);
      FX.debris(new THREE.Vector3(hx, m.pos.y + 1.2, hz), 0xf4ecd8, 16, 4.0);
      FX.addShake(0.45);
      if (typeof Sfx !== 'undefined' && Sfx.swing) Sfx.swing(1);
    },

    slamFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const cx = m.pos.x + fx * 1.4;
      const cz = m.pos.z + fz * 1.4;
      const cy = m.pos.y + 0.1;
      FX.ring(cx, cy, cz, 0xff9a3c, 0.8, 6.5);
      FX.ring(cx, cy, cz, 0xffffff, 0.5, 4.2);
      FX.debris(new THREE.Vector3(cx, cy + 0.4, cz), 0x74451f, 26, 5.0);
      FX.addShake(0.85);
      if (typeof FX.groundWave === 'function') {
        FX.groundWave(cx, cy, cz, { mode: 'radial', radius: 4.2, color: 0x8a5628, amp: 1.2 });
      }
      if (typeof Sfx !== 'undefined' && Sfx.smash) Sfx.smash();
    },

    swipeFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const hx = m.pos.x + Math.sin(yaw) * 2.0;
      const hz = m.pos.z + Math.cos(yaw) * 2.0;
      FX.debris(new THREE.Vector3(hx, m.pos.y + 0.8, hz), 0x8a5628, 14, 3.5);
      FX.ring(hx, m.pos.y + 0.1, hz, 0xffd489, 0.5, 3.0);
      FX.addShake(0.35);
      if (typeof Sfx !== 'undefined' && Sfx.swing) Sfx.swing(0);
    },

    tauntFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const hx = m.pos.x + Math.sin(yaw) * 1.0;
      const hz = m.pos.z + Math.cos(yaw) * 1.0;
      const hy = m.pos.y + 3.2;
      FX.ring(hx, hy, hz, 0xffa82e, 0.8, 5.0);
      FX.ring(hx, hy, hz, 0xffd489, 0.5, 3.8);
      FX.addShake(0.5);
      if (typeof Sfx !== 'undefined' && Sfx.roar) Sfx.roar();
      else if (typeof Sfx !== 'undefined' && Sfx.shout) Sfx.shout();
    }
  };

  return Mob_Mammoth;
})();

window.Mob_Mammoth = Mob_Mammoth;
