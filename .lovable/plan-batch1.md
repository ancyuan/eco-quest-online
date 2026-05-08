# Batch Pertama "Luar Biasa" — Audio + Tree Memorial + Haiku/Recap

Tujuan: menaikkan skor pengalaman dari 7.2 → 8.5 dalam 1 batch dengan 3 fitur **emosional resonance** yang murah secara teknis tapi besar dampaknya pada attachment pemain.

Prinsip:
- **Additive & opsional** — tidak menyentuh core loop existing (plant/grow/defend/harvest).
- **Calm-first** — semua audio default low volume, semua text-gen tidak mengganggu gameplay.
- **Server-cheap** — haiku & recap pakai Lovable AI Gateway (gemini-2.5-flash-lite), batched.

---

## Fitur 1 — Audio Layer (Ambient + SFX)

**Mengapa penting:** Forest Guardian saat ini "bisu". Hutan tanpa suara adalah diorama, bukan tempat. Audio = 40% dari "feel".

### Scope
- **Ambient loop** per cuaca (sunny, rain, storm, snow) — 4 track, ~30-60s loop, crossfade 2s saat cuaca berubah. Sumber: bisa generate via ElevenLabs Music API atau pakai CC0 (freesound.org). Untuk batch ini: **generate 4 track via ElevenLabs** (one-shot, simpan ke `/public/audio/`).
- **SFX gameplay** — 6 sound: plant seed, water, harvest, threat-spawn (alert), threat-defended, level-up. Pre-generate via ElevenLabs Sound Effects.
- **Mixer settings**: 2 slider di Profile (Music 0-100%, SFX 0-100%) + global mute toggle. Persist di `profiles` (kolom `audio_music`, `audio_sfx`, `audio_muted`).
- **Web Audio context**: lazy-init pada interaksi pertama (browser policy), single `AudioContext` di `src/lib/audio.ts`.

### Server / DB
- Migration tambah 3 kolom ke `profiles`: `audio_music int default 60`, `audio_sfx int default 80`, `audio_muted bool default false`.
- Server route `src/routes/api/admin/generate-audio.ts` (admin-only, one-shot, tidak di-cron) untuk panggil ElevenLabs sekali → upload hasil ke storage bucket `audio` (public). Setelah file ada, route ini tidak dipakai lagi.

### Effort
- DB migration + preferences wiring: **20 menit**
- `src/lib/audio.ts` (AudioContext, mixer, ambient crossfade, SFX pool): **45 menit**
- Generate 4 ambient + 6 SFX via ElevenLabs (server route + manual trigger): **30 menit**
- Wire SFX ke `play.tsx` event (plant/water/harvest/threat/level-up): **20 menit**
- Mixer UI di `profile.tsx`: **15 menit**

**Total: ~2 jam 10 menit**

---

## Fitur 2 — Tree Naming & Memorial

**Mengapa penting:** mengubah pohon dari "asset" → "individual yang dimiliki & diingat". Pemain akan lebih hesitate untuk uproot, lebih emotional saat threat hampir membunuh tree, dan lebih bangga saat ancient.

### Scope
- **Naming**: saat pohon mencapai stage `mature`, modal one-time "Beri nama pohonmu?" — opsional, max 20 char, alfanumerik + spasi + emoji. Disimpan di `tile.name`.
- **Tree dossier**: klik pohon yang sudah dinamai → popover kecil "🌳 Aoi · planted 3d ago · survived 2 fires · produced 47 O₂".
  - Track minimal di `tile`: `name`, `birthAt`, `threatsSurvived` (counter), `o2Produced` (counter, tambahkan tiap harvest).
- **Memorial**: kalau pohon dengan nama mati (uproot karena threat unhandled), tile berubah jadi "🪦 In memory of Aoi · 5d 12h" selama 24 jam. Visual: stump + petals. Pemain dapat 5 acorn "remembrance" + ada di list `/profile` → "Memorial" tab (last 10).

### Server / DB
- Tidak ada tabel baru — semua di `forest_states.tiles` jsonb (sudah jsonb, schema fleksibel).
- Tabel kecil baru `tree_memorials (id, user_id, name, kind, lifespan_ms, died_at)` untuk arsip jangka panjang yang muncul di profile.
- Trigger di sisi client (di `play.tsx` saat threat membunuh tree bernama): insert ke `tree_memorials`, award acorn via existing profile update.

### Effort
- Migration `tree_memorials` + RLS: **10 menit**
- Naming modal saat mature + persist `name`/`birthAt`: **30 menit**
- Counter `threatsSurvived` + `o2Produced` di game logic: **20 menit**
- Tree dossier popover (3D + 2D): **30 menit**
- Memorial tile rendering + 24h decay: **25 menit**
- Memorial tab di `/profile`: **15 menit**

**Total: ~2 jam 10 menit**

---

## Fitur 3 — Daily Haiku & Weekly Recap (AI-generated)

