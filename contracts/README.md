# Sutrart Contracts

Foundry project for the Sutrart protocol on Ethereum.

## Philosophy

- Artists retain custody of NFTs (no escrow marketplaces)
- Listings are fully onchain for V1
- Protocol stays minimal and auditable

## Commands

From the repository root:

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:fmt
```

Or from this directory:

```bash
forge build
forge test
forge fmt
```

## Current MVP contract

`src/SutrartMarket.sol` is the first listing registry primitive:

- sellers list while keeping NFT custody
- buyers purchase atomically with ETH + ERC721 transfer
- listings are invalidated globally after sale/cancel
