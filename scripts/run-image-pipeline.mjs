import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import {
  ensureDir,
  findInvalidImages,
  getRegenerationTargetIds,
  imageTargets,
  outputDir,
  rootDir,
} from "./image-maintenance-utils.mjs";
import { generateImages } from "./generate-image-library.mjs";

const execFileAsync = promisify(execFile);
const summaryFile = path.join(outputDir, "image-pipeline-summary.json");

async function runCompressStep() {
  const scriptPath = path.join(rootDir, "scripts", "compress-miniprogram-images.mjs");
  await execFileAsync("node", [scriptPath], {
    cwd: rootDir,
  });
}

async function collectState() {
  const [ingredientInvalid, recipeInvalid, ingredientIds, recipeIds] = await Promise.all([
    findInvalidImages(imageTargets.ingredients.imageDir),
    findInvalidImages(imageTargets.recipes.imageDir),
    getRegenerationTargetIds("ingredients"),
    getRegenerationTargetIds("recipes"),
  ]);

  return {
    invalid: {
      ingredients: ingredientInvalid,
      recipes: recipeInvalid,
    },
    regenerateIds: {
      ingredients: ingredientIds,
      recipes: recipeIds,
    },
  };
}

async function main() {
  await ensureDir(outputDir);

  const before = await collectState();
  const ingredientIds = await getRegenerationTargetIds("ingredients");
  const recipeIds = await getRegenerationTargetIds("recipes");

  console.log(`需要补食材图：${ingredientIds.length} 张`);
  console.log(`需要补菜谱图：${recipeIds.length} 张`);

  const [ingredientResult, recipeResult] = await Promise.all([
    generateImages("ingredients", {
      onlyIds: ingredientIds,
      useOnlyIds: true,
    }),
    generateImages("recipes", {
      onlyIds: recipeIds,
      useOnlyIds: true,
    }),
  ]);

  const afterGeneration = await collectState();

  let compressOk = false;
  if (!afterGeneration.regenerateIds.ingredients.length && !afterGeneration.regenerateIds.recipes.length) {
    await runCompressStep();
    compressOk = true;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    provider: {
      ingredients: {
        provider: ingredientResult.provider ?? "",
        model: ingredientResult.providerModel ?? "",
        serviceError: ingredientResult.serviceError ?? "",
      },
      recipes: {
        provider: recipeResult.provider ?? "",
        model: recipeResult.providerModel ?? "",
        serviceError: recipeResult.serviceError ?? "",
      },
    },
    before: {
      invalidIngredientCount: before.invalid.ingredients.length,
      invalidRecipeCount: before.invalid.recipes.length,
      regenerateIngredientCount: before.regenerateIds.ingredients.length,
      regenerateRecipeCount: before.regenerateIds.recipes.length,
    },
    cleaned: {
      ingredientInvalidCount: 0,
      recipeInvalidCount: 0,
    },
    generation: {
      ingredients: ingredientResult,
      recipes: recipeResult,
    },
    after: {
      invalidIngredientCount: afterGeneration.invalid.ingredients.length,
      invalidRecipeCount: afterGeneration.invalid.recipes.length,
      regenerateIngredientIds: afterGeneration.regenerateIds.ingredients,
      regenerateRecipeIds: afterGeneration.regenerateIds.recipes,
    },
    compressOk,
  };

  await fs.writeFile(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`流程摘要已输出：${path.relative(rootDir, summaryFile)}`);

  if (afterGeneration.regenerateIds.ingredients.length || afterGeneration.regenerateIds.recipes.length) {
    console.log("仍有图片未补齐，通常是当前环境无法访问出图接口，或者接口继续返回坏图。");
    process.exitCode = 1;
    return;
  }

  console.log("图片流程执行完成，当前没有缺图或坏图。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
