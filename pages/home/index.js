const { RECIPES } = require("../../data/recipes");
const store = require("../../utils/store");
const {
  recipeImage,
  ingredientImage,
  hydrateImageList,
  isCloudFileId,
  fallbackImageAfterError,
} = require("../../utils/image");
const { buildMenuPlan } = require("../../utils/menu-plan");
const { getIngredientsByIds } = require("../../utils/catalog");
const { generateRecipeImageIfMissing } = require("../../utils/ai-image");

function sortCategories(list) {
  return list.slice().sort((a, b) => a.sort - b.sort);
}

function normalizeKeyword(text) {
  return String(text || "").trim().toLowerCase();
}

function buildImageState(url) {
  const canUseDirectly = Boolean(url) && !isCloudFileId(url);
  return {
    image: url || "",
    hasImage: canUseDirectly,
    imageFailed: false,
  };
}

Page({
  data: {
    categories: [],
    activeCategory: "",
    recipes: [],
    selectedRecipeIds: [],
    selectedRecipes: [],
    purchaseIngredients: [],
    selectedRecipeCount: 0,
    totalIngredientCount: 0,
    searchQuery: "",
    resultHint: "",
    cartOpen: false,
    cartSheetClass: "cart-sheet",
    selectedPreviewText: "",
  },

  onLoad() {
    const categoryMap = new Map();
    RECIPES.forEach((item) => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          id: item.category,
          name: item.category,
          emoji: item.emoji,
          sort: categoryMap.size,
        });
      }
    });
    const categories = Array.from(categoryMap.values());
    this.setData({
      activeCategory: categories[0] ? categories[0].id : "",
      categories,
    });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const selectedRecipeIds = store.getPickedRecipes();
    const plan = buildMenuPlan(selectedRecipeIds);
    const activeCategory = this.data.activeCategory || (this.data.categories[0] && this.data.categories[0].id) || "";
    const searchQuery = normalizeKeyword(this.data.searchQuery);
    const categories = this.data.categories.map((item) => ({
      ...item,
      className: item.id === activeCategory ? "chip active" : "chip",
    }));
    const baseList = searchQuery
      ? RECIPES.filter((item) => {
          const text = `${item.title} ${item.category} ${(item.ingredient_ids || []).join(" ")} ${item.difficulty}`.toLowerCase();
          return text.includes(searchQuery);
        })
      : RECIPES.filter((item) => item.category === activeCategory);

    const recipes = baseList
      .slice()
      .sort((a, b) => {
        const aActive = selectedRecipeIds.includes(a.id) ? 1 : 0;
        const bActive = selectedRecipeIds.includes(b.id) ? 1 : 0;
        return bActive - aActive;
      })
      .map((item) => {
        const active = selectedRecipeIds.includes(item.id);
        return {
          ...item,
          active,
          className: active
            ? "ingredient-card ingredient-card-active"
            : "ingredient-card",
          stateText: active ? "已加入" : "点我加入",
          ingredientSummary: getIngredientsByIds(item.ingredient_ids || [])
            .slice(0, 3)
            .map((ingredient) => ingredient.name)
            .join("、"),
          ...buildImageState(recipeImage(item.id)),
          categoryName: item.category,
        };
      });

    const selectedRecipes = plan.recipes.map((item) => ({
      id: item.id,
      name: item.title,
      title: item.title,
      emoji: item.emoji,
      ...buildImageState(recipeImage(item.id)),
      metaText: [item.category, `${item.minutes} 分钟`, item.difficulty]
        .filter(Boolean)
        .join(" · "),
    }));

    const purchaseIngredients = plan.ingredients.map((item) => ({
      id: item.id,
      name: item.name,
      emoji: item.emoji,
      ...buildImageState(ingredientImage(item.id)),
      metaText: `用于 ${item.recipeTitles.slice(0, 2).join("、")}${item.recipeTitles.length > 2 ? " 等" : ""}`,
      countText: `x${item.count}`,
    }));

    const selectedPreviewText =
      plan.ingredients.length > 0
        ? `已选 ${selectedRecipeIds.length} 道，需买 ${plan.ingredients.length} 项`
        : "点开查看采购清单";

    this.setData({
      categories,
      selectedRecipeIds,
      selectedRecipes,
      purchaseIngredients,
      selectedRecipeCount: selectedRecipeIds.length,
      totalIngredientCount: plan.ingredients.length,
      selectedPreviewText,
      recipes,
      resultHint: searchQuery
        ? `共找到 ${recipes.length} 道和“${this.data.searchQuery}”相关的菜谱`
        : `${categories.find((item) => item.id === activeCategory)?.name || "当前分类"} · ${recipes.length} 道菜`,
      cartSheetClass: this.data.cartOpen ? "cart-sheet cart-sheet-open" : "cart-sheet",
    });

    hydrateImageList(recipes).then((nextRecipes) => {
      this.setData({
        recipes: nextRecipes,
      });
    });
    hydrateImageList(selectedRecipes).then((nextSelectedRecipes) => {
      this.setData({
        selectedRecipes: nextSelectedRecipes,
      });
    });
    hydrateImageList(purchaseIngredients).then((nextPurchaseIngredients) => {
      this.setData({
        purchaseIngredients: nextPurchaseIngredients,
      });
    });
  },

  setCategory(event) {
    const { id } = event.currentTarget.dataset;
    this.setData({
      activeCategory: id,
    });
    this.refresh();
  },

  toggleRecipe(event) {
    const { id } = event.currentTarget.dataset;
    store.togglePickedRecipe(id);
    this.refresh();
  },

  toggleCart() {
    if (this.data.selectedRecipeCount === 0) {
      wx.showToast({
        title: "还没有选菜谱",
        icon: "none",
      });
      return;
    }
    this.setData({
      cartOpen: !this.data.cartOpen,
      cartSheetClass: !this.data.cartOpen ? "cart-sheet cart-sheet-open" : "cart-sheet",
    });
  },

  closeCart() {
    this.setData({
      cartOpen: false,
      cartSheetClass: "cart-sheet",
    });
  },

  removeSelected(event) {
    const { id } = event.currentTarget.dataset;
    store.togglePickedRecipe(id);
    this.refresh();
  },

  updateSearch(event) {
    this.setData({
      searchQuery: event.detail.value,
    });
    this.refresh();
  },

  clearSearch() {
    this.setData({
      searchQuery: "",
    });
    this.refresh();
  },

  clearAll() {
    store.clearPickedRecipes();
    this.setData({
      cartOpen: false,
      cartSheetClass: "cart-sheet",
      selectedPreviewText: "点开查看采购清单",
    });
    this.refresh();
  },

  goMatch() {
    if (this.data.selectedRecipeCount === 0) {
      wx.showToast({
        title: "先选几道菜",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: "/pages/match/index",
    });
  },

  goSettings() {
    wx.navigateTo({
      url: "/pages/settings/index",
    });
  },

  markImageFailed(listKey, id) {
    if (!id) {
      return;
    }
    const nextList = (this.data[listKey] || []).map((item) => {
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
      [listKey]: nextList,
    });
  },

  /**
   * 菜谱图加载失败时生成到固定云存储路径，并刷新当前列表图片。
   * @param {string} listKey 页面 data 中的菜谱列表字段。
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
      console.warn("[image] 菜谱图生成失败", { id, error });
      const currentList = this.data[listKey] || [];
      this.setData({
        [listKey]: currentList.map((item) => item.id === id
          ? Object.assign({}, item, { imageGenerating: false, imageFailed: true })
          : item),
      });
    }
  },

  handleIngredientImageError(event) {
    const id = event.currentTarget.dataset.id;
    this.markImageFailed("recipes", id);
    this.generateRecipeImageForList("recipes", id);
  },

  handleOwnedImageError(event) {
    const id = event.currentTarget.dataset.id;
    this.markImageFailed("selectedRecipes", id);
    this.generateRecipeImageForList("selectedRecipes", id);
  },

  handleSuggestedImageError(event) {
    this.markImageFailed("purchaseIngredients", event.currentTarget.dataset.id);
  },
});
