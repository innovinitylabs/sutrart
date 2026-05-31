# PARI Sepolia Validation Report

**Release:** `v0.1-alpha`  
**Validated:** 2026-05-31  
**Network:** Ethereum Sepolia (chain ID `11155111`)  
**Scope:** First complete creator-to-collector flow on live PARI contracts. No new protocol features.

---

## Executive summary

PARI v0.1-alpha on Sepolia successfully completed the sovereign creator commerce loop:

- ERC721RT collection deployment with ERC2981 royalties
- Onchain listing creation, purchase, and invalidation
- EIP-712 signed listing creation, feed export, discovery, purchase, and nonce invalidation
- Protocol fee, marketplace fee, and royalty routing verified via payout previews and successful settlement transactions

Two operational issues blocked storefront SSR and marketplace discovery without a connected wallet. Both were fixed during this validation pass.

---

## Deployed addresses

| Contract | Address |
|----------|---------|
| **PariMarket (Diamond)** | `0xa01451d6dc3340A1e75aB3221007F46e64EFAB31` |
| DiamondCutFacet | `0x9f6482F4Ca2F62E157E230b25B231F090647b9F6` |
| DiamondLoupeFacet | `0x7F8a71be0f4959e72030b1f9CD13aa4e0F15AF94` |
| OwnershipFacet | `0xa8A208be31DFF9E3947f67ceD925423bCE4860E2` |
| ListingFacet | `0x2B3C693C75c2730BDF1Ad3Efac225d98Ac61cBA4` |
| SettlementFacet | `0xF6e1b64572850F2009C2De21C09433C379cd661B` |
| SignedListingFacet | `0xE3B172ba6429d10510a532567717eAF777bc40E4` |
| ProtocolConfigFacet | `0xD0cb4C0AabB684948b0d695960971bfC50c8291E` |
| ViewFacet | `0x9c71E84b3187fedBD6F6d5d8eecc85f88F319f5f` |
| ERC721RTFactoryFacet | `0x2263cf7764c19070b6fCE6E8B707f2bDc35222C9` |

**Validation collection:** `0xa05344Dc0957d38725A77f7d274d8562071113Cd` (PARI Validation Alpha / PVA)

**Protocol config at validation time:**

- Protocol fee: 50 bps (0.5%)
- Protocol treasury: deployer address (`0x7Bc9427C8730b87Ab3faD10DA63F0C4b9e9E0A5F`)
- Royalty on validation collection: 500 bps to creator

---

## Validation wallets

