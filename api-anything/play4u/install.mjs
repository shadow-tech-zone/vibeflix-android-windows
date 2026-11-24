#!/usr/bin/env node
import { access, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const apiHome = process.env.API_ANYTHING_HOME?.trim() || join(homedir(), ".api-anything");
const destination = join(apiHome, "sites");
const force = process.argv.includes("--force");
const files = [
  { name: "play4u.json", source: join(repoRoot, "site", "src", "api", "play4u.json") },
  { name: "play4u.md", source: join(here, "sites", "play4u.md") },
];

await mkdir(destination, { recursive: true, mode: 0o700 });
const existing = [];
for (const { name } of files) {
  try {
    await access(join(destination, name));
    existing.push(name);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
if (existing.length && !force) {
  throw new Error(`${existing.join(", ")} already exist in ${destination}. Review them or rerun with --force to replace them.`);
}
for (const { name, source } of files) {
  await copyFile(source, join(destination, name));
}

console.log(`Installed the Play4u draft in ${destination}.`);
console.log("It is marked unverified. Review api-anything/play4u/README.md before calling or enabling it in an MCP client.");
