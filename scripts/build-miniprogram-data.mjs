import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

function stripTypeBlocks(source) {
  return source.replace(/export type[\s\S]*?^};\n\n/gm, "");
}

function convertModule(source, exportNames) {
  let out = stripTypeBlocks(source);
  out = out.replace(/import type .*?;\n/g, "");
  out = out.replace(/export const /g, "const ");
  out = out.replace(/const (\w+):[\s\S]*?= \[/g, "const $1 = [");
  out = out.replace(/\s+as any/g, "");
  out = out.replace(/\r\n/g, "\n").trimEnd();
  out += `\n\nmodule.exports = { ${exportNames.join(", ")} };\n`;
  return out;
}

async function buildFile(inputRelativePath, outputRelativePath, exportNames) {
  const inputPath = resolve(root, inputRelativePath);
  const outputPath = resolve(root, outputRelativePath);
  const source = await readFile(inputPath, "utf8");
  const output = convertModule(source, exportNames);
  await ensureDir(outputPath);
  await writeFile(outputPath, output, "utf8");
  console.log(`generated ${outputRelativePath}`);
}

await buildFile("src/data/ingredients.ts", "data/ingredients.js", [
  "INGREDIENT_CATEGORIES",
  "INGREDIENTS",
]);

await buildFile("src/data/recipes.ts", "data/recipes.js", ["RECIPES"]);
