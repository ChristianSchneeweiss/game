import { expect, test } from "bun:test";
import { disposableTarget } from "./database-target";

test("database rehearsal accepts only its explicit loopback admin target", () => {
  for (const host of ["127.0.0.1", "localhost", "[::1]"])
    expect(disposableTarget(`postgres://postgres@${host}:55439/loot_production_admin`).pathname).toBe("/loot_production_admin");
});

test("database rehearsal refuses shared databases and connection overrides before connecting", () => {
  for (const value of [
    "postgres://postgres@127.0.0.1:55439/game",
    "postgres://postgres@production.example/loot_production_admin",
    "postgres://postgres@127.0.0.1.example/loot_production_admin",
    "postgres://postgres@127.0.0.1/loot_production_admin?host=production.example",
    "postgres://postgres@127.0.0.1/loot_production_admin?dbname=game",
    "postgres://postgres@127.0.0.1/loot_production_admin#override",
    "https://127.0.0.1/loot_production_admin",
    "",
  ]) expect(() => disposableTarget(value)).toThrow();
});

test("malformed database URLs do not disclose connection values in errors", () => {
  const privateValue = "malformed-private-password-and-database";
  try {
    disposableTarget(privateValue);
    throw new Error("Expected URL rejection");
  } catch (error) {
    expect(String(error)).not.toContain(privateValue);
    expect(String(error)).toContain("value omitted");
  }
});
