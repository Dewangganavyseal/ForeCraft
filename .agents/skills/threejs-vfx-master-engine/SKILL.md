---
name: threejs-vfx-master-engine
description: >-
  Skill fondasi universal untuk pembuatan segala jenis Efek Visual (VFX) di Three.js.
  Gunakan skill ini sebagai pijakan dasar ketika diminta membuat efek seperti api unggun (campfire),
  asap, ledakan, petir, sihir, aura, perisai energi, tebasan pedang, portal, atau proyektil.
  Skill ini mengajari AI pola dasar (building blocks) VFX berkualitas tinggi yang modular & mudah di-custom.
---

# Three.js Universal VFX Master Engine

Skill ini adalah **fondasi dasar (Master Skill)** yang mengajari AI cara merancang **segala bentuk Efek Visual (VFX)** di Three.js. 

Apapun objek atau efek yang diminta (misal: *Api Unggun, Sihir Es, Portal, Aura Karakter, Ledakan, Tebasan Pedang*), AI WAJIB merakit efek tersebut menggunakan 4 Blok Bangunan Utama di bawah ini.

---

## 🧩 4 Blok Bangunan Utama VFX Universal

### 1. Engine Partikel Prosedural (Particle Emitter Engine)
Digunakan untuk: **Api, Asap, Percikan Api (Sparks), Salju, Hujan, Jiwa/Energy Orbs.**

Setiap sistem partikel menggunakan `THREE.BufferGeometry` dengan data kustom (`position`, `velocity`, `color`, `size`, `life`):

```javascript
class UniversalParticleEmitter {
  constructor(options = {}) {
    this.maxParticles = options.maxParticles || 200;
    this.spawnRate = options.spawnRate || 20; // Partikel per detik
    this.colorStart = options.colorStart || new THREE.Color(0xffaa00); // Warna awal (api: kuning)
    this.colorEnd = options.colorEnd || new THREE.Color(0xff0000);   // Warna akhir (api: merah)
    this.sizeStart = options.sizeStart || 0.4;
    this.sizeEnd = options.sizeEnd || 0.05;
    this.velocityBase = options.velocityBase || new THREE.Vector3(0, 1.5, 0); // arah (misal: naik ke atas)
    this.randomness = options.randomness || new THREE.Vector3(0.3, 0.2, 0.3);

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.lifes = new Float32Array(this.maxParticles); // 0.0 (baru) -> 1.0 (mati)
    this.velocities = new Float32Array(this.maxParticles * 3);

    // Populate buffers
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Shader Material Khusus Partikel Glowing
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: options.texture || null } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          // Bentuk partikel lingkaran halus (Soft Radial Gradient)
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  // Loop update yang dipanggil setiap frame
  update(deltaTime) {
    // AI memperbarui posisi partikel berdasarkan velocity, umur (life), dan turbulensi noise
  }
}
```

---

### 2. Shaders Noise Procedural (Procedural Energy & Elemental Shaders)
Digunakan untuk: **Lidah Api (Flames), Perisai Energi, Ripples Air, Portal Sihir, Petir.**

Gunakan GLSL Perlin/Simplex Noise untuk membuat tekstur organik yang bergerak dinamis tanpa perlu file gambar tekstur luar:

```javascript
// Contoh Fragment Shader Noise Universal untuk Api / Energi
const proceduralNoiseShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorBase: { value: new THREE.Color(0xff4500) }, // Warna utama (Orange/Merah Api)
    uColorCore: { value: new THREE.Color(0xffd700) }  // Warna Inti Panas (Kuning)
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorCore;
    varying vec2 vUv;

    // Simplex Noise Function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ; m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // Noise mengalir ke atas seiring waktu
      vec2 noiseCoord = vUv * 3.0 + vec2(0.0, -uTime * 2.0);
      float noiseVal = snoise(noiseCoord);
      
      // Masking dari bawah ke atas agar menguncup di ujung
      float alphaMask = (1.0 - vUv.y) * smoothstep(0.0, 0.3, vUv.y);
      float intensity = clamp(noiseVal + alphaMask, 0.0, 1.0);

      vec3 finalColor = mix(uColorBase, uColorCore, intensity);
      gl_FragColor = vec4(finalColor * 1.5, intensity * alphaMask);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false
};
```

