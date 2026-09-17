import { expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";

test("AI SQL migration preserves existing characters and supplies manual defaults", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await Bun.file(
        new URL(
          "../../../apps/server/migrations/release/fresh.sql",
          import.meta.url,
        ),
      ).text(),
    );
    await db.exec(`ALTER TABLE character DROP COLUMN ai_enabled, DROP COLUMN ai_prompt, DROP COLUMN ai_allow_consumables;
      INSERT INTO "user" (id, username) VALUES ('owner', 'Owner');
      INSERT INTO character (id, user_id, name, health, mana, intelligence, strength, agility, vitality)
        VALUES ('hero', 'owner', 'Hero', 37, 9, 20, 18, 100, 10);`);
    await db.exec(
      await Bun.file(
        new URL(
          "../../../apps/server/migrations/manual/20260917_ai_control.sql",
          import.meta.url,
        ),
      ).text(),
    );
    expect(
      (
        await db.query(
          "SELECT health, mana, ai_enabled, ai_prompt, ai_allow_consumables FROM character",
        )
      ).rows,
    ).toEqual([
      {
        health: 37,
        mana: 9,
        ai_enabled: false,
        ai_prompt: "",
        ai_allow_consumables: true,
      },
    ]);
    await db.exec(
      "UPDATE character SET ai_enabled = true, ai_prompt = 'Wait', ai_allow_consumables = false WHERE id = 'hero'",
    );
    expect(
      (
        await db.query(
          "SELECT ai_enabled, ai_prompt, ai_allow_consumables FROM character",
        )
      ).rows,
    ).toEqual([
      { ai_enabled: true, ai_prompt: "Wait", ai_allow_consumables: false },
    ]);
  } finally {
    await db.close();
  }
});
