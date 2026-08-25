const { INGREDIENTS } = require("../data/ingredients");
const { callContainer } = require("./container");

const ingredientByName = new Map(INGREDIENTS.map((item) => [item.name, item]));

function safeText(value, fallback) {
  return String(value || fallback || "").trim();
}

function makeIdPart(text) {
  return safeText(text, "recipe")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "recipe";
}

function buildCustomIngredient(name, index) {
  const known = ingredientByName.get(name);
  if (known) {
    return {
      id: known.id,
      name: known.name,
      emoji: known.emoji,
      category_id: known.category_id,
    };
  }
  return {
    id: `ai-ingredient-${makeIdPart(name)}-${index}`,
    name,
    emoji: "🍽️",
    category_id: "custom",
  };
}

function normalizeRecipe(raw, keyword, index) {
  const title = safeText(raw && raw.title, `${keyword}家常菜`);
  const ingredientNames = Array.isArray(raw && raw.ingredientNames)
    ? raw.ingredientNames.map((item) => safeText(item)).filter(Boolean)
    : [keyword].filter(Boolean);
  const customIngredients = ingredientNames.map(buildCustomIngredient);
  return {
    id: safeText(raw && raw.id, `ai-${makeIdPart(keyword)}-${Date.now()}-${index}`),
    title,
    emoji: safeText(raw && raw.emoji, "🍽️"),
    category: safeText(raw && raw.category, "AI 推荐"),
    minutes: Number(raw && raw.minutes) || 20,
    difficulty: safeText(raw && raw.difficulty, "简单"),
    ingredient_ids: customIngredients.map((item) => item.id),
    custom_ingredients: customIngredients,
    base_seasonings: Array.isArray(raw && raw.baseSeasonings) ? raw.baseSeasonings : ["生抽", "盐"],
    steps: Array.isArray(raw && raw.steps) && raw.steps.length
      ? raw.steps
      : ["处理主食材", "按家常口味调味", "加热成熟后装盘"],
    tip: safeText(raw && raw.tip, "AI 生成菜谱建议按实际口味微调。"),
    aiGenerated: true,
  };
}

function buildFallbackRecipes(keyword) {
  const name = safeText(keyword, "想吃的菜");
  return [
    {
      title: `蒜蓉${name}`,
      emoji: "🧄",
      category: "AI 推荐",
      minutes: 18,
      difficulty: "简单",
      ingredientNames: [name, "蒜", "葱"],
      baseSeasonings: ["生抽", "蚝油", "食用油"],
      steps: [`${name}处理干净`, "蒜蓉炒香调味", "铺上蒜蓉后蒸熟或炒熟", "撒葱花出锅"],
      tip: "蒜蓉不要炒糊，香味出来就可以。",
    },
    {
      title: `${name}汤`,
      emoji: "🥣",
      category: "AI 推荐",
      minutes: 35,
      difficulty: "简单",
      ingredientNames: [name, "姜", "葱"],
      baseSeasonings: ["盐", "白胡椒"],
      steps: [`${name}处理干净`, "姜片爆香后加水", "放入主食材小火煮熟", "加盐和白胡椒调味"],
      tip: "汤品口味保持清淡，主食材鲜味会更明显。",
    },
    {
      title: `蚝油${name}捞饭`,
      emoji: "🍚",
      category: "AI 推荐",
      minutes: 22,
      difficulty: "中等",
      ingredientNames: [name, "米饭", "姜", "葱"],
      baseSeasonings: ["蚝油", "生抽", "淀粉"],
      steps: ["米饭提前准备好", `${name}处理后焯水或煎香`, "蚝油生抽加水淀粉熬成汁", "浇在米饭和主食材上"],
      tip: "芡汁不要太厚，能挂住米饭即可。",
    },
  ].map((item, index) => normalizeRecipe(item, name, index));
}

/**
 * 根据用户想吃的关键词生成 3 道临时菜谱。
 * @param {string} keyword 用户输入，如“鲍鱼”。
 * @returns {Promise<object[]>} 可进入点菜流程的临时菜谱。
 */
async function suggestAiRecipes(keyword) {
  const safeKeyword = safeText(keyword);
  if (!safeKeyword) {
    throw new Error("keyword_required");
  }
  try {
    const result = await callContainer("/api/ai/recipes/suggest", {
      keyword: safeKeyword,
      count: 3,
    });
    const recipes = Array.isArray(result && result.recipes) ? result.recipes : [];
    if (recipes.length) {
      return recipes.slice(0, 3).map((item, index) => normalizeRecipe(item, safeKeyword, index));
    }
  } catch (error) {
    console.warn("[ai-recipes] 后端生成失败，使用本地兜底", error);
  }
  return buildFallbackRecipes(safeKeyword);
}

module.exports = {
  suggestAiRecipes,
};
