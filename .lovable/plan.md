# 🎮 Rencana Pengembangan Game — Forest Guardian RPG

Status: MVP + Fase 1 (Polish) + Fase 2 (8 spesies, biom zona, Ancient ritual, grid 10×10, achievements) sudah jalan. Rencana ini fokus murni pada **sisi game** — gameplay loop, progression, sosial, live-ops — bukan refactor teknis.

---

## 🎯 Fase 3 — Depth & Strategy (Memberi Pilihan Bermakna)

Tujuan: ubah dari "tap & wait" jadi "putuskan apa yang ditanam, kapan, di mana".

### 3.1 Cuaca dinamis per biom
- 4 cuaca: ☀️ Cerah, 🌧️ Hujan, 🌫️ Kabut, 🌪️ Badai. Berganti tiap 5 menit (server-driven, sama untuk semua pemain agar fair leaderboard).
- Efek: Hujan = +20% growth di Rainforest, Badai = ancaman 🪓 lebih sering, Cerah = +10% O₂ harvest, Kabut = pohon Ancient meditasi (feed gratis 1×).
- HUD nampilin cuaca aktif + countdown.

### 3.2 Ekosistem tetangga (synergy bonus)
- Pohon yang ditanam **adjacent** dengan species sejenis dapat +5% O₂ (max +20% dari 4 tetangga).
- Pohon **berbeda** adjacent → +3% growth speed (biodiversity bonus).
- Bikin penempatan jadi puzzle ringan.

### 3.3 Wildlife companions
- Setelah harvest 50 mature tree dari satu spesies, hewan companion muncul di forest (🦋 Sakura, 🦉 Oak, 🐼 Bamboo, 🦌 Maple, dst).
- Companion pasif: +1 energy regen, atau auto-defend 1 threat per 5 menit, atau spawn rate threat ↓.
- Maks 3 companion aktif dipilih pemain.

### 3.4 Skill tree Guardian (3 jalur, 5 node masing-masing)
- 🌱 **Cultivator**: growth +%, O₂ yield +%, biodiversity bonus 2×.
- 🛡️ **Protector**: threat window +, auto-defend free per menit, threat damage radius ↓.
- 💧 **Naturalist**: max energy +, regen +, feed cost ↓.
- Skill point dari level (XP dari semua aksi). Bisa respec pakai 50 🌰 Acorn.

**Output Fase 3**: 1 migration (`guardian_progress`, `companions`, `weather_state`), 2-3 batch UI.

---

## 🌲 Fase 4 — Konten Berulang (Daily Loop & Retention)

Tujuan: kasih alasan login tiap hari.

### 4.1 Daily quests (3 random per hari)
- Contoh: "Tanam 5 Sakura", "Defend 8 threat", "Harvest 200 O₂", "Feed 2 Ancient ritual", "Tanam di 3 biom berbeda".
- Reward: XP + 10-30 🌰 Acorn + chance rare seed.
- Reset 00:00 WIB, edge function cron.

### 4.2 Weekly challenge (1 besar)
- Misal: "Capai 5,000 O₂ minggu ini", "Grow 3 Ancient Tree", "Survive 50 threat tanpa kehilangan pohon".
- Reward besar: skin pohon spesial, badge, atau companion eksklusif.

### 4.3 Streak & login bonus
- Hari 1: 5 energy, Hari 3: 10 🌰, Hari 7: rare seed, Hari 14: companion, Hari 30: skin Ancient golden.
- Reset jika absen >2 hari.

### 4.4 Random events di forest
- Tiap ~15 menit, event muncul: 🌈 "Rainbow drop" (harvest semua mature dapet 2× O₂ untuk 60 detik), 🦗 "Locust swarm" (3 threat sekaligus tapi reward XP besar kalau survive), 🍄 "Mushroom bloom" (+1 tile growth gratis).

**Output Fase 4**: 1 migration (`daily_quests`, `weekly_challenges`, `streaks`, `events`), edge function cron.

---

## 🌍 Fase 5 — Sosial & Kompetisi

Tujuan: bikin pemain saling lihat, bantu, dan bersaing.

### 5.1 Friends & visit
- Add friend via username/wallet address.
- Visit forest teman (read-only) di `/forest/$username`.
- "Water" 1 pohon teman per hari → +5% growth boost untuk mereka, +5 XP buat kamu.
- "Gift" 5 energy ke teman per hari (cap 3 teman).

### 5.2 Guild "Eco-Communities"
- Bentuk/join guild (max 20 anggota).
- Total O₂ guild → leaderboard guild mingguan.
- Guild quest: "Kumpulkan 50,000 O₂ minggu ini" → reward distributed ke semua anggota.
- Guild chat realtime (Supabase Realtime).

### 5.3 Co-op events: World Tree
- Event komunitas global tiap 2 minggu: "Tanam 1 juta O₂ bareng" → unlock konten eksklusif untuk semua pemain.
- Progress bar global di landing page.

