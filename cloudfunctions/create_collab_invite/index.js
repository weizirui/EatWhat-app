const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 生成不含易混淆字符的邀请码。
 * @param {number} length 邀请码长度。
 * @returns {string} 随机邀请码。
 */
function randomCode(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}

/**
 * 为当前微信用户创建一次性协作邀请码。
 * @param {object} event 包含可选展示名称。
 * @returns {Promise<object>} 邀请码和过期时间。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const displayName = String(event && event.displayName ? event.displayName : "").trim() || "协作人";
  const code = randomCode(6);
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000;

  // 同一用户只保留最新邀请码有效，避免分享多个码后关系难以确认。
  await db.collection("collab_invites")
    .where({
      creator_openid: OPENID,
      used: false,
    })
    .update({
      data: {
        used: true,
        invalid_reason: "replaced",
        used_at: now,
      },
    });

  await db.collection("collab_invites").add({
    data: {
      code,
      creator_openid: OPENID,
      creator_name: displayName,
      expires_at: expiresAt,
      used: false,
      used_by_openid: "",
      used_at: 0,
      created_at: now,
    },
  });

  return {
    ok: true,
    code,
    expiresAt,
  };
};
