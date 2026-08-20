import type { ComponentPropsWithoutRef } from "react";

type BrandMarkProps = Omit<ComponentPropsWithoutRef<"img">, "src" | "alt"> & {
  decorative?: boolean;
};

export function BrandMark({ decorative = false, ...props }: BrandMarkProps) {
  return <img src="/brand/shinromii-mark.png" alt={decorative ? "" : "SHINROMii logo mark"} {...props} />;
}
