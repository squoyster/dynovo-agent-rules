import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const source = resolve(packageRoot, "src/axl-boot.mjs");
const target = resolve(packageRoot, "dist/axl-boot.mjs");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
