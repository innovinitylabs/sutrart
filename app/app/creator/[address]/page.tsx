import { notFound } from "next/navigation";
import { getAddress, isAddress } from "viem";
import { getCreatorStorefront } from "@sutrart/sdk";
import { defaultChain } from "@sutrart/shared";
import { Nav } from "@/components/nav";
import { CollectionGrid } from "@/components/storefront/collection-grid";
import { CreatorStorefrontSyndication } from "@/components/creator-storefront-syndication";
import { StorefrontInventorySection } from "@/components/storefront/inventory-section";
import { getServerMarketAddress, getServerPublicClient } from "@/lib/chain";
import { loadSyndicatedSignedFeeds } from "@/lib/storefront";

type PageProps = {
  params: Promise<{ address: string }>;
};

export default async function CreatorStorefrontPage({ params }: PageProps) {
  const { address: rawAddress } = await params;

  if (!isAddress(rawAddress)) {
    notFound();
  }

  const creator = getAddress(rawAddress);
  const publicClient = getServerPublicClient();
  const marketAddress = getServerMarketAddress();

  if (!marketAddress) {
    return (
      <div>
        <Nav />
        <main className="mx-auto w-full max-w-4xl px-6 py-10">
          <p className="text-sm text-muted-foreground">
            Local contract addresses are missing. Run `pnpm contracts:anvil` and `pnpm
            contracts:deploy:local`.
          </p>
        </main>
      </div>
    );
  }

  const signedFeeds = await loadSyndicatedSignedFeeds({
    chainId: defaultChain.id,
    creator,
  });
  const storefront = await getCreatorStorefront({
    publicClient,
    marketAddress,
    creator,
    chainId: defaultChain.id,
    signedFeeds,
  });

  return (
    <div>
      <Nav />
      <main className="mx-auto w-full max-w-4xl space-y-10 px-6 py-10">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Creator storefront</p>
          <h1 className="text-3xl font-semibold">{creator}</h1>
          <p className="text-sm text-muted-foreground">
            Sovereign inventory surface for collections, onchain listings, and signed liquidity.
          </p>
        </div>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Collections</h2>
            <p className="text-sm text-muted-foreground">
              ERC721RT collections registered to this creator.
            </p>
          </div>
          <CollectionGrid collections={storefront.collections} />
        </section>

        <StorefrontInventorySection
          title="Listed works"
          description="Tokens with valid onchain or signed listings."
          tokens={storefront.listedTokens}
          emptyMessage="No listed works right now."
        />

        <StorefrontInventorySection
          title="Unlisted works"
          description="Owned tokens without active valid listings."
          tokens={storefront.unlistedTokens}
          emptyMessage="No unlisted works."
        />

        <CreatorStorefrontSyndication creatorAddress={creator} />
      </main>
    </div>
  );
}
