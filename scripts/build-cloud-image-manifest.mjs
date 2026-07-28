import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "scripts", "output");
const outputFile = path.join(outputDir, "cloud-image-manifest.json");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseImageConfig(source) {
  const readLiteralValue = (name) => {
    const match = source.match(new RegExp("const\\s+" + name + "\\s*=\\s*([\\\"'`])([^\\\"'`]*?)\\1"));
    return match ? match[2] : "";
  };
  const imageSourceMode = readLiteralValue("IMAGE_SOURCE_MODE");
  const cloudEnvId = readLiteralValue("CLOUD_ENV_ID");
  const cloudStorageBucket = readLiteralValue("CLOUD_STORAGE_BUCKET");
  const rawCloudStoragePrefix = readLiteralValue("CLOUD_STORAGE_PREFIX");
  const cloudStoragePrefix = rawCloudStoragePrefix
    .replace(/\$\{CLOUD_ENV_ID\}/g, cloudEnvId)
    .replace(/\$\{CLOUD_STORAGE_BUCKET\}/g, cloudStorageBucket);

  return {
    imageSourceMode,
    cloudEnvId,
    cloudStoragePrefix,
    buildCloudFileId(relativePath) {
      const normalizedPath = String(relativePath || "")
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/");
      if (!cloudStoragePrefix || !normalizedPath) {
        return "";
      }
      return `${cloudStoragePrefix.replace(/\/+$/, "")}/${normalizedPath}`;
    },
  };
}

async function listImages(category, imageConfig) {
  const absoluteDir = path.join(rootDir, "public", "food", category);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => {
      const localRelativePath = path.posix.join("public", "food", category, fileName);
      const cloudRelativePath = path.posix.join("food", category, fileName);

      return {
        category,
        fileName,
        localPath: localRelativePath,
        cloudPath: cloudRelativePath,
        cloudFileId: imageConfig.buildCloudFileId(cloudRelativePath),
      };
    });
}

async function main() {
  const imageConfigFile = path.join(rootDir, "utils", "image-config.js");
  const imageConfigSource = await fs.readFile(imageConfigFile, "utf8");
  const imageConfig = parseImageConfig(imageConfigSource);

  const [ingredientImages, recipeImages] = await Promise.all([
    listImages("ingredients", imageConfig),
    listImages("recipes", imageConfig),
  ]);

  const manifest = {
    generatedAt: new Date().toISOString(),
    imageSourceMode: imageConfig.imageSourceMode,
    cloudEnvId: imageConfig.cloudEnvId,
    cloudStoragePrefix: imageConfig.cloudStoragePrefix,
    totalCount: ingredientImages.length + recipeImages.length,
    ingredientsCount: ingredientImages.length,
    recipesCount: recipeImages.length,
    files: [...ingredientImages, ...recipeImages],
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log("云存储上传清单已生成");
  console.log(`食材图：${manifest.ingredientsCount} 张`);
  console.log(`菜谱图：${manifest.recipesCount} 张`);
  console.log(`总计：${manifest.totalCount} 张`);
  console.log(`清单已输出：${path.relative(rootDir, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
