import { describe, expect, it } from "vitest";
import { getAddress, zeroAddress } from "viem";
import {
  exportSignedListingFeed,
  importSignedListingFeed,
  mergeSignedFeeds,
  publishSignedListing,
  pruneStaleSignedListingFeed,
  validateSignedFeed,
  type SignedListingFeedV1,
} from "./syndication.js";

const market = zeroAddress;
const creator = getAddress("0x0000000000000000000000000000000000000001");

function sampleOrder(tokenId: bigint, price: bigint, expiry: bigint, nonce: bigint) {
  return {
    listing: {
      seller: creator,
      nftContract: getAddress("0x0000000000000000000000000000000000000002"),
      tokenId,
      price,
      expiry,
      nonce,
    },
    signature: "0x01" as `0x${string}`,
  };
}

function sampleFeed(orders = [sampleOrder(1n, 100n, 0n, 0n)]): SignedListingFeedV1 {
  return {
    version: 1,
    chainId: 11155111,
    chainName: "sepolia",
    market,
    metadata: {
      creator,
      generatedAt: 1_700_000_000_000,
      chainId: 11155111,
      protocolVersion: "v0.1-alpha",
      storefrontUrl: "https://example.com/creator/0x1",
    },
    orders,
  };
}

describe("validateSignedFeed", () => {
  it("accepts a valid feed", () => {
    expect(validateSignedFeed(sampleFeed()).valid).toBe(true);
  });

  it("rejects duplicate token listings", () => {
    const feed = sampleFeed([sampleOrder(1n, 100n, 0n, 0n), sampleOrder(1n, 200n, 0n, 1n)]);
    const result = validateSignedFeed(feed);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.message).toContain("Duplicate");
  });
});

describe("publishSignedListing", () => {
  it("replaces an existing token order deterministically", () => {
    const feed = sampleFeed();
    const updated = publishSignedListing({
      feed,
      order: sampleOrder(1n, 250n, 0n, 1n),
    });

    expect(updated.orders).toHaveLength(1);
    expect(updated.orders[0]?.listing.price).toBe(250n);
    expect(updated.metadata?.generatedAt).toBeGreaterThan(feed.metadata!.generatedAt);
  });
});

describe("mergeSignedFeeds", () => {
  it("deduplicates token listings by lookup key", () => {
    const feedA = sampleFeed([sampleOrder(1n, 100n, 0n, 0n)]);
    const feedB = sampleFeed([sampleOrder(1n, 300n, 0n, 2n)]);

    const merged = mergeSignedFeeds([feedA, feedB]);
    expect(merged.orders).toHaveLength(1);
    expect(merged.orders[0]?.listing.price).toBe(300n);
  });
});

describe("feed serialization", () => {
  it("roundtrips through export/import", () => {
    const feed = sampleFeed();
    const imported = importSignedListingFeed(JSON.parse(exportSignedListingFeed(feed)));
    expect(imported.orders[0]?.listing.price).toBe(100n);
    expect(imported.metadata?.storefrontUrl).toBe(feed.metadata?.storefrontUrl);
  });
});

describe("pruneStaleSignedListingFeed", () => {
  it("removes expired listings", () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const feed = sampleFeed([
      sampleOrder(1n, 100n, now - 10n, 0n),
      sampleOrder(2n, 100n, now + 100n, 0n),
    ]);

    const pruned = pruneStaleSignedListingFeed(feed, now);
    expect(pruned.orders).toHaveLength(1);
    expect(pruned.orders[0]?.listing.tokenId).toBe(2n);
  });
});

describe("sepolia deployment config", () => {
  it("uses sepolia chain metadata in sample feeds", () => {
    const feed = sampleFeed();
    expect(feed.chainId).toBe(11155111);
    expect(feed.chainName).toBe("sepolia");
    expect(feed.metadata?.protocolVersion).toBe("v0.1-alpha");
  });
});
