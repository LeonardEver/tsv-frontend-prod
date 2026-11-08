# Rewards visual redesign

The Rewards page follows the supplied reference with a scenic campsite rank banner, gold and silver shield medals, three summary tiles, the next rank, a five-rank roadmap and a horizontal achievement wall. Desktop uses three achievement columns, tablet uses two, and phones use one. The existing shared navigation remains in place. XP transactions remain available below the wall.

## Server data

The server chooses XP, current level, current title, remaining XP, streaks, earned achievements, unlock dates and individual achievement progress. Missing achievement progress is not rendered as a zero bar. Locked cards keep readable text and show an explicit lock and Not earned status.

The rank bar represents cumulative XP toward the next rank: total XP divided by total XP plus the remaining XP returned in the same response. For example, 225 XP and 75 remaining shows 225 / 300 XP. This is not a percentage within the current level's XP band. No local threshold curve or XP award formula is introduced. Maximum rank renders without an invented next level or denominator.

Roadmap titles are display metadata mirrored from `backend/src/modules/gamification/config.ts`: Novice, Prepared, Practitioner, Skilled, Expert, Master, Grandmaster, Legend, Mythic and Transcendent. The current title always comes from the API. The roadmap moves its five-rank window for advanced learners. The reference's alternative rank names are not substituted for the existing product names.

The wall completion bar is the earned count divided by the full achievement catalog returned by the API. It is hidden while the catalog is unavailable or empty.

## Artwork

Generated with the built-in image generation tool, then proportionally resized for local web assets:

- `src/assets/rewards-camp.jpg` (1920 x 640)
- `src/assets/rewards-badge-gold.png` (384 x 384, transparent)
- `src/assets/rewards-badge-silver.png` (384 x 384, transparent)
- `src/assets/rewards-stream.jpg` (1200 x 400)
- `src/assets/rewards-earned.jpg` (1200 x 400)

Exact prompts and original and final paths are recorded in [rewards-artwork-prompts.json](rewards-artwork-prompts.json). The PNG frames keep alpha transparency. Icons and level numbers are live interface elements layered inside the frames. Existing local forest, fire, navigation and mountain assets supply the remaining achievement scenes. Unknown achievement keys receive a neutral medal and landscape while retaining their API title and description.

## Review

With the Vite server running, `node scripts/review-home.mjs --rewards` captures the page with a seven-achievement fixture at reference desktop, standard desktop, wide desktop, light theme, tablet, phone and 320 px phone sizes. Screenshots are saved under `visual-review/rewards-atmosphere/`. QA output includes image loading and horizontal overflow. Review screenshots use fixture account data and results.
