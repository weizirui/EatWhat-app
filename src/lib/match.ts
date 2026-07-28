import { INGREDIENTS, type Ingredient } from "@/data/ingredients";
import { RECIPES, type Recipe } from "@/data/recipes";

export type MatchedRecipe = {
  recipe: Recipe;
  matched: Ingredient[];
  missing: Ingredient[];
  matchedCount: number;
  total: number;
  /** true = 用户已选齐所有主食材，可以直接开做 */
  canCook: boolean;
};

/**
 * 根据用户已选食材，匹配所有至少有 1 种主食材命中的食谱
 * 排序：canCook 优先 → matched 多 → 所需总食材少
 */
export function matchRecipes(selectedIds: string[]): MatchedRecipe[] {
  if (selectedIds.length === 0) return [];
  const selected = new Set(selectedIds);
  const ingMap = new Map(INGREDIENTS.map((i) => [i.id, i]));

  const out: MatchedRecipe[] = [];
  for (const r of RECIPES) {
    const matched: Ingredient[] = [];
    const missing: Ingredient[] = [];
    for (const id of r.ingredient_ids) {
      const ing = ingMap.get(id);
      if (!ing) continue;
      if (selected.has(id)) matched.push(ing);
      else missing.push(ing);
    }
    if (matched.length === 0) continue;
    out.push({
      recipe: r,
      matched,
      missing,
      matchedCount: matched.length,
      total: r.ingredient_ids.length,
      canCook: missing.length === 0,
    });
  }

  out.sort((a, b) => {
    if (a.canCook !== b.canCook) return a.canCook ? -1 : 1;
    if (a.matchedCount !== b.matchedCount) return b.matchedCount - a.matchedCount;
    return a.total - b.total;
  });

  return out;
}
