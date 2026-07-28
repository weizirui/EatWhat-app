import { INGREDIENTS, type Ingredient } from "@/data/ingredients";
import { RECIPES, type Recipe } from "@/data/recipes";

export type PlannedIngredient = {
  ingredient: Ingredient;
  recipeIds: string[];
  recipes: Recipe[];
  count: number;
};

export type MenuPlan = {
  recipes: Recipe[];
  ingredients: PlannedIngredient[];
};

/**
 * 根据已选菜谱，生成需要采购的主食材清单。
 * 同一食材会按出现次数合并，方便用户一次性备菜。
 */
export function buildMenuPlan(recipeIds: string[]): MenuPlan {
  if (recipeIds.length === 0) {
    return { recipes: [], ingredients: [] };
  }

  const recipeMap = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));
  const ingredientMap = new Map(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]));

  const recipes = recipeIds
    .map((id) => recipeMap.get(id))
    .filter((recipe): recipe is Recipe => Boolean(recipe));

  const ingredientUsage = new Map<string, PlannedIngredient>();

  for (const recipe of recipes) {
    for (const ingredientId of recipe.ingredient_ids) {
      const ingredient = ingredientMap.get(ingredientId);
      if (!ingredient) continue;

      const current = ingredientUsage.get(ingredientId);
      if (current) {
        current.recipeIds.push(recipe.id);
        current.recipes.push(recipe);
        current.count += 1;
        continue;
      }

      ingredientUsage.set(ingredientId, {
        ingredient,
        recipeIds: [recipe.id],
        recipes: [recipe],
        count: 1,
      });
    }
  }

  const ingredients = Array.from(ingredientUsage.values()).sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.ingredient.name.localeCompare(b.ingredient.name, "zh-CN");
  });

  return { recipes, ingredients };
}
