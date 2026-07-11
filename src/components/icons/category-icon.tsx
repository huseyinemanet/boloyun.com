import type { CSSProperties } from "react";
import { CategoryNucleoIcon } from "@/components/icons/nucleo";
import type { CategoryRow } from "@/lib/db-categories";
import { sanitizeSvgInput } from "@/lib/sanitize/html";
import { cn } from "@/lib/utils";

const CATEGORY_ICON_COLORS = [
  "oklch(0.852 0.199 91.936)",
  "oklch(0.75 0.183 55.934)",
  "oklch(0.718 0.202 349.761)",
  "oklch(0.702 0.183 293.541)",
  "oklch(0.746 0.16 232.661)",
  "oklch(0.789 0.154 211.53)",
  "oklch(0.765 0.177 163.223)",
  "oklch(0.841 0.238 128.85)",
] as const;

type CategoryIconProps = {
  category: CategoryRow;
  size?: "sm" | "md";
  className?: string;
};

type CategoryIconStyle = CSSProperties & {
  "--category-icon-color": string;
};

export function CategoryIcon({ category, size = "sm", className }: CategoryIconProps) {
  const iconSvg = category.icon_svg ? sanitizeSvgInput(category.icon_svg) : "";
  const style: CategoryIconStyle = {
    "--category-icon-color": getCategoryIconColor(category),
  };
  const frameClassName = cn(
    "category-icon grid shrink-0 place-items-center overflow-hidden rounded-md bg-[color-mix(in_oklch,var(--category-icon-color),transparent_86%)] text-[var(--category-icon-color)] ring-1 ring-inset ring-[color-mix(in_oklch,var(--category-icon-color),transparent_72%)] transition-colors group-hover:bg-[color-mix(in_oklch,var(--category-icon-color),transparent_78%)]",
    size === "sm"
      ? "size-6 [&_svg]:size-[18px] [&_svg]:max-h-[18px] [&_svg]:max-w-[18px]"
      : "size-9 [&_svg]:size-5 [&_svg]:max-h-5 [&_svg]:max-w-5",
    className,
  );

  if (iconSvg) {
    return (
      <span
        data-category-icon={category.slug}
        className={frameClassName}
        style={style}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    );
  }

  if (category.icon_url) {
    const maskImage = `url(${category.icon_url})`;

    return (
      <span data-category-icon={category.slug} className={frameClassName} style={style} aria-hidden="true">
        <span
          className={size === "sm" ? "block size-[18px] bg-current" : "block size-5 bg-current"}
          style={{
            WebkitMaskImage: maskImage,
            maskImage,
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      </span>
    );
  }

  return (
    <span data-category-icon={category.slug} className={frameClassName} style={style} aria-hidden="true">
      <CategoryNucleoIcon category={category} className={size === "sm" ? "size-[18px]" : "size-5"} />
    </span>
  );
}

function getCategoryIconColor(category: CategoryRow) {
  const key = category.slug || category.name;
  let hash = 0;

  for (const character of key) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }

  return CATEGORY_ICON_COLORS[hash % CATEGORY_ICON_COLORS.length];
}
