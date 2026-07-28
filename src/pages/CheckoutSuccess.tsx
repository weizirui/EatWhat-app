import { useNavigate } from "react-router-dom";
import { useLastSubmission } from "@/store";
import { motion } from "framer-motion";
import { Check, ChefHat, ArrowLeft, Mail, BookOpen } from "lucide-react";
import { RECIPES } from "@/data/recipes";
import { INGREDIENTS } from "@/data/ingredients";
import FoodImage from "@/components/FoodImage";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const submission = useLastSubmission((s) => s.submission);

  if (!submission) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-cream px-6 text-center">
        <div className="text-4xl mb-3">🥢</div>
        <div className="font-serif text-ink mb-2">还没有可显示的菜谱</div>
        <button
          onClick={() => navigate("/")}
          className="btn-primary h-10 px-5 mt-2 text-[13px]"
        >
          回到首页
        </button>
      </div>
    );
  }

  const recipes = submission.recipe_ids
    .map((id) => RECIPES.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="h-full w-full flex flex-col bg-cream">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pt-10 pb-6 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="relative w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center"
        >
          <span className="absolute inset-0 rounded-full bg-brand-50 animate-pulse-ring" />
          <span className="relative w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center">
            <Check size={36} strokeWidth={3} />
          </span>
        </motion.div>

        <div className="mt-6 text-center">
          <div className="font-serif text-[22px] text-ink font-semibold">
            采购清单已发出
          </div>
          <div className="text-[12px] text-fog mt-1.5">
            已发送到 {submission.to_email}
          </div>
        </div>

        <div className="w-full mt-6 bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink/5 flex items-center justify-between">
            <span className="text-[11px] text-fog">编号</span>
            <span className="font-serif text-[13px] text-ink num font-semibold">
              {submission.id}
            </span>
          </div>
          <div className="px-4 py-3 border-b border-ink/5 flex items-center justify-between">
            <span className="text-[11px] text-fog flex items-center gap-1">
              <Mail size={11} /> 收件人
            </span>
            <span className="text-[12px] text-ink">{submission.to_email}</span>
          </div>
          <div className="px-4 py-3">
            <div className="text-[11px] text-fog mb-2">
              本次菜谱（{recipes.length} 道）
            </div>
            <ul className="space-y-1.5">
              {recipes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 text-[12px] text-ink"
                >
                  <div className="w-9 h-9 rounded-lg bg-cream-soft shrink-0 overflow-hidden">
                    <FoodImage
                      id={r.id}
                      type="recipe"
                      fallback={r.emoji}
                      alt={r.title}
                      className="rounded-lg"
                    />
                  </div>
                  <span className="flex-1 truncate font-serif font-semibold">
                    {r.title}
                  </span>
                  <span className="text-fog num">{r.minutes} 分钟</span>
                </li>
              ))}
            </ul>
            {submission.ingredient_ids.length > 0 && (
              <>
                <div className="text-[11px] text-fog mt-3 mb-2">采购主食材</div>
                <div className="flex flex-wrap gap-1.5">
                  {submission.ingredient_ids.map((id) => {
                    const ing = INGREDIENTS.find((i) => i.id === id);
                    return (
                      <span
                        key={id}
                        className="text-[11px] px-1.5 py-0.5 rounded-md bg-cream-soft text-ink"
                      >
                        {ing?.emoji} {ing?.name ?? id}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 w-full bg-brand-50 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-white text-brand flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="text-[13px] text-ink font-serif font-semibold">
              想直接开始做菜？
            </div>
            <div className="text-[11px] text-ink-soft mt-0.5 leading-relaxed">
              点下面按钮查看完整做法，附步骤、贴士，一步步跟着来。
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-3 pb-5 border-t border-ink/5 bg-white/80 backdrop-blur space-y-2">
        <button
          onClick={() => navigate("/recipes")}
          className="btn-primary w-full h-12 text-[15px] flex items-center justify-center gap-2"
        >
          <ChefHat size={16} /> 查看完整做法
        </button>
        <button
          onClick={() => navigate("/")}
          className="btn-ghost w-full h-11 text-[13px] flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} /> 回到首页
        </button>
      </div>
    </div>
  );
}
