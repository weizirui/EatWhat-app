const { RECIPES } = require("../../data/recipes");
const {
  recipeImage,
  hydrateImageList,
  isCloudFileId,
  fallbackImageAfterError,
} = require("../../utils/image");
const store = require("../../utils/store");
const { generateRecipeImageIfMissing } = require("../../utils/ai-image");
const {
  buildLandingSections,
  getRecommendationWeekKey,
} = require("../../utils/landing-recommend");

function withImages(list) {
  return list.map((item) => {
    const image = recipeImage(item.id);
    const canUseDirectly = Boolean(image) && !isCloudFileId(image);
    return {
      ...item,
      image: image || "",
      hasImage: canUseDirectly,
      imageFailed: false,
    };
  });
}

function markFailed(list, id) {
  return list.map((item) => {
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
}

Page({
  data: {
    plan: {},
    fatLossRecipes: [],
    soupRecipes: [],
    recommendationWeekKey: "",
  },

  onLoad() {
    this.refreshRecommendations(new Date());
  },

  onShow() {
    const currentDate = new Date();
    if (this.data.recommendationWeekKey !== getRecommendationWeekKey(currentDate)) {
      this.refreshRecommendations(currentDate);
    }
  },

  refreshRecommendations(date) {
    const landingSections = buildLandingSections(
      RECIPES.filter((item) => item.id !== "chicken-soup"),
      date,
    );
    const fatLossRecipes = withImages(landingSections.fatLossRecipes);
    const soupRecipes = withImages(landingSections.soupRecipes);

    this.setData({
      plan: landingSections.plan,
      fatLossRecipes,
      soupRecipes,
      recommendationWeekKey: landingSections.weekKey,
    });

    hydrateImageList(fatLossRecipes).then((nextList) => {
      this.setData({
        fatLossRecipes: nextList,
      });
    });
    hydrateImageList(soupRecipes).then((nextList) => {
      this.setData({
        soupRecipes: nextList,
      });
    });
  },

  goHome() {
    wx.navigateTo({
      url: "/pages/home/index",
    });
  },

  goSettings() {
    wx.navigateTo({
      url: "/pages/settings/index?source=manage",
    });
  },

  pickRecipe(event) {
    const { id } = event.currentTarget.dataset;
    store.setPickedRecipes([id]);
    wx.navigateTo({
      url: "/pages/match/index",
    });
  },

  /**
   * 推荐菜图片缺失时生成到云存储固定路径，并刷新当前推荐列表。
   * @param {string} listKey 页面 data 中的推荐列表字段。
   * @param {string} id 菜谱 ID。
   * @returns {Promise<void>} 生成失败时保持兜底展示。
   */
  async generateRecipeImageForList(listKey, id) {
    const list = this.data[listKey] || [];
    const recipe = list.find((item) => item.id === id) || RECIPES.find((item) => item.id === id);
    if (!recipe || recipe.imageGenerating) {
      return;
    }

    this.setData({
      [listKey]: list.map((item) => item.id === id
        ? Object.assign({}, item, { imageGenerating: true })
        : item),
    });

    try {
      const result = await generateRecipeImageIfMissing(recipe);
      const currentList = this.data[listKey] || [];
      this.setData({
        [listKey]: currentList.map((item) => item.id === id
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
      console.warn("[image] 推荐菜图生成失败", { id, error });
      const currentList = this.data[listKey] || [];
      this.setData({
        [listKey]: currentList.map((item) => item.id === id
          ? Object.assign({}, item, { imageGenerating: false, imageFailed: true })
          : item),
      });
    }
  },

  handleFatLossImageError(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({
      fatLossRecipes: markFailed(this.data.fatLossRecipes, id),
    });
    this.generateRecipeImageForList("fatLossRecipes", id);
  },

  handleSoupImageError(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({
      soupRecipes: markFailed(this.data.soupRecipes, id),
    });
    this.generateRecipeImageForList("soupRecipes", id);
  },

});
