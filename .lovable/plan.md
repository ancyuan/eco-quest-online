# Rencana Pengembangan: Interaksi Antar Pemain — Forest Guardian

Tujuan: memperluas dimensi sosial game dari fitur dasar yang sudah ada (friends list, visit forest, wild garden 20×20, friend gift/water) menjadi ekosistem multiplayer yang hidup — kooperatif, kompetitif ringan, dan komunal — tanpa merusak loop single-player yang sudah stabil.

Prinsip:
- **Additive, bukan disruptif** — semua fitur baru opsional. Pemain solo tetap bisa main penuh.
- **Server-authoritative** — semua aksi yang mempengaruhi pemain lain divalidasi via RLS / server functions, bukan client-side.
- **Realtime-first** — gunakan Supabase Realtime channel yang sudah terpasang (`wild-changes`, `friendships-changes`) untuk update instan.
- **Ramah anti-toxic** — opt-in untuk semua interaksi PvP-style, daily caps untuk gifting/sabotage, no chat bebas (hanya emote/preset).

Status saat ini (yang sudah ada):
- `friendships` table + halaman `/friends` (add/accept/remove)
- `friend_actions` table + daily caps untuk gift (5💧) & water (10×/hari)
- `/forest/$username` visit read-only (2D & 3D)
- `wild_garden` 20×20 shared grid dengan opt-in
- `profiles` punya leaderboard fields (`oxygen`, `trees_saved`, `xp`, `level`)
- `/leaderboard` route

---

## Fase S-1 — Visit Interaktif & Co-op Care

Output: kunjungan ke hutan teman tidak lagi pasif. Pemain bisa membantu merawat hutan teman dan meninggalkan jejak.

Pekerjaan:
- **Help Defend Threat**: saat visit hutan teman yang sedang kena 🔥/🪓/🐛, tombol "Help Defend" muncul di tile. Berhasil = teman dapat notifikasi + visitor dapat XP kecil + acorn. Daily cap 5/hari per visitor, max 3 per teman per hari.
- **Water Friend's Tree**: kembangkan fitur water yang sudah ada — tile yang baru disiram dapat boost growth +20% sampai stage berikutnya. Visual: tile berkilau biru selama X menit.
- **Leave a Sign**: emote stiker (🌸 / 🍂 / ⭐ / 💚 — 8 preset) yang muncul di hutan teman selama 24 jam. Cap 1 per teman per hari.
- **Visit log**: teman lihat siapa yang berkunjung hari ini di pojok hutan ("3 friends visited today").

Tabel baru: `visit_log` (visitor_id, host_id, day, action_count) — untuk capping & display.

Definisi selesai: visit jadi 2-arah; ada insentif untuk berkunjung; host merasa "diperhatikan".

---

## Fase S-2 — Cooperative Quests & Guild/Grove

Output: pemain bisa membentuk kelompok kecil dan menyelesaikan quest bersama untuk reward yang lebih besar dari quest harian solo.

Pekerjaan:
- **Grove (mini-guild)**: max 8 member, dibuat oleh siapa saja (cost 50🌬️ O₂), nama + emoji icon. Tabel `groves` + `grove_members`.
- **Grove board**: shared chat-board sederhana (posting preset message + 1 free-text 80 char, moderated client-side). Tabel `grove_posts`.
- **Weekly Co-op Quest**: tiap Senin server-side cron generate 1 quest per grove (contoh: "Plant 100 sakura together", "Defend 50 threats di Wild Garden", "Harvest 500 O₂ kolektif"). Progress tracked real-time, reward dibagi rata.
- **Grove level**: total kontribusi member = grove XP. Level naik = unlock cosmetic emblem untuk profil member.

Tabel baru: `groves`, `grove_members`, `grove_posts`, `grove_quests`, `grove_quest_progress`.
Edge function: `weekly-grove-quest-generator` (pg_cron weekly).

Definisi selesai: pemain punya "rumah sosial"; ada alasan untuk login bareng teman; reward kolektif > solo.

---

## Fase S-3 — Trading & Gifting Lanjutan

Output: ekonomi antar pemain — pohon, seed, dan cosmetic bisa dipertukarkan.

Pekerjaan:
- **Seed Gifting**: kirim 1 seed (jenis pohon yang sudah unlock) ke teman, cost 10💧. Cap 3/hari ke teman berbeda. Penerima dapat di inbox.
- **Inbox sistem**: route `/inbox` — list gift pending, klik claim. Tabel `gifts` (sender_id, recipient_id, kind, payload_jsonb, status, created_at, claimed_at).
- **Trade request 1:1**: usulan tukar (2 seed ↔ 2 seed, atau seed ↔ acorn). Both sides confirm sebelum dieksekusi (atomic via RPC `execute_trade`). Cooldown 1 jam antar trade dengan teman yang sama.
- **Acorn marketplace (passive)**: listing publik 24h — "5 sakura seed seharga 30 acorn". Browse di `/market`. Anti-bot: cap 3 listing aktif per pemain.

