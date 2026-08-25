const { INGREDIENTS } = require("../data/ingredients");
const { RECIPES } = require("../data/recipes");

const ingredientMap = new Map(INGREDIENTS.map((item) => [item.id, item]));
const recipeMap = new Map(RECIPES.map((item) => [item.id, item]));
let extraRecipeMap = new Map();
let extraIngredientMap = new Map();

/**
 * 注入运行时临时菜谱，供详情页和订单页按 ID 查询。
 * @param {object[]} recipes AI 生成的临时菜谱。
 * @returns {void}
 */
function setExtraRecipes(recipes) {
  const list = Array.isArray(recipes) ? recipes : [];
  extraRecipeMap = new Map(list.map((item) => [item.id, item]));
  extraIngredientMap = new Map();
  list.forEach((recipe) => {
    (recipe.custom_ingredients || []).forEach((item) => {
      if (item && item.id) {
        extraIngredientMap.set(item.id, item);
      }
    });
  });
}

function findIngredientById(id) {
  return ingredientMap.get(id) || extraIngredientMap.get(id) || null;
}

function getIngredientsByIds(ids) {
  return ids
    .map((id) => findIngredientById(id))
    .filter(Boolean);
}

function findRecipeById(id) {
  return recipeMap.get(id) || extraRecipeMap.get(id) || null;
}

function getRecipesByIds(ids) {
  return ids
    .map((id) => findRecipeById(id))
    .filter(Boolean);
}

module.exports = {
  setExtraRecipes,
  findIngredientById,
  getIngredientsByIds,
  findRecipeById,
  getRecipesByIds,
};
