const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 输出客户端需要的任务字段，避免暴露数据库内部字段。
 * @param {object} item 云数据库任务记录。
 * @returns {object} 小程序任务对象。
 */
function serializeTask(item) {
  return {
    id: item._id,
    orderId: item.order_id,
    direction: item.direction,
    peerNames: item.peer_names || [],
    recipeIds: item.recipe_ids || [],
    ingredientIds: item.ingredient_ids || [],
    recipeNames: item.recipe_names || [],
    ingredientNames: item.ingredient_names || [],
    status: item.status || "pending",
    unread: Boolean(item.unread),
    createdAt: item.created_at || 0,
  };
}

/**
 * 查询当前用户收发的采购任务，并将已展示的接收任务标记为已读。
 * @returns {Promise<object>} 收到和发出的任务列表。
 */
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const result = await db.collection("collab_tasks")
    .where({ owner_openid: OPENID })
    .orderBy("created_at", "desc")
    .limit(50)
    .get();
  const tasks = (result.data || []).map(serializeTask);

  await db.collection("collab_tasks")
    .where({
      owner_openid: OPENID,
      direction: "received",
      unread: true,
    })
    .update({
      data: {
        unread: false,
        read_at: Date.now(),
      },
    });

  return {
    ok: true,
    receivedTasks: tasks.filter((item) => item.direction === "received"),
    sentTasks: tasks.filter((item) => item.direction === "sent"),
  };
};
