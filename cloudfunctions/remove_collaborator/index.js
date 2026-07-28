const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 双向解除协作关系，历史采购任务保留用于回看。
 * @param {object} event 包含 partnerOpenid 的请求参数。
 * @returns {Promise<object>} 解除结果。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const partnerOpenid = String(event && event.partnerOpenid ? event.partnerOpenid : "").trim();
  if (!partnerOpenid || partnerOpenid === OPENID) {
    return { ok: false, reason: "invalid_partner" };
  }

  const now = Date.now();
  const updates = [
    db.collection("collaborators").where({
      user_openid: OPENID,
      partner_openid: partnerOpenid,
      status: "active",
    }).update({
      data: { status: "removed", removed_at: now },
    }),
    db.collection("collaborators").where({
      user_openid: partnerOpenid,
      partner_openid: OPENID,
      status: "active",
    }).update({
      data: { status: "removed", removed_at: now },
    }),
  ];
  const results = await Promise.all(updates);
  const updatedCount = results.reduce((sum, item) => sum + Number(item.stats && item.stats.updated || 0), 0);

  return {
    ok: updatedCount > 0,
    updatedCount,
  };
};
