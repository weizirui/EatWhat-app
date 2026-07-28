function callCloud(name, data) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || typeof wx.cloud.callFunction !== "function") {
      reject(new Error("cloud_unavailable"));
      return;
    }
    wx.cloud.callFunction({
      name,
      data: data || {},
      success(result) {
        resolve(result.result || {});
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

module.exports = {
  callCloud,
};
