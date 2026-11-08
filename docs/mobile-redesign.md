# Mobile learning redesign

The dashboard shows the current region as a connected mission path, with one previous mission, the current mission, and the next four missions. The full region remains accessible from “Explore all missions”. Completion, streaks, quotas, and rewards come from the existing API.

Lesson, dashboard, and module quiz actions pass `startQuiz` in router state. The quiz starts only after its existing entitlement check, and draft recovery takes precedence over creating a new attempt. Direct quiz URLs retain the introduction and attempt history. Answer validation remains on final submission because the current API does not provide per-question grading.

Mobile quizzes have their own back and exit controls, a segmented progress bar, large answer targets, and a fixed action bar. The main application navigation is hidden during the quiz. The lesson section navigator appears after its title and image, and stays below the app header while scrolling.

## Background artwork

Asset: `src/assets/expedition-forest.jpg` (1024 × 1536, approximately 204 KB). Created with the built-in image generation tool, then saved as a compressed JPEG for the application. The original generated PNG is retained in the tool's default output directory.

Final prompt:

> Use case: photorealistic-natural. Asset type: portrait background photograph for a premium survival learning mobile application. Create a cinematic real wilderness landscape, tall dark pine trees framing left and right, distant rugged mountain valley in the lower half, a quiet warm amber sunset horizon behind the mountains, deep forest green and near-black charcoal shadows, atmospheric mist. Portrait 1024 x 1536 composition. The upper 45 percent is very dark almost black overcast sky and low contrast distant trees with generous empty negative space for app headings. Pine forest detail primarily around the outer edges and bottom third, open quiet center for a vertical mission trail overlay. Subtle natural realistic film texture, restrained warm glow, high-end outdoor editorial photography, inviting adventurous feeling. No text, no letters, no logos, no watermark, no interface, no phones, no frames, no equipment, no tents, no people. This is one seamless background asset, not a UI mockup.

Browser review images are saved in `visual-review/mobile-redesign/`. API responses in these screenshots are test fixtures.
