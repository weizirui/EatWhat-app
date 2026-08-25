const { RECIPES } = require("../../data/recipes");
const {
  recipeImage,
  hydrateImageList,
  isCloudFileId,
  fallbackImageAfterError,
} = require("../../utils/image");
const store = require("../../utils/store");
const { getRecipesByIds } = require("../../utils/catalog");
const { generateRecipeImageIfMissing } = require("../../utils/ai-image");
const { getFrequentRecipes } = require("../../utils/frequent");
const {
  buildLandingSections,
  getRecommendationWeekKey,
} = require("../../utils/landing-recommend");

function toCard(recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    emoji: recipe.emoji,
    category: recipe.category,
    minutes: recipe.minutes,
    subtitle: `${recipe.category} · ${recipe.minutes} 分钟`,
  };
}

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

/**
 * 根据已选菜谱的类别分布，推荐一道缺失类别的菜。
 * @param {string[]} pickedIds 已选菜谱 ID。
 * @returns {object|null} 智能补菜推荐卡片对象。
 */
function buildSmartSuggestion(pickedIds) {
  if (!pickedIds || !pickedIds.length) {
    return null;
  }
  const pickedSet = new Set(pickedIds);
  const pickedRecipes = getRecipesByIds(pickedIds);
  const hasMeat = pickedRecipes.some((item) => item.category === "肉禽" || item.category === "海鲜");
  const hasVeg = pickedRecipes.some((item) => ["蔬菜", "减脂餐", "豆制品"].includes(item.category));
  const hasSoup = pickedRecipes.some((item) => item.category === "汤粥");

  let targetCategories;
  let hint;
  if (!hasMeat) {
    targetCategories = ["肉禽", "海鲜"];
    hint = "荤素搭配，再补一道肉菜";
  } else if (!hasVeg) {
    targetCategories = ["蔬菜", "减脂餐", "豆制品"];
    hint = "荤素搭配，再补一道素菜";
  } else if (!hasSoup) {
    targetCategories = ["汤粥"];
    hint = "有汤更圆满，再补一道汤";
  } else {
    return null;
  }

  const pool = RECIPES.filter(
    (item) => (
      targetCategories.includes(item.category)
      && item.id !== "chicken-soup"
      && !pickedSet.has(item.id)
    ),
  );
  if (!pool.length) {
    return null;
  }

  const scored = pool
    .map((item) => ({
      recipe: item,
      score:
        (item.category === targetCategories[0] ? 2 : 0) +
        (item.minutes <= 20 ? 1 : 0),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.recipe.minutes - b.recipe.minutes;
    });

  const best = scored[0].recipe;
  return Object.assign(toCard(best), { hint });
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
    frequentRecipes: [],
    smartSuggestion: null,
  },

  onLoad() {
    this.refreshRecommendations(new Date());
  },

  onShow() {
    const currentDate = new Date();
    if (this.data.recommendationWeekKey !== getRecommendationWeekKey(currentDate)) {
      this.refreshRecommendations(currentDate);
    }
    this.refreshUserState();
  },

  /**
   * 常吃菜和智能补菜依赖订单/已选菜谱，每次回页都重算。
   * @returns {void}
   */
  refreshUserState() {
    const frequentRecipes = withImages(
      getFrequentRecipes(4).map(toCard),
    );
    const smartSuggestion = buildSmartSuggestion(store.getPickedRecipes());
    const smartCard = smartSuggestion
      ? withImages([smartSuggestion])[0]
      : null;

    this.setData({
      frequentRecipes,
      smartSuggestion: smartCard,
    });

    if (frequentRecipes.length) {
      hydrateImageList(frequentRecipes).then((nextList) => {
        this.setData({
          frequentRecipes: nextList,
        });
      });
    }
    if (smartCard) {
      hydrateImageList([smartCard]).then((nextList) => {
        this.setData({
          smartSuggestion: nextList[0] || null,
        });
      });
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

  pickRecipe(event) {
    const { id } = event.currentTarget.dataset;
    store.setPickedRecipes([id]);
    wx.navigateTo({
      url: "/pages/match/index",
    });
  },

  /**
   * 把常吃菜加入已选菜谱，不回页、原地刷新。
   * @param {object} event 点击事件。
   * @returns {void}
   */
  pickFrequent(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    store.addPickedRecipes([id]);
    this.refreshUserState();
    wx.showToast({
      title: "已加入采购清单",
      icon: "none",
    });
  },

  /**
   * 把智能补菜推荐加入已选菜谱。
   * @param {object} event 点击事件。
   * @returns {void}
   */
  pickSmart(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    store.addPickedRecipes([id]);
    this.refreshUserState();
    wx.showToast({
      title: "已补进采购清单",
      icon: "none",
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

  handleFrequentImageError(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({
      frequentRecipes: markFailed(this.data.frequentRecipes, id),
    });
    this.generateRecipeImageForList("frequentRecipes", id);
  },

  handleSmartImageError(event) {
    const id = event.currentTarget.dataset.id;
    if (!this.data.smartSuggestion || this.data.smartSuggestion.id !== id) {
      return;
    }
    const fallback = fallbackImageAfterError(this.data.smartSuggestion);
    this.setData({
      smartSuggestion: fallback || Object.assign({}, this.data.smartSuggestion, {
        imageFailed: true,
      }),
    });
    if (fallback) {
      return;
    }
    this.generateSmartImage(id);
  },

  /**
   * 智能补菜是单对象，图片缺失时单独生成到云存储并原地刷新。
   * @param {string} id 菜谱 ID。
   * @returns {Promise<void>} 生成失败时保持兜底展示。
   */
  async generateSmartImage(id) {
    const current = this.data.smartSuggestion;
    if (!current || current.id !== id || current.imageGenerating) {
      return;
    }
    const recipe = RECIPES.find((item) => item.id === id);
    if (!recipe) {
      return;
    }
    this.setData({
      smartSuggestion: Object.assign({}, current, { imageGenerating: true }),
    });
    try {
      const result = await generateRecipeImageIfMissing(recipe);
      const latest = this.data.smartSuggestion;
      this.setData({
        smartSuggestion: latest && latest.id === id
          ? Object.assign({}, latest, {
              image: result.image,
              hasImage: Boolean(result.image),
              imageFailed: false,
              imageGenerating: false,
              fallbackImage: "",
            })
          : latest,
      });
    } catch (error) {
      console.warn("[image] 智能补菜图生成失败", { id, error });
      const latest = this.data.smartSuggestion;
      this.setData({
        smartSuggestion: latest && latest.id === id
          ? Object.assign({}, latest, { imageGenerating: false, imageFailed: true })
          : latest,
      });
    }
  },
});
