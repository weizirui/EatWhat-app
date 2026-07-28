const { RECIPES } = require("../../data/recipes");
const { INGREDIENTS } = require("../../data/ingredients");
const { generateFoodImage } = require("../../utils/ai-image");

const MAX_LOGS = 30;

function buildRecipePrompt(item) {
  return `${item.title}，${item.category}，中式家常菜摄影，明亮自然光，完整菜品，精致摆盘，高清真实，无文字无水印`;
}

function buildIngredientPrompt(item) {
  return `${item.name}，新鲜食材摄影，干净浅色背景，主体清晰，高清真实，无文字无水印`;
}

function buildTargetItems(target) {
  if (target === "ingredients") {
    return INGREDIENTS.map((item) => ({
      id: item.id,
      name: item.name,
      prompt: buildIngredientPrompt(item),
      cloudPath: `food/ingredients/${item.id}.jpg`,
    }));
  }
  return RECIPES.map((item) => ({
    id: item.id,
    name: item.title,
    prompt: buildRecipePrompt(item),
    cloudPath: `food/recipes/${item.id}.jpg`,
  }));
}

Page({
  data: {
    target: "recipes",
    targetLabel: "菜谱",
    total: 0,
    cursor: 0,
    okCount: 0,
    failCount: 0,
    progressPercent: 0,
    running: false,
    logs: [],
  },

  /**
   * 初始化当前生成类型和总数。
   * @returns {void}
   */
  onLoad() {
    this.refreshTarget("recipes");
  },

  /**
   * 切换菜谱/食材生成队列。
   * @param {object} event 组件 dataset.target 为 recipes 或 ingredients。
   * @returns {void}
   */
  switchTarget(event) {
    if (this.data.running) {
      return;
    }
    this.refreshTarget(event.currentTarget.dataset.target || "recipes");
  },

  /**
   * 重置当前类型的生成进度。
   * @returns {void}
   */
  resetProgress() {
    if (this.data.running) {
      return;
    }
    this.refreshTarget(this.data.target);
  },

  /**
   * 刷新生成队列统计。
   * @param {string} target 生成类型：recipes 或 ingredients。
   * @returns {void}
   */
  refreshTarget(target) {
    const safeTarget = target === "ingredients" ? "ingredients" : "recipes";
    const items = buildTargetItems(safeTarget);
    this.setData({
      target: safeTarget,
      targetLabel: safeTarget === "ingredients" ? "食材" : "菜谱",
      total: items.length,
      cursor: 0,
      okCount: 0,
      failCount: 0,
      progressPercent: 0,
      running: false,
      logs: [],
    });
  },

  /**
   * 追加生成日志，只保留最近记录。
   * @param {string} text 日志文本。
   * @param {boolean} ok 是否成功。
   * @returns {void}
   */
  pushLog(text, ok) {
    const logs = [{
      key: `${Date.now()}-${Math.random()}`,
      text,
      ok,
    }].concat(this.data.logs || []).slice(0, MAX_LOGS);
    this.setData({ logs });
  },

  /**
   * 停止当前批量生成，已完成图片会保留在云存储。
   * @returns {void}
   */
  stopGenerate() {
    this.setData({ running: false });
  },

  /**
   * 从当前进度开始逐张覆盖生成高清图片。
   * @returns {Promise<void>} 队列结束或用户停止后返回。
   */
  async startGenerate() {
    if (this.data.running) {
      return;
    }
    this.setData({ running: true });

    const items = buildTargetItems(this.data.target);
    for (let index = this.data.cursor; index < items.length; index += 1) {
      if (!this.data.running) {
        break;
      }
      const item = items[index];
      try {
        const result = await generateFoodImage(item.prompt, {
          cloudPath: item.cloudPath,
          size: "1024x1024",
        });
        const okCount = this.data.okCount + 1;
        const cursor = index + 1;
        this.setData({
          cursor,
          okCount,
          progressPercent: Math.round((cursor / items.length) * 100),
        });
        this.pushLog(`OK ${item.name} ${result.width || ""}x${result.height || ""} ${result.bytes || 0}B`, true);
      } catch (error) {
        const failCount = this.data.failCount + 1;
        const cursor = index + 1;
        this.setData({
          cursor,
          failCount,
          progressPercent: Math.round((cursor / items.length) * 100),
        });
        this.pushLog(`ERR ${item.name} ${error.message || error}`, false);
      }
    }

    this.setData({ running: false });
  },
});
