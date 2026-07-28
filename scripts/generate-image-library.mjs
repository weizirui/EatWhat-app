import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  getInvalidReasonByBuffer,
  imageTargets,
  loadPromptMap,
  loadSourceItems,
} from "./image-maintenance-utils.mjs";

const QUALITY_SUFFIX =
  "professional food photography, soft natural lighting, appetizing, high detail, isolated, no text, no watermark, no human, no hands";
const TRAE_BASE = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image";
const OPENAI_BASE =
  `${(process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "")}/v1/images/generations`;
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER || "openai";

const CATEGORY_FALLBACKS = {
  veg: "fresh vegetable ingredients on a plate",
  meat: "raw meat ingredients on a tray",
  seafood: "fresh seafood ingredients on ice",
  tofu: "soybean tofu ingredients on a plate",
  egg: "eggs and dairy ingredients on a table",
  staple: "staple food ingredients on a kitchen table",
  seasoning: "seasoning ingredients arranged on a plate",
  fruit: "fresh fruit ingredients in a bowl",
};

export function buildPromptCandidates(targetKey, item, promptMap) {
  const candidates = [];

  if (promptMap[item.id]) {
    candidates.push(`${promptMap[item.id]}, ${QUALITY_SUFFIX}`);
  }

  if (targetKey === "ingredients") {
    const idWords = item.id.replace(/_/g, " ");
    candidates.push(
      `${idWords} ingredient, ${QUALITY_SUFFIX}`,
      `${item.name} ingredient, ${QUALITY_SUFFIX}`,
      `${CATEGORY_FALLBACKS[item.categoryId] ?? "fresh ingredient food photography"}, ${QUALITY_SUFFIX}`,
      `fresh food ingredient, ${QUALITY_SUFFIX}`,
    );
  } else {
    const idWords = item.id.replace(/-/g, " ");
    candidates.push(
      `${item.title} Chinese dish, ${QUALITY_SUFFIX}`,
      `a plated ${idWords} dish, ${QUALITY_SUFFIX}`,
      `${item.category} Chinese dish on a plate, ${QUALITY_SUFFIX}`,
      `Chinese home style dish on a plate, ${QUALITY_SUFFIX}`,
    );
  }

  return [...new Set(candidates)];
}

function getProviderConfig() {
  if (IMAGE_PROVIDER === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("CONFIG:OPENAI_API_KEY is required when IMAGE_PROVIDER=openai");
    }

    return {
      provider: "openai",
      model: OPENAI_IMAGE_MODEL,
    };
  }

  return {
    provider: "trae",
    model: "trae-default",
  };
}

async function fetchTraeImageBuffer(prompt, size) {
  const url = `${TRAE_BASE}?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`NETWORK:${error.message}`);
    }
    throw new Error("NETWORK:Unknown fetch error");
  }

  if (!response.ok) {
    throw new Error(`HTTP:${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 10_000) {
    throw new Error(`TOO_SMALL:${bytes.length}`);
  }

  const invalidReason = getInvalidReasonByBuffer(bytes);
  if (invalidReason) {
    throw new Error(`INVALID_IMAGE:${invalidReason}`);
  }

  return bytes;
}

async function fetchOpenAiImageBuffer(prompt, size) {
  let response;
  try {
    response = await fetch(OPENAI_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size: size === "square" ? "1024x1024" : size,
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`NETWORK:${error.message}`);
    }
    throw new Error("NETWORK:Unknown fetch error");
  }

  if (!response.ok) {
    throw new Error(`HTTP:${response.status}`);
  }

  const payload = await response.json();
  const imageBase64 = payload?.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("INVALID_RESPONSE:Missing data[0].b64_json");
  }

  const bytes = Buffer.from(imageBase64, "base64");
  if (bytes.length < 10_000) {
    throw new Error(`TOO_SMALL:${bytes.length}`);
  }

  const invalidReason = getInvalidReasonByBuffer(bytes);
  if (invalidReason) {
    throw new Error(`INVALID_IMAGE:${invalidReason}`);
  }

  return bytes;
}

export async function fetchImageBuffer(prompt, size = "square") {
  const providerConfig = getProviderConfig();
  if (providerConfig.provider === "openai") {
    return fetchOpenAiImageBuffer(prompt, size);
  }
  return fetchTraeImageBuffer(prompt, size);
}

