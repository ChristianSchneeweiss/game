import { recordShowcase } from "./support/record-showcase";

const originalLog = console.log;
console.log = () => {};
try {
  const results = [
    recordShowcase(
      "crypt",
      [
        "skeleton-grunt",
        "rotting-corpse",
        "wisp-of-regret",
        "ghoul-knight-ivern",
      ],
      [
        ["single-heal", "basic-attack"],
        ["stone-bark", "basic-attack"],
      ],
    ),
    recordShowcase(
      "ashen",
      [
        "ashen-skeleton",
        "lurking-flame-wraith",
        "crypt-crawler",
        "emberbound-revenant",
      ],
      [
        ["fireball", "single-heal", "basic-attack"],
        ["cinder-wisp", "stone-bark", "basic-attack"],
      ],
    ),
    recordShowcase(
      "storm",
      ["storm-hatchling", "sky-serpent", "thunder-drake", "thundermaw"],
      [
        ["lightning-surge", "single-heal", "basic-attack"],
        ["stone-bark", "basic-attack"],
      ],
    ),
    recordShowcase(
      "tides",
      [
        "fishfolk-scout",
        "fishfolk-shaman",
        "water-elemental",
        "commander-kelvaris",
      ],
      [
        ["aqua-wave", "single-heal", "basic-attack"],
        ["ocean-blessing", "basic-attack"],
      ],
    ),
  ];
  results.forEach((result) => originalLog(result));
} finally {
  console.log = originalLog;
}
