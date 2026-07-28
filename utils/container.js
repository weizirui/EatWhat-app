const CONTAINER_ENV = "prod-d7g17s01j3c2e063";
const CONTAINER_SERVICE = "springboot-5bbi";

/**
 * 将云托管响应转换为小程序可直接使用的数据。
 * @param {object} response wx.cloud.callContainer 返回值。
 * @returns {object|string} 后端响应数据。
 */
function normalizeContainerResponse(response) {
  const data = response && response.data;
  if (typeof data !== "string") {
    return data || {};
  }
  if (!data.trim()) {
    return {};
  }
  try {
    return JSON.parse(data);
  } catch (error) {
    return { data };
  }
}

/**
 * 调用微信云托管 HTTP 接口。
 * @param {string} path 接口路径，例如 /api/count。
 * @param {object} data POST 请求体。
 * @returns {Promise<object|string>} 后端返回数据。
 */
function callContainer(path, data) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || typeof wx.cloud.callContainer !== "function") {
      reject(new Error("container_unavailable"));
      return;
    }
    if (!path || path.charAt(0) !== "/") {
      reject(new Error("container_path_invalid"));
      return;
    }
    wx.cloud.callContainer({
      config: { env: CONTAINER_ENV },
      path,
      header: {
        "X-WX-SERVICE": CONTAINER_SERVICE,
        "Content-Type": "application/json",
      },
      method: "POST",
      data: data || {},
      success(response) {
        const statusCode = Number(response && response.statusCode ? response.statusCode : 200);
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error("container_http_" + statusCode));
          return;
        }
        resolve(normalizeContainerResponse(response));
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

module.exports = {
  CONTAINER_ENV,
  CONTAINER_SERVICE,
  normalizeContainerResponse,
  callContainer,
};