export async function probeImageService(targetKey, promptMap) {
  const probeItem =
    targetKey === "ingredients"
      ? { id: "tomato", name: "番茄", categoryId: "veg" }
      : { id: "tomato-egg", title: "番茄炒蛋", category: "热菜" };
  const probePrompt = buildPromptCandidates(targetKey, probeItem, promptMap)[0];

  try {
    await fetchImageBuffer(probePrompt);
    return {
      ok: true,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeErrorMessage(error),
    };
  }
}

function normalizeErrorMessage(error) {
  if (error instanceof Error) {
    return error.message || "UNKNOWN";
  }
  return "UNKNOWN";
}

function summarizeFailureReasons(errors) {
  const counter = new Map();
  for (const error of errors) {
    const key = error || "UNKNOWN";
    counter.set(key, (counter.get(key) ?? 0) + 1);
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));
}

export async function generateOneImage(targetKey, item, promptMap) {
  const target = imageTargets[targetKey];
  const outputPath = path.join(target.imageDir, `${item.id}.jpg`);
  const prompts = buildPromptCandidates(targetKey, item, promptMap);
  const errors = [];

  for (const prompt of prompts) {
    try {
      const bytes = await fetchImageBuffer(prompt);
      await fs.writeFile(outputPath, bytes);
      return {
        ok: true,
        prompt,
        size: bytes.length,
        outputPath,
        error: "",
        errorHistory: [],
      };
    } catch (error) {
      errors.push({
        prompt,
        reason: normalizeErrorMessage(error),
      });
      continue;
    }
  }

  return {
    ok: false,
    prompt: null,
    size: 0,
    outputPath,
    error: errors[errors.length - 1]?.reason ?? "UNKNOWN",
    errorHistory: errors,
    errorSummary: summarizeFailureReasons(errors),
  };
}

export async function generateImages(targetKey, options = {}) {
  const {
    onlyIds = [],
    useOnlyIds = false,
    concurrency = 3,
    logger = console,
  } = options;

  const target = imageTargets[targetKey];
  await ensureDir(target.imageDir);

  const [promptMap, items] = await Promise.all([
    loadPromptMap(target),
    loadSourceItems(targetKey),
  ]);

  const onlyIdSet = useOnlyIds ? new Set(onlyIds) : null;
  const queue = items.filter((item) => !onlyIdSet || onlyIdSet.has(item.id));
  const results = [];

  if (!queue.length) {
    logger.log(`No ${target.kindLabel} images need generation.`);
    return {
      okCount: 0,
      failCount: 0,
      results,
      totalCount: 0,
    };
  }

  let providerConfig;
  try {
    providerConfig = getProviderConfig();
  } catch (error) {
    const configError = normalizeErrorMessage(error);
    logger.log(`ERR ${target.kindLabel} service unavailable ${configError}`);

    const results = queue.map((item) => ({
      ...item,
      ok: false,
      prompt: null,
      size: 0,
      outputPath: path.join(target.imageDir, `${item.id}.jpg`),
      error: configError,
      errorHistory: [],
      errorSummary: [{ reason: configError, count: 1 }],
    }));

    return {
      okCount: 0,
      failCount: results.length,
      results,
      totalCount: results.length,
      serviceError: configError,
      provider: "invalid-config",
      providerModel: "",
    };
  }

  logger.log(`Using image provider: ${providerConfig.provider}${providerConfig.model ? ` (${providerConfig.model})` : ""}`);

  const serviceProbe = await probeImageService(targetKey, promptMap);
  if (!serviceProbe.ok) {
    const results = queue.map((item) => ({
      ...item,
      ok: false,
      prompt: null,
      size: 0,
      outputPath: path.join(target.imageDir, `${item.id}.jpg`),
      error: serviceProbe.error,
      errorHistory: [],
      errorSummary: [{ reason: serviceProbe.error, count: 1 }],
    }));

    logger.log(`ERR ${target.kindLabel} service unavailable ${serviceProbe.error}`);

    return {
      okCount: 0,
      failCount: results.length,
      results,
      totalCount: results.length,
      serviceError: serviceProbe.error,
      provider: providerConfig.provider,
      providerModel: providerConfig.model,
    };
  }

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      const result = await generateOneImage(targetKey, item, promptMap);
      results.push({ ...item, ...result });
      const marker = result.ok ? "OK " : "ERR";
      logger.log(
        `${marker} ${item.id} ${result.size}B ${result.prompt ?? ""} ${result.ok ? "" : result.error}`.trim(),
      );
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    okCount: results.filter((item) => item.ok).length,
    failCount: results.filter((item) => !item.ok).length,
    results,
    totalCount: results.length,
    serviceError: "",
    provider: providerConfig.provider,
    providerModel: providerConfig.model,
  };
}
