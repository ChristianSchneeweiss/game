import z from "zod";

export const EquipmentTypes = z.union([z.literal("int-armor")]);

export type EquipmentType = z.infer<typeof EquipmentTypes>;
