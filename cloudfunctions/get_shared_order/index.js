const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 输出共享清单给小程序，避免暴露数据库内部字段。
 * @param {object} item 云数据库 shared_orders 记录。
 * @param {string} openid 当前访问用户 OpenID。
 * @returns {object} 共享清单展示数据。
 */
function serializeSharedOrder(item, openid) {
  return {
    shareId: item.share_id,
    orderId: item.order_id || "",
    recipeIds: item.recipe_ids || [],
    ingredientIds: item.ingredient_ids || [],
    ingredientCounts: item.ingredient_counts || [],
    recipeNames: item.recipe_names || [],
    ingredientNames: item.ingredient_names || [],
    temporaryRecipes: item.temporary_recipes || [],
    status: item.status || "pending",
    creatorName: item.creator_name || "分享人",
    claimantName: item.claimant_name || "",
    isOwner: item.creator_openid === openid,
    isClaimant: item.claimant_openid === openid,
    createdAt: item.created_at || 0,
    updatedAt: item.updated_at || 0,
  };
}

/**
 * 读取无需绑定关系的共享采购清单。
 * @param {object} event 包含 shareId。
 * @returns {Promise<object>} 清单内容和当前状态。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const shareId = String(event && event.shareId ? event.shareId : "").trim();
  if (!shareId) {
    return { ok: false, reason: "share_id_missing" };
  }

  const result = await db.collection("shared_orders")
    .where({ share_id: shareId })
    .limit(1)
    .get();
  const item = (result.data || [])[0];
  if (!item) {
    return { ok: false, reason: "share_order_not_found" };
  }

  return {
    ok: true,
    order: serializeSharedOrder(item, OPENID),
  };
};
