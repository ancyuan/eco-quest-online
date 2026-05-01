
# Rencana Pengembangan 3D Low-Poly — Forest Guardian

Tujuan: ubah tampilan utama dari grid emoji 2D menjadi **forest 3D low-poly** yang ramah mobile, tetap mempertahankan seluruh gameplay loop (plant, grow, threat, harvest, ancient ritual, weather, companion, quest, social) yang sudah berjalan.

Prinsip:
- **Tidak menghapus 2D** — render 3D adalah lapisan visual baru di atas state yang sama (`tiles[]`, `weather`, dst). Toggle 2D/3D di settings.
- **Low-poly murni** — tanpa asset eksternal berat. Semua mesh dibuat prosedural (cone + cylinder + box) supaya bundle tetap kecil dan render cepat di HP.
- **Bertahap** — tiap fase punya output yang langsung playable, tidak ada "big bang rewrite".

Stack pilihan: **react-three-fiber + drei + three** (ekosistem React, deklaratif, mature di mobile). Bundle ~200KB gzip — acceptable untuk game.

---

## Fase 3D-1 — Fondasi Scene & Grid (Playable Skeleton)

Output: route `/play` punya tombol "Switch to 3D". Saat aktif, grid 2D diganti scene 3D yang menampilkan tile kosong + pohon yang sudah ditanam, dengan kamera orbit. Semua interaksi (plant, harvest) tetap jalan via klik tile 3D.

Pekerjaan:
- Install `three`, `@react-three/fiber`, `@react-three/drei`.
- `src/three/Scene.tsx` — Canvas + lighting (1 directional + ambient + hemisphere) + OrbitControls (terbatas, no roll, jarak min/max).
- `src/three/Ground.tsx` — plane low-poly dengan warna per biom (rainforest/savanna/taiga). Subdivide untuk vertex displacement ringan agar tidak flat.
- `src/three/Tile.tsx` — hex atau square tile (pakai square dulu, sesuai grid existing). Hover state = sedikit naik + outline. Click = panggil handler yang sama dengan versi 2D (`onTileClick(index)`).
- `src/three/trees/` — 1 file per spesies (Oak, Pine, Sakura, Maple, Mangrove, Bamboo, Cherry, Eucalyptus). Tiap pohon = composition cone/cylinder/sphere prosedural, parameterized by `stage` (seed = nub kecil, sapling = small cone, mature = full, ancient = full + glow).
- `src/three/Forest3D.tsx` — komponen utama yang menerima `tiles, gridSize, biomeZones` dan render array Tile + Tree.
- Toggle: tambah field `view3d: boolean` di `usePreferences`. Tombol di header `/play`.

Definisi selesai: bisa plant pohon di mode 3D, lihat stage berubah real-time, harvest dengan klik. Mode 2D masih default & tidak rusak.

---

## Fase 3D-2 — Animasi, Threat & Weather Visual

Output: dunia 3D terasa "hidup" — pohon tumbuh dengan animasi, ancaman muncul sebagai mesh 3D di atas tile, cuaca mengubah skybox & particle.

Pekerjaan:
- **Tree growth animation**: interpolasi scale & sway saat `stage` berubah (gunakan `useFrame` untuk subtle sway sin-wave; saat stage transition, lerp scale 0.3s).
- **Ancient glow**: pohon ancient diberi `emissiveIntensity` pulsing + ring partikel kecil di pangkal.
- **Threat visuals**:
  - 🔥 Fire = particle cone merah/orange di atas tile + tile berkedip.
  - 🪓 Logger = mesh kapak low-poly muncul, swing animation.
  - 🐛 Pest = beberapa kubus kecil bergerak di sekitar pohon.
  - Countdown ring (Torus) di sekitar tile menunjukkan `threatExpiresAt`.
- **Weather**:
  - ☀️ Cerah: skybox biru cerah, lighting hangat.
  - 🌧️ Hujan: particle rain (instanced lines), darken ambient, ripple di ground shader sederhana.
  - 🌫️ Kabut: `<Fog>` putih, jarak pendek.
  - 🌪️ Badai: fog gelap + rain + occasional lightning (flash directional intensity).
- **Companion 3D**: butterfly/owl/panda/deer sebagai mesh sederhana yang berkeliaran (random walk path) di atas grid. Reuse data dari `companions` state.

Definisi selesai: pemain bisa main full sesi di 3D dan secara visual semua event terlihat (plant, grow, threat spawn, defend, harvest, weather change, companion).

---

## Fase 3D-3 — Polish, Performa & Mobile

