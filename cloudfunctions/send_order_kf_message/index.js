const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const text = String(event && event.text ? event.text : "").trim();
  if (!text) {
    return {
      ok: false,
      reason: "empty_text",
    };
  }

  await cloud.openapi.customerServiceMessage.send({
    touser: OPENID,
    msgtype: "text",
    text: {
      content: text,
    },
  });

  return {
    ok: true,
  };
};

