import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const TARGETS = [
  {
    dir: path.join(root, "public/food/ingredients"),
    maxSize: 640,
    quality: 75,
    label: "ingredients",
  },
  {
    dir: path.join(root, "public/food/recipes"),
    maxSize: 640,
    quality: 75,
    label: "recipes",
  },
];

async function listJpgFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))
    .map((entry) => path.join(dir, entry.name));
}

async function statKB(filePath) {
  const stat = await fs.stat(filePath);
  return Number((stat.size / 1024).toFixed(1));
}

async function compressOne(filePath, maxSize, quality) {
  const beforeKB = await statKB(filePath);
  await execFileAsync("sips", [
    "-Z",
    String(maxSize),
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    String(quality),
    filePath,
  ]);
  const afterKB = await statKB(filePath);
  return {
    beforeKB,
    afterKB,
  };
}

async function processTarget(target) {
  const files = await listJpgFiles(target.dir);
  let beforeTotalKB = 0;
  let afterTotalKB = 0;

  for (const filePath of files) {
    const result = await compressOne(filePath, target.maxSize, target.quality);
    beforeTotalKB += result.beforeKB;
    afterTotalKB += result.afterKB;
  }

  return {
    label: target.label,
    count: files.length,
    beforeTotalKB,
    afterTotalKB,
  };
}

async function main() {
  const summaries = [];
  for (const target of TARGETS) {
    summaries.push(await processTarget(target));
  }

  let beforeAllKB = 0;
  let afterAllKB = 0;
  for (const summary of summaries) {
    beforeAllKB += summary.beforeTotalKB;
    afterAllKB += summary.afterTotalKB;
    console.log(
      `${summary.label}: ${summary.count} files, ${summary.beforeTotalKB.toFixed(1)}KB -> ${summary.afterTotalKB.toFixed(1)}KB`,
    );
  }

  console.log(`total: ${beforeAllKB.toFixed(1)}KB -> ${afterAllKB.toFixed(1)}KB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
