# Marketplace Integration

Any frontend can integrate PARI without operating a centralized marketplace backend.

## Integration model

```text
Feed URLs / imported JSON
        ↓
   SDK discovery layer
        ↓
 Onchain validity checks
        ↓
 Unified listing inventory
        ↓
 buyListing / buySignedListing
```

Marketplaces ingest **liquidity manifests**, not deposit assets into a shared orderbook.

## Discovery

Use `getMarketInventory` or `discoverMarketInventory`:

```typescript
const inventory = await getMarketInventory({
  publicClient,
  marketAddress,
  chainId,
  signedFeeds,
  conflictPolicy: "include-all",
});
```

Inputs:

- `publicClient` — viem public client for target chain
- `marketAddress` — from deployment manifest
- `signedFeeds` — parsed portable feeds
- `conflictPolicy` — how to handle duplicate collection+token listings

## Feed ingestion

Collectors (or marketplace operators) can:

1. Add creator feed URLs — persisted per chain in localStorage
2. Import feed JSON manually
3. Merge multiple feeds via SDK

Remote fetch failures should be handled gracefully; invalid feeds must not crash the UI.

## Settlement

### Onchain listings

```solidity
buyListing(listingId, marketplaceFeeRecipient, marketplaceFeeBps)
```

### Signed listings

```solidity
buySignedListing(listing, signature, marketplaceFeeRecipient, marketplaceFeeBps)
```

Both paths share payout routing:

- Protocol fee → protocol treasury
- Marketplace fee → caller-supplied recipient (execution-time)
- Royalty → ERC2981 recipient
- Remainder → seller

Preview with `previewPayouts` / `previewSignedPayouts` before displaying prices.

## Marketplace fees

Marketplace fees are **not** stored in signed listing structs. They are supplied at purchase time by the integrating surface, subject to `MAX_MARKETPLACE_FEE_BPS`.

This keeps signed listings portable across marketplaces with different fee models.

## Deployment resolution

```typescript
import { getDeploymentManifest } from "@pari/shared";

const manifest = getDeploymentManifest(chainId);
const market = manifest?.PariMarket;
```

Returns `null` if chain is unsupported or Sepolia is not yet deployed.

## Reference UI

The `/marketplace` route demonstrates:

- Multi-feed ingestion panel
- Unified valid listing display
- Payout previews
- Purchase buttons with fee configuration

## Interoperability testing checklist

- [ ] Import creator feed JSON
- [ ] Add hosted feed URL
- [ ] Verify signed listing appears after onchain validation
- [ ] Purchase with second wallet
- [ ] Confirm royalty + protocol fee routing
- [ ] Confirm expired/revoked listings do not appear as valid

See [signed listings](./signed-listings.md) and [deployment](./deployment.md).
