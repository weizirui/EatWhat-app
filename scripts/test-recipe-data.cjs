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
const { getIngredientsByIds } = loadCommonJsModule(path.join(root, "utils/catalog.js"));

const seaweedEgg = RECIPES.find((item) => item.id === "seaweed-egg");
assert.ok(seaweedEgg, "missing recipe seaweed-egg");
assert.ok(!seaweedEgg.ingredient_ids.includes("tomato"), "seaweed-egg should not include tomato");
assert.ok(!seaweedEgg.steps.join(" ").includes("番茄"), "seaweed-egg steps should not mention tomato");

assert.equal(
  getIngredientsByIds(["tomato", "shiitake", "cilantro", "garlic"])
    .map((item) => item.name)
    .join("、"),
  "番茄、香菇、香菜、蒜",
);

console.log("recipe data tests passed");
