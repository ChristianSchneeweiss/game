import { inBetweenCharacterData } from "@loot-game/game/dungeons/types";
import { customType } from "drizzle-orm/pg-core";
import z from "zod";

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
