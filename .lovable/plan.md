# 🌳 Forest Guardian — Eco RPG Web Game

A modern, minimal web game where players grow and protect a living forest. Plant seeds, watch trees mature, defend against threats, and climb a global leaderboard of forest guardians.

## 🎮 Core Gameplay (MVP)

**The Forest Grid** — a clean 6×6 grid that represents the player's forest plot. Each tile can hold a seed, sapling, or mature tree.

**Main loop (5-minute fun cycle):**
1. **Plant** — Spend Energy to plant seeds on empty tiles (3 tree types: Oak, Pine, Sakura)
2. **Grow** — Trees pass through stages: 🌱 seed → 🌿 sapling → 🌳 mature (real-time, ~30s per stage)
3. **Harvest** — Mature trees generate Oxygen points (the score) and refill Energy
4. **Defend** — Random threats appear on tiles (🔥 fire, 🪓 logger, 🐛 pest). Tap to neutralize within a time limit or lose the tree.

**Resources shown in a clean top bar:**
- 💧 Energy (regenerates over time + from harvests)
- 💨 Oxygen (lifetime score → leaderboard)
- 🌳 Trees Saved (counter)

## 🎨 Visual Style — Modern Flat & Minimal

- Soft palette: sage green, sky blue, warm cream, charcoal text
- Generous whitespace, rounded corners, subtle shadows
- Flat SVG/emoji-style tree icons with smooth grow animations
- Calm micro-interactions (gentle pulses, fade transitions)
- Mobile-first responsive layout — works one-handed on phone

## 🔐 Accounts & Cloud Save

- **Sign up / log in** with email + password and Google sign-in
- A **profile** stores: display name, total oxygen, trees saved, current forest state
- Forest state syncs to the cloud — log in from any device, your forest is there
- A simple **/auth** page and a **/profile** page

## 🏆 Global Leaderboard

- Public **/leaderboard** page showing top 50 guardians
- Columns: rank, display name, 💨 Oxygen, 🌳 Trees Saved
- Highlights the current player's row + shows their personal rank
- Updates live when scores change

## 📱 Pages & Navigation

1. **/** — Landing page: hero, "Start Playing" CTA, brief eco-mission, leaderboard preview
2. **/auth** — Sign up / log in (email + Google)
3. **/play** — The game itself (forest grid + HUD) — requires login
4. **/leaderboard** — Global rankings
5. **/profile** — Player stats, display name editing, sign out

## 🌱 Eco Education Touch

After every harvest, a small fact card pops up: *"A mature oak absorbs ~22kg of CO₂ per year."* Light, never preachy — keeps the eco-message alive without breaking flow.

## ✅ Out of scope (future versions)

Not in this MVP — flagged so we can add later: multiple forest biomes, daily challenges, friend invites, achievements/badges, sound effects, real-tree donation tie-in, mobile push notifications.

---

Ready when you are — hit **Implement plan** and I'll build it.