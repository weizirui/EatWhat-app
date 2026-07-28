import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  emoji: string;
};

type Props = {
  categories: Category[];
  active: string;
  onClick: (id: string) => void;
};

export default function CategoryBar({ categories, active, onClick }: Props) {
  return (
    <aside className="w-[88px] shrink-0 overflow-y-auto scrollbar-thin border-r border-ink/5 bg-cream">
      <ul className="py-2">
        {categories.map((c) => {
          const isActive = c.id === active;
          return (
            <li key={c.id}>
              <button
                onClick={() => onClick(c.id)}
                className={cn(
                  "w-full text-left pl-3 pr-2 py-3 relative flex flex-col items-start gap-0.5 transition",
                  isActive ? "text-ink" : "text-ink-soft",
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-brand" />
                )}
                <span className="text-[18px] leading-none">{c.emoji}</span>
                <span
                  className={cn(
                    "text-[12px] mt-1.5 leading-tight",
                    isActive ? "font-semibold" : "font-normal",
                  )}
                >
                  {c.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
