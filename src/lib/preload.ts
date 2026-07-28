/**
 * 图片预加载工具
 * 策略：
 * 1. 全局并发限制 2 张（避免一次性塞给 AI 接口导致全返回占位图）
 * 2. 同 key 的并发请求共享同一 promise（避免 6 个 FoodImage 调 6 次）
 * 3. fetch 拿到 blob 后判断大小，< 30KB 视为 AI 占位图，等 2 秒重试
 * 4. 命中 IDB 跳过；未命中写盘
 */
import { ingredientImageUrl, recipeImageUrl } from "@/lib/image";
import { getCachedImage, setCachedImage } from "@/lib/imageCache";

type ImageType = "ingredient" | "recipe";

const MAX_CONCURRENT = 2;
const PLACEHOLDER_BYTES = 30_000; // AI 接口首次返回的占位图通常 < 30KB
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 30_000;

// —— 并发控制：同时只跑 MAX_CONCURRENT 个 fetch ——
let active = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => {
    waiters.push(() => {
      active++;
      resolve();
    });
  });
}

function release(): void {
  active--;
  const next = waiters.shift();
  if (next) next();
}

// —— 同 key 任务合并：6 个 FoodImage 调同 id 的 preloadFoodImage 共享同一 promise ——
const inFlightPromises = new Map<string, Promise<void>>();

/** 预加载单张：命中 IDB 跳过；未命中 fetch + 写盘（带占位图重试） */
export function preloadFoodImage(
  id: string,
  type: ImageType = "ingredient",
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const key = `${type}:${id}`;

  // 已有同 key 在跑？共享同一 promise（所有 caller 一起等结果）
  const existing = inFlightPromises.get(key);
  if (existing) return existing;

  // 新建任务
  const promise = (async () => {
    await acquire();
    try {
      // 1. 缓存命中？
      const hit = await getCachedImage(id, type);
      if (hit) return;

      const url =
        type === "recipe" ? recipeImageUrl(id) : ingredientImageUrl(id);

      // 2. 多次尝试（处理 AI 占位图）
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const ctl = new AbortController();
          const timer = window.setTimeout(
            () => ctl.abort(),
            FETCH_TIMEOUT_MS,
          );
          const r = await fetch(url, {
            mode: "cors",
            credentials: "omit",
            signal: ctl.signal,
          });
          window.clearTimeout(timer);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);

          const blob = await r.blob();

          // 3. blob 太小 → 极可能是 AI 占位图，等 2 秒再试
          if (blob.size < PLACEHOLDER_BYTES && attempt < MAX_ATTEMPTS - 1) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }

          // 4. 写盘
          await setCachedImage(id, type, blob);
          return;
        } catch {
          if (attempt < MAX_ATTEMPTS - 1) {
            await sleep(RETRY_DELAY_MS);
          }
        }
      }
    } finally {
      release();
    }
  })();

  inFlightPromises.set(key, promise);
  promise.finally(() => inFlightPromises.delete(key));

  return promise;
}

/** 批量预加载：fire-and-forget，受全局并发限制 */
export function preloadFoodImages(
  ids: string[],
  type: ImageType = "ingredient",
) {
  for (const id of ids) {
    void preloadFoodImage(id, type);
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
