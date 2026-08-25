const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 推进共享清单状态，未绑定用户也能认领和完成采购。
 * @param {object} event 包含 shareId、status 和 displayName。
 * @returns {Promise<object>} 更新后的状态。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const shareId = String(event && event.shareId ? event.shareId : "").trim();
  const status = String(event && event.status ? event.status : "").trim();
  const displayName = String(event && event.displayName ? event.displayName : "").trim().slice(0, 24);
  if (!shareId || !["purchasing", "completed"].includes(status)) {
    return { ok: false, reason: "invalid_params" };
  }

  const result = await db.collection("shared_orders")
    .where({ share_id: shareId })
    .limit(1)
    .get();
  const item = (result.data || [])[0];
  if (!item) {
    return { ok: false, reason: "share_order_not_found" };
  }
  if (item.status === "completed") {
    return { ok: true, status: "completed", deduplicated: true };
  }
  if (status === "purchasing" && item.status !== "pending") {
    return { ok: false, reason: "already_claimed" };
  }
  if (status === "completed" && item.status === "pending") {
    return { ok: false, reason: "claim_first" };
  }
  if (
    status === "completed"
    && item.claimant_openid
    && item.claimant_openid !== OPENID
    && item.creator_openid !== OPENID
  ) {
    return { ok: false, reason: "not_claimant" };
  }

  const nextData = {
    status,
    updated_at: Date.now(),
  };
  if (status === "purchasing") {
    nextData.claimant_openid = OPENID;
    nextData.claimant_name = displayName || "采购人";
    nextData.claimed_at = Date.now();
  }
  if (status === "completed") {
    nextData.completed_at = Date.now();
  }

  await db.collection("shared_orders").doc(item._id).update({
    data: nextData,
  });

  return {
    ok: true,
    status,
    claimantName: nextData.claimant_name || item.claimant_name || "",
  };
};
