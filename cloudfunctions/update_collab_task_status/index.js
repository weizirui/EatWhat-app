const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const NEXT_STATUS = {
  pending: "purchasing",
  purchasing: "completed",
};

/**
 * 更新当前协作人收到的任务状态，并同步发送方记录。
 * @param {object} event 包含 taskId 和目标 status。
 * @returns {Promise<object>} 更新结果和同步记录数。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const taskId = String(event && event.taskId ? event.taskId : "").trim();
  const status = String(event && event.status ? event.status : "").trim();
  if (!taskId || !status) {
    return { ok: false, reason: "invalid_params" };
  }

  const taskResult = await db.collection("collab_tasks").doc(taskId).get();
  const task = taskResult.data;
  if (!task || task.owner_openid !== OPENID || task.direction !== "received") {
    return { ok: false, reason: "forbidden" };
  }
  if (NEXT_STATUS[task.status] !== status) {
    return { ok: false, reason: "invalid_status_transition" };
  }

  // 同一订单的发送与接收记录保持一致，发送者可实时看到采购进度。
  const updateResult = await db.collection("collab_tasks")
    .where({
      order_id: task.order_id,
      creator_openid: task.creator_openid,
      status: task.status,
    })
    .update({
      data: {
        status,
        updated_at: Date.now(),
        status_updated_by: OPENID,
      },
    });

  return {
    ok: true,
    status,
    updatedCount: Number(updateResult.stats && updateResult.stats.updated || 0),
  };
};
