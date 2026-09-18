'use strict';
/* =============================================================================
   ENTITAS MOB: BABI HUTAN (Wild Boar) 🐗
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/Babi Hutan.html".
   Model voxel anatomi lengkap dengan rig 2-sendi lutut per kaki (Thigh + Knee/Shin),
   punuk berotot, surai punggung 11 baris, gading melengkung tajam ganda, rahang
   bawah artikulasi, telinga bergaris pink, ekor berbulu, dan mata merah berkedip.

   ANIMASI LENGKAP:
     - idle  : napas perut mengembang/mengempis, lirikan kepala halus, kuping
               berkedut, ekor bergoyang, lutut rileks, kedipan mata otomatis.
     - walk  : siklus jalan 2-sendi (quadruped trot) dengan lutut menyapu &
               mengangkat kuku melewati tanah, hentakan badan ritmis.
     - run   : derap kencang gallop 2-sendi dengan lutut melipat elastis di bawah
               dada dan dorongan lurus penuh, ekor tegak mengancam.
     - punch : 'Pukulan Gading ke Atas' (Uppercut Tusk Slash) — merunduk memampatkan
               kedua lutut depan, meledak meluruskan lutut dengan sabetan gading
               ke atas & rahang membuka lebar, melontarkan musuh ke udara.
     - gore  : 'Seruduk Lari Kencang' (Gore Charge) —
               Fase 1: Ancang-ancang menunduk + mengais tanah 3 kali berirama diiringi
                       semburan debu tanah ke belakang & getar tegang tubuh (SNORT!).
               Fase 2: Melesat lari kencang menerjang maju (kecepatan tinggi derap)
                       dengan gading terhunus lurus ke depan & jejak debu (SERUDUK!).
               Fase 3: Mengerem menancapkan kuku depan dengan kepulan debu pengereman.

   File ini menyediakan MODEL 3D, pose & mesin animasi, serta FX debu partikel.
   AI & alur tempur dikendalikan js/monsters.js (aiBoar, boarAtk).
   ============================================================================= */

