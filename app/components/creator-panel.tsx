"use client";

import { useCallback, useEffect, useState } from "react";
import { zeroAddress, type Address, type PublicClient } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  abis,
  getCreatorCollections,
  isCollectionOwner,
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
  const [collections, setCollections] = useState<Address[]>([]);
  const [status, setStatus] = useState<string>("");

  const refreshCollections = useCallback(async () => {
    if (!publicClient || !marketAddress || !address) {
      setCollections([]);
      return;
    }

    const creatorCollections = await getCreatorCollections(publicClient, marketAddress, address);
    setCollections(creatorCollections);
  }, [address, marketAddress, publicClient]);

  useEffect(() => {
    void refreshCollections();
  }, [refreshCollections, isSuccess]);

  useEffect(() => {
    if (address && form.royaltyRecipient === zeroAddress) {
      setForm((current) => ({ ...current, royaltyRecipient: address }));
    }
  }, [address, form.royaltyRecipient]);

  const isBusy = isPending || isConfirming;

  function updateForm<K extends keyof CollectionForm>(key: K, value: CollectionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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

  if (!isConnected) {
    return <p className="text-muted-foreground text-sm">Connect your wallet to manage collections.</p>;
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
            <h2 className="text-lg font-medium">Creator dashboard</h2>
            <p className="text-muted-foreground text-sm">Collections deployed by your wallet.</p>
          </div>
          <Button type="button" variant="outline" disabled={isBusy} onClick={() => void refreshCollections()}>
            Refresh
          </Button>
        </div>

        {status ? <p className="text-sm">{status}</p> : null}

        {collections.length === 0 ? (
          <p className="text-muted-foreground text-sm">No collections deployed yet.</p>
        ) : (
          <div className="space-y-4">
            {collections.map((collectionAddress) => (
              <CollectionCard
                key={collectionAddress}
                collectionAddress={collectionAddress}
                ownerAddress={address!}
                publicClient={publicClient}
                isBusy={isBusy}
                onMint={() => {
                  writeContract({
                    address: collectionAddress,
                    abi: abis.ERC721RT,
                    functionName: "mint",
                    args: [address!],
                  });
                  setStatus(`Minting from ${collectionAddress}...`);
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CollectionCard({
  collectionAddress,
  ownerAddress,
  publicClient,
  isBusy,
  onMint,
}: {
  collectionAddress: Address;
  ownerAddress: Address;
  publicClient: PublicClient | undefined;
  isBusy: boolean;
  onMint: () => void;
}) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!publicClient) {
      setIsOwner(false);
      return;
    }

    void (async () => {
      const owner = await isCollectionOwner(publicClient, collectionAddress, ownerAddress);
      setIsOwner(owner);
    })();
  }, [collectionAddress, ownerAddress, publicClient]);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-mono text-sm">{collectionAddress}</p>
      <p className="text-muted-foreground text-sm">Owner: {isOwner ? "you" : "unknown"}</p>
      <Button type="button" disabled={isBusy || !isOwner} onClick={onMint}>
        Mint NFT
      </Button>
    </div>
  );
}
