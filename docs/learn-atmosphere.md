# Learn scenery and experience selector

Learn uses a mountain panorama behind its overview and a misty forest behind its region grid. Translucent summary tiles and category-colored borders keep the scenic treatment close to the supplied reference. Counts, completion, recommendations and navigation retain their existing API data.

The region grid has one column on phones, two from 640 px and three from 1280 px. Light-theme scrims preserve text contrast. The PRO / SIMPLIFIED selector now lives in the application header beside XP and level, and no longer appears in the sidebar. Phones use a second header row for XP and the selector. Lesson section navigation uses the shared header-height variable to stay below the header.

Assets generated with the built-in image generation tool and compressed to local JPEG files:

- `src/assets/learn-panorama.jpg` (1920 x 640)
- `src/assets/learn-forest.jpg` (1536 x 1024)

The exact generation prompts are in [learn-atmosphere-prompts.json](learn-atmosphere-prompts.json). Generated PNG originals remain in the tool's default output directory. No API key was required.

With the local Vite server running, `node scripts/review-home.mjs --learn` captures desktop, wide desktop, light theme, tablet, mobile and 320 px mobile views in `visual-review/learn-atmosphere/`. These screenshots use API fixtures.
