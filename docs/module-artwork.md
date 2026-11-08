# Module cards and artwork

The region catalog uses one responsive grid across all subcategories. It renders one column on phones, two from 640 px, three from 1280 px, and four from 1728 px. Subcategory labels remain on each card. Empty subcategories no longer produce headings or count as visible sections.

The 80 published modules listed in the content registry each have a distinct cover in `src/assets/modules/<module_id>.jpg`. `src/lib/module-visuals.ts` resolves covers by the canonical module ID. The same cover appears in category cards, dashboard recommendations, related missions, module details, lessons, guided missions, and quiz results. Region headers retain their region artwork. An unpublished or unknown module uses the existing neutral placeholder rather than borrowing an unrelated image.

## Image generation

The covers were generated with the built-in image generation tool, one independent generation per module. The exact shared prompt and all 80 module-specific scene descriptions are in [module-artwork.json](module-artwork.json). Substitute each scene into `{scene}` in `sharedPrompt` to obtain its full final prompt.

The originals remain in the tool's generated-image output directory. The application uses compressed JPEG copies at 960 pixels wide. `scripts/save-module-artwork.ps1` converts a JSON array of `{ id, path }` records into these local assets without overwriting existing covers.

These images are decorative covers. Lesson text remains the instructional source, including for medical, foraging, water treatment, and fire topics.

## Review

`e2e/category-grid.spec.ts` checks that cards from different subcategories sit side by side on desktop, stack on mobile, load distinct images, and preserve the same image when opening a module and its lesson. It also loads all 80 files and exports four review contact sheets.

`src/lib/module-visuals.test.ts` verifies complete artwork coverage and unique cover URLs for the published curriculum, plus the neutral state for unknown modules.

Screenshots: `visual-review/module-covers/`.
