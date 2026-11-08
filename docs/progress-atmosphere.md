# Progress expedition dashboard

Progress follows the supplied reference with a photographic welcome panorama, four illustrated statistics, a two-column desktop grid for regions, recent activity, expedition milestones and lesson performance. Phones use stacked panels, two-column statistics and a vertical milestone path. The mission inventory remains available in the expandable Mission Details section below the dashboard.

The revised scenic treatment uses four dedicated local photographs generated with the built-in image generation tool: `src/assets/progress-panorama.jpg` (1920 x 640), `src/assets/progress-expedition.jpg` (1440 x 480), `src/assets/progress-summit.jpg` (1200 x 400) and `src/assets/progress-ember.jpg` (1200 x 400). Exact prompts, original image paths and final asset paths are recorded in [progress-artwork-prompts.json](progress-artwork-prompts.json). Originals remain in the tool's generated-images directory.

The panorama lives in its own banner above the statistics, with a bounded image width, space for the complete hiker and a bottom fade. The completion ring stays inside that banner instead of overlapping the statistics. Statistics use bounded right-aligned scenic accents with a horizontal mask to blend the image edge into the card. The expedition landscape keeps prominent scenery at its bottom edge. Subtle topographic contours replace the repeated fire photos on the lesson cards.

Desktop uses a 13/11 column split for regions and activity, followed by two equal-width lower panels. The expedition panel has a compact 194 px minimum height and does not stretch when the neighboring lesson panel grows. Five reserved lesson columns keep a single result at card width. The lesson cards themselves link back to the lesson; titles, best score and attempt counts remain available to assistive technology and through the card tooltip. The continue action lives in the expedition heading.

## Lesson numbers and scores

Lesson 1, Lesson 2, etc. identify modules in the shared curriculum order, across regions, and remain stable when earlier lessons have no score. Cards show the lesson title, the server's best quiz score and attempt count, with a link back to that lesson. They replace the old objective-code list. Objective percentages are not renamed, averaged or presented as lesson scores. Real zero scores appear; null or unavailable scores do not become zero. Failed requests offer Retry. The first five scored lessons appear initially, with View all when more results exist.

## Expedition milestones

These are visual goals, not backend achievement awards or access restrictions. They reflect learning activity, three completed missions, one completed region, level two and a historical best streak of three days. Each goal is evaluated independently from server data, so a later goal can be achieved before an earlier one. The current goal is the first unfinished goal.

Regions retain category links and server completion counts. The region summary counts regions with at least one completion, rather than claiming to count all started regions. Recent activity initially displays six server events; View all expands only the available events. Missing module names use readable learning-session labels.

## Review

With the local Vite server running, use `node scripts/review-home.mjs --progress` to capture a 1600 x 900 reference viewport, desktop, wide desktop, light theme, tablet, phone and 320 px phone screenshots in `visual-review/progress-atmosphere/`. Add `--single-result` to reproduce the one-result layout in `visual-review/progress-atmosphere-single/`. The review script reports panel dimensions, card widths, image loading and horizontal overflow. Account data and learning results in these screenshots are fixtures.
