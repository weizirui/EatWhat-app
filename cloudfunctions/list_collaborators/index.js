const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 查询当前用户的有效协作人和未读采购任务数。
 * @returns {Promise<object>} 协作人列表与未读数。
 */
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();

  const result = await db.collection("collaborators")
    .where({
      user_openid: OPENID,
      status: "active",
    })
    .orderBy("created_at", "desc")
    .get();

  let unreadTaskCount = 0;
  try {
    const unreadResult = await db.collection("collab_tasks")
      .where({
        owner_openid: OPENID,
        direction: "received",
        unread: true,
      })
      .count();
    unreadTaskCount = unreadResult.total || 0;
  } catch (error) {
    // 任务集合尚未创建时仍允许用户先完成邀请码绑定。
    unreadTaskCount = 0;
  }

  return {
    ok: true,
    unreadTaskCount,
    collaborators: result.data.map((item) => ({
      id: item._id,
      partnerOpenid: item.partner_openid,
      partnerName: item.partner_name || "协作人",
      createdAt: item.created_at,
      user_openid: item.user_openid,
    })),
  };
};
