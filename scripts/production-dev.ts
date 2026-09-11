import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { repositoryRoot } from "./release-protected";
import { checkToolchain } from "./release-toolchain";

checkToolchain();
const mode = process.argv[2];
if (!["client", "server"].includes(mode ?? "")) throw new Error("Usage: bun scripts/production-dev.ts client|server");
const server = resolve(repositoryRoot, "apps/server");
if (mode === "server" && !lstatSync(resolve(server, ".dev.vars")).isFile())
  throw new Error("Use a regular .dev.vars file for isolated local development.");
const vars = mode === "server"
  ? parseEnv(readFileSync(resolve(server, ".dev.vars"), "utf8"))
  : Bun.env;
// Validate exactly the file Wrangler will read for server bindings; inherited
// environment variables must not bypass the dedicated local database check.
if (mode === "server") {
  let url: URL;
  try { url = new URL(vars.DATABASE_URL ?? ""); }
  catch { throw new Error("The local DATABASE_URL is invalid; value omitted."); }
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      !/^\/loot_(development|production)_[a-z0-9_]+$/.test(url.pathname) ||
      url.pathname === "/loot_production_admin" || url.search || url.hash)
    throw new Error("Local development requires a dedicated loopback loot_development_* database, never the existing game database or rehearsal admin.");
  if (!vars.CLERK_SECRET_KEY?.startsWith("sk_test_") || !vars.CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"))
    throw new Error("Local development requires Clerk test keys.");
}
const publicKey = vars.VITE_CLERK_PUBLISHABLE_KEY ?? vars.CLERK_PUBLISHABLE_KEY;
if (!publicKey?.startsWith("pk_test_")) throw new Error("Supply the development Clerk publishable key.");
// Deliberately pass an allowlist to the child; the client never inherits the
// server's database URL or Clerk secret key from the dotenv-loaded parent.
const environment: Record<string, string> = {
  PATH: process.env.PATH ?? "",
  NODE_ENV: "development",
  VITE_CLERK_PUBLISHABLE_KEY: publicKey,
  WRANGLER_SEND_METRICS: "false",
  WRANGLER_LOG_PATH: resolve(server, ".wrangler/logs"),
};
if (mode === "server") {
  for (const name of ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"])
    environment[name] = vars[name]!;
}
const child = Bun.spawn(mode === "client"
  ? ["node", resolve(repositoryRoot, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "3001", "--strictPort"]
  : ["node", resolve(repositoryRoot, "node_modules/wrangler/bin/wrangler.js"), "dev", "--config", "wrangler.local.jsonc", "--local", "--env-file", ".dev.vars", "--ip", "127.0.0.1", "--port", "3000", "--persist-to", ".wrangler/local-development"],
  { cwd: mode === "client" ? resolve(repositoryRoot, "apps/client") : server, env: environment, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.exitCode = await child.exited;
