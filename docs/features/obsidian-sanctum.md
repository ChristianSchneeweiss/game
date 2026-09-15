# Obsidian Sanctum UI

Implementation of [issue #5](https://github.com/ChristianSchneeweiss/game/issues/5).
The A prototype at `62c41485671192e16737678f1244e415d585886a` is the art-direction reference.
Production components use live route data; prototype data and its review switcher stay in development.

## Migration inventory

| Routes                                                                     | States and compatibility requirements                                                                                                       | Presentation owners                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `/`, `/connect`, root errors                                               | Signed in/out, active battle links, account entry, loading, recovery, navigation, loot and invitations                                      | Header, RPG primitives, Home                |
| `/characters`, `/characters/$character-id`                                 | Empty/populated roster, create, rename, attributes, spell/passive/equipment tabs, equip/unequip, pending/error                              | Character routes and card                   |
| `/spells`, `/items`, `/loot`                                               | Owned collections, inspection, empty/loading, reward claims                                                                                 | Collection routes and expedition components |
| `/library`                                                                 | All four categories, search, group/tier/Might/sort, URL history, selected details, comparison families, zero/unrated, invalid/empty filters | Controlled LibraryPage                      |
| `/dungeons`, `/dungeons/prepare`, `/dungeons/$id`, `/dungeons/company/$id` | Catalogue, solo/shared preparation, ownership, host actions, readiness, waiting/reconnection, path choice, abandon/complete                 | Expedition and social components            |
| `/battle/$id`, `/battle/finished/$id`                                      | Cards/3D, selection versus Cast, inspected actors, resources/effects, feedback/chat, recovery, results and read-only replay                 | Existing battle presentation                |
| `/friends`, `/invitations`                                                 | Friend code, request/accept/remove, invitation response, empty/error/pending                                                                | Social routes                               |

## Baseline

- Application baseline: `75245e39f398bf48a3bff72f66d36e85647c0820` (main at task start).
- Pre-existing local changes: root prototype script, `dev/fantasy-ui*`, `public/art/`; retained.
- Complete type check passes with the four documented protected historical diagnostics.
- Initial release command was blocked by the shell's Bun 1.4.2; project requires Bun 1.4.0. Use the pinned toolchain for qualification.
- Representative pre-migration shell/Library captures: `/tmp/issue5-before-library-{390,1440}.png`.

## Component system

- `src/styles/tokens.css` owns surfaces, ivory text, gold framing, affinity/resource/status colors, typography, focus and motion. `src/styles/primitives.css` owns the shared visual rules. Body copy uses Spectral; headings use Cinzel, both with serif fallbacks and `font-display: swap`.
- `Button` supplies primary, secondary, outline, ghost, destructive and link variants, icon sizing, native disabled behavior and `pending`. Older `relic`, `ghostRelic` and `spell` names map to these same rules for compatibility. Actions supplied as links retain their real destinations.
- `RpgPanel`, `RpgInset`, `RpgHero`, `RpgSectionHeading`, `RpgStatTile`, `RpgMeter` and `RpgEmptyState` supply shared game presentation. Meters retain numeric text and labeled ARIA values; affinities retain their own semantic colors.
- Input, native Select, Status and Feedback provide field, validation and announced state presentation. Radix manages Tabs, Dialog, AlertDialog, menu, hover/tooltip and Sheet behavior. Character tabs support arrow keys and connect the selected tab to its panel.
- The application uses the [shadcn Radix Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar), including its collapsible desktop rail and mobile Sheet. Its source is application-owned and styled by `header.css`. The mobile drawer restores focus to the toolbar toggle. The shortcut ignores typing in form fields. Upstream Sidebar, Sheet, Tooltip, Separator and mobile-hook source retain the MIT notice in `src/components/ui/SHADCN_LICENSE`.
- Domain/query/session decisions remain in their existing routes and features. Shared components receive values, capabilities and callbacks. Battle targeting, actor inspection, Cast, movement, readiness, consent and replay rules use the existing hooks and server contracts.

The sanctuary illustration is a decorative copy of the existing prototype asset (`public/art/fantasy-ui-prototype/hollow-sanctuary.png` → `public/art/sanctuary.png`). Its original prompt/provenance remains in the prototype README. It is not a dungeon definition or a source of reward promises.

## Development workbench and route fixtures

Run `bun run dev:sanctum`, then open:

- `http://127.0.0.1:3015/dev/sanctum.html#/` — actual production route tree.
- `http://127.0.0.1:3015/dev/sanctum.html?view=components` — actual shared components, including pending/disabled/selected controls, validation, meters, dialogs, confirmation, menus, loading and empty states.
- `http://127.0.0.1:3015/dev/sanctum.html?account=guest#/dungeons/company/company` — host/guest affordances.
- `http://127.0.0.1:3015/dev/sanctum.html?state=long#/characters/hero` — long names.
- `http://127.0.0.1:3015/dev/sanctum.html?state=collection#/spells` — 14 unique spells, 20 owned spell copies and seven copies of a passive skill.
- `http://127.0.0.1:3015/dev/sanctum.html?state=collection#/items` — eight equipment copies, including three equipped copies across two characters.

Fixture account options: `owner`, `guest`, `signed-out`. State options: `populated`, `empty`, `loading`, `error`, `mutation-error`, `long`, `collection`, `reconnecting`, `closed`, `completed`, `abandoned`.
Query options precede the hash; real route search parameters follow it (`#/library?q=fire`). Browser back/forward still uses the real router.

Only Vite **serve** with explicit **sanctum** mode substitutes Clerk and tRPC at their existing boundaries. Production builds cannot enable those aliases. Fixture data uses actual characters, spells, equipment and dungeon definitions. A local WebSocket boundary drives the real battle session hooks and battle manager; replay uses the existing `forest-showcase.json` recording. Neither boundary contacts an account, database or live server. It is behavioral and visual evidence for the UI, not an end-to-end authentication/network test.

The Sanctum and fantasy UI preview servers consume the checked-in route tree without regenerating it, and each Vite mode has its own dependency cache. The main dev server owns route generation; its route changes still update the previews. All dev servers require their requested port to be available. Starting another main server therefore fails instead of silently moving to a new port and creating competing route writers, which can cause continuous full-page reloads. Use the main dev server or a normal build to regenerate the tree when adding routes.

With `bun run dev:client`, `bun run dev:sanctum`, and `bun run dev:fantasy-ui` running, `node scripts/check-client-dev-reloads.mjs` checks that all three pages load once and receive no full reloads over 20 seconds. It accepts optional URLs and the same `PLAYWRIGHT_MODULE` / `CHROMIUM_PATH` overrides as the browser script below. A second `bun run dev:client` must exit with `Port 3001 is already in use`.

## Character screens

The roster uses compact cards with spell artwork, health/mana, core attributes, and unspent points. Name search filters the current collection; creation clears the filter so the new adventurer is visible. Both hover and keyboard focus prefetch character data.

The detail screen keeps a lazy-loaded, rotatable character model and current resources beside the Stats, Spells, and Equipment workspace. It reuses the existing equipment preview and its WebGL fallback. Attribute allocation can be reset before saving, and queued points survive tab changes. Successful build changes refresh the character, roster, and owned collections; renaming refreshes both character views. Available passive descriptions come from the game definitions.

Character-specific presentation lives under `routes/characters/-components` with scoped rules in `routes/characters/characters.css`. The visual checks cover 320, 390, 768, 1440, and 2560px; interaction checks cover search/create, rename, pending guards, queued/reset/applied points, keyboard tabs, spell/passive/equipment equip and unequip, long names, empty state, and mutation errors. The character redesign captures are in `/tmp/character-redesign`.

## Validation

### Owned spellbook follow-up

The owned spellbook uses a compact inventory and a parchment detail page, with Spells and Passive skills tabs. Tabs count unique types; the header and quantity marks retain total owned copies. Search matches names and effects. Sorting supports names, mana cost and owned quantity. Selecting a row changes the reading page; its Library link opens that exact skill. On phones the reading page is a Radix dialog that restores focus to the selected spell when closed. Development spell grants remain available inside the Development tools disclosure.

Presentation lives in `features/spellbook/owned-spellbook.tsx`, with the shared list/detail layout in `components/inventory-browser.tsx` and `styles/inventory.css`. The route retains its original queries, server descriptions, grouped IDs and mutation invalidation. The `collection` fixture includes duplicates to exercise counts and sorting. Browser verification covers 320, 390, 768, 1024, 1312 and 1440px, search/clear, zero mana, copy sorting, keyboard tabs, Library links, empty/loading states and mobile dialog focus. Screenshots use `spellbook-redesign-*` in the completion artifact directory below.

### Owned armoury follow-up

Items uses the same compact inventory, parchment detail page and phone dialog as the spellbook. All gear, Weapons and Armor tabs count individual owned copies. Search matches names and descriptions; status filters distinguish available and equipped copies. Sorting supports name, highest tier and available first. Each copy retains its item ID and equipped character link. Details show the game-defined slot, tier, description and attribute modifiers, plus links to the character loadout and exact Library entry.

Item presentation lives in `features/armoury/owned-armoury.tsx` and `armoury.css`; the route retains the original equipment query. The `collection` fixture covers duplicates and equipment on two characters. Browser checks cover search/clear, both status filters, sorting, keyboard slot tabs, character and Library links, empty/loading states, mobile dialog focus and six widths from 320 to 1440px. The shared spellbook was rechecked for selection, search, copy sorting, passive counts and mobile focus. Type checking and the production artifact gate pass; React Doctor reports the same 19 existing warnings, with none in the new inventory components. Screenshots use `items-redesign-*`; responsive measurements are in `items-responsive-checks.json` in the completion artifact directory below.

### Commands

Use Node 22.19.0 and Bun 1.4.0, as required by the repository.

```sh
bun run typecheck:all
bun run test:release
bun run build:client:verify
node scripts/check-sanctum-browser.mjs
git diff --check
```

The browser script uses an available `playwright` module and Chromium. Set `PLAYWRIGHT_MODULE` to its module path and `CHROMIUM_PATH` to an existing browser executable when using a bundled runtime; it does not install another browser framework in the app. `SANCTUM_URL` and `SANCTUM_OUTPUT` override the preview URL and artifact directory (default `/tmp/sanctum-browser`). `SANCTUM_FLOWS_ONLY=1` and `SANCTUM_STATES_ONLY=1` support focused reruns.

Historical evidence from the initial migration:

- All 15 main screen compositions checked at 320, 390, 768, 1024 and 1440 CSS pixels without page overflow. Representative desktop/mobile captures are written by the browser script. Comparisons and the tactical board retain bounded local scrolling.
- Player interactions cover account entry, mobile navigation and browser history; rename/pending/error feedback, attributes and equipment/spells; loot claims; friend requests and invitations; owner/guest readiness; explicit Cast and read-only replay. Empty, long, unavailable and reconnecting views use the same route components.
- The component workbench checks dialog focus containment/restoration and menu access. Motion uses the browser's reduced-motion setting; decoration remains optional for navigation.
- Complete type coverage: passes with exactly the four documented protected historical diagnostics.
- Release regression: **852 pass**, exactly the same **3 accepted historical failures** across 56 files as the baseline. Protected historical files remain byte-identical.
- Production build and artifact gate: passes. Private sentinels and development fixture identifiers are absent from production JavaScript.
- React Doctor, same 43 React source files: **79 → 86**. Remaining diagnostics are largely existing complexity; the meter uses an explicitly labeled ARIA meter to retain its custom rendering.

Baseline and initial treatment logs are under `/tmp/issue5-*`; the reusable browser script writes `results.json` and screenshots to its output directory. No deployment or API/schema migration is part of this change.

## Completion pass — September 15, 2026

The follow-up audit gaps are implemented in production components:

- Clerk uses `styles/clerk-appearance.ts` through the real provider. Account menus and profile panels share the dark surfaces, ivory text, gold controls and type system.
- Cards combat uses `SpellAction`, with readable names, a separate keyboard/touch inspection control, explicit preparation state, and an adaptive card grid. The shared native `Slider` styles both replay presentations while preserving keyboard controls. Cards no longer nest another page landmark inside the battle page.
- The dungeon summary uses three full-width label/value rows, keeping Battle, Active and Cleared readable at intermediate desktop widths.
- Owned spells, items and loot use `CollectionHeader`, `CollectionEntry` and `CollectionLoading`. `RewardEntry` provides the same game-defined names and artwork in loot and expedition rewards. Passive descriptions and spell targeting come from the game definitions. Equipment ownership, grouped counts, zero gold rolls and claim invalidation remain visible and functional.
- The Library combines the dark archive with a parchment reading panel. Search stays visible; secondary filters, preview attributes and the Might explanation use disclosures. Category counts, URL state, comparisons and selection still use the existing Library model.
- The component workbench includes long spell/collection names and enabled/disabled replay sliders. The spell primitive can shrink inside implicit grid tracks at phone widths.

Fresh verification for this pass:

- All 15 production fixture routes fit at **320, 390, 768, 1024, 1312 and 1440 CSS pixels**. Cards and the long-name component workbench also fit at 320px. Screenshots were inspected for readable labels and usable spacing.
- Library checks cover all four categories, search, empty search, tier filtering, an invalid Might range, clear filters, coherent details, mobile navigation and browser Back.
- Cards checks cover keyboard/click inspection, prepare, target selection and explicit Cast. Only Cast consumed mana. Recorded replay accepts ArrowRight, Home and End; preparation remains disabled.
- Reward checks cover every reward category, pending protection, success, recoverable failure and empty collections. Spell loading is announced. Dialog focus wraps, Escape restores its trigger, and the mobile drawer restores the navigation toggle.
- The **real signed-in Clerk menu and profile modal** were visually checked. **Real sign-in and registration forms were skipped at the user's request.** Fixture account dialogs do not establish real provider coverage.
- `typecheck:all`: passes with exactly the **4 protected historical diagnostics**.
- `test:release`: **861 pass**, exactly **3 accepted historical failures** across 57 files; all 34 protected historical files remain byte-identical. Existing regeneration cases retain their assertions and now have unique names that Bun 1.4.0's release verifier can identify.
- `build:client:verify` and `git diff --check`: pass.
- React Doctor: no errors. The tracked production scan has six existing warnings; the broader 97-file scan includes 19 warnings in existing production, development and test code. None point to the new shared components. The score service was unavailable, so no numeric score comparison is claimed.

Fresh screenshots, the 90 route/width measurements and interaction notes are in
`~/.codex/visualizations/2026/09/15/01a0a553-706d-74f1-a5c0-0a60be1ce042/`.
CLI logs use `/private/tmp/sanctum-finish-*`. Browser checks used the available in-app browser tool against the fixture route tree; the standalone browser script was not rerun in this pass. This is not live multiplayer or external authentication end-to-end coverage. No deployment was performed.
