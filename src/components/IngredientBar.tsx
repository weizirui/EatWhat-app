import { ShoppingBasket, ChevronUp, Sparkles } from "lucide-react";
import { useMenuCart } from "@/store";
import { buildMenuPlan } from "@/lib/menu-plan";

type Props = {
  onOpenBasket: () => void;
  onGenerate: () => void;
};

export default function IngredientBar({ onOpenBasket, onGenerate }: Props) {
  const selected = useMenuCart((s) => s.selected);
  const count = selected.length;
  const ingredientCount = buildMenuPlan(selected).ingredients.length;

  if (count === 0) {
    return (
      <div className="h-16 border-t border-ink/5 bg-cream flex items-center justify-center text-fog text-xs">
        选好菜谱后，可生成采购食材清单
      </div>
    );
  }

  return (
    <div className="border-t border-ink/5 bg-white/90 backdrop-blur px-4 py-2.5 flex items-center gap-3">
      <button
        onClick={onOpenBasket}
        className="flex items-center gap-2 active:scale-95 transition"
      >
        <span className="relative w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center">
          <ShoppingBasket size={16} />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ink text-white text-[10px] font-semibold num flex items-center justify-center">
            {count}
          </span>
        </span>
        <span className="text-[12px] text-fog flex items-center gap-0.5">
          已选菜谱 <ChevronUp size={12} />
        </span>
      </button>

      <div className="flex-1 text-right">
        <div className="text-fog text-[11px]">已选菜谱</div>
        <div className="text-ink font-serif font-semibold text-[15px] num leading-none">
          {count} 道 · 需买 {ingredientCount} 种
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="btn-primary h-10 px-5 text-[14px] flex items-center gap-1.5"
      >
        <Sparkles size={14} /> 生成食材
      </button>
    </div>
  );
}
