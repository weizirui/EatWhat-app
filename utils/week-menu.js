const { RECIPES } = require("../data/recipes");
const { buildMenuPlan } = require("./menu-plan");
const { detectSeason } = require("./landing-recommend");

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const SLOTS = [
  { name: "主食", categories: ["主食"], weight: 2, count: 1 },
  { name: "荤", categories: ["肉禽", "海鲜"], weight: 3, count: 2 },
  { name: "素", categories: ["蔬菜", "凉菜", "豆制品"], weight: 2, count: 2 },
  { name: "汤粥", categories: ["汤粥"], weight: 1, count: 1 },
];

const MAIN_CATEGORIES = ["主食", "肉禽", "海鲜", "蔬菜", "凉菜", "豆制品", "汤粥"];

/**
 * 计算某天从 epoch 起的序列日数，用于确定性轮转。
 * @param {Date} date 日期。
 * @returns {number} 序列日数。
 */
function getDaySerial(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

/**
 * 按每天的目标槽位为一天挑选菜谱。
 * @param {Date} date 当天日期。
 * @param {Set<string>} weekUsed 本周已使用的菜谱 ID。
 * @returns {{ids: string[], meta: object[]}} 选出的菜谱 ID 和每个菜谱的补充信息。
 */
function buildDayRecipes(date, weekUsed) {
  const season = detectSeason(date);
  const daySerial = getDaySerial(date);
  const picked = [];
  const used = new Set(weekUsed);
  const dayIngredients = [];

  const pools = MAIN_CATEGORIES.reduce((acc, category) => {
    acc[category] = RECIPES.filter((item) => item.category === category);
    return acc;
  }, {});

  const seasonScore = (recipe) => {
    const match = (recipe.ingredient_ids || []).filter((id) => season.ingredientIds.includes(id)).length;
    return match * 4 + (season.preferredCategories.includes(recipe.category) ? 2 : 0);
  };

  const pickOne = (candidates) => {
    if (!candidates.length) {
      return null;
    }
    const scored = candidates
      .filter((item) => !used.has(item.id))
      .map((item) => ({
        recipe: item,
        score: seasonScore(item) - dayIngredients.filter((id) => (item.ingredient_ids || []).includes(id)).length * 2,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.recipe.minutes - b.recipe.minutes;
      });
    if (!scored.length) {
      return null;
    }
    return scored[0].recipe;
  };

  SLOTS.forEach((slot, slotIndex) => {
    let filled = 0;
    const orderedCategories = slot.categories.slice().sort((a, b) => {
      const poolA = pools[a] || [];
      const poolB = pools[b] || [];
      return poolA.length - poolB.length;
    });

    orderedCategories.forEach((category) => {
      if (filled >= slot.count) {
        return;
      }
      const pool = pools[category] || [];
      const rotated = pool
        .slice()
        .sort((a, b) => a.minutes - b.minutes);
      const offset = (daySerial + slotIndex + filled) % Math.max(rotated.length, 1);
      const candidates = rotated.slice(offset).concat(rotated.slice(0, offset));
      const recipe = pickOne(candidates);
      if (recipe) {
        picked.push(recipe);
        used.add(recipe.id);
        dayIngredients.push(...(recipe.ingredient_ids || []));
        filled += 1;
      }
    });
  });

  if (picked.length < 5) {
    const fallbackPool = RECIPES
      .filter((item) => MAIN_CATEGORIES.includes(item.category))
      .slice()
      .sort((a, b) => a.minutes - b.minutes);
    fallbackPool.forEach((recipe) => {
      if (picked.length >= 5 || used.has(recipe.id)) {
        return;
      }
      picked.push(recipe);
      used.add(recipe.id);
      dayIngredients.push(...(recipe.ingredient_ids || []));
    });
  }

  return {
    ids: picked.map((item) => item.id),
    meta: picked.map((item) => ({
      id: item.id,
      title: item.title,
      emoji: item.emoji,
      category: item.category,
      minutes: item.minutes,
    })),
  };
}

/**
 * 生成以 startDate（默认今天）为起点的 7 天周菜单计划。
 * @param {Date} startDate 起始日期。
 * @returns {Array} 每天 { dateText, weekday, recipes, ingredients } 数组。
 */
function buildWeekPlan(startDate) {
  const current = startDate || new Date();
  const weekUsed = new Set();
  const days = [];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(current.getFullYear(), current.getMonth(), current.getDate() + i);
    const day = buildDayRecipes(date, weekUsed);
    const dayRecipeIds = day.ids;
    dayRecipeIds.forEach((id) => weekUsed.add(id));

    const plan = buildMenuPlan(dayRecipeIds);
    days.push({
      dateText: `${date.getMonth() + 1}月${date.getDate()}日`,
      weekday: WEEKDAY_NAMES[date.getDay()],
      recipes: day.meta,
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
