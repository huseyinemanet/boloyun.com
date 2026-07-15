import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes } from "react";

type SoundLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & Partial<Omit<LinkProps, "href">> & {
  href: string;
  native?: boolean;
};

export const SoundLink = forwardRef<HTMLAnchorElement, SoundLinkProps>(function SoundLink(
  { href, native, prefetch, replace, scroll, shallow, locale, onNavigate, ...props },
  ref,
) {
  const isInternal = href.startsWith("/") || href.startsWith("#");

  if (!isInternal) {
    return <a ref={ref} href={href} data-click-sound="true" {...props} />;
  }

  void native;
  return (
    <Link
      ref={ref}
      href={href}
      prefetch={prefetch ?? false}
      replace={replace}
      scroll={scroll}
      shallow={shallow}
      locale={locale}
      onNavigate={onNavigate}
      data-click-sound="true"
      {...props}
    />
  );
});
