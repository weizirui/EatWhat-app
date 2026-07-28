import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Settings as SettingsIcon, Sparkles, Clock } from "lucide-react";
import { RECIPES, type Recipe } from "@/data/recipes";
import { INGREDIENTS } from "@/data/ingredients";
import { useMenuCart } from "@/store";
import { buildMenuPlan } from "@/lib/menu-plan";
import { preloadFoodImages } from "@/lib/preload";
import CategoryBar from "@/components/CategoryBar";
import IngredientBar from "@/components/IngredientBar";
import IngredientDrawer from "@/components/IngredientDrawer";
import FoodImage from "@/components/FoodImage";

type RecipeCategoryTab = {
  id: string;
  name: string;
  emoji: string;
};

const RECIPE_CATEGORIES: RecipeCategoryTab[] = Array.from(
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

const ingredientNameMap = new Map(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient.name]));

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat");
  const [keyword, setKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCat && RECIPE_CATEGORIES.some((category) => category.id === initialCat)
      ? initialCat
      : RECIPE_CATEGORIES[0]?.id ?? "",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selected = useMenuCart((state) => state.selected);
  const menuPlan = useMemo(() => buildMenuPlan(selected), [selected]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return RECIPES;
    const normalizedKeyword = keyword.trim().toLowerCase();
    return RECIPES.filter((recipe) => {
      const ingredientNames = recipe.ingredient_ids
        .map((id) => ingredientNameMap.get(id) ?? id)
        .join(" ");

      return (
        recipe.title.toLowerCase().includes(normalizedKeyword) ||
        recipe.category.toLowerCase().includes(normalizedKeyword) ||
        recipe.difficulty.toLowerCase().includes(normalizedKeyword) ||
        ingredientNames.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [keyword]);

  const grouped = useMemo(() => {
    const map: Record<string, Recipe[]> = {};
    for (const recipe of filtered) {
      (map[recipe.category] ??= []).push(recipe);
    }
    return map;
  }, [filtered]);

  const visibleCategories = useMemo(
    () => RECIPE_CATEGORIES.filter((category) => (grouped[category.id]?.length ?? 0) > 0),
    [grouped],
  );

  useEffect(() => {
    preloadFoodImages(
      RECIPES.map((recipe) => recipe.id),
      "recipe",
    );
  }, []);

  useEffect(() => {
    if (!initialCat) return;
    const raf = requestAnimationFrame(() => {
      scrollToCategory(initialCat);
    });
    return () => cancelAnimationFrame(raf);
  }, [initialCat]);

  useEffect(() => {
    if (keyword.trim()) return;
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const scrollTop = el.scrollTop;
      let current = visibleCategories[0]?.id ?? "";
      for (const category of visibleCategories) {
        const ref = sectionRefs.current[category.id];
        if (ref && ref.offsetTop - scrollTop <= 80) {
          current = category.id;
        }
      }
      setActiveCategory(current);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [visibleCategories, keyword]);

  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
    if (keyword.trim()) {
      setKeyword("");
      requestAnimationFrame(() => scrollToCategory(id));
      return;
    }
    scrollToCategory(id);
  };

  const scrollToCategory = (id: string) => {
    const ref = sectionRefs.current[id];
    const el = scrollRef.current;
    if (!ref || !el) return;
    el.scrollTo({ top: ref.offsetTop - 8 });
  };

  return (
    <div className="h-full w-full flex flex-col bg-cream">
      <header className="px-4 pt-4 pb-2 hairline bg-cream">
        <div className="flex items-center gap-2">
          <button
            aria-label="返回首页"
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-full border border-ink/10 flex items-center justify-center text-ink hover:border-ink/30 active:scale-95 transition shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-serif text-[18px] font-semibold tracking-wide text-ink">
              今晚做哪几道？
            </div>
            <div className="text-[10px] text-fog mt-0.5 tracking-wider">
              先选菜谱，再自动汇总采购食材
            </div>
          </div>
          <button
            aria-label="设置"
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-full border border-ink/10 flex items-center justify-center text-ink hover:border-ink/30 active:scale-95 transition shrink-0"
          >
            <SettingsIcon size={16} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 px-3 h-10 rounded-xl bg-white border border-ink/10">
          <Search size={16} className="text-fog" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜菜谱 / 食材 / 难度"
            className="bg-transparent flex-1 text-[14px] outline-none placeholder:text-fog/80 text-ink"
          />
          {keyword && (
            <button
              onClick={() => setKeyword("")}
              className="text-fog text-xs hover:text-ink"
            >
              清除
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <CategoryBar
          categories={visibleCategories}
          active={activeCategory}
          onClick={handleCategoryClick}
        />

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3"
        >
          {selected.length > 0 && !keyword.trim() && (
            <div className="mb-4 mx-1 p-3 rounded-2xl bg-brand-50 border border-brand/20 flex items-center gap-3 animate-fade-up">
              <div className="w-9 h-9 rounded-full bg-white text-brand flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-ink font-serif font-semibold">
                  已选 {selected.length} 道菜
                </div>
                <div className="text-[11px] text-fog">
                  已汇总 {menuPlan.ingredients.length} 种主食材，去下一步查看采购清单
                </div>
              </div>
            </div>
          )}

          {keyword.trim() ? (
            <div>
              <div className="text-xs text-fog px-1 pb-2">
                共 {filtered.length} 道菜谱匹配
              </div>
              {filtered.length === 0 ? (
                <EmptyResult />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {filtered.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {visibleCategories.map((category) => (
                <section
                  key={category.id}
                  ref={(el) => {
                    sectionRefs.current[category.id] = el as HTMLDivElement | null;
                  }}
                >
                  <div className="flex items-center gap-2 px-1 pb-2">
                    <span className="text-lg">{category.emoji}</span>
                    <h3 className="font-serif text-[15px] text-ink font-semibold">
                      {category.name}
                    </h3>
                    <span className="text-[11px] text-fog">
                      {grouped[category.id]?.length ?? 0} 道
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {grouped[category.id]?.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </section>
              ))}
              {visibleCategories.length === 0 && <EmptyResult />}
              <div className="h-24" />
            </div>
          )}
        </div>
      </div>

      <IngredientBar
        onOpenBasket={() => setDrawerOpen(true)}
        onGenerate={() => navigate("/match")}
      />

      <IngredientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const picked = useMenuCart((state) => state.selected.includes(recipe.id));
  const toggle = useMenuCart((state) => state.toggle);

  return (
    <button
      onClick={() => toggle(recipe.id)}
      className={`bg-white rounded-2xl p-1.5 border text-left transition active:scale-[0.97] ${
        picked ? "border-brand bg-brand-50/40" : "border-ink/5 hover:border-ink/15"
      }`}
    >
      <div className="aspect-square rounded-xl bg-cream-soft relative overflow-hidden">
        <FoodImage
          id={recipe.id}
          type="recipe"
          fallback={recipe.emoji}
          alt={recipe.title}
          className="rounded-xl"
        />
        {picked && (
          <span className="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-brand text-white text-[11px] font-semibold flex items-center justify-center shadow-pop z-10">
            已选
          </span>
        )}
      </div>

      <div className="px-1 pt-2 pb-1">
        <div className="font-serif text-[13px] font-semibold text-ink leading-tight line-clamp-2 min-h-[2.6em]">
          {recipe.title}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-fog">
          <span className="flex items-center gap-0.5">
            <Clock size={10} /> {recipe.minutes} 分钟
          </span>
          <span className="truncate">· {recipe.difficulty}</span>
        </div>
        <div className="mt-1 text-[10px] text-ink-soft line-clamp-1">
          主食材：{recipe.ingredient_ids.map((id) => ingredientNameMap.get(id) ?? id).join("、")}
        </div>
      </div>
    </button>
  );
}

function EmptyResult() {
  return (
    <div className="py-16 text-center">
      <div className="text-4xl mb-2">🍳</div>
      <div className="text-sm text-ink-soft">没找到合适的菜谱，换个关键词试试</div>
    </div>
  );
}
