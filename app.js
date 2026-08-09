const { CLOUD_ENV_ID } = require("./utils/image-config");
const { RECIPES } = require("./data/recipes");
const { recipeImage, preloadImageUrls } = require("./utils/image");

const STARTUP_PRELOAD_LIMIT = 128;

function buildStartupPreloadUrls() {
  const visibleRecipes = RECIPES.filter((item) => (
    item.id !== "chicken-soup"
    && !["甜品", "自制", "主食"].includes(item.category)
  ));
  const defaultCategory = visibleRecipes[0] ? visibleRecipes[0].category : "";
  const priorityRecipes = [
    ...visibleRecipes.filter((item) => item.category === defaultCategory),
    ...visibleRecipes.filter((item) => item.category === "海鲜"),
    ...visibleRecipes,
  ];
  const seen = Object.create(null);

  return priorityRecipes
    .filter((item) => {
      if (!item || !item.id || seen[item.id]) {
        return false;
      }
      seen[item.id] = true;
      return true;
    })
    .slice(0, STARTUP_PRELOAD_LIMIT)
    .map((item) => recipeImage(item.id));
}

App({
  onLaunch() {
    if (!wx.cloud) {
      return;
    }
    wx.cloud.init({
      // 图片和云函数都使用同一个已配置环境，避免体验版连接到默认环境。
      env: CLOUD_ENV_ID || wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true,
    });

    // 首屏稳定后再小并发预热；默认分类和海鲜优先，不阻塞小程序打开。
    setTimeout(() => {
      preloadImageUrls(buildStartupPreloadUrls(), { concurrency: 4 })
        .then((result) => {
          console.info("[image] 启动预加载完成", result);
        })
        .catch((error) => {
          console.warn("[image] 启动预加载失败", error);
        });
    }, 500);
  },
});
