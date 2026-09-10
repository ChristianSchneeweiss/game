type CombatantIdentity = { team: string; type?: unknown };
export type EncounterId =
  | "court"
  | "forest"
  | "crypt"
  | "ashen"
  | "storm"
  | "tides";
export type EncounterPresentation = {
  id: EncounterId;
  title: string;
  location: string;
};
const encounters: Record<EncounterId, EncounterPresentation> = {
  court: { id: "court", title: "The hollow court", location: "3D prototype" },
  forest: {
    id: "forest",
    title: "The verdant hollow",
    location: "Ancient woodland",
  },
  crypt: {
    id: "crypt",
    title: "Crypt of Forgotten Echoes",
    location: "Forgotten crypt",
  },
  ashen: { id: "ashen", title: "The cinder court", location: "Ashen trial" },
  storm: { id: "storm", title: "The stormbreak", location: "Storm trial" },
  tides: {
    id: "tides",
    title: "The drowned courtyard",
    location: "Tidal ruins",
  },
};
const enemyEncounters = new Map<string, EncounterId>([
  ...[
    "moss-covered-golem",
    "barkhide-shaman",
    "elder-treant",
    "hollowed-oakwarden",
  ].map((type) => [type, "forest"] as const),
  ...[
    "skeleton-grunt",
    "rotting-corpse",
    "wisp-of-regret",
    "ghoul-knight-ivern",
  ].map((type) => [type, "crypt"] as const),
  ...[
    "ashen-skeleton",
    "lurking-flame-wraith",
    "crypt-crawler",
    "emberbound-revenant",
  ].map((type) => [type, "ashen"] as const),
  ...[
    "storm-hatchling",
    "skybolt-wyvern",
    "sky-serpent",
    "thunder-drake",
    "thundermaw",
  ].map((type) => [type, "storm"] as const),
  ...[
    "fishfolk-scout",
    "fishfolk-shaman",
    "water-elemental",
    "commander-kelvaris",
  ].map((type) => [type, "tides"] as const),
]);
const bosses = new Map<string, EncounterPresentation>([
  [
    "hollowed-oakwarden",
    { ...encounters.forest, title: "Sanctum of the Oakwarden" },
  ],
  ["ghoul-knight-ivern", { ...encounters.crypt, title: "Ivern's vigil" }],
  [
    "emberbound-revenant",
    { ...encounters.ashen, title: "Throne of the Revenant" },
  ],
  ["thundermaw", { ...encounters.storm, title: "Thundermaw's aerie" }],
  [
    "commander-kelvaris",
    { ...encounters.tides, title: "Court of the Tidepiercer" },
  ],
]);

/** Roster identity chooses art, without claiming a dungeon or wave number. */
export function encounterFor(
  participants: CombatantIdentity[],
): EncounterPresentation {
  let encounter: EncounterId | undefined;
  let boss: EncounterPresentation | undefined;
  for (const entity of participants) {
    if (entity.team !== "TEAM_B") continue;
    const type = typeof entity.type === "string" ? entity.type : "";
    const next = enemyEncounters.get(type);
    if (!next || (encounter && next !== encounter)) return encounters.court;
    encounter = next;
    boss = bosses.get(type) ?? boss;
  }
  return boss ?? encounters[encounter ?? "court"];
}
