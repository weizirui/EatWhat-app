import type { Ingredient } from "@/data/ingredients";
import FoodImage from "@/components/FoodImage";

type Props = {
  ingredient: Ingredient;
};

/**
 * 保留纯展示卡片，方便后续在食材清单页复用。
 * 当前主流程已经改成先选菜谱，这个组件不再承担选择态。
 */
export default function IngredientCard({ ingredient }: Props) {
  return (
    <div className="bg-white rounded-xl p-1.5 border border-ink/5 flex flex-col gap-1 text-left">
      <div className="aspect-square rounded-lg bg-cream-soft relative overflow-hidden">
        <FoodImage
          id={ingredient.id}
          fallback={ingredient.emoji}
          alt={ingredient.name}
          className="rounded-lg"
        />
      </div>

      <div className="font-serif text-[12px] font-semibold text-ink leading-tight text-center px-0.5 truncate">
        {ingredient.name}
      </div>
    </div>
  );
}
