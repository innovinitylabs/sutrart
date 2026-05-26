import {
  parseSignedListingFeed,
  serializeSignedListingFeed,
  type SignedListingFeed,
  type SignedListingOrder,
} from "@sutrart/sdk";

const LOCAL_SIGNED_LISTING_FEED_KEY = "sutrart:signed-listing-feed";

export function loadLocalSignedListingFeed(): SignedListingFeed | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LOCAL_SIGNED_LISTING_FEED_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parseSignedListingFeed(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalSignedListingOrder(
  chainId: number,
  market: `0x${string}`,
  order: SignedListingOrder
): SignedListingFeed {
  const existing = loadLocalSignedListingFeed();
  const feed: SignedListingFeed =
    existing &&
    existing.chainId === chainId &&
    existing.market.toLowerCase() === market.toLowerCase()
      ? existing
      : {
          version: 1,
          chainId,
          market,
          orders: [],
        };

  const nextOrders = feed.orders.filter((entry) => {
    return !(
      entry.listing.nftContract.toLowerCase() === order.listing.nftContract.toLowerCase() &&
      entry.listing.tokenId === order.listing.tokenId &&
      entry.listing.seller.toLowerCase() === order.listing.seller.toLowerCase()
    );
  });

  nextOrders.push(order);

  const nextFeed: SignedListingFeed = {
    ...feed,
    orders: nextOrders,
  };

  window.localStorage.setItem(LOCAL_SIGNED_LISTING_FEED_KEY, serializeSignedListingFeed(nextFeed));
  return nextFeed;
}

export { LOCAL_SIGNED_LISTING_FEED_KEY };
