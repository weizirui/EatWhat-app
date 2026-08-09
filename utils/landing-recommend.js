const MEAL_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日", "替换餐"];
const FEATURED_FAT_LOSS_IDS = [
  "fatloss-chicken-broccoli-sweet-potato",
  "fatloss-shrimp-corn-salad",
  "fatloss-seabass-sweet-potato",
  "fatloss-chicken-mushroom-corn",
  "fatloss-tomato-tofu-rice",
  "fatloss-beef-lettuce-corn",
  "fatloss-egg-spinach-sweet-potato",
  "fatloss-sweet-potato-chicken-bowl",
];

function uniqueById(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (!item || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function toRecipeCard(recipe, label) {
  return {
    id: recipe.id,
    title: recipe.title,
    emoji: recipe.emoji,
    category: recipe.category,
    minutes: recipe.minutes,
    subtitle: label
      ? `${label} · ${recipe.minutes} 分钟 · ${recipe.difficulty}`
      : `${recipe.category} · ${recipe.minutes} 分钟`,
    ingredientIds: recipe.ingredient_ids.join(","),
  };
}

function getRecommendationWeekKey(date) {
  const current = date || new Date();
  const monday = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const distanceFromMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - distanceFromMonday);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekSerial(date) {
  const current = date || new Date();
  const distanceFromMonday = (current.getDay() + 6) % 7;
  const mondayUtc = Date.UTC(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() - distanceFromMonday,
  );
  return Math.floor(mondayUtc / 604800000);
}

function rotateForWeek(list, date, offset) {
  if (list.length < 2) {
    return list.slice();
  }
  const start = (getWeekSerial(date) + offset) % list.length;
  return list.slice(start).concat(list.slice(0, start));
}

function buildFatLossRecipes(recipes, date) {
  const recipeMap = recipes.reduce((result, recipe) => {
    result[recipe.id] = recipe;
    return result;
  }, {});
  const featured = rotateForWeek(
    FEATURED_FAT_LOSS_IDS.map((id) => recipeMap[id]).filter(Boolean),
    date,
    0,
  );
  const fallback = recipes
    .filter((item) => item.category === "减脂餐")
    .sort((a, b) => a.minutes - b.minutes);
  const weeklyRecipes = uniqueById(featured.concat(rotateForWeek(fallback, date, 2))).slice(0, 8);

  return weeklyRecipes.map((recipe, index) => toRecipeCard(recipe, MEAL_LABELS[index]));
}

function buildCategoryRecipes(recipes, category, count, date) {
  const pool = recipes
    .filter((item) => item.category === category)
    .sort((a, b) => a.minutes - b.minutes);
  return rotateForWeek(pool, date, 5).slice(0, count).map((recipe) => toRecipeCard(recipe));
}

function buildLandingSections(recipes, date) {
  const currentDate = date || new Date();
  return {
    plan: {
      title: "一周减脂餐",
      subtitle: "周一到周日，另备一套替换餐",
      headline: "这周吃什么，减脂菜单帮你搭好了",
      description: "周一到周日每天一套，另备 1 套替换餐。选中想吃的菜，就能自动生成采购清单。",
    },
    weekKey: getRecommendationWeekKey(currentDate),
    fatLossRecipes: buildFatLossRecipes(recipes, currentDate),
    soupRecipes: buildCategoryRecipes(recipes, "汤粥", 2, currentDate),
  };
}

module.exports = {
  buildLandingSections,
  getRecommendationWeekKey,
};
