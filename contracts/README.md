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

## Smoke test

`src/Counter.sol` is the default Foundry example. Replace it when adding the first protocol contracts.
