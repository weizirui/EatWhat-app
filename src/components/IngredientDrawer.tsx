import { Trash2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuCart } from "@/store";
import { RECIPES } from "@/data/recipes";
import { buildMenuPlan } from "@/lib/menu-plan";
import FoodImage from "@/components/FoodImage";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function IngredientDrawer({ open, onClose }: Props) {
  const selected = useMenuCart((s) => s.selected);
  const toggle = useMenuCart((s) => s.toggle);
  const clear = useMenuCart((s) => s.clear);

  const items = selected
    .map((id) => RECIPES.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const ingredientCount = buildMenuPlan(selected).ingredients.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 bg-ink/40 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 z-50 bg-cream rounded-t-3xl max-h-[78%] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="px-5 pt-3 pb-3 relative">
              <div className="w-10 h-1 bg-ink/15 rounded-full mx-auto" />
              <div className="flex items-center justify-between mt-3">
                <div>
                  <div className="font-serif text-[17px] text-ink font-semibold">
                    已选菜谱
                  </div>
                  <div className="text-[11px] text-fog mt-0.5">
                    已选 {items.length} 道 · 共需 {ingredientCount} 种主食材
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => clear()}
                    className="text-[12px] text-fog flex items-center gap-1 hover:text-ink"
                  >
                    <Trash2 size={13} /> 清空
                  </button>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-ink/5 text-ink flex items-center justify-center hover:bg-ink/10"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-4">
              {items.length === 0 ? (
                <div className="py-12 text-center text-fog text-sm">
                  还没有选菜
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => toggle(it.id)}
                      className="relative bg-white rounded-2xl border border-brand p-1.5 flex flex-col items-center gap-1 text-left active:scale-95 transition"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-cream-soft relative">
                        <FoodImage
                          id={it.id}
                          type="recipe"
                          fallback={it.emoji}
                          alt={it.title}
                          className="rounded-xl"
                        />
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center z-10">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </div>
                      <div className="w-full px-1">
                        <div className="text-[12px] font-serif text-ink font-semibold line-clamp-2 min-h-[2.6em]">
                          {it.title}
                        </div>
                        <div className="text-[10px] text-fog mt-0.5">
                          {it.minutes} 分钟 · {it.difficulty}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
