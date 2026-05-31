# Gas Observations (Alpha)

Lightweight gas observations from Foundry tests on local Anvil. Values are indicative — Sepolia gas prices will differ. **No optimization work was performed for alpha.**

Recorded from `forge test --gas-report` baseline (local EVM, approximate):

## Collection deployment

| Operation | Approximate gas |
|-----------|-----------------|
| `createCollection` (ERC721RT via factory) | ~1,480,000 |

Creator collection deployment is a one-time cost per collection.

## Minting

| Operation | Approximate gas |
|-----------|-----------------|
| `mint` (ERC721RT) | ~72,000 |

## Onchain listing lifecycle

| Operation | Approximate gas |
|-----------|-----------------|
| `listNFT` | ~229,000 |
| `cancelListing` | ~211,000 |
| `buyListing` (no royalty) | ~270,000 |
| `buyListing` (with royalty + fees) | ~290,000–330,000 |

## Signed listing fulfillment

| Operation | Approximate gas |
|-----------|-----------------|
| `buySignedListing` (simple) | ~159,000 |
| `buySignedListing` (with royalties + fees) | ~1,370,000+ |

Signed fulfillment with full royalty routing paths is heavier — profile on Sepolia with real collections before mainnet.

## Views / validation

| Operation | Approximate gas |
|-----------|-----------------|
| `previewPayouts` | ~294,000 (eth_call) |
| `previewSignedPayouts` | ~249,000 (eth_call) |
| `isSignedListingValid` | varies (eth_call) |

## Diamond deploy (one-time protocol deploy)

Full Diamond + 8 facets + init: deploy script cost varies by network. Run `forge script` dry-run on Sepolia for current estimate.

## Observations

1. **Settlement dominates user cost** — optimize settlement paths before mainnet, not feed JSON tooling.
2. **Signed listings save list tx gas** — creators skip `listNFT` but buyers still pay fulfillment gas.
3. **Royalty paths add cost** — ERC2981 lookups during settlement increase gas on royalty-enabled collections.
4. **Alpha priority is correctness** — gas tuning deferred until post-audit.

## How to reproduce

```bash
cd contracts
forge test --gas-report
```

For Sepolia transaction costs, deploy and execute the [deployment validation flow](./deployment.md) with a block explorer open.
