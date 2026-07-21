import Image from "next/image";

type BolOyunLogoProps = {
  className?: string;
};

export function BolOyunLogo({ className }: BolOyunLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      aria-hidden="true"
      className={className}
      width={1152}
      height={411}
      sizes="160px"
      priority
      unoptimized
    />
  );
}
