'use strict';
/* =============================================================================
   ENTITAS MOB: T-REX / VOXEL REX (🦖)
   -----------------------------------------------------------------------------
   Predator purba puncak pegunungan (Mountain). Ukuran masif (sedikit di bawah naga),
   selalu berstatus boss / apex predator dengan model voxel ter-weld rapi dan
   pencahayaan ambient occlusion alami dari "NEW MODEL/T-rex.html".

   Memiliki 4 variasi serangan lengkap:
   1. Gigit (bite) — serangan dasar terjang & katup rahang
   2. Cabik-cabik (shred) — serangan cabik bertubi-tubi multi-hit
   3. Kibas Ekor (spin) — sapuan ekor berputar 360° AoE
   4. Serbu + Cabik (charge) — lari serbu ganas berkecepatan tinggi & gigitan pamungkas
   ============================================================================= */

const Mob_Trex = (function() {
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const clamp01 = v => clamp(v, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (x, a, b) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const eIn = t => t * t * t;
  const eOut = t => 1 - Math.pow(1 - t, 3);
  const eIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const pulse = (p, a, b, c) => (p <= a || p >= c) ? 0 : (p < b ? eIO(seg(p, a, b)) : 1 - eIO(seg(p, b, c)));

  function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  const FACES = [
    { n: [1, 0, 0],  v: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], u: [0,0,-1], w: [0,1,0] },
    { n: [-1, 0, 0], v: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], u: [0,0,1],  w: [0,1,0] },
    { n: [0, 1, 0],  v: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], u: [1,0,0],  w: [0,0,-1] },
    { n: [0, -1, 0], v: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], u: [1,0,0],  w: [0,0,1] },
    { n: [0, 0, 1],  v: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], u: [1,0,0],  w: [0,1,0] },
    { n: [0, 0, -1], v: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], u: [-1,0,0], w: [0,1,0] }
  ];
  const AO_LUT = [0.55, 0.72, 0.87, 1];
  const KEY = (x, y, z) => ((x + 512) << 20) | ((y + 512) << 10) | (z + 512);
  const WKEY = (x, y, z) => ((x + 64) << 14) | ((y + 64) << 7) | (z + 64);

  class VS {
    constructor() { this.m = new Map(); }
    has(x, y, z) { return this.m.has(KEY(x, y, z)); }
    set(x, y, z, c) { this.m.set(KEY(Math.round(x), Math.round(y), Math.round(z)), c); }
    del(x, y, z) { this.m.delete(KEY(Math.round(x), Math.round(y), Math.round(z))); }
    box(x0, y0, z0, x1, y1, z1, c) {
      const a = Math.min(x0, x1), b = Math.max(x0, x1);
      const d = Math.min(y0, y1), e = Math.max(y0, y1);
      const f = Math.min(z0, z1), g = Math.max(z0, z1);
      for (let x = a; x <= b; x++) for (let y = d; y <= e; y++) for (let z = f; z <= g; z++) this.m.set(KEY(x, y, z), c);
    }
  }

  function fillBox(vs, x0, y0, z0, x1, y1, z1, f) {
    const a = Math.min(x0, x1), b = Math.max(x0, x1);
    const d = Math.min(y0, y1), e = Math.max(y0, y1);
    const g = Math.min(z0, z1), h = Math.max(z0, z1);
    for (let x = a; x <= b; x++) for (let y = d; y <= e; y++) for (let z = g; z <= h; z++) vs.set(x, y, z, f(x, y, z));
  }

  function mirrorVS(src) {
    const m = new VS();
    for (const [k, c] of src.m) {
      const x = ((k >> 20) & 1023) - 512, y = ((k >> 10) & 1023) - 512, z = (k & 1023) - 512;
      m.set(-x, y, z, c);
    }
    return m;
  }

  const C = {
    hide: 0x5f7f4c, hideLight: 0x7a9c5c, hideDark: 0x3f5a37, hideDeep: 0x2e4429,
    belly: 0xd9c9a2, bellyDark: 0xb9a67e,
    stripe: 0x47603b, accent: 0x9d5738,
    horn: 0xdad1b6, hornDark: 0x8b8368,
    tooth: 0xf6f1e5, toothDark: 0xd6cdb6,
    claw: 0x2f2d33,
    mouth: 0x6b2c31, tongue: 0xa94f52,
    eye: 0xffb020, dark: 0x22301f
  };

  function skin(yb, yt) {
    return function(x, y, z) {
      const h = hash3(x * 3 + 7, y * 5 + 1, z * 11 + 3);
      if (y <= yb) return C.belly;
      if (y >= yt) return C.hideDark;
      if (h > 0.88) return C.hideLight;
      if (h < 0.10) return C.hideDeep;
      return C.hide;
    };
  }

  const BONE_LIST = [
    'hips', 'spine', 'neck1', 'neck2', 'head', 'jaw',
    'shoulderR', 'shoulderL', 'elbowR', 'elbowL', 'handR', 'handL',
    'thighR', 'thighL', 'shinR', 'shinL', 'footR', 'footL',
    'tail1', 'tail2', 'tail3', 'tail4'
  ];

  /* Skala di game: sedikit lebih kecil dari Naga Merah */
  const SCALE = 0.33;

  /* Cache geometri pre-weld agar hanya dihitung sekali */
  let _cachedGeometries = null;

  function createVoxelGeometries() {
    if (_cachedGeometries) return _cachedGeometries;

    const dummyModel = new THREE.Group();
    const bones = {};
    function b(name, parent, x, y, z) {
      const g = new THREE.Group();
      g.name = name; g.position.set(x, y, z);
      parent.add(g);
      bones[name] = g;
      return g;
    }

    const hips = b('hips', dummyModel, 0, 8.5, 2);
    const spine = b('spine', hips, 0, 2, -3);
    const neck1 = b('neck1', spine, 0, 1, -2);
    const neck2 = b('neck2', neck1, 0, 2, -1);
    const head = b('head', neck2, 0, 1, -2);
    const jaw = b('jaw', head, 0, -1, 1);
    const shoulderR = b('shoulderR', spine, 2, 0, -1);
    const shoulderL = b('shoulderL', spine, -2, 0, -1);
    const elbowR = b('elbowR', shoulderR, 0, -2, 0);
    const elbowL = b('elbowL', shoulderL, 0, -2, 0);
    const handR = b('handR', elbowR, 0, -2, 0);
    const handL = b('handL', elbowL, 0, -2, 0);
    const thighR = b('thighR', hips, 2, -1, 0);
    const thighL = b('thighL', hips, -2, -1, 0);
    const shinR = b('shinR', thighR, 0, -3, -1);
    const shinL = b('shinL', thighL, 0, -3, -1);
    const footR = b('footR', shinR, 0, -2, 1);
    const footL = b('footL', shinL, 0, -2, 1);
    let tp = hips; const tailBones = [];
    const TAILDEF = [[0, 0, 3], [0, 0, 3], [0, 1, 3], [0, 1, 3]];
    for (let i = 0; i < 4; i++) {
      const d = TAILDEF[i];
      const tb = b('tail' + (i + 1), tp, d[0], d[1], d[2]);
      tailBones.push(tb); tp = tb;
    }

    const partsList = [];
    function reg(vs, boneRef, boneName, isEye = false) {
      partsList.push({ vs, boneRef, boneName, isEye });
    }

    // 1. HIPS
    {
      const vs = new VS();
      fillBox(vs, -2, -2, -2, 2, 2, 3, skin(-2, 2));
      vs.box(-2, -2, 3, 2, 1, 4, C.hideDark);
      const ch = [[2,2,3],[-2,2,3],[2,2,-2],[-2,2,-2],[2,-2,3],[-2,-2,3],[2,-2,-2],[-2,-2,-2]];
      for (const q of ch) vs.del(q[0], q[1], q[2]);
      vs.set(0, 3, 1, C.horn); vs.set(0, 3, 2, C.horn); vs.set(0, 4, 2, C.hornDark); vs.set(0, 3, 3, C.horn);
      for (const s of [1, -1]) { vs.set(s*2, 1, 2, C.hornDark); vs.set(s*2, 0, 0, C.accent); vs.set(s*2, -1, 2, C.stripe); }
      reg(vs, hips, 'hips');
    }
    // 2. SPINE
    {
      const vs = new VS();
      fillBox(vs, -2, -2, -2, 2, 2, 2, skin(-2, 2));
      vs.box(-2, 3, -2, 2, 3, 0, C.hideDark);
      const ch = [[2,2,2],[-2,2,2],[2,-2,2],[-2,-2,2],[2,2,-2],[-2,2,-2]];
      for (const q of ch) vs.del(q[0], q[1], q[2]);
      vs.set(0, 3, 1, C.horn); vs.set(0, 3, 2, C.horn); vs.set(0, 4, 1, C.hornDark);
      for (const s of [1, -1]) { vs.set(s*2, 2, -1, C.hideDeep); vs.set(s*2, -1, -2, C.bellyDark); vs.set(s*2, 0, 1, C.stripe); }
      reg(vs, spine, 'spine');
    }
    // 3. NECK1
    {
      const vs = new VS();
      fillBox(vs, -1, -1, -1, 1, 2, 1, skin(-1, 2));
      fillBox(vs, -1, -2, 0, 1, -2, 1, () => C.belly);
      vs.set(0, 3, 0, C.horn); vs.set(0, 3, -1, C.hornDark);
      vs.set(1, 1, 1, C.hideDeep); vs.set(-1, 1, 1, C.hideDeep);
      reg(vs, neck1, 'neck1');
    }
    // 4. NECK2
    {
      const vs = new VS();
      fillBox(vs, -1, -1, -1, 1, 1, 1, skin(-1, 1));
      fillBox(vs, -1, -2, -1, 1, -2, 1, () => C.belly);
      vs.set(0, 2, 0, C.horn); vs.set(0, 2, -1, C.horn);
      reg(vs, neck2, 'neck2');
    }
    // 5-8. TAILS
    {
      const vs = new VS();
      fillBox(vs, -2, -2, -1, 2, 2, 2, skin(-2, 2));
      vs.set(0, 3, 0, C.horn); vs.set(0, 3, 2, C.hornDark);
      for (const s of [1, -1]) vs.set(s*2, 0, 1, C.accent);
      reg(vs, tailBones[0], 'tail1');
    }
    {
      const vs = new VS();
      fillBox(vs, -1, -2, -1, 1, 1, 1, skin(-2, 1));
      fillBox(vs, -1, -1, 2, 1, 1, 2, skin(-1, 1));
      vs.set(0, 2, 0, C.horn); vs.set(0, 2, 2, C.hornDark);
      reg(vs, tailBones[1], 'tail2');
    }
    {
      const vs = new VS();
      fillBox(vs, -1, -1, -1, 1, 1, 1, skin(-1, 1));
      fillBox(vs, -1, 0, 2, 1, 1, 2, skin(0, 1));
      vs.set(0, 2, 0, C.horn); vs.set(0, 2, 2, C.hornDark);
      reg(vs, tailBones[2], 'tail3');
    }
    {
      const vs = new VS();
      fillBox(vs, -1, -1, -1, 1, 0, 1, skin(-1, 0));
      fillBox(vs, 0, 0, 2, 0, 0, 3, () => C.hideDark);
      vs.set(0, 1, 0, C.horn); vs.set(0, 1, 3, C.hornDark);
      reg(vs, tailBones[3], 'tail4');
    }
    // 9. HEAD
    {
      const vs = new VS();
      fillBox(vs, -2, -1, -1, 2, 2, 1, skin(-1, 2));
      fillBox(vs, -1, -1, -4, 1, 1, -2, skin(-1, 1));
      for (let x = -2; x <= 2; x++) for (let z = -1; z <= 1; z++) vs.set(x, -1, z, C.mouth);
      for (let x = -1; x <= 1; x++) for (let z = -4; z <= -2; z++) vs.set(x, -1, z, C.mouth);
      for (const s of [1, -1]) {
        vs.set(s*2, 2, -1, C.hideDeep); vs.set(s*2, 2, 0, C.hideDeep);
        vs.set(s*2, 3, 0, C.horn); vs.set(s*2, 3, -1, C.hornDark);
        vs.set(s*2, 0, -1, C.hideDark); vs.set(s*2, 1, 1, C.hideDark);
        vs.del(s*2, 1, -1);
        vs.set(s*2, -2, -1, C.toothDark); vs.set(s*2, -3, -1, C.tooth); vs.set(s*2, -4, 0, C.tooth);
        vs.set(s*2, -2, -2, C.toothDark); vs.set(s*2, -3, -2, C.tooth);
        vs.set(s*1, -2, -3, C.tooth); vs.set(s*1, -2, -4, C.tooth); vs.set(s*2, -2, 0, C.toothDark);
      }
      vs.set(1, 1, -4, C.dark); vs.set(-1, 1, -4, C.dark);
      vs.set(0, 3, 0, C.horn); vs.set(0, 3, -1, C.horn);
      reg(vs, head, 'head');
    }
    // 10. JAW
    {
      const vs = new VS();
      vs.box(-2, -3, 0, 2, -1, 0, C.hide);
      vs.box(-1, -2, -3, 1, -1, -1, C.hide);
      vs.box(-1, -2, -5, 1, -2, -4, C.hide);
      for (let x = -2; x <= 2; x++) vs.set(x, -1, 0, C.mouth);
      for (let x = -1; x <= 1; x++) for (let z = -3; z <= -1; z++) vs.set(x, -1, z, C.tongue);
      for (let x = -1; x <= 1; x++) for (let z = -3; z <= -1; z++) vs.set(x, -2, z, C.bellyDark);
      for (let x = -1; x <= 1; x++) for (let z = -5; z <= -4; z++) vs.set(x, -2, z, C.bellyDark);
      for (const s of [1, -1]) {
        vs.set(s*1, 0, 0, C.tooth); vs.set(s*1, 1, 0, C.toothDark); vs.set(s*1, 0, -1, C.tooth);
      }
      vs.set(0, 0, -4, C.toothDark);
      reg(vs, jaw, 'jaw');
    }
    // 11. EYE
    {
      const ev = new VS();
      ev.set(2, 1, -1, C.eye); ev.set(-2, 1, -1, C.eye);
      reg(ev, head, 'head_eye', true);
    }
    // 12. THIGHS
    {
      const vs = new VS();
      fillBox(vs, -1, -3, -1, 1, 1, 1, skin(-3, 1));
      fillBox(vs, -1, 0, 1, 1, 1, 2, () => C.hideDark);
      vs.set(-1, -1, 0, C.bellyDark); vs.set(-1, -2, 0, C.belly);
      vs.set(1, -3, 0, C.hideDeep); vs.set(1, 1, -1, C.hornDark);
      reg(vs, thighR, 'thighR');
      reg(mirrorVS(vs), thighL, 'thighL');
    }
    // 13. SHINS
    {
      const vs = new VS();
      fillBox(vs, -1, -2, 0, 1, 0, 1, skin(-2, 0));
      vs.set(1, -1, -1, C.hornDark); vs.set(-1, -2, 0, C.bellyDark);
      reg(vs, shinR, 'shinR');
      reg(mirrorVS(vs), shinL, 'shinL');
    }
    // 14. FEET
    {
      const vs = new VS();
      fillBox(vs, -1, -1, 0, 1, 0, 1, skin(-1, 0));
      const toe = (x0, x1) => {
        vs.set(x0, -1, 0, C.hideDark); vs.set(x0, -1, -1, C.hide);
        vs.set(x1, -2, -2, C.hideDark); vs.set(x1, -2, -3, C.claw);
      };
      toe(0, 0); toe(1, 2); toe(-1, -2);
      vs.set(1, 0, 1, C.hornDark);
      reg(vs, footR, 'footR');
      reg(mirrorVS(vs), footL, 'footL');
    }
    // 15. SHOULDERS
    {
      const vs = new VS();
      fillBox(vs, 0, -2, -1, 1, 0, 0, skin(-2, 0));
      vs.set(1, 0, -1, C.hideDark); vs.set(1, -2, 0, C.hornDark);
      reg(vs, shoulderR, 'shoulderR');
      reg(mirrorVS(vs), shoulderL, 'shoulderL');
    }
    // 16. ELBOWS
    {
      const vs = new VS();
      fillBox(vs, 0, -2, 0, 1, 0, 1, skin(-2, 0));
      vs.set(1, -1, 1, C.hideDark);
      reg(vs, elbowR, 'elbowR');
      reg(mirrorVS(vs), elbowL, 'elbowL');
    }
    // 17. HANDS
    {
      const vs = new VS();
      vs.box(0, -1, -1, 1, 0, 0, C.hideDark);
      vs.set(0, -2, -1, C.claw); vs.set(1, -2, -2, C.claw); vs.set(0, -2, -2, C.claw);
      reg(vs, handR, 'handR');
      reg(mirrorVS(vs), handL, 'handL');
    }

    // Compute global offsets
    for (const p of partsList) {
      let ox = 0, oy = 0, oz = 0, o = p.boneRef;
      while (o && o !== dummyModel) {
        ox += o.position.x; oy += o.position.y; oz += o.position.z;
        o = o.parent;
      }
      p.ox = Math.round(ox * 2); p.oy = Math.round(oy * 2); p.oz = Math.round(oz * 2);
    }

    const world = new Map();
    partsList.forEach((p, pi) => {
      p.cells = [];
      for (const [k, c] of p.vs.m) {
        const x = ((k >> 20) & 1023) - 512, y = ((k >> 10) & 1023) - 512, z = (k & 1023) - 512;
        const wx = x * 2 + p.ox, wy = y * 2 + p.oy, wz = z * 2 + p.oz;
        p.cells.push([wx, wy, wz, c]);
        world.set(WKEY(wx, wy, wz), pi);
      }
    });

    const tmpC = new THREE.Color();
    const geoms = [];
    for (let pi = 0; pi < partsList.length; pi++) {
      const p = partsList[pi];
      const pos = [], nrm = [], col = [], idx = [];
      for (const cell of p.cells) {
        const wx = cell[0], wy = cell[1], wz = cell[2], c = cell[3];
        if (world.get(WKEY(wx, wy, wz)) !== pi) continue;
        tmpC.setHex(c);
        const j = 0.945 + hash3(wx * 7 + 3, wy * 13 + 5, wz * 17 + 11) * 0.11;
        const br = tmpC.r * j, bg = tmpC.g * j, bb = tmpC.b * j;
        for (const F of FACES) {
          const nx = wx + F.n[0] * 2, ny = wy + F.n[1] * 2, nz = wz + F.n[2] * 2;
          const owner = world.get(WKEY(nx, ny, nz));
          if (owner === pi) continue;
          const seam = owner !== undefined;
          const ao = [];
          for (let ci = 0; ci < 4; ci++) {
            const su = (ci === 0 || ci === 3) ? -1 : 1, sv = ci < 2 ? -1 : 1;
            const s1 = world.has(WKEY(nx + F.u[0] * 2 * su, ny + F.u[1] * 2 * su, nz + F.u[2] * 2 * su));
            const s2 = world.has(WKEY(nx + F.w[0] * 2 * sv, ny + F.w[1] * 2 * sv, nz + F.w[2] * 2 * sv));
            const cr = world.has(WKEY(nx + (F.u[0] * su + F.w[0] * sv) * 2, ny + (F.u[1] * su + F.w[1] * sv) * 2, nz + (F.u[2] * su + F.w[2] * sv) * 2));
            ao.push((s1 && s2) ? 0 : 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (cr ? 1 : 0)));
          }
          const base = pos.length / 3;
          for (let i = 0; i < 4; i++) {
            let ax = F.v[i][0] - 0.5, ay = F.v[i][1] - 0.5, az = F.v[i][2] - 0.5;
            if (seam) {
              if (F.n[0]) ax *= 0.94;
              if (F.n[1]) ay *= 0.94;
              if (F.n[2]) az *= 0.94;
            }
            pos.push(wx / 2 + ax - p.ox / 2, wy / 2 + ay - p.oy / 2, wz / 2 + az - p.oz / 2);
            nrm.push(F.n[0], F.n[1], F.n[2]);
            const s = AO_LUT[ao[i]];
            col.push(br * s, bg * s, bb * s);
          }
          if (ao[0] + ao[2] > ao[1] + ao[3]) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          else idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeBoundingSphere();
      geoms.push({ boneName: p.boneName, geo: g, isEye: p.isEye });
    }

    _cachedGeometries = geoms;
    return geoms;
  }

  return {
    SCALE,

    build(boss = false) {
      const g = new THREE.Group();
      g.name = 'Mob_Trex';

      /* Pivot pembalik 180 derajat: di T-rex.html kepala mengarah ke -Z.
         Pivot ini memutar model agar kepala menghadap +Z (arah forward standar Forecraft) */
      const pivot = new THREE.Group();
      pivot.name = 'TrexPivot';
      pivot.rotation.y = Math.PI;
      g.add(pivot);

      const model = new THREE.Group();
      model.name = 'TrexModel';
      /* T-Rex biasa lebih kecil sedikit (0.84x) dari mini boss (1.08x) */
      const s = boss ? SCALE * 1.08 : SCALE * 0.84;
      model.scale.setScalar(s);
      model.userData.scale = s;
      pivot.add(model);

      const bones = {};
      function b(name, parent, x, y, z) {
        const bg = new THREE.Group();
        bg.name = name; bg.position.set(x, y, z);
        parent.add(bg);
        bones[name] = bg;
        return bg;
      }

      // Hierarchy matching T-rex.html
      const hips = b('hips', model, 0, 8.5, 2);
      const spine = b('spine', hips, 0, 2, -3);
      const neck1 = b('neck1', spine, 0, 1, -2);
      const neck2 = b('neck2', neck1, 0, 2, -1);
      const head = b('head', neck2, 0, 1, -2);
      const jaw = b('jaw', head, 0, -1, 1);
      const shoulderR = b('shoulderR', spine, 2, 0, -1);
      const shoulderL = b('shoulderL', spine, -2, 0, -1);
      const elbowR = b('elbowR', shoulderR, 0, -2, 0);
      const elbowL = b('elbowL', shoulderL, 0, -2, 0);
      const handR = b('handR', elbowR, 0, -2, 0);
      const handL = b('handL', elbowL, 0, -2, 0);
      const thighR = b('thighR', hips, 2, -1, 0);
      const thighL = b('thighL', hips, -2, -1, 0);
      const shinR = b('shinR', thighR, 0, -3, -1);
      const shinL = b('shinL', thighL, 0, -3, -1);
      const footR = b('footR', shinR, 0, -2, 1);
      const footL = b('footL', shinL, 0, -2, 1);
      let tp = hips;
      const TAILDEF = [[0, 0, 3], [0, 0, 3], [0, 1, 3], [0, 1, 3]];
      for (let i = 0; i < 4; i++) {
        const d = TAILDEF[i];
        const tb = b('tail' + (i + 1), tp, d[0], d[1], d[2]);
        tp = tb;
      }

      // Attach welded geometries
      const bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const eyeMat = new THREE.MeshBasicMaterial({ color: C.eye });

      const geoms = createVoxelGeometries();
      for (const item of geoms) {
        const targetBone = (item.boneName === 'head_eye') ? bones.head : bones[item.boneName];
        if (targetBone) {
          const mesh = new THREE.Mesh(item.geo, item.isEye ? eyeMat : bodyMat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          targetBone.add(mesh);
        }
      }

      const parts = {
        model, bones, hips, spine, neck1, neck2, head, jaw,
        shoulderR, shoulderL, elbowR, elbowL, handR, handL,
        thighR, thighL, shinR, shinL, footR, footL
      };

      return { mesh: g, parts };
    },

    /* ================= POSE ENGINE DARI T-REX.HTML ================= */
    animate(m, dt) {
      if (!m || !m.mesh || !m.parts) return;
      const P = {};
      const RP = { pf: 0, py: 0, rx: 0, rz: 0, ry: 0 };
      for (const n of BONE_LIST) P[n] = { x: 0, y: 0, z: 0 };

      function zeroPose() {
        for (const n of BONE_LIST) { const o = P[n]; o.x = 0; o.y = 0; o.z = 0; }
        RP.pf = 0; RP.py = 0; RP.rx = 0; RP.rz = 0; RP.ry = 0;
      }

      function sym(name, x, y, z) {
        const L = P[name + 'L'], R = P[name + 'R'];
        if (L) { L.x += x; L.y += y; L.z += z; }
        if (R) { R.x += x; R.y -= y; R.z -= z; }
      }
      function tailAllX(v) {
        for (let i = 1; i <= 4; i++) P['tail' + i].x += v * (1 - (i - 1) * 0.12);
      }
      function tailAllY(v) {
        for (let i = 1; i <= 4; i++) P['tail' + i].y += v * i;
      }

      m.trexTime = (m.trexTime || 0) + dt;
      const TIME = m.trexTime;

      // Bone & root smoothing caches
      if (!m._curBones) {
        m._curBones = {};
        for (const n of BONE_LIST) m._curBones[n] = { x: 0, y: 0, z: 0 };
      }
      if (!m._curRP) {
        m._curRP = { pf: 0, py: 0, rx: 0, rz: 0 };
      }

      // Hitung kecepatan ayunan langkah (gaitSpd) & majukan phase langkah
      let gaitSpd = 0;
      if (m.chargeT > 0) {
        const u = 1 - m.chargeT / 3.00;
        gaitSpd = (u < 0.74) ? 1.35 : (u < 0.86 ? 0.65 : 0.15);
      } else if (m.shredT > 0) {
        gaitSpd = 0.30;
      } else if (m.biteT > 0) {
        gaitSpd = 0.35;
      } else {
        const sp = Math.hypot(m.vel.x, m.vel.z);
        gaitSpd = (sp > 2.8) ? 1.2 : (sp > 0.15 ? 0.6 : 0);
      }

      if (gaitSpd > 0.02) {
        m.trexPhase = (m.trexPhase || 0) + dt * Math.PI * 2 * (0.72 + 1.35 * gaitSpd);
      }

      function poseGait(spd) {
        if (spd <= 0.001) return;
        const PHASE = m.trexPhase || 0;
        const amp = Math.min(1, spd * 1.7), run = sstep(spd, 0.58, 1.02);
        const A = (0.30 + 0.42 * run) * amp, B = (0.45 + 0.62 * run) * amp;
        const lean = -(0.05 * amp + 0.26 * run);
        P.hips.x += lean; P.hips.y += 0.075 * amp * Math.sin(PHASE); P.hips.z += 0.06 * amp * Math.cos(PHASE);
        RP.py += 0.14 * amp * Math.cos(2 * PHASE) - 0.11 * run * amp;
        RP.rx += lean * 0.35;
        for (const side of [1, -1]) {
          const ph = PHASE + (side > 0 ? 0 : Math.PI);
          const thx = A * Math.cos(ph) - lean * 0.85;
          const flex = Math.max(0, -Math.sin(ph));
          const shx = -B * flex + 0.10 * amp * Math.max(0, Math.sin(ph));
          const ftx = -(thx + shx + lean * 0.85) * 0.6 + 0.36 * B * flex;
          const n = side > 0 ? 'R' : 'L';
          P['thigh' + n].x += thx; P['thigh' + n].z += side * 0.05 * amp * Math.cos(ph);
          P['shin' + n].x += shx;
          P['foot' + n].x += ftx; P['foot' + n].z += side * 0.03 * amp;
        }
        P.spine.x += -lean * 0.42 + 0.05 * amp * Math.sin(2 * PHASE);
        P.spine.y += -0.10 * amp * Math.sin(PHASE);
        P.spine.z += 0.04 * amp * Math.cos(PHASE);
        P.neck1.x += -lean * 0.55 + 0.035 * amp * Math.sin(2 * PHASE + 0.5);
        P.neck1.y += -0.06 * amp * Math.sin(PHASE + 0.4);
        P.neck2.x += -lean * 0.60 + 0.03 * amp * Math.sin(2 * PHASE + 0.9);
        P.neck2.y += 0.05 * amp * Math.sin(PHASE + 0.8);
        P.head.x += -lean * 0.34 - 0.05 * amp * Math.sin(2 * PHASE);
        P.head.y += 0.05 * amp * Math.sin(PHASE + 1.2);
        P.head.z += -0.04 * amp * Math.cos(PHASE);
        P.jaw.x += -0.05 * amp - 0.07 * run;
        for (let i = 1; i <= 4; i++) {
          const w = 0.5 + i * 0.28;
          P['tail' + i].y += 0.09 * w * amp * Math.sin(PHASE - i * 0.6);
          P['tail' + i].x += (-lean * 0.30) - 0.03 * i * run;
        }
        for (const side of [1, -1]) {
          const n = side > 0 ? 'R' : 'L', ph = PHASE + (side > 0 ? Math.PI : 0);
          P['shoulder' + n].x += -0.36 * amp * Math.cos(ph) - 0.05 * amp;
          P['shoulder' + n].z += side * (0.10 + 0.08 * amp);
          P['elbow' + n].x += -0.32 * amp * (0.5 + 0.5 * Math.cos(ph)) - 0.16 * amp;
          P['hand' + n].x += -0.2 * amp * Math.cos(ph + 0.6);
        }
      }

      function poseIdle() {
        const br = Math.sin(TIME * 1.45);
        P.spine.x += 0.03 * br; P.hips.x += 0.022 * Math.sin(TIME * 1.45 + 0.6); RP.py += 0.04 * br;
        P.neck2.x += 0.02 * br;
        P.head.y += 0.26 * Math.sin(TIME * 0.40);
        P.head.x += 0.08 * Math.sin(TIME * 0.61 + 1.1) + 0.02 * br;
        P.head.z += 0.05 * Math.sin(TIME * 0.33);
        P.neck2.y += 0.10 * Math.sin(TIME * 0.40 - 0.6);
        P.neck1.y += 0.05 * Math.sin(TIME * 0.40 - 1);
        P.jaw.x += -0.06 - 0.06 * (0.5 + 0.5 * Math.sin(TIME * 0.85));
        for (let i = 1; i <= 4; i++) P['tail' + i].y += 0.055 * i * Math.sin(TIME * 0.72 - i * 0.45);
        P.shoulderL.x += 0.06 * Math.sin(TIME * 1.1); P.shoulderR.x += 0.06 * Math.sin(TIME * 1.1 + 0.4);
        P.elbowL.x += -0.05 * Math.sin(TIME * 1.1); P.elbowR.x += -0.05 * Math.sin(TIME * 1.1 + 0.4);
        const sh = Math.sin(TIME * 0.28);
        P.hips.z += 0.04 * sh; RP.py -= 0.02 * Math.abs(sh);
        P.thighL.z += 0.03 * sh; P.thighR.z -= 0.03 * sh;
      }

      function poseBite(u) {
        let a = 0, b = 0;
        if (u < 0.26) a = eIO(u / 0.26);
        else if (u < 0.40) { const k = eIn((u - 0.26) / 0.14); a = 1 - k; b = k; }
        else b = 1 - eIO((u - 0.40) / 0.60);
        P.neck1.x += 0.30 * a; P.neck2.x += 0.24 * a; P.head.x += 0.34 * a; P.jaw.x += -1.0 * a;
        P.hips.x += 0.07 * a; P.spine.x += 0.10 * a; RP.pf += 0.26 * a; RP.py += 0.05 * a;
        tailAllX(-0.10 * a);
        sym('shoulder', -0.30 * a, 0, 0.15 * a); P.elbowL.x += -0.45 * a; P.elbowR.x += -0.45 * a;
        P.thighL.x += -0.07 * a; P.thighR.x += -0.07 * a; P.shinL.x += 0.10 * a; P.shinR.x += 0.10 * a;
        P.neck1.x += -0.38 * b; P.neck2.x += -0.30 * b; P.head.x += -0.54 * b; P.jaw.x += 0.18 * b;
        P.hips.x += -0.17 * b; P.spine.x += -0.19 * b; RP.pf += 0.95 * b; RP.py += -0.14 * b;
        tailAllX(0.11 * b);
        sym('shoulder', 0.55 * b, 0.16 * b, 0); P.elbowL.x += -0.55 * b; P.elbowR.x += -0.55 * b;
        P.handL.x += 0.4 * b; P.handR.x += 0.4 * b;
        P.thighL.x += 0.10 * b; P.thighR.x += 0.10 * b; P.shinL.x += -0.14 * b; P.shinR.x += -0.14 * b;
        P.footL.x += 0.10 * b; P.footR.x += 0.10 * b;
      }

      function poseShred(u) {
        const roar = pulse(u, 0, 0.10, 0.20);
        P.neck1.x += 0.42 * roar; P.neck2.x += 0.34 * roar; P.head.x += 0.44 * roar; P.jaw.x += -1.18 * roar;
        RP.py += -0.18 * roar; RP.pf += -0.30 * roar; P.hips.x += 0.10 * roar; P.spine.x += 0.14 * roar;
        sym('shoulder', -0.7 * roar, 0, 0.30 * roar); P.elbowL.x += -0.7 * roar; P.elbowR.x += -0.7 * roar;
        tailAllX(-0.13 * roar);
        if (u > 0.16 && u < 0.84) {
          const k = eIO(seg(u, 0.16, 0.84));
          const cyc = (u - 0.16) / 0.17, i = Math.floor(cyc), q = cyc - i;
          const open = q < 0.42 ? eIO(q / 0.42) : 1 - eIn(clamp01((q - 0.42) / 0.28));
          const bite = q < 0.42 ? 0 : eIn(clamp01((q - 0.42) / 0.20));
          const side = (i % 2 === 0 ? 1 : -1);
          P.neck1.x += -0.36 * bite + 0.26 * open;
          P.neck2.x += -0.28 * bite + 0.22 * open;
          P.head.x += -0.56 * bite + 0.36 * open;
          P.head.y += side * (0.36 * bite - 0.14 * open);
          P.head.z += side * (0.24 * bite);
          P.jaw.x += -1.08 * open + 0.24 * bite;
          P.spine.x += -0.17 * bite + 0.10 * open;
          P.hips.x += -0.11 * bite;
          RP.pf += 0.5 + 0.8 * k;
          RP.py += -0.16 * bite + 0.06 * open;
          sym('shoulder', 0.48 * bite - 0.30 * open, 0, 0.18 * bite * side);
          P.elbowL.x += -0.6 * bite; P.elbowR.x += -0.6 * bite;
          P.thighL.x += 0.13 * bite; P.thighR.x += 0.13 * bite;
          P.shinL.x += -0.17 * bite; P.shinR.x += -0.17 * bite;
          tailAllY(side * 0.06 * bite); tailAllX(-0.05 * bite);
        }
        if (u >= 0.84) {
          const d = 1 - eIO(seg(u, 0.84, 1));
          P.head.y += 0.32 * Math.sin(u * 44) * d; P.head.z += 0.17 * Math.sin(u * 36) * d;
          P.jaw.x += -0.26 * d; P.neck2.y += 0.18 * Math.sin(u * 38) * d; RP.pf += 1.15 * d;
        }
      }

      function poseSpin(u) {
        const c = pulse(u, 0, 0.16, 0.26);
        RP.py += -0.42 * c; P.thighL.x += 0.30 * c; P.thighR.x += 0.30 * c;
        P.shinL.x += -0.50 * c; P.shinR.x += -0.50 * c; P.footL.x += 0.24 * c; P.footR.x += 0.24 * c;
        P.head.y += -0.85 * c; P.neck2.y += -0.40 * c; P.spine.y += -0.22 * c; P.head.x += 0.18 * c; P.jaw.x += -0.35 * c;
        sym('shoulder', -0.4 * c, 0, 0.55 * c);
        for (let i = 1; i <= 4; i++) { P['tail' + i].y += 0.20 * i * c; P['tail' + i].x += -0.09 * i * c; }
        if (u >= 0.20 && u < 0.80) {
          const k = eIO(seg(u, 0.20, 0.78));
          RP.ry = -Math.PI * 4 * k;
          RP.py += lerp(-0.42, -0.12, k);
          P.thighL.x += lerp(0.30, -0.18, k); P.thighR.x += lerp(0.30, -0.18, k);
          P.shinL.x += lerp(-0.50, -0.10, k); P.shinR.x += lerp(-0.50, -0.10, k);
          P.footL.x += lerp(0.24, 0.10, k); P.footR.x += lerp(0.24, 0.10, k);
          sym('shoulder', -0.15, 0, 0.75); P.elbowL.x += -0.35; P.elbowR.x += -0.35;
          P.spine.y += 0.10 * Math.sin(k * Math.PI * 3);
          P.head.y += lerp(-0.85, 0.55, k); P.head.x += -0.26; P.neck2.y += lerp(-0.40, 0.22, k);
          P.neck1.x += 0.10; P.jaw.x += -0.28;
          for (let i = 1; i <= 4; i++) {
            P['tail' + i].y += lerp(0.20 * i, -0.14 * i, k) + 0.12 * i * Math.sin(k * Math.PI * 3.2 - i * 0.55) * (1 - k * 0.55);
            P['tail' + i].x += -0.06 * i + 0.03 * i * Math.cos(k * Math.PI * 3 - i * 0.4);
          }
        } else if (u >= 0.80) {
          const d = 1 - eIO(seg(u, 0.80, 1));
          RP.ry = -Math.PI * 4;
          RP.py += -0.20 * d;
          P.thighL.x += 0.16 * d; P.thighR.x += 0.16 * d; P.shinL.x += -0.26 * d; P.shinR.x += -0.26 * d;
          P.head.y += 0.30 * d * Math.sin(u * 22); P.neck2.y += 0.2 * d;
          sym('shoulder', -0.2 * d, 0, 0.3 * d);
          for (let i = 1; i <= 4; i++) { P['tail' + i].y += 0.25 * i * d * Math.sin(u * 17 - i * 0.6); P['tail' + i].x += -0.05 * i * d; }
        }
      }

      function poseCharge(u) {
        if (u < 0.14) {
          const c = eIO(u / 0.14);
          RP.py += -0.38 * c; P.thighL.x += 0.28 * c; P.thighR.x += 0.28 * c;
          P.shinL.x += -0.46 * c; P.shinR.x += -0.46 * c; P.footL.x += 0.22 * c; P.footR.x += 0.22 * c;
          P.neck1.x += 0.36 * c; P.neck2.x += 0.30 * c; P.head.x += 0.42 * c; P.jaw.x += -1.12 * c;
          P.spine.x += 0.12 * c; P.hips.x += 0.08 * c;
          sym('shoulder', -0.6 * c, 0, 0.35 * c); P.elbowL.x += -0.8 * c; P.elbowR.x += -0.8 * c;
          tailAllX(-0.07 * c);
          return;
        }
        if (u < 0.74) {
          const k = eIO(seg(u, 0.14, 0.72));
          poseGait(1.35);
          RP.pf += 5.0 * k; RP.py += -0.10;
          P.hips.x += -0.10; P.spine.x += -0.10; P.neck1.x += 0.16; P.neck2.x += 0.18; P.head.x += 0.14; P.jaw.x += -0.42;
          sym('shoulder', 0.10, 0, 0.22); P.elbowL.x += -0.35; P.elbowR.x += -0.35;
          tailAllX(0.05);
          const b1 = pulse(u, 0.26, 0.32, 0.42), b2 = pulse(u, 0.48, 0.54, 0.64);
          const bb = Math.max(b1, b2);
          P.head.x += -0.48 * bb; P.neck1.x += -0.28 * bb; P.neck2.x += -0.22 * bb; P.jaw.x += 0.44 * bb;
          P.spine.x += -0.10 * bb; RP.py += -0.08 * bb;
          P.head.y += 0.20 * (b1 - b2); P.head.z += 0.15 * (b1 - b2);
          return;
        }
        const f = eIO(seg(u, 0.74, 0.86));
        const r = u > 0.86 ? eIO(seg(u, 0.86, 1)) : 0;
        const hold = 1 - r;
        RP.pf += 5.0 + 0.8 * f * hold;
        poseGait(1.35 * (1 - f) + 0.3 * f * hold + 0.12 * r);
        P.hips.x += (0.16 * f - 0.05) * hold; P.spine.x += 0.20 * f * hold;
        P.neck1.x += -0.42 * f * hold; P.neck2.x += -0.32 * f * hold; P.head.x += -0.64 * f * hold;
        P.jaw.x += (-1.0 * (1 - f) + 0.22 * f) * hold;
        RP.py += -0.30 * f * hold + 0.10 * r;
        sym('shoulder', 0.72 * f * hold, 0, 0.30 * f * hold); P.elbowL.x += -0.9 * f * hold; P.elbowR.x += -0.9 * f * hold;
        P.handL.x += 0.6 * f * hold; P.handR.x += 0.6 * f * hold;
        P.thighL.x += -0.26 * f * hold; P.thighR.x += -0.26 * f * hold;
        P.shinL.x += 0.30 * f * hold; P.shinR.x += 0.30 * f * hold;
        P.footL.x += -0.22 * f * hold; P.footR.x += -0.22 * f * hold;
        tailAllX((0.10 * f - 0.04) * hold);
      }

      // Reset P di awal frame
      zeroPose();

      /* Eksekusi Attack State / Gait */
      let isAtk = true;
      if (m.chargeT > 0) {
        m.chargeT = Math.max(0, m.chargeT - dt);
        const u = 1 - m.chargeT / 3.00;
        poseCharge(u);
        if (u >= 0.80 && !m._chargeHit) {
          m._chargeHit = true;
          if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(m.pos, 'slam');
          if (typeof FX !== 'undefined' && FX.ring) {
            FX.ring(m.pos.x, m.pos.y + 0.1, m.pos.z, 0xff7a3c, 1.2, 5.0);
          }
        }
      } else if (m.spinT > 0) {
        m.spinT = Math.max(0, m.spinT - dt);
        const u = 1 - m.spinT / 2.15;
        poseSpin(u);
      } else if (m.shredT > 0) {
        m.shredT = Math.max(0, m.shredT - dt);
        const u = 1 - m.shredT / 2.05;
        poseGait(0.30);
        poseShred(u);
        const hitStep = Math.floor(u / 0.25);
        if (hitStep > (m._shredStep || 0)) {
          m._shredStep = hitStep;
          if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(m.pos, 'hurt');
          if (typeof FX !== 'undefined' && FX.debris) {
            FX.debris(m.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff3d14, 5, 2.0);
          }
        }
      } else if (m.biteT > 0) {
        m.biteT = Math.max(0, m.biteT - dt);
        const u = 1 - m.biteT / 0.88;
        poseGait(0.35);
        poseBite(u);
      } else {
        isAtk = false;
        const sp = Math.hypot(m.vel.x, m.vel.z);
        if (sp > 0.15) {
          poseGait(gaitSpd);
        } else {
          poseIdle();
        }
      }

      // Base tail offset dari T-rex.html
      const TBASE = [-0.06, -0.05, -0.035, -0.02];
      for (let i = 1; i <= 4; i++) P['tail' + i].x += TBASE[i - 1];

      // Smooth bone rotations
      const resp = isAtk ? 30 : 11;
      const k = 1 - Math.exp(-resp * dt);

      const bones = m.parts.bones;
      if (bones) {
        for (const name of BONE_LIST) {
          const c = m._curBones[name], t = P[name], b = bones[name];
          if (!b || !c || !t) continue;
          c.x = c.x + (t.x - c.x) * k;
          c.y = c.y + (t.y - c.y) * k;
          c.z = c.z + (t.z - c.z) * k;
          b.rotation.set(c.x, c.y, c.z);
        }
      }

      // Root displacement & pitch/roll/yaw (terjang maju ke arah kepala)
      const curRP = m._curRP;
      curRP.pf = curRP.pf + (RP.pf - curRP.pf) * (1 - Math.exp(-16 * dt));
      curRP.py = curRP.py + (RP.py - curRP.py) * (1 - Math.exp(-18 * dt));
      curRP.rx = curRP.rx + (RP.rx - curRP.rx) * k;
      curRP.rz = curRP.rz + (RP.rz - curRP.rz) * k;

      const model = m.parts.model;
      if (model) {
        const sc = (model.userData && model.userData.scale) || SCALE;
        model.position.y = curRP.py * sc;
        model.position.z = -curRP.pf * sc;
        model.rotation.set(curRP.rx, (RP.ry || 0), curRP.rz);
      }

      // Flash merah saat terkena serangan
      const em = (m.flash > 0) ? 0xaa2222 : 0x000000;
      m.mesh.traverse(o => {
        if (o.material && o.material.emissive) o.material.emissive.setHex(em);
      });
    }
  };
})();

window.Mob_Trex = Mob_Trex;
if (typeof module !== 'undefined') module.exports = Mob_Trex;
