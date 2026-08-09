const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 规范字符串数组，限制单次提交体积。
 * @param {unknown} value 原始数组。
 * @param {number} maxCount 最大元素数量。
 * @returns {string[]} 去空、去重后的字符串数组。
 */
function normalizeStringList(value, maxCount) {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)))
    .slice(0, maxCount);
}

/**
 * 查询接收方关系记录中保存的发送者昵称。
 * @param {string} recipientOpenid 接收方 OpenID。
 * @param {string} senderOpenid 发送方 OpenID。
 * @returns {Promise<string>} 接收方可识别的发送者昵称。
 */
async function getSenderDisplayName(recipientOpenid, senderOpenid) {
  const result = await db.collection("collaborators")
    .where({
      user_openid: recipientOpenid,
      partner_openid: senderOpenid,
      status: "active",
    })
    .limit(1)
    .get();
  const relation = (result.data || [])[0];
  return relation && relation.partner_name ? relation.partner_name : "协作人";
}

/**
 * 提交共享采购清单，为发送者和接收者分别生成任务记录。
 * @param {object} event 订单、菜谱、食材和指定接收人。
 * @returns {Promise<object>} 提交结果及实际接收人数。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const orderId = String(event && event.orderId ? event.orderId : "").trim();
  const receiverOpenid = String(event && event.receiverOpenid ? event.receiverOpenid : "").trim();
  const recipeIds = normalizeStringList(event && event.recipeIds, 60);
  const ingredientIds = normalizeStringList(event && event.ingredientIds, 160);
  const recipeNames = normalizeStringList(event && event.recipeNames, 60);
  const ingredientNames = normalizeStringList(event && event.ingredientNames, 160);

  if (!orderId || !recipeIds.length) {
    return { ok: false, reason: "invalid_order" };
  }

  // 客户端超时后允许安全重试，同一发送者和订单号不重复创建任务。
  const existingTaskResult = await db.collection("collab_tasks")
    .where({
      creator_openid: OPENID,
      order_id: orderId,
      direction: "sent",
    })
    .limit(1)
    .get();
  const existingTask = existingTaskResult.data[0];
  if (existingTask) {
    return {
      ok: true,
      orderId,
      recipientCount: Array.isArray(existingTask.peer_openids)
        ? existingTask.peer_openids.length
        : 0,
      deduplicated: true,
    };
  }

  const relationResult = await db.collection("collaborators")
    .where({
      user_openid: OPENID,
      status: "active",
    })
    .get();
  const collaborators = relationResult.data || [];
  const selectedCollaborators = receiverOpenid
    ? collaborators.filter((item) => item.partner_openid === receiverOpenid)
    : [];

  if (receiverOpenid && !selectedCollaborators.length) {
    return { ok: false, reason: "invalid_receiver" };
  }

  const now = Date.now();
  const commonTask = {
    order_id: orderId,
    creator_openid: OPENID,
    recipe_ids: recipeIds,
    ingredient_ids: ingredientIds,
    recipe_names: recipeNames,
    ingredient_names: ingredientNames,
    status: "pending",
    created_at: now,
    updated_at: now,
  };
  const recipientOpenids = selectedCollaborators.map((item) => item.partner_openid);
  const recipientNames = selectedCollaborators.map((item) => item.partner_name || "协作人");
  const senderNames = await Promise.all(recipientOpenids.map((openid) => (
    getSenderDisplayName(openid, OPENID)
  )));

  // 发送者保留一条任务记录，便于查看自己发出的清单。
  const writes = [db.collection("collab_tasks").add({
    data: {
      ...commonTask,
      owner_openid: OPENID,
      direction: "sent",
      peer_openids: recipientOpenids,
      peer_names: recipientNames,
      unread: false,
    },
  })];

  selectedCollaborators.forEach((collaborator, index) => {
    // 每个接收人单独持有任务记录，查询和未读管理保持简单可靠。
    writes.push(db.collection("collab_tasks").add({
      data: {
        ...commonTask,
        owner_openid: collaborator.partner_openid,
        direction: "received",
        peer_openids: [OPENID],
        peer_names: [senderNames[index]],
        unread: true,
      },
    }));
  });

  await Promise.all(writes);

  return {
    ok: true,
    orderId,
    recipientCount: selectedCollaborators.length,
  };
};
