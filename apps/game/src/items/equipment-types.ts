import z from "zod";
import { tieredEquipmentTypes } from "./equipment/tiered-equipment";

export const EquipmentTypeSchema = z.enum([
  "int-armor",
  "iron-sword",
  "iron-cuirass",
  "oakwarden-staff",
  "ashen-falchion",
  "tideglass-staff",
  "stormfang-blade",
  "hollow-scepter",
  "emberguard-mail",
  "tidewoven-robes",
  "stormrunner-leathers",
  "gravewarden-plate",
  ...tieredEquipmentTypes,
]);

export type EquipmentType = z.infer<typeof EquipmentTypeSchema>;
