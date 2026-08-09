const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const filePath = path.join(root, "pages/recipes/index.js");
const code = fs.readFileSync(filePath, "utf8");

const sampleRecipe = {
  id: "seaweed-egg",
  title: "紫菜蛋花汤",
  emoji: "🥣",
  category: "汤粥",
  minutes: 10,
  difficulty: "简单",
  ingredient_ids: ["seaweed", "egg"],
  base_seasonings: ["盐"],
  steps: ["烧水", "打蛋"],
};

const lastOrder = {
  recipe_ids: ["seaweed-egg"],
  owned_ingredient_ids: ["egg"],
  suggested_purchase_ids: ["seaweed"],
  all_ingredient_ids: ["egg", "seaweed"],
};

let pageConfig = null;
let capturedOwnedIds = null;
let requestedOrderId = "";

vm.runInNewContext(
  code,
  {
    console,
    require(request) {
      if (request === "../../utils/store") {
        return {
          getLastOrder() {
            return lastOrder;
          },
          getOrderById(id) {
            requestedOrderId = id;
            return lastOrder;
          },
          getPickedRecipes() {
            return [];
          },
          getSelectedIngredients() {
            return [];
          },
          getAllIngredientIds() {
            return [];
          },
          isFavoriteRecipe() {
            return false;
          },
        };
      }
      if (request === "../../utils/catalog") {
        return {
          getRecipesByIds(ids) {
            assert.deepEqual(Array.from(ids), ["seaweed-egg"]);
            return [sampleRecipe];
          },
        };
      }
      if (request === "../../utils/image") {
        return {
          recipeImage(id) {
            return `image:${id}`;
          },
          hydrateImageList(items) {
            return Promise.resolve(items);
          },
          isCloudFileId() {
            return false;
          },
        };
      }
      if (request === "../../utils/recipe-profile") {
        return {
          buildRecipeProfile(recipe, ownedIds) {
            capturedOwnedIds = Array.from(ownedIds);
            assert.equal(recipe.id, "seaweed-egg");
            return {
              caloriesText: "约 100 kcal / 份",
              proteinText: "约 10g 蛋白 / 份",
              nutritionCards: [],
              servingsText: "2 人份",
              cookingMethod: "煮",
              flavorTags: ["清淡"],
              suitableTags: ["家常晚餐"],
              swapLines: [],
              conditionAdvice: [],
              ingredientLines: [],
              baseSeasoningLines: [],
            };
          },
        };
      }
      if (request === "../../utils/ai-image") {
        return {
          generateRecipeImageIfMissing() {
            return Promise.resolve({ image: "" });
          },
        };
      }
      throw new Error(`Unexpected require: ${request}`);
    },
    Page(options) {
      pageConfig = options;
    },
  },
  { filename: filePath },
);

assert.ok(pageConfig, "recipes page should register via Page()");

const pageInstance = {
  data: Object.assign({}, pageConfig.data),
  setData(patch) {
    this.data = Object.assign({}, this.data, patch);
  },
};

pageConfig.onShow.call(pageInstance);

assert.equal(pageInstance.data.recipes.length, 1);
assert.deepEqual(capturedOwnedIds, ["egg", "seaweed"]);

pageConfig.onLoad.call(pageInstance, { orderId: "history-order" });
pageConfig.onShow.call(pageInstance);
assert.equal(requestedOrderId, "history-order");
assert.equal(pageInstance.data.recipes.length, 1);

console.log("recipes order fallback tests passed");
