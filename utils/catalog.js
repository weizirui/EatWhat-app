const { INGREDIENTS } = require("../data/ingredients");
const { RECIPES } = require("../data/recipes");

const ingredientMap = new Map(INGREDIENTS.map((item) => [item.id, item]));
const recipeMap = new Map(RECIPES.map((item) => [item.id, item]));

function findIngredientById(id) {
  return ingredientMap.get(id) || null;
}

function getIngredientsByIds(ids) {
  return ids
    .map((id) => findIngredientById(id))
    .filter(Boolean);
}

function findRecipeById(id) {
  return recipeMap.get(id) || null;
}

function getRecipesByIds(ids) {
  return ids
    .map((id) => findRecipeById(id))
    .filter(Boolean);
}

module.exports = {
  findIngredientById,
  getIngredientsByIds,
  findRecipeById,
  getRecipesByIds,
};