| Role | Address |
|------|---------|
| Creator / deployer | `0x7Bc9427C8730b87Ab3faD10DA63F0C4b9e9E0A5F` |
| Collector (Anvil account #1, funded from creator) | `0x4beA5744416D27E721Df679343C39380b53C1297` |

---

## Transaction log

| Step | Tx hash | Etherscan |
|------|---------|-----------|
| Fund collector (0.05 ETH) | `0x83f4322f8743c4bd22a2b9011119a9d7d55c5af8954175dd41031fbb2db54066` | [View](https://sepolia.etherscan.io/tx/0x83f4322f8743c4bd22a2b9011119a9d7d55c5af8954175dd41031fbb2db54066) |
| Deploy ERC721RT collection | `0x7a34c4ddfcb40f7be8d0e6d1e6f120b85203b1fbf01fb8de2899e8f3c2e15e5e` | [View](https://sepolia.etherscan.io/tx/0x7a34c4ddfcb40f7be8d0e6d1e6f120b85203b1fbf01fb8de2899e8f3c2e15e5e) |
| Mint token #1 | `0x0c7e55e20a6a83e032f12d290d333b41e5736e9039df62091b45f693a6de54c6` | [View](https://sepolia.etherscan.io/tx/0x0c7e55e20a6a83e032f12d290d333b41e5736e9039df62091b45f693a6de54c6) |
| Mint token #2 | `0x8929053cfd41e0485046f075b3f90e34e8aa7add214f9aab14f5d842757110e7` | [View](https://sepolia.etherscan.io/tx/0x8929053cfd41e0485046f075b3f90e34e8aa7add214f9aab14f5d842757110e7) |
| Mint token #3 | `0x1f56132aefccc6b680d232baba8d0c2f5d9dd89a0eafce71afcdc95fd4f01403` | [View](https://sepolia.etherscan.io/tx/0x1f56132aefccc6b680d232baba8d0c2f5d9dd89a0eafce71afcdc95fd4f01403) |
| Approve marketplace (tokens 1–3) | `0x4f03ef89696081dcb4fb75622acc048d0bbd5ab91b0d5189f8aafc6e2ad40e29`, `0x1ed15618e9d35ed184660b2401da090bfc661abf6f23a923e74c2d2bde1fb523`, `0x31cd7affd7a16e78ea284f37f6cbabbef6984ce3f8e0b93f0ab3ffd85b17ed6c` | — |
| Create onchain listing (token #1) | `0x8a900bcc1c04900d5e1b469799b35d1a8a2cd55fe14eba879f909617348562fe` | [View](https://sepolia.etherscan.io/tx/0x8a900bcc1c04900d5e1b469799b35d1a8a2cd55fe14eba879f909617348562fe) |
| Collector buy onchain listing #1 | `0xd0acd3361e1a6198b753d3d7466e49f2bdb6297958d8c1879ca304fe4eb2c0a9` | [View](https://sepolia.etherscan.io/tx/0xd0acd3361e1a6198b753d3d7466e49f2bdb6297958d8c1879ca304fe4eb2c0a9) |
| Collector buy signed listing (token #2) | `0xe9c35aae0c11bfe37f74d554f34f491ede9cde5ed31c543a89439a09d00fc51b` | [View](https://sepolia.etherscan.io/tx/0xe9c35aae0c11bfe37f74d554f34f491ede9cde5ed31c543a89439a09d00fc51b) |
| Increment signed listing nonce (revoke) | `0x6f42ca9149dba8efade725238c6bf6345ce53e1af37783108b4ac3d3ca3ef798` | [View](https://sepolia.etherscan.io/tx/0x6f42ca9149dba8efade725238c6bf6345ce53e1af37783108b4ac3d3ca3ef798) |

**Signed listing struct hash (token #2):** `0x01c7d8a5638abd89842adddb1051c3708d67268779e7e36c8e747c1b2e2afb6a`

**Hosted feed:** `app/public/validation/sepolia-feed-v1.json` (served at `/validation/sepolia-feed-v1.json`)

Machine-readable artifacts: `docs/validation-artifacts/sepolia-validation-results.json`

---

## Validation flow results

### Creator wallet

| Step | Result | Notes |
|------|--------|-------|
| 1. Deploy ERC721RT collection | Pass | PVA collection registered to creator |
| 2. Configure royalties | Pass | 500 bps to creator address |
| 3. Mint artwork | Pass | Tokens #1–#3 minted |
| 4. Approve PARI marketplace | Pass | Per-token approvals confirmed |
| 5. Create onchain listing | Pass | Listing ID `1`, price 0.01 ETH |
| 6. Create signed listings | Pass | Tokens #2 and #3 signed via EIP-712 (`PARI` domain) |
| 7. Export signed feed | Pass | Deterministic JSON, `protocolVersion: v0.1-alpha` |
| 8. Host feed publicly | Pass | Static file under `app/public/validation/` |

### Collector wallet

| Step | Result | Notes |
|------|--------|-------|
| 1. Import feed | Pass | SDK `getMarketInventory` with feed input |
| 2. Discover listings | Pass | 3 valid listings before purchase |
| 3. Open storefront | Pass | After RPC fix; see screenshots |
| 4. Open canonical listing page | Pass | Onchain listing page shows invalid state post-purchase |
| 5. Purchase artwork | Pass | Both onchain and signed purchases succeeded |

### Verification checks

| Check | Result |
|-------|--------|
| NFT ownership transfer | Pass — tokens #1 and #2 owned by collector after purchase |
| Royalty routing | Pass — 500 bps to creator per `previewPayouts` / `previewSignedPayouts` |
| Protocol fee routing | Pass — 50 bps per sale to protocol treasury |
| Marketplace fee routing | Pass — 100 bps per sale to collector-as-marketplace |
| Onchain listing invalidation | Pass — `isListingValid(1)` false after purchase |
| Signed order invalidation (fill) | Pass — filled signed listing no longer valid |
| Signed order invalidation (nonce) | Pass — token #3 invalid after `incrementSignedListingNonce` |
| Storefront updates | Pass — 0 listed works; token #3 shown unlisted |
| Discovery updates | Pass — valid count dropped from 3 to 1 after purchases, then 0 after nonce revoke |

**Per-sale payout preview (0.01 ETH gross, 100 bps marketplace fee):**

| Component | Amount (wei) | Amount (ETH) |
|-----------|--------------|--------------|
| Protocol fee | 50,000,000,000,000 | 0.00005 |
| Marketplace fee | 100,000,000,000,000 | 0.0001 |
| Royalty | 500,000,000,000,000 | 0.0005 |
| Seller proceeds | 9,350,000,000,000,000 | 0.00935 |

---

## Screenshot references

| Screenshot | Description |
|------------|-------------|
| [creator-storefront.png](./validation-screenshots/creator-storefront.png) | Creator storefront after validation — collection visible, token #3 unlisted |
| [onchain-listing-invalid.png](./validation-screenshots/onchain-listing-invalid.png) | Canonical onchain listing page — correctly shows stale/invalid after purchase |

---

## Wallet flow observations

1. **Creator flow is gas-intensive on Sepolia.** Full validation (collection + 3 mints + 3 approvals + listing + nonce revoke) required ~12 transactions. Acceptable for alpha; creators should see clear progress feedback (present via pending status strings).

2. **EIP-712 signing worked without domain confusion.** Domain name `PARI` matches contract `LibPariEIP712` and SDK `PARI_EIP712_DOMAIN`.

3. **Collector wallet required prefunding.** Validation used a second deterministic wallet funded from the deployer. Real collectors only need purchase price + gas.

4. **Purchase requires exact ETH value.** Both settlement paths enforce `msg.value == price`; no partial payment path.

---

## UX issues found

| Issue | Severity | Status |
|-------|----------|--------|
| Storefront SSR failed with HTTP 429 on public Sepolia RPC | Critical | **Fixed** — server now uses `SEPOLIA_RPC_URL` |
| Marketplace showed Anvil when wallet disconnected | High | **Fixed** — uses `NEXT_PUBLIC_DEFAULT_CHAIN_ID` |
| `pnpm contracts:deploy:sepolia` did not load root `.env` | Medium | **Fixed** — deploy script sources `.env` |
| WalletConnect origin allowlist warning on non-3000 ports | Low | Open — configure at cloud.reown.com |
| Feed URL must match dev server port | Low | Open — document in deployment guide |
| No collection image placeholder on storefront | Low | Open — expected without hosted metadata images |
| Buy button hidden when listing invalid (correct) but no CTA to browse other works | Low | Open |

---

## Protocol issues found

| Issue | Severity | Status |
|-------|----------|--------|
| Protocol treasury equals deployer on alpha deploy | Info | By design for alpha; document for mainnet |
| Balance-delta fee verification unreliable when treasury = seller | Info | Use event logs / payout preview instead |
| None blocking settlement or listing validity | — | — |

---

## Feed issues found

| Issue | Severity | Status |
|-------|----------|--------|
| Feed schema validation passes | — | Pass |
| Stale filled orders remain in feed file but are filtered at discovery | Info | Expected alpha behavior |
| Cross-device syndication requires hosted URL + env wiring | Medium | Documented; static hosting validated |
| Server-side feed fetch fails silently with console.warn | Low | Open — consider user-visible syndication status |

---

## Storefront issues found

| Issue | Severity | Status |
|-------|----------|--------|
| SSR requires dedicated RPC (not public thirdweb endpoint) | Critical | **Fixed** |
| Creator storefront does not show purchased tokens as listed (correct) | — | Pass |
| Listing provenance shows `PARI protocol` settlement source | — | Pass |
| Token owner mismatch surfaced on invalid listing page | — | Pass — aids trust |

---

## Recommendations

### Before wider alpha

1. Set `NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111` and a dedicated `SEPOLIA_RPC_URL` (Alchemy, Infura, etc.) — not the public thirdweb endpoint.
2. Host creator feeds at stable HTTPS URLs; set `NEXT_PUBLIC_SIGNED_LISTING_FEED_URL`.
3. Add WalletConnect localhost origins for each dev port used.
4. Separate protocol treasury from deployer wallet on next Sepolia redeploy or config update.

### Before mainnet

1. Third-party audit of Diamond + settlement + signed listing paths.
2. Multisig / timelock for `diamondCut`.
3. Dedicated protocol treasury address.
4. Client-side RPC configuration for wallet reads (avoid public RPC rate limits).
5. Operational runbook for feed hosting and syndication recovery.

---

## Bugs fixed during validation

1. **`app/lib/chain.ts`** — Server public client now uses `SEPOLIA_RPC_URL` for Sepolia SSR instead of viem default public RPC.
2. **`app/next.config.ts`** — Loads repo root `.env` so Next.js server can read `SEPOLIA_RPC_URL`.
3. **`contracts/scripts/deploy-sepolia.sh`** — Sources root `.env` before deploy.
4. **`app/lib/contracts.ts`** — Uses `getDefaultChainId()` when wallet is disconnected.
5. **`app/components/marketplace-panel.tsx`** — Resolves chain from env default when wallet disconnected.
6. **`packages/{abi,shared,sdk}`** — NodeNext ESM resolution for operational validation scripts.

---

## Remaining issues

1. WalletConnect origin allowlist for local dev ports.
2. Client-side wagmi still uses chain default RPCs — may hit rate limits under load.
3. Alpha treasury = deployer — not suitable for mainnet trust model.
4. Feed syndication errors only logged server-side, not shown in UI.
5. No automated CI run of `validate:sepolia` (requires funded wallet + RPC secret).

---

## Mainnet readiness assessment

| Area | Status | Notes |
|------|--------|-------|
| Core settlement (onchain + signed) | **Alpha-ready** | Verified on Sepolia with real txs |
| EIP-712 domain stability | **Alpha-ready** | `PARI` / version `1` locked for this deployment |
| Royalty + fee routing | **Alpha-ready** | Preview matches settlement; events emitted |
| Storefront / discovery SSR | **Alpha-ready** | After RPC configuration fix |
| Operational maturity | **Not mainnet-ready** | Treasury, RPC, feed hosting, audit gaps |
| Trust model | **Not mainnet-ready** | Single deployer key, no audit |
| Indexing / scale | **Not mainnet-ready** | Client-side discovery only |

**Verdict:** PARI v0.1-alpha is suitable for **controlled Sepolia public alpha** with documented operational requirements. **Not ready for Ethereum mainnet** without audit, governance hardening, and dedicated infrastructure.

---

## Reproduce

```bash
# Prerequisites: SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY in repo root .env
pnpm validate:sepolia

# App alpha testing
# app/.env.local:
#   NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
#   NEXT_PUBLIC_SIGNED_LISTING_FEED_URL=http://localhost:3000/validation/sepolia-feed-v1.json
pnpm dev
```

See also: [public alpha checklist](./public-alpha-checklist.md), [creator flow](./creator-flow.md), [deployment](./deployment.md).
