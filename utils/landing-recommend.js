const SEASON_RULES = [
  {
    key: "spring",
    months: [3, 4, 5],
    title: "春日时令",
    subtitle: "适合鲜嫩、清爽、脆口一点的家常菜。",
    headline: "春鲜上桌，吃点清爽的",
    description: "根据当前季节优先推荐春鲜家常菜，再搭配汤品和甜口收尾。",
    ingredientIds: ["bamboo_shoot", "spinach", "strawberry", "tofu", "cucumber"],
    preferredCategories: ["凉菜", "蔬菜", "豆制品"],
    hotIds: ["tomato-egg", "garlic-broccoli", "mapo-tofu", "egg-fried-rice"],
  },
  {
    key: "summer",
    months: [6, 7, 8],
    title: "夏日时令",
    subtitle: "适合清爽、快手、带点汤水和甜口的组合。",
    headline: "夏天就该吃点清爽快手的",
    description: "优先推荐夏季更常吃的清爽菜，再给你配上汤品和饭后甜品。",
    ingredientIds: ["tomato", "cucumber", "loofah", "bitter_melon", "winter_melon", "mango"],
    preferredCategories: ["凉菜", "蔬菜", "汤粥"],
    hotIds: ["tomato-egg", "loofah-egg", "mapo-tofu", "egg-fried-rice"],
  },
  {
    key: "autumn",
    months: [9, 10, 11],
    title: "秋日时令",
    subtitle: "适合润一点、暖一点、带丰收感的家常搭配。",
    headline: "秋天适合暖胃又有点丰盛",
    description: "根据秋季食材偏好推荐时令菜，再补上汤品和甜口小点。",
    ingredientIds: ["lotus_root", "taro", "pear", "pumpkin", "shiitake", "crab"],
    preferredCategories: ["蔬菜", "肉禽", "汤粥"],
    hotIds: ["braised-eggplant", "mapo-tofu", "pork-rib-lotus", "beef-rice-bowl"],
  },
  {
    key: "winter",
    months: [12, 1, 2],
    title: "冬日时令",
    subtitle: "适合暖胃、热汤热菜、炖煮感更足的选择。",
    headline: "天冷了，来点热汤热菜",
    description: "优先给你更适合冬天的暖胃菜式，也保留一口甜的收尾。",
    ingredientIds: ["cabbage", "ribs", "lamb", "beef", "sweet_potato", "seaweed"],
    preferredCategories: ["肉禽", "汤粥", "主食"],
    hotIds: ["cola-wings", "mapo-tofu", "tomato-beef-soup", "beef-noodle"],
  },
];

function detectSeason(date) {
  const month = date.getMonth() + 1;
  return SEASON_RULES.find((item) => item.months.includes(month)) || SEASON_RULES[1];
}

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

function toRecipeCard(recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    emoji: recipe.emoji,
    category: recipe.category,
    minutes: recipe.minutes,
    subtitle: `${recipe.category} · ${recipe.minutes} 分钟`,
    ingredientIds: recipe.ingredient_ids.join(","),
  };
}

function countIngredientMatches(recipe, ingredientIds) {
  return recipe.ingredient_ids.reduce((sum, id) => sum + (ingredientIds.includes(id) ? 1 : 0), 0);
}

function seasonalScore(recipe, season) {
  let score = countIngredientMatches(recipe, season.ingredientIds) * 4;

  if (season.preferredCategories.includes(recipe.category)) {
    score += 2;
  }

  if (season.key === "summer" || season.key === "spring") {
    if (recipe.minutes <= 15) {
      score += 2;
    }
  } else if (recipe.minutes >= 20) {
    score += 1;
  }

  return score;
}

function fillToCount(primary, fallback, count) {
  return uniqueById(primary.concat(fallback)).slice(0, count);
}

function getRecommendationDayKey(date) {
  const current = date || new Date();
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaySerial(date) {
  const current = date || new Date();
  return Math.floor(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()) / 86400000);
}

function rotateForDay(list, date, sectionOffset) {
  if (list.length < 2) {
    return list.slice();
  }
  const offset = (getDaySerial(date) + sectionOffset) % list.length;
  return list.slice(offset).concat(list.slice(0, offset));
}

function buildSeasonalRecipes(recipes, season, date) {
  const seasonalPool = recipes
    .filter((item) => item.category !== "汤粥" && item.category !== "甜品" && item.category !== "自制")
    .map((item) => ({
      recipe: item,
      score: seasonalScore(item, season),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.recipe.minutes - b.recipe.minutes;
    })
    .map((item) => item.recipe);

  const fallbackPool = recipes
    .filter((item) => item.category !== "汤粥" && item.category !== "甜品" && item.category !== "自制")
    .sort((a, b) => a.minutes - b.minutes);

  const dailyPool = rotateForDay(seasonalPool.slice(0, 9), date, 0);
  const dailyFallback = rotateForDay(fallbackPool, date, 3);
  return fillToCount(dailyPool, dailyFallback, 3).map(toRecipeCard);
}

function buildCategoryRecipes(recipes, season, category, count, date) {
  const primaryPool = recipes
    .filter((item) => item.category === category)
    .map((item) => ({
      recipe: item,
      score: seasonalScore(item, season),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.recipe.minutes - b.recipe.minutes;
    })
    .map((item) => item.recipe);

  const fallbackPool = recipes
    .filter((item) => item.category === category)
    .sort((a, b) => a.minutes - b.minutes);

  const dailyPool = rotateForDay(primaryPool.slice(0, 8), date, 5);
  const dailyFallback = rotateForDay(fallbackPool, date, 7);
  return fillToCount(dailyPool, dailyFallback, count).map(toRecipeCard);
}

function buildHotRecipes(recipes, season) {
  const recipeMap = recipes.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const curated = season.hotIds.map((id) => recipeMap[id]).filter(Boolean);
  const fallback = recipes
    .filter((item) => item.category !== "甜品" && item.category !== "自制")
    .sort((a, b) => a.minutes - b.minutes);

  return fillToCount(curated, fallback, 4).map(toRecipeCard);
}

function buildLandingSections(recipes, date) {
  const currentDate = date || new Date();
  const season = detectSeason(currentDate);

  return {
    season: {
      key: season.key,
      title: season.title,
      subtitle: season.subtitle,
      headline: season.headline,
      description: season.description,
    },
    dayKey: getRecommendationDayKey(currentDate),
    seasonalRecipes: buildSeasonalRecipes(recipes, season, currentDate),
    soupRecipes: buildCategoryRecipes(recipes, season, "汤粥", 2, currentDate),
    dessertRecipes: buildCategoryRecipes(recipes, season, "甜品", 2, currentDate),
    hotRecipes: buildHotRecipes(recipes, season),
  };
}

module.exports = {
  buildLandingSections,
  detectSeason,
  getRecommendationDayKey,
};
