import { describe, expect, it } from "vitest";
import { zeroAddress } from "viem";
import {
  mergeMarketListings,
  normalizeOnchainListing,
  type OnchainMarketListing,
  type SignedMarketListing,
} from "./discovery";
import {
  buildCollectionStorefrontPath,
  buildCreatorStorefrontPath,
  buildOnchainListingPath,
  buildSignedListingPath,
  flattenSignedOrders,
  normalizeListingHashParam,
} from "./storefront";

describe("storefront path helpers", () => {
  it("builds canonical storefront paths", () => {
    const creator = "0x0000000000000000000000000000000000000001" as const;
    const collection = "0x0000000000000000000000000000000000000002" as const;

    expect(buildCreatorStorefrontPath(creator)).toBe(`/creator/${creator}`);
    expect(buildCollectionStorefrontPath(collection)).toBe(`/collection/${collection}`);
    expect(buildOnchainListingPath(42n)).toBe("/listing/onchain/42");
    expect(buildSignedListingPath("0x" + "11".repeat(32))).toBe(
      `/listing/signed/0x${"11".repeat(32)}`
    );
  });

  it("normalizes listing hash params", () => {
    const hash = `0x${"aa".repeat(32)}` as `0x${string}`;
    expect(normalizeListingHashParam(hash)).toBe(hash);
    expect(normalizeListingHashParam(hash.slice(2))).toBe(hash);
    expect(normalizeListingHashParam("0x1234")).toBeNull();
  });
});

describe("signed order flattening", () => {
  it("merges direct orders and feed orders", () => {
    const order = {
      listing: {
        seller: zeroAddress,
        nftContract: zeroAddress,
        tokenId: 1n,
        price: 1n,
        expiry: 0n,
        nonce: 0n,
      },
      signature: "0x01" as `0x${string}`,
    };

    const flattened = flattenSignedOrders([order], [
      {
        version: 1,
        chainId: 31337,
        market: zeroAddress,
        orders: [order],
      },
    ]);

    expect(flattened).toHaveLength(2);
  });
});

describe("listing coexistence", () => {
  const onchain: OnchainMarketListing = normalizeOnchainListing(
    {
      listingId: 1n,
      seller: zeroAddress,
      nftContract: "0x0000000000000000000000000000000000000001",
      tokenId: 1n,
      price: 10n,
      active: true,
      createdAt: 1n,
    },
    true
  );

  const signed: SignedMarketListing = {
    kind: "signed",
    listing: {
      seller: zeroAddress,
      nftContract: "0x0000000000000000000000000000000000000001",
      tokenId: 1n,
      price: 20n,
      expiry: 0n,
      nonce: 0n,
    },
    signature: "0x01",
    structHash: "0x" + "22".repeat(32),
    valid: true,
    source: "feed",
  };

  it("includes both listing types when configured", () => {
    const merged = mergeMarketListings([onchain], [signed], "include-all");
    expect(merged).toHaveLength(2);
  });

  it("prefers onchain by default for the same token", () => {
    const merged = mergeMarketListings([onchain], [signed], "prefer-onchain");
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe("onchain");
  });
});
