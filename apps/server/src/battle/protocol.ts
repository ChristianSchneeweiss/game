import type { BaseEntity } from "@loot-game/game/base-entity";
import type { BattleRound } from "@loot-game/game/battle-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type {
  Affinities,
  EntityAttributes,
  SpecialAttributes,
} from "@loot-game/game/entity-types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { SpellDescription } from "@loot-game/game/types";
import z from "zod";

const castSpellSchema = z.object({
  type: z.literal("castSpell"),
  data: z.object({
    entityId: z.string(),
    spellId: z.string(),
    targetIds: z.array(z.string()),
    requestId: z.string().optional(),
    revision: z.number().int().nonnegative().optional(),
  }),
});

const getTargetsSchema = z.object({
  type: z.literal("getTargets"),
  data: z.object({
    entityId: z.string(),
    spellId: z.string(),
    requestId: z.string().optional(),
    revision: z.number().int().nonnegative().optional(),
  }),
});

const getCharacterAttributesSchema = z.object({
  type: z.literal("getCharacterAttributes"),
  data: z.object({
    characterId: z.string(),
  }),
});

const getSpellDescriptionSchema = z.object({
  type: z.literal("getSpellDescription"),
  data: z.object({
    spellId: z.string(),
  }),
});

export const messageSchema = z.union([
  castSpellSchema,
  getTargetsSchema,
  getCharacterAttributesSchema,
  getSpellDescriptionSchema,
]);

export type BattleMessage = z.infer<typeof messageSchema>;

export type BattleState = {
  events: TimelineEventFull[];
  round: BattleRound;
  effectTracking: EffectTracking;
  revision: number;
  availableSpells: string[];
};

export type ResponseMessage =
  | { type: "abandoned"; data: { dungeonId: string } }
  | { type: "rejected"; data: { message: string; requestId?: string } }
  | { type: "castAccepted"; data: { requestId?: string } }
  | {
      type: "state";
      data: BattleState;
    }
  | {
      type: "entities";
      data: {
        entities: BaseEntity[];
      };
    }
  | {
      type: "targets";
      data: {
        targets: string[];
        enemies: number;
        allies: number;
        automatic: boolean;
        entityId: string;
        spellId: string;
        revision: number;
        requestId?: string;
      };
    }
  | {
      type: "finished";
      data: {
        winner: "TEAM_A" | "TEAM_B";
      };
    }
  | {
      type: "characterAttributes";
      data: {
        baseAttributes: EntityAttributes;
        specialAttributes: SpecialAttributes;
        affinities: Affinities;
        entityId: string;
      };
    }
  | {
      type: "spellDescription";
      data: {
        description: SpellDescription;
        spellId: string;
        entityId: string;
      };
    };
