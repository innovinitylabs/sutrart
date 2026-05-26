"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { formatEther, parseEther, zeroAddress, type Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  abis,
  getCreatorInventory,
  type CreatorInventory,
  type InventoryToken,
} from "@sutrart/sdk";
import { Button } from "@/components/ui/button";
import { useContractAddresses } from "@/lib/contracts";

type CollectionForm = {
  name: string;
  symbol: string;
  baseURI: string;
  contractURI: string;
  royaltyRecipient: Address;
  royaltyBps: string;
};

const defaultForm: CollectionForm = {
  name: "",
  symbol: "",
  baseURI: "https://example.com/metadata/",
  contractURI: "https://example.com/collection.json",
  royaltyRecipient: zeroAddress,
  royaltyBps: "500",
};

export function CreatorPanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { marketAddress } = useContractAddresses();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [form, setForm] = useState<CollectionForm>(defaultForm);
  const [inventory, setInventory] = useState<CreatorInventory | null>(null);
  const [priceByToken, setPriceByToken] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>("");

  const refreshInventory = useCallback(async () => {
    if (!publicClient || !marketAddress || !address) {
      setInventory(null);
      return;
    }

    const nextInventory = await getCreatorInventory(publicClient, marketAddress, address);
    setInventory(nextInventory);
  }, [address, marketAddress, publicClient]);

  useEffect(() => {
    void refreshInventory();
  }, [refreshInventory, isSuccess]);

  useEffect(() => {
    if (address && form.royaltyRecipient === zeroAddress) {
      setForm((current) => ({ ...current, royaltyRecipient: address }));
    }
  }, [address, form.royaltyRecipient]);

  const isBusy = isPending || isConfirming;

  const collectionCount = inventory?.collections.length ?? 0;
  const tokenCount = inventory?.tokens.length ?? 0;
  const listedCount = inventory?.listed.length ?? 0;
  const unlistedCount = inventory?.unlisted.length ?? 0;

  function updateForm<K extends keyof CollectionForm>(key: K, value: CollectionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function tokenKey(token: InventoryToken): string {
    return `${token.collection}-${token.tokenId.toString()}`;
  }

  function createCollection() {
    if (!marketAddress) {
      return;
    }

    if (!form.name || !form.symbol) {
      setStatus("Name and symbol are required.");
      return;
    }

    writeContract({
      address: marketAddress,
      abi: abis.ERC721RTFactory,
      functionName: "createCollection",
      args: [
        form.name,
        form.symbol,
        form.baseURI,
        form.contractURI,
        form.royaltyRecipient,
        BigInt(form.royaltyBps || "0"),
      ],
    });
    setStatus("Deploying ERC721RT collection...");
  }

  function mintToken(collectionAddress: Address) {
    if (!address) {
      return;
    }

    writeContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "mint",
      args: [address],
    });
    setStatus(`Minting token on ${collectionAddress}...`);
  }

  function approveMarket(token: InventoryToken) {
    if (!marketAddress) {
      return;
    }

    writeContract({
      address: token.collection,
      abi: abis.ERC721RT,
      functionName: "approve",
      args: [marketAddress, token.tokenId],
    });
    setStatus(`Approving token #${token.tokenId.toString()} for marketplace...`);
  }

  function listToken(token: InventoryToken) {
    if (!marketAddress) {
      return;
    }

    const price = priceByToken[tokenKey(token)] ?? "0.01";

    writeContract({
      address: marketAddress,
      abi: abis.SutrartMarket,
      functionName: "listNFT",
      args: [token.collection, token.tokenId, parseEther(price)],
    });
    setStatus(`Listing token #${token.tokenId.toString()} for ${price} ETH...`);
  }

  function cancelListing(token: InventoryToken) {
    if (!marketAddress || token.listingState.listingId === null) {
      return;
    }

    writeContract({
      address: marketAddress,
      abi: abis.SutrartMarket,
      functionName: "cancelListing",
      args: [token.listingState.listingId],
    });
    setStatus(`Cancelling listing #${token.listingState.listingId.toString()}...`);
  }

  const collectionCards = useMemo(() => inventory?.collections ?? [], [inventory]);

  if (!isConnected) {
    return <p className="text-muted-foreground text-sm">Connect your wallet to manage inventory.</p>;
  }

  if (!marketAddress) {
    return (
      <p className="text-muted-foreground text-sm">
        Local contract addresses are missing. Run `pnpm contracts:anvil` and `pnpm
        contracts:deploy:local`.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-4">
        <InventoryStat label="Collections" value={collectionCount.toString()} />
        <InventoryStat label="Tokens" value={tokenCount.toString()} />
        <InventoryStat label="Listed" value={listedCount.toString()} />
        <InventoryStat label="Unlisted" value={unlistedCount.toString()} />
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <h2 className="text-lg font-medium">Create ERC721RT collection</h2>
          <p className="text-muted-foreground text-sm">
            Deploy a creator-owned collection through the Sutrart factory facet.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Name</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Symbol</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={form.symbol}
              onChange={(event) => updateForm("symbol", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground text-xs">Base URI</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={form.baseURI}
              onChange={(event) => updateForm("baseURI", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground text-xs">Contract URI</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={form.contractURI}
              onChange={(event) => updateForm("contractURI", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Royalty recipient</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={form.royaltyRecipient}
              onChange={(event) => updateForm("royaltyRecipient", event.target.value as Address)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Royalty BPS</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={form.royaltyBps}
              onChange={(event) => updateForm("royaltyBps", event.target.value)}
            />
          </label>
        </div>

        <Button type="button" disabled={isBusy} onClick={createCollection}>
          Deploy collection
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Creator inventory</h2>
            <p className="text-muted-foreground text-sm">
              Chain-native inventory across your ERC721RT collections.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={isBusy} onClick={() => void refreshInventory()}>
            Refresh
          </Button>
        </div>

        {status ? <p className="text-sm">{status}</p> : null}

        {!inventory || inventory.collections.length === 0 ? (
          <p className="text-muted-foreground text-sm">No collections deployed yet.</p>
        ) : (
          <div className="space-y-8">
            <InventorySection title="Collections">
              <div className="space-y-3">
                {collectionCards.map((collection) => (
                  <div key={collection.address} className="rounded-lg border border-border p-4">
                    <p className="font-medium">
                      {collection.name} ({collection.symbol})
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{collection.address}</p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Tokens owned: {collection.tokens.length}
                    </p>
                    <Button
                      type="button"
                      className="mt-3"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => mintToken(collection.address)}
                    >
                      Mint NFT
                    </Button>
                  </div>
                ))}
              </div>
            </InventorySection>

            <InventorySection title="Tokens">
              <TokenGrid
                tokens={inventory.tokens}
                emptyLabel="No tokens owned yet."
                isBusy={isBusy}
                priceByToken={priceByToken}
                setPriceByToken={setPriceByToken}
                tokenKey={tokenKey}
                onApprove={approveMarket}
                onList={listToken}
                onCancel={cancelListing}
              />
            </InventorySection>

            <InventorySection title="Listed">
              <TokenGrid
                tokens={inventory.listed}
                emptyLabel="No active valid listings."
                isBusy={isBusy}
                priceByToken={priceByToken}
                setPriceByToken={setPriceByToken}
                tokenKey={tokenKey}
                onApprove={approveMarket}
                onList={listToken}
                onCancel={cancelListing}
              />
            </InventorySection>

            <InventorySection title="Unlisted">
              <TokenGrid
                tokens={inventory.unlisted}
                emptyLabel="All owned tokens are listed."
                isBusy={isBusy}
                priceByToken={priceByToken}
                setPriceByToken={setPriceByToken}
                tokenKey={tokenKey}
                onApprove={approveMarket}
                onList={listToken}
                onCancel={cancelListing}
              />
            </InventorySection>
          </div>
        )}
      </section>
    </div>
  );
}

function InventoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function InventorySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium">{title}</h3>
      {children}
    </div>
  );
}

function TokenGrid({
  tokens,
  emptyLabel,
  isBusy,
  priceByToken,
  setPriceByToken,
  tokenKey,
  onApprove,
  onList,
  onCancel,
}: {
  tokens: InventoryToken[];
  emptyLabel: string;
  isBusy: boolean;
  priceByToken: Record<string, string>;
  setPriceByToken: Dispatch<SetStateAction<Record<string, string>>>;
  tokenKey: (token: InventoryToken) => string;
  onApprove: (token: InventoryToken) => void;
  onList: (token: InventoryToken) => void;
  onCancel: (token: InventoryToken) => void;
}) {
  if (tokens.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {tokens.map((token) => {
        const key = tokenKey(token);
        const listingState = token.listingState;

        return (
          <div key={key} className="space-y-3 rounded-lg border border-border p-4">
            <p className="font-mono text-sm">
              {token.collection} #{token.tokenId.toString()}
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Owner: {token.owner}</p>
              <p>Approved for market: {token.approvedForMarket ? "yes" : "no"}</p>
              <p>Listing active: {listingState.listingActive ? "yes" : "no"}</p>
              <p>Listing valid: {listingState.listingValid ? "yes" : "no"}</p>
              {listingState.listingId !== null ? (
                <p>Listing ID: {listingState.listingId.toString()}</p>
              ) : null}
              {listingState.price !== null ? (
                <p>Price: {formatEther(listingState.price)} ETH</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {!token.approvedForMarket ? (
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => onApprove(token)}>
                  Approve marketplace
                </Button>
              ) : null}

              {!listingState.isListed ? (
                <>
                  <input
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Price in ETH"
                    value={priceByToken[key] ?? "0.01"}
                    onChange={(event) =>
                      setPriceByToken((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    disabled={isBusy || !token.approvedForMarket}
                    onClick={() => onList(token)}
                  >
                    List token
                  </Button>
                </>
              ) : null}

              {listingState.listingActive && listingState.listingId !== null ? (
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => onCancel(token)}>
                  Cancel listing
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
