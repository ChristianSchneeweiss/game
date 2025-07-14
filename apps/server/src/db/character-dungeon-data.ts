// import { inBetweenCharacterData } from "@loot-game/game/dungeons/types"; // this breaks drizzle migrations
import { customType } from "drizzle-orm/pg-core";
import z from "zod";

const inBetweenCharacterData = z.object({
  characterId: z.string(),
  health: z.number(),
  mana: z.number(),
});

export const COL_characterDungeonDataSchema = z.array(inBetweenCharacterData);

export const COL_characterDungeonData = customType<{
  data: z.infer<typeof COL_characterDungeonDataSchema>;
  driverData: string;
}>({
  dataType: () => "json",
  toDriver: (value) => {
    return JSON.stringify(value);
  },
  fromDriver: (value: unknown) => {
    const parsed = COL_characterDungeonDataSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error("Invalid dungeon data");
    }
    return parsed.data;
  },
});