---

### 3. Mesh Geometry Ribbon & Waves (Geometri Bergerak)
Digunakan untuk: **Lidah Api Kerucut, Tebasan Pedang (Slash Arc), Trail Proyektil.**

AI membentuk geometri (seperti `ConeGeometry` atau `RibbonMesh`) dan menepis atau memutar verteksnya secara dinamis:
- Contoh: Lidah api utama terbuat dari `ConeGeometry(0.4, 1.5, 8)` dengan material Shader Noise di atas.

---

### 4. Dynamic Light Flickering (Lampu Interaktif Berkedip)
Digunakan untuk: **Cahaya Api Unggun, Ledakan, Kilatan Petir.**

Cahaya VFX wajib berkedip secara acak menggunakan fungsi Sine + Random:

```javascript
function updateFlickeringLight(pointLight, baseIntensity = 3.0, time) {
  // Kombinasi sinewave dan random noise untuk efek kedipan api alami
  const flicker = Math.sin(time * 12.0) * 0.3 + (Math.random() - 0.5) * 0.4;
  pointLight.intensity = Math.max(0.5, baseIntensity + flicker);
}
```

---

## 🍳 Resep Racikan VFX (Bagaimana AI Mengolah Fondasi Ini)

Setiap kali diminta membuat objek VFX tertentu, **AI WAJIB mengombinasikan blok-blok di atas**:

### 📦 Contoh 1: Membuat Api Unggun (Campfire VFX)
AI merakit 4 komponen menjadi 1 `THREE.Group`:
1. **Kayu Bakar (Mesh):** 3-4 log kayu (`CylinderGeometry`) bersilang di bawah.
2. **Batu Api Ring:** Lingkaran batu kecil mengelilingi kayu.
3. **Lidah Api Utama (Shader Noise Cone):** `ConeGeometry` dengan `proceduralNoiseShader` (Warna Orange-Kuning).
4. **Partikel Percikan Api (Sparks Emitter):** Partikel kecil naik cepat berkerlap-kerlip (`AdditiveBlending`).
5. **Partikel Asap Tipis (Smoke Emitter):** Partikel abu-abu naik perlahan dan membesar.
6. **Cahaya Kedip Api:** `THREE.PointLight(0xff7700)` dengan fungsi `updateFlickeringLight()`.

### 📦 Contoh 2: Membuat Sihir Es / Es Magic Spire
AI merakit:
1. **Kristal Es Utama:** `OctahedronGeometry` lancip dengan `MeshPhysicalMaterial` (`roughness: 0.1`, `transmission: 0.9`, `clearcoat: 1.0`).
2. **Partikel Emisi Salju/Kabut:** Partikel putih cyan memutar lambat di sekitar kristal.
3. **Cahaya Biru Cold Glow:** `THREE.PointLight(0x00ffff, 2)`.

### 📦 Contoh 3: Membuat Tebasan Pedang (Sword Slash)
AI merakit:
1. **Arc Mesh:** `RingGeometry` terpotong (setengah lingkaran).
2. **Shader Gradient Trail:** Gradient dari putih ke biru cyan transparan.
3. **Sparks Burst:** Partikel percikan meledak di ujung tebasan.

---

## ♻️ Manajemen Daur Hidup VFX (Spawning, Update, Cleanup)

Selalu sertakan method `update(dt, time)` dan `dispose()` pada setiap objek VFX yang dibuat:

```javascript
class CustomVFXEffect {
  constructor() {
    this.group = new THREE.Group();
    // Inisialisasi komponen VFX...
  }

  update(deltaTime, elapsedTime) {
    // 1. Update shader uTime
    // 2. Update particle positions
    // 3. Update flickering lights
  }

  dispose() {
    // Hapus semua mesh, geometry, dan material dari memori WebGL
  }
}
```
