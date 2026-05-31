import type { CSSProperties } from "react";
import { brandAssets } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandAssetVariant = "wordmark" | "mark";

const brandAssetSize: Record<BrandAssetVariant, string> = {
  wordmark: "h-8 w-28",
  mark: "h-9 w-9",
};

type BrandAssetProps = {
  variant: BrandAssetVariant;
  className?: string;
  label?: string;
};

export function BrandAsset({ variant, className, label = "PARI" }: BrandAssetProps) {
  const src = variant === "wordmark" ? brandAssets.wordmark : brandAssets.mark;

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block shrink-0 bg-current", brandAssetSize[variant], className)}
      style={
        {
          WebkitMask: `url(${src}) center / contain no-repeat`,
          mask: `url(${src}) center / contain no-repeat`,
        } as CSSProperties
      }
    />
  );
}
