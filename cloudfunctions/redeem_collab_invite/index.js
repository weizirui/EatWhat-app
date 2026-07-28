const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 判断两名用户是否已有有效协作关系。
 * @param {object} database 当前事务或数据库实例。
 * @param {string} userOpenid 当前用户 OpenID。
 * @param {string} partnerOpenid 对方 OpenID。
 * @returns {Promise<boolean>} 是否已经绑定。
 */
async function hasRelationship(database, userOpenid, partnerOpenid) {
  const result = await database.collection("collaborators")
    .where({
      user_openid: userOpenid,
      partner_openid: partnerOpenid,
      status: "active",
    })
    .limit(1)
    .get();
  return result.data.length > 0;
}

/**
 * 兑换邀请码并写入两条方向相反的协作关系。
 * @param {object} event 包含邀请码和可选展示名称。
 * @returns {Promise<object>} 绑定结果和协作人信息。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const code = String(event && event.code ? event.code : "").trim().toUpperCase();
  const displayName = String(event && event.displayName ? event.displayName : "").trim() || "协作人";
  const now = Date.now();

  if (!code) {
    return { ok: false, reason: "empty_code" };
  }

  return db.runTransaction(async (transaction) => {
    const inviteResult = await transaction.collection("collab_invites")
      .where({
        code,
        used: false,
        expires_at: _.gt(now),
      })
      .limit(1)
      .get();

    const invite = inviteResult.data[0];
    if (!invite) {
      return { ok: false, reason: "invalid_code" };
    }
    if (invite.creator_openid === OPENID) {
      return { ok: false, reason: "self_bind" };
    }
    if (await hasRelationship(transaction, OPENID, invite.creator_openid)) {
      return { ok: false, reason: "already_bound" };
    }

    // 条件更新保证并发兑换时只有一个用户能占用该邀请码。
    const claimResult = await transaction.collection("collab_invites")
      .where({
        _id: invite._id,
        used: false,
      })
      .update({
        data: {
          used: true,
          used_by_openid: OPENID,
          used_at: now,
        },
      });
    if (Number(claimResult.stats && claimResult.stats.updated || 0) !== 1) {
      return { ok: false, reason: "invalid_code" };
    }

    await transaction.collection("collaborators").add({
      data: {
        user_openid: invite.creator_openid,
        partner_openid: OPENID,
        partner_name: displayName,
        created_at: now,
        status: "active",
      },
    });

    await transaction.collection("collaborators").add({
      data: {
        user_openid: OPENID,
        partner_openid: invite.creator_openid,
        partner_name: invite.creator_name || "协作人",
        created_at: now,
        status: "active",
      },
    });

    return {
      ok: true,
      partnerOpenid: invite.creator_openid,
      partnerName: invite.creator_name || "协作人",
    };
  });
};
