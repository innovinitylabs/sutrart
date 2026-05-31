import { BrandAsset } from "@/components/brand";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-primary">
      <BrandAsset variant="mark" className="h-12 w-12" label="Loading PARI" />
    </div>
  );
}
