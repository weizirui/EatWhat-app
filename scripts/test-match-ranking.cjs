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
const { matchRecipes } = loadCommonJsModule(path.join(root, "utils/match.js"));

const fishSelected = ["sea_bass", "ginger", "scallion"];
const fishResult = matchRecipes(fishSelected);

assert.ok(fishResult.length > 0, "match result should not be empty");
assert.equal(fishResult[0].recipe.id, "steamed-sea-bass", "sea bass should rank first when sea_bass selected");
assert.ok(
  fishResult[0].primaryMatchedIds.includes("sea_bass"),
  "top ranked recipe should include selected primary ingredient",
);

const chickenSelected = ["ginger", "scallion", "chicken_thigh"];
const chickenResult = matchRecipes(chickenSelected);
assert.ok(chickenResult.length > 0, "chicken result should not be empty");
assert.ok(chickenResult[0].primaryMatchedIds.includes("chicken_thigh"));

console.log("match ranking tests passed");
