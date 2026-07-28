const https = require("https");
const tcb = require("@cloudbase/node-sdk");

const DEFAULT_ENV_ID = "cloud1-d9gyz89t28481efb1";
const ENV_ID = process.env.ENV_ID || process.env.TCB_ENV || DEFAULT_ENV_ID;
const app = tcb.init({
  // 生图能力按云环境开通，必须与小程序 wx.cloud.init 使用同一环境。
  env: ENV_ID,
  timeout: 900000,
});

const MODEL = "HY-Image-3.0-Plus-4090-Tob-v1.0";
const ALLOWED_SIZES = new Set(["1024x1024", "1280x720", "720x1280"]);
const MIN_IMAGE_BYTES = 50 * 1024;
const MIN_IMAGE_WIDTH = 900;
const MIN_IMAGE_HEIGHT = 900;

/**
 * 读取 PNG/JPEG 图片尺寸，用于阻止低分辨率或异常图片入库。
 * @param {Buffer} buffer 图片二进制内容。
 * @returns {{width:number,height:number}|null} 图片尺寸，无法识别时返回 null。
 */
function readImageSize(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    return null;
  }
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) {
      return null;
    }
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

/**
 * 校验图片质量，避免把坏图或低分辨率图覆盖到云存储。
 * @param {Buffer} fileContent 图片二进制内容。
 * @returns {{ok:boolean, reason?:string, width?:number, height?:number, bytes:number}} 校验结果。
 */
function validateImageContent(fileContent) {
  const bytes = Buffer.isBuffer(fileContent) ? fileContent.length : 0;
  if (bytes < MIN_IMAGE_BYTES) {
    return { ok: false, reason: "image_too_small", bytes };
  }
  const size = readImageSize(fileContent);
  if (!size) {
    return { ok: false, reason: "image_size_unreadable", bytes };
  }
  if (size.width < MIN_IMAGE_WIDTH || size.height < MIN_IMAGE_HEIGHT) {
    return {
      ok: false,
      reason: "image_resolution_too_low",
      width: size.width,
      height: size.height,
      bytes,
    };
  }
  return { ok: true, width: size.width, height: size.height, bytes };
}

/**
 * 下载混元返回的临时图片。
 * @param {string} url 图片临时 URL。
 * @param {number} redirectCount 已跟随的重定向次数。
 * @returns {Promise<Buffer>} 图片二进制内容。
 */
function downloadImage(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const location = response.headers.location;
      if (response.statusCode >= 300 && response.statusCode < 400 && location) {
        response.resume();
        if (redirectCount >= 3) {
          reject(new Error("image_redirect_limit"));
          return;
        }
        downloadImage(location, redirectCount + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`image_download_http_${response.statusCode}`));
        return;
      }

      const chunks = [];
      let totalSize = 0;
      response.on("data", (chunk) => {
        totalSize += chunk.length;
        if (totalSize > 10 * 1024 * 1024) {
          response.destroy(new Error("image_too_large"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * 规范云存储路径，只允许写入 food 目录。
 * @param {string} value 调用方传入路径。
 * @returns {string} 安全云存储路径。
 */
function normalizeCloudPath(value) {
  const path = String(value || `food/generated/${Date.now()}.jpg`)
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
  if (!path.startsWith("food/") || path.includes("..")) {
    throw new Error("cloud_path_invalid");
  }
  return path;
}

/**
 * 将 SDK 异常整理为前端可判断的结果。
 * @param {Error & {code?: string, requestId?: string}} error CloudBase SDK 异常。
 * @returns {object} 失败原因、环境、模型和请求标识。
 */
function formatGenerateError(error) {
  const statusCode = String(error && error.code ? error.code : "");
  const isRouteNotFound = statusCode === "404" || /status code 404/i.test(error.message || "");
  return {
    ok: false,
    reason: isRouteNotFound ? "ai_model_route_not_found" : "generate_failed",
    message: error && error.message ? error.message : String(error),
    envId: ENV_ID,
    model: MODEL,
    requestId: error && error.requestId ? error.requestId : "",
  };
}

/**
 * 调用混元文生图，并把临时结果转存至当前环境云存储。
 * @param {object} event prompt、size、cloudPath。
 * @returns {Promise<object>} 云文件 ID、临时 URL和改写后的提示词。
 */
exports.main = async (event) => {
  const prompt = String(event && event.prompt ? event.prompt : "").trim();
  const size = ALLOWED_SIZES.has(event && event.size) ? event.size : "1024x1024";
  console.info("[generate_food_image] 开始", {
    envId: ENV_ID,
    model: MODEL,
    sdkVersion: require("@cloudbase/node-sdk/package.json").version,
    size,
    promptLength: prompt.length,
  });
  if (!prompt || prompt.length > 500) {
    return { ok: false, reason: "prompt_invalid" };
  }

  try {
    const imageModel = app.ai().createImageModel("hunyuan-image");
    console.info("[generate_food_image] 调用混元");
    const response = await imageModel.generateImage({
      model: MODEL,
      prompt,
      size,
      // 首次验证关闭改写和 thinking，减少约 30-90 秒等待。
      revise: { value: false },
      enable_thinking: { value: false },
    });
    console.info("[generate_food_image] 混元返回");
    const image = response && response.data && response.data[0];
    if (!image || !image.url) {
      return { ok: false, reason: "image_url_missing" };
    }

    const cloudPath = normalizeCloudPath(event && event.cloudPath);
    const fileContent = await downloadImage(image.url);
    const imageCheck = validateImageContent(fileContent);
    console.info("[generate_food_image] 下载完成", imageCheck);
    if (!imageCheck.ok) {
      return Object.assign({
        ok: false,
        cloudPath,
      }, imageCheck);
    }
    const uploadResult = await app.uploadFile({
      cloudPath,
      fileContent,
    });
    console.info("[generate_food_image] 上传完成", { cloudPath });
    return {
      ok: true,
      fileID: uploadResult.fileID,
      cloudPath,
      width: imageCheck.width,
      height: imageCheck.height,
      bytes: imageCheck.bytes,
      sourceUrl: image.url,
      revisedPrompt: image.revised_prompt || "",
    };
  } catch (error) {
    console.error("[generate_food_image] 生成失败", error);
    return formatGenerateError(error);
  }
};
