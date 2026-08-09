const store = require("../../utils/store");
const { getRecipesByIds } = require("../../utils/catalog");
const {
  recipeImage,
  hydrateImageList,
  isCloudFileId,
  fallbackImageAfterError,
} = require("../../utils/image");
const { buildRecipeProfile } = require("../../utils/recipe-profile");
const { generateRecipeImageIfMissing } = require("../../utils/ai-image");

/**
 * 将菜谱转换为完整做法页的展示结构。
 * @param {object} recipe 原始菜谱。
 * @param {string[]} ownedIds 当前订单的全部食材 ID。
 * @returns {object} 可直接渲染的菜谱详情。
 */
function serializeRecipe(recipe, ownedIds) {
  const profile = buildRecipeProfile(recipe, ownedIds);
  const image = recipeImage(recipe.id);
  const canUseDirectly = Boolean(image) && !isCloudFileId(image);
  return {
    ...recipe,
    image: image || "",
    hasImage: canUseDirectly,
    imageFailed: false,
    open: false,
    favorited: store.isFavoriteRecipe(recipe.id),
    caloriesText: profile.caloriesText,
    proteinText: profile.proteinText,
    nutritionCards: profile.nutritionCards,
    servingsText: profile.servingsText,
    cookingMethod: profile.cookingMethod,
    flavorTags: profile.flavorTags,
    suitableTags: profile.suitableTags,
    swapLines: profile.swapLines,
    conditionAdvice: profile.conditionAdvice,
    ingredientLines: profile.ingredientLines,
    baseSeasoningLines: profile.baseSeasoningLines,
    stepLines: recipe.steps.map((step, index) => ({
      id: `${recipe.id}-${index}`,
      text: `${index + 1}. ${step}`,
    })),
  };
}

Page({
  data: {
    orderId: "",
    recipeIds: [],
    sharedSource: false,
    recipes: [],
  },

  /**
   * 保存来源订单 ID 和分享传入的菜谱 ID 列表。
   * @param {object} options 页面路由参数。
   * @returns {void}
   */
  onLoad(options) {
    const rawRecipeIds = options && options.recipeIds
      ? decodeURIComponent(options.recipeIds)
      : "";
    const recipeIds = rawRecipeIds
      ? rawRecipeIds.split(",").filter(Boolean)
      : [];
    this.setData({
      orderId: options && options.orderId ? decodeURIComponent(options.orderId) : "",
      recipeIds,
      sharedSource: recipeIds.length > 0,
    });
  },

  /**
   * 加载指定订单；无指定订单时沿用最近提交记录或分享传入的菜谱。
   * @returns {void}
   */
  onShow() {
    const sharedIds = this.data.recipeIds || [];
    const order = !sharedIds.length && this.data.orderId
      ? store.getOrderById(this.data.orderId)
      : null;
    const pickedIds = sharedIds.length
      ? sharedIds
      : order
        ? (order.recipe_ids || [])
        : store.getPickedRecipes();
    const fallbackOrder = !pickedIds.length ? store.getLastOrder() : null;
    const sourceOrder = order || fallbackOrder;
    const effectiveIds = pickedIds.length
      ? pickedIds
      : (fallbackOrder ? (fallbackOrder.recipe_ids || []) : []);
    const ownedIds = sourceOrder
      ? (sourceOrder.all_ingredient_ids || sourceOrder.owned_ingredient_ids || sourceOrder.ingredient_ids || [])
      : store.getAllIngredientIds();
    const recipes = getRecipesByIds(effectiveIds).map((item) =>
      serializeRecipe(item, ownedIds),
    );

    this.setData({
      recipes,
    });

    hydrateImageList(recipes).then((nextRecipes) => {
      this.setData({
        recipes: nextRecipes,
      });
    });
  },

  onShareAppMessage() {
    const recipeIds = this.data.recipes.map((item) => item.id);
    const sharedIds = this.data.recipeIds || [];
    const allIds = Array.from(new Set(sharedIds.concat(recipeIds)));
    const title = recipeIds.length
      ? `${recipeIds.map((id) => {
          const recipe = getRecipesByIds([id])[0];
          return recipe ? recipe.title : "";
        }).filter(Boolean).join("、")} 的做法`
      : "来看看这些菜的做法";
    return {
      title,
      path: `/pages/recipes/index?recipeIds=${encodeURIComponent(allIds.join(","))}`,
    };
  },

  toggleRecipeDetail(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    const next = this.data.recipes.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return Object.assign({}, item, {
        open: !item.open,
      });
    });
    this.setData({
      recipes: next,
    });
  },

  toggleFavorite(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    store.toggleFavoriteRecipe(id);
    const next = this.data.recipes.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return Object.assign({}, item, {
        favorited: !item.favorited,
      });
    });
    this.setData({
      recipes: next,
    });
    wx.showToast({
      title: next.find((item) => item.id === id).favorited ? "已收藏" : "已取消收藏",
      icon: "none",
    });
  },

  /**
   * 详情页菜谱图缺失时生成到云存储固定路径，并刷新当前菜谱卡片。
   * @param {string} id 菜谱 ID。
   * @returns {Promise<void>} 生成失败时保持兜底展示。
   */
  async generateRecipeImage(id) {
    const recipes = this.data.recipes || [];
    const recipe = recipes.find((item) => item.id === id);
    if (!recipe || recipe.imageGenerating) {
      return;
    }

    this.setData({
      recipes: recipes.map((item) => item.id === id
        ? Object.assign({}, item, { imageGenerating: true })
        : item),
    });

    try {
      const result = await generateRecipeImageIfMissing(recipe);
      const currentRecipes = this.data.recipes || [];
      this.setData({
        recipes: currentRecipes.map((item) => item.id === id
          ? Object.assign({}, item, {
              image: result.image,
              hasImage: Boolean(result.image),
              imageFailed: false,
              imageGenerating: false,
              fallbackImage: "",
            })
          : item),
      });
    } catch (error) {
      console.warn("[image] 菜谱详情图生成失败", { id, error });
      const currentRecipes = this.data.recipes || [];
      this.setData({
        recipes: currentRecipes.map((item) => item.id === id
          ? Object.assign({}, item, { imageGenerating: false, imageFailed: true })
          : item),
      });
    }
  },

  handleRecipeImageError(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    const next = this.data.recipes.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const fallback = fallbackImageAfterError(item);
      if (fallback) {
        return fallback;
      }
      return Object.assign({}, item, {
        imageFailed: true,
      });
    });
    this.setData({
      recipes: next,
    });
    this.generateRecipeImage(id);
  },
});
