import {
  fetchSignedListingFeed,
  type SignedListingFeed,
  type SignedListingOrder,
} from "@sutrart/sdk";
import { loadLocalSignedListingFeed } from "@/lib/syndication";

export async function loadSyndicatedSignedFeeds(): Promise<SignedListingFeed[]> {
  const feeds: SignedListingFeed[] = [];
  const localFeed = loadLocalSignedListingFeed();

  if (localFeed) {
    feeds.push(localFeed);
  }

  const remoteFeedUrl = process.env.NEXT_PUBLIC_SIGNED_LISTING_FEED_URL;
  if (remoteFeedUrl) {
    try {
      feeds.push(await fetchSignedListingFeed(remoteFeedUrl));
    } catch {
      // Ignore unreachable remote feeds during storefront assembly.
    }
  }

  return feeds;
}

export function loadClientSyndicatedSignedFeeds(): SignedListingFeed[] {
  const localFeed = loadLocalSignedListingFeed();
  return localFeed ? [localFeed] : [];
}

export function flattenSyndicatedOrders(feeds: SignedListingFeed[]): SignedListingOrder[] {
  return feeds.flatMap((feed) => feed.orders);
}
