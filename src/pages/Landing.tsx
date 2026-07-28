import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Settings,
  Sparkles,
  ArrowRight,
  Flame,
  BookOpen,
  ShoppingBasket,
} from "lucide-react";
import { useMenuCart } from "@/store";
import { RECIPES, type Recipe } from "@/data/recipes";
import { getDailyRecommendations } from "@/lib/daily";
import { buildMenuPlan } from "@/lib/menu-plan";
import FoodImage from "@/components/FoodImage";

const RECIPE_CATEGORIES = Array.from(
  new Map(
    RECIPES.map((recipe) => [
      recipe.category,
      {
        id: recipe.category,
        name: recipe.category,
        emoji: recipe.emoji,
      },
    ]),
  ).values(),
);

export default function Landing() {
  const navigate = useNavigate();
  const selected = useMenuCart((s) => s.selected);
  const ingredientCount = buildMenuPlan(selected).ingredients.length;

  // 今日推荐：按当天日期种子洗牌 213 道菜取 6 道
  // 同一天内稳定，跨天自动换新
  const recommended: Recipe[] = useMemo(() => getDailyRecommendations(6), []);

  // 图片加载由 FoodImage 内部处理（<img> + canvas 抓图，不依赖 CORS）

  return (
    <div className="h-full w-full flex flex-col bg-cream overflow-hidden">
      {/* —— 顶部 Header —— */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[11px] text-fog">晚上好 👋</div>
          <div className="font-serif text-ink text-[18px] font-semibold leading-none mt-1">
            今晚吃什么？
          </div>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-full bg-white border border-ink/5 flex items-center justify-center text-ink-soft hover:text-ink active:scale-95"
          aria-label="设置"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* —— 搜索框（占位） —— */}
      <div className="px-4 pb-3 shrink-0">
        <div className="bg-white rounded-2xl h-10 flex items-center gap-2 px-3 border border-ink/5 shadow-card">
          <Search size={14} className="text-fog" />
          <div className="text-[12px] text-fog flex-1">搜菜品、食材...</div>
          <kbd className="text-[10px] text-fog bg-cream-soft px-1.5 py-0.5 rounded-md font-sans">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* —— 主内容区（可滚动） —— */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Hero 主卡 */}
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => navigate("/ingredients")}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-400 p-5 text-white shadow-pop cursor-pointer active:scale-[0.99]"
          >
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
            <div className="absolute -right-4 top-6 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute right-2 bottom-0 text-[72px] leading-none opacity-30 select-none">
              🍜
            </div>
            <div className="relative z-10">
              <div className="text-[10px] tracking-[0.2em] opacity-90 flex items-center gap-1 font-medium">
                <Sparkles size={10} /> TONIGHT&apos;S MENU
              </div>
              <div className="font-serif text-[24px] font-semibold leading-tight mt-2">
                先选今晚想吃的菜
              </div>
              <div className="text-[12px] opacity-90 mt-1">
                自动整理采购食材，不用自己抄清单
              </div>
              <div className="mt-4 bg-white text-brand font-medium text-[13px] h-10 px-4 rounded-full inline-flex items-center gap-1.5 shadow-pop">
                + 开始选菜
                <ArrowRight size={14} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* 菜谱分类入口 */}
        <SectionHeader
          icon={<BookOpen size={14} className="text-brand" />}
          title="按菜谱分类选"
          action={{ label: "全部", onClick: () => navigate("/ingredients") }}
        />
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-3 gap-x-2">
            {RECIPE_CATEGORIES.map((cat) => (
              <CategoryItem key={cat.id} cat={cat} />
            ))}
          </div>
        </div>

        {/* 今日推荐 - 横滑卡片 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 px-4">
            <div className="font-serif text-[15px] text-ink font-semibold flex items-center gap-1.5">
              <Flame size={14} className="text-brand" /> 今日推荐
            </div>
            <div className="text-[11px] text-fog">{recommended.length} 道精选</div>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-thin px-4 pb-1 snap-x">
            {recommended.map((r) => (
              <RecommendedCard key={r.id} recipe={r} />
            ))}
          </div>
        </div>

        {/* 快速开做 */}
        <SectionHeader
          icon={<Sparkles size={14} className="text-brand" />}
          title="快速开做"
          action={{ label: "更多", onClick: () => navigate("/ingredients") }}
        />
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {recommended.slice(0, 4).map((recipe) => (
              <QuickRecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate("/ingredients")}
              />
            ))}
          </div>
        </div>

        {/* 使用提示 */}
        <div className="mt-6 mx-4 rounded-2xl bg-white border border-ink/5 p-3.5 flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-ink font-serif font-semibold">
              怎么用？
            </div>
            <div className="text-[11px] text-ink-soft mt-1 leading-relaxed">
              <b>①</b> 先选今晚想做的菜 →
              <b>②</b> 自动汇总主食材 →
              <b>③</b> 核对采购清单 →
              <b>④</b> 一键发到指定邮箱
            </div>
          </div>
        </div>

        <div className="h-2" />
      </div>

      {/* —— 底部菜谱清单（仅在选了菜时显示） —— */}
      {selected.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 pt-3 pb-5 border-t border-ink/5 bg-white/95 backdrop-blur flex items-center gap-3 shrink-0"
        >
          <div className="w-9 h-9 rounded-full bg-brand-50 text-brand flex items-center justify-center shrink-0 relative">
            <ShoppingBasket size={16} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[10px] font-semibold flex items-center justify-center num">
              {selected.length}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-fog">已选菜谱</div>
            <div className="text-ink font-serif font-semibold text-[14px] leading-none">
              已选 {selected.length} 道
            </div>
            <div className="text-[10px] text-fog mt-1">
              预计需要 {ingredientCount} 种主食材
            </div>
          </div>
          <button
            onClick={() => navigate("/ingredients")}
            className="text-[12px] h-9 px-3 rounded-full border border-ink/10 text-ink-soft hover:border-ink/30 active:scale-95"
          >
            继续选菜
          </button>
          <button
            onClick={() => navigate("/match")}
            className="btn-primary h-9 px-4 text-[12px] flex items-center gap-1"
          >
            看食材 <ArrowRight size={12} />
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  子组件
// ════════════════════════════════════════

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between mb-2.5 mt-6 px-4">
      <div className="font-serif text-[15px] text-ink font-semibold flex items-center gap-1.5">
        {icon}
        {title}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[11px] text-fog flex items-center gap-0.5 hover:text-ink-soft"
        >
          {action.label} <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

function CategoryItem({
  cat,
}: {
  cat: {
    id: string;
    name: string;
    emoji: string;
  };
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/ingredients?cat=${cat.id}`)}
      className="flex flex-col items-center gap-1.5 active:scale-95"
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-ink/5 flex items-center justify-center text-[22px] shadow-card">
        {cat.emoji}
      </div>
      <div className="text-[11px] text-ink-soft">{cat.name}</div>
    </button>
  );
}

function RecommendedCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate();
  const addMany = useMenuCart((s) => s.addMany);

  const handleClick = () => {
    // 快速加入今日推荐，并直接进入采购清单页。
    addMany([recipe.id]);
    navigate("/match");
  };

  return (
    <button
      onClick={handleClick}
      className="shrink-0 w-[140px] text-left active:scale-[0.97] snap-start"
    >
      <div className="aspect-square rounded-2xl overflow-hidden bg-cream-soft relative">
        <FoodImage
          id={recipe.id}
          type="recipe"
          fallback={recipe.emoji}
          alt={recipe.title}
          className="rounded-none"
        />
        <div className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-md bg-white/95 text-ink font-medium num">
          ⏱ {recipe.minutes}&apos;
        </div>
      </div>
      <div className="mt-1.5 px-0.5">
        <div className="font-serif text-[12px] text-ink font-semibold line-clamp-1">
          {recipe.title}
        </div>
        <div className="text-[10px] text-fog mt-0.5 truncate">
          {recipe.difficulty}
        </div>
      </div>
    </button>
  );
}

function QuickRecipeCard({
  recipe,
  onClick,
}: {
  recipe: Recipe;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 active:scale-95"
    >
      <div className="aspect-square w-full rounded-2xl overflow-hidden bg-cream-soft border border-ink/5">
        <FoodImage
          id={recipe.id}
          type="recipe"
          fallback={recipe.emoji}
          alt={recipe.title}
          className="rounded-none"
        />
      </div>
      <div className="w-full px-1">
        <div className="text-[11px] text-ink text-center truncate w-full font-semibold">
          {recipe.title}
        </div>
        <div className="text-[10px] text-ink-soft text-center truncate w-full mt-0.5">
          {recipe.category}
        </div>
      </div>
    </button>
  );
}
