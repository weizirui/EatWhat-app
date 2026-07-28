const { CLOUD_ENV_ID } = require("./utils/image-config");

App({
  onLaunch() {
    if (!wx.cloud) {
      return;
    }
    wx.cloud.init({
      // 图片和云函数都使用同一个已配置环境，避免体验版连接到默认环境。
      env: CLOUD_ENV_ID || wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true,
    });
  },
});
