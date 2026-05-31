import { notFound } from "next/navigation";
import { getListingPageData } from "@pari/sdk";
import { Nav } from "@/components/nav";
import { ListingPageView } from "@/components/storefront/listing-page-view";
import { getServerMarketAddress, getServerPublicClient } from "@/lib/chain";
import { loadSyndicatedSignedFeeds } from "@/lib/storefront";

type PageProps = {
  params: Promise<{ listingId: string }>;
};

export default async function OnchainListingPage({ params }: PageProps) {
  const { listingId: rawListingId } = await params;
  const listingId = BigInt(rawListingId);
  const publicClient = getServerPublicClient();
  const marketAddress = getServerMarketAddress();

  if (!marketAddress || listingId <= BigInt(0)) {
    notFound();
  }

  const data = await getListingPageData({
    publicClient,
    marketAddress,
    kind: "onchain",
    listingId,
    signedFeeds: await loadSyndicatedSignedFeeds(),
  });

  if (!data) {
    notFound();
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <ListingPageView data={data} marketAddress={marketAddress} />
      </main>
    </div>
  );
}
