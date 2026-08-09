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

  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: dirname,
    __filename: filePath,
    console,
    Date,
    Set,
    Map,
  }, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const { buildWeekPlan } = loadCommonJsModule(path.join(root, "utils/week-menu.js"));
const { RECIPES } = loadCommonJsModule(path.join(root, "data/recipes.js"));
const recipeMap = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));
const startDate = new Date("2026-08-09T12:00:00");
const firstPlan = buildWeekPlan(startDate, 0);
const samePlan = buildWeekPlan(startDate, 0);
const alternatePlan = buildWeekPlan(startDate, 1);

assert.equal(firstPlan.length, 7);
assert.deepEqual(
  firstPlan.map((day) => day.recipes.map((recipe) => recipe.id)),
  samePlan.map((day) => day.recipes.map((recipe) => recipe.id)),
);
assert.notDeepEqual(
  firstPlan.map((day) => day.recipes.map((recipe) => recipe.id)),
  alternatePlan.map((day) => day.recipes.map((recipe) => recipe.id)),
);

firstPlan.forEach((day) => {
  assert.deepEqual(Array.from(day.meals, (meal) => meal.name), ["早餐", "午餐", "晚餐"]);
  assert.equal(day.meals[0].recipes.length, 1);
  assert.equal(day.meals[1].recipes.length, 3);
  assert.equal(day.meals[2].recipes.length, 3);
  assert.equal(day.recipes.length, 7);
  assert.ok(day.ingredientCount > 0);
  day.recipes.forEach((recipe) => {
    const source = recipeMap.get(recipe.id);
    assert.ok(source);
    assert.ok(!["甜品", "自制"].includes(source.category));
    assert.notEqual(source.id, "chicken-soup");
  });
});

const allIds = firstPlan.flatMap((day) => day.recipes.map((recipe) => recipe.id));
assert.equal(new Set(allIds).size, allIds.length);
assert.ok(firstPlan.every((day) => day.recipes.some((recipe) => recipe.category === "海鲜")));

const template = fs.readFileSync(path.join(root, "pages/plan/index.wxml"), "utf8");
assert.match(template, /一周三餐菜单/);
assert.match(template, /meal\.recipes/);
assert.match(template, /regeneratePlan/);
assert.match(template, /addWeekAndGo/);

console.log("week menu tests passed");
