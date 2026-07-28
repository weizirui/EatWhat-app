import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Clock,
  Send,
  ChefHat,
  ChevronDown,
  ShoppingBasket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { INGREDIENTS } from "@/data/ingredients";
import { useMenuCart } from "@/store";
import { buildMenuPlan } from "@/lib/menu-plan";
import SendSheet from "@/components/SendSheet";
import FoodImage from "@/components/FoodImage";

const ingredientNameMap = new Map(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient.name]));

export default function RecipeMatch() {
  const navigate = useNavigate();
  const selected = useMenuCart((s) => s.selected);
  const [sendOpen, setSendOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const plan = useMemo(() => buildMenuPlan(selected), [selected]);

  if (selected.length === 0 || plan.recipes.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-cream px-6 text-center">
        <div className="text-4xl mb-3">🧾</div>
        <div className="font-serif text-ink">还没选菜谱，先去挑几道今晚想做的</div>
        <button
          onClick={() => navigate("/ingredients")}
          className="btn-primary h-10 px-5 mt-4 text-[13px]"
        >
          去选菜谱
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-cream">
      <div className="px-4 py-3 hairline bg-cream flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate("/ingredients")}
          className="w-9 h-9 rounded-full border border-ink/10 text-ink flex items-center justify-center hover:border-ink/30 active:scale-95"
          aria-label="返回"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="font-serif text-[15px] text-ink font-semibold flex-1 text-center -ml-9">
          采购清单
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
        <div className="mb-3 p-3 rounded-2xl bg-brand-50 border border-brand/20 flex items-start gap-2.5 animate-fade-up">
          <div className="w-8 h-8 rounded-full bg-white text-brand flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-ink font-serif font-semibold">
              基于你选的 {plan.recipes.length} 道菜
            </div>
            <div className="text-[11px] text-ink-soft mt-0.5 leading-relaxed">
              已汇总 <b className="text-brand">{plan.ingredients.length}</b> 种主食材
            </div>
          </div>
        </div>

        <SectionTitle>采购主食材 · 共 {plan.ingredients.length} 种</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {plan.ingredients.map((item) => (
            <motion.div
              key={item.ingredient.id}
              layout
              className="rounded-2xl border border-ink/5 bg-white overflow-hidden"
            >
              <div className="aspect-square w-full bg-cream-soft relative overflow-hidden">
                <FoodImage
                  id={item.ingredient.id}
                  fallback={item.ingredient.emoji}
                  alt={item.ingredient.name}
                  className="rounded-none"
                />
                <span className="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-brand text-white text-[11px] font-semibold flex items-center justify-center shadow-pop z-10">
                  x{item.count}
                </span>
              </div>

              <div className="p-2">
                <div className="font-serif text-[13px] text-ink font-semibold leading-tight">
                  {item.ingredient.name}
                </div>
                <div className="text-[10px] text-fog mt-1 line-clamp-2">
                  用于 {item.recipes.map((recipe) => recipe.title).join("、")}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="h-4" />
        <SectionTitle>已选菜谱 · 共 {plan.recipes.length} 道</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {plan.recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              expanded={expandedId === recipe.id}
              onToggleExpand={() =>
                setExpandedId((id) => (id === recipe.id ? null : recipe.id))
              }
            />
          ))}
        </div>

        <div className="h-20" />
      </div>

      <motion.button
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={() => setSendOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                   h-12 pl-4 pr-5 rounded-full
                   bg-brand text-white font-semibold text-[14px]
                   shadow-pop active:scale-95 active:brightness-90
                   transition
                   flex items-center gap-2.5 cursor-pointer"
      >
        <div className="num w-6 h-6 rounded-full bg-white/25 text-white text-[12px] font-semibold flex items-center justify-center">
          {plan.ingredients.length}
        </div>
        发送采购清单
        <Send size={15} strokeWidth={2.2} />
      </motion.button>

      <SendSheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSuccess={() => {
          setSendOpen(false);
          navigate("/checkout-success");
        }}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2 mt-1">
      <div className="text-[11px] tracking-widest text-fog">{children}</div>
      <div className="flex-1 h-px bg-ink/5" />
    </div>
  );
}

function RecipeCard({
  recipe,
  expanded,
  onToggleExpand,
}: {
  recipe: ReturnType<typeof buildMenuPlan>["recipes"][number];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <motion.div
      layout
      className="rounded-2xl border overflow-hidden transition border-ink/5 bg-white"
    >
      <button
        onClick={onToggleExpand}
        className="w-full text-left"
        aria-label={`查看 ${recipe.title}`}
      >
        <div className="aspect-square w-full bg-cream-soft relative overflow-hidden">
          <FoodImage
            id={recipe.id}
            type="recipe"
            fallback={recipe.emoji}
            alt={recipe.title}
            className="rounded-none"
          />
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center shadow-pop z-10">
            <Check size={12} strokeWidth={3} />
          </span>
        </div>

        <div className="p-2">
          <div className="font-serif text-[13px] text-ink font-semibold leading-tight line-clamp-2 min-h-[2.4em]">
            {recipe.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-fog">
            <span className="flex items-center gap-0.5">
              <Clock size={9} /> {recipe.minutes}分钟
            </span>
            <span className="truncate">· {recipe.difficulty}</span>
          </div>
        </div>
      </button>

      <div className="px-2 pb-2 flex items-center justify-between">
        <div className="text-[10px] text-fog flex items-center gap-1">
          <ShoppingBasket size={10} />
          {recipe.ingredient_ids.length} 种主食材
        </div>
        <button
          onClick={onToggleExpand}
          className="text-[10px] text-fog flex items-center gap-0.5 hover:text-ink"
        >
          详情
          <ChevronDown
            size={11}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-ink/5 bg-cream"
          >
            <div className="p-3 space-y-2">
              <div>
                <div className="text-[10px] tracking-widest text-fog mb-1 flex items-center gap-1">
                  <ChefHat size={10} /> 主食材
                </div>
                <div className="text-[11px] text-ink leading-relaxed flex flex-wrap gap-1">
                  {recipe.ingredient_ids.map((id) => (
                    <span key={id} className="text-ink">
                      {ingredientNameMap.get(id) ?? id}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-fog mt-1">
                  辅料：{recipe.base_seasonings.join("、")}
                </div>
              </div>
              <ol className="space-y-1">
                {recipe.steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-1.5 text-[11px] text-ink leading-relaxed"
                  >
                    <span className="num w-3.5 h-3.5 rounded-full bg-brand-50 text-brand text-[9px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="text-[11px] text-ink-soft bg-white rounded-lg p-1.5 leading-relaxed">
                💡 {recipe.tip}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
