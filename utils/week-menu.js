const { RECIPES } = require("../data/recipes");
const { buildMenuPlan } = require("./menu-plan");
const { detectSeason } = require("./landing-recommend");

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const HIDDEN_CATEGORIES = new Set(["甜品", "自制"]);
const HIDDEN_RECIPE_IDS = new Set(["chicken-soup"]);
const CARB_INGREDIENT_IDS = new Set(["rice", "corn", "sweet_potato", "potato", "taro", "noodle"]);
const BREAKFAST_IDS = [
  "pumpkin-congee",
  "shrimp-congee",
  "mianxian-paste",
  "xiamen-seafood-congee",
  "tong-an-duck-congee",
  "seafood-congee",
  "chicken-congee",
  "corn-egg-soup",
  "tomato-egg-noodle",
  "fresh-meat-wonton",
];
const LOCAL_SEAFOOD_IDS = new Set([
  "xiamen-oyster-omelette",
  "seaweed-oyster-soup",
  "ginger-scallion-baby-squid",
  "blanched-baby-squid",
  "steamed-threadfin-fish",
  "soy-threadfin-fish",
  "panfried-threadfin-fish",
  "steamed-yellowfin-seabream",
  "soy-yellowfin-seabream",
  "panfried-yellowfin-seabream",
  "steamed-grouper",
  "panfried-spanish-mackerel",
  "ginger-clam-soup",
  "xiamen-seafood-congee",
]);

function getDaySerial(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function stableHash(text) {
  return String(text).split("").reduce(
    (result, char) => ((result * 31) + char.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

function isVisibleRecipe(recipe) {
  return Boolean(
    recipe
    && !HIDDEN_CATEGORIES.has(recipe.category)
    && !HIDDEN_RECIPE_IDS.has(recipe.id),
  );
}

function hasCarb(recipe) {
  return (recipe.ingredient_ids || []).some((id) => CARB_INGREDIENT_IDS.has(id));
}

function seasonScore(recipe, season) {
  const ingredientMatches = (recipe.ingredient_ids || [])
    .filter((id) => season.ingredientIds.includes(id)).length;
  return ingredientMatches * 4
    + (season.preferredCategories.includes(recipe.category) ? 2 : 0);
}

function pickRecipe(slot, date, generationSeed, weekUsed, dayUsed) {
  const season = detectSeason(date);
  const idPriority = new Map((slot.ids || []).map((id, index) => [id, index]));
  const basePool = RECIPES.filter((recipe) => (
    isVisibleRecipe(recipe)
    && (!(slot.ids || []).length || idPriority.has(recipe.id))
    && (!(slot.categories || []).length || slot.categories.includes(recipe.category))
    && (!slot.requireCarb || hasCarb(recipe))
  ));
  const available = basePool.filter((recipe) => !weekUsed.has(recipe.id) && !dayUsed.has(recipe.id));
  const candidates = available.length
    ? available
    : basePool.filter((recipe) => !dayUsed.has(recipe.id));

  return candidates
    .map((recipe) => ({
      recipe,
      score: seasonScore(recipe, season)
        + (LOCAL_SEAFOOD_IDS.has(recipe.id) && slot.preferLocalSeafood ? 10 : 0)
        + (idPriority.has(recipe.id) ? Math.max(0, 12 - idPriority.get(recipe.id)) : 0)
        + (slot.maxMinutes && recipe.minutes <= slot.maxMinutes ? 2 : 0),
      order: stableHash(`${recipe.id}:${getDaySerial(date)}:${generationSeed}:${slot.key}`),
    }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((item) => item.recipe)[0] || null;
}

function toRecipeItem(recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    emoji: recipe.emoji,
    category: recipe.category,
    minutes: recipe.minutes,
  };
}

function buildMeal(name, hint, slots, date, generationSeed, weekUsed, dayUsed) {
  const recipes = slots
    .map((slot) => pickRecipe(slot, date, generationSeed, weekUsed, dayUsed))
    .filter(Boolean);

  recipes.forEach((recipe) => {
    weekUsed.add(recipe.id);
    dayUsed.add(recipe.id);
  });

  return {
    id: name === "早餐" ? "breakfast" : (name === "午餐" ? "lunch" : "dinner"),
    name,
    hint,
    recipes: recipes.map(toRecipeItem),
  };
}

function buildDayMeals(date, dayIndex, generationSeed, weekUsed) {
  const dayUsed = new Set();
  const seafoodAtLunch = (dayIndex + generationSeed) % 2 === 0;
  const seafoodSlot = (key) => ({
    key,
    categories: ["海鲜"],
    preferLocalSeafood: true,
  });
  const meatSlot = (key) => ({ key, categories: ["肉禽"] });
  const vegetableSlot = (key) => ({
    key,
    categories: ["蔬菜", "豆制品", "减脂餐"],
  });

  return [
    buildMeal("早餐", "粥面为主，清淡好准备", [
      {
        key: "breakfast-main",
        ids: BREAKFAST_IDS,
        categories: ["汤粥", "主食"],
        maxMinutes: 30,
      },
    ], date, generationSeed, weekUsed, dayUsed),
    buildMeal("午餐", "主食、蛋白质和蔬菜", [
      {
        key: "lunch-carb",
        categories: ["减脂餐", "主食"],
        requireCarb: true,
      },
      seafoodAtLunch ? seafoodSlot("lunch-protein") : meatSlot("lunch-protein"),
      vegetableSlot("lunch-vegetable"),
    ], date, generationSeed, weekUsed, dayUsed),
    buildMeal("晚餐", "蛋白质、蔬菜和热汤", [
      seafoodAtLunch ? meatSlot("dinner-protein") : seafoodSlot("dinner-protein"),
      vegetableSlot("dinner-vegetable"),
      { key: "dinner-soup", categories: ["汤粥"], maxMinutes: 35 },
    ], date, generationSeed, weekUsed, dayUsed),
  ];
}

function buildWeekPlan(startDate, generationSeed) {
  const current = startDate || new Date();
  const seed = Number(generationSeed || 0);
  const weekUsed = new Set();
  const days = [];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(current.getFullYear(), current.getMonth(), current.getDate() + index);
    const meals = buildDayMeals(date, index, seed, weekUsed);
    const recipes = meals.flatMap((meal) => meal.recipes);
    const plan = buildMenuPlan(recipes.map((recipe) => recipe.id));

    days.push({
      id: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      dateText: `${date.getMonth() + 1}月${date.getDate()}日`,
      weekday: WEEKDAY_NAMES[date.getDay()],
      meals,
      recipes,
      ingredientCount: plan.ingredients.length,
      ingredients: plan.ingredients.map((item) => ({
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        count: item.count,
      })),
    });
  }

  return days;
}

module.exports = {
  buildWeekPlan,
  getDaySerial,
};
