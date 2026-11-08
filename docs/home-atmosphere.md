# Base Camp scenery

The home dashboard uses a panoramic sunset behind its welcome area and daily-use cards, plus a campsite behind the expedition history. Translucent surfaces, amber accents and module-specific artwork carry the reference through the page. Backgrounds stay decorative: recommendations, history, XP, quotas, plans and completion all retain their existing server data.

At desktop widths, the three daily cards share one row. Tablet widths use two daily-use cards and a full-width plan card. The existing mobile mission path remains the phone layout. The light theme uses lighter scrims to preserve dark-text contrast.

Assets, generated with the built-in image generation tool and compressed to local 1920 × 640 JPEG files:

- `src/assets/base-camp-welcome.jpg`
- `src/assets/base-camp-expedition.jpg`

The exact final prompts are in [home-atmosphere-prompts.json](home-atmosphere-prompts.json). Generated PNG originals remain in the tool's default output directory.

Run `node scripts/review-home.mjs` with the local Vite server running to capture desktop, wide desktop, light theme, tablet and mobile views. These screenshots use API fixtures, including the daily counts and account identity, and are saved in `visual-review/home-atmosphere/`.
