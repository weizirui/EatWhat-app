const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 更新当前用户在所有协作人列表中的展示名称。
 * @param {object} event 包含 displayName。
 * @returns {Promise<object>} 更新结果和影响关系数。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const displayName = String(event && event.displayName ? event.displayName : "").trim().slice(0, 12);
  if (!displayName) {
    return { ok: false, reason: "invalid_display_name" };
  }

  // 对方持有的关系记录中，当前用户位于 partner_openid 字段。
  const result = await db.collection("collaborators")
    .where({
      partner_openid: OPENID,
      status: "active",
    })
    .update({
      data: {
        partner_name: displayName,
        profile_updated_at: Date.now(),
      },
    });

  return {
    ok: true,
    updatedCount: Number(result.stats && result.stats.updated || 0),
  };
};
