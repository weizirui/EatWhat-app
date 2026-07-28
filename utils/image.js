const {
  buildCloudFileId,
  getImageSourceMode,
  getRemoteImageBaseUrl,
} = require("./image-config");

const tempUrlCache = Object.create(null);

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
  if (!isCloudFileId(url)) {
    return url || "";
  }
  return tempUrlCache[url] || "";
}

/**
 * 清除指定云文件的临时访问链接缓存。
 * @param {string} url cloud:// 文件 ID。
 * @returns {void}
 */
function clearResolvedImageUrl(url) {
  if (isCloudFileId(url)) {
    delete tempUrlCache[url];
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

function resolveCloudImageUrls(urls) {
  const cloudUrls = unique(urls).filter(isCloudFileId);
  if (cloudUrls.length === 0) {
    return Promise.resolve({});
  }

  const unresolved = cloudUrls.filter((url) => !tempUrlCache[url]);
  if (unresolved.length === 0) {
    const cachedMap = {};
    cloudUrls.forEach((url) => {
      cachedMap[url] = tempUrlCache[url] || "";
    });
    return Promise.resolve(cachedMap);
  }

  if (!wx.cloud || typeof wx.cloud.getTempFileURL !== "function") {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    wx.cloud.getTempFileURL({
      fileList: unresolved,
      success(res) {
        const fileList = Array.isArray(res && res.fileList) ? res.fileList : [];
        fileList.forEach((item) => {
          const fileId = item.fileID || item.fileId;
          const tempUrl = item.tempFileURL || item.tempFileUrl || "";
          if (fileId && tempUrl) {
            tempUrlCache[fileId] = tempUrl;
          }
        });

        const failedFiles = fileList
          .filter((item) => !(item.tempFileURL || item.tempFileUrl))
          .map((item) => `${item.fileID || item.fileId || "unknown"}:${item.status || item.errMsg || "unknown"}`);
        if (failedFiles.length || fileList.length !== unresolved.length) {
          console.warn("[image] 云图片解析结果不完整", {
            requested: unresolved,
            returned: fileList,
            failed: failedFiles,
          });
        }

        const result = {};
        cloudUrls.forEach((url) => {
          result[url] = tempUrlCache[url] || "";
        });
        resolve(result);
      },
      fail(error) {
        console.warn("[image] getTempFileURL 失败", error);
        resolve({});
      },
    });
  });
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
  hydrateImageList,
};
