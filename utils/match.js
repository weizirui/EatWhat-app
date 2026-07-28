const { INGREDIENTS } = require("../data/ingredients");
const { RECIPES } = require("../data/recipes");

const NON_PRIMARY_IDS = new Set([
  "scallion",
  "ginger",
  "garlic",
  "dried_chili",
  "cilantro",
  "sichuan_pepper",
  "rock_sugar",
  "cinnamon",
  "star_anise",
  "sesame",
  "yeast",
]);

const PRIMARY_CATEGORIES = new Set([
  "veg",
  "meat",
  "seafood",
  "tofu",
  "egg",
  "staple",
  "fruit",
]);

function isPrimaryIngredient(ingredient) {
  if (!ingredient) {
    return false;
  }
  if (NON_PRIMARY_IDS.has(ingredient.id)) {
    return false;
  }
  return PRIMARY_CATEGORIES.has(ingredient.category_id);
}

function scoreMatch(item) {
  let score = 0;
  if (item.canCook) {
    score += 400;
  }
  if (item.focusMatched) {
    score += 320;
  }
  score += item.primaryMatchedCount * 120;
  score += item.matchedCount * 18;
  score -= item.missing.length * 12;
  score -= item.total;
  return score;
}

function matchRecipes(selectedIds, options) {
  if (!selectedIds || selectedIds.length === 0) {
    return [];
  }

  const activeFocusId = options && options.activeFocusId ? options.activeFocusId : "all";
  const selected = new Set(selectedIds);
  const ingredientMap = new Map(INGREDIENTS.map((item) => [item.id, item]));
  const selectedPrimaryIds = selectedIds.filter((id) => isPrimaryIngredient(ingredientMap.get(id)));
  if (selectedPrimaryIds.length === 0) {
    return [];
  }
  const output = [];

  for (const recipe of RECIPES) {
    const matched = [];
    const missing = [];
    const primaryMatched = [];

    for (const id of recipe.ingredient_ids) {
      const ingredient = ingredientMap.get(id);
      if (!ingredient) {
        continue;
      }
      if (selected.has(id)) {
        matched.push(ingredient);
        if (isPrimaryIngredient(ingredient)) {
          primaryMatched.push(ingredient);
        }
      } else {
        missing.push(ingredient);
      }
    }

    if (matched.length === 0) {
      continue;
    }

    if (selectedPrimaryIds.length > 0 && primaryMatched.length === 0) {
      continue;
    }

    const focusMatched = activeFocusId !== "all" && recipe.ingredient_ids.includes(activeFocusId);
    const item = {
      recipe,
      matched,
      missing,
      matchedCount: matched.length,
      primaryMatchedCount: primaryMatched.length,
      primaryMatchedIds: primaryMatched.map((ingredient) => ingredient.id),
      primaryMatchedText: primaryMatched.map((ingredient) => `${ingredient.emoji} ${ingredient.name}`).join("、"),
      total: recipe.ingredient_ids.length,
      canCook: missing.length === 0,
      focusMatched,
    };
    item.score = scoreMatch(item);
    output.push(item);
  }

  output.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    if (a.canCook !== b.canCook) {
      return a.canCook ? -1 : 1;
    }
    if (a.primaryMatchedCount !== b.primaryMatchedCount) {
      return b.primaryMatchedCount - a.primaryMatchedCount;
    }
    if (a.matchedCount !== b.matchedCount) {
      return b.matchedCount - a.matchedCount;
    }
    return a.total - b.total;
  });

  return output;
}

module.exports = {
  isPrimaryIngredient,
  matchRecipes,
};
