const store = require("../../utils/store");
const { buildMenuPlan } = require("../../utils/menu-plan");
const {
  generateOrderId,
  formatTime,
} = require("../../utils/format");
const { buildRecipeProfile } = require("../../utils/recipe-profile");
const { getIngredientsByIds } = require("../../utils/catalog");
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

function serializePicked(recipe, allIngredientIds) {
  const profile = buildRecipeProfile(recipe, allIngredientIds);
  return {
    id: recipe.id,
    title: recipe.title,
    emoji: recipe.emoji,
    caloriesText: profile.caloriesText,
    proteinText: profile.proteinText,
    servingsText: profile.servingsText,
    cookingMethod: profile.cookingMethod,
    flavorTags: profile.flavorTags,
    suitableTags: profile.suitableTags,
    swapLines: profile.swapLines.slice(0, 2),
    conditionAdvice: profile.conditionAdvice.slice(0, 2),
    ingredientLines: profile.ingredientLines,
    baseSeasoningLines: profile.baseSeasoningLines,
    stepLines: recipe.steps.map((step, index) => ({
      id: `${recipe.id}-step-${index}`,
      text: `${index + 1}. ${step}`,
    })),
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
    pickedPanelOpen: false,
    pickedPanelClass: "picked-sheet",
    pickedTabs: [],
    activePickedId: "",
    activePickedDetail: null,
    submitting: false,
    collaborators: [],
    collaboratorsLoading: false,
    collaboratorsError: "",
    selectedReceiverOpenid: "",
    selectedReceiverName: "仅自己保存",
  },

  /**
   * 刷新清单并加载可指派的协作人。
   * @returns {void}
   */
  onShow() {
    this.refresh();
    this.loadCollaborators();
  },

  /**
   * 加载协作人并恢复仍然有效的默认采购人。
   * @returns {Promise<void>} 协作人选项更新完成。
   */
  async loadCollaborators() {
    this.setData({
      collaboratorsLoading: true,
      collaboratorsError: "",
    });
    try {
      const result = await callCloud("list_collaborators");
      if (!result.ok) {
        throw new Error(result.reason || "list_collaborators_failed");
      }
      const collaborators = result.collaborators || [];
      const defaultReceiverOpenid = store.getSettings().defaultReceiverOpenid || "";
      const selectedOpenid = this.data.selectedReceiverOpenid || defaultReceiverOpenid;
      const selected = collaborators.find((item) => item.partnerOpenid === selectedOpenid);
      const normalizedCollaborators = collaborators.map((item) => Object.assign({}, item, {
        className: selected && selected.partnerOpenid === item.partnerOpenid
          ? "receiver-option receiver-option-active"
          : "receiver-option",
      }));

      if (defaultReceiverOpenid && !collaborators.some((item) => item.partnerOpenid === defaultReceiverOpenid)) {
        store.updateSettings({ defaultReceiverOpenid: "" });
      }
      this.setData({
        collaborators: normalizedCollaborators,
        collaboratorsLoading: false,
        selectedReceiverOpenid: selected ? selected.partnerOpenid : "",
        selectedReceiverName: selected ? selected.partnerName || "协作人" : "仅自己保存",
      });
    } catch (error) {
      this.setData({
        collaborators: [],
        collaboratorsLoading: false,
        collaboratorsError: "协作人暂时无法加载，本次清单将仅保存给自己",
        selectedReceiverOpenid: "",
        selectedReceiverName: "仅自己保存",
      });
    }
  },

  /**
   * 选择本次清单的唯一接收人。
   * @param {object} event 包含接收人 OpenID 和名称。
   * @returns {void}
   */
  selectReceiver(event) {
    const openid = event.currentTarget.dataset.openid || "";
    const name = event.currentTarget.dataset.name || "仅自己保存";
    this.setData({
      selectedReceiverOpenid: openid,
      selectedReceiverName: name,
      collaborators: this.data.collaborators.map((item) => Object.assign({}, item, {
        className: item.partnerOpenid === openid
          ? "receiver-option receiver-option-active"
          : "receiver-option",
      })),
    });
  },

  refresh() {
    const selectedRecipeIds = store.getPickedRecipes();
    const plan = buildMenuPlan(selectedRecipeIds);
    const selectedRecipes = plan.recipes.map(serializeRecipe);
    const purchaseIngredients = plan.ingredients.map(serializeIngredient);
    const selectedRecipesText = plan.recipes.map((item) => `${item.emoji} ${item.title}`).join("、");
    const purchaseIngredientsText = plan.ingredients.map((item) => `${item.emoji} ${item.name} x${item.count}`).join("、");

    const activePickedId =
      this.data.activePickedId && selectedRecipeIds.includes(this.data.activePickedId)
        ? this.data.activePickedId
        : (selectedRecipeIds[0] || "");
    const pickedTabs = selectedRecipes.map((item) => ({
      id: item.id,
      title: item.title,
      emoji: item.emoji,
      className: item.id === activePickedId ? "picked-tab picked-tab-active" : "picked-tab",
    }));
    const activePickedDetail = plan.recipes
      .map((item) => serializePicked(item, plan.ingredients.map((entry) => entry.id)))
      .find((item) => item.id === activePickedId) || null;
    const pickedPanelOpen = selectedRecipeIds.length === 0 ? false : this.data.pickedPanelOpen;

    this.setData({
      selectedRecipes,
      purchaseIngredients,
      selectedRecipesText,
      purchaseIngredientsText,
      recipeCount: selectedRecipes.length,
      ingredientCount: purchaseIngredients.length,
      pickedTabs,
      activePickedId,
      activePickedDetail,
      pickedPanelOpen,
      pickedPanelClass: pickedPanelOpen ? "picked-sheet picked-sheet-open" : "picked-sheet",
    });

    this.loadRemoteIngredients(selectedRecipeIds);
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

  closePickedPanel() {
    this.setData({
      pickedPanelOpen: false,
      pickedPanelClass: "picked-sheet",
    });
  },

  togglePickedPanel() {
    if (!this.data.recipeCount) {
      wx.showToast({
        title: "先选菜谱",
        icon: "none",
      });
      return;
    }
    const nextOpen = !this.data.pickedPanelOpen;
    this.setData({
      pickedPanelOpen: nextOpen,
      pickedPanelClass: nextOpen ? "picked-sheet picked-sheet-open" : "picked-sheet",
    });
  },

  setActivePicked(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    this.setData({
      activePickedId: id,
    });
    this.refresh();
  },

  /**
   * 保存采购清单并同步给已绑定协作人。
   * @returns {Promise<void>} 提交结束后进入订单详情页。
   */
  async submitOrder() {
    if (this.data.submitting) {
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

    const plan = buildMenuPlan(selectedRecipeIds);
    const orderId = generateOrderId();
    const recipeNames = plan.recipes.map((item) => item.title);
    const ingredientNames = plan.ingredients.map((item) => item.name);
    const order = {
      id: orderId,
      recipe_ids: selectedRecipeIds,
      ingredient_ids: plan.ingredients.map((item) => item.id),
      all_ingredient_ids: plan.ingredients.map((item) => item.id),
      created_at: formatTime(new Date()),
      status: "submitted",
      channel: "local_order",
      receiver_openid: this.data.selectedReceiverOpenid,
      receiver_name: this.data.selectedReceiverName,
      collab_status: this.data.selectedReceiverOpenid ? "pending" : "self",
    };

    this.setData({ submitting: true });
    // 先保存本机记录，协作通知失败时用户仍可回看采购清单。
    store.saveOrder(order);
    try {
      const result = await callCloud("submit_collab_order", {
        orderId,
        receiverOpenid: this.data.selectedReceiverOpenid,
        recipeIds: selectedRecipeIds,
        ingredientIds: plan.ingredients.map((item) => item.id),
        recipeNames,
        ingredientNames,
      });
      if (!result.ok) {
        throw new Error(result.reason || "submit_collab_order_failed");
      }

      const recipientCount = Number(result.recipientCount || 0);
      store.saveOrder(Object.assign({}, order, {
        channel: "collab_order",
        collab_status: recipientCount > 0 ? "sent" : "self",
        recipient_count: recipientCount,
      }));
      wx.showToast({
        title: recipientCount > 0 ? `已发送给 ${this.data.selectedReceiverName}` : "已保存到我的订单",
        icon: "none",
      });
    } catch (error) {
      store.saveOrder(Object.assign({}, order, {
        collab_status: this.data.selectedReceiverOpenid ? "failed" : "self",
      }));
      wx.showToast({
        title: "清单已保存，协作通知失败",
        icon: "none",
      });
    }

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

