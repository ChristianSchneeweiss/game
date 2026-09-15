# Fantasy UI directions — prototype

**Decision to make:** Should Shards of Affinity use the Obsidian Sanctum (A) or the Illuminated Codex (B) as the basis of its custom component library?

**Current preference:** The user leans toward A and also likes B's spellbook character. The next iteration keeps A's shell and adds a leather-bound parchment spell library inside it.

Run from the repository root:

```sh
bun run dev:fantasy-ui
```

- [A — Obsidian Sanctum](http://127.0.0.1:3012/dev/fantasy-ui.html?variant=A): architectural navigation, dark stone and aged gold, cinematic expedition art.
- [B — Illuminated Codex](http://127.0.0.1:3012/dev/fantasy-ui.html?variant=B): a parchment journal, forest ink, illustrated map, facing-page composition.
- Add `&view=components` for the component workbench.
- [A with the spellbook](http://127.0.0.1:3012/dev/fantasy-ui.html?variant=A&view=spellbook): search and filter inscriptions, inspect spells, turn pages, and bookmark entries using sample data.
- Use the floating bar or left/right arrow keys to compare. Arrows remain available to text fields and dialogs.

This follows the existing `dev/*.html` preview convention. It is a full-shell design comparison with illustrative data. It mounts only in development and is not an entry point in the production build. No authentication, backend mutations, or persistence are involved.

## Component concepts

`primitives.tsx` contains framed buttons, panels, meters, spell slots, tier markers, character seals, stat groups, and the crest. `screens.tsx` composes two distinct layouts. `workbench.tsx` shows control states, searchable spell slots, empty states, palette, and dialog entry points. Dialogs use Radix for focus trapping and Escape dismissal, with custom visual styling.

`spellbook.tsx` adds the `BookSpread` component and a spell library using it, with a catalogue on one page and the selected inscription on the facing page. Small screens stack the pages with a horizontal binding. This treatment is also linked from the component workbench.

All displayed character stats, spell values, expedition details, and account counts are sample data for evaluating the design. Existing spell icons are reused. The map and crest are original SVGs authored for this preview.

## Artwork

### Captured visual references

- [A — Obsidian Sanctum](reference/obsidian-sanctum.png)
- [B — Illuminated Codex](reference/illuminated-codex.png)
- [A with the proposed spellbook treatment](reference/combined-spellbook.png)

These capture the original comparison and the follow-up experiment. The owner leans toward A; the combined spellbook remains a proposed collection treatment. The source and screenshots are retained together for the redesign implementation handoff.

### Generated dungeon illustration

`../../public/art/fantasy-ui-prototype/hollow-sanctuary.png` was generated using the built-in image generation tool. Original prompt:

> Use case: stylized-concept. Create one original wide landscape illustration for a dark high-fantasy dungeon RPG interface, approximately 3:2 composition. An ancient ruined abbey deep within an enormous mossy forest, arched gothic doorway glowing softly with pale turquoise magical light in the center-right, stone path and weathered steps in foreground, gnarled branches framing the top, distant mist. Moody sophisticated painterly game concept art, detailed atmospheric oil painting, subdued near-black forest greens, smoky teal light, muted antique gold highlights. Strong legible central silhouette, cinematic scale. Upper left and lower left should be darker and quieter for HTML interface text overlaid later. No characters, no writing, no text, no UI, no border, no logos, no collage. Rich material detail, art-directed fantasy adventure.

## Status

Exploring the A-led direction with B's spellbook treatment. This is a visual prototype, not a completed migration of the application UI. Use the settled direction to design the production library and migrate the real screens.
