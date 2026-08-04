const store = require("./store");
const { getRecipesByIds } = require("./catalog");

/**
 * 从本地历史订单统计常吃菜谱 ID，按出现频次降序、去重。
 * @returns {string[]} 常吃菜谱 ID 数组。
 */
function getFrequentRecipeIds() {
  const countMap = new Map();
  store.getOrders().forEach((order) => {
    (order.recipe_ids || []).forEach((id) => {
      if (!id) {
        return;
      }
      countMap.set(id, (countMap.get(id) || 0) + 1);
    });
  });
  return Array.from(countMap.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0], "zh-Hans-CN");
    })
    .map((entry) => entry[0]);
}

/**
 * 取常吃菜谱对象列表。
 * @param {number} limit 最多返回数量。
 * @returns {Array} 菜谱对象数组。
 */
function getFrequentRecipes(limit) {
  return getRecipesByIds(getFrequentRecipeIds()).slice(0, limit || 4);
}

module.exports = {
  getFrequentRecipeIds,
  getFrequentRecipes,
};
