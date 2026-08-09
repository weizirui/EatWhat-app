const { callCloud } = require("./cloud");
const {
  buildCloudFileId,
} = require("./image-config");
const {
  clearResolvedImageUrl,
  hydrateImageList,
} = require("./image");

const recipeImageTasks = Object.create(null);

function normalizeRecipeTitle(recipe) {
  return String((recipe && (recipe.title || recipe.name)) || "").trim();
}

function buildRecipeCloudPath(recipeId) {
  return `food/recipes/${recipeId}.jpg`;
}

function buildRecipePrompt(recipe) {
  const title = normalizeRecipeTitle(recipe);
  const category = recipe && recipe.category ? `，${recipe.category}` : "";
  if (recipe && recipe.id === "chicken-soup") {
    return `${title}${category}，中式家常鸡汤摄影，白色陶瓷汤碗，清亮金黄色鸡汤，只展示切块熟鸡肉、香菇和少量葱花，俯拍居中构图，明亮自然光，精致摆盘，不出现鸡头、鸡脖、鸡脚、整鸡或活鸡，无文字无水印`;
  }
  return `${title}${category}，中式家常菜摄影，明亮自然光，完整菜品，精致摆盘`;
}

/**
 * 调用混元生成一张菜品图并保存到云存储。
 * @param {string} prompt 菜品图片描述。
 * @param {object} options 可选 size 和 cloudPath。
 * @returns {Promise<object>} 云函数生成结果。
 */
async function generateFoodImage(prompt, options) {
  const config = options || {};
  const result = await callCloud("generate_food_image", {
    prompt,
    size: config.size || "1024x1024",
    cloudPath: config.cloudPath || "",
  });
  if (!result.ok) {
    throw new Error(result.message || result.reason || "generate_food_image_failed");
  }
  return result;
}

/**
 * 按菜谱固定路径生成图片，成功后返回可直接渲染的临时图片链接。
 * @param {object} recipe 包含 id、title/name、category 的菜谱对象。
 * @returns {Promise<object>} 包含 fileID、cloudPath、image 的生成结果。
 */
async function generateRecipeImageIfMissing(recipe) {
  const recipeId = String((recipe && recipe.id) || "").trim();
  const title = normalizeRecipeTitle(recipe);
  if (!recipeId || !title) {
    throw new Error("recipe_image_params_missing");
  }

  if (recipeImageTasks[recipeId]) {
    return recipeImageTasks[recipeId];
  }

  const cloudPath = buildRecipeCloudPath(recipeId);
  const fileID = buildCloudFileId(cloudPath);
  recipeImageTasks[recipeId] = generateFoodImage(buildRecipePrompt(recipe), {
    cloudPath,
    size: "1024x1024",
  }).then((result) => {
    const finalFileID = result.fileID || fileID;
    // 生成前可能缓存过失败临时链接，生成后必须重新解析云存储地址。
    clearResolvedImageUrl(finalFileID);
    return hydrateImageList([{
      id: recipeId,
      image: finalFileID,
      hasImage: false,
      imageFailed: false,
    }]).then((items) => Object.assign({}, result, {
      fileID: finalFileID,
      cloudPath,
      image: (items[0] && items[0].image) || finalFileID,
    }));
  }).finally(() => {
    delete recipeImageTasks[recipeId];
  });

  return recipeImageTasks[recipeId];
}

module.exports = {
  generateFoodImage,
  generateRecipeImageIfMissing,
};
