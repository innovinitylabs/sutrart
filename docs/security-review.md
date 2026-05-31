# Security Review (Alpha)

Internal protocol review for `v0.1-alpha`. Not a formal audit.

## Scope

- Signed listing replay and nonce model
- Diamond upgrade path
- Settlement / payout routing
- Stale listing behavior
- Marketplace fee bounds

## Signed listing replay

**Mitigations:**

- Per-seller nonce with onchain minimum (`signedListingMinNonce`)
- `filledSignedListings` mapping prevents double fulfillment of same struct hash
- EIP-712 domain bound to Diamond address + chainId

**Assumptions:**

- Sellers protect signing keys
- Integrators call `isSignedListingValid` before displaying buy buttons

**Known limitation:** A valid signed order remains fulfillable until expiry, fill, or nonce revocation — even if removed from a feed JSON file.

## Nonce invalidation

`incrementSignedListingNonce` invalidates all orders with lower nonces atomically.

Creators must explicitly revoke; deleting feed entries does not revoke onchain.

## Diamond upgrades

Owner can `diamondCut` to add/replace/remove facets. Storage layout must remain compatible across facet upgrades.

**Alpha assumption:** Deployer/owner is trusted protocol operator.

**Future hardening:** Timelock, multisig ownership, documented storage layout audits.

## Payout routing

Settlement splits:

1. Protocol fee (bps cap enforced)
2. Marketplace fee (bps cap enforced, recipient supplied at execution)
3. ERC2981 royalty
4. Seller proceeds

**Edge cases reviewed:**

- Zero royalty recipient with zero royalty amount — allowed
- Marketplace fee with zero recipient when bps > 0 — reverts
- Seller buying own listing — reverts

## Stale listings

Onchain listings invalidate when:

- Ownership changes
- Approval revoked
- Listing cancelled

Signed listings invalidate when:

- Same as above, plus expiry, nonce, fill, or invalid signature

Discovery layer filters invalid listings for purchase UI but may show them in creator management views.

## Marketplace fees

Fees are not embedded in signed listing payloads. Integrators supply fee parameters at purchase.

**Risk:** Misconfigured integrator could charge excessive fees up to `MAX_MARKETPLACE_FEE_BPS`. Users should verify payout previews.

## Feed integrity

Feed JSON is not signed at the feed level. Trust derives from per-order EIP-712 signatures and onchain validation.

**Future hardening:** Optional feed manifest attestation, checksum publishing, creator-signed feed metadata.

## Out of scope (alpha)

- Formal third-party audit
- Bug bounty program
- Mainnet deployment review
- MEV / frontrunning analysis for signed listings

## Recommended pre-mainnet work

1. External smart contract audit (Diamond + facets)
2. Multisig + timelock for `diamondCut`
3. Storage layout diff tooling across upgrades
4. Mainnet deployment runbook with manifest verification CI
