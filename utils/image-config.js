const IMAGE_SOURCE_MODE = "cloud";
const CLOUD_ENV_ID = "cloud1-d9gyz89t28481efb1";
const CLOUD_STORAGE_BUCKET = "636c-cloud1-d9gyz89t28481efb1-1452001530";
const CLOUD_STORAGE_PREFIX = `cloud://${CLOUD_ENV_ID}.${CLOUD_STORAGE_BUCKET}`;
const REMOTE_IMAGE_BASE_URL = "";

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function normalizeCloudPath(path) {
  return String(path || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function getImageSourceMode() {
  return IMAGE_SOURCE_MODE;
}

/**
 * 获取云存储文件前缀。
 * @returns {string} 与 app.js 初始化环境一致的固定云存储前缀。
 */
function getCloudStoragePrefix() {
  // 开发者工具的 getCurrentEnv 可能返回运行时 UUID，不能作为 cloud:// 文件环境 ID。
  return normalizeBaseUrl(CLOUD_STORAGE_PREFIX);
}

function getRemoteImageBaseUrl() {
  return normalizeBaseUrl(REMOTE_IMAGE_BASE_URL);
}

function buildCloudFileId(relativePath) {
  const prefix = getCloudStoragePrefix();
  const path = normalizeCloudPath(relativePath);
  if (!prefix || !path) {
    return "";
  }
  return `${prefix}/${path}`;
}

module.exports = {
  IMAGE_SOURCE_MODE,
  CLOUD_ENV_ID,
  CLOUD_STORAGE_BUCKET,
  CLOUD_STORAGE_PREFIX,
  REMOTE_IMAGE_BASE_URL,
  getImageSourceMode,
  getCloudStoragePrefix,
  getRemoteImageBaseUrl,
  buildCloudFileId,
};
