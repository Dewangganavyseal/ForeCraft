'use strict';
/* =========================================================================
   MAGIC CAST CIRCLE — 6 ELEMEN (PORT 1:1 DARI Magic circle.html)
   -------------------------------------------------------------------------
   Sistem efek lingkaran sihir tanah persis 100% prototipe NEW MODEL/Magic circle.html:
   1. Cincin rune luar berputar searah jarum jam (+t*0.3).
   2. Heksagram & sigil elemen dalam berputar berlawanan arah (-t*0.8).
   3. Cahaya dasar lantai (radial glow) bernapas (pulse = 0.7 + 0.3*sin(t*2)).
   4. Partikel spesifik per elemen:
      - ES (ice)        : serpihan kristal es melayang naik + osilasi sinus & twinkle.
      - METEOR (meteor) : bara api naik + garis streak meteor jatuh dari atas.
      - CAHAYA (light)  : kilau emas naik berkelok winding + twinkle.
      - KEGELAPAN (dark): asap kabut ungu tenggelam turun ke dalam lingkaran.
   ========================================================================= */

const MagicCircle = (() => {
  const TAU = Math.PI * 2;
  const RUNES = "ᚠᚢᚦᚱᚷᚹᚾᛃᛈᛊᛒᛗᛜᛟ";

  const ELEMENTS = {
    ice:    { name: "ES",        rgb: "150,220,255", rgb2: "70,150,255",  p: "ice",    sym: "snow", seed: 0 },
    meteor: { name: "METEOR",    rgb: "255,175,90",  rgb2: "255,80,45",   p: "meteor", sym: "star", seed: 7 },
    light:  { name: "CAHAYA",    rgb: "255,240,180", rgb2: "255,210,90",  p: "light",  sym: "sun",  seed: 14 },
    dark:   { name: "KEGELAPAN", rgb: "195,120,255", rgb2: "130,50,190",  p: "dark",   sym: "moon", seed: 21 },
    earth:  { name: "TANAH",     rgb: "225,185,115", rgb2: "150,195,95",  p: "earth",  sym: "earth",seed: 28 },
    wind:   { name: "ANGIN",     rgb: "190,255,230", rgb2: "95,220,175",  p: "wind",   sym: "air",  seed: 35 },
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function easeOutCubic(t) {
    const x = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - x, 3);
  }
  function easeOutBack(t) {
    const x = Math.max(0, Math.min(1, t));
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  const _texCache = {};

  /* Sprite radial glow 1:1 prototipe makeGlow */
  function makeGlowCanvas(rgb) {
    if (typeof document === 'undefined') return null;
    const s = document.createElement("canvas");
    s.width = s.height = 64;
    const g = s.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.35, `rgba(${rgb},0.4)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return s;
  }

  /* Ring luar + rune + tick marks 1:1 prototipe drawOuter */
  function drawOuter(g, el, R) {
    const c = `rgba(${el.rgb},`;
    g.shadowColor = c + ".9)";
    g.shadowBlur = 6;
    g.strokeStyle = c + ".95)";
    g.lineWidth = 2.4;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.stroke();

    g.lineWidth = 1.1;
    g.strokeStyle = c + ".55)";
    g.beginPath();
    g.arc(0, 0, R * 0.92, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, R * 0.70, 0, TAU);
    g.stroke();

    g.strokeStyle = c + ".8)";
    g.lineWidth = 1.4;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      const l = (i % 3) ? R * 0.035 : R * 0.07;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
      g.lineTo(Math.cos(a) * (R * 0.92 - l), Math.sin(a) * (R * 0.92 - l));
      g.stroke();
    }

    g.fillStyle = c + ".9)";
    g.font = Math.max(12, Math.round(R * 0.13)) + "px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      g.save();
      g.translate(Math.cos(a) * R * 0.81, Math.sin(a) * R * 0.81);
      g.rotate(a + Math.PI / 2);
      g.fillText(RUNES[(i * 5 + el.seed) % RUNES.length], 0, 0);
      g.restore();
    }
  }

  /* Hexagram + sigil elemen 1:1 prototipe drawInner */
  function drawInner(g, el, R) {
    const c = `rgba(${el.rgb2},`;
    g.shadowColor = c + ".9)";
    g.shadowBlur = 8;
    g.strokeStyle = c + ".9)";
    g.lineWidth = 1.8;
    const r = R * 0.6;
    for (const rot of [-Math.PI / 2, Math.PI / 2]) {
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = rot + (i * TAU) / 3;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, R * 0.42, 0, TAU);
    g.stroke();

    const k = `rgba(${el.rgb},1)`;
    g.strokeStyle = k;
    g.fillStyle = k;
    g.lineWidth = 2.2;
    g.shadowColor = k;
    const s = R * 0.24;

    switch (el.sym) {
      case "snow":
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(Math.cos(a) * s, Math.sin(a) * s);
          g.stroke();
          const bx = Math.cos(a) * s * 0.6, by = Math.sin(a) * s * 0.6, bl = s * 0.28;
          g.beginPath();
          g.moveTo(bx + Math.cos(a + 2.1) * bl, by + Math.sin(a + 2.1) * bl);
          g.lineTo(bx, by);
          g.lineTo(bx + Math.cos(a - 2.1) * bl, by + Math.sin(a - 2.1) * bl);
          g.stroke();
        }
        break;
      case "star":
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const rr = (i % 2) ? s * 0.45 : s;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.closePath();
        g.fill();
        break;
      case "sun":
        g.beginPath();
        g.arc(0, 0, s * 0.45, 0, TAU);
        g.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8;
          g.beginPath();
          g.moveTo(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.65);
          g.lineTo(Math.cos(a) * s, Math.sin(a) * s);
          g.stroke();
        }
        break;
      case "moon":
        g.beginPath();
        g.moveTo(-s * 0.8, -s * 0.55);
        g.lineTo(s * 0.8, -s * 0.55);
        g.lineTo(0, s * 0.85);
        g.closePath();
        g.stroke();
        g.beginPath();
        g.arc(0, -s * 0.05, s * 0.28, 0, TAU);
        g.stroke();
        break;
      case "earth":
        g.beginPath();
        g.moveTo(-s * 0.85, -s * 0.6);
        g.lineTo(s * 0.85, -s * 0.6);
        g.lineTo(0, s * 0.85);
        g.closePath();
        g.stroke();
        g.beginPath();
        g.moveTo(-s * 0.5, -s * 0.12);
        g.lineTo(s * 0.5, -s * 0.12);
        g.stroke();
        break;
      case "air":
        g.beginPath();
        g.moveTo(-s * 0.85, s * 0.6);
        g.lineTo(s * 0.85, s * 0.6);
        g.lineTo(0, -s * 0.85);
        g.closePath();
        g.stroke();
        g.beginPath();
        g.moveTo(-s * 0.5, s * 0.12);
        g.lineTo(s * 0.5, s * 0.12);
        g.stroke();
        break;
    }
  }

  function getElementTextures(key) {
    if (_texCache[key]) return _texCache[key];
    const el = ELEMENTS[key] || ELEMENTS.meteor;
    if (typeof document === 'undefined' || typeof THREE === 'undefined') return null;

    const S = 512, R = 224;
    // Outer canvas
    const cvOut = document.createElement("canvas");
    cvOut.width = cvOut.height = S;
    const gOut = cvOut.getContext("2d");
    gOut.translate(S / 2, S / 2);
    drawOuter(gOut, el, R);

    // Inner canvas
    const cvIn = document.createElement("canvas");
    cvIn.width = cvIn.height = S;
    const gIn = cvIn.getContext("2d");
    gIn.translate(S / 2, S / 2);
    drawInner(gIn, el, R);

    // Glow canvas
    const cvGlow = makeGlowCanvas(el.rgb);

    const outerTex = new THREE.CanvasTexture(cvOut);
    outerTex.generateMipmaps = true;
    const innerTex = new THREE.CanvasTexture(cvIn);
    innerTex.generateMipmaps = true;
    const glowTex = new THREE.CanvasTexture(cvGlow);
    glowTex.generateMipmaps = true;

    _texCache[key] = { el, outerTex, innerTex, glowTex };
    return _texCache[key];
  }

  /* Shared geometry planar lingkaran */
  let _quadGeo = null;
  function getQuadGeo() {
    if (!_quadGeo && typeof THREE !== 'undefined') {
      _quadGeo = new THREE.PlaneGeometry(1, 1);
    }
    return _quadGeo;
  }

  /* List lingkaran sihir yang aktif di scene dunia */
  const activeCircles = [];

  class CircleInstance {
    constructor(type, radius = 3.5, options = {}) {
      this.type = type;
      this.radius = radius;
      this.options = options;
      this.age = 0;
      this.dur = options.dur || 4.0;
      this.fading = false;
      this.fadeT = 0;
      this.dead = false;
      this.phase = options.phase || Math.random() * Math.PI * 2;
      this.rate = (type === 'meteor') ? 30 : 24;
      this.emitAcc = 0;
      this.particles = [];
      this.maxParticles = options.maxParticles || 64;

      const texData = getElementTextures(type);
      this.texData = texData;

      const group = new THREE.Group();
      group.name = `MagicCircle_${type}`;
      this.group = group;

      if (!texData) return;

      const geo = getQuadGeo();
      // 1. Cahaya dasar lantai (radial glow)
      const glowMat = new THREE.MeshBasicMaterial({
        map: texData.glowTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glowMesh = new THREE.Mesh(geo, glowMat);
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.y = 0.02;
      const gs = radius * 2.8;
      glowMesh.scale.set(gs, gs, 1);
      glowMesh.renderOrder = 998;
      group.add(glowMesh);
      this.glowMesh = glowMesh;
      this.glowMat = glowMat;

      // 2. Cincin rune luar (searah jarum jam)
      const outerMat = new THREE.MeshBasicMaterial({
        map: texData.outerTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const outerMesh = new THREE.Mesh(geo, outerMat);
      outerMesh.rotation.x = -Math.PI / 2;
      outerMesh.position.y = 0.035;
      const os = radius * 2.0;
      outerMesh.scale.set(os, os, 1);
      outerMesh.renderOrder = 999;
      group.add(outerMesh);
      this.outerMesh = outerMesh;
      this.outerMat = outerMat;

      // 3. Heksagram & sigil elemen dalam (berlawanan jarum jam)
      const innerMat = new THREE.MeshBasicMaterial({
        map: texData.innerTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const innerMesh = new THREE.Mesh(geo, innerMat);
      innerMesh.rotation.x = -Math.PI / 2;
      innerMesh.position.y = 0.045;
      innerMesh.scale.set(os, os, 1);
      innerMesh.renderOrder = 1000;
      group.add(innerMesh);
      this.innerMesh = innerMesh;
      this.innerMat = innerMat;

      // Pool sprite / partikel visual 3D
      const partGroup = new THREE.Group();
      partGroup.renderOrder = 1001;
      group.add(partGroup);
      this.partGroup = partGroup;
    }

    spawnParticle() {
      if (this.particles.length >= this.maxParticles) return;
      const R = this.radius;
      const a = Math.random() * TAU;
      const type = this.type;
      const p = {
        m: null,
        type,
        ang: a,
        rad: 0,
        x: 0, y: 0.05, z: 0,
        px: 0, py: 0.05, pz: 0,
        vx: 0, vy: 0, vz: 0,
        g: 0,
        life: 0, max: 1,
        size: 0.15,
        ph: Math.random() * TAU,
        streak: false
      };

      switch (type) {
        case "ice":
          p.rad = R * Math.sqrt(Math.random()) * 0.95;
          p.x = Math.cos(a) * p.rad;
          p.z = Math.sin(a) * p.rad;
          p.y = 0.06;
          p.vx = rand(-0.3, 0.3);
          p.vy = rand(0.5, 1.4);
          p.vz = rand(-0.3, 0.3);
          p.max = p.life = rand(1.4, 2.6);
          p.size = rand(0.12, 0.28);
          break;
        case "meteor":
          if (Math.random() < 0.28) {
            p.streak = true;
            p.x = rand(-0.9, 0.9) * R;
            p.z = rand(-0.9, 0.9) * R;
            p.y = rand(4.5, 9.5);
            p.vx = rand(-0.8, 0.8);
            p.vy = rand(-14, -22);
            p.vz = rand(-0.8, 0.8);
            p.max = p.life = rand(0.35, 0.65);
            p.size = rand(0.18, 0.36);
          } else {
            p.rad = R * Math.sqrt(Math.random()) * 0.75;
            p.x = Math.cos(a) * p.rad;
            p.z = Math.sin(a) * p.rad;
            p.y = 0.06;
            p.vx = rand(-0.8, 0.8);
            p.vy = rand(1.8, 4.2);
            p.vz = rand(-0.8, 0.8);
            p.g = -6.5;
            p.max = p.life = rand(0.7, 1.5);
            p.size = rand(0.12, 0.26);
          }
          break;
        case "light":
          p.rad = R * Math.sqrt(Math.random()) * 0.90;
          p.x = Math.cos(a) * p.rad;
          p.z = Math.sin(a) * p.rad;
          p.y = 0.06;
          p.vx = rand(-0.4, 0.4);
          p.vy = rand(0.9, 2.4);
          p.vz = rand(-0.4, 0.4);
          p.max = p.life = rand(1.0, 2.2);
          p.size = rand(0.14, 0.32);
          break;
        case "dark":
          // Asap ungu tenggelam turun ke dalam lingkaran dari atas
          p.x = rand(-0.85, 0.85) * R;
          p.z = rand(-0.85, 0.85) * R;
          p.y = rand(1.8, 4.2);
          p.vx = rand(-0.3, 0.3);
          p.vy = rand(-0.8, -1.8);
          p.vz = rand(-0.3, 0.3);
          p.max = p.life = rand(1.6, 2.8);
          p.size = rand(0.28, 0.60);
          break;
        default:
          p.rad = R * Math.random();
          p.x = Math.cos(a) * p.rad; p.z = Math.sin(a) * p.rad;
          p.y = 0.06; p.vy = 1.0;
          p.max = p.life = 1.2; p.size = 0.2;
          break;
      }

      // Buat sprite Three.js untuk partikel
      const mat = new THREE.SpriteMaterial({
        map: this.texData.glowTex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(p.x, p.y, p.z);
      sp.scale.setScalar(p.size);
      this.partGroup.add(sp);
      p.m = sp;

      this.particles.push(p);
    }

    update(dt, t) {
      this.age += dt;

      // 1. Transisi menghilang yang mulus (smooth fade out ~0.8s)
      const FADE_DUR = 0.8;
      let fadeProg = 0;
      let fadeAlpha = 1.0;
      if (this.fading) {
        this.fadeT += dt;
        fadeProg = clamp(this.fadeT / FADE_DUR, 0, 1);
        fadeAlpha = 1 - smoothstep(fadeProg);
        if (fadeProg >= 1) this.dead = true;
      } else if (this.dur > 0 && this.age > this.dur - FADE_DUR) {
        fadeProg = clamp((this.age - (this.dur - FADE_DUR)) / FADE_DUR, 0, 1);
        fadeAlpha = 1 - smoothstep(fadeProg);
        if (fadeProg >= 1) this.dead = true;
      }

      // 2. Tahap rapal berurutan saat pertama kali muncul (Durasi: 1.0 detik)
      // Cincin 1: Cahaya dasar lantai / Ground Radial Glow -> t = 0.0s .. 0.42s
      const tGlow = clamp(this.age / 0.42, 0, 1);
      const glowEnter = easeOutCubic(tGlow);

      // Cincin 2: Cincin rune luar (Outer ring + rune + tick) -> t = 0.22s .. 0.70s
      const tOuter = clamp((this.age - 0.22) / 0.48, 0, 1);
      const outerEnter = easeOutBack(tOuter);

      // Cincin 3: Heksagram & sigil elemen dalam (Inner ring + sigil) -> t = 0.54s .. 1.00s
      const tInner = clamp((this.age - 0.54) / 0.46, 0, 1);
      const innerEnter = easeOutBack(tInner);

      // Kilatan energi magis (flash peak) saat rapal selesai terkunci di detik 1.0
      const flash = (this.age >= 0.82 && this.age <= 1.25)
        ? Math.sin(((this.age - 0.82) / 0.43) * Math.PI) * 0.45
        : 0;

      const pulse = 0.7 + 0.3 * Math.sin(t * 2 + this.phase);

      // Skala dasar
      const gs = this.radius * 2.8;
      const os = this.radius * 2.0;

      // Saat menghilang di akhir: sedikit mengembang & larut ke udara (dissolve)
      const dissolve = 1.0 + fadeProg * 0.12;

      // Update Cincin 1: Radial Glow Lantai
      if (this.glowMesh && this.glowMat) {
        const curGS = gs * (0.2 + 0.8 * glowEnter) * dissolve;
        this.glowMesh.scale.set(curGS, curGS, 1);
        this.glowMat.opacity = clamp((0.32 * pulse * glowEnter + flash * 0.35) * fadeAlpha, 0, 1);
      }

      // Update Cincin 2: Cincin Rune Luar
      if (this.outerMesh && this.outerMat) {
        const curOS = os * (0.35 + 0.65 * outerEnter) * dissolve;
        this.outerMesh.scale.set(curOS, curOS, 1);
        const oAl = ((0.45 + 0.35 * pulse) * outerEnter + flash * 0.4) * fadeAlpha;
        this.outerMat.opacity = clamp(oAl, 0, 1);

        // Putaran dinamis: saat dirapal (age < 0.7s) berputar cepat mengukir, lalu stabil searah jarum jam (+0.3t)
        const outerChantSpin = (1 - tOuter) * 2.4;
        this.outerMesh.rotation.z = (t * 0.3 * (1 - fadeProg * 0.5) + this.phase + outerChantSpin);
      }

      // Update Cincin 3: Heksagram & Sigil Elemen Dalam
      if (this.innerMesh && this.innerMat) {
        const curIS = os * (0.15 + 0.85 * innerEnter) * dissolve;
        this.innerMesh.scale.set(curIS, curIS, 1);
        const iAl = ((0.45 + 0.35 * pulse) * innerEnter + flash * 0.5) * fadeAlpha;
        this.innerMat.opacity = clamp(iAl, 0, 1);

        // Putaran dinamis berlawanan arah (-0.8t) dengan akselerasi saat dirapal
        const innerChantSpin = -(1 - tInner) * 3.6;
        this.innerMesh.rotation.z = (-t * 0.8 * (1 - fadeProg * 0.5) - this.phase * 2 + innerChantSpin);
      }

      // Partikel: mulai memancar saat sigil dalam terbentuk (age > 0.6s) dan sebelum fade out selesai
      const canEmit = !this.dead && this.age > 0.6 && fadeProg < 0.25;
      if (canEmit) {
        const emitMultiplier = (this.age < 1.0) ? (this.age - 0.6) / 0.4 : 1.0;
        this.emitAcc += dt * this.rate * emitMultiplier;
        while (this.emitAcc >= 1) {
          this.emitAcc--;
          this.spawnParticle();
        }
      }

      // Update partikel aktif
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          if (p.m && p.m.parent) p.m.parent.remove(p.m);
          this.particles.splice(i, 1);
          continue;
        }

        const k = p.life / p.max;
        const type = p.type;
        switch (type) {
          case "ice":
            p.x += (p.vx + Math.sin(t * 2 + p.ph) * 0.25) * dt;
            p.z += p.vz * dt;
            p.y += p.vy * dt;
            break;
          case "meteor":
            p.vy += p.g * dt;
            p.x += p.vx * dt;
            p.z += p.vz * dt;
            p.y += p.vy * dt;
            break;
          case "light":
            p.x += (p.vx + Math.sin(t * 3 + p.ph) * 0.35) * dt;
            p.z += (p.vz + Math.cos(t * 2.5 + p.ph) * 0.35) * dt;
            p.y += p.vy * dt;
            break;
          case "dark":
            p.x += (p.vx + Math.sin(t * 1.5 + p.ph) * 0.25) * dt;
            p.z += p.vz * dt;
            p.y += p.vy * dt;
            break;
        }

        let pAl = k;
        if (type === "light") pAl = k * (0.6 + 0.4 * Math.abs(Math.sin(t * 8 + p.ph)));
        else if (type === "ice") pAl = k * (0.55 + 0.45 * Math.abs(Math.sin(t * 5 + p.ph)));
        else if (type === "dark") pAl = k * 0.45;
        else if (type === "meteor") pAl = k * (0.6 + 0.4 * Math.random());

        if (p.m) {
          p.m.position.set(p.x, Math.max(0.04, p.y), p.z);
          p.m.material.opacity = clamp(pAl * fadeAlpha, 0, 1);
          const sc = p.size * (0.5 + k * 0.9);
          p.m.scale.set(sc, sc, sc);
        }
      }
    }

    fade() {
      this.fading = true;
    }

    dispose() {
      this.dead = true;
      for (const p of this.particles) {
        if (p.m && p.m.parent) p.m.parent.remove(p.m);
      }
      this.particles = [];
      if (this.group && this.group.parent) {
        this.group.parent.remove(this.group);
      }
    }
  }

  return {
    ELEMENTS,

    /* Spawn lingkaran sihir ke scene dunia */
    spawn(type, x, y, z, dur = 4.0, radius = 3.5, scene = null) {
      const sc = scene || (typeof Game !== 'undefined' ? Game.scene : null);
      if (!sc) return null;
      const inst = new CircleInstance(type, radius, { dur });
      inst.group.position.set(x, y, z);
      sc.add(inst.group);
      activeCircles.push(inst);
      return inst;
    },

    /* Buat model CircleInstance mandiri (misal diikat ke model NPC Lich) */
    createInstance(type, radius = 2.4, options = {}) {
      return new CircleInstance(type, radius, options);
    },

    /* Update loop per frame: dipanggil dari Game.loop / FX.update */
    update(dt) {
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
      for (let i = activeCircles.length - 1; i >= 0; i--) {
        const c = activeCircles[i];
        c.update(dt, t);
        if (c.dead) {
          c.dispose();
          activeCircles.splice(i, 1);
        }
      }
    }
  };
})();

if (typeof window !== 'undefined') {
  window.MagicCircle = MagicCircle;
}
