const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommonJsModule(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const dirname = path.dirname(filePath);
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: (request) => {
      const resolved = path.resolve(dirname, request.endsWith(".js") ? request : `${request}.js`);
      return loadCommonJsModule(resolved);
    },
    __dirname: dirname,
    __filename: filePath,
    console,
  };
  vm.runInNewContext(code, context, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const { RECIPES } = loadCommonJsModule(path.join(root, "data/recipes.js"));
const { buildRecipeProfile } = loadCommonJsModule(path.join(root, "utils/recipe-profile.js"));

function findRecipe(id) {
  const recipe = RECIPES.find((item) => item.id === id);
  assert.ok(recipe, `missing recipe ${id}`);
  return recipe;
}

const tomatoEgg = buildRecipeProfile(findRecipe("tomato-egg"), ["egg", "tomato"]);
assert.match(tomatoEgg.caloriesText, /kcal/);
assert.match(tomatoEgg.proteinText, /蛋白/);
assert.ok(Array.isArray(tomatoEgg.nutritionCards), "nutritionCards should be an array");
assert.ok(tomatoEgg.nutritionCards.length >= 2, "nutritionCards should include heat and protein");
assert.ok(tomatoEgg.conditionAdvice.length >= 1, "tomato-egg should have at least one condition advice");
assert.ok(tomatoEgg.conditionAdvice.length <= 2, "condition advice should be concise");

const tomatoBeef = buildRecipeProfile(findRecipe("tomato-beef"), ["beef", "tomato"]);
assert.ok(tomatoBeef.swapLines.length >= 1, "tomato-beef should include swap options");

const chickenSoup = buildRecipeProfile(findRecipe("chicken-soup"), ["chicken_thigh", "shiitake"]);
assert.ok(chickenSoup.conditionTags.length >= 1, "chicken-soup should include condition tags");
assert.ok(chickenSoup.conditionTags.length <= 2, "condition tags should be limited to 1-2");

console.log("recipe profile enhancement tests passed");
