# Creator Flow

End-to-end workflow for creators on Sutrart alpha (`v0.1-alpha`).

## Prerequisites

1. Wallet connected to a supported chain (Anvil local or Sepolia)
2. Deployment manifest available for that chain
3. ETH for gas (Sepolia faucet ETH for testnet)

## 1. Deploy a collection

Use the Creator dashboard (`/creator`) to deploy an ERC721RT collection via the factory facet:

- Name, symbol
- `baseURI` — per-token metadata prefix (IPFS recommended)
- `contractURI` — collection-level metadata
- Royalty recipient + BPS (ERC2981)

The collection is registered to your creator address onchain.

## 2. Mint artwork

Mint tokens from your collection to your wallet. Each mint assigns the next `tokenId` to your address.

Use real metadata URIs before sharing storefront links publicly. Placeholder IPFS paths should be replaced with hosted metadata JSON.

## 3. Approve the marketplace

Before listing (onchain or signed), approve the Sutrart Diamond (`SutrartMarket`) to transfer the token:

```text
ERC721RT.approve(SutrartMarket, tokenId)
```

Approval is required for settlement. Without it, listings appear invalid at purchase time.

## 4. Create liquidity

### Onchain listing

Set a price and call `listNFT(collection, tokenId, price)` on the Diamond. The listing is stored in protocol storage.

### Signed listing

1. Set price and expiry
2. Preview payout routing (protocol fee, royalty, seller proceeds)
3. Sign the EIP-712 listing intent in your wallet
4. Publish to your local creator feed

Signed listings do not require an onchain list transaction. They require a valid signature and approval.

## 5. Publish feed

Signed orders are appended to a deterministic JSON feed stored locally per creator:

```text
sutrart:creator-feed:{chainId}:{creatorAddress}
```

Export the feed JSON and optionally host it at a public URL for cross-device syndication.

## 6. Storefront display

Your public storefront (`/creator/[address]`) merges:

- Registered collections
- Valid onchain listings
- Valid signed listings from local feed + optional `NEXT_PUBLIC_SIGNED_LISTING_FEED_URL`

## 7. Revoke signed listings

Increment your signed listing nonce onchain to invalidate all orders below the new nonce. Remove stale entries from the local feed with **Prune expired** or **Remove from feed**.

## Operational checklist

- [ ] Collection deployed with real metadata URIs
- [ ] Token minted
- [ ] Marketplace approved
- [ ] Listing created (onchain or signed)
- [ ] Feed exported or hosted
- [ ] Storefront link shared
- [ ] Test purchase on Sepolia with a second wallet

## Common failures

| Symptom | Likely cause |
|---------|--------------|
| Listing invalid at purchase | Missing approval or ownership changed |
| Signed listing rejected | Expired, revoked nonce, or bad signature |
| Storefront empty on another device | Feed not hosted; localStorage is device-local |
| Unsupported chain | No deployment manifest for active chain |

See [signed listings](./signed-listings.md) and [storefronts](./storefronts.md).
