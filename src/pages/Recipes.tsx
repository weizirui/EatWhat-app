import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { useLastSubmission } from "@/store";
import { RECIPES } from "@/data/recipes";
import { INGREDIENTS } from "@/data/ingredients";
import FoodImage from "@/components/FoodImage";

export default function Recipes() {
  const navigate = useNavigate();
  const submission = useLastSubmission((s) => s.submission);
  const [index, setIndex] = useState(0);

  const recipeIds = useMemo(() => {
    if (submission?.recipe_ids?.length) return submission.recipe_ids;
    return RECIPES.map((r) => r.id);
  }, [submission]);

  const recipes = useMemo(
    () =>
      recipeIds
        .map((id) => RECIPES.find((r) => r.id === id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    [recipeIds],
  );

  if (recipes.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-cream px-6 text-center">
        <div className="text-4xl mb-3">📖</div>
        <div className="font-serif text-ink">还没有菜谱可看</div>
        <button
          onClick={() => navigate("/")}
          className="btn-primary h-10 px-5 mt-4 text-[13px]"
        >
          回到首页
        </button>
      </div>
    );
  }

  const recipe = recipes[index];
  const owned = new Set(submission?.ingredient_ids ?? []);

  return (
    <div className="h-full w-full flex flex-col bg-cream">
      <TopBar
        onBack={() => navigate("/match")}
        title="完整做法"
        rightSlot={
          recipes.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <button
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="w-8 h-8 rounded-full border border-ink/10 text-ink flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] text-fog num min-w-[28px] text-center">
                {index + 1}/{recipes.length}
              </span>
              <button
                disabled={index >= recipes.length - 1}
                onClick={() => setIndex((i) => Math.min(recipes.length - 1, i + 1))}
                className="w-8 h-8 rounded-full border border-ink/10 text-ink flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pt-3 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={recipe.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-3xl border border-ink/5 p-3">
              <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden bg-cream-soft relative">
                <FoodImage
                  id={recipe.id}
                  type="recipe"
                  fallback={recipe.emoji}
                  alt={recipe.title}
                  size="landscape_4_3"
                  className="rounded-2xl"
                />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[18px] text-ink font-semibold leading-tight">
                    {recipe.title}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-fog">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {recipe.minutes} 分钟
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles size={11} /> {recipe.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-ink/5 p-5">
              <div className="text-[11px] tracking-widest text-fog mb-3">主食材</div>
              <div className="flex flex-wrap gap-1.5">
                {recipe.ingredient_ids.map((id) => {
                  const ing = INGREDIENTS.find((i) => i.id === id);
                  const have = owned.size > 0 ? owned.has(id) : true;
                  return (
                    <span
                      key={id}
                      className={`text-[12px] px-2 py-1 rounded-md ${
                        have
                          ? "bg-ink/5 text-ink"
                          : "bg-red-50 text-red-500 line-through opacity-80"
                      }`}
                    >
                      {ing?.emoji} {ing?.name ?? id}
                    </span>
                  );
                })}
              </div>
              <div className="text-[12px] text-fog mt-3">
                辅料：{recipe.base_seasonings.join("、")}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-ink/5 p-5">
              <div className="text-[11px] tracking-widest text-fog mb-3">做法</div>
              <ol className="space-y-3">
                {recipe.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="num w-6 h-6 rounded-full bg-brand-50 text-brand text-[12px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-ink leading-relaxed">
                      {s}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-brand-50 rounded-3xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-brand flex items-center justify-center shrink-0">
                <Lightbulb size={15} />
              </div>
              <div>
                <div className="text-[12px] text-ink-soft font-semibold mb-1">
                  小贴士
                </div>
                <div className="text-[12px] text-ink leading-relaxed">
                  {recipe.tip}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TopBar({
  onBack,
  title,
  rightSlot,
}: {
  onBack: () => void;
  title: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 hairline bg-cream flex items-center gap-2">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-full border border-ink/10 text-ink flex items-center justify-center hover:border-ink/30 active:scale-95"
        aria-label="返回"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="font-serif text-[15px] text-ink font-semibold flex-1 text-center -ml-9">
        {title}
      </div>
      <div className="w-9 flex items-center justify-end">{rightSlot}</div>
    </div>
  );
}
