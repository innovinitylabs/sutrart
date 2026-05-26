import {
  fetchSignedListingFeed,
  mergeSignedFeeds,
  type SignedListingFeedV1,
} from "@sutrart/sdk";
import type { Address } from "viem";
import {
  loadAllLocalFeeds,
  loadCreatorFeed,
  loadMarketplaceFeedUrls,
  mergeLocalFeeds,
} from "@/lib/syndication";

export async function loadSyndicatedSignedFeeds(options?: {
  chainId?: number;
  creator?: Address;
}): Promise<SignedListingFeedV1[]> {
  const feeds: SignedListingFeedV1[] = [];

  if (options?.chainId && options.creator) {
    const creatorFeed = loadCreatorFeed(options.chainId, options.creator);
    if (creatorFeed) {
      feeds.push(creatorFeed);
    }
  }

  if (options?.chainId) {
    feeds.push(...loadAllLocalFeeds(options.chainId));
  }

  const remoteFeedUrl = process.env.NEXT_PUBLIC_SIGNED_LISTING_FEED_URL;
  if (remoteFeedUrl) {
    try {
      feeds.push(await fetchSignedListingFeed(remoteFeedUrl));
    } catch {
      // Ignore unreachable configured feed URLs during server assembly.
    }
  }

  if (options?.chainId) {
    const urls = loadMarketplaceFeedUrls(options.chainId);
    for (const url of urls) {
      try {
        feeds.push(await fetchSignedListingFeed(url));
      } catch {
        // Ignore unreachable marketplace feed URLs.
      }
    }
  }

  const unique = dedupeFeeds(feeds);
  return unique;
}

export async function loadMergedSyndicatedFeed(options: {
  chainId: number;
  market: Address;
  creator?: Address;
}): Promise<SignedListingFeedV1 | null> {
  const feeds = await loadSyndicatedSignedFeeds({
    chainId: options.chainId,
    creator: options.creator,
  });

  const relevant = feeds.filter(
    (feed) =>
      feed.chainId === options.chainId &&
      feed.market.toLowerCase() === options.market.toLowerCase()
  );

  if (relevant.length === 0) {
    return null;
  }

  if (relevant.length === 1) {
    return relevant[0];
  }

  return mergeSignedFeeds(relevant, options.chainId, options.market);
}

function dedupeFeeds(feeds: SignedListingFeedV1[]): SignedListingFeedV1[] {
  const seen = new Set<string>();
  const unique: SignedListingFeedV1[] = [];

  for (const feed of feeds) {
    const key = `${feed.chainId}:${feed.market}:${feed.metadata?.creator ?? "unknown"}:${feed.orders.length}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(feed);
  }

  return unique;
}

export function loadClientSyndicatedSignedFeeds(chainId: number, creator?: Address): SignedListingFeedV1[] {
  const local = loadAllLocalFeeds(chainId, creator);
  const merged = mergeLocalFeeds(local);
  return merged ? [merged] : [];
}
