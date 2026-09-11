import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dir, "..");
const privateMarkers = [
  "release-private-clerk-sentinel",
  "release-private-database-sentinel",
  "release-private-doppler-sentinel",
];
const probes = [
  [
    "server-variable-name",
    /CLERK_SECRET_KEY|DATABASE_URL|DOPPLER_TOKEN|DOPPLER_PROJECT|DOPPLER_CONFIG/g,
  ],
  ["wallet-runtime", /@rainbow-me|@wagmi|walletconnect|wagmi\/|rainbowkit/g],
  ["development-spell-grant", /Create test spells|Create spells/g],
  [
    "dev-entry",
    /\/dev\/battle-replay|\/dev\/equipment|tests\/battle\/fixtures|recordings\/|battle-replay\.html/g,
  ],
  [
    "devtools-ui",
    /TanStack Query Devtools|ReactQueryDevtools|tanstack-query-devtools/g,
  ],
  ["source-map-comment", /(?:\/\/#|\/\*#)\s*sourceMappingURL\s*=/g],
] as const;
const forbiddenPath =
  /(^|\/)(dev|tests?|fixtures?|recordings?|\.env|\.dev\.vars)(\/|\.|$)|battle-replay\.html|\.map$|\.[cm]?tsx?$/i;
const textExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".map",
  ".md",
  ".txt",
  ".svg",
]);

function sha256(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function filesUnder(directory: string) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) return [];
  return [
    ...new Bun.Glob("**/*").scanSync({
      cwd: directory,
      onlyFiles: true,
      dot: true,
      followSymlinks: false,
    }),
  ].sort();
}

export function inspectProductionArtifact(
  artifactDirectory = resolve(root, "apps/client/dist"),
  publicDirectory = resolve(root, "apps/client/public"),
) {
  const files = filesUnder(artifactDirectory);
  const publicFiles = filesUnder(publicDirectory);
  const failures: string[] = [];
  const kinds: Record<
    string,
    { files: number; bytes: number; gzipBytes?: number }
  > = {};
  const largest: { file: string; bytes: number }[] = [];
  const hashes = new Map<string, string>();
  let totalBytes = 0;
  if (files.length === 0)
    failures.push("Production artifact is missing or empty");
  if (publicFiles.length === 0)
    failures.push("Public assets are missing or empty");

  for (const file of files) {
    const bytes = readFileSync(resolve(artifactDirectory, file));
    const extension = extname(file);
    const kind = (kinds[extension || "[none]"] ??= { files: 0, bytes: 0 });
    kind.files++;
    kind.bytes += bytes.length;
    totalBytes += bytes.length;
    if ([".js", ".css", ".html"].includes(extension)) {
      kind.gzipBytes = (kind.gzipBytes ?? 0) + gzipSync(bytes).byteLength;
    }
    if (forbiddenPath.test(file))
      failures.push(`Forbidden artifact path: ${file}`);
    for (let index = 0; index < privateMarkers.length; index++) {
      if (bytes.includes(Buffer.from(privateMarkers[index]!))) {
        failures.push(`Private build sentinel ${index + 1} found: ${file}`);
      }
    }
    if (textExtensions.has(extension)) {
      const content = bytes.toString("utf8");
      for (const [name, expression] of probes) {
        expression.lastIndex = 0;
        if (expression.test(content)) failures.push(`${name} found: ${file}`);
      }
    }
    hashes.set(file, sha256(bytes));
    largest.push({ file, bytes: bytes.length });
  }

  if (!hashes.has("index.html")) {
    failures.push("Production artifact has no index.html");
  } else {
    const html = readFileSync(resolve(artifactDirectory, "index.html"), "utf8");
    const scripts = [
      ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi),
    ];
    const localEntry = scripts.some(([, source]) => {
      if (!source || /^(?:[a-z]+:)?\/\//i.test(source)) return false;
      const file = source.replace(/^\//, "").split(/[?#]/)[0]!;
      return file.endsWith(".js") && hashes.has(file);
    });
    if (!localEntry)
      failures.push("index.html does not load emitted JavaScript");
  }

  const publicHashes: string[] = [];
  for (const file of publicFiles) {
    const hash = sha256(readFileSync(resolve(publicDirectory, file)));
    publicHashes.push(`${file}\0${hash}`);
    if (!hashes.has(file))
      failures.push(`Public asset missing from artifact: ${file}`);
    else if (hashes.get(file) !== hash) {
      failures.push(`Public asset bytes changed in artifact: ${file}`);
    }
  }

  return {
    passed: failures.length === 0,
    scope:
      "Concrete private sentinels, known forbidden paths/content, entry point, and public asset byte identity; not a universal secret detector",
    directory: relative(root, artifactDirectory),
    files: files.length,
    bytes: totalBytes,
    kinds,
    largest: largest.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
    manifestSha256: sha256(
      [...hashes].map(([file, hash]) => `${file}\0${hash}`).join("\n"),
    ),
    publicAssets: {
      files: publicFiles.length,
      manifestSha256: sha256(publicHashes.join("\n")),
    },
    failures,
  };
}

if (import.meta.main) {
  const result = inspectProductionArtifact();
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (process.env.RELEASE_ARTIFACT_DIR) {
    const destination = resolve(
      process.env.RELEASE_ARTIFACT_DIR,
      "production-artifact.json",
    );
    mkdirSync(dirname(destination), { recursive: true });
    await Bun.write(destination, output);
  }
  process.stdout.write(output);
  if (!result.passed) process.exitCode = 1;
}
