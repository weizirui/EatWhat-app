const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommonJsModule(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const dirname = path.dirname(filePath);
  const module = { exports: {} };

  function localRequire(request) {
    const resolved = path.resolve(dirname, request.endsWith(".js") ? request : `${request}.js`);
    return loadCommonJsModule(resolved);
  }

  const context = {
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: dirname,
    __filename: filePath,
    console,
    Date,
    Set,
  };

  vm.runInNewContext(code, context, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const { RECIPES } = loadCommonJsModule(path.join(root, "data/recipes.js"));
const { buildLandingSections } = loadCommonJsModule(
  path.join(root, "utils/landing-recommend.js"),
);

const tuesday = buildLandingSections(RECIPES, new Date("2026-07-07T12:00:00"));
const sameWeek = buildLandingSections(RECIPES, new Date("2026-07-12T20:00:00"));
const nextWeek = buildLandingSections(RECIPES, new Date("2026-07-13T12:00:00"));
const landingStyles = fs.readFileSync(path.join(root, "pages/landing/index.wxss"), "utf8");
const landingTemplate = fs.readFileSync(path.join(root, "pages/landing/index.wxml"), "utf8");

assert.equal(tuesday.plan.title, "一周减脂餐");
assert.equal(tuesday.fatLossRecipes.length, 8);
assert.ok(tuesday.fatLossRecipes.every((item) => item.category === "减脂餐"));
assert.ok(tuesday.fatLossRecipes.slice(0, 7).every((item, index) => item.subtitle.startsWith(`周${"一二三四五六日"[index]}`)));
assert.ok(tuesday.fatLossRecipes[7].subtitle.startsWith("替换餐"));
const recipeMap = new Map(RECIPES.map((item) => [item.id, item]));
const carbIds = new Set(["sweet_potato", "corn", "rice"]);
assert.ok(
  tuesday.fatLossRecipes.every((item) =>
    recipeMap.get(item.id).ingredient_ids.some((id) => carbIds.has(id))),
);
assert.ok(tuesday.soupRecipes.length >= 2);
assert.ok(tuesday.soupRecipes.every((item) => item.category === "汤粥"));
assert.equal(tuesday.weekKey, "2026-07-06");
assert.deepEqual(
  tuesday.fatLossRecipes.map((item) => item.id),
  sameWeek.fatLossRecipes.map((item) => item.id),
);
assert.notDeepEqual(
  tuesday.fatLossRecipes.map((item) => item.id),
  nextWeek.fatLossRecipes.map((item) => item.id),
);
assert.doesNotMatch(landingTemplate, /爆款推荐|hotRecipes|seasonalRecipes/);
assert.match(landingTemplate, /fatLossRecipes/);
assert.match(landingTemplate, /本周计划/);
assert.doesNotMatch(landingTemplate, /class="pu-settings-fab"/);
assert.doesNotMatch(landingStyles, /\.pu-settings-fab/);
assert.match(landingStyles, /\.pu-banner-btn\s*\{[\s\S]*background:\s*#23a356;/);
assert.match(landingStyles, /\.landing-page\s*\{[\s\S]*gap:\s*24rpx;/);
assert.match(landingStyles, /\.pu-grid-list\s*\{[\s\S]*flex-wrap:\s*wrap;/);
assert.match(landingStyles, /\.pu-grid-card\s*\{[\s\S]*width:\s*calc\(50% - 8rpx\);[\s\S]*border:\s*2rpx solid rgba\(35, 163, 86, 0\.06\);/);

console.log("landing recommend tests passed");
