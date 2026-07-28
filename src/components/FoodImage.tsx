import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ingredientImageUrl, recipeImageUrl } from "@/lib/image";

type Props = {
  /** ingredient id 或 recipe id */
  id: string;
  /** 降级时显示的 emoji */
  fallback: string;
  /** 文字描述，用于 alt */
  alt: string;
  className?: string;
  /** 图片类型 */
  type?: "ingredient" | "recipe";
  /** 强制重新加载（key 变化时） */
  refreshKey?: string | number;
  /** 图片尺寸 */
  size?: "square" | "square_hd" | "portrait_4_3" | "landscape_4_3";
};

export default function FoodImage({
  id,
  fallback,
  alt,
  className,
  type = "ingredient",
  refreshKey,
  size = "square",
}: Props) {
  const localImageUrl = useMemo(
    () =>
      type === "recipe"
        ? recipeImageUrl(id, size)
        : ingredientImageUrl(id, size),
    [id, type, size],
  );
  const [src, setSrc] = useState(localImageUrl);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setSrc(localImageUrl);
  }, [id, type, refreshKey, localImageUrl]);

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden bg-cream-soft",
        className,
      )}
      role="img"
      aria-label={alt}
    >
      {!loaded && (
        <>
          <div className="absolute inset-0 skeleton-shimmer opacity-70" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[44px] leading-none opacity-35">{fallback}</span>
          </div>
        </>
      )}

      {!errored && (
        <img
          key={`${id}-${refreshKey ?? ""}`}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setLoaded(true);
          }}
          onError={() => {
            setErrored(true);
          }}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
