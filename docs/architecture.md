# PARI architecture

## Overview

PARI is developed as a single monorepo containing the protocol (Solidity) and a reference frontend (Next.js). This keeps iteration fast: contract changes, ABI updates, SDK helpers, and UI can evolve together without coordinating multiple repositories.

## Boundaries

### `contracts/` (Foundry)

- Source of truth for onchain protocol behavior
- Build artifacts in `contracts/out/` (gitignored)
- `forge-std` in `contracts/lib/` for tests
- Default `Counter` contract is a smoke test only

### `packages/abi`

- Typed contract ABIs consumed by the SDK and app
- Future: sync script from `contracts/out` after `forge build`

### `packages/shared`

- Chain configuration (`supportedChains`, `defaultChain`)
- Public environment variable accessors
- App-wide constants (`APP_NAME`)

### `packages/sdk`

- Protocol-facing TypeScript API (read/write helpers added incrementally)
- Depends on `@pari/shared` and `@pari/abi`
- Re-exported constants for convenience

### `app/` (Next.js)

- Reference UI and wallet connection shell
- Uses wagmi + viem + RainbowKit for Ethereum connectivity
- shadcn/ui for accessible, owned components
- No server database or auth in V1

## Data flow

1. Developer writes Solidity in `contracts/src/`
2. `forge build` emits ABIs and bytecode to `contracts/out/`
3. (Future) ABI sync copies artifacts into `packages/abi`
4. `packages/sdk` exposes typed helpers for listings, settlement, etc.
5. `app/` calls the SDK and renders protocol state via wagmi

## Local development workflow

1. `pnpm install` — link workspace packages
2. `pnpm contracts:build` — compile contracts
3. `pnpm --filter @pari/shared build` (or `pnpm build` at root) — emit package `dist/`
4. `pnpm dev` — run Next.js with Turbopack

## Design decisions

| Choice                   | Rationale                                             |
| ------------------------ | ----------------------------------------------------- |
| pnpm workspaces          | Strict linking, fast installs, `workspace:*` protocol |
| Plain `tsc` for packages | No bundler abstraction until publishing is needed     |
| Next.js App Router       | SSR-friendly; pairs with wagmi `ssr: true`            |
| RainbowKit               | Production wallet UX without custom connector work    |
| Foundry                  | Standard toolchain for new Ethereum protocols         |
| No TurboRepo yet         | Avoid orchestration complexity until the repo grows   |

## Recommended next steps

1. Replace `Counter.sol` with a minimal protocol interface or registry stub
2. Implement ABI sync from `contracts/out` to `packages/abi`
3. Add first SDK read helper (e.g. `getListing`) and a listing detail page
4. Add `anvil` + deploy script for local end-to-end testing
