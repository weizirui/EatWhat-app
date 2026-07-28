import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, "..");
export const outputDir = path.join(rootDir, "scripts", "output");
export const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const imageTargets = {
  ingredients: {
    dataFile: path.join(rootDir, "data", "ingredients.js"),
    sourceDataFile: path.join(rootDir, "src", "data", "ingredients.ts"),
    imagePromptFile: path.join(rootDir, "src", "lib", "image.ts"),
    imageDir: path.join(rootDir, "public", "food", "ingredients"),
    relativeCloudDir: "food/ingredients",
    promptConstName: "INGREDIENT_PROMPTS",
    kindLabel: "ingredient",
  },
  recipes: {
    dataFile: path.join(rootDir, "data", "recipes.js"),
    sourceDataFile: path.join(rootDir, "src", "data", "recipes.ts"),
    imagePromptFile: path.join(rootDir, "src", "lib", "image.ts"),
    imageDir: path.join(rootDir, "public", "food", "recipes"),
    relativeCloudDir: "food/recipes",
    promptConstName: "RECIPE_PROMPTS",
    kindLabel: "recipe",
  },
};

export const knownBadImageHashes = new Map([
  ["65747559b9966f4e1c44c8ce0b3e2c0440b7f773", "占位失败图"],
  ["883339675370d7519f0662566c1acfa2d1a97786", "占位失败图"],
  ["2f8e160750028a315168a5c6a3d6ff216ba2a646", "网页加载失败占位图"],
]);

const MIN_IMAGE_EDGE = 480;

export function buildSha1(buffer) {
  return createHash("sha1").update(buffer).digest("hex");
}

function getPngDimensions(buffer) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) {
      return null;
    }
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength + 2;
  }
  return null;
}

export function getImageDimensions(buffer) {
  return getPngDimensions(buffer) || getJpegDimensions(buffer);
}

export function getInvalidReasonByBuffer(buffer) {
  const knownReason = knownBadImageHashes.get(buildSha1(buffer));
  if (knownReason) {
    return knownReason;
  }

  const dimensions = getImageDimensions(buffer);
  if (dimensions && (dimensions.width < MIN_IMAGE_EDGE || dimensions.height < MIN_IMAGE_EDGE)) {
    return `分辨率过低（${dimensions.width}x${dimensions.height}）`;
  }
  return "";
}

export function isInvalidImageBuffer(buffer) {
  return Boolean(getInvalidReasonByBuffer(buffer));
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function listImageFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

export async function listImageIdMap(dirPath) {
  const files = await listImageFiles(dirPath);
  return new Map(files.map((fileName) => [path.basename(fileName, path.extname(fileName)), fileName]));
}

export async function findInvalidImages(dirPath) {
  const files = await listImageFiles(dirPath);
  const invalidItems = [];

  for (const fileName of files) {
    const absolutePath = path.join(dirPath, fileName);
    const buffer = await fs.readFile(absolutePath);
    const reason = getInvalidReasonByBuffer(buffer);

    if (!reason) continue;

    invalidItems.push({
      id: path.basename(fileName, path.extname(fileName)),
      fileName,
      absolutePath,
      relativePath: path.relative(rootDir, absolutePath),
      sha1: buildSha1(buffer),
      reason,
    });
  }

  return invalidItems;
}

export async function removeInvalidImages(dirPath) {
  const invalidItems = await findInvalidImages(dirPath);
  for (const item of invalidItems) {
    await fs.unlink(item.absolutePath);
  }
  return invalidItems;
}

export function extractPromptMap(source, constName) {
  const match = source.match(
    new RegExp(`(?:export\\s+)?const\\s+${constName}:[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\n\\};`),
  );
  if (!match) {
    throw new Error(`Cannot find ${constName} in prompt file`);
  }

  const body = match[1];
  const entries = {};
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    const item = trimmed.match(/^"?(.*?)"?:\s*"([^"]+)",?$/);
    if (!item) continue;
    entries[item[1]] = item[2];
  }
  return entries;
}

export function extractIngredientsFromSource(source) {
  const items = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*category_id:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(source))) {
    items.push({
      id: match[1],
      name: match[2],
      categoryId: match[3],
    });
  }
  return items;
}

export function extractRecipesFromSource(source) {
  const items = [];
  const re =
    /\{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(source))) {
    items.push({
      id: match[1],
      title: match[2],
      category: match[3],
    });
  }
  return items;
}

export function extractIngredientsFromMiniProgramData(source) {
  const listMatch = source.match(/const\s+INGREDIENTS\s*=\s*\[([\s\S]*?)\n\];/);
  if (!listMatch) {
    throw new Error("Cannot find INGREDIENTS in data/ingredients.js");
  }

  const items = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*category_id:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(listMatch[1]))) {
    items.push({
      id: match[1],
      name: match[2],
    });
  }
  return items;
}

export function extractRecipesFromMiniProgramData(source) {
  const listMatch = source.match(/const\s+RECIPES\s*=\s*\[([\s\S]*?)\n\];/);
  if (!listMatch) {
    throw new Error("Cannot find RECIPES in data/recipes.js");
  }

  const items = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(listMatch[1]))) {
    items.push({
      id: match[1],
      title: match[2],
    });
  }
  return items;
}

export async function loadPromptMap(target) {
  const source = await fs.readFile(target.imagePromptFile, "utf8");
  return extractPromptMap(source, target.promptConstName);
}

export async function loadSourceItems(targetKey) {
  const target = imageTargets[targetKey];
  const source = await fs.readFile(target.sourceDataFile, "utf8");
  return targetKey === "ingredients"
    ? extractIngredientsFromSource(source)
    : extractRecipesFromSource(source);
}

export async function loadMiniProgramItems(targetKey) {
  const target = imageTargets[targetKey];
  const source = await fs.readFile(target.dataFile, "utf8");
  return targetKey === "ingredients"
    ? extractIngredientsFromMiniProgramData(source)
    : extractRecipesFromMiniProgramData(source);
}

export async function getRegenerationTargetIds(targetKey) {
  const target = imageTargets[targetKey];
  const [items, existingMap, invalidItems] = await Promise.all([
    loadSourceItems(targetKey),
    listImageIdMap(target.imageDir),
    findInvalidImages(target.imageDir),
  ]);

  const invalidIdSet = new Set(invalidItems.map((item) => item.id));
  return items
    .filter((item) => !existingMap.has(item.id) || invalidIdSet.has(item.id))
    .map((item) => item.id);
}