**Mengapa penting:** ritual buka game tiap pagi yang **personal**, bukan generic. Pemain merasa hutannya "diperhatikan" oleh sesuatu yang lebih besar. Recap mingguan = nostalgia mini → retention boost.

### Scope
- **Daily Haiku**: tiap login pertama hari itu, banner di atas `/play` menampilkan haiku 3-baris (5-7-5) yang dipersonalisasi: cuaca hari ini + jenis pohon dominan di hutan pemain + 1 momen 24h terakhir (e.g. "you defended 3 fires"). Generated via Lovable AI (`gemini-2.5-flash-lite`, ~50 token, sangat murah).
  - Cache 1 haiku per user per hari di `daily_haikus(user_id, day, text, weather, context_jsonb)`.
- **Weekly Recap**: tiap Senin pagi (login pertama setelah Senin 00:00 UTC), modal sekali tampil: "Minggu lalu di hutanmu…" — generated paragraph (~80 kata) yang merangkum: trees planted, threats defended, top contribution, 1 milestone (e.g. "Aoi hit ancient stage"), + 1 line "harapan minggu ini".
  - Tabel `weekly_recaps(user_id, week_start, text, stats_jsonb)`.
  - Stats di-compute on-demand via SQL aggregation pada minggu sebelumnya (visit_log, friend_actions, forest_states snapshot diff — atau cukup tally counter di profile yang di-snapshot saat recap dibuat).

### Server / DB
- Migration: `daily_haikus`, `weekly_recaps`, kolom `profiles.last_haiku_day date`, `profiles.last_recap_week date`.
- Server functions (createServerFn, auth-protected):
  - `getOrCreateDailyHaiku()` — return haiku hari ini, generate jika belum ada (rate-limit: 1/user/day enforced by unique constraint).
  - `getOrCreateWeeklyRecap()` — return recap minggu ini, generate jika belum ada.
- Both panggil Lovable AI Gateway dengan prompt template + context user.

### Effort
- Migration 2 tabel + 2 kolom: **10 menit**
- Server fn `daily-haiku.functions.ts` + AI prompt: **30 menit**
- Server fn `weekly-recap.functions.ts` + stats aggregation + prompt: **45 menit**
- Banner haiku di `/play` (collapsible, dismissible): **20 menit**
- Modal weekly recap (auto-show Senin first-login): **25 menit**
- Tweak prompts untuk konsistensi tone (calm, gentle, second-person): **15 menit**

**Total: ~2 jam 25 menit**

---

## Total effort batch: ~6 jam 45 menit (≈ 2-3 sesi build)

## Urutan eksekusi rekomendasi

| Urutan | Fitur | Alasan |
|--------|-------|--------|
| **1** | **Audio Layer** | Foundation — sekali ada, semua fitur lain (haiku reveal, memorial, level-up) bisa pakai SFX-nya. Generate file dulu di awal supaya bisa dipakai paralel. |
| **2** | **Tree Naming & Memorial** | Pure-frontend + 1 tabel kecil. Tidak ada dependency ke AI. Bisa shipped independen kalau ada blocker di #3. |
| **3** | **Daily Haiku & Weekly Recap** | Paling banyak surface area (AI prompt iteration), tapi dampak emosional terbesar. Diakhirkan supaya audio + naming sudah ada → haiku bisa nyebut nama pohon ("Aoi listened to the rain today…") = chef's kiss. |

Dependency lintas-fitur yang penting:
- Haiku prompt builder boleh baca `tile.name` & `tile.threatsSurvived` (dari fitur #2) untuk konteks lebih kaya.
- Memorial event boleh trigger SFX gentle bell (dari fitur #1).
- Weekly recap boleh sebut nama-nama pohon yang lahir/mati minggu itu.

## Definisi selesai (DOD batch)

- [ ] Pemain mendengar ambient + SFX yang reaktif terhadap aksi mereka.
- [ ] Pemain bisa memberi nama pohon, melihat dossier-nya, dan punya tab Memorial di profile.
- [ ] Tiap hari pertama login: haiku banner muncul. Tiap Senin pertama login: recap modal muncul.
- [ ] Mixer audio bisa dimute total. Naming & haiku bisa di-skip. **Fitur tidak boleh memaksa.**
- [ ] Tidak ada regresi pada plant/grow/defend/harvest.

## Pertanyaan opsional sebelum mulai

1. **Audio sumber**: generate via ElevenLabs (cost ~$0.10 sekali, kualitas tinggi, butuh `ELEVENLABS_API_KEY`) atau pakai CC0 dari freesound.org (gratis, butuh download manual)?
2. **Haiku bahasa**: Bahasa Indonesia, English, atau follow `prefs.language` (belum ada — perlu kolom baru)?
3. **Memorial duration**: 24 jam cukup, atau permanen sampai pemain tile-nya replant?
