const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 规范字符串数组，限制共享清单体积。
 * @param {unknown} value 原始数组。
 * @param {number} maxCount 最大元素数量。
 * @returns {string[]} 去空、去重后的字符串数组。
 */
function normalizeStringList(value, maxCount) {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)))
    .slice(0, maxCount);
}

/**
 * 规范数量数组，和食材列表按位置对应。
 * @param {unknown} value 原始数量数组。
 * @param {number} maxCount 最大元素数量。
 * @returns {number[]} 安全数量数组。
 */
function normalizeCountList(value, maxCount) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const count = Number(item || 1);
    return Number.isFinite(count) && count > 0 ? Math.min(Math.round(count), 99) : 1;
  }).slice(0, maxCount);
}

/**
 * 规范临时菜谱，只保存分享页需要的字段。
 * @param {unknown} value 原始菜谱数组。
 * @returns {object[]} 安全菜谱数组。
 */
function normalizeRecipePayloads(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 10).map((item) => ({
    id: String(item && item.id ? item.id : "").trim(),
    title: String(item && item.title ? item.title : "").trim(),
    emoji: String(item && item.emoji ? item.emoji : "🍽️").trim(),
    category: String(item && item.category ? item.category : "AI 推荐").trim(),
    minutes: Number(item && item.minutes) || 20,
    difficulty: String(item && item.difficulty ? item.difficulty : "简单").trim(),
    ingredient_ids: normalizeStringList(item && item.ingredient_ids, 30),
    custom_ingredients: Array.isArray(item && item.custom_ingredients)
      ? item.custom_ingredients.slice(0, 30).map((entry) => ({
          id: String(entry && entry.id ? entry.id : "").trim(),
          name: String(entry && entry.name ? entry.name : "").trim(),
          emoji: String(entry && entry.emoji ? entry.emoji : "🍽️").trim(),
          category_id: String(entry && entry.category_id ? entry.category_id : "custom").trim(),
        })).filter((entry) => entry.id && entry.name)
      : [],
    base_seasonings: normalizeStringList(item && item.base_seasonings, 20),
    steps: normalizeStringList(item && item.steps, 12),
    tip: String(item && item.tip ? item.tip : "").trim().slice(0, 120),
    aiGenerated: Boolean(item && item.aiGenerated),
  })).filter((item) => item.id && item.title);
}

/**
 * 生成短分享 ID，避免链接暴露数据库 _id。
 * @returns {string} 可放入小程序分享链接的 ID。
 */
function generateShareId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}${random}`;
}

/**
 * 创建无需绑定关系的共享采购清单。
 * @param {object} event 菜谱、食材、展示名和可选订单号。
 * @returns {Promise<object>} 分享 ID 和当前状态。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const orderId = String(event && event.orderId ? event.orderId : "").trim();
  const recipeIds = normalizeStringList(event && event.recipeIds, 60);
  const ingredientIds = normalizeStringList(event && event.ingredientIds, 180);
  const ingredientCounts = normalizeCountList(event && event.ingredientCounts, ingredientIds.length);
  const recipeNames = normalizeStringList(event && event.recipeNames, 60);
  const ingredientNames = normalizeStringList(event && event.ingredientNames, 180);
  const temporaryRecipes = normalizeRecipePayloads(event && event.temporaryRecipes);
  const creatorName = String(event && event.creatorName ? event.creatorName : "").trim().slice(0, 24);
  if (!recipeIds.length || !ingredientIds.length) {
    return { ok: false, reason: "invalid_share_order" };
  }

  const now = Date.now();
  const shareId = generateShareId();
  await db.collection("shared_orders").add({
    data: {
      share_id: shareId,
      order_id: orderId,
      creator_openid: OPENID,
      creator_name: creatorName || "分享人",
      recipe_ids: recipeIds,
      ingredient_ids: ingredientIds,
      ingredient_counts: ingredientIds.map((id, index) => ingredientCounts[index] || 1),
      recipe_names: recipeNames,
      ingredient_names: ingredientNames,
      temporary_recipes: temporaryRecipes,
      status: "pending",
      claimant_openid: "",
      claimant_name: "",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    ok: true,
    shareId,
    status: "pending",
  };
};
