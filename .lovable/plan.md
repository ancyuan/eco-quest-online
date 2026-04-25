
# 🌳 Rencana Pengembangan — Forest Guardian RPG

Status saat ini: **MVP sudah jalan** (grid 6×6, plant/grow/harvest/defend, auth email + Google + CORE Wallet, leaderboard global, profile, cloud save). Roadmap di bawah memperluas MVP menjadi game eco-RPG yang dalam, sosial, dan Web3-native.

---

## 🎯 Fase 1 — Polish & Retention (Quick Wins)

Tujuan: bikin loop 5 menit lebih nikmat dan engaging tanpa nambah sistem besar.

### 1.1 Game feel & visual
- Animasi tanam / tumbuh / harvest yang lebih halus (scale + fade), confetti kecil saat harvest mature.
- Sound effects opsional (toggle di profile): plant pop, harvest chime, threat alarm, defend success.
- Day/night cycle ringan di background grid (gradient bertransisi tiap 2 menit) — pure CSS, no perf cost.
- Dark mode support untuk pemain malam.

### 1.2 Onboarding
- Tutorial 3-langkah pertama kali masuk `/play`: tanam pohon → tunggu tumbuh (skip ke 5 detik) → defend threat dummy.
- Tooltip kontekstual untuk Energy / Oxygen / Trees Saved di HUD.
- Tombol "Reset forest" di profile (soft reset stats opsional).

### 1.3 Anti-grind & QoL
- Auto-harvest opsional (toggle): pohon mature auto-harvest tiap 60 detik agar pemain pasif tetap dapat oxygen kecil.
- Notifikasi browser saat ada threat aktif (Web Notifications API, opt-in).
- Offline progress: saat user kembali, hitung tree growth & 1× threat decay sejak `last_tick`.

**Estimasi**: 1 batch implementasi, perubahan terbatas di `src/routes/play.tsx`, `src/lib/game.ts`, dan beberapa komponen UI baru.

---

## 🌲 Fase 2 — Progression, Ekonomi & Variasi Konten

Tujuan: kasih alasan main lebih dari 1 sesi. Ini fase paling besar.

### 2.1 Level & Guardian XP
- Tabel baru `public.guardian_progress` (user_id, level, xp, skill_points).
- XP didapat dari: harvest, defend, daily streak.
- Tiap level naik → +1 skill point.

### 2.2 Skill tree minimalis (3 jalur)
- 🌱 **Cultivator**: growth speed +%, oxygen yield +%.
- 🛡️ **Protector**: threat window lebih panjang, auto-defend pertama gratis tiap menit.
- 💧 **Naturalist**: max energy +, regen rate +.
- Maksimum ~5 node per jalur agar tetap MVP-flavored.

### 2.3 Tree species expansion
- Tambah Bamboo (cepat tumbuh, oxygen kecil), Mangrove (tahan threat), Redwood (lambat, oxygen besar).
- Beberapa species **terkunci** sampai unlocked via level / quest.
- Tabel `public.unlocked_species` (user_id, species).

### 2.4 Biome & grid expansion
- Biome kedua: **Coastal** (8×4 grid, fokus mangrove, threat khusus: oil spill 🛢️).
- Biome ketiga: **Mountain** (5×5, fokus pine/redwood, threat: avalanche ❄️).
- Tab di `/play` untuk switch biome. Tiap biome punya `forest_states` row tersendiri (refactor schema: composite key `user_id + biome`).

### 2.5 Daily quests & streak
- 3 quest harian random ("Tanam 5 sakura", "Defend 3 threat", "Harvest 100 oxygen").
- Streak counter di profile, bonus XP tiap 7 hari.
- Tabel `public.daily_quests` + edge function `rotate-quests` (cron via pg_cron) untuk reset 00:00 UTC.

### 2.6 Eco-fact deck yang berkembang
- Pisahkan fact ke tabel `public.eco_facts` (admin-managed) supaya bisa ditambah tanpa redeploy.
- Track `seen_facts` per user → prioritaskan fact baru.

**Estimasi**: 3-4 batch implementasi. Migration besar untuk `guardian_progress`, `unlocked_species`, refactor `forest_states` ke multi-biome.

---

## 🌍 Fase 3 — Sosial & Web3 Integration

Tujuan: manfaatkan auth CORE Wallet yang sudah ada untuk bikin lapisan sosial & on-chain.

