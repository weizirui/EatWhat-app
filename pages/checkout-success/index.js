const store = require("../../utils/store");
const { getRecipesByIds, getIngredientsByIds } = require("../../utils/catalog");
const { callCloud } = require("../../utils/cloud");

/**
 * 统计订单中的菜谱和食材数量。
 * @param {object} order 订单记录。
 * @returns {object} 数量及展示文本。
 */
function buildOrderSummary(order) {
  const recipeCount = (order.recipe_ids || []).length;
  const ingredientCount = (order.all_ingredient_ids || order.ingredient_ids || []).length;
  return {
    recipeCount,
    ingredientCount,
    recipeCountText: `${recipeCount} 道菜`,
    ingredientCountText: `${ingredientCount} 项食材`,
  };
}

Page({
  data: {
    orderId: "",
    source: "submit",
    order: null,
    recipes: [],
    ownedIngredientsText: "",
    suggestedIngredientsText: "",
    allIngredientsText: "",
    recipeCountText: "",
    ingredientCountText: "",
    collabStatusText: "",
    retryingCollaboration: false,
  },

  /**
   * 根据入口设置订单编号和页面标题。
   * @param {object} options 页面路由参数。
   * @returns {void}
   */
  onLoad(options) {
    const source = options && options.source ? options.source : "submit";
    this.setData({
      orderId: options && options.id ? options.id : "",
      source,
    });
    wx.setNavigationBarTitle({
      title: source === "settings" ? "订单详情" : "提交成功",
    });
  },

  onShow() {
    const order = this.data.orderId
      ? store.getOrderById(this.data.orderId)
      : store.getLastOrder();
    const recipes = order ? getRecipesByIds(order.recipe_ids) : [];
    const ownedIngredientsText = order
      ? getIngredientsByIds(order.owned_ingredient_ids || order.ingredient_ids || [])
          .map((item) => `${item.emoji} ${item.name}`)
          .join("、")
      : "";
    const suggestedIngredientsText = order
      ? getIngredientsByIds(order.suggested_purchase_ids || [])
          .map((item) => `${item.emoji} ${item.name}`)
          .join("、")
      : "";
    const allIngredientsText = order
      ? getIngredientsByIds(order.all_ingredient_ids || order.ingredient_ids || [])
          .map((item) => `${item.emoji} ${item.name}`)
          .join("、")
      : "";
    const summary = order ? buildOrderSummary(order) : {
      recipeCountText: "",
      ingredientCountText: "",
    };
    const collabStatusText = order && ["failed", "pending"].includes(order.collab_status)
      ? "协作清单发送状态未确认，可以安全重试。"
      : "";

    this.setData({
      order,
      recipes,
      ownedIngredientsText,
      suggestedIngredientsText,
      allIngredientsText,
      recipeCountText: summary.recipeCountText,
      ingredientCountText: summary.ingredientCountText,
      collabStatusText,
    });
  },

  /**
   * 重试发送当前订单的协作采购清单。
   * @returns {Promise<void>} 发送结果和订单状态更新完成。
   */
  async retryCollaboration() {
    const order = this.data.order;
    if (!order || !order.receiver_openid || this.data.retryingCollaboration) {
      return;
    }
    this.setData({ retryingCollaboration: true });
    try {
      const recipes = getRecipesByIds(order.recipe_ids || []);
      const ingredients = getIngredientsByIds(order.all_ingredient_ids || order.ingredient_ids || []);
      const result = await callCloud("submit_collab_order", {
        orderId: order.id,
        receiverOpenid: order.receiver_openid,
        recipeIds: order.recipe_ids || [],
        ingredientIds: ingredients.map((item) => item.id),
        recipeNames: recipes.map((item) => item.title),
        ingredientNames: ingredients.map((item) => item.name),
      });
      if (!result.ok) {
        throw new Error(result.reason || "submit_collab_order_failed");
      }
      const nextOrder = Object.assign({}, order, {
        collab_status: Number(result.recipientCount || 0) > 0 ? "sent" : "self",
        recipient_count: Number(result.recipientCount || 0),
      });
      store.saveOrder(nextOrder);
      this.setData({
        order: nextOrder,
        collabStatusText: "",
        retryingCollaboration: false,
      });
      wx.showToast({
        title: "协作清单已发送",
        icon: "none",
      });
    } catch (error) {
      this.setData({ retryingCollaboration: false });
      wx.showToast({
        title: "发送仍失败，请稍后重试",
        icon: "none",
      });
    }
  },

  goHome() {
    wx.reLaunch({
      url: "/pages/home/index",
    });
  },

  /**
   * 查看当前订单对应的完整做法。
   * @returns {void}
   */
  goRecipes() {
    const query = this.data.order && this.data.order.id
      ? `?orderId=${encodeURIComponent(this.data.order.id)}`
      : "";
    wx.navigateTo({
      url: `/pages/recipes/index${query}`,
    });
  },

  /**
   * 返回设置页，避免从历史订单重复压入设置页面。
   * @returns {void}
   */
  goSettings() {
    if (this.data.source === "settings") {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({
      url: "/pages/settings/index",
    });
  },
});