Output: 3D mode siap jadi default — frame rate stabil di HP mid-range, kontrol intuitif di touch.

Pekerjaan:
- **Instanced meshes**: pohon dengan stage sama di-render via `<Instances>` drei untuk hemat draw call (penting untuk grid 10×10 = 100 tile).
- **LOD sederhana**: ancient tree pakai mesh detail tinggi, mature pakai medium, sapling/seed pakai sprite billboard.
- **Mobile controls**:
  - Single tap = select/plant/harvest tile.
  - Two-finger drag = orbit kamera.
  - Pinch = zoom (clamp).
  - Disable `OrbitControls` damping di low-end device.
- **Adaptive quality**: deteksi `devicePixelRatio` & FPS via `PerformanceMonitor` drei. Auto-degrade: matikan rain particles, kurangi shadow map size, switch ke `flat` shading.
- **Loading state**: Suspense fallback dengan progress sederhana (canvas masih cold-start ~300ms).
- **A11y / fallback**: jika `navigator.gpu`/WebGL2 tidak tersedia atau Canvas error → auto-fallback ke 2D + toast "3D tidak tersedia di device ini".
- **Settings panel**: slider quality (Low/Med/High), toggle shadows, toggle particles.

Definisi selesai: tested di Chrome desktop + Safari iOS + Chrome Android mid-range, ≥30 FPS di grid 10×10.

---

## Fase 3D-4 — Konten Visual Lanjutan (Optional / Long-tail)

Hanya dikerjakan setelah 3D-1..3 stabil dan user feedback positif.

- **Day/Night cycle** sinkron dengan jam server (ground & sky lerp warna).
- **Skin pohon** (untuk Fase 7 cosmetic shop): variant material per skin (golden, neon, crystal) — tinggal swap material di komponen tree.
- **Visit forest teman dalam 3D**: route `/forest/$username` ikut switch ke 3D mode (read-only camera).
- **Wild Garden 3D**: grid 20×20 — perlu instancing agresif + frustum culling.
- **Confetti 3D**: ganti `<Confetti />` 2D dengan particle 3D saat unlock achievement / harvest besar.
- **Mini cinematic**: saat ancient ritual selesai, kamera auto-zoom + slow pan + glow sweep selama 2 detik.

---

## Catatan teknis (untuk implementasi nanti)

- **SSR**: R3F harus di-render client-only. Bungkus `<Forest3D>` dengan dynamic check `typeof window !== 'undefined'` atau gunakan `useEffect`-mounted state. Route file tetap SSR-able untuk SEO header.
- **Bundle splitting**: import three/r3f via `React.lazy` di dalam `/play` agar landing page tidak ikut menanggung 200KB.
- **State source of truth tetap `tiles[]` di play.tsx** — komponen 3D adalah pure renderer + emit events. Tidak ada duplikasi state, tidak ada konflik dengan logika quest/social yang sudah ada.
- **Tidak ada perubahan database / migration** yang diperlukan untuk seluruh roadmap 3D ini. Hanya satu kolom preference baru (`view3d`) yang disimpan lokal via `usePreferences` (sudah ada infrastrukturnya).
- **Dependency baru** (~tambahan ke `package.json`):
  - `three` (~150KB gz)
  - `@react-three/fiber` (~30KB gz)
  - `@react-three/drei` (tree-shakeable, ambil hanya `OrbitControls`, `Instances`, `PerformanceMonitor`, `Sky`, `Cloud`)

---

## Urutan rekomendasi eksekusi

| Prioritas | Fase | Estimasi scope |
|-----------|------|----------------|
| 🔥 Mulai dulu | **3D-1** Skeleton scene + tile + 8 species procedural | Batch besar, 1 sesi |
| 🔥 Berikutnya | **3D-2** Animasi + threat + weather visual | Batch besar, 1 sesi |
| 🟡 Setelah feedback | **3D-3** Performa + mobile + fallback | Batch sedang |
| 🟢 Long-tail | **3D-4** Day/night, skin, wild garden 3D | On-demand |

---

## Pertanyaan sebelum mulai

1. **Style art**: full low-poly geometric (cone/cube — paling cepat, "Monument Valley" vibe) **atau** soft low-poly (rounded edges, gradient — butuh lebih banyak vertex tapi lebih lembut)?
2. **Default view setelah 3D-3 selesai**: 3D jadi default, atau 2D tetap default & 3D opt-in?
3. **Kamera**: free-orbit (player bisa putar bebas) atau fixed isometric (lebih sederhana, lebih konsisten visual)?
4. **Mulai dari Fase 3D-1 sekarang**?
