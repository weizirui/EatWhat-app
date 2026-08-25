const {
  buildCloudFileId,
  getImageSourceMode,
  getRemoteImageBaseUrl,
} = require("./image-config");

const tempUrlCache = Object.create(null);
const preloadedImageCache = Object.create(null);
const CLOUD_URL_BATCH_SIZE = 40;
const TEMP_URL_STORAGE_KEY = "qx_cloud_image_temp_urls";
const TEMP_URL_CACHE_TTL = 2 * 60 * 60 * 1000;
const TEMP_URL_CACHE_LIMIT = 300;
const LOCAL_RECIPE_IMAGE_OVERRIDES = new Set(["chicken-soup"]);
let persistentTempUrlCacheLoaded = false;

function canUseStorageSync() {
  return typeof wx !== "undefined"
    && typeof wx.getStorageSync === "function"
    && typeof wx.setStorageSync === "function";
}

/**
 * 读取本地缓存的云图片临时链接。
 * @returns {void}
 */
function loadPersistentTempUrlCache() {
  if (persistentTempUrlCacheLoaded || !canUseStorageSync()) {
    persistentTempUrlCacheLoaded = true;
    return;
  }
  persistentTempUrlCacheLoaded = true;
  try {
    const now = Date.now();
    const cached = wx.getStorageSync(TEMP_URL_STORAGE_KEY) || {};
    Object.keys(cached).forEach((fileID) => {
      const item = cached[fileID] || {};
      if (item.url && Number(item.expireAt || 0) > now) {
        tempUrlCache[fileID] = item.url;
      }
    });
  } catch (error) {
    console.warn("[image] 读取云图片缓存失败", error);
  }
}

/**
 * 保存云图片临时链接，减少重复向云存储换 URL。
 * @returns {void}
 */
function savePersistentTempUrlCache() {
  if (!canUseStorageSync()) {
    return;
  }
  try {
    const now = Date.now();
    const entries = Object.keys(tempUrlCache)
      .slice(-TEMP_URL_CACHE_LIMIT)
      .reduce((acc, fileID) => {
        acc[fileID] = {
          url: tempUrlCache[fileID],
          expireAt: now + TEMP_URL_CACHE_TTL,
        };
        return acc;
      }, {});
    wx.setStorageSync(TEMP_URL_STORAGE_KEY, entries);
  } catch (error) {
    console.warn("[image] 保存云图片缓存失败", error);
  }
}

function buildImageUrl(type, id) {
  if (!id) {
    return "";
  }
  const relativePath = `food/${type}/${id}.jpg`;
  const mode = getImageSourceMode();

  if (mode === "cloud") {
    return buildCloudFileId(relativePath);
  }

  if (mode === "remote") {
    const baseUrl = getRemoteImageBaseUrl();
    if (!baseUrl) {
      return "";
    }
    return `${baseUrl}/${relativePath}`;
  }

  return "";
}

function ingredientImage(id) {
  return buildImageUrl("ingredients", id);
}

function recipeImage(id) {
  if (LOCAL_RECIPE_IMAGE_OVERRIDES.has(id)) {
    return `/public/food/recipes/${id}.jpg`;
  }
  return buildImageUrl("recipes", id);
}

function isCloudFileId(url) {
  return /^cloud:\/\//.test(String(url || ""));
}

function getLocalImageUrl(url) {
  const value = String(url || "");
  const marker = "/food/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) {
    return "";
  }
  return `/public${value.slice(markerIndex)}`;
}

