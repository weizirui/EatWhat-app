const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const store = fs.readFileSync(path.join(root, "utils/store.js"), "utf8");
const menuPlan = fs.readFileSync(path.join(root, "utils/menu-plan.js"), "utf8");
const catalog = fs.readFileSync(path.join(root, "utils/catalog.js"), "utf8");
const aiRecipes = fs.readFileSync(path.join(root, "utils/ai-recipes.js"), "utf8");
const home = fs.readFileSync(path.join(root, "pages/home/index.js"), "utf8");
const homeTemplate = fs.readFileSync(path.join(root, "pages/home/index.wxml"), "utf8");

assert.match(store, /temporaryRecipes:\s*"qx_temporary_recipes"/);
assert.match(store, /function saveTemporaryRecipes/);
assert.match(menuPlan, /function buildMenuPlan\(recipeIds,\s*extraRecipes\)/);
assert.match(menuPlan, /custom_ingredients/);
assert.match(catalog, /function setExtraRecipes/);
assert.match(catalog, /extraIngredientMap/);
assert.match(aiRecipes, /callContainer\("\/api\/ai\/recipes\/suggest"/);
assert.match(aiRecipes, /buildFallbackRecipes/);
assert.match(home, /suggestAiRecipes/);
assert.match(home, /generateRecipeImageIfMissing/);
assert.match(home, /generateAiRecipeImages/);
assert.match(home, /saveTemporaryRecipes\(\[storedRecipe\]\)/);
assert.match(home, /handleAiRecipeImageError/);
assert.match(home, /toggleAiRecipeOpen/);
assert.match(home, /toggleWeekPlanOpen/);
assert.match(home, /saveTemporaryRecipes/);
assert.match(homeTemplate, /想吃什么/);
assert.match(homeTemplate, /wx:if="\{\{aiRecipeOpen\}\}"/);
assert.match(homeTemplate, /wx:if="\{\{weekPlanOpen\}\}"/);
assert.match(homeTemplate, /generateAiRecipes/);
assert.match(homeTemplate, /ai-recipe-image/);

console.log("ai temporary recipes tests passed");
