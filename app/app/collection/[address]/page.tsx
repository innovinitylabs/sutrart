import Link from "next/link";
import { notFound } from "next/navigation";
import { getAddress, isAddress, zeroAddress } from "viem";
import { buildCreatorStorefrontPath, getCollectionStorefront } from "@sutrart/sdk";
import { Nav } from "@/components/nav";
import { StorefrontInventorySection } from "@/components/storefront/inventory-section";
import { getServerMarketAddress, getServerPublicClient } from "@/lib/chain";
import { loadSyndicatedSignedFeeds } from "@/lib/storefront";

type PageProps = {
  params: Promise<{ address: string }>;
};

export default async function CollectionStorefrontPage({ params }: PageProps) {
  const { address: rawAddress } = await params;

  if (!isAddress(rawAddress)) {
    notFound();
  }

  const collection = getAddress(rawAddress);
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

  const signedFeeds = await loadSyndicatedSignedFeeds();

  let storefront;
  try {
    storefront = await getCollectionStorefront({
      publicClient,
      marketAddress,
      collection,
      signedFeeds,
    });
  } catch (error) {
    console.warn("[sutrart] Collection storefront rendering failed.", {
      collection,
      error: error instanceof Error ? error.message : String(error),
    });
    notFound();
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto w-full max-w-4xl space-y-10 px-6 py-10">
        <div className="space-y-4">
          {storefront.metadata.bannerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storefront.metadata.bannerImage}
              alt={`${storefront.metadata.name} banner`}
              className="h-40 w-full rounded-lg object-cover"
            />
          ) : null}

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Collection</p>
            <h1 className="text-3xl font-semibold">{storefront.metadata.name}</h1>
            <p className="text-sm text-muted-foreground">{storefront.metadata.symbol}</p>
            {storefront.metadata.description ? (
              <p className="text-sm text-muted-foreground">{storefront.metadata.description}</p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
            <p>
              Creator:{" "}
              <Link
                href={buildCreatorStorefrontPath(storefront.creator)}
                className="font-mono underline-offset-4 hover:underline"
              >
                {storefront.creator}
              </Link>
            </p>
            <p className="font-mono text-xs text-muted-foreground">{storefront.address}</p>
            <p>
              Royalty recipient:{" "}
              {storefront.royaltyRecipient && storefront.royaltyRecipient !== zeroAddress
                ? storefront.royaltyRecipient
                : "None"}
            </p>
            <p>
              Royalty:{" "}
              {storefront.royaltyBps !== null
                ? `${storefront.royaltyBps.toString()} bps`
                : "None"}
            </p>
          </div>
        </div>

        <StorefrontInventorySection
          title="Listed tokens"
          description="Minted tokens with valid onchain or signed listings."
          tokens={storefront.listed}
          emptyMessage="No listed tokens in this collection."
        />

        <StorefrontInventorySection
          title="Unlisted tokens"
          description="Minted tokens without active valid listings."
          tokens={storefront.unlisted}
          emptyMessage="No unlisted tokens."
        />
      </main>
    </div>
  );
}
