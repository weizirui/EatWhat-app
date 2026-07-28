import path from "node:path";
import fs from "node:fs/promises";
import {
  ensureDir,
  findInvalidImages,
  imageTargets,
  listImageIdMap,
  loadMiniProgramItems,
  outputDir,
  rootDir,
} from "./image-maintenance-utils.mjs";

const outputFile = path.join(outputDir, "missing-images.json");

function buildReportSection(items, existingMap) {
  const expectedIds = items.map((item) => item.id);
  const missing = [];
  const matched = [];

  for (const item of items) {
    const fileName = existingMap.get(item.id);
    if (fileName) {
      matched.push({
        id: item.id,
        fileName,
      });
      continue;
    }

    missing.push({
      id: item.id,
      name: item.name ?? item.title ?? item.id,
    });
  }

  const extra = [...existingMap.entries()]
    .filter(([id]) => !expectedIds.includes(id))
    .map(([id, fileName]) => ({ id, fileName }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    expectedCount: expectedIds.length,
    matchedCount: matched.length,
    missingCount: missing.length,
    extraCount: extra.length,
    missing,
    extra,
  };
}

async function main() {
  const [
    ingredientImages,
    recipeImages,
    invalidIngredientImages,
    invalidRecipeImages,
    ingredients,
    recipes,
  ] = await Promise.all([
    listImageIdMap(imageTargets.ingredients.imageDir),
    listImageIdMap(imageTargets.recipes.imageDir),
    findInvalidImages(imageTargets.ingredients.imageDir),
    findInvalidImages(imageTargets.recipes.imageDir),
    loadMiniProgramItems("ingredients"),
    loadMiniProgramItems("recipes"),
  ]);
  const ingredientSection = buildReportSection(ingredients, ingredientImages);
  const recipeSection = buildReportSection(recipes, recipeImages);

  const report = {
    generatedAt: new Date().toISOString(),
    ingredientImages: {
      ...ingredientSection,
      invalidCount: invalidIngredientImages.length,
      invalid: invalidIngredientImages,
    },
    recipeImages: {
      ...recipeSection,
      invalidCount: invalidRecipeImages.length,
      invalid: invalidRecipeImages,
    },
  };

  await ensureDir(outputDir);
  await fs.writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("图片盘点完成");
  console.log(
    `食材图：${report.ingredientImages.matchedCount}/${report.ingredientImages.expectedCount}，缺失 ${report.ingredientImages.missingCount}，多余 ${report.ingredientImages.extraCount}，坏图 ${report.ingredientImages.invalidCount}`,
  );
  console.log(
    `菜谱图：${report.recipeImages.matchedCount}/${report.recipeImages.expectedCount}，缺失 ${report.recipeImages.missingCount}，多余 ${report.recipeImages.extraCount}，坏图 ${report.recipeImages.invalidCount}`,
  );
  console.log(`报告已输出：${path.relative(rootDir, outputFile)}`);

  if (report.ingredientImages.missingCount > 0) {
    console.log(
      `缺失食材图：${report.ingredientImages.missing.map((item) => item.id).join(", ")}`,
    );
  }

  if (report.recipeImages.missingCount > 0) {
    console.log(`缺失菜谱图：${report.recipeImages.missing.map((item) => item.id).join(", ")}`);
  }

  if (report.ingredientImages.invalidCount > 0) {
    console.log(`异常食材图：${report.ingredientImages.invalid.map((item) => item.id).join(", ")}`);
  }

  if (report.recipeImages.invalidCount > 0) {
    console.log(`异常菜谱图：${report.recipeImages.invalid.map((item) => item.id).join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
