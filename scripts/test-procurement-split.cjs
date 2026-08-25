const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommonJsModule(filePath, extras) {
  const code = fs.readFileSync(filePath, "utf8");
  const dirname = path.dirname(filePath);
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: (request) => {
      const resolved = path.resolve(dirname, request.endsWith(".js") ? request : `${request}.js`);
      return loadCommonJsModule(resolved, extras);
    },
    __dirname: dirname,
    __filename: filePath,
    console,
    ...extras,
  };
  vm.runInNewContext(code, context, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const storage = new Map();
const wx = {
  getStorageSync(key) {
    return storage.get(key);
  },
  setStorageSync(key, value) {
    storage.set(key, value);
  },
};

const store = loadCommonJsModule(path.join(root, "utils/store.js"), { wx });
const toPlain = (value) => Array.from(value);

assert.deepEqual(toPlain(store.getPickedRecipes()), []);
store.togglePickedRecipe("tomato-eggs");
store.togglePickedRecipe("smashed-cucumber");
assert.deepEqual(toPlain(store.getPickedRecipes()), ["tomato-eggs", "smashed-cucumber"]);
store.togglePickedRecipe("tomato-eggs");
assert.deepEqual(toPlain(store.getPickedRecipes()), ["smashed-cucumber"]);

const homeTemplate = fs.readFileSync(path.join(root, "pages/home/index.wxml"), "utf8");
assert.match(homeTemplate, /点好菜，发给采购人/);
assert.match(homeTemplate, /发给采购人/);
assert.match(homeTemplate, /wx:for="\{\{recipes\}\}"/);
assert.match(homeTemplate, /待采购食材/);

const matchTemplate = fs.readFileSync(path.join(root, "pages/match/index.wxml"), "utf8");
assert.match(matchTemplate, /selectedRecipes/);
assert.match(matchTemplate, /purchaseIngredients/);

const successTemplate = fs.readFileSync(path.join(root, "pages/checkout-success/index.wxml"), "utf8");
assert.match(successTemplate, /suggestedIngredientsText/);
assert.match(successTemplate, /allIngredientsText/);

console.log("procurement split tests passed");
