import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const assets = ["axl-boot.mjs"];
await rm(resolve(packageRoot, "dist/deployed-plugin.mjs"), { force: true });

for (const asset of assets) {
  const source = resolve(packageRoot, "src", asset);
  const target = resolve(packageRoot, "dist", asset);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}