function unique(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function getResolvedImageUrl(url) {
  loadPersistentTempUrlCache();
  if (!isCloudFileId(url)) {
    return url || "";
  }
  return preloadedImageCache[url] || tempUrlCache[url] || "";
}

/**
 * 清除指定云文件的临时访问链接缓存。
 * @param {string} url cloud:// 文件 ID。
 * @returns {void}
 */
function clearResolvedImageUrl(url) {
  if (isCloudFileId(url)) {
    delete tempUrlCache[url];
    delete preloadedImageCache[url];
    savePersistentTempUrlCache();
  }
}

/**
 * 将图片加载失败切换到已打包的本地兜底图。
 * @param {object} item 图片展示对象。
 * @returns {object|null} 更新后的图片对象；无可用兜底时返回 null。
 */
function fallbackImageAfterError(item) {
  if (!item || !item.fallbackImage || item.usingLocalFallback) {
    return null;
  }
  return Object.assign({}, item, {
    image: item.fallbackImage,
    hasImage: true,
    imageFailed: false,
    usingLocalFallback: true,
  });
}

function resolveCloudImageBatch(urls) {
  return new Promise((resolve) => {
    wx.cloud.getTempFileURL({
      fileList: urls,
      success(res) {
        const fileList = Array.isArray(res && res.fileList) ? res.fileList : [];
        fileList.forEach((item) => {
          const fileId = item.fileID || item.fileId;
          const tempUrl = item.tempFileURL || item.tempFileUrl || "";
          if (fileId && tempUrl) {
            tempUrlCache[fileId] = tempUrl;
          }
        });
        savePersistentTempUrlCache();

        const failedFiles = fileList
          .filter((item) => !(item.tempFileURL || item.tempFileUrl))
          .map((item) => `${item.fileID || item.fileId || "unknown"}:${item.status || item.errMsg || "unknown"}`);
        if (failedFiles.length || fileList.length !== urls.length) {
          console.warn("[image] 云图片解析结果不完整", {
            requested: urls,
            returned: fileList,
            failed: failedFiles,
          });
        }
        resolve();
      },
      fail(error) {
        console.warn("[image] getTempFileURL 失败", error);
        resolve();
      },
    });
  });
}

async function resolveCloudImageUrls(urls) {
  loadPersistentTempUrlCache();
  const cloudUrls = unique(urls).filter(isCloudFileId);
  if (cloudUrls.length === 0) {
    return {};
  }

  const unresolved = cloudUrls.filter((url) => !tempUrlCache[url]);
  if (
    unresolved.length > 0
    && typeof wx !== "undefined"
    && wx.cloud
    && typeof wx.cloud.getTempFileURL === "function"
  ) {
    const tasks = [];
    for (let index = 0; index < unresolved.length; index += CLOUD_URL_BATCH_SIZE) {
      tasks.push(resolveCloudImageBatch(unresolved.slice(index, index + CLOUD_URL_BATCH_SIZE)));
    }
    await Promise.all(tasks);
  }

  const result = {};
  cloudUrls.forEach((url) => {
    result[url] = getResolvedImageUrl(url);
  });
  return result;
}

/**
 * 在后台下载图片到本次小程序会话的临时缓存，后续 image 组件可直接使用本地路径。
 * @param {string[]} urls 原始云文件 ID 列表。
 * @param {{ concurrency?: number }} options 预加载并发配置。
 * @returns {Promise<{ requested: number, loaded: number }>} 预加载统计。
 */
async function preloadImageUrls(urls, options) {
  const cloudUrls = unique(urls).filter(isCloudFileId);
  if (cloudUrls.length === 0 || typeof wx === "undefined" || typeof wx.getImageInfo !== "function") {
    return { requested: cloudUrls.length, loaded: 0 };
  }

  await resolveCloudImageUrls(cloudUrls);
  const pendingUrls = cloudUrls.filter((url) => tempUrlCache[url] && !preloadedImageCache[url]);
  const concurrency = Math.max(1, Math.min(Number(options && options.concurrency) || 4, 6));
  let cursor = 0;
  let loaded = cloudUrls.length - pendingUrls.length;

  async function worker() {
    while (cursor < pendingUrls.length) {
      const url = pendingUrls[cursor];
      cursor += 1;
      await new Promise((resolve) => {
        wx.getImageInfo({
          src: tempUrlCache[url],
          success(res) {
            const localPath = res && (res.path || res.tempFilePath);
            if (localPath) {
              preloadedImageCache[url] = localPath;
              loaded += 1;
            }
            resolve();
          },
          fail() {
            resolve();
          },
        });
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, pendingUrls.length) }, worker));
  return { requested: cloudUrls.length, loaded };
}

function hydrateImageList(list, imageField) {
  const field = imageField || "image";
  const sourceList = Array.isArray(list) ? list : [];
  const urls = sourceList.map((item) => item && item[field]).filter(Boolean);

  return resolveCloudImageUrls(urls).then((urlMap) =>
    sourceList.map((item) => {
      if (!item || !item[field]) {
        return item;
      }
      const originalUrl = item[field];
      const resolvedUrl = isCloudFileId(originalUrl)
        ? (urlMap[originalUrl] || getResolvedImageUrl(originalUrl) || getLocalImageUrl(originalUrl))
        : originalUrl;
      const fallbackImage = isCloudFileId(originalUrl) ? getLocalImageUrl(originalUrl) : "";
      return Object.assign({}, item, {
        [field]: resolvedUrl,
        hasImage: Boolean(resolvedUrl),
        fallbackImage,
        usingLocalFallback: Boolean(fallbackImage && resolvedUrl === fallbackImage),
      });
    }),
  );
}

module.exports = {
  buildImageUrl,
  ingredientImage,
  recipeImage,
  isCloudFileId,
  getLocalImageUrl,
  getResolvedImageUrl,
  clearResolvedImageUrl,
  fallbackImageAfterError,
  resolveCloudImageUrls,
  preloadImageUrls,
  hydrateImageList,
};
