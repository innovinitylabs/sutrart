import { MarketplacePanel } from "@/components/marketplace-panel";
import { Nav } from "@/components/nav";

export default function MarketplacePage() {
  return (
    <div>
      <Nav />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Marketplace</h1>
          <p className="text-muted-foreground text-sm">
            Browse unified onchain and signed listings validated against the protocol.
          </p>
        </div>
        <MarketplacePanel />
      </main>
    </div>
  );
}
