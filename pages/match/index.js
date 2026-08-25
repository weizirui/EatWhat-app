const store = require("../../utils/store");
const { buildMenuPlan } = require("../../utils/menu-plan");
const {
  generateOrderId,
  formatOrderTitle,
  formatTime,
} = require("../../utils/format");
const { getIngredientsByIds, setExtraRecipes } = require("../../utils/catalog");
const { callCloud } = require("../../utils/cloud");
const { callContainer } = require("../../utils/container");

function serializeRecipe(recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    emoji: recipe.emoji,
    category: recipe.category,
    minutes: recipe.minutes,
    difficulty: recipe.difficulty,
    ingredientText: getIngredientsByIds(recipe.ingredient_ids || [])
      .map((ingredient) => ingredient.name)
      .join("、"),
  };
}

function serializeIngredient(item) {
  return {
    id: item.id,
    name: item.name,
    emoji: item.emoji,
    count: item.count,
    countText: `x${item.count}`,
    recipeTitlesText: item.recipeTitles.join("、"),
  };
}

Page({
  data: {
    selectedRecipes: [],
    purchaseIngredients: [],
    selectedRecipesText: "",
    purchaseIngredientsText: "",
    recipeCount: 0,
    ingredientCount: 0,
    submitting: false,
    shareId: "",
    shareCreating: false,
    shareStatus: "pending",
    shareStatusText: "待采购",
    shareActionText: "我来买",
    shareParticipantText: "",
    shareUpdating: false,
    shareErrorText: "",
    sharedRecipeIds: [],
    sharedIngredientIds: [],
    sharedIngredientCounts: [],
    sharedIngredientNames: [],
    isShared: false,
  },

  /**
   * 记录分享入口参数，shareId 优先从云端读取清单。
   * @param {object} options 页面路由参数。
   * @returns {void}
   */
  onLoad(options) {
    const shareId = options && options.shareId ? decodeURIComponent(options.shareId) : "";
    const raw = options && options.recipeIds ? decodeURIComponent(options.recipeIds) : "";
    const sharedRecipeIds = raw ? raw.split(",").filter(Boolean) : [];
    this.setData({
      shareId,
      sharedRecipeIds,
      isShared: Boolean(shareId) || sharedRecipeIds.length > 0,
    });
  },

  /**
   * 刷新清单；分享入口从云端读取状态。
   * @returns {void}
   */
  onShow() {
    if (this.data.shareId && this.data.isShared) {
      this.loadSharedOrder();
      return;
    }
    this.refresh();
  },

  /**
   * 分享当前采购清单，优先使用可协作的 shareId。
   * @returns {object} 分享参数。
   */
  onShareAppMessage() {
    const recipeIds = this.data.selectedRecipes.map((item) => item.id);
    const shareQuery = this.data.shareId
      ? `shareId=${encodeURIComponent(this.data.shareId)}`
      : `recipeIds=${encodeURIComponent(recipeIds.join(","))}`;
    return {
      title: this.data.selectedRecipesText
        ? `采购清单：${this.data.selectedRecipesText}`
        : "分享采购清单",
      path: `/pages/match/index?${shareQuery}`,
    };
  },

  /**
   * 按状态生成共享清单展示文案。
   * @param {string} status 共享清单状态。
   * @param {string} claimantName 认领人名称。
   * @returns {object} 状态文案和按钮文案。
   */
  buildShareState(status, claimantName) {
    if (status === "completed") {
      return {
        shareStatusText: "已买好",
        shareActionText: "",
        shareParticipantText: claimantName ? `${claimantName} 已完成采购` : "采购已完成",
      };
    }
    if (status === "purchasing") {
      return {
        shareStatusText: "采购中",
        shareActionText: "已买好",
        shareParticipantText: claimantName ? `${claimantName} 正在采购` : "有人正在采购",
      };
    }
    return {
      shareStatusText: "待采购",
      shareActionText: "我来买",
      shareParticipantText: "",
    };
  },

  refresh() {
    setExtraRecipes(store.getTemporaryRecipes());
    const selectedRecipeIds = this.data.isShared
      ? this.data.sharedRecipeIds
      : store.getPickedRecipes();
    const plan = buildMenuPlan(selectedRecipeIds, store.getTemporaryRecipes());
    const selectedRecipes = plan.recipes.map(serializeRecipe);
    const purchaseIngredients = this.data.isShared && this.data.sharedIngredientIds.length
      ? this.data.sharedIngredientIds.map((id, index) => {
          const ingredient = getIngredientsByIds([id])[0] || {};
          const count = this.data.sharedIngredientCounts[index] || 1;
          return {
            id,
            name: this.data.sharedIngredientNames[index] || ingredient.name || id,
            emoji: ingredient.emoji || "",
            count,
            countText: `x${count}`,
            recipeTitlesText: selectedRecipes.map((item) => item.title).join("、"),
          };
        })
      : plan.ingredients.map(serializeIngredient);
    const selectedRecipesText = plan.recipes.map((item) => `${item.emoji} ${item.title}`).join("、");
    const purchaseIngredientsText = plan.ingredients.map((item) => `${item.emoji} ${item.name} x${item.count}`).join("、");

    this.setData({
      selectedRecipes,
      purchaseIngredients,
      selectedRecipesText,
      purchaseIngredientsText,
      recipeCount: selectedRecipes.length,
      ingredientCount: purchaseIngredients.length,
    }, () => {
      if (!this.data.isShared) {
        this.ensureShareOrder();
      }
    });

    if (!this.data.isShared) {
      this.loadRemoteIngredients(selectedRecipeIds);
    }
  },

  /**
   * 为当前清单创建云端共享记录，分享时直接携带 shareId。
   * @returns {Promise<void>} 创建失败时保留 recipeIds 分享兜底。
   */
  async ensureShareOrder() {
    if (this.data.isShared || this.data.shareId || this.data.shareCreating || !this.data.recipeCount) {
      return;
    }
    this.setData({ shareCreating: true, shareErrorText: "" });
    try {
      const result = await callCloud("create_shared_order", {
        recipeIds: this.data.selectedRecipes.map((item) => item.id),
        ingredientIds: this.data.purchaseIngredients.map((item) => item.id),
        ingredientCounts: this.data.purchaseIngredients.map((item) => item.count || 1),
        recipeNames: this.data.selectedRecipes.map((item) => item.title),
        ingredientNames: this.data.purchaseIngredients.map((item) => item.name),
        temporaryRecipes: store.getTemporaryRecipes().filter((recipe) => (
          this.data.selectedRecipes.some((item) => item.id === recipe.id)
        )),
        creatorName: store.getSettings().contactName || store.getSettings().collabDisplayName || "",
      });
      if (!result.ok) {
        throw new Error(result.reason || "create_shared_order_failed");
      }
      this.setData({
        shareId: result.shareId,
        shareCreating: false,
      });
    } catch (error) {
      this.setData({
        shareCreating: false,
        shareErrorText: "分享协作暂时不可用，可继续使用普通分享",
      });
    }
  },

  /**
   * 读取朋友分享的云端采购清单和采购状态。
   * @returns {Promise<void>} 清单读取完成后刷新页面展示。
   */
  async loadSharedOrder() {
    try {
      const result = await callCloud("get_shared_order", {
        shareId: this.data.shareId,
      });
      if (!result.ok) {
        throw new Error(result.reason || "get_shared_order_failed");
      }
      const order = result.order || {};
      if (Array.isArray(order.temporaryRecipes) && order.temporaryRecipes.length) {
        store.saveTemporaryRecipes(order.temporaryRecipes);
      }
      const state = this.buildShareState(order.status || "pending", order.claimantName || "");
      this.setData({
        sharedRecipeIds: order.recipeIds || [],
        sharedIngredientIds: order.ingredientIds || [],
        sharedIngredientCounts: order.ingredientCounts || [],
        sharedIngredientNames: order.ingredientNames || [],
        shareStatus: order.status || "pending",
        shareErrorText: "",
        ...state,
      });
      this.refresh();
    } catch (error) {
      this.setData({
        shareErrorText: "分享清单暂时无法加载",
        sharedRecipeIds: [],
      });
      this.refresh();
    }
  },

  /**
   * 分享接收人推进采购状态。
   * @returns {Promise<void>} 状态更新并重新加载清单。
   */
  async updateShareStatus() {
    if (!this.data.shareId || this.data.shareUpdating || !this.data.shareActionText) {
      return;
    }
    const nextStatus = this.data.shareStatus === "pending" ? "purchasing" : "completed";
    this.setData({ shareUpdating: true });
    try {
      const settings = store.getSettings();
      const result = await callCloud("update_shared_order_status", {
        shareId: this.data.shareId,
        status: nextStatus,
        displayName: settings.contactName || settings.collabDisplayName || "",
      });
      if (!result.ok) {
        throw new Error(result.reason || "update_shared_order_status_failed");
      }
      await this.loadSharedOrder();
      wx.showToast({
        title: nextStatus === "completed" ? "已标记买好" : "已认领采购",
        icon: "none",
      });
    } catch (error) {
      wx.showToast({
        title: "状态更新失败，请重试",
        icon: "none",
      });
    } finally {
      this.setData({ shareUpdating: false });
    }
  },

  /**
   * 使用云托管按菜谱重新聚合采购食材。
   * @param {string[]} recipeIds 当前选中的菜谱 ID。
   * @returns {Promise<void>} 云托管失败时保留本地计算结果。
   */
  async loadRemoteIngredients(recipeIds) {
    try {
      const response = await callContainer("/api/generate-ingredients", {
        recipeIds,
      });
      const payload = response && response.data ? response.data : response;
      const remoteItems = payload && Array.isArray(payload.ingredients)
        ? payload.ingredients
        : [];
      if (!remoteItems.length) {
        return;
      }

      // 后端返回的聚合结果转换成当前采购清单的展示结构。
      const purchaseIngredients = remoteItems.map((item) => ({
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        count: item.count,
        countText: `x${item.count}`,
        recipeTitles: item.recipeTitles || [],
        recipeTitlesText: (item.recipeTitles || []).join("、"),
      }));
      this.setData({
        purchaseIngredients,
        ingredientCount: purchaseIngredients.length,
        purchaseIngredientsText: purchaseIngredients
          .map((item) => `${item.emoji} ${item.name} x${item.count}`)
          .join("、"),
      });
    } catch (error) {
      // 云托管不可用时继续使用上方本地计算结果，保证核心点菜流程可用。
      console.warn("[container] 生成采购食材失败，沿用本地结果", error);
    }
  },

  /**
   * 保存采购清单到本机订单。
   * @returns {Promise<void>} 提交结束后进入订单详情页。
   */
  async submitOrder() {
    if (this.data.submitting) {
      return;
    }
    if (this.data.isShared) {
      wx.showToast({
        title: "分享清单不能重复提交",
        icon: "none",
      });
      return;
    }
    const selectedRecipeIds = store.getPickedRecipes();
    if (!selectedRecipeIds.length) {
      wx.showToast({
        title: "先选几道菜",
        icon: "none",
      });
      return;
    }

    const plan = buildMenuPlan(selectedRecipeIds, store.getTemporaryRecipes());
    const createdAt = new Date();
    const orderId = generateOrderId();
    const order = {
      id: orderId,
      title: formatOrderTitle(createdAt),
      recipe_ids: selectedRecipeIds,
      ingredient_ids: plan.ingredients.map((item) => item.id),
      all_ingredient_ids: plan.ingredients.map((item) => item.id),
      created_at: formatTime(createdAt),
      status: "submitted",
      channel: "local_order",
      share_id: this.data.shareId,
      collab_status: this.data.shareId ? "shared" : "self",
    };

    this.setData({ submitting: true });
    store.saveOrder(order);
    wx.showToast({
      title: "采购单已生成",
      icon: "none",
    });

    store.clearPickedRecipes();
    this.setData({ submitting: false });

    wx.navigateTo({
      url: "/pages/checkout-success/index",
    });
  },

  goRecipes() {
    wx.navigateTo({
      url: "/pages/recipes/index",
    });
  },

});
