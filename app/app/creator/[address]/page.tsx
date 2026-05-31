import { notFound } from "next/navigation";
import { getAddress, isAddress } from "viem";
import { getCreatorStorefront } from "@pari/sdk";
import { getDefaultChainId, PARI_PROTOCOL_VERSION } from "@pari/shared";
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
  const chainId = getDefaultChainId();
  const publicClient = getServerPublicClient(chainId);
  const marketAddress = getServerMarketAddress(chainId);

  if (!marketAddress) {
    return (
      <div>
        <Nav />
        <main className="mx-auto w-full max-w-4xl px-6 py-10">
          <p className="text-sm text-muted-foreground">
            No deployment manifest found for chain {chainId}. Deploy locally or to Sepolia, then set
            NEXT_PUBLIC_DEFAULT_CHAIN_ID if needed.
          </p>
        </main>
      </div>
    );
  }

  const signedFeeds = await loadSyndicatedSignedFeeds({
    chainId,
    creator,
  });
  const storefront = await getCreatorStorefront({
    publicClient,
    marketAddress,
    creator,
    chainId,
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
          <p className="text-xs text-muted-foreground">Protocol {PARI_PROTOCOL_VERSION}</p>
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
