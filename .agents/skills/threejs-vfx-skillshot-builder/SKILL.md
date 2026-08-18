---
name: threejs-vfx-skillshot-builder
description: >-
  Panduan dan standar pembuatan Efek Visual (VFX), Indikator Serangan (Skillshot/AoE Indicator),
  dan Shaders berbasis Three.js & GLSL. Gunakan skill ini di Project Forecraft v0.0.2 untuk membuat
  sistem pengarah serangan (panah/lingkaran di tanah), efek proyektil, beam laser, aura sihir,
  serta optimasi performa VFX.
---

# Three.js VFX & Skillshot Indicator Skill for Project Forecraft v0.0.2

Skill ini memandu AI untuk mengimplementasikan **Indikator Pengarah Serangan (Skillshot/AoE)**, **Efek Visual (VFX Sihir/Senjata)**, dan **Optimasi Performa WebGL** di Three.js (terinspirasi dari proyek *LinearAbilityCastingThreeJS*).

---

## 🎯 1. Indikator Pengarah Serangan di Tanah (Targeting Indicators)

### A. Ground Raycasting (Mendeteksi Posisi Mouse di Tanah)
Gunakan `THREE.Raycaster` dan `THREE.Plane` horizontal (`y = 0`) untuk melacak posisi kursor mouse:

```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Bidang tanah y = 0
const targetPoint = new THREE.Vector3();

function updateMouseTarget(event, camera) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(groundPlane, targetPoint);
  return targetPoint; // Posisi x, y, z di tanah
}
```

### B. Line / Arrow Indicator (Indikator Panah Lurus)
Digunakan untuk skill tebasan, lemparan panah, atau tembakan laser.

```javascript
function createLineIndicator(length = 8, width = 1.5) {
  const group = new THREE.Group();

  // Mesh Panah Indikator di Tanah
  const geometry = new THREE.PlaneGeometry(width, length);
  geometry.rotateX(-Math.PI / 2); // Rebahkan ke tanah
  geometry.translate(0, 0.01, length / 2); // Shift pivot ke kaki karakter & sedikit di atas y=0

  const material = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const arrowMesh = new THREE.Mesh(geometry, material);
  group.add(arrowMesh);
  return group;
}

// Cara Mengarahkan Indikator ke Kursor Mouse
function rotateIndicatorToMouse(indicatorGroup, characterPos, mouseGroundPos) {
  indicatorGroup.position.copy(characterPos);
  const angle = Math.atan2(
    mouseGroundPos.x - characterPos.x,
    mouseGroundPos.z - characterPos.z
  );
  indicatorGroup.rotation.y = angle;
}
```

### C. AoE / Circle Indicator (Indikator Lingkaran Serangan Area)
Digunakan untuk ledakan, lemparan bom, atau sihir area.

```javascript
function createAoEIndicator(radius = 3) {
  const geometry = new THREE.RingGeometry(radius - 0.2, radius, 32);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshBasicMaterial({
    color: 0xff3300,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const circleMesh = new THREE.Mesh(geometry, material);
  circleMesh.position.y = 0.01; // Di atas tanah
  return circleMesh;
}
```

---

## ⚡ 2. Efek Visual (VFX) Laser & Proyektil Glowing

### A. Custom GLSL Shader untuk Sinar Laser / Beam Glowing
Gunakan `AdditiveBlending` agar efek energi terlihat bersinar dan menembus gelap:

```javascript
const beamShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00ffff) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      // Efek pendaran di tengah beam
      float glow = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.0);
      float alpha = glow * (0.8 + 0.2 * sin(uTime * 10.0));
      gl_FragColor = vec4(uColor * 1.5, alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
```

---

## 🚀 3. Optimasi Performa VFX (Anti-Lag & High FPS)

### A. Pre-Compilation Shaders (`compileAsync`)
Gagap (*stutter/lag*) pertama kali saat menggunakan skill disebabkan oleh kompilasi shader baru. Cegah dengan memanggil:

```javascript
// Pre-warm semua material VFX sebelum game dimulai
await renderer.compileAsync(scene, camera);
```

### B. Light Pooling (Daur Ulang Lampu Kilatan)
Jangan membuat `new THREE.PointLight()` setiap kali serangan ditembakkan. Buatlah **Light Pool**:

```javascript
class LightPool {
  constructor(scene, size = 5) {
    this.lights = [];
    for (let i = 0; i < size; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 10);
      light.visible = false;
      scene.add(light);
      this.lights.push(light);
    }
  }

  spawn(position, color, intensity = 5, durationMs = 300) {
    const light = this.lights.find(l => !l.visible) || this.lights[0];
    light.position.copy(position);
    light.color.set(color);
    light.intensity = intensity;
    light.visible = true;

    setTimeout(() => {
      light.visible = false;
    }, durationMs);
  }
}
```

### C. Pembersihan Memori (Memory Cleanup)
Saat efek proyektil atau ledakan selesai, **selalu** lakukan pembersihan geometri & material untuk mencegah *Memory Leak*:

```javascript
function removeVFX(mesh) {
  scene.remove(mesh);
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
}
```