### 5.4 PvP ringan: Wild Garden
- Map netral terbuka: pemain bisa "tanam liar" di petak orang lain (musuh).
- Pemilik bisa cabut (cost 5 energy) atau biarkan tumbuh (dapet 50% O₂ saat harvest).
- Opt-in — toggle di profile.

### 5.5 Leaderboard expansion
- Filter: All-time / Weekly / Daily / Friends / Guild / Country.
- Kategori: Total O₂, Trees Saved, Ancient Trees, Streak terpanjang.

**Output Fase 5**: 3 migration besar, refactor leaderboard query.

---

## 🪙 Fase 6 — Web3 Layer (Pakai CORE Wallet yang Sudah Ada)

Tujuan: manfaatkan auth wallet untuk konten unik, **tanpa pay-to-win**.

### 6.1 Achievement NFT badges (ERC-1155 di CORE)
- 7 achievement existing → bisa di-mint sebagai NFT badge di CORE Mainnet.
- Gas: app pakai relayer (sponsored mint) atau user bayar sendiri (~$0.001 di CORE).
- Display di profile + link ke `scan.coredao.org`.
- Opsional — pemain non-wallet tetap punya badge off-chain.

### 6.2 Limited seasonal NFT trees
- Event spesial (Earth Day, Hari Lingkungan 5 Juni): NFT seed eksklusif yang hanya bisa diklaim saat event.
- Tanam → tumbuh jadi pohon unik dengan visual khusus (Golden Oak, Crystal Sakura, Phoenix Maple).
- Tradeable di marketplace CORE (di luar app).

### 6.3 Guild treasury on-chain
- Guild punya wallet multisig di CORE.
- Anggota bisa donasi 🌰 Acorn (off-chain) atau CORE token (on-chain) ke treasury.
- Treasury fund event guild eksklusif.

### 6.4 Real-impact tie-in
- Tiap 10,000 O₂ komunitas → app donasi $1 ke One Tree Planted via CORE token.
- Dashboard "Real trees planted: X" di landing.

**Output Fase 6**: smart contract ERC-1155 deploy, edge function `mint-badge`, integrasi viem write.

---

## 🎨 Fase 7 — Live Ops & Long-term

Tujuan: jaga game tetap segar setelah launch.

### 7.1 Seasonal events (kalender Indonesia + global)
- Hari Bumi (22 April), Hari Lingkungan Hidup (5 Juni), Hari Pohon (21 Nov), Tahun Baru.
- Tema: skin tile, ancaman tema (mis. polusi 🛢️ saat Hari Bumi), leaderboard event terpisah.

### 7.2 Cosmetic shop (Acorn 🌰, bukan duit asli)
- Skin tile (gurun, salju, neon, vintage).
- Skin pohon (golden oak, neon sakura, phoenix maple).
- Frame avatar, animated cursor saat plant/harvest.
- Acorn earned only — **no IAP**.

### 7.3 Prestige system
- Setelah Lv 50, bisa "Reincarnate" — reset level + grid, dapet permanent +5% O₂ multiplier (stackable max 5× = +25%).
- Untuk hardcore players, optional.

### 7.4 Endgame: Sanctuary mode
- Setelah unlock semua biom + grid 10×10 + 5 Ancient: unlock mode "Sanctuary" — grid 12×12 dengan tantangan harian khusus dan leaderboard terpisah.

---

## 📋 Urutan rekomendasi eksekusi

| Prioritas | Fase | Alasan |
|-----------|------|--------|
| 🔥 Tinggi | **Fase 3** (Cuaca + Synergy + Skill tree) | Memperkaya keputusan tiap sesi, langsung kerasa |
| 🔥 Tinggi | **Fase 4** (Daily quest + streak + events) | Retention day-2, day-7 — paling penting untuk game baru |
| 🟡 Sedang | **Fase 5** (Friends + Guild) | Setelah ada base pemain ≥50 |
| 🟢 Rendah | **Fase 6** (Web3 NFT) | Setelah loop inti adiktif, biar NFT punya makna |
| 🟢 Rendah | **Fase 7** (Live ops) | Ongoing setelah launch |

---

## ❓ Keputusan yang dibutuhkan sebelum mulai

1. **Mulai dari Fase 3 atau Fase 4?** (Saran: Fase 4 dulu — daily quest impact retention paling besar.)
2. **Skill tree**: respec gratis tiap minggu, atau costly (50 🌰 Acorn)?
3. **PvP Wild Garden (5.4)**: include atau skip? (Bisa kontroversial untuk game eco-friendly.)
4. **NFT badge gas**: app bayar (sponsored) atau user bayar?
5. **Bahasa konten quest/event**: Bahasa Indonesia, Inggris, atau bilingual?

Setelah disetujui, saya rekomendasikan mulai dari **Fase 4.1 + 4.3** (Daily quest + Streak) sebagai batch pertama — paling cepat impact, paling kecil scope.