const Mob_Boar = (() => {

  const SCALE = 0.115; // Skala presisi model di dunia voxel

  const C = {
    FUR_MAIN:   0x463022,
    FUR_DARK:   0x322016,
    FUR_DEEP:   0x20140c,
    FUR_WARM:   0x5a3e2c,
    HUMP_DARK:  0x2e1c12,
    SNOUT_BASE: 0x684632,
    SNOUT_PAD:  0x865842,
    NOSTRIL:    0x1b110b,
    MOUTH_IN:   0x84362d,
    TUSK_ROOT:  0x6e6353,
    TUSK_IVORY: 0xfcf8ee,
    HOOF:       0x18110d,
    EAR_OUTER:  0x3e281c,
    EAR_INNER:  0xa86e60,
    EYE_RED:    0xeb2618,
    EYE_GLINT:  0xffffff,
  };

  /* Pivot anatomis dari file acuan */
  const HP = [0, 8.6, 5.8];            // Pivot leher/kepala
  const JP = [0, 7.3, 10.4];           // Pivot rahang bawah
  const EL = [ 2.1, 10.8, 7.8];        // Telinga kiri
  const ER = [-2.1, 10.8, 7.8];        // Telinga kanan

  let _sharedBox = null;
  function geo() {
    if (!_sharedBox) _sharedBox = new THREE.BoxGeometry(1, 1, 1);
    return _sharedBox;
  }

  const smooth5 = x => {
    x = Math.max(0, Math.min(1, x));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  const PF = [
    'rigY', 'bodyPitch', 'bodyRoll', 'bodyYaw',
    'headPitch', 'headYaw', 'headRoll',
    'jaw', 'earL', 'earR', 'earF', 'tailX', 'tailZ',
    'fl', 'fl_k', 'fr', 'fr_k',
    'bl', 'bl_k', 'br', 'br_k',
    'breathe', 'eye'
  ];

  function zeroPose() {
    const o = {};
    for (let i = 0; i < PF.length; i++) o[PF[i]] = 0;
    o.breathe = 0.005;
    o.jaw = 0.02;
    return o;
  }

  function mkPose(o) {
    const p = zeroPose();
    Object.assign(p, o);
    return p;
  }

  function sampleTrack(keys, ct) {
    const T = keys[keys.length - 1].t;
    const c = ((ct % T) + T) % T;
    let i = 0;
    while (i < keys.length - 2 && c > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1];
    const span = Math.max(1e-6, b.t - a.t);
    const u = smooth5((c - a.t) / span);
    const o = zeroPose();
    for (let k = 0; k < PF.length; k++) {
      const prop = PF[k];
      const av = (a[prop] !== undefined ? a[prop] : 0);
      const bv = (b[prop] !== undefined ? b[prop] : 0);
      o[prop] = av + (bv - av) * u;
    }
    return o;
  }

  /* ================= SIKLUS JALAN 2-SENDI LUTUT (QUADRUPED TROT) ================= */
  function stepCycle(phase, isFront) {
    const p = ((phase % 1) + 1) % 1;
    let thigh, knee;
    if (p < 0.45) {
      // Mengangkat kaki dan mengayun ke depan
      const u = p / 0.45;
      thigh = 0.32 - 0.64 * smooth5(u);
      // Lutut menekuk mengangkat kuku melewati tanah
      knee = (isFront ? 0.52 : 0.45) * Math.sin(u * Math.PI);
    } else {
      // Menapak dan mendorong tanah ke belakang
      const u = (p - 0.45) / 0.55;
      thigh = -0.32 + 0.64 * smooth5(u);
      // Lutut hampir lurus menopang bobot badan
      knee = 0.06 * Math.sin(u * Math.PI);
    }
    return { thigh, knee };
  }

  /* ================= SIKLUS DERAP / GALLOP 2-SENDI LUTUT ================= */
  function gallopCycle(phase, isFront) {
    const p = ((phase % 1) + 1) % 1;
    let thigh, knee;
    if (p < 0.50) {
      const u = p / 0.50;
      thigh = (isFront ? 0.50 : -0.35) - (isFront ? 1.05 : -0.95) * smooth5(u);
      // Lutut menekuk dalam saat kaki melipat di bawah dada
      knee = (isFront ? 0.78 : 0.68) * Math.sin(u * Math.PI);
    } else {
      const u = (p - 0.50) / 0.50;
      thigh = (isFront ? -0.55 : 0.60) + (isFront ? 1.05 : -0.95) * smooth5(u);
      // Mendorong lurus penuh
      knee = 0.10 * Math.sin(u * Math.PI);
    }
    return { thigh, knee };
  }

  /* ================= DAFTAR POSE ANIMASI ================= */
  const PUNCH_T = 1.10;
  const PUNCH_KEYS = [
    { t: 0.00, rigY: 0.00, bodyPitch: 0.00, headPitch: 0.04, jaw: 0.02, tailX: 0.08,
      fl: 0.02, fl_k: 0.08, fr: -0.02, fr_k: 0.08, bl: -0.02, bl_k: 0.10, br: 0.02, br_k: 0.10 },
    // Ancang turun memampatkan kedua lutut depan
    { t: 0.22, rigY: -0.20, bodyPitch: 0.06, headPitch: 0.42, jaw: 0.04, tailX: 0.16, earF: -0.20,
      fl: 0.22, fl_k: 0.62, fr: 0.22, fr_k: 0.62, bl: -0.18, bl_k: 0.35, br: -0.18, br_k: 0.35 },
    // Hentakan meledak ke atas, lutut melurus seketika!
    { t: 0.38, rigY: 0.36, bodyPitch: -0.18, headPitch: -0.95, jaw: 0.58, tailX: 0.55, earF: 0.55,
      fl: -0.10, fl_k: 0.02, fr: -0.10, fr_k: 0.02, bl: 0.05, bl_k: 0.05, br: 0.05, br_k: 0.05 },
    // Puncak ayunan gading di udara
    { t: 0.55, rigY: 0.10, bodyPitch: -0.05, headPitch: -0.35, jaw: 0.22, tailX: 0.28, earF: 0.20,
      fl: 0.05, fl_k: 0.15, fr: 0.05, fr_k: 0.15, bl: -0.05, bl_k: 0.10, br: -0.05, br_k: 0.10 },
    // Mendarat dengan lutut meredam benturan
    { t: 0.80, rigY: -0.06, bodyPitch: 0.02, headPitch: 0.10, jaw: 0.05, tailX: 0.12,
      fl: 0.10, fl_k: 0.30, fr: 0.10, fr_k: 0.30, bl: -0.05, bl_k: 0.15, br: -0.05, br_k: 0.15 },
    { t: 1.10, rigY: 0.00, bodyPitch: 0.00, headPitch: 0.04, jaw: 0.02, tailX: 0.08,
      fl: 0.02, fl_k: 0.08, fr: -0.02, fr_k: 0.08, bl: -0.02, bl_k: 0.10, br: 0.02, br_k: 0.10 }
  ];

  const GORE_T = 3.10; // Total siklus seruduk (1.1s mengais -> 1.4s sprint seruduk -> 0.6s rem)

  const P = {
    idle(t) {
      const br = Math.sin(t * 1.8);
      return mkPose({
        rigY: 0,
        bodyPitch: br * 0.012,
        bodyRoll: Math.sin(t * 0.6) * 0.014,
        headPitch: 0.04 + Math.sin(t * 0.9) * 0.035,
        headYaw: Math.sin(t * 0.35) * 0.12,
        headRoll: Math.sin(t * 0.25) * 0.025,
        jaw: 0.02 + Math.max(0, Math.sin(t * 1.8)) * 0.04,
        earL: Math.pow(Math.max(0, Math.sin(t * 0.8)), 8) * 0.35,
        earR: Math.pow(Math.max(0, Math.sin(t * 0.8 + 2.2)), 8) * 0.35,
        earF: Math.sin(t * 1.4) * 0.06,
        tailX: 0.08,
        tailZ: Math.sin(t * 3.2) * 0.35 + Math.sin(t * 6.4) * 0.15,
        // Sedikit tekukan alami pada sendi lutut saat berdiri santai
        fl: 0.02, fl_k: 0.08,
        fr: -0.02, fr_k: 0.08,
        bl: -0.02, bl_k: 0.10,
        br: 0.02, br_k: 0.10,
        breathe: 0.006 + 0.005 * br,
        eye: 0
      });
    },

    walk(t) {
      const f = t * 5.6;
      const s = Math.sin(f), c = Math.cos(f);
      const pBase = f / (Math.PI * 2);

      const flL = stepCycle(pBase, true);
      const frL = stepCycle(pBase + 0.50, true);
      const blL = stepCycle(pBase + 0.55, false);
      const brL = stepCycle(pBase + 0.05, false);

      return mkPose({
        rigY: Math.abs(c) * 0.12,
        bodyPitch: 0.02 + Math.sin(2 * f) * 0.015,
        bodyRoll: s * 0.028,
        bodyYaw: s * 0.018,
        headPitch: 0.05 - Math.sin(2 * f) * 0.035,
        headYaw: Math.sin(f * 0.5 + 1.2) * 0.06 + s * 0.03,
        headRoll: s * 0.015,
        jaw: 0.02,
        earL: Math.pow(Math.max(0, Math.sin(t * 1.1)), 8) * 0.25,
        earR: Math.pow(Math.max(0, Math.sin(t * 1.1 + 1.8)), 8) * 0.25,
        earF: Math.sin(f * 2) * 0.08,
        tailX: 0.08,
        tailZ: Math.sin(t * 4.0) * 0.45,
        fl: flL.thigh, fl_k: flL.knee,
        fr: frL.thigh, fr_k: frL.knee,
        bl: blL.thigh, bl_k: blL.knee,
        br: brL.thigh, br_k: brL.knee,
        breathe: 0.005,
        eye: 0
      });
    },

    run(t) {
      const f = t * 12.5;
      const s = Math.sin(f);
      const pBase = f / (Math.PI * 2);

      const flL = gallopCycle(pBase, true);
      const frL = gallopCycle(pBase + 0.35, true);
      const blL = gallopCycle(pBase + 0.55, false);
      const brL = gallopCycle(pBase + 0.90, false);

      return mkPose({
        rigY: Math.abs(s) * 0.36 + 0.04,
        bodyPitch: 0.08 + Math.sin(f + 0.9) * 0.05,
        bodyRoll: Math.sin(f) * 0.02,
        bodyYaw: Math.sin(f * 0.5) * 0.015,
        headPitch: 0.14 + Math.sin(f + 0.9) * 0.06,
        headYaw: Math.sin(f * 0.5) * 0.025,
        headRoll: Math.sin(f) * 0.012,
        jaw: 0.05,
        earL: 0.12, earR: 0.12, earF: 0.30 + Math.sin(f * 2) * 0.10,
        tailX: 1.1 + Math.sin(f) * 0.08,
        tailZ: Math.sin(t * 7.0) * 0.25,
        fl: flL.thigh, fl_k: flL.knee,
        fr: frL.thigh, fr_k: frL.knee,
        bl: blL.thigh, bl_k: blL.knee,
        br: brL.thigh, br_k: brL.knee,
        breathe: 0.012,
        eye: 0
      });
    },

    punch(t) {
      return sampleTrack(PUNCH_KEYS, t);
    },

    gore(t) {
      const c = Math.max(0, Math.min(GORE_T, t));

      // FASE 1: ANCANG-ANCANG MENGAIS TANAH (t = 0.0 s/d 1.10s)
      if (c < 1.10) {
        const u = Math.min(1, c / 0.30);
        const crouchY = -0.22 * u;
        const p = mkPose({
          rigY: crouchY,
          bodyPitch: -0.07 * u,
          headPitch: 0.10 + 0.42 * u, // Menunduk tajam mengarahkan gading
          tailX: 0.15 + 0.25 * u,
          jaw: 0.04 + 0.08 * u,
          earF: -0.30 * u,
          // Kaki kanan depan bertumpu kokoh
          fr: -0.15, fr_k: 0.25,
          // Kedua kaki belakang menekuk bersiap melompat
          bl: 0.25, bl_k: 0.42,
          br: 0.25, br_k: 0.42,
          breathe: 0.015,
          eye: 0
        });

        // KAKI DEPAN KIRI MENGAIS TANAH 3 KALI BERIRAMA
        if (c >= 0.20 && c < 1.05) {
          const pawTime = (c - 0.20) * 22.2; // 3 siklus mengais penuh
          const scrape = Math.sin(pawTime);
          if (scrape > 0) {
            p.fl = -0.20 - 0.35 * scrape;
            p.fl_k = 0.25 + 0.65 * scrape; // Lutut terangkat hingga 0.9 rad!
          } else {
            p.fl = -0.20 - 0.42 * scrape;
            p.fl_k = 0.25 + 0.15 * Math.abs(scrape);
          }
          p.bodyRoll += Math.sin(t * 26.0) * 0.025; // Getar badan tegang
          p.headYaw  += Math.sin(t * 22.0) * 0.035;
        }
        return p;
      }

      // FASE 2: SERUDUK LARI KENCANG KE DEPAN (t = 1.10 s/d 2.50s)
      if (c < 2.50) {
        const gallopPhase = (c - 1.10) * 4.4;
        const f = gallopPhase * Math.PI * 2;

        const flL = gallopCycle(gallopPhase, true);
        const frL = gallopCycle(gallopPhase + 0.35, true);
        const blL = gallopCycle(gallopPhase + 0.55, false);
        const brL = gallopCycle(gallopPhase + 0.90, false);

        return mkPose({
          rigY: Math.abs(Math.sin(f)) * 0.32 + 0.04,
          bodyPitch: 0.12 + Math.sin(f) * 0.06,
          bodyRoll: Math.sin(f) * 0.03,
          bodyYaw: Math.sin(f * 0.5) * 0.02,
          // Kepala terkunci menusuk lurus ke depan dengan gading terhunus
          headPitch: -0.20 + Math.sin(f) * 0.05,
          headYaw: Math.sin(f * 0.5) * 0.02,
          headRoll: Math.sin(f) * 0.015,
          jaw: 0.48, // Mulut menganga buas
          earL: 0.15, earR: 0.15, earF: 0.50,
          tailX: 1.25, // Ekor tegak mengancam
          tailZ: Math.sin(t * 8.0) * 0.25,
          fl: flL.thigh, fl_k: flL.knee,
          fr: frL.thigh, fr_k: frL.knee,
          bl: blL.thigh, bl_k: blL.knee,
          br: brL.thigh, br_k: brL.knee,
          breathe: 0.020,
          eye: 0
        });
      }

      // FASE 3: MENGEREM MENANCAPKAN KUKU & PULIH (t = 2.50 s/d 3.10s)
      const uBrake = smooth5((c - 2.50) / 0.60);
      return mkPose({
        rigY: -0.15 * (1 - uBrake),
        bodyPitch: 0.10 * (1 - uBrake),
        headPitch: -0.10 + 0.14 * uBrake,
        tailX: 0.40 * (1 - uBrake) + 0.08 * uBrake,
        jaw: 0.20 * (1 - uBrake) + 0.02 * uBrake,
        fl: -0.45 * (1 - uBrake) + 0.02 * uBrake, fl_k: 0.35 * (1 - uBrake) + 0.08 * uBrake,
        fr: -0.45 * (1 - uBrake) - 0.02 * uBrake, fr_k: 0.35 * (1 - uBrake) + 0.08 * uBrake,
        bl:  0.35 * (1 - uBrake) - 0.02 * uBrake, bl_k: 0.35 * (1 - uBrake) + 0.10 * uBrake,
        br:  0.35 * (1 - uBrake) + 0.02 * uBrake, br_k: 0.35 * (1 - uBrake) + 0.10 * uBrake,
        breathe: 0.015 * (1 - uBrake) + 0.005 * uBrake,
        eye: 0
      });
    }
  };

  function applyPose(parts, p) {
    if (!parts || !parts.rig) return;
    const rig = parts.rig;
    rig.position.y = p.rigY;
    rig.rotation.x = p.bodyPitch;
    rig.rotation.z = p.bodyRoll;
    rig.rotation.y = p.bodyYaw;

    if (parts.headGrp) {
      parts.headGrp.position.set(HP[0], HP[1], HP[2]);
      parts.headGrp.rotation.set(p.headPitch, p.headYaw, p.headRoll);
    }
    if (parts.jawGrp) parts.jawGrp.rotation.x = p.jaw;
    if (parts.earL)   parts.earL.rotation.z   =  (p.earL + p.earF);
    if (parts.earR)   parts.earR.rotation.z   = -(p.earR + p.earF);

    if (parts.tail) {
      parts.tail.rotation.x = p.tailX;
      parts.tail.rotation.z = p.tailZ;
    }

    // 4 Kaki 2-Sendi
    if (parts.legFL) {
      parts.legFL.thigh.rotation.x = p.fl;
      parts.legFL.knee.rotation.x  = p.fl_k;
    }
    if (parts.legFR) {
      parts.legFR.thigh.rotation.x = p.fr;
      parts.legFR.knee.rotation.x  = p.fr_k;
    }
    if (parts.legBL) {
      parts.legBL.thigh.rotation.x = p.bl;
      parts.legBL.knee.rotation.x  = p.bl_k;
    }
    if (parts.legBR) {
      parts.legBR.thigh.rotation.x = p.br;
      parts.legBR.knee.rotation.x  = p.br_k;
    }

    if (parts.bodyGrp) {
      const b = 1 + (p.breathe || 0);
      parts.bodyGrp.scale.set(1 + (b - 1) * 0.6, b, 1 + (b - 1) * 0.3);
    }

    const closed = (p.eye || 0) > 0.5;
    if (parts.eyesOM) parts.eyesOM.visible = !closed;
    if (parts.eyesCM) parts.eyesCM.visible = closed;
  }

  const Mob_Boar = {
    SCALE,
    DUR: {
      punch: PUNCH_T,
      gore: GORE_T
    },
    HIT: {
      punch: 0.38,
      goreChargeStart: 1.10,
      goreChargeEnd: 2.50
    },

    /* ---------- MODEL 3D ---------- */
    build(boss) {
      const g = new THREE.Group();
      g.scale.setScalar(SCALE);
      const parts = {};

      const cache = {};
      const M = (c, emissive, ei) => {
        const k = c + '_' + (emissive || 0) + '_' + (ei || 1);
        if (!cache[k]) {
          cache[k] = new THREE.MeshLambertMaterial({
            color: c,
            emissive: emissive || 0x000000,
            emissiveIntensity: ei === undefined ? 1 : ei
          });
        }
        return cache[k];
      };

      const eyeMat = new THREE.MeshLambertMaterial({
        color: C.EYE_RED,
        emissive: 0xff1500,
        emissiveIntensity: 0.85
      });
      eyeMat.__keep = true;
      const glintMat = new THREE.MeshBasicMaterial({ color: C.EYE_GLINT });

      const vox = (parent, w, h, d, x, y, z, mat, rot) => {
        const m = new THREE.Mesh(geo(), mat);
        m.scale.set(w, h, d);
        m.position.set(x, y, z);
        if (rot) {
          if (rot[0]) m.rotation.x = rot[0];
          if (rot[1]) m.rotation.y = rot[1];
          if (rot[2]) m.rotation.z = rot[2];
        }
        m.castShadow = !IS_MOBILE;
        parent.add(m);
        return m;
      };

      const rig = new THREE.Group();
      g.add(rig);
      parts.rig = rig;

      const bodyGrp = new THREE.Group();
      rig.add(bodyGrp);
      parts.bodyGrp = bodyGrp;

      /* ================= 1. BADAN & PUNUK PUNDAK ================= */
      vox(bodyGrp, 5.6, 5.0, 12.8, 0, 7.6, -0.2, M(C.FUR_MAIN));
      vox(bodyGrp, 5.8, 1.4, 12.4, 0, 5.6, -0.2, M(C.FUR_DARK));
      vox(bodyGrp, 5.4, 4.4, 2.6,  0, 7.2,  5.4, M(C.FUR_DARK));

      // Punuk pundak
      vox(bodyGrp, 5.2, 2.8, 5.6, 0,  9.8, 2.8, M(C.HUMP_DARK));
      vox(bodyGrp, 4.4, 1.4, 4.2, 0, 11.2, 2.6, M(C.FUR_DEEP));

      // Leher soket
      vox(bodyGrp, 5.0, 4.6, 3.4, 0, 8.4, 5.5, M(C.FUR_MAIN));
      vox(bodyGrp, 4.6, 4.2, 2.4, 0, 8.6, 6.6, M(C.HUMP_DARK));

      // Dinding penopang tulang punggung
      vox(bodyGrp, 2.2, 1.4, 11.6, 0, 9.8, -0.8, M(C.HUMP_DARK));

      // Otot bahu depan kiri-kanan
      vox(bodyGrp, 1.1, 4.2, 4.0,  2.75, 7.2, 3.4, M(C.FUR_DARK));
      vox(bodyGrp, 1.1, 4.2, 4.0, -2.75, 7.2, 3.4, M(C.FUR_DARK));

      // Otot pinggul belakang kiri-kanan
      vox(bodyGrp, 1.1, 4.2, 4.0,  2.75, 7.0, -3.8, M(C.FUR_DARK));
      vox(bodyGrp, 1.1, 4.2, 4.0, -2.75, 7.0, -3.8, M(C.FUR_DARK));

      // Surai punggung 11 baris
      for (let i = 0; i < 11; i++) {
        const z = 4.8 - i * 1.05;
        const isHump = z >= 0.8;
        const baseY = isHump ? 10.6 : 9.5;
        const hh = 1.3 + ((i % 3 === 0) ? 0.6 : 0.2);
        vox(bodyGrp, 0.55, hh + 0.8, 0.55,
          (i % 2 ? 0.24 : -0.24), baseY + hh * 0.4, z,
          (i % 2 ? M(C.FUR_DEEP) : M(C.HUMP_DARK)),
          [-0.18 + i * 0.015, 0, (i % 2 ? 0.05 : -0.05)]);
        vox(bodyGrp, 0.4, hh * 0.65 + 0.6, 0.45,
          (i % 2 ? -0.48 : 0.48), baseY + hh * 0.25, z - 0.15,
          M(C.FUR_DEEP),
          [-0.20 + i * 0.015, 0, 0]);
      }

      /* ================= 2. KEPALA, MONCONG & GADING ATAS ================= */
      const headGrp = new THREE.Group();
      headGrp.position.set(HP[0], HP[1], HP[2]);
      bodyGrp.add(headGrp);
      parts.headGrp = headGrp;

      // Elemen kepala (relatif terhadap pivot HP [0, 8.6, 5.8])
      vox(headGrp, 4.5, 4.3, 3.8, 0, 8.4 - HP[1], 6.2 - HP[2], M(C.FUR_MAIN));
      vox(headGrp, 4.3, 3.8, 3.2, 0, 8.5 - HP[1], 5.0 - HP[2], M(C.FUR_DARK));
      vox(headGrp, 4.6, 4.4, 4.6, 0, 9.1 - HP[1], 8.8 - HP[2], M(C.FUR_MAIN));
      vox(headGrp, 4.8, 1.2, 1.8, 0, 10.6 - HP[1], 9.4 - HP[2], M(C.FUR_DEEP));
      vox(headGrp, 4.2, 0.9, 1.4, 0, 11.0 - HP[1], 8.1 - HP[2], M(C.HUMP_DARK));

      vox(headGrp, 3.2, 2.7, 3.4, 0, 8.5 - HP[1], 11.2 - HP[2], M(C.SNOUT_BASE));
      vox(headGrp, 0.85, 2.6, 3.2,  2.4, 8.8 - HP[1], 9.8 - HP[2], M(C.FUR_DARK));
      vox(headGrp, 0.85, 2.6, 3.2, -2.4, 8.8 - HP[1], 9.8 - HP[2], M(C.FUR_DARK));
      vox(headGrp, 0.7,  2.0, 2.4,  1.7, 8.2 - HP[1], 11.4 - HP[2], M(C.SNOUT_BASE));
      vox(headGrp, 0.7,  2.0, 2.4, -1.7, 8.2 - HP[1], 11.4 - HP[2], M(C.SNOUT_BASE));

      vox(headGrp, 2.8, 2.3, 0.9, 0, 8.2 - HP[1], 12.9 - HP[2], M(C.SNOUT_PAD));
      vox(headGrp, 0.65, 0.75, 0.35,  0.70, 8.5 - HP[1], 13.35 - HP[2], M(C.NOSTRIL));
      vox(headGrp, 0.65, 0.75, 0.35, -0.70, 8.5 - HP[1], 13.35 - HP[2], M(C.NOSTRIL));
      vox(headGrp, 2.6, 0.5, 2.6, 0, 7.6 - HP[1], 11.3 - HP[2], M(C.MOUTH_IN));

      // Gading atas penajam
      vox(headGrp, 0.42, 0.8, 0.42,  1.52, 7.8 - HP[1], 12.0 - HP[2], M(C.TUSK_ROOT));
      vox(headGrp, 0.35, 1.1, 0.35,  1.75, 8.1 - HP[1], 12.2 - HP[2], M(C.TUSK_IVORY), [-0.2, 0, -0.45]);
      vox(headGrp, 0.42, 0.8, 0.42, -1.52, 7.8 - HP[1], 12.0 - HP[2], M(C.TUSK_ROOT));
      vox(headGrp, 0.35, 1.1, 0.35, -1.75, 8.1 - HP[1], 12.2 - HP[2], M(C.TUSK_IVORY), [-0.2, 0,  0.45]);

      // Mata Merah Terbuka
      const eyesOM = new THREE.Group();
      vox(eyesOM, 0.85, 1.1, 0.45,  2.34, 9.8 - HP[1], 9.9 - HP[2], eyeMat);
      vox(eyesOM, 0.85, 1.1, 0.45, -2.34, 9.8 - HP[1], 9.9 - HP[2], eyeMat);
      vox(eyesOM, 0.32, 0.38, 0.50,  2.48, 10.02 - HP[1], 9.96 - HP[2], glintMat);
      vox(eyesOM, 0.32, 0.38, 0.50, -2.48, 10.02 - HP[1], 9.96 - HP[2], glintMat);
      headGrp.add(eyesOM);
      parts.eyesOM = eyesOM;

      // Mata Berkedip Tertutup
      const eyesCM = new THREE.Group();
      vox(eyesCM, 1.15, 0.30, 0.45,  2.34, 9.8 - HP[1], 9.9 - HP[2], M(C.FUR_DEEP));
      vox(eyesCM, 1.15, 0.30, 0.45, -2.34, 9.8 - HP[1], 9.9 - HP[2], M(C.FUR_DEEP));
      eyesCM.visible = false;
      headGrp.add(eyesCM);
      parts.eyesCM = eyesCM;

      // Telinga Kiri
      const earL = new THREE.Group();
      earL.position.set(EL[0] - HP[0], EL[1] - HP[1], EL[2] - HP[2]);
      vox(earL, 1.6, 2.2, 0.65, 0.10, 0.30, 0.0, M(C.EAR_OUTER), [0, 0, -0.28]);
      vox(earL, 1.0, 1.5, 0.35, 0.25, 0.20, 0.32, M(C.EAR_INNER), [0, 0, -0.28]);
      headGrp.add(earL);
      parts.earL = earL;

      // Telinga Kanan
      const earR = new THREE.Group();
      earR.position.set(ER[0] - HP[0], ER[1] - HP[1], ER[2] - HP[2]);
      vox(earR, 1.6, 2.2, 0.65, -0.10, 0.30, 0.0, M(C.EAR_OUTER), [0, 0,  0.28]);
      vox(earR, 1.0, 1.5, 0.35, -0.25, 0.20, 0.32, M(C.EAR_INNER), [0, 0,  0.28]);
      headGrp.add(earR);
      parts.earR = earR;

      /* ================= 3. RAHANG BAWAH & GADING UTAMA BESAR ================= */
      const jawGrp = new THREE.Group();
      jawGrp.position.set(JP[0] - HP[0], JP[1] - HP[1], JP[2] - HP[2]);
      headGrp.add(jawGrp);
      parts.jawGrp = jawGrp;

      vox(jawGrp, 3.0, 1.2, 3.2, 0, 7.0 - JP[1], 11.8 - JP[2], M(C.SNOUT_PAD));
      vox(jawGrp, 2.8, 0.4, 2.4, 0, 7.4 - JP[1], 11.6 - JP[2], M(C.MOUTH_IN));
      vox(jawGrp, 0.9, 1.3, 0.7, 0, 6.4 - JP[1], 12.8 - JP[2], M(C.FUR_DARK));

      // Gading Bawah Kiri
      vox(jawGrp, 0.55, 0.9, 0.55,  1.45, 7.25 - JP[1], 12.7 - JP[2], M(C.TUSK_ROOT));
      vox(jawGrp, 0.48, 1.6, 0.48,  1.75, 8.15 - JP[1], 12.95 - JP[2], M(C.TUSK_IVORY), [0.24, 0, -0.42]);
      vox(jawGrp, 0.35, 1.0, 0.35,  1.98, 9.05 - JP[1], 13.15 - JP[2], M(0xffffff),     [0.35, 0, -0.72]);

      // Gading Bawah Kanan
      vox(jawGrp, 0.55, 0.9, 0.55, -1.45, 7.25 - JP[1], 12.7 - JP[2], M(C.TUSK_ROOT));
      vox(jawGrp, 0.48, 1.6, 0.48, -1.75, 8.15 - JP[1], 12.95 - JP[2], M(C.TUSK_IVORY), [0.24, 0,  0.42]);
      vox(jawGrp, 0.35, 1.0, 0.35, -1.98, 9.05 - JP[1], 13.15 - JP[2], M(0xffffff),     [0.35, 0,  0.72]);

      /* ================= 4. EKOR ================= */
      const tail = new THREE.Group();
      tail.position.set(0, 9.4, -6.4);
      vox(tail, 0.7, 2.4, 0.7, 0, 9.2 - 9.4, -6.6 - (-6.4), M(C.FUR_DARK), [0.38, 0, 0]);
      vox(tail, 0.5, 2.0, 0.5, 0, 7.6 - 9.4, -7.2 - (-6.4), M(C.FUR_MAIN), [0.38, 0, 0]);
      vox(tail, 1.0, 1.1, 1.0, 0, 6.4 - 9.4, -7.7 - (-6.4), M(C.FUR_DEEP));
      bodyGrp.add(tail);
      parts.tail = tail;

      /* ================= 5. ANATOMI KAKI 2-SENDI (PAHA + LUTUT/BETIS) ================= */
      function createLimb(x, z, isFront, isRight) {
        const thigh = new THREE.Group();
        thigh.position.set(x, 5.8, z);

        // Pangkal paha di badan
        vox(thigh, 2.2, 1.2, 2.2, 0, 0.4, 0, M(C.FUR_DARK));
        // Otot paha
        vox(thigh, 2.1, 2.8, 2.1, 0, -1.4, isFront ? 0.05 : -0.05, isRight ? M(C.FUR_MAIN) : M(C.FUR_WARM));
        // Sendi lutut bulat bawah
        vox(thigh, 1.85, 1.0, 1.85, 0, -2.95, 0, M(C.FUR_DARK));

        // Shin (Lutut & Betis) pivot di y = -3.0
        const knee = new THREE.Group();
        knee.position.set(0, -3.0, 0);
        thigh.add(knee);

        // Soket sendi lutut atas
        vox(knee, 1.95, 1.1, 1.95, 0, 0.0, 0, M(C.FUR_DARK));
        // Tulang betis / shin
        vox(knee, 1.65, 1.9, 1.65, 0, -1.2, 0, M(C.FUR_MAIN));
        // Kuku belah keras hitam menapak tanah (y = -2.4, tinggi 0.9 => dasar y = -2.85)
        vox(knee, 1.9, 0.9, 2.1, 0, -2.4, 0.15, M(C.HOOF));
        // Taji kuku belakang (dewclaw)
        vox(knee, 0.8, 0.45, 0.55, 0, -2.1, -0.85, M(C.HOOF));

        bodyGrp.add(thigh);
        return { thigh, knee };
      }

      parts.legFL = createLimb(-2.5,  3.4, true,  false);
      parts.legFR = createLimb( 2.5,  3.4, true,  true);
      parts.legBL = createLimb(-2.5, -3.8, false, false);
      parts.legBR = createLimb( 2.5, -3.8, false, true);

      // Inisialisasi pose netral awal
      applyPose(parts, P.idle(0));

      return { mesh: g, parts };
    },

    /* ---------- ANIMASI LENGKAP TIAP FRAME ----------
       Dipanggil Monsters.animate(m, dt) tiap frame untuk mob tipe 'boar'. */
    animate(m, dt) {
      if (!m || !m.parts) return;

      m._bAnimT = (m._bAnimT || 0) + dt;
      const curT = m._bAnimT;

      // 1. Tentukan target pose berdasarkan state aktif
      let targetState = 'idle';
      let tp;

      if (m.bAct === 'punch') {
        targetState = 'punch';
        tp = P.punch(m.bActT || 0);
      } else if (m.bAct === 'gore') {
        targetState = 'gore';
        tp = P.gore(m.bActT || 0);
      } else {
        const sp = Math.hypot(m.vel.x, m.vel.z);
        if (sp > 4.8) {
          targetState = 'run';
          tp = P.run(curT);
        } else if (sp > 0.12) {
          targetState = 'walk';
          tp = P.walk(curT);
        } else {
          targetState = 'idle';
          tp = P.idle(curT);
        }
      }

      // 2. Transisi mulus Hermite jika state berganti
      if (m._bState !== targetState) {
        m._bFromPose = Object.assign({}, m._bLastPose || tp);
        m._bBlend = 0;
        m._bState = targetState;
      }

      m._bBlend = Math.min(1, (m._bBlend === undefined ? 1 : m._bBlend) + dt / 0.22);
      const k = smooth5(m._bBlend);

      const p = zeroPose();
      const from = m._bFromPose || tp;
      for (let i = 0; i < PF.length; i++) {
        const prop = PF[i];
        const a = (from[prop] !== undefined ? from[prop] : 0);
        const b = (tp[prop] !== undefined ? tp[prop] : 0);
        p[prop] = a + (b - a) * k;
      }

      // 3. Kedipan mata alami saat idle/jalan
      if (targetState !== 'punch' && targetState !== 'gore') {
        if (!m._bNextBlink || curT > m._bNextBlink) {
          m._bBlinkUntil = curT + 0.12;
          m._bNextBlink  = curT + 2.4 + Math.random() * 3.5;
        }
        if (curT < m._bBlinkUntil) {
          p.eye = 1;
        }
      }

      // 4. Terapkan pose ke rig
      applyPose(m.parts, p);
      m._bLastPose = p;
    },

    /* ---------- EFEK KHUSUS DEBU TANAH & HANTAMAN ---------- */
    punchFX(m) {
      if (typeof FX === 'undefined') return;
      const hx = m.pos.x + Math.sin(m.mesh.rotation.y) * 1.3;
      const hz = m.pos.z + Math.cos(m.mesh.rotation.y) * 1.3;
      FX.ring(hx, m.pos.y + 0.1, hz, 0xffeedd, 0.45, 2.2);
      FX.debris(new THREE.Vector3(hx, m.pos.y + 0.8, hz), 0xfcf8ee, 12, 3.2);
      FX.addShake(0.32);
      if (typeof Sfx !== 'undefined' && Sfx.swing) Sfx.swing(0.8);
    },

    gorePawFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const px = m.pos.x - Math.sin(yaw) * 0.8;
      const pz = m.pos.z - Math.cos(yaw) * 0.8;
      FX.debris(new THREE.Vector3(px, m.pos.y + 0.1, pz), 0x9c8b76, 5, 2.2);
    },

    goreChargeFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const px = m.pos.x - Math.sin(yaw) * 0.7;
      const pz = m.pos.z - Math.cos(yaw) * 0.7;
      FX.debris(new THREE.Vector3(px, m.pos.y + 0.12, pz), 0xb8a792, 4, 1.8);
    },

    goreBrakeFX(m) {
      if (typeof FX === 'undefined') return;
      const yaw = m.mesh.rotation.y;
      const px = m.pos.x + Math.sin(yaw) * 0.6;
      const pz = m.pos.z + Math.cos(yaw) * 0.6;
      FX.debris(new THREE.Vector3(px, m.pos.y + 0.15, pz), 0xc2b19b, 15, 3.5);
      FX.ring(px, m.pos.y + 0.08, pz, 0xb8a792, 0.5, 2.8);
    },

    goreImpactFX(m, tgt) {
      if (typeof FX === 'undefined') return;
      const tx = tgt.pos ? tgt.pos.x : m.pos.x;
      const ty = tgt.pos ? tgt.pos.y : m.pos.y;
      const tz = tgt.pos ? tgt.pos.z : m.pos.z;
      FX.debris(new THREE.Vector3(tx, ty + 0.6, tz), 0xd14d34, 18, 4.2);
      FX.ring(tx, ty + 0.1, tz, 0xff5533, 0.6, 3.8);
      FX.addShake(0.55);
      if (typeof Sfx !== 'undefined' && Sfx.smash) Sfx.smash();
      else if (typeof Sfx !== 'undefined' && Sfx.hit) Sfx.hit(1.0);
    }
  };

  return Mob_Boar;
})();

window.Mob_Boar = Mob_Boar;