Tabel baru: `gifts`, `trades`, `trade_offers`, `market_listings`.
Catatan keamanan: semua mutasi inventory via RPC `security definer` — RLS reject direct UPDATE pada `unlocked_trees` / `acorns` dari client.

Definisi selesai: ada gameplay loop "kumpulkan & tukar" yang melibatkan pemain lain.

---

## Fase S-4 — Kompetisi Sehat & Event Komunal

Output: ada momen high-energy berkala yang menyatukan semua pemain.

Pekerjaan:
- **Weekly Leaderboard tab**: split leaderboard global jadi tab All-Time / This Week / Friends. Reset Senin 00:00 UTC. Top 10 weekly dapat badge profil.
- **Seasonal Event** (4 minggu sekali): tema (e.g. "Sakura Bloom Festival" — semua sakura tumbuh 2× cepat & yield O₂ 1.5×). Spawn objektif komunal: "Komunitas tanam 10.000 sakura → unlock skin emas untuk semua".
  - Tabel `events` + `event_progress` (global counter).
  - Banner di header `/play` selama event aktif.
- **World Boss (opsional)**: wildfire raksasa di Wild Garden tiap Sabtu malam, butuh 50 pemain online untuk padamkan dalam 30 menit. Reward acorn besar.
- **Photo Mode share**: snapshot 3D forest jadi PNG (via three.js `gl.toDataURL`), share link publik `/snap/$id`. Tabel `forest_snapshots`.

Definisi selesai: ada "alasan untuk login Sabtu malam"; komunitas terasa hidup.

---

## Fase S-5 — Moderasi, Anti-Abuse & Polish

Output: sistem sosial tahan terhadap penyalahgunaan dan tetap menyenangkan.

Pekerjaan:
- **Block list**: blokir pemain → tidak bisa visit, gift, atau lihat di leaderboard friends. Tabel `blocks`.
- **Report**: lapor grove post / username / snapshot. Tabel `reports`. Auto-hide setelah 3 report unik (review manual via admin role).
- **Rate limiter global**: edge middleware — max 60 social-write actions per pemain per menit.
- **Admin role**: gunakan pattern `user_roles` + enum `app_role` (admin/moderator/user) sesuai best practice. Halaman `/admin/reports` (gated by `has_role`).
- **Privacy toggle**: profile bisa di-set "private" — hanya friends bisa visit, leaderboard tetap muncul tapi tanpa link.
- **Notifications center** (`/notifications`): konsolidasi semua event sosial (gift diterima, friend request, grove quest selesai, defended threat), badge counter di header.

Tabel baru: `blocks`, `reports`, `user_roles`, `notifications`.

Definisi selesai: pemain merasa aman; moderator punya tools; nothing falls through the cracks.

---

## Urutan rekomendasi eksekusi

| Prioritas | Fase | Estimasi |
|-----------|------|----------|
| Mulai dulu | **S-1** Visit interaktif & co-op care | 1 sesi |
| Berikutnya | **S-2** Grove + co-op weekly quest | 1-2 sesi |
| Mid-game | **S-3** Trading & gifting | 1-2 sesi |
| Endgame | **S-4** Kompetisi & event komunal | 1-2 sesi |
| Polish | **S-5** Moderasi & anti-abuse | 1 sesi |

---

## Catatan teknis (untuk implementasi nanti)

- **Realtime channels**: tambah channel per fitur — `notifications:${user.id}`, `grove:${grove_id}`, `event:global`.
- **Server functions**: gunakan pattern `createServerFn` + `requireSupabaseAuth` untuk semua aksi yang mengubah state pemain lain (defend, gift claim, trade execute). Jangan andalkan RLS saja untuk logika multi-tabel atomic.
- **RPC atomic**: trade & gift claim wajib `security definer` SQL function untuk mencegah race condition.
- **pg_cron**: dipakai untuk weekly leaderboard reset, weekly grove quest gen, seasonal event start/stop. Endpoint cron via `/api/public/cron/*` dengan signature verification.
- **Indexing**: tambah index pada `friend_actions(actor_id, day)`, `visit_log(host_id, day)`, `gifts(recipient_id, status)`, `notifications(user_id, read_at)`.
- **Tidak ada perubahan ke fitur 3D / single-player** — semua fase ini paralel dengan roadmap 3D-4 (long-tail) yang sudah selesai.

---

## Pertanyaan sebelum mulai

1. **PvP toleransi**: pertahankan Wild Garden uproot lawan, atau buang elemen sabotase sepenuhnya & fokus murni co-op?
2. **Chat**: tetap preset emote saja (aman), atau buka free-text di Grove board (butuh moderation lebih)?
3. **Mulai dari Fase S-1 sekarang**, atau gabungkan S-1 + S-2 jadi 1 batch besar?
