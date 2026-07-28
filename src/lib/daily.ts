/**
 * 每日推荐算法
 * - 用当天日期做种子 → 洗牌 RECIPES → 取前 N 道
 * - 同一天内稳定（不会刷新就变）
 * - 跨天自动换新
 */
import { RECIPES, type Recipe } from "@/data/recipes";

/** 当天种子：YYYYMMDD 数字，例 20260707 */
function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** LCG 伪随机（保证同种子产出同序列） */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Fisher-Yates 洗牌 */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 今日推荐 N 道菜（同一天稳定，跨天换新） */
export function getDailyRecommendations(count = 6): Recipe[] {
  return shuffle(RECIPES, seededRandom(todaySeed())).slice(0, count);
}
