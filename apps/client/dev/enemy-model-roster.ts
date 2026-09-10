export const enemyModelRoster = [
  {
    id: "goblin",
    name: "Goblin",
    family: "Dungeon",
    file: "Big-Orc.glb",
    notes:
      "Animated green biped with a spiked club. Slim its proportions and adjust its crest for the goblin silhouette.",
  },
  {
    id: "skeleton-grunt",
    name: "Skeleton Grunt",
    family: "Dungeon",
    file: "Skeleton_Minion.glb",
    notes:
      "Direct skeleton base. Add a simple weapon; retain the plain skull and modest silhouette.",
  },
  {
    id: "rotting-corpse",
    name: "Rotting Corpse",
    family: "Dungeon",
    file: "Zombie.glb",
    notes:
      "Animated zombie with bite, idle and walk. Modern clothes need a dungeon treatment; hit and death motions still need authoring.",
  },
  {
    id: "wisp-of-regret",
    name: "Wisp of Regret",
    family: "Dungeon",
    file: "Flying-Ghost.glb",
    notes:
      "Floating ghost base with idle, attack, hit and death. Use pale spectral materials and a smaller scale.",
  },
  {
    id: "ghoul-knight-ivern",
    name: "Ghoul Knight Ivern",
    family: "Dungeon · Boss",
    file: "Skeleton_Warrior.glb",
    notes:
      "Armored undead base with combat and casting clips. Add a battered sword, shield, and Ivern's distinctive crest.",
  },
  {
    id: "emberbound-revenant",
    name: "Emberbound Revenant",
    family: "Firelands · Boss",
    file: "Skeleton_Mage.glb",
    notes:
      "Undead caster base. Charred robes, glowing fissures and chain accessories will distinguish the revenant.",
  },
  {
    id: "ashen-skeleton",
    name: "Ashen Skeleton",
    family: "Firelands",
    file: "Skeleton_Minion.glb",
    notes:
      "Shares the grunt rig. Needs blackened bones, ember eyes and scorched equipment.",
  },
  {
    id: "lurking-flame-wraith",
    name: "Lurking Flame Wraith",
    family: "Firelands",
    file: "Flying-Ghost_Skull.glb",
    notes:
      "Skull-faced flying spirit with full combat motions. Add flame-shaped edges and an orange emissive treatment.",
  },
  {
    id: "crypt-crawler",
    name: "Crypt Crawler",
    family: "Forest",
    file: "spider-animations.glb",
    notes:
      "Animated eight-legged creature with attack, bite, hit, death, idle and walk. Apply the crypt palette and check its battle-scale readability.",
  },
  {
    id: "moss-covered-golem",
    name: "Moss-Covered Golem",
    family: "Forest · Original draft",
    file: "Moss_Golem.glb",
    notes:
      "Original faceted stone body, moss-covered shoulders and a glowing forest rune. Five authored motions: Idle, Attack, Cast, Hit and Death. Uses animated stone parts rather than a skinned rig.",
  },
  {
    id: "barkhide-shaman",
    name: "Barkhide Shaman",
    family: "Forest",
    file: "Tree01.glb",
    notes:
      "Animated treant base converted from FBX. Needs a staff and caster silhouette; cast and hit clips are absent.",
  },
  {
    id: "hollowed-oakwarden",
    name: "Hollowed Oakwarden",
    family: "Forest · Boss",
    file: "Tree02.glb",
    notes:
      "Second treant body, converted from FBX. Add a hollow trunk, branch crown and boss details. Cast and hit clips are absent.",
  },
  {
    id: "elder-treant",
    name: "Elder Treant",
    family: "Forest",
    file: "Tree01.glb",
    notes:
      "Treant with native idle, attacks and deaths. Add an older bark/moss treatment; a hit reaction remains to be authored.",
  },
  {
    id: "thundermaw",
    name: "Thundermaw",
    family: "Skyreach · Boss",
    file: "Flying-Dragon_Evolved.glb",
    notes:
      "Larger horned dragon base. Needs a distinctive armored jaw, thorn carapace and storm details to read as Thundermaw.",
  },
  {
    id: "thunder-drake",
    name: "Thunder Drake",
    family: "Skyreach",
    file: "Flying-Dragon_Evolved.glb",
    notes:
      "Evolved dragon with flying idle, attacks, hit and death. Use a blue storm palette and a different crest from the boss.",
  },
  {
    id: "sky-serpent",
    name: "Sky Serpent",
    family: "Skyreach",
    file: "snake-animations.glb",
    notes:
      "Rigged serpent with idle, bite, hit and death. This is a ground snake: airborne motion, fins and a longer sky silhouette still need work.",
  },
  {
    id: "storm-hatchling",
    name: "Storm Hatchling",
    family: "Skyreach",
    file: "Flying-Dragon.glb",
    notes:
      "The animated dragon already used in the battle prototype. Good direct hatchling base; add storm colors.",
  },
  {
    id: "skybolt-wyvern",
    name: "Skybolt Wyvern",
    family: "Skyreach",
    file: "Flying-Dragon_Evolved.glb",
    notes:
      "Dragon animation base. A true wyvern silhouette needs a wing/forelimb adaptation and a slimmer body.",
  },
  {
    id: "commander-kelvaris",
    name: "Commander Kelvaris",
    family: "Coast · Boss",
    file: "Big-Fish.glb",
    notes:
      "Fish humanoid with combat motions. Needs commander armor, a crest and a tidepiercer spear; its stock attack is unarmed.",
  },
  {
    id: "fishfolk-shaman",
    name: "Fishfolk Shaman",
    family: "Coast",
    file: "Big-Fish.glb",
    notes:
      "Shared fish biped. Add a coral staff, mantle and caster motion; the source provides a generic punch rather than a native spell cast.",
  },
  {
    id: "fishfolk-scout",
    name: "Fishfolk Scout",
    family: "Coast",
    file: "Big-Fish.glb",
    notes:
      "Shared fish biped. Add a light spear and scouting equipment; inspect weapon alignment in its attack motion.",
  },
  {
    id: "water-elemental",
    name: "Water Elemental",
    family: "Coast · Original draft",
    file: "Water_Elemental.glb",
    notes:
      "Original faceted water body, foam spirals and glowing core. Five authored motions: Idle, Attack, Cast, Hit and Death. Uses animated parts rather than a skinned rig.",
  },
] as const;
