#!/usr/bin/env node
/**
 * PARI Sepolia end-to-end validation runner.
 * Executes creator + collector flows against live contracts and writes artifacts.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatEther,
  getAddress,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abis } from "@pari/abi";
import {
  createSignedListingFeed,
  exportSignedListingFeed,
  getMarketInventory,
  getProtocolFeeConfig,
  isSignedListingValid,
  previewPayouts,
  previewSignedPayouts,
  publishSignedListing,
  signSignedListing,
  validateSignedFeed,
} from "@pari/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const MANIFEST_PATH = join(ROOT, "packages/shared/src/deployments/sepolia.json");
const ARTIFACT_DIR = join(ROOT, "docs/validation-artifacts");
const FEED_PUBLIC_PATH = join(ROOT, "app/public/validation/sepolia-feed-v1.json");

const COLLECTOR_PRIVATE_KEY =
  "0x59c6995e998f97a5b00402649689a279894f613fd492223153e4b83701074171";

const LISTING_PRICE = parseEther("0.01");
const ROYALTY_BPS = 500n;
const MARKETPLACE_FEE_BPS = 100n;

function loadEnv() {
  const envPath = join(ROOT, ".env");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

async function waitForReceipt(publicClient, hash) {
  return publicClient.waitForTransactionReceipt({ hash });
}

function recordStep(steps, name, data) {
  steps.push({ step: name, ...data });
  console.log(`[ok] ${name}`);
}

async function main() {
  const env = loadEnv();
  const rpcUrl = env.SEPOLIA_RPC_URL;
  const creatorKey = env.DEPLOYER_PRIVATE_KEY;

  if (!rpcUrl || !creatorKey) {
    throw new Error("SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY must be set in .env");
  }

  const manifest = loadManifest();
  const marketAddress = getAddress(manifest.PariMarket);
  const chainId = manifest.chainId;

  const creatorAccount = privateKeyToAccount(creatorKey);
  const collectorAccount = privateKeyToAccount(COLLECTOR_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const creatorWallet = createWalletClient({
    account: creatorAccount,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const collectorWallet = createWalletClient({
    account: collectorAccount,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const steps = [];

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  mkdirSync(dirname(FEED_PUBLIC_PATH), { recursive: true });

  recordStep(steps, "setup", {
    marketAddress,
    chainId,
    creator: creatorAccount.address,
    collector: collectorAccount.address,
    protocolVersion: manifest.protocolVersion,
  });

  const fundHash = await creatorWallet.sendTransaction({
    to: collectorAccount.address,
    value: parseEther("0.05"),
  });
  await waitForReceipt(publicClient, fundHash);
  recordStep(steps, "fund_collector", { txHash: fundHash, amountEth: "0.05" });

  const feeConfig = await getProtocolFeeConfig(publicClient, marketAddress);
  recordStep(steps, "protocol_fee_config", {
    protocolFeeBps: feeConfig.protocolFeeBps.toString(),
    protocolTreasury: feeConfig.protocolTreasury,
  });

  const createCollectionHash = await creatorWallet.writeContract({
    address: marketAddress,
    abi: abis.ERC721RTFactory,
    functionName: "createCollection",
    args: [
      "PARI Validation Alpha",
      "PVA",
      "ipfs://bafybeigdyrzt5sfp7udm7uhv9f5h3q2k9m1n4p6r8s0t2v4x6y8z0a1b3c5d7e9/",
      "ipfs://bafybeigdyrzt5sfp7udm7uhv9f5h3q2k9m1n4p6r8s0t2v4x6y8z0a1b3c5d7e9/collection.json",
      creatorAccount.address,
      ROYALTY_BPS,
    ],
  });
  const createCollectionReceipt = await waitForReceipt(publicClient, createCollectionHash);

  const collections = await publicClient.readContract({
    address: marketAddress,
    abi: abis.ERC721RTFactory,
    functionName: "getCreatorCollections",
    args: [creatorAccount.address],
  });
  const collectionAddress = getAddress(collections[collections.length - 1]);

  recordStep(steps, "deploy_collection", {
    txHash: createCollectionHash,
    collectionAddress,
    blockNumber: createCollectionReceipt.blockNumber.toString(),
    royaltyBps: ROYALTY_BPS.toString(),
    royaltyRecipient: creatorAccount.address,
  });

  const tokenIds = [];
  for (let i = 0; i < 3; i++) {
    const mintHash = await creatorWallet.writeContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "mint",
      args: [creatorAccount.address],
    });
    await waitForReceipt(publicClient, mintHash);
    const nextId = await publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "nextTokenId",
    });
    tokenIds.push(nextId - 1n);
    recordStep(steps, `mint_token_${i + 1}`, {
      txHash: mintHash,
      tokenId: tokenIds[i].toString(),
    });
  }

  for (const tokenId of tokenIds) {
    const approveHash = await creatorWallet.writeContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "approve",
      args: [marketAddress, tokenId],
    });
    await waitForReceipt(publicClient, approveHash);
    recordStep(steps, `approve_market_token_${tokenId}`, { txHash: approveHash });
  }

  const onchainListHash = await creatorWallet.writeContract({
    address: marketAddress,
    abi: abis.PariMarket,
    functionName: "listNFT",
    args: [collectionAddress, tokenIds[0], LISTING_PRICE],
  });
  await waitForReceipt(publicClient, onchainListHash);

  const listingId = await publicClient.readContract({
    address: marketAddress,
    abi: abis.PariMarket,
    functionName: "nextListingId",
  });
  const onchainListingId = listingId - 1n;

  const onchainPayoutPreview = await previewPayouts(
    publicClient,
    marketAddress,
    onchainListingId,
    MARKETPLACE_FEE_BPS
  );

  recordStep(steps, "create_onchain_listing", {
    txHash: onchainListHash,
    listingId: onchainListingId.toString(),
    tokenId: tokenIds[0].toString(),
    priceEth: formatEther(LISTING_PRICE),
    payoutPreview: serializePayout(onchainPayoutPreview),
  });

  const expiry = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30);
  const signedListingToken2 = {
    seller: creatorAccount.address,
    nftContract: collectionAddress,
    tokenId: tokenIds[1],
    price: LISTING_PRICE,
    expiry,
    nonce: 0n,
  };
  const signedListingToken3 = {
    seller: creatorAccount.address,
    nftContract: collectionAddress,
    tokenId: tokenIds[2],
    price: LISTING_PRICE,
    expiry,
    nonce: 0n,
  };

  const signatureToken2 = await signSignedListing(
    creatorWallet,
    marketAddress,
    signedListingToken2,
    chainId
  );
  const signatureToken3 = await signSignedListing(
    creatorWallet,
    marketAddress,
    signedListingToken3,
    chainId
  );

  let feed = createSignedListingFeed({
    chainId,
    chainName: "sepolia",
    market: marketAddress,
    creator: creatorAccount.address,
    storefrontUrl: "http://localhost:3000/creator/" + creatorAccount.address,
  });

  feed = publishSignedListing({
    feed,
    order: {
      listing: signedListingToken2,
      signature: signatureToken2,
      source: "sepolia-validation",
      publishedAt: Date.now(),
    },
  });
  feed = publishSignedListing({
    feed,
    order: {
      listing: signedListingToken3,
      signature: signatureToken3,
      source: "sepolia-validation",
      publishedAt: Date.now(),
    },
  });

  const feedValidation = validateSignedFeed(feed);
  const feedJson = exportSignedListingFeed(feed);
  writeFileSync(FEED_PUBLIC_PATH, feedJson);
  writeFileSync(join(ARTIFACT_DIR, "sepolia-feed-v1.json"), feedJson);

  const signedPayoutPreview = await previewSignedPayouts(
    publicClient,
    marketAddress,
    signedListingToken2,
    MARKETPLACE_FEE_BPS
  );

  recordStep(steps, "create_signed_listings", {
    token2: { tokenId: tokenIds[1].toString(), nonce: "0", signature: signatureToken2 },
    token3: { tokenId: tokenIds[2].toString(), nonce: "0", signature: signatureToken3 },
    feedValidation: feedValidation.valid,
    feedPath: "app/public/validation/sepolia-feed-v1.json",
    payoutPreview: serializePayout(signedPayoutPreview),
  });

  const inventoryBefore = await getMarketInventory({
    publicClient,
    marketAddress,
    chainId,
    signedFeeds: [feed],
  });

  recordStep(steps, "discovery_before_purchase", {
    totalListings: inventoryBefore.totalCount,
    validListings: inventoryBefore.validCount,
    onchain: inventoryBefore.onchain.length,
    signed: inventoryBefore.signed.length,
  });

  const marketplaceRecipient = collectorAccount.address;

  const buyOnchainHash = await collectorWallet.writeContract({
    address: marketAddress,
    abi: abis.PariMarket,
    functionName: "buyListing",
    args: [onchainListingId, marketplaceRecipient, MARKETPLACE_FEE_BPS],
    value: LISTING_PRICE,
  });
  const buyOnchainReceipt = await waitForReceipt(publicClient, buyOnchainHash);

  const onchainOwnerAfter = await publicClient.readContract({
    address: collectionAddress,
    abi: abis.ERC721RT,
    functionName: "ownerOf",
    args: [tokenIds[0]],
  });
  const onchainValidAfter = await publicClient.readContract({
    address: marketAddress,
    abi: abis.PariMarket,
    functionName: "isListingValid",
    args: [onchainListingId],
  });

  const onchainSaleEvent = parseSaleEvent(buyOnchainReceipt.logs);

  recordStep(steps, "collector_buy_onchain", {
    txHash: buyOnchainHash,
    listingId: onchainListingId.toString(),
    newOwner: onchainOwnerAfter,
    listingStillValid: onchainValidAfter,
    expectedOwner: collectorAccount.address,
    ownershipTransferOk: onchainOwnerAfter.toLowerCase() === collectorAccount.address.toLowerCase(),
    listingInvalidatedOk: onchainValidAfter === false,
    settlement: onchainSaleEvent,
  });

  const buySignedHash = await collectorWallet.writeContract({
    address: marketAddress,
    abi: abis.PariMarket,
    functionName: "buySignedListing",
    args: [signedListingToken2, signatureToken2, marketplaceRecipient, MARKETPLACE_FEE_BPS],
    value: LISTING_PRICE,
  });
  const buySignedReceipt = await waitForReceipt(publicClient, buySignedHash);

  const signedOwnerAfter = await publicClient.readContract({
    address: collectionAddress,
    abi: abis.ERC721RT,
    functionName: "ownerOf",
    args: [tokenIds[1]],
  });
  const signedValidAfter = await isSignedListingValid(
    publicClient,
    marketAddress,
    signedListingToken2
  );

  const signedSaleEvent = parseSignedSaleEvent(buySignedReceipt.logs);

  recordStep(steps, "collector_buy_signed", {
    txHash: buySignedHash,
    tokenId: tokenIds[1].toString(),
    newOwner: signedOwnerAfter,
    listingStillValid: signedValidAfter,
    ownershipTransferOk: signedOwnerAfter.toLowerCase() === collectorAccount.address.toLowerCase(),
    listingInvalidatedOk: signedValidAfter === false,
    settlement: signedSaleEvent,
  });

  const inventoryAfterPurchases = await getMarketInventory({
    publicClient,
    marketAddress,
    chainId,
    signedFeeds: [feed],
  });

  recordStep(steps, "discovery_after_purchases", {
    totalListings: inventoryAfterPurchases.totalCount,
    validListings: inventoryAfterPurchases.validCount,
    validSignedRemaining: inventoryAfterPurchases.signed.filter((entry) => entry.valid).length,
  });

  const revokeHash = await creatorWallet.writeContract({
    address: marketAddress,
    abi: abis.PariMarket,
    functionName: "incrementSignedListingNonce",
  });
  await waitForReceipt(publicClient, revokeHash);

  const token3ValidAfterRevoke = await isSignedListingValid(
    publicClient,
    marketAddress,
    signedListingToken3
  );

  recordStep(steps, "nonce_invalidation", {
    txHash: revokeHash,
    token3StillValid: token3ValidAfterRevoke,
    nonceInvalidationOk: token3ValidAfterRevoke === false,
  });

  recordStep(steps, "fee_routing_summary", {
    onchainSettlement: onchainSaleEvent,
    signedSettlement: signedSaleEvent,
    expectedPerSale: serializePayout(onchainPayoutPreview),
    treasuryAddress: feeConfig.protocolTreasury,
    marketplaceRecipient,
    marketplaceFeeBps: MARKETPLACE_FEE_BPS.toString(),
    royaltyRecipient: creatorAccount.address,
    treasurySameAsCreator: feeConfig.protocolTreasury.toLowerCase() === creatorAccount.address.toLowerCase(),
    note: "Fees verified from settlement events. Treasury and royalty recipient equal creator on alpha deploy.",
  });

  const results = {
    validatedAt: new Date().toISOString(),
    manifest,
    wallets: {
      creator: creatorAccount.address,
      collector: collectorAccount.address,
      protocolTreasury: feeConfig.protocolTreasury,
    },
    collection: collectionAddress,
    tokenIds: tokenIds.map((id) => id.toString()),
    feedUrl: "/validation/sepolia-feed-v1.json",
    steps,
    checks: {
      onchainOwnershipTransfer: onchainOwnerAfter.toLowerCase() === collectorAccount.address.toLowerCase(),
      onchainListingInvalidated: onchainValidAfter === false,
      signedOwnershipTransfer: signedOwnerAfter.toLowerCase() === collectorAccount.address.toLowerCase(),
      signedListingFilled: signedValidAfter === false,
      nonceInvalidation: token3ValidAfterRevoke === false,
      feedSchemaValid: feedValidation.valid,
      discoveryValidCountDropped: inventoryAfterPurchases.validCount < inventoryBefore.validCount,
      protocolFeeRouted: verifySettlementFees(onchainSaleEvent, onchainPayoutPreview) &&
        verifySettlementFees(signedSaleEvent, signedPayoutPreview),
    },
  };

  writeFileSync(join(ARTIFACT_DIR, "sepolia-validation-results.json"), JSON.stringify(results, null, 2));

  const failed = Object.entries(results.checks).filter(([, ok]) => !ok);
  if (failed.length > 0) {
    console.error("Validation checks failed:", failed);
    process.exit(1);
  }

  console.log("\nAll validation checks passed.");
  console.log(`Artifacts: ${ARTIFACT_DIR}`);
}

function serializePayout(payout) {
  return {
    grossPrice: payout.grossPrice.toString(),
    protocolFee: payout.protocolFee.toString(),
    marketplaceFee: payout.marketplaceFee.toString(),
    royaltyAmount: payout.royaltyAmount.toString(),
    royaltyRecipient: payout.royaltyRecipient,
    sellerProceeds: payout.sellerProceeds.toString(),
  };
}

function parseSaleEvent(logs) {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: abis.PariMarket,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ListingSold") {
        return {
          listingId: decoded.args.listingId.toString(),
          protocolFee: decoded.args.protocolFee.toString(),
          marketplaceFee: decoded.args.marketplaceFee.toString(),
          sellerProceeds: decoded.args.sellerProceeds.toString(),
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function parseSignedSaleEvent(logs) {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: abis.PariMarket,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "SignedListingFilled") {
        return {
          protocolFee: decoded.args.protocolFee.toString(),
          marketplaceFee: decoded.args.marketplaceFee.toString(),
          sellerProceeds: decoded.args.sellerProceeds.toString(),
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function verifySettlementFees(event, preview) {
  if (!event) return false;
  return (
    BigInt(event.protocolFee) === preview.protocolFee &&
    BigInt(event.marketplaceFee) === preview.marketplaceFee &&
    BigInt(event.sellerProceeds) === preview.sellerProceeds
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
