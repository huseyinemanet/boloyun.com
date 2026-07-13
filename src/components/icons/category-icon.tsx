import type { CSSProperties } from "react";
import { CategoryNucleoIcon } from "@/components/icons/nucleo";
import type { CategoryRow } from "@/lib/db-categories";
import { sanitizeSvgInput } from "@/lib/sanitize/html";
import { cn } from "@/lib/utils";

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
    "--category-icon-color": "var(--primary)",
  };
  const frameClassName = cn(
    "category-icon grid shrink-0 place-items-center overflow-hidden rounded-sm bg-[color-mix(in_oklch,var(--category-icon-color),transparent_86%)] text-[var(--category-icon-color)] transition-colors group-hover:bg-[color-mix(in_oklch,var(--category-icon-color),transparent_78%)]",
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
