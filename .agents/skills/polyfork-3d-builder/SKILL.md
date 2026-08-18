---
name: polyfork-3d-builder
description: >-
  Panduan dan standar pembuatan model 3D Three.js presisi menggunakan aset Polyfork (polyfork.dev)
  dan teknik low-poly efisien. Gunakan skill ini di Project Forecraft v0.0.2 untuk membuat
  elemen 3D seperti vegetasi, lingkungan, bangunan, alat, dan dekorasi game.
---

# Polyfork 3D & Precision Builder Skill for Project Forecraft v0.0.2

Skill ini memandu AI untuk menghasilkan dan menyusun objek 3D low-poly yang presisi, efisien (1 Draw Call), dan proporsional untuk proyek game **Project Forecraft v0.0.2**.

---

## 📏 Aturan Skala & Grounding
1. **Skala Real-World:** Selalu gunakan `1 unit Three.js = 1 meter`.
2. **Ground Origin (`y = 0`):** Semua aset Polyfork diposisikan dengan titik tumpu tepat di `y = 0` dan terpusat di `x = 0, z = 0`. Tidak perlu kalkulasi tambahan untuk menempelkan objek ke tanah.
3. **Performa High-FPS:** Aset Polyfork hanya menggunakan 1 Draw Call per model (*flat-shaded vertex colors*), cocok untuk game web/mobile.

---

## 📦 Penggunaan Aset Polyfork via ES Module (CDN)

### 1. Import Map di Halaman Web (`index.html` / `Model.html`)
Pastikan tag `<script type="importmap">` berikut ada di bagian `<head>`:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.180.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.180.0/examples/jsm/"
  }
}
</script>
```

### 2. Memuat Aset Secara Langsung
Model Polyfork mengembalikan objek `THREE.Group` secara langsung dan sinkron tanpa butuh loader async:

```javascript
import { createAsset as createOakTree } from 'https://polyfork.dev/cdn/broadleaf-oak-997c22.mjs';
import { createAsset as createBoulder } from 'https://polyfork.dev/cdn/large-boulder-a2cab1.mjs';
import { createAsset as createBench } from 'https://polyfork.dev/cdn/wooden-bench-661da4.mjs';

// Buat Pohon
const oakTree = createOakTree();
oakTree.position.set(0, 0, 0);
scene.add(oakTree);

// Buat Batu Besar
const boulder = createBoulder();
boulder.position.set(3, 0, -2);
scene.add(boulder);

// Buat Bangku Kayu
const bench = createBench();
bench.position.set(-2, 0, 1);
scene.add(bench);
```

---

## 🗂️ Daftar ID Aset Gratis Polyfork Paling Berguna
Gunakan ID berikut langsung pada URL `https://polyfork.dev/cdn/{id}.mjs`:

### 🌲 Hutan, Tanaman & Alam (Forest & Nature)
- Pohon Oak: `broadleaf-oak-997c22`
- Pohon Pinus Tinggi: `tall-pine-tree-ab4108`
- Pinus Muda: `young-pine-0d7695`
- Tunggul Pohon: `tree-stump-00f3bf` / `tree-stump-8c0513`
- Batang Kayu Tumbang: `fallen-log-1685fb`
- Batu Besar: `large-boulder-a2cab1` / `field-rock-5e37c6`
- Batu Sedang/Kecil: `medium-rock-e08405`, `small-rock-db33a7`
- Rumput/Semak: `grass-tuft-a40a08`, `bush-8bb596`, `cattail-reed-6abbb3`
- Bunga Liar: `wildflower-68d3a1`
- Jamur: `mushroom-679e55`

### 🏕️ Peralatan & Survival (Tools & Prop)
- Pedang: `sword-11907e`
- Palu: `hammer-fa3e51`
- Obeng: `screwdriver-284fac`
- Kotak Harta: `treasure-chest-58da92`
- Lentera Hutan: `lantern-post-f47665`
- Papan Petunjuk Jalan: `trail-signpost-bd29a7` / `signpost-ed3d77`
- Pagar Kayu: `wooden-fence-section-5f04b7`, `wooden-fence-gate-a8735f`
- Jembatan Kayu: `log-plank-bridge-a5f74f`
- Karung Aset: `cargo-sack-3cd3ab` / `grain-sack-401d96`

---

## 🕹️ Animasi & Manipulasi Pivot
Objek dengan bagian yang dapat bergerak (roda, pintu, engsel) memiliki nama *child group* tersendiri:

```javascript
const gate = createGateAsset();
scene.add(gate);

// Contoh memutar atau menggerakkan bagian spesifik
const doorNode = gate.getObjectByName('door');
if (doorNode) {
  doorNode.rotation.y = Math.PI / 4; // Buka pintu 45 derajat
}
```

---

## 🏗️ Aturan Pembuatan Objek Prosedural Tambahan (Jika Tidak Pakai Polyfork CDN)
Jika objek harus dibuat secara murni dengan kode (tanpa CDN Polyfork):
1. **Gunakan `THREE.Group`** untuk mengelompokkan sub-komponen.
2. Gunakan `ExtrudeGeometry` atau `LatheGeometry` untuk bentuk organik yang melengkung.
3. Selalu tambahkan **beveling** tipis agar tepi objek menangkap cahaya dengan alami.
4. Gunakan `THREE.MeshStandardMaterial` dengan `roughness` (0.3 - 0.7) dan `metalness` yang realistis.
