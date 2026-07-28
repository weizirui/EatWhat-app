/**
 * 食物图片 IndexedDB 缓存层
 * - 首次访问某张食物图：fetch AI 接口 → 拿到 blob → 落盘 IDB → 返回 blob URL（瞬间显示）
 * - 二次访问：先查 IDB，命中就 `URL.createObjectURL(blob)` 直接显示，零网络等待
 *
 * key 格式：`{type}:{id}`，例如 `ingredient:tomato`、`recipe:kung-pao-chicken`
 * value：image Blob（jpeg/png/webp）
 */

const DB_NAME = "food-images";
const DB_VERSION = 1;
const STORE = "images";

// IDB 版本号：image.ts / imageCache.ts 改动时 +1，让旧数据自然失效
const CACHE_VERSION = "v2";

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

/** 查询缓存：返回 Blob 或 null */
export async function getCachedImage(
  id: string,
  type: "ingredient" | "recipe",
): Promise<Blob | null> {
  try {
    const db = await openDB();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(`${CACHE_VERSION}:${type}:${id}`);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** 写入缓存：静默失败（不影响主流程） */
export async function setCachedImage(
  id: string,
  type: "ingredient" | "recipe",
  blob: Blob,
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, `${CACHE_VERSION}:${type}:${id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    /* 静默：配额满 / 浏览器禁用 IDB 都不影响主流程 */
  }
}

/** fetch 远端 → 写缓存 → 返回 blob URL（不写盘就 fallback 原 URL） */
export async function fetchAndCache(
  id: string,
  type: "ingredient" | "recipe",
  remoteUrl: string,
): Promise<{ src: string; cached: boolean }> {
  try {
    const r = await fetch(remoteUrl, { mode: "cors", credentials: "omit" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    // 落盘（不 await 完成也行，主流程不阻塞）
    void setCachedImage(id, type, blob);
    return { src: URL.createObjectURL(blob), cached: false };
  } catch {
    // fetch 失败（CORS / 网络）→ 用原 URL 让 <img> 自己重试
    return { src: remoteUrl, cached: false };
  }
}

/** 完整流程：先查缓存，没命中就 fetch + 写盘 */
export async function getOrFetchFoodImage(
  id: string,
  type: "ingredient" | "recipe",
  remoteUrl: string,
): Promise<{ src: string; cached: boolean; objectUrl: string | null }> {
  const cached = await getCachedImage(id, type);
  if (cached) {
    return { src: URL.createObjectURL(cached), cached: true, objectUrl: null };
  }
  const r = await fetchAndCache(id, type, remoteUrl);
  return { ...r, objectUrl: null };
}

/** 清空所有缓存（设置页「清除缓存」按钮用） */
export async function clearAllCachedImages(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* 静默 */
  }
}

/**
 * 从一个已加载的 <img> 元素用 canvas 抓图 → 落 IDB
 * 不依赖 fetch + CORS 头（img 不带 crossOrigin 即可加载，canvas 可能 tainted）
 * - 抓成功且 blob 足够大（> 3KB）→ 写盘（占位图也会被写，但用 thumbnail 标记）
 * - 抓失败（tainted / 0×0 / blob 太小）→ 静默失败，下次再试
 * 返回是否成功落盘
 */
// < 3KB 视为空白图，3-15KB 可能是占位图（仍写盘，避免浪费空间）
const MIN_BLOB_BYTES = 3_000;

export async function cacheImageFromElement(
  id: string,
  type: "ingredient" | "recipe",
  img: HTMLImageElement,
): Promise<boolean> {
  try {
    if (!img.naturalWidth || !img.naturalHeight) return false;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });
    if (!blob || blob.size < MIN_BLOB_BYTES) return false; // 太小的视为占位图
    await setCachedImage(id, type, blob);
    return true;
  } catch {
    // canvas tainted（服务器无 CORS 头）→ 静默失败
    return false;
  }
}

/** 统计已缓存的图片数量（设置页展示） */
export async function getCachedImageCount(): Promise<number> {
  try {
    const db = await openDB();
    return await new Promise<number>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
