const { RECIPES } = require("../data/recipes");
const { INGREDIENTS } = require("../data/ingredients");

const recipeMap = new Map(RECIPES.map((item) => [item.id, item]));
const ingredientMap = new Map(INGREDIENTS.map((item) => [item.id, item]));

function getRecipesByIds(ids) {
  return (ids || []).map((id) => recipeMap.get(id)).filter(Boolean);
}

function buildMenuPlan(recipeIds) {
  const recipes = getRecipesByIds(recipeIds);
  const ingredientUsageMap = new Map();

  recipes.forEach((recipe) => {
    (recipe.ingredient_ids || []).forEach((ingredientId) => {
      const ingredient = ingredientMap.get(ingredientId);
      if (!ingredient) {
        return;
      }

      const current = ingredientUsageMap.get(ingredientId);
      if (current) {
        current.count += 1;
        current.recipeIds.push(recipe.id);
        current.recipeTitles.push(recipe.title);
        return;
      }

      ingredientUsageMap.set(ingredientId, {
        id: ingredient.id,
        name: ingredient.name,
        emoji: ingredient.emoji,
        categoryId: ingredient.category_id,
        count: 1,
        recipeIds: [recipe.id],
        recipeTitles: [recipe.title],
      });
    });
  });

  const ingredients = Array.from(ingredientUsageMap.values()).sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name, "zh-Hans-CN");
  });

  return {
    recipes,
    ingredients,
  };
}

module.exports = {
  buildMenuPlan,
};
