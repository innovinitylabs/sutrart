import { notFound } from "next/navigation";
import { getListingPageData, normalizeListingHashParam } from "@pari/sdk";
import { Nav } from "@/components/nav";
import { ListingPageView } from "@/components/storefront/listing-page-view";
import { getServerMarketAddress, getServerPublicClient } from "@/lib/chain";
import { loadSyndicatedSignedFeeds } from "@/lib/storefront";

type PageProps = {
  params: Promise<{ listingHash: string }>;
};

export default async function SignedListingPage({ params }: PageProps) {
  const { listingHash } = await params;
  const structHash = normalizeListingHashParam(listingHash);
  const publicClient = getServerPublicClient();
  const marketAddress = getServerMarketAddress();

  if (!marketAddress || !structHash) {
    notFound();
  }

  const data = await getListingPageData({
    publicClient,
    marketAddress,
    kind: "signed",
    structHash,
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
