# Signed Listings

Signed listings are portable sell intents authorized by creators via EIP-712. They enable offchain liquidity publishing without a centralized orderbook.

## Signed listing struct

Each order contains:

- `seller` — listing creator address
- `nftContract` — ERC721RT collection
- `tokenId`
- `price` — wei
- `expiry` — unix timestamp (`0` = no expiry)
- `nonce` — replay protection per seller

The seller signs a typed data hash. Collectors submit the listing + signature to `buySignedListing` on the Diamond.

## EIP-712 domain

The domain separator is tied to the **Diamond address** and chain ID. Signatures are not portable across chains or deployments.

Domain version `"1"` is the signing domain version (see `LibSutrartEIP712`). Protocol release version is `v0.1-alpha`.

## Nonce invalidation

Each seller has a minimum valid nonce onchain. Calling `incrementSignedListingNonce` invalidates all signed orders with `nonce < newMinNonce`.

This is the primary revocation mechanism for signed listings.

## Feed format (v1)

```json
{
  "version": 1,
  "chainId": 11155111,
  "chainName": "sepolia",
  "market": "0x...",
  "metadata": {
    "creator": "0x...",
    "storefrontUrl": "https://...",
    "generatedAt": 1710000000000,
    "chainId": 11155111,
    "protocolVersion": "v0.1-alpha"
  },
  "orders": [
    {
      "listing": { "...": "..." },
      "signature": "0x...",
      "source": "creator-dashboard",
      "publishedAt": 1710000000000
    }
  ]
}
```

Feeds are:

- **Deterministic** — stable field ordering via SDK serialization
- **Validated** — `validateSignedFeed` checks schema and protocol version
- **Merged** — `mergeSignedFeeds` dedupes by collection + tokenId

## Validation pipeline

1. Parse feed JSON
2. Validate schema + protocol version
3. For each order, call `isSignedListingValid` onchain
4. Surface only valid orders in discovery (unless explicitly including invalid for management UI)

Invalid orders remain in the feed file but are not fulfillable.

## SDK functions

| Function | Purpose |
|----------|---------|
| `createSignedListingFeed` | Initialize empty feed with metadata |
| `publishSignedListing` | Append/replace order in feed |
| `signSignedListing` | Wallet EIP-712 signing |
| `mergeSignedFeeds` | Combine multiple feeds |
| `validateSignedFeed` | Schema + version checks |
| `getCreatorSignedListings` | Onchain validity per order |
| `revokeSignedListings` | Build nonce increment tx |
| `pruneStaleSignedListingFeed` | Remove expired orders locally |

## Security assumptions

- Feed JSON is **not** authenticated separately from listing signatures
- Anyone can host or copy a feed; settlement trust comes from signature + onchain validation
- Creators must protect signing keys; compromised keys can sign fraudulent listings until nonce revocation

See [security review](./security-review.md).
