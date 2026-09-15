# Skill and condition artwork, version 1

Created for Shards of Affinity on 2026-09-10 with OpenAI's built-in image generation tool. Each of the 39 active skills, 10 passives and 10 generic conditions was generated individually from a descriptive prompt. No third-party reference images were supplied.

The complete prompts are retained in `scripts/battle-icons.prompts.json` at the repository root. The direction is hand-painted fantasy emblems, a dark forest background, warm metal, strong silhouettes and no text. Runtime rendering supplies borders, state badges and accessible names.

Original PNGs were resized to 256 × 256 and encoded as WebP using `cwebp -resize 256 256 -q 86`. The generated composition and colors were retained. `build-report.json` records the original file basename and SHA-256, delivered asset SHA-256 and byte sizes. Full-resolution originals remain in the local image-generation output directory; the game ships only the prepared WebP assets.

An active condition uses its originating skill's artwork when the event history identifies it. Generic condition icons cover missing source metadata and future effect sources. Unknown skills and failed image requests fall back to `effect-passive.webp`.

Preview all assets at `/dev/skill-icons.html` on the local client server.

The 2026-09-15 content expansion copies six of these delivered assets byte for
byte under the new passive names. No new image generation or raster editing was
performed:

| Passive | Existing artwork |
| --- | --- |
| Predator's Focus | Keen Instincts |
| Fleet Footed | Fleetfoot Gambit |
| Arcane Barrier | Aegis Wall |
| Last Bastion | Iron Will |
| Merciful Light | Single Heal |
| Executioner | Final Verdict |

The build report records all 65 delivered files, with `reusedFrom` identifying
each copied source. Each passive retains its own visible and accessible name.