### 3.1 Friends & co-op
- Tabel `public.friendships` (requester, addressee, status).
- Bisa lihat forest teman (read-only view di `/forest/$userId`).
- "Visit & water" — sekali per hari per teman, kasih +1 growth tick ke 1 pohon mereka.

### 3.2 Guild / Eco-community
- Tabel `public.guilds` + `public.guild_members`.
- Total oxygen guild → leaderboard guild mingguan.
- Guild chat sederhana (Realtime Postgres Changes) — opsional.

### 3.3 Achievements & badges (NFT-ready)
- Tabel `public.achievements` (key, label, criteria, rarity).
- Tabel `public.user_achievements` (user_id, achievement_id, unlocked_at, tx_hash nullable).
- Badge contoh: "First 1000 Oxygen", "Saved 50 trees", "30-day streak".

### 3.4 On-chain badges di CORE Blockchain (opsional, opt-in)
- Smart contract ERC-1155 sederhana di CORE testnet untuk mint badge.
- Edge function `mint-badge` pakai relayer wallet (gas dibayar app) atau user-paid (mereka sign sendiri).
- Display badge gallery di `/profile` dengan link ke `https://scan.coredao.org/token/...`.
- Tidak wajib — pemain non-wallet tetap dapat badge off-chain.

### 3.5 Leaderboard improvements
- Filter: All-time / Weekly / Friends / Guild.
- Materialized view `weekly_leaderboard` di Postgres, refresh tiap jam.

**Estimasi**: 4-5 batch. Yang on-chain perlu dependency `viem` write side + ABI baru + gas funding strategy yang harus didiskusikan dulu.

---

## 🚀 Fase 4 — Live Ops, Konten Berkala & Monetisasi Etis

Tujuan: jaga game tetap hidup setelah launch.

### 4.1 Seasonal events
- Event 2 minggu sekali: Earth Day, World Forest Day, Hari Lingkungan Hidup.
- Skin pohon spesial, threat tema, leaderboard event terpisah.
- Konfigurasi event di tabel `public.events` (start_at, end_at, config JSONB).

### 4.2 Cosmetics shop (non-pay-to-win)
- Mata uang in-game **Acorn 🌰** dari achievement & event (bukan microtransaction).
- Skin tile (ground texture), skin pohon (golden oak, neon sakura), border avatar.
- Tabel `public.cosmetics` + `public.user_cosmetics`.

### 4.3 Real-world impact tie-in
- Integrasi opsional dengan API tree-planting (Ecologi / Eden Reforestation / One Tree Planted).
- Tiap 10.000 oxygen game → 1 pohon nyata didonasikan (sponsor / opsi user top-up CORE).
- Dashboard "Real trees planted by community" di landing.

### 4.4 Admin & analytics
- Halaman `/admin` (role-gated via `user_roles` table) untuk:
  - Lihat metric DAU/WAU.
  - Tambah eco-fact baru.
  - Trigger event.
- Pakai Lovable AI untuk auto-generate eco-fact baru tiap minggu (review manual).

### 4.5 Polish teknis akhir
- PWA: installable, offline shell, ikon proper.
- SEO per route (sudah ada head meta, tinggal og:image per page).
- E2E happy-path test untuk plant→grow→harvest loop.

**Estimasi**: ongoing, 1 batch per fitur sesuai prioritas user.

---

## 📋 Urutan rekomendasi eksekusi

1. **Mulai dari Fase 1** — efek besar, effort kecil, langsung kerasa di preview.
2. **Pilih 1-2 item dari Fase 2** sebagai milestone berikutnya (saran: Level + Daily Quest dulu, sebelum biome tambahan).
3. **Fase 3 & 4** dijadwalkan setelah ada basis pemain — tidak prioritas sebelum loop inti benar-benar adiktif.

---

## ❓ Yang perlu keputusan sebelum mulai Fase 2+

- Apakah mau ada **monetisasi** sama sekali? (Roadmap di atas asumsinya cosmetics-only, no IAP nyata.)
- Untuk **on-chain badges (Fase 3.4)**: gas dibayar siapa — app (relayer) atau user?
- Apakah event seasonal mengikuti **kalender Indonesia** (Hari Lingkungan Hidup 5 Juni) atau global?
- Bahasa UI: **Inggris saja**, **Bahasa Indonesia saja**, atau **bilingual i18n**?

Setelah plan ini disetujui, saya akan langsung jalankan **Fase 1** sebagai batch kerja pertama, lalu kita evaluasi sebelum lanjut ke Fase 2.
