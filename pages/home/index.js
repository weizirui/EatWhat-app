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
const { suggestAiRecipes } = require("../../utils/ai-recipes");

const HIDDEN_RECIPE_CATEGORIES = new Set(["甜品", "自制", "主食"]);
const HIDDEN_RECIPE_IDS = new Set(["chicken-soup"]);

function getVisibleRecipes() {
  return RECIPES.filter((item) => (
    !HIDDEN_RECIPE_IDS.has(item.id)
    && !HIDDEN_RECIPE_CATEGORIES.has(item.category)
  ));
}

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

/**
 * 合并菜谱自带图片和固定云存储图片路径。
 * @param {object} recipe 菜谱对象。
 * @returns {object} 页面图片状态。
 */
function buildRecipeImageState(recipe) {
  return buildImageState((recipe && recipe.image) || recipeImage(recipe && recipe.id));
}

Page({
  data: {
    categories: [],
    activeCategory: "",
    activeCategoryIndex: 0,
    activeCategoryName: "",
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
    favoriteCount: 0,
    favoritesFilterClass: "favorites-filter",
    favoritesFilterIcon: "♡",
    favoritesFilterText: "我的收藏",
    isFavoritesView: false,
    weekPlanOpen: false,
    aiRecipeOpen: false,
    aiKeyword: "",
    aiRecipeSuggestions: [],
    aiGenerating: false,
    aiErrorText: "",
  },

  onLoad() {
    const categoryMap = new Map();
    getVisibleRecipes().forEach((item) => {
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
      activeCategoryIndex: 0,
      activeCategoryName: categories[0] ? categories[0].name : "请选择分类",
      categories,
    });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const selectedRecipeIds = store.getPickedRecipes();
    const temporaryRecipes = store.getTemporaryRecipes();
    const favoriteIds = store.getFavoriteRecipes();
    const plan = buildMenuPlan(selectedRecipeIds, temporaryRecipes);
    const activeCategory = this.data.activeCategory || (this.data.categories[0] && this.data.categories[0].id) || "";
    const searchQuery = normalizeKeyword(this.data.searchQuery);
    const categories = this.data.categories.map((item) => ({
      ...item,
      className: item.id === activeCategory ? "chip active" : "chip",
    }));
    const visibleRecipes = getVisibleRecipes();
    const isFavorites = activeCategory === "favorites";
    const baseList = searchQuery
      ? visibleRecipes.filter((item) => {
          const text = `${item.title} ${item.category} ${(item.ingredient_ids || []).join(" ")} ${item.difficulty}`.toLowerCase();
          const matchesSearch = text.includes(searchQuery);
          return isFavorites
            ? matchesSearch && favoriteIds.includes(item.id)
            : matchesSearch;
        })
      : visibleRecipes.filter((item) =>
          isFavorites ? favoriteIds.includes(item.id) : item.category === activeCategory,
        );
    const aiRecipeSuggestions = (this.data.aiRecipeSuggestions || []).map((item) => {
      const active = selectedRecipeIds.includes(item.id);
      return Object.assign({}, item, {
        active,
        ingredientSummary: (item.custom_ingredients || [])
          .slice(0, 3)
          .map((ingredient) => ingredient.name)
          .join("、"),
        stateText: active ? "已加入" : "加入清单",
        stateClass: active
          ? "ai-recipe-action ai-recipe-action-active"
          : "ai-recipe-action",
        imageStatusText: item.imageGenerating ? "配图生成中" : "",
        ...buildRecipeImageState(item),
      });
    });

    const recipes = baseList
      .slice()
      .sort((a, b) => {
        const aActive = selectedRecipeIds.includes(a.id) ? 1 : 0;
        const bActive = selectedRecipeIds.includes(b.id) ? 1 : 0;
        return bActive - aActive;
      })
      .map((item) => {
        const active = selectedRecipeIds.includes(item.id);
        const favorited = favoriteIds.includes(item.id);
        return {
          ...item,
          active,
          favorited,
          className: active
            ? "ingredient-card ingredient-card-active"
            : "ingredient-card",
          stateText: active ? "已加入" : "点我加入",
          stateIcon: active ? "✓" : "+",
          stateClass: active
            ? "ingredient-action ingredient-action-add ingredient-action-active"
            : "ingredient-action ingredient-action-add",
          favoriteText: favorited ? "已收藏" : "收藏",
          favoriteIcon: favorited ? "♥" : "♡",
          favoriteClass: favorited
            ? "ingredient-action ingredient-action-favorite ingredient-action-favorite-active"
            : "ingredient-action ingredient-action-favorite",
          ingredientSummary: getIngredientsByIds(item.ingredient_ids || [])
            .slice(0, 3)
            .map((ingredient) => ingredient.name)
            .join("、"),
          ...buildRecipeImageState(item),
          categoryName: item.category,
        };
      });

    const selectedRecipes = plan.recipes.map((item) => ({
      id: item.id,
      name: item.title,
      title: item.title,
      emoji: item.emoji,
      ...buildRecipeImageState(item),
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
      favoriteCount: favoriteIds.length,
      favoritesFilterClass: isFavorites
        ? "favorites-filter favorites-filter-active"
        : "favorites-filter",
      favoritesFilterIcon: isFavorites ? "←" : "♡",
      favoritesFilterText: isFavorites ? "返回原分类" : "我的收藏",
      isFavoritesView: isFavorites,
      aiRecipeSuggestions,
      resultHint: searchQuery
        ? `共找到 ${recipes.length} 道和“${this.data.searchQuery}”相关的菜谱`
        : isFavorites
          ? `我的收藏 · ${recipes.length} 道菜`
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
    hydrateImageList(aiRecipeSuggestions).then((nextAiRecipeSuggestions) => {
      this.setData({
        aiRecipeSuggestions: nextAiRecipeSuggestions,
      });
    });
  },

  updateAiKeyword(event) {
    this.setData({
      aiKeyword: event.detail.value,
      aiErrorText: "",
    });
  },

  /**
   * 展开或收起一周菜单入口。
   * @returns {void}
   */
  toggleWeekPlanOpen() {
    this.setData({
      weekPlanOpen: !this.data.weekPlanOpen,
    });
  },

  /**
   * 展开或收起 AI 菜谱生成区。
   * @returns {void}
   */
  toggleAiRecipeOpen() {
    this.setData({
      aiRecipeOpen: !this.data.aiRecipeOpen,
    });
  },

  /**
   * 根据用户输入生成 3 道临时菜谱。
   * @returns {Promise<void>} 生成完成后展示 AI 推荐菜。
   */
  async generateAiRecipes() {
    const keyword = String(this.data.aiKeyword || "").trim();
    if (!keyword) {
      wx.showToast({
        title: "先输入想吃什么",
        icon: "none",
      });
      return;
    }
    if (this.data.aiGenerating) {
      return;
    }
    this.setData({
      aiGenerating: true,
      aiErrorText: "",
      aiRecipeOpen: true,
    });
    try {
      const recipes = await suggestAiRecipes(keyword);
      store.saveTemporaryRecipes(recipes);
      this.setData({
        aiGenerating: false,
        aiRecipeSuggestions: recipes,
      });
      this.refresh();
      this.generateAiRecipeImages(recipes);
    } catch (error) {
      this.setData({
        aiGenerating: false,
        aiErrorText: "暂时生成失败，换个关键词再试试",
      });
    }
  },

  addAiRecipe(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    store.togglePickedRecipe(id);
    this.refresh();
  },

  /**
   * 为 AI 临时菜谱逐张生成配图并写回本地缓存。
   * @param {object[]} recipes AI 生成的临时菜谱。
   * @returns {Promise<void>} 图片生成完成后刷新建议列表。
   */
  async generateAiRecipeImages(recipes) {
    const list = Array.isArray(recipes) ? recipes : [];
    for (let index = 0; index < list.length; index += 1) {
      const recipe = list[index];
      if (!recipe || !recipe.id || recipe.image) {
        continue;
      }
      this.setData({
        aiRecipeSuggestions: (this.data.aiRecipeSuggestions || []).map((item) => (
          item.id === recipe.id
            ? Object.assign({}, item, { imageGenerating: true, imageFailed: false })
            : item
        )),
      });
      try {
        const result = await generateRecipeImageIfMissing(recipe);
        const storedRecipe = Object.assign({}, recipe, {
          image: result.fileID || result.image || "",
        });
        store.saveTemporaryRecipes([storedRecipe]);
        this.setData({
          aiRecipeSuggestions: (this.data.aiRecipeSuggestions || []).map((item) => (
            item.id === recipe.id
              ? Object.assign({}, item, {
                  image: result.image || result.fileID || "",
                  hasImage: Boolean(result.image || result.fileID),
                  imageGenerating: false,
                  imageFailed: false,
                })
              : item
          )),
        });
        this.refresh();
      } catch (error) {
        console.warn("[ai-recipes] 临时菜谱图片生成失败", { id: recipe.id, error });
        this.setData({
          aiRecipeSuggestions: (this.data.aiRecipeSuggestions || []).map((item) => (
            item.id === recipe.id
              ? Object.assign({}, item, { imageGenerating: false, imageFailed: true })
              : item
          )),
        });
      }
    }
  },

  changeCategory(event) {
    const index = Number(event.detail.value) || 0;
    const category = this.data.categories[index];
    if (!category) {
      return;
    }
    this.setData({
      activeCategory: category.id,
      activeCategoryIndex: index,
      activeCategoryName: category.name,
    });
    this.refresh();
  },

  toggleRecipe(event) {
    const { id } = event.currentTarget.dataset;
    store.togglePickedRecipe(id);
    this.refresh();
  },

  toggleFavorite(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    const favorited = store.toggleFavoriteRecipe(id).includes(id);
    this.refresh();
    wx.showToast({
      title: favorited ? "已收藏" : "已取消收藏",
      icon: "none",
    });
  },

  showFavorites() {
    if (this.data.isFavoritesView) {
      const previous = this._browseState || {};
      const fallbackCategory = this.data.categories[0] || {};
      this.setData({
        activeCategory: previous.activeCategory || fallbackCategory.id || "",
        activeCategoryIndex: Number(previous.activeCategoryIndex || 0),
        activeCategoryName: previous.activeCategoryName || fallbackCategory.name || "请选择分类",
        searchQuery: previous.searchQuery || "",
      });
      this.refresh();
      const restoreScroll = () => {
        if (typeof wx.pageScrollTo === "function") {
          wx.pageScrollTo({
            scrollTop: Number(previous.scrollTop || 0),
            duration: 0,
          });
        }
      };
      if (typeof wx.nextTick === "function") {
        wx.nextTick(restoreScroll);
      } else {
        restoreScroll();
      }
      return;
    }

    this._browseState = {
      activeCategory: this.data.activeCategory,
      activeCategoryIndex: this.data.activeCategoryIndex,
      activeCategoryName: this.data.activeCategoryName,
      searchQuery: this.data.searchQuery,
      scrollTop: Number(this._browseScrollTop || 0),
    };
    this.setData({
      activeCategory: "favorites",
      activeCategoryName: "我的收藏",
      searchQuery: "",
    });
    this.refresh();
  },

  onPageScroll(event) {
    if (!this.data.isFavoritesView) {
      this._browseScrollTop = Number(event && event.scrollTop || 0);
    }
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

  goPlan() {
    wx.navigateTo({
      url: "/pages/plan/index",
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
      if (recipe.aiGenerated || String(recipe.id || "").indexOf("ai-") === 0) {
        store.saveTemporaryRecipes([Object.assign({}, recipe, {
          image: result.fileID || result.image || "",
        })]);
      }
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

  /**
   * AI 临时菜谱图加载失败时重新生成图片。
   * @param {object} event 图片错误事件。
   * @returns {void}
   */
  handleAiRecipeImageError(event) {
    const id = event.currentTarget.dataset.id;
    this.markImageFailed("aiRecipeSuggestions", id);
    this.generateRecipeImageForList("aiRecipeSuggestions", id);
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
